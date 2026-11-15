"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
// GET /api/wip - List WIP operation logs
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, batchId, operationId, productionOrderId } = req.query;
        const searchStr = (q || '').trim().toLowerCase();
        const batchFilter = (batchId || '').trim();
        const opFilter = (operationId || '').trim();
        const orderFilter = (productionOrderId || '').trim();
        const whereClause = { companyId };
        if (batchFilter)
            whereClause.batchId = batchFilter;
        if (opFilter)
            whereClause.operationId = opFilter;
        if (orderFilter)
            whereClause.productionOrderId = orderFilter;
        if (searchStr) {
            whereClause.OR = [
                { operatorName: { contains: searchStr } },
                { batch: { batchNumber: { contains: searchStr } } },
                { operation: { name: { contains: searchStr } } },
                { operation: { code: { contains: searchStr } } }
            ];
        }
        const logs = await db_1.prisma.wipLog.findMany({
            where: whereClause,
            include: {
                batch: {
                    select: { id: true, batchNumber: true, targetQuantity: true, status: true }
                },
                productionOrder: {
                    select: { id: true, orderNumber: true }
                },
                operation: {
                    select: { id: true, name: true, code: true, machineType: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching WIP logs:', error);
        res.status(500).json({ error: 'Failed to fetch WIP logs' });
    }
});
// POST /api/wip/log - Log operation progress on a batch and advance routing
router.post('/log', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { batchId, operationId, operatorName, machineType, completedQuantity, rejectedQuantity, notes } = req.body;
        if (!batchId || typeof batchId !== 'string') {
            res.status(400).json({ error: 'Batch ID is required' });
            return;
        }
        if (!operationId || typeof operationId !== 'string') {
            res.status(400).json({ error: 'Operation ID is required' });
            return;
        }
        const compQty = Number(completedQuantity);
        const rejQty = Number(rejectedQuantity || 0);
        if (isNaN(compQty) || compQty <= 0) {
            res.status(400).json({ error: 'Completed quantity must be greater than 0' });
            return;
        }
        const batch = await db_1.prisma.productionBatch.findFirst({
            where: { id: batchId, companyId },
            include: {
                productionOrder: {
                    include: {
                        routing: {
                            include: {
                                operations: {
                                    include: { operation: true },
                                    orderBy: { sequence: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!batch) {
            res.status(404).json({ error: 'Production batch not found' });
            return;
        }
        const operation = await db_1.prisma.operation.findFirst({
            where: { id: operationId, companyId }
        });
        if (!operation) {
            res.status(404).json({ error: 'Operation not found' });
            return;
        }
        // Determine sequence in routing if routing exists
        let seq = 1;
        let nextOpId = null;
        let isLastOperation = false;
        if (batch.productionOrder && batch.productionOrder.routing && Array.isArray(batch.productionOrder.routing.operations)) {
            const routingOps = batch.productionOrder.routing.operations;
            const currentOpIndex = routingOps.findIndex(ro => ro.operationId === operationId);
            if (currentOpIndex !== -1 && routingOps[currentOpIndex]) {
                seq = routingOps[currentOpIndex].sequence;
                const nextOp = routingOps[currentOpIndex + 1];
                if (nextOp) {
                    nextOpId = nextOp.operationId;
                }
                else {
                    isLastOperation = true;
                }
            }
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            // 1. Create WipLog
            const wipLog = await tx.wipLog.create({
                data: {
                    batchId: batch.id,
                    productionOrderId: batch.productionOrderId,
                    operationId: operation.id,
                    sequence: seq,
                    operatorName: operatorName ? String(operatorName).trim() : null,
                    machineType: machineType ? String(machineType).trim() : (operation.machineType || null),
                    completedQuantity: compQty,
                    rejectedQuantity: rejQty,
                    notes: notes ? String(notes).trim() : null,
                    companyId
                },
                include: {
                    batch: true,
                    operation: true
                }
            });
            // 2. Update ProductionBatch status and current operation
            const newStatus = isLastOperation ? 'IN_INSPECTION' : 'IN_PROGRESS';
            const updatedBatch = await tx.productionBatch.update({
                where: { id: batch.id },
                data: {
                    completedQuantity: {
                        increment: compQty
                    },
                    defectiveQuantity: {
                        increment: rejQty
                    },
                    status: newStatus,
                    currentOperationId: nextOpId || batch.currentOperationId
                }
            });
            // 3. Update ProductionOrder status to IN_PROGRESS if planned
            if (batch.productionOrder.status === 'PLANNED') {
                await tx.productionOrder.update({
                    where: { id: batch.productionOrderId },
                    data: { status: 'IN_PROGRESS', startDate: new Date() }
                });
            }
            return {
                wipLog,
                batch: updatedBatch,
                isLastOperation
            };
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error logging WIP operation:', error);
        res.status(500).json({ error: 'Failed to log WIP operation' });
    }
});
exports.default = router;
//# sourceMappingURL=wip.js.map
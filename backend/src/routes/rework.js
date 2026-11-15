"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_STATUSES = ['PENDING_REWORK', 'IN_REWORK', 'REINSPECTED', 'SCRAPPED'];
// GET /api/rework - List Rework Jobs
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, status, productId } = req.query;
        const searchStr = (q || '').trim().toLowerCase();
        const statusFilter = (status || '').trim();
        const productFilter = (productId || '').trim();
        const whereClause = { companyId };
        if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (productFilter)
            whereClause.productId = productFilter;
        if (searchStr) {
            whereClause.OR = [
                { reworkNumber: { contains: searchStr } },
                { defectType: { contains: searchStr } },
                { reworkNotes: { contains: searchStr } },
                { product: { name: { contains: searchStr } } }
            ];
        }
        const jobs = await db_1.prisma.reworkJob.findMany({
            where: whereClause,
            include: {
                product: {
                    select: { id: true, name: true, sku: true }
                },
                batch: {
                    select: { id: true, batchNumber: true }
                },
                productionOrder: {
                    select: { id: true, orderNumber: true }
                },
                inspection: {
                    select: { id: true, inspectionNumber: true, defectType: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobs);
    }
    catch (error) {
        console.error('Error fetching rework jobs:', error);
        res.status(500).json({ error: 'Failed to fetch rework jobs' });
    }
});
// POST /api/rework/:id/complete - Complete Rework repair & re-inspect garments into Finished Goods
router.post('/:id/complete', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { reworkedQuantity, scrapQuantity, notes } = req.body;
        const job = await db_1.prisma.reworkJob.findFirst({
            where: { id, companyId },
            include: {
                productionOrder: true,
                product: true
            }
        });
        if (!job) {
            res.status(404).json({ error: 'Rework job not found' });
            return;
        }
        if (job.status === 'REINSPECTED' || job.status === 'SCRAPPED') {
            res.status(400).json({ error: `Rework job is already ${job.status}` });
            return;
        }
        const rwkQty = Number(reworkedQuantity || job.quantity);
        const scrapQty = Number(scrapQuantity || 0);
        if (isNaN(rwkQty) || rwkQty < 0) {
            res.status(400).json({ error: 'Reworked quantity must be a non-negative number' });
            return;
        }
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const qcCount = await db_1.prisma.qualityInspection.count({ where: { companyId } });
        const inspectionNumber = `QC-RWK-${dateStr}-${String(qcCount + 1).padStart(4, '0')}`;
        const result = await db_1.prisma.$transaction(async (tx) => {
            // 1. Create Re-inspection record
            const reInspection = await tx.qualityInspection.create({
                data: {
                    inspectionNumber,
                    batchId: job.batchId,
                    productionOrderId: job.productionOrderId,
                    productId: job.productId,
                    variantId: job.variantId,
                    inspectorName: 'Rework Station Quality Inspector',
                    inspectionType: 'FINAL_AUDIT',
                    sampleSize: rwkQty + scrapQty,
                    passedQuantity: rwkQty,
                    reworkQuantity: 0,
                    rejectedQuantity: scrapQty,
                    defectType: job.defectType,
                    result: 'PASS',
                    notes: notes ? `Rework Repair: ${notes}` : 'Garments successfully repaired and re-inspected',
                    companyId
                }
            });
            // 2. Increment Finished Goods Inventory for repaired garments
            if (rwkQty > 0) {
                const fgCount = await tx.finishedGoodsReceipt.count({ where: { companyId } });
                const receiptNumber = `FG-RWK-${dateStr}-${String(fgCount + 1).padStart(4, '0')}`;
                const smCount = await tx.stockMovement.count({ where: { companyId } });
                const movementNumber = `SM-FG-${dateStr}-${String(smCount + 1).padStart(4, '0')}`;
                await tx.finishedGoodsReceipt.create({
                    data: {
                        receiptNumber,
                        productionOrderId: job.productionOrderId,
                        productId: job.productId,
                        variantId: job.variantId,
                        quantity: rwkQty,
                        notes: `Received repaired garments from Rework Job ${job.reworkNumber}`,
                        companyId
                    }
                });
                await tx.product.update({
                    where: { id: job.productId },
                    data: {
                        finishedGoodsStock: { increment: rwkQty }
                    }
                });
                if (job.variantId) {
                    await tx.variant.update({
                        where: { id: job.variantId },
                        data: {
                            finishedGoodsStock: { increment: rwkQty }
                        }
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        movementNumber,
                        productId: job.productId,
                        variantId: job.variantId,
                        type: 'FINISHED_GOODS',
                        quantity: rwkQty,
                        unit: 'Pcs',
                        referenceType: 'REWORK_JOB',
                        referenceId: job.id,
                        notes: `Received passed repaired garments from Rework ${job.reworkNumber}`,
                        companyId
                    }
                });
            }
            // 3. Mark ReworkJob as REINSPECTED
            const updatedJob = await tx.reworkJob.update({
                where: { id: job.id },
                data: {
                    reworkedQuantity: rwkQty,
                    scrapQuantity: scrapQty,
                    status: 'REINSPECTED',
                    reworkNotes: notes ? String(notes).trim() : job.reworkNotes
                },
                include: {
                    product: true,
                    productionOrder: true
                }
            });
            return {
                job: updatedJob,
                reInspection
            };
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error completing rework job:', error);
        res.status(500).json({ error: 'Failed to complete rework job' });
    }
});
exports.default = router;
//# sourceMappingURL=rework.js.map
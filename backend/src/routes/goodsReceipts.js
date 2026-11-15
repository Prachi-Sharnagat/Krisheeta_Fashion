"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_GR_STATUSES = ['RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED'];
// Helper to generate unique receipt number
async function generateReceiptNumber(companyId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db_1.prisma.goodsReceipt.count({ where: { companyId } });
    const sequence = String(count + 1).padStart(4, '0');
    let grNum = `GR-${dateStr}-${sequence}`;
    let exists = await db_1.prisma.goodsReceipt.findFirst({
        where: { receiptNumber: grNum, companyId }
    });
    let attempt = 1;
    while (exists) {
        grNum = `GR-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
        exists = await db_1.prisma.goodsReceipt.findFirst({
            where: { receiptNumber: grNum, companyId }
        });
        attempt++;
    }
    return grNum;
}
// GET /api/goods-receipts - List Goods Receipts
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, purchaseOrderId, supplierId, status } = req.query;
        const searchStr = ((q || search) || '').trim().toLowerCase();
        const statusFilter = (status || '').trim();
        const poFilter = (purchaseOrderId || '').trim();
        const supplierFilter = (supplierId || '').trim();
        const whereClause = { companyId };
        if (poFilter)
            whereClause.purchaseOrderId = poFilter;
        if (supplierFilter)
            whereClause.supplierId = supplierFilter;
        if (statusFilter && VALID_GR_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (searchStr) {
            whereClause.OR = [
                { receiptNumber: { contains: searchStr } },
                { notes: { contains: searchStr } },
                { purchaseOrder: { orderNumber: { contains: searchStr } } },
                { supplier: { name: { contains: searchStr } } }
            ];
        }
        const receipts = await db_1.prisma.goodsReceipt.findMany({
            where: whereClause,
            include: {
                purchaseOrder: {
                    select: { id: true, orderNumber: true, status: true }
                },
                supplier: {
                    select: { id: true, name: true, supplierCode: true, companyName: true }
                },
                items: {
                    include: {
                        material: {
                            select: { id: true, name: true, materialCode: true, unit: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(receipts);
    }
    catch (error) {
        console.error('Error fetching goods receipts:', error);
        res.status(500).json({ error: 'Failed to fetch goods receipts' });
    }
});
// GET /api/goods-receipts/:id - View Goods Receipt detail
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const receipt = await db_1.prisma.goodsReceipt.findFirst({
            where: { id, companyId },
            include: {
                purchaseOrder: {
                    include: {
                        items: {
                            include: { material: true }
                        }
                    }
                },
                supplier: true,
                items: {
                    include: {
                        material: true,
                        purchaseOrderItem: true
                    }
                }
            }
        });
        if (!receipt) {
            res.status(404).json({ error: 'Goods Receipt not found' });
            return;
        }
        res.json(receipt);
    }
    catch (error) {
        console.error('Error fetching goods receipt:', error);
        res.status(500).json({ error: 'Failed to fetch goods receipt details' });
    }
});
// POST /api/goods-receipts - Create Goods Receipt
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { receiptNumber, purchaseOrderId, receiptDate, status, notes, items } = req.body;
        if (!purchaseOrderId || typeof purchaseOrderId !== 'string') {
            res.status(400).json({ error: 'Purchase Order ID is required' });
            return;
        }
        const po = await db_1.prisma.purchaseOrder.findFirst({
            where: { id: purchaseOrderId, companyId },
            include: { items: true }
        });
        if (!po) {
            res.status(400).json({ error: 'Purchase Order not found in your company' });
            return;
        }
        if (po.status === 'CANCELLED') {
            res.status(400).json({ error: 'Cannot create goods receipt for a cancelled Purchase Order' });
            return;
        }
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Goods receipt must contain at least one item' });
            return;
        }
        // Validate each item
        const preparedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const poItem = po.items.find(pi => pi.id === item.purchaseOrderItemId);
            if (!poItem) {
                res.status(400).json({ error: `Item #${i + 1}: Purchase order item not found` });
                return;
            }
            const recQty = Number(item.receivedQuantity || 0);
            const accQty = Number(item.acceptedQuantity || 0);
            const rejQty = Number(item.rejectedQuantity || 0);
            if (recQty < 0 || accQty < 0 || rejQty < 0) {
                res.status(400).json({ error: `Item #${i + 1}: Quantities cannot be negative` });
                return;
            }
            if (recQty === 0) {
                // Skip items with zero received quantity or require > 0
                continue;
            }
            if (accQty + rejQty > recQty) {
                res.status(400).json({
                    error: `Item #${i + 1}: Accepted (${accQty}) + Rejected (${rejQty}) cannot exceed Received Quantity (${recQty})`
                });
                return;
            }
            const remainingQty = poItem.quantity - poItem.receivedQuantity;
            if (recQty > remainingQty + 0.00001) { // slight floating point margin
                res.status(400).json({
                    error: `Item #${i + 1}: Received quantity (${recQty}) exceeds remaining ordered quantity (${remainingQty})`
                });
                return;
            }
            preparedItems.push({
                purchaseOrderItemId: poItem.id,
                materialId: poItem.materialId,
                receivedQuantity: recQty,
                acceptedQuantity: accQty,
                rejectedQuantity: rejQty,
                unit: (item.unit || poItem.unit || 'Pcs').trim(),
                notes: item.notes ? String(item.notes).trim() : null,
                companyId
            });
        }
        if (preparedItems.length === 0) {
            res.status(400).json({ error: 'Please enter a received quantity > 0 for at least one item' });
            return;
        }
        let finalReceiptNumber = (receiptNumber || '').trim();
        if (finalReceiptNumber) {
            const existing = await db_1.prisma.goodsReceipt.findFirst({
                where: { receiptNumber: finalReceiptNumber, companyId }
            });
            if (existing) {
                res.status(400).json({ error: `Receipt Number '${finalReceiptNumber}' already exists` });
                return;
            }
        }
        else {
            finalReceiptNumber = await generateReceiptNumber(companyId);
        }
        const finalStatus = VALID_GR_STATUSES.includes(status) ? status : 'RECEIVED';
        // Execute in transaction
        const result = await db_1.prisma.$transaction(async (tx) => {
            // 1. Create Goods Receipt
            const gr = await tx.goodsReceipt.create({
                data: {
                    receiptNumber: finalReceiptNumber,
                    purchaseOrderId: po.id,
                    supplierId: po.supplierId,
                    receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
                    status: finalStatus,
                    notes: notes ? String(notes).trim() : null,
                    companyId,
                    items: {
                        create: preparedItems
                    }
                },
                include: {
                    items: true,
                    supplier: true,
                    purchaseOrder: true
                }
            });
            // 2. Update receivedQuantity on each PurchaseOrderItem, update Material currentStock & create StockMovement
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const smCount = await tx.stockMovement.count({ where: { companyId } });
            let smSeq = smCount + 1;
            for (const item of preparedItems) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: {
                        receivedQuantity: {
                            increment: item.receivedQuantity
                        }
                    }
                });
                // Update Material currentStock and record Stock Movement for accepted items
                if (item.acceptedQuantity > 0) {
                    await tx.material.update({
                        where: { id: item.materialId },
                        data: {
                            currentStock: {
                                increment: item.acceptedQuantity
                            }
                        }
                    });
                    const movementNumber = `SM-IN-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                    smSeq++;
                    await tx.stockMovement.create({
                        data: {
                            movementNumber,
                            materialId: item.materialId,
                            type: 'INWARD_GRN',
                            quantity: item.acceptedQuantity,
                            unit: item.unit,
                            referenceType: 'GOODS_RECEIPT',
                            referenceId: gr.id,
                            notes: `Received via GR ${gr.receiptNumber}`,
                            companyId
                        }
                    });
                }
            }
            // 3. Evaluate overall Purchase Order status
            const updatedPOItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: po.id }
            });
            const allComplete = updatedPOItems.every(pi => pi.receivedQuantity >= pi.quantity);
            const anyReceived = updatedPOItems.some(pi => pi.receivedQuantity > 0);
            let newPOStatus = po.status;
            if (allComplete) {
                newPOStatus = 'RECEIVED';
            }
            else if (anyReceived) {
                newPOStatus = 'PARTIALLY_RECEIVED';
            }
            if (newPOStatus !== po.status) {
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: { status: newPOStatus }
                });
            }
            return gr;
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error processing goods receipt:', error);
        res.status(500).json({ error: error.message || 'Failed to process goods receipt' });
    }
});
// PUT /api/goods-receipts/:id - Update receipt notes/status
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { status, notes } = req.body;
        const existing = await db_1.prisma.goodsReceipt.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Goods Receipt not found' });
            return;
        }
        const nextStatus = status && VALID_GR_STATUSES.includes(status) ? status : existing.status;
        const updated = await db_1.prisma.goodsReceipt.update({
            where: { id },
            data: {
                status: nextStatus,
                ...(notes !== undefined && { notes: notes ? String(notes).trim() : null })
            },
            include: {
                items: { include: { material: true } },
                supplier: true,
                purchaseOrder: true
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating goods receipt:', error);
        res.status(500).json({ error: error.message || 'Failed to update goods receipt' });
    }
});
// DELETE /api/goods-receipts/:id - Delete Goods Receipt (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const existing = await db_1.prisma.goodsReceipt.findFirst({
            where: { id, companyId },
            include: { items: true, purchaseOrder: { include: { items: true } } }
        });
        if (!existing) {
            res.status(404).json({ error: 'Goods Receipt not found' });
            return;
        }
        // Revert received quantities on PO items inside transaction
        await db_1.prisma.$transaction(async (tx) => {
            for (const item of existing.items) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: {
                        receivedQuantity: {
                            decrement: item.receivedQuantity
                        }
                    }
                });
            }
            await tx.goodsReceipt.delete({
                where: { id }
            });
            // Recalculate PO status
            const poItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: existing.purchaseOrderId }
            });
            const allComplete = poItems.every(pi => pi.receivedQuantity >= pi.quantity);
            const anyReceived = poItems.some(pi => pi.receivedQuantity > 0);
            let newPOStatus = 'SENT'; // fallback
            if (allComplete && poItems.length > 0)
                newPOStatus = 'RECEIVED';
            else if (anyReceived)
                newPOStatus = 'PARTIALLY_RECEIVED';
            else
                newPOStatus = 'DRAFT';
            await tx.purchaseOrder.update({
                where: { id: existing.purchaseOrderId },
                data: { status: newPOStatus }
            });
        });
        res.json({ message: 'Goods Receipt deleted and PO quantities reverted successfully' });
    }
    catch (error) {
        console.error('Error deleting goods receipt:', error);
        res.status(500).json({ error: error.message || 'Failed to delete goods receipt' });
    }
});
exports.default = router;
//# sourceMappingURL=goodsReceipts.js.map
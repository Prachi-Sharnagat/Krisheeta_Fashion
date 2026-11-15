"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_SHIPMENT_STATUSES = ['DRAFT', 'READY', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
// Helper to generate a unique shipment number for a company
async function generateShipmentNumber(companyId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db_1.prisma.shipment.count({ where: { companyId } });
    let nextNum = count + 1;
    let candidate = `SH-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    while (await db_1.prisma.shipment.findFirst({ where: { shipmentNumber: candidate, companyId } })) {
        nextNum += 1;
        candidate = `SH-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
}
// Helper: Verify Quality Inspection approved quantity is available for products/variants
async function verifyQualityForShipmentItems(companyId, items, currentShipmentId) {
    for (const item of items) {
        // 1. Get total passed quantity from QualityInspection
        const inspections = await db_1.prisma.qualityInspection.findMany({
            where: {
                companyId,
                productId: item.productId,
                ...(item.variantId ? { variantId: item.variantId } : {}),
                result: 'PASS'
            }
        });
        const totalApproved = inspections.reduce((sum, qi) => sum + (qi.passedQuantity || 0), 0);
        // 2. Calculate quantity already allocated in READY, DISPATCHED, IN_TRANSIT, or DELIVERED shipments
        const allocatedItems = await db_1.prisma.shipmentItem.findMany({
            where: {
                companyId,
                productId: item.productId,
                ...(item.variantId ? { variantId: item.variantId } : {}),
                shipment: {
                    status: { in: ['READY', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'] },
                    ...(currentShipmentId ? { id: { not: currentShipmentId } } : {})
                }
            }
        });
        const totalAllocated = allocatedItems.reduce((sum, si) => sum + si.quantity, 0);
        if (totalAllocated + item.quantity > totalApproved) {
            return {
                valid: false,
                error: 'Insufficient approved quantity available for shipment.'
            };
        }
    }
    return { valid: true };
}
// Helper: Check allowed status transitions
function isStatusTransitionAllowed(currentStatus, nextStatus) {
    if (currentStatus === nextStatus)
        return true;
    switch (currentStatus) {
        case 'DRAFT':
            return ['READY', 'CANCELLED'].includes(nextStatus);
        case 'READY':
            return ['DRAFT', 'DISPATCHED', 'CANCELLED'].includes(nextStatus);
        case 'DISPATCHED':
            return ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(nextStatus);
        case 'IN_TRANSIT':
            return ['DELIVERED', 'CANCELLED'].includes(nextStatus);
        case 'DELIVERED':
            return false; // Delivered is terminal
        case 'CANCELLED':
            return false; // Cancelled is terminal
        default:
            return false;
    }
}
// GET /api/shipments - List shipments with search & filtering
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, status, customerId, salesOrderId, dateFrom, dateTo } = req.query;
        const searchStr = ((q || search) || '').trim().toLowerCase();
        const statusFilter = (status || '').trim();
        const customerFilter = (customerId || '').trim();
        const orderFilter = (salesOrderId || '').trim();
        const whereClause = { companyId };
        if (statusFilter && VALID_SHIPMENT_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (customerFilter) {
            whereClause.customerId = customerFilter;
        }
        if (orderFilter) {
            whereClause.salesOrderId = orderFilter;
        }
        if (dateFrom || dateTo) {
            whereClause.shipmentDate = {};
            if (dateFrom)
                whereClause.shipmentDate.gte = new Date(dateFrom);
            if (dateTo)
                whereClause.shipmentDate.lte = new Date(dateTo);
        }
        if (searchStr) {
            whereClause.OR = [
                { shipmentNumber: { contains: searchStr } },
                { trackingNumber: { contains: searchStr } },
                { carrier: { contains: searchStr } },
                { notes: { contains: searchStr } },
                { customer: { name: { contains: searchStr } } },
                { salesOrder: { orderNumber: { contains: searchStr } } }
            ];
        }
        const shipments = await db_1.prisma.shipment.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: { id: true, name: true, companyName: true, email: true, phone: true }
                },
                salesOrder: {
                    select: { id: true, orderNumber: true, status: true }
                },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                        variant: { select: { id: true, name: true, sku: true, color: true, size: true } },
                        salesOrderItem: { select: { id: true, quantity: true, unitPrice: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(shipments);
    }
    catch (error) {
        console.error('Error fetching shipments:', error);
        res.status(500).json({ error: 'Failed to fetch shipments' });
    }
});
// GET /api/shipments/:id - View single shipment details
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const shipment = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: {
                customer: true,
                salesOrder: {
                    include: {
                        items: {
                            include: {
                                product: true,
                                variant: true
                            }
                        }
                    }
                },
                items: {
                    include: {
                        product: true,
                        variant: true,
                        salesOrderItem: true
                    }
                }
            }
        });
        if (!shipment) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        res.json(shipment);
    }
    catch (error) {
        console.error('Error fetching shipment details:', error);
        res.status(500).json({ error: 'Failed to fetch shipment details' });
    }
});
// POST /api/shipments - Create a new shipment
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { shipmentNumber, salesOrderId, customerId, warehouseId, shipmentDate, expectedDeliveryDate, status, trackingNumber, carrier, shippingAddress, notes, items } = req.body;
        if (!salesOrderId || typeof salesOrderId !== 'string') {
            res.status(400).json({ error: 'Sales Order is required' });
            return;
        }
        if (!customerId || typeof customerId !== 'string') {
            res.status(400).json({ error: 'Customer is required' });
            return;
        }
        // 1. Verify Sales Order belongs to company
        const salesOrder = await db_1.prisma.salesOrder.findFirst({
            where: { id: salesOrderId, companyId },
            include: { items: true, customer: true }
        });
        if (!salesOrder) {
            res.status(400).json({ error: 'Selected Sales Order does not exist in your company' });
            return;
        }
        // 2. Rule: Shipment customer must match the sales order customer
        if (salesOrder.customerId !== customerId) {
            res.status(400).json({ error: 'Shipment customer must match the sales order customer.' });
            return;
        }
        // 3. Validate Items array
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'At least one shipment item is required' });
            return;
        }
        // 4. Validate Shipment Number uniqueness
        let finalShipmentNumber = shipmentNumber && typeof shipmentNumber === 'string' ? shipmentNumber.trim() : '';
        if (finalShipmentNumber) {
            const existing = await db_1.prisma.shipment.findFirst({
                where: { shipmentNumber: finalShipmentNumber, companyId }
            });
            if (existing) {
                res.status(400).json({ error: 'Shipment Number already exists in your company' });
                return;
            }
        }
        else {
            finalShipmentNumber = await generateShipmentNumber(companyId);
        }
        // 5. Validate items and remaining quantities
        const preparedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const qty = Number(item.quantity);
            if (isNaN(qty) || qty <= 0) {
                res.status(400).json({ error: `Item #${i + 1}: Quantity must be greater than zero` });
                return;
            }
            if (!item.salesOrderItemId || typeof item.salesOrderItemId !== 'string') {
                res.status(400).json({ error: `Item #${i + 1}: Sales Order Item is required` });
                return;
            }
            const soItem = salesOrder.items.find(soi => soi.id === item.salesOrderItemId);
            if (!soItem) {
                res.status(400).json({ error: `Item #${i + 1}: Selected item does not belong to the selected Sales Order` });
                return;
            }
            // Check product belongs to company
            const prodId = item.productId || soItem.productId;
            const product = await db_1.prisma.product.findFirst({
                where: { id: prodId, companyId }
            });
            if (!product) {
                res.status(400).json({ error: `Item #${i + 1}: Product does not belong to your company` });
                return;
            }
            // Check variant belongs to product
            let validVariantId = item.variantId || soItem.variantId || null;
            if (validVariantId) {
                const variant = await db_1.prisma.variant.findFirst({
                    where: { id: validVariantId, productId: product.id, companyId }
                });
                if (!variant) {
                    res.status(400).json({ error: `Item #${i + 1}: Variant does not belong to the selected product` });
                    return;
                }
            }
            // Check remaining quantity on sales order item
            const existingShipmentItems = await db_1.prisma.shipmentItem.findMany({
                where: {
                    salesOrderItemId: soItem.id,
                    companyId,
                    shipment: { status: { not: 'CANCELLED' } }
                }
            });
            const previouslyShipped = existingShipmentItems.reduce((sum, si) => sum + si.quantity, 0);
            const remainingQty = soItem.quantity - previouslyShipped;
            if (qty > remainingQty) {
                res.status(400).json({
                    error: 'Shipment quantity cannot exceed the remaining quantity on the sales order item.'
                });
                return;
            }
            preparedItems.push({
                salesOrderItemId: soItem.id,
                productId: product.id,
                variantId: validVariantId,
                quantity: qty,
                unit: item.unit ? String(item.unit).trim() : 'Pcs',
                companyId
            });
        }
        const targetStatus = status && VALID_SHIPMENT_STATUSES.includes(status) ? status : 'DRAFT';
        // 6. Quality Inspection Validation if READY or DISPATCHED
        if (['READY', 'DISPATCHED'].includes(targetStatus)) {
            const qualityCheck = await verifyQualityForShipmentItems(companyId, preparedItems);
            if (!qualityCheck.valid) {
                res.status(400).json({ error: qualityCheck.error });
                return;
            }
        }
        const defaultAddress = shippingAddress || salesOrder.customer?.address || null;
        // 7. Process creation, and if DISPATCHED, perform atomic inventory transaction
        if (targetStatus === 'DISPATCHED') {
            const result = await db_1.prisma.$transaction(async (tx) => {
                // Re-check inventory availability
                for (const item of preparedItems) {
                    const prod = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!prod || (prod.finishedGoodsStock || 0) < item.quantity) {
                        throw new Error('Insufficient approved quantity available for shipment.');
                    }
                    if (item.variantId) {
                        const v = await tx.variant.findUnique({ where: { id: item.variantId } });
                        if (!v || (v.finishedGoodsStock || 0) < item.quantity) {
                            throw new Error('Insufficient approved quantity available for shipment.');
                        }
                    }
                }
                // Create Shipment
                const shipment = await tx.shipment.create({
                    data: {
                        shipmentNumber: finalShipmentNumber,
                        salesOrderId: salesOrder.id,
                        customerId: salesOrder.customerId,
                        warehouseId: warehouseId ? String(warehouseId).trim() : null,
                        shipmentDate: shipmentDate ? new Date(shipmentDate) : new Date(),
                        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                        status: 'DISPATCHED',
                        trackingNumber: trackingNumber ? String(trackingNumber).trim() : null,
                        carrier: carrier ? String(carrier).trim() : null,
                        shippingAddress: defaultAddress ? String(defaultAddress).trim() : null,
                        notes: notes ? String(notes).trim() : null,
                        companyId,
                        items: {
                            create: preparedItems
                        }
                    },
                    include: {
                        customer: true,
                        salesOrder: true,
                        items: { include: { product: true, variant: true } }
                    }
                });
                // Deduct inventory and record stock movements
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const smCount = await tx.stockMovement.count({ where: { companyId } });
                let smSeq = smCount + 1;
                for (const item of preparedItems) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { finishedGoodsStock: { decrement: item.quantity } }
                    });
                    if (item.variantId) {
                        await tx.variant.update({
                            where: { id: item.variantId },
                            data: { finishedGoodsStock: { decrement: item.quantity } }
                        });
                    }
                    const movementNumber = `SM-ISSUE-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                    smSeq++;
                    await tx.stockMovement.create({
                        data: {
                            movementNumber,
                            productId: item.productId,
                            variantId: item.variantId || null,
                            type: 'ISSUE',
                            quantity: item.quantity,
                            unit: item.unit,
                            referenceType: 'SHIPMENT',
                            referenceId: shipment.id,
                            notes: `Dispatched shipment ${shipment.shipmentNumber}`,
                            companyId
                        }
                    });
                }
                return shipment;
            });
            res.status(201).json(result);
            return;
        }
        // Normal non-dispatched creation (DRAFT or READY)
        const shipment = await db_1.prisma.shipment.create({
            data: {
                shipmentNumber: finalShipmentNumber,
                salesOrderId: salesOrder.id,
                customerId: salesOrder.customerId,
                warehouseId: warehouseId ? String(warehouseId).trim() : null,
                shipmentDate: shipmentDate ? new Date(shipmentDate) : new Date(),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                status: targetStatus,
                trackingNumber: trackingNumber ? String(trackingNumber).trim() : null,
                carrier: carrier ? String(carrier).trim() : null,
                shippingAddress: defaultAddress ? String(defaultAddress).trim() : null,
                notes: notes ? String(notes).trim() : null,
                companyId,
                items: {
                    create: preparedItems
                }
            },
            include: {
                customer: true,
                salesOrder: true,
                items: { include: { product: true, variant: true } }
            }
        });
        res.status(201).json(shipment);
    }
    catch (error) {
        console.error('Error creating shipment:', error);
        res.status(500).json({ error: error.message || 'Failed to create shipment' });
    }
});
// PUT /api/shipments/:id - Update shipment details and items
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { shipmentNumber, salesOrderId, customerId, warehouseId, shipmentDate, expectedDeliveryDate, status, trackingNumber, carrier, shippingAddress, notes, items } = req.body;
        const existing = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: { items: true }
        });
        if (!existing) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        if (['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(existing.status)) {
            res.status(400).json({ error: `Cannot edit a shipment that is already ${existing.status}` });
            return;
        }
        const targetSalesOrderId = salesOrderId || existing.salesOrderId;
        const salesOrder = await db_1.prisma.salesOrder.findFirst({
            where: { id: targetSalesOrderId, companyId },
            include: { items: true }
        });
        if (!salesOrder) {
            res.status(400).json({ error: 'Sales Order not found' });
            return;
        }
        if (customerId && salesOrder.customerId !== customerId) {
            res.status(400).json({ error: 'Shipment customer must match the sales order customer.' });
            return;
        }
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'At least one shipment item is required' });
            return;
        }
        // Validate shipment number uniqueness if modified
        let finalShipmentNumber = shipmentNumber && typeof shipmentNumber === 'string' ? shipmentNumber.trim() : existing.shipmentNumber;
        if (finalShipmentNumber !== existing.shipmentNumber) {
            const codeCheck = await db_1.prisma.shipment.findFirst({
                where: { shipmentNumber: finalShipmentNumber, companyId }
            });
            if (codeCheck) {
                res.status(400).json({ error: 'Shipment Number already exists in your company' });
                return;
            }
        }
        const preparedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const qty = Number(item.quantity);
            if (isNaN(qty) || qty <= 0) {
                res.status(400).json({ error: `Item #${i + 1}: Quantity must be greater than zero` });
                return;
            }
            const soItem = salesOrder.items.find(soi => soi.id === item.salesOrderItemId);
            if (!soItem) {
                res.status(400).json({ error: `Item #${i + 1}: Selected item does not belong to the selected Sales Order` });
                return;
            }
            const prodId = item.productId || soItem.productId;
            const product = await db_1.prisma.product.findFirst({
                where: { id: prodId, companyId }
            });
            if (!product) {
                res.status(400).json({ error: `Item #${i + 1}: Product does not belong to your company` });
                return;
            }
            let validVariantId = item.variantId || soItem.variantId || null;
            if (validVariantId) {
                const variant = await db_1.prisma.variant.findFirst({
                    where: { id: validVariantId, productId: product.id, companyId }
                });
                if (!variant) {
                    res.status(400).json({ error: `Item #${i + 1}: Variant does not belong to the selected product` });
                    return;
                }
            }
            // Check remaining order quantity excluding current shipment
            const existingShipmentItems = await db_1.prisma.shipmentItem.findMany({
                where: {
                    salesOrderItemId: soItem.id,
                    companyId,
                    shipment: { id: { not: existing.id }, status: { not: 'CANCELLED' } }
                }
            });
            const previouslyShipped = existingShipmentItems.reduce((sum, si) => sum + si.quantity, 0);
            const remainingQty = soItem.quantity - previouslyShipped;
            if (qty > remainingQty) {
                res.status(400).json({
                    error: 'Shipment quantity cannot exceed the remaining quantity on the sales order item.'
                });
                return;
            }
            preparedItems.push({
                salesOrderItemId: soItem.id,
                productId: product.id,
                variantId: validVariantId,
                quantity: qty,
                unit: item.unit ? String(item.unit).trim() : 'Pcs',
                companyId
            });
        }
        const targetStatus = status && VALID_SHIPMENT_STATUSES.includes(status) ? status : existing.status;
        if (!isStatusTransitionAllowed(existing.status, targetStatus)) {
            res.status(400).json({ error: `Invalid status transition from ${existing.status} to ${targetStatus}` });
            return;
        }
        if (['READY', 'DISPATCHED'].includes(targetStatus)) {
            const qualityCheck = await verifyQualityForShipmentItems(companyId, preparedItems, existing.id);
            if (!qualityCheck.valid) {
                res.status(400).json({ error: qualityCheck.error });
                return;
            }
        }
        // Execute update inside a transaction: replace shipment items
        const updated = await db_1.prisma.$transaction(async (tx) => {
            await tx.shipmentItem.deleteMany({
                where: { shipmentId: existing.id }
            });
            return tx.shipment.update({
                where: { id: existing.id },
                data: {
                    shipmentNumber: finalShipmentNumber,
                    salesOrderId: salesOrder.id,
                    customerId: salesOrder.customerId,
                    warehouseId: warehouseId !== undefined ? (warehouseId ? String(warehouseId).trim() : null) : existing.warehouseId,
                    shipmentDate: shipmentDate ? new Date(shipmentDate) : existing.shipmentDate,
                    expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : existing.expectedDeliveryDate,
                    status: targetStatus,
                    trackingNumber: trackingNumber !== undefined ? (trackingNumber ? String(trackingNumber).trim() : null) : existing.trackingNumber,
                    carrier: carrier !== undefined ? (carrier ? String(carrier).trim() : null) : existing.carrier,
                    shippingAddress: shippingAddress !== undefined ? (shippingAddress ? String(shippingAddress).trim() : null) : existing.shippingAddress,
                    notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
                    items: {
                        create: preparedItems
                    }
                },
                include: {
                    customer: true,
                    salesOrder: true,
                    items: { include: { product: true, variant: true } }
                }
            });
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating shipment:', error);
        res.status(500).json({ error: error.message || 'Failed to update shipment' });
    }
});
// DELETE /api/shipments/:id - Delete shipment (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const existing = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: { items: true }
        });
        if (!existing) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        // If shipment was already dispatched, restore inventory inside transaction
        await db_1.prisma.$transaction(async (tx) => {
            if (['DISPATCHED', 'IN_TRANSIT'].includes(existing.status)) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const smCount = await tx.stockMovement.count({ where: { companyId } });
                let smSeq = smCount + 1;
                for (const item of existing.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { finishedGoodsStock: { increment: item.quantity } }
                    });
                    if (item.variantId) {
                        await tx.variant.update({
                            where: { id: item.variantId },
                            data: { finishedGoodsStock: { increment: item.quantity } }
                        });
                    }
                    const movementNumber = `SM-ADJ-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                    smSeq++;
                    await tx.stockMovement.create({
                        data: {
                            movementNumber,
                            productId: item.productId,
                            variantId: item.variantId || null,
                            type: 'FINISHED_GOODS',
                            quantity: item.quantity,
                            unit: item.unit,
                            referenceType: 'SHIPMENT_CANCEL',
                            referenceId: existing.id,
                            notes: `Stock restored from deleted shipment ${existing.shipmentNumber}`,
                            companyId
                        }
                    });
                }
            }
            await tx.shipment.delete({ where: { id: existing.id } });
        });
        res.json({ message: 'Shipment deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting shipment:', error);
        res.status(500).json({ error: error.message || 'Failed to delete shipment' });
    }
});
// PATCH /api/shipments/:id/status - Update shipment lifecycle status
router.patch('/:id/status', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { status } = req.body;
        if (!status || !VALID_SHIPMENT_STATUSES.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_SHIPMENT_STATUSES.join(', ')}` });
            return;
        }
        const shipment = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: { items: true, salesOrder: true }
        });
        if (!shipment) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        if (!isStatusTransitionAllowed(shipment.status, status)) {
            res.status(400).json({ error: `Invalid status transition from ${shipment.status} to ${status}` });
            return;
        }
        // Handle dispatch status transition
        if (status === 'DISPATCHED' && shipment.status !== 'DISPATCHED') {
            // Dispatch logic
            const qualityCheck = await verifyQualityForShipmentItems(companyId, shipment.items, shipment.id);
            if (!qualityCheck.valid) {
                res.status(400).json({ error: qualityCheck.error });
                return;
            }
            const result = await db_1.prisma.$transaction(async (tx) => {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const smCount = await tx.stockMovement.count({ where: { companyId } });
                let smSeq = smCount + 1;
                for (const item of shipment.items) {
                    const prod = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!prod || (prod.finishedGoodsStock || 0) < item.quantity) {
                        throw new Error('Insufficient approved quantity available for shipment.');
                    }
                    if (item.variantId) {
                        const v = await tx.variant.findUnique({ where: { id: item.variantId } });
                        if (!v || (v.finishedGoodsStock || 0) < item.quantity) {
                            throw new Error('Insufficient approved quantity available for shipment.');
                        }
                    }
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { finishedGoodsStock: { decrement: item.quantity } }
                    });
                    if (item.variantId) {
                        await tx.variant.update({
                            where: { id: item.variantId },
                            data: { finishedGoodsStock: { decrement: item.quantity } }
                        });
                    }
                    const movementNumber = `SM-ISSUE-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                    smSeq++;
                    await tx.stockMovement.create({
                        data: {
                            movementNumber,
                            productId: item.productId,
                            variantId: item.variantId || null,
                            type: 'ISSUE',
                            quantity: item.quantity,
                            unit: item.unit,
                            referenceType: 'SHIPMENT',
                            referenceId: shipment.id,
                            notes: `Dispatched shipment ${shipment.shipmentNumber}`,
                            companyId
                        }
                    });
                }
                return tx.shipment.update({
                    where: { id: shipment.id },
                    data: { status: 'DISPATCHED' },
                    include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
                });
            });
            res.json(result);
            return;
        }
        // Handle delivery status transition
        if (status === 'DELIVERED') {
            const result = await db_1.prisma.$transaction(async (tx) => {
                const updated = await tx.shipment.update({
                    where: { id: shipment.id },
                    data: {
                        status: 'DELIVERED',
                        actualDeliveryDate: new Date()
                    },
                    include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
                });
                // Check if Sales Order can be completed
                const soItems = await tx.salesOrderItem.findMany({
                    where: { salesOrderId: shipment.salesOrderId }
                });
                const deliveredShipmentItems = await tx.shipmentItem.findMany({
                    where: {
                        companyId,
                        shipment: { salesOrderId: shipment.salesOrderId, status: 'DELIVERED' }
                    }
                });
                const isFullyDelivered = soItems.every(soi => {
                    const totalDelivered = deliveredShipmentItems
                        .filter(si => si.salesOrderItemId === soi.id)
                        .reduce((sum, si) => sum + si.quantity, 0);
                    return totalDelivered >= soi.quantity;
                });
                if (isFullyDelivered) {
                    await tx.salesOrder.update({
                        where: { id: shipment.salesOrderId },
                        data: { status: 'COMPLETED' }
                    });
                }
                return updated;
            });
            res.json(result);
            return;
        }
        // Handle cancellation of a dispatched shipment
        if (status === 'CANCELLED' && ['DISPATCHED', 'IN_TRANSIT'].includes(shipment.status)) {
            const result = await db_1.prisma.$transaction(async (tx) => {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const smCount = await tx.stockMovement.count({ where: { companyId } });
                let smSeq = smCount + 1;
                for (const item of shipment.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { finishedGoodsStock: { increment: item.quantity } }
                    });
                    if (item.variantId) {
                        await tx.variant.update({
                            where: { id: item.variantId },
                            data: { finishedGoodsStock: { increment: item.quantity } }
                        });
                    }
                    const movementNumber = `SM-ADJ-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                    smSeq++;
                    await tx.stockMovement.create({
                        data: {
                            movementNumber,
                            productId: item.productId,
                            variantId: item.variantId || null,
                            type: 'FINISHED_GOODS',
                            quantity: item.quantity,
                            unit: item.unit,
                            referenceType: 'SHIPMENT_CANCEL',
                            referenceId: shipment.id,
                            notes: `Stock restored from cancelled shipment ${shipment.shipmentNumber}`,
                            companyId
                        }
                    });
                }
                return tx.shipment.update({
                    where: { id: shipment.id },
                    data: { status: 'CANCELLED' },
                    include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
                });
            });
            res.json(result);
            return;
        }
        // General status update (DRAFT, READY, IN_TRANSIT, CANCELLED from DRAFT)
        if (status === 'READY') {
            const qualityCheck = await verifyQualityForShipmentItems(companyId, shipment.items, shipment.id);
            if (!qualityCheck.valid) {
                res.status(400).json({ error: qualityCheck.error });
                return;
            }
        }
        const updated = await db_1.prisma.shipment.update({
            where: { id: shipment.id },
            data: { status },
            include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating shipment status:', error);
        res.status(500).json({ error: error.message || 'Failed to update shipment status' });
    }
});
// PATCH /api/shipments/:id/dispatch - Dispatch shipment directly
router.patch('/:id/dispatch', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const shipment = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: { items: true }
        });
        if (!shipment) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        if (shipment.status === 'DISPATCHED') {
            res.status(400).json({ error: 'Shipment has already been dispatched.' });
            return;
        }
        if (!['DRAFT', 'READY'].includes(shipment.status)) {
            res.status(400).json({ error: `Cannot dispatch a shipment with status ${shipment.status}` });
            return;
        }
        // Quality check
        const qualityCheck = await verifyQualityForShipmentItems(companyId, shipment.items, shipment.id);
        if (!qualityCheck.valid) {
            res.status(400).json({ error: qualityCheck.error });
            return;
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const smCount = await tx.stockMovement.count({ where: { companyId } });
            let smSeq = smCount + 1;
            for (const item of shipment.items) {
                const prod = await tx.product.findUnique({ where: { id: item.productId } });
                if (!prod || (prod.finishedGoodsStock || 0) < item.quantity) {
                    throw new Error('Insufficient approved quantity available for shipment.');
                }
                if (item.variantId) {
                    const v = await tx.variant.findUnique({ where: { id: item.variantId } });
                    if (!v || (v.finishedGoodsStock || 0) < item.quantity) {
                        throw new Error('Insufficient approved quantity available for shipment.');
                    }
                }
                await tx.product.update({
                    where: { id: item.productId },
                    data: { finishedGoodsStock: { decrement: item.quantity } }
                });
                if (item.variantId) {
                    await tx.variant.update({
                        where: { id: item.variantId },
                        data: { finishedGoodsStock: { decrement: item.quantity } }
                    });
                }
                const movementNumber = `SM-ISSUE-${dateStr}-${String(smSeq).padStart(4, '0')}`;
                smSeq++;
                await tx.stockMovement.create({
                    data: {
                        movementNumber,
                        productId: item.productId,
                        variantId: item.variantId || null,
                        type: 'ISSUE',
                        quantity: item.quantity,
                        unit: item.unit,
                        referenceType: 'SHIPMENT',
                        referenceId: shipment.id,
                        notes: `Dispatched shipment ${shipment.shipmentNumber}`,
                        companyId
                    }
                });
            }
            return tx.shipment.update({
                where: { id: shipment.id },
                data: { status: 'DISPATCHED' },
                include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
            });
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error dispatching shipment:', error);
        res.status(400).json({ error: error.message || 'Failed to dispatch shipment' });
    }
});
// PATCH /api/shipments/:id/deliver - Deliver shipment directly
router.patch('/:id/deliver', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const shipment = await db_1.prisma.shipment.findFirst({
            where: { id, companyId },
            include: { items: true }
        });
        if (!shipment) {
            res.status(404).json({ error: 'Shipment not found' });
            return;
        }
        if (shipment.status === 'DELIVERED') {
            res.status(400).json({ error: 'Shipment is already delivered.' });
            return;
        }
        if (!['DISPATCHED', 'IN_TRANSIT'].includes(shipment.status)) {
            res.status(400).json({ error: `Cannot deliver a shipment with status ${shipment.status}. Shipment must be DISPATCHED or IN_TRANSIT.` });
            return;
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.shipment.update({
                where: { id: shipment.id },
                data: {
                    status: 'DELIVERED',
                    actualDeliveryDate: new Date()
                },
                include: { customer: true, salesOrder: true, items: { include: { product: true, variant: true } } }
            });
            // Evaluate Sales Order completion status
            const soItems = await tx.salesOrderItem.findMany({
                where: { salesOrderId: shipment.salesOrderId }
            });
            const deliveredShipmentItems = await tx.shipmentItem.findMany({
                where: {
                    companyId,
                    shipment: { salesOrderId: shipment.salesOrderId, status: 'DELIVERED' }
                }
            });
            const isFullyDelivered = soItems.every(soi => {
                const totalDelivered = deliveredShipmentItems
                    .filter(si => si.salesOrderItemId === soi.id)
                    .reduce((sum, si) => sum + si.quantity, 0);
                return totalDelivered >= soi.quantity;
            });
            if (isFullyDelivered) {
                await tx.salesOrder.update({
                    where: { id: shipment.salesOrderId },
                    data: { status: 'COMPLETED' }
                });
            }
            return updated;
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error marking shipment delivered:', error);
        res.status(500).json({ error: error.message || 'Failed to mark shipment delivered' });
    }
});
exports.default = router;
//# sourceMappingURL=shipments.js.map
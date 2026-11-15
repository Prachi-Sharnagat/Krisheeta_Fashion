"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'COMPLETED', 'CANCELLED'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
// Helper to generate a unique order number for a company if not provided
async function generateOrderNumber(companyId) {
    const count = await db_1.prisma.salesOrder.count({ where: { companyId } });
    const year = new Date().getFullYear();
    let nextNum = count + 1;
    let candidate = `SO-${year}-${String(nextNum).padStart(4, '0')}`;
    // Ensure uniqueness in case of deleted orders
    while (await db_1.prisma.salesOrder.findFirst({ where: { orderNumber: candidate, companyId } })) {
        nextNum += 1;
        candidate = `SO-${year}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
}
// GET /api/orders - List sales orders with filters
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, status, priority, dateFrom, dateTo } = req.query;
        const searchStr = ((q || search) || '').trim().toLowerCase();
        const statusFilter = (status || '').trim();
        const priorityFilter = (priority || '').trim();
        const whereClause = { companyId };
        if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (priorityFilter && VALID_PRIORITIES.includes(priorityFilter)) {
            whereClause.priority = priorityFilter;
        }
        if (dateFrom || dateTo) {
            whereClause.orderDate = {};
            if (dateFrom)
                whereClause.orderDate.gte = new Date(dateFrom);
            if (dateTo)
                whereClause.orderDate.lte = new Date(dateTo);
        }
        if (searchStr) {
            whereClause.OR = [
                { orderNumber: { contains: searchStr } },
                { customer: { name: { contains: searchStr } } },
                { customer: { companyName: { contains: searchStr } } },
            ];
        }
        const orders = await db_1.prisma.salesOrder.findMany({
            where: whereClause,
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        variant: true,
                        shipmentItems: {
                            include: {
                                shipment: { select: { id: true, shipmentNumber: true, status: true } }
                            }
                        }
                    }
                },
                shipments: {
                    select: { id: true, shipmentNumber: true, status: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const enrichedOrders = orders.map(order => {
            const items = order.items.map(item => {
                const shippedQuantity = item.shipmentItems
                    ?.filter(si => ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(si.shipment.status))
                    .reduce((sum, si) => sum + si.quantity, 0) || 0;
                const deliveredQuantity = item.shipmentItems
                    ?.filter(si => si.shipment.status === 'DELIVERED')
                    .reduce((sum, si) => sum + si.quantity, 0) || 0;
                const remainingQuantity = Math.max(0, item.quantity - shippedQuantity);
                return {
                    ...item,
                    shippedQuantity,
                    deliveredQuantity,
                    remainingQuantity
                };
            });
            const totalOrderedQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
            const totalShippedQuantity = items.reduce((sum, i) => sum + i.shippedQuantity, 0);
            const totalRemainingQuantity = Math.max(0, totalOrderedQuantity - totalShippedQuantity);
            return {
                ...order,
                items,
                totalOrderedQuantity,
                totalShippedQuantity,
                totalRemainingQuantity
            };
        });
        res.json(enrichedOrders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch sales orders' });
    }
});
// GET /api/orders/:id - View single sales order
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const orderId = String(req.params.id);
        const order = await db_1.prisma.salesOrder.findFirst({
            where: { id: orderId, companyId },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        variant: true,
                        shipmentItems: {
                            include: {
                                shipment: { select: { id: true, shipmentNumber: true, status: true, shipmentDate: true } }
                            }
                        }
                    }
                },
                shipments: {
                    include: {
                        items: {
                            include: { product: true, variant: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!order) {
            res.status(404).json({ error: 'Sales order not found' });
            return;
        }
        const items = order.items.map(item => {
            const shippedQuantity = item.shipmentItems
                ?.filter(si => ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(si.shipment.status))
                .reduce((sum, si) => sum + si.quantity, 0) || 0;
            const deliveredQuantity = item.shipmentItems
                ?.filter(si => si.shipment.status === 'DELIVERED')
                .reduce((sum, si) => sum + si.quantity, 0) || 0;
            const remainingQuantity = Math.max(0, item.quantity - shippedQuantity);
            return {
                ...item,
                shippedQuantity,
                deliveredQuantity,
                remainingQuantity
            };
        });
        const totalOrderedQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
        const totalShippedQuantity = items.reduce((sum, i) => sum + i.shippedQuantity, 0);
        const totalRemainingQuantity = Math.max(0, totalOrderedQuantity - totalShippedQuantity);
        res.json({
            ...order,
            items,
            totalOrderedQuantity,
            totalShippedQuantity,
            totalRemainingQuantity
        });
    }
    catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Failed to fetch sales order details' });
    }
});
// POST /api/orders - Create new sales order
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { orderNumber, customerId, orderDate, expectedDeliveryDate, status, priority, notes, items } = req.body;
        if (!customerId || typeof customerId !== 'string') {
            res.status(400).json({ error: 'Customer is required' });
            return;
        }
        // Verify Customer belongs to company
        const customer = await db_1.prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });
        if (!customer) {
            res.status(400).json({ error: 'Selected customer does not exist in your company' });
            return;
        }
        // Validate Items array
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'At least one order item is required' });
            return;
        }
        // Determine & validate Order Number
        let finalOrderNumber = orderNumber && typeof orderNumber === 'string' ? orderNumber.trim() : '';
        if (finalOrderNumber) {
            const existing = await db_1.prisma.salesOrder.findFirst({
                where: { orderNumber: finalOrderNumber, companyId }
            });
            if (existing) {
                res.status(400).json({ error: 'Order Number already exists in your company' });
                return;
            }
        }
        else {
            finalOrderNumber = await generateOrderNumber(companyId);
        }
        // Validate each item and calculate totals on backend
        let calculatedGrandTotal = 0;
        const processedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            if (!item.productId || typeof item.productId !== 'string') {
                res.status(400).json({ error: `Item ${i + 1}: Product is required` });
                return;
            }
            if (isNaN(quantity) || quantity <= 0) {
                res.status(400).json({ error: `Item ${i + 1}: Quantity must be greater than 0` });
                return;
            }
            if (isNaN(unitPrice) || unitPrice < 0) {
                res.status(400).json({ error: `Item ${i + 1}: Unit price cannot be negative` });
                return;
            }
            // Verify Product belongs to company
            const product = await db_1.prisma.product.findFirst({
                where: { id: item.productId, companyId }
            });
            if (!product) {
                res.status(400).json({ error: `Item ${i + 1}: Product does not exist in your company` });
                return;
            }
            if (product.status !== 'ACTIVE') {
                res.status(400).json({ error: `Item ${i + 1}: Product "${product.name}" is ${product.status.toLowerCase()} and cannot be used for new sales orders` });
                return;
            }
            // Verify Variant belongs to Product and Company if variantId provided
            let validVariantId = null;
            if (item.variantId && typeof item.variantId === 'string' && item.variantId.trim()) {
                const variant = await db_1.prisma.variant.findFirst({
                    where: { id: item.variantId, productId: item.productId, companyId }
                });
                if (!variant) {
                    res.status(400).json({ error: `Item ${i + 1}: Selected variant does not belong to the selected product` });
                    return;
                }
                if (variant.status !== 'ACTIVE') {
                    res.status(400).json({ error: `Item ${i + 1}: Selected variant is ${variant.status.toLowerCase()} and cannot be used for new sales orders` });
                    return;
                }
                validVariantId = variant.id;
            }
            const itemTotalPrice = quantity * unitPrice;
            calculatedGrandTotal += itemTotalPrice;
            processedItems.push({
                productId: product.id,
                variantId: validVariantId,
                quantity,
                unitPrice,
                totalPrice: itemTotalPrice,
                companyId
            });
        }
        const orderStatus = status && VALID_STATUSES.includes(status) ? status : 'DRAFT';
        const orderPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'NORMAL';
        const order = await db_1.prisma.salesOrder.create({
            data: {
                orderNumber: finalOrderNumber,
                customerId: customer.id,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                status: orderStatus,
                priority: orderPriority,
                notes: notes ? String(notes).trim() : null,
                totalAmount: calculatedGrandTotal,
                companyId,
                items: {
                    create: processedItems
                }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        variant: true
                    }
                }
            }
        });
        res.status(201).json(order);
    }
    catch (error) {
        console.error('Error creating sales order:', error);
        res.status(500).json({ error: error.message || 'Failed to create sales order' });
    }
});
// PUT /api/orders/:id - Update sales order and order items
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const orderId = String(req.params.id);
        const { orderNumber, customerId, orderDate, expectedDeliveryDate, status, priority, notes, items } = req.body;
        const existingOrder = await db_1.prisma.salesOrder.findFirst({
            where: { id: orderId, companyId }
        });
        if (!existingOrder) {
            res.status(404).json({ error: 'Sales order not found' });
            return;
        }
        if (!customerId || typeof customerId !== 'string') {
            res.status(400).json({ error: 'Customer is required' });
            return;
        }
        const customer = await db_1.prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });
        if (!customer) {
            res.status(400).json({ error: 'Selected customer does not exist in your company' });
            return;
        }
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'At least one order item is required' });
            return;
        }
        // Validate Order Number uniqueness if changed
        let finalOrderNumber = orderNumber && typeof orderNumber === 'string' ? orderNumber.trim() : existingOrder.orderNumber;
        if (finalOrderNumber !== existingOrder.orderNumber) {
            const codeCheck = await db_1.prisma.salesOrder.findFirst({
                where: { orderNumber: finalOrderNumber, companyId }
            });
            if (codeCheck) {
                res.status(400).json({ error: 'Order Number already exists in your company' });
                return;
            }
        }
        let calculatedGrandTotal = 0;
        const processedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            if (!item.productId || typeof item.productId !== 'string') {
                res.status(400).json({ error: `Item ${i + 1}: Product is required` });
                return;
            }
            if (isNaN(quantity) || quantity <= 0) {
                res.status(400).json({ error: `Item ${i + 1}: Quantity must be greater than 0` });
                return;
            }
            if (isNaN(unitPrice) || unitPrice < 0) {
                res.status(400).json({ error: `Item ${i + 1}: Unit price cannot be negative` });
                return;
            }
            const product = await db_1.prisma.product.findFirst({
                where: { id: item.productId, companyId }
            });
            if (!product) {
                res.status(400).json({ error: `Item ${i + 1}: Product does not exist in your company` });
                return;
            }
            let validVariantId = null;
            if (item.variantId && typeof item.variantId === 'string' && item.variantId.trim()) {
                const variant = await db_1.prisma.variant.findFirst({
                    where: { id: item.variantId, productId: item.productId, companyId }
                });
                if (!variant) {
                    res.status(400).json({ error: `Item ${i + 1}: Selected variant does not belong to the selected product` });
                    return;
                }
                validVariantId = variant.id;
            }
            const itemTotalPrice = quantity * unitPrice;
            calculatedGrandTotal += itemTotalPrice;
            processedItems.push({
                productId: product.id,
                variantId: validVariantId,
                quantity,
                unitPrice,
                totalPrice: itemTotalPrice,
                companyId
            });
        }
        const orderStatus = status && VALID_STATUSES.includes(status) ? status : existingOrder.status;
        const orderPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : existingOrder.priority;
        // Execute update in a transaction: replace old items with new items
        const updatedOrder = await db_1.prisma.$transaction(async (tx) => {
            await tx.salesOrderItem.deleteMany({
                where: { salesOrderId: orderId }
            });
            return tx.salesOrder.update({
                where: { id: orderId },
                data: {
                    orderNumber: finalOrderNumber,
                    customerId: customer.id,
                    orderDate: orderDate ? new Date(orderDate) : existingOrder.orderDate,
                    expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                    status: orderStatus,
                    priority: orderPriority,
                    notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existingOrder.notes,
                    totalAmount: calculatedGrandTotal,
                    items: {
                        create: processedItems
                    }
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true,
                            variant: true
                        }
                    }
                }
            });
        });
        res.json(updatedOrder);
    }
    catch (error) {
        console.error('Error updating sales order:', error);
        res.status(500).json({ error: error.message || 'Failed to update sales order' });
    }
});
// PATCH /api/orders/:id/status - Update order status lifecycle
router.patch('/:id/status', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const orderId = String(req.params.id);
        const { status } = req.body;
        if (!status || !VALID_STATUSES.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
            return;
        }
        const existingOrder = await db_1.prisma.salesOrder.findFirst({
            where: { id: orderId, companyId }
        });
        if (!existingOrder) {
            res.status(404).json({ error: 'Sales order not found' });
            return;
        }
        const updatedOrder = await db_1.prisma.salesOrder.update({
            where: { id: orderId },
            data: { status },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        variant: true
                    }
                }
            }
        });
        res.json(updatedOrder);
    }
    catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: error.message || 'Failed to update order status' });
    }
});
// DELETE /api/orders/:id - Delete sales order (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const orderId = String(req.params.id);
        const existingOrder = await db_1.prisma.salesOrder.findFirst({
            where: { id: orderId, companyId }
        });
        if (!existingOrder) {
            res.status(404).json({ error: 'Sales order not found' });
            return;
        }
        await db_1.prisma.salesOrder.delete({
            where: { id: orderId }
        });
        res.json({ message: 'Sales order deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting sales order:', error);
        res.status(500).json({ error: error.message || 'Failed to delete sales order' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map
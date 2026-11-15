"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_VARIANT_STATUSES = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all variant routes
router.use(auth_1.authenticateUser);
exports.VALID_VARIANT_STATUSES = ['ACTIVE', 'INACTIVE'];
// GET /api/variants - List variants across products with optional filtering & pagination
router.get('/variants', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { productId, size, color, status, q, search, page, limit, sortBy, sortOrder, format } = req.query;
        const searchStr = ((q || search) || '').trim();
        const sizeFilter = (size || '').trim();
        const colorFilter = (color || '').trim();
        const statusFilter = (status || '').trim().toUpperCase();
        const whereClause = { companyId };
        if (productId && typeof productId === 'string') {
            whereClause.productId = productId.trim();
        }
        if (sizeFilter) {
            whereClause.size = { equals: sizeFilter };
        }
        if (colorFilter) {
            whereClause.color = { equals: colorFilter };
        }
        if (statusFilter && exports.VALID_VARIANT_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (searchStr) {
            whereClause.OR = [
                { sku: { contains: searchStr } },
                { name: { contains: searchStr } },
                { color: { contains: searchStr } },
                { size: { contains: searchStr } },
                { product: { name: { contains: searchStr } } },
                { product: { productCode: { contains: searchStr } } }
            ];
        }
        const validSortFields = ['sku', 'name', 'color', 'size', 'price', 'status', 'createdAt', 'updatedAt'];
        const sortField = typeof sortBy === 'string' && validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
        const orderBy = { [sortField]: sortDirection };
        const isPaginated = page !== undefined || limit !== undefined || format === 'paginated';
        if (isPaginated) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
            const skip = (pageNum - 1) * limitNum;
            const [total, variants] = await Promise.all([
                db_1.prisma.variant.count({ where: whereClause }),
                db_1.prisma.variant.findMany({
                    where: whereClause,
                    include: {
                        product: {
                            select: { id: true, name: true, productCode: true, sku: true, garmentType: true, category: true }
                        }
                    },
                    orderBy,
                    skip,
                    take: limitNum
                })
            ]);
            res.json({
                success: true,
                message: 'Variants retrieved successfully',
                data: variants,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
            return;
        }
        const variants = await db_1.prisma.variant.findMany({
            where: whereClause,
            include: {
                product: {
                    select: { id: true, name: true, productCode: true, sku: true, garmentType: true, category: true }
                }
            },
            orderBy
        });
        res.json(variants);
    }
    catch (error) {
        console.error('Failed to fetch variants:', error);
        res.status(500).json({ error: 'Failed to fetch variants' });
    }
});
// GET /api/variants/:id - View single variant
router.get('/variants/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const variant = await db_1.prisma.variant.findFirst({
            where: {
                id: req.params.id,
                companyId
            },
            include: {
                product: true
            }
        });
        if (!variant) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        res.json(variant);
    }
    catch (error) {
        console.error('Failed to fetch variant:', error);
        res.status(500).json({ error: 'Failed to fetch variant' });
    }
});
// GET /api/products/:productId/variants - Get all variants for a specific product
router.get('/products/:productId/variants', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.productId;
        const { size, color, status } = req.query;
        // Verify product ownership first
        const product = await db_1.prisma.product.findFirst({
            where: { id: productId, companyId }
        });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const whereClause = {
            productId,
            companyId
        };
        if (size) {
            whereClause.size = { equals: size.trim() };
        }
        if (color) {
            whereClause.color = { equals: color.trim() };
        }
        if (status && exports.VALID_VARIANT_STATUSES.includes(status.trim().toUpperCase())) {
            whereClause.status = status.trim().toUpperCase();
        }
        const variants = await db_1.prisma.variant.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' }
        });
        res.json(variants);
    }
    catch (error) {
        console.error('Failed to fetch variants:', error);
        res.status(500).json({ error: 'Failed to fetch variants' });
    }
});
// POST /api/products/:productId/variants - Create variant for a product
router.post('/products/:productId/variants', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.productId;
        const { name, sku, color, size, price, status } = req.body;
        // Verify product ownership
        const product = await db_1.prisma.product.findFirst({
            where: { id: productId, companyId }
        });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Determine SKU
        let finalSku = (sku && typeof sku === 'string' && sku.trim()) ? sku.trim() : '';
        if (!finalSku) {
            const sizeTag = size ? String(size).trim().toUpperCase() : 'STD';
            const colorTag = color ? String(color).trim().substring(0, 3).toUpperCase() : 'GEN';
            finalSku = `${product.productCode || product.sku || 'PRD'}-${sizeTag}-${colorTag}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        }
        // Check SKU uniqueness in company (across variants and products)
        const existingVariant = await db_1.prisma.variant.findFirst({
            where: { sku: finalSku, companyId }
        });
        if (existingVariant) {
            res.status(400).json({ error: 'Variant SKU already exists in this company' });
            return;
        }
        const existingProduct = await db_1.prisma.product.findFirst({
            where: { sku: finalSku, companyId }
        });
        if (existingProduct) {
            res.status(400).json({ error: 'SKU conflicts with an existing product in this company' });
            return;
        }
        const finalStatus = (status && typeof status === 'string' && status.trim().toUpperCase()) || 'ACTIVE';
        if (!exports.VALID_VARIANT_STATUSES.includes(finalStatus)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${exports.VALID_VARIANT_STATUSES.join(', ')}` });
            return;
        }
        const finalName = (name && typeof name === 'string' && name.trim())
            ? name.trim()
            : `${product.name}${size ? ' - ' + size : ''}${color ? ' / ' + color : ''}`;
        const numPrice = price !== undefined && price !== null && !isNaN(Number(price)) ? Number(price) : 0;
        const variant = await db_1.prisma.variant.create({
            data: {
                name: finalName,
                sku: finalSku,
                color: color ? String(color).trim() : null,
                size: size ? String(size).trim() : null,
                price: numPrice,
                status: finalStatus,
                productId,
                companyId
            }
        });
        res.status(201).json(variant);
    }
    catch (error) {
        console.error('Failed to create variant:', error);
        res.status(500).json({ error: error.message || 'Failed to create variant' });
    }
});
// PUT /api/variants/:id - Update variant
router.put('/variants/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const variantId = req.params.id;
        const { name, sku, color, size, price, status } = req.body;
        const existing = await db_1.prisma.variant.findFirst({
            where: { id: variantId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        // Check SKU uniqueness if changed
        if (sku && typeof sku === 'string') {
            const trimmedSku = sku.trim();
            if (trimmedSku !== existing.sku) {
                const skuCheck = await db_1.prisma.variant.findFirst({
                    where: { sku: trimmedSku, companyId }
                });
                if (skuCheck) {
                    res.status(400).json({ error: 'Variant SKU already exists in this company' });
                    return;
                }
                const productSkuCheck = await db_1.prisma.product.findFirst({
                    where: { sku: trimmedSku, companyId }
                });
                if (productSkuCheck) {
                    res.status(400).json({ error: 'SKU conflicts with an existing product in this company' });
                    return;
                }
            }
        }
        let finalStatus = existing.status;
        if (status && typeof status === 'string') {
            const st = status.trim().toUpperCase();
            if (!exports.VALID_VARIANT_STATUSES.includes(st)) {
                res.status(400).json({ error: `Invalid status. Must be one of: ${exports.VALID_VARIANT_STATUSES.join(', ')}` });
                return;
            }
            finalStatus = st;
        }
        const numPrice = price !== undefined && price !== null && !isNaN(Number(price))
            ? Number(price)
            : existing.price;
        const variant = await db_1.prisma.variant.update({
            where: { id: variantId },
            data: {
                name: (name !== undefined && typeof name === 'string') ? name.trim() : existing.name,
                sku: (sku !== undefined && typeof sku === 'string') ? sku.trim() : existing.sku,
                color: color !== undefined ? (color ? String(color).trim() : null) : existing.color,
                size: size !== undefined ? (size ? String(size).trim() : null) : existing.size,
                price: numPrice,
                status: finalStatus
            }
        });
        res.json(variant);
    }
    catch (error) {
        console.error('Failed to update variant:', error);
        res.status(500).json({ error: error.message || 'Failed to update variant' });
    }
});
// DELETE /api/variants/:id - Delete variant safely with dependency checks
router.delete('/variants/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const variantId = req.params.id;
        const existing = await db_1.prisma.variant.findFirst({
            where: { id: variantId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        // Check for dependent records
        const [salesOrderItemsCount, productionOrdersCount, shipmentItemsCount, invoiceItemsCount, stockMovementsCount] = await Promise.all([
            db_1.prisma.salesOrderItem.count({ where: { variantId } }),
            db_1.prisma.productionOrder.count({ where: { variantId } }),
            db_1.prisma.shipmentItem.count({ where: { variantId } }),
            db_1.prisma.invoiceItem.count({ where: { variantId } }),
            db_1.prisma.stockMovement.count({ where: { variantId } })
        ]);
        const totalDependencies = salesOrderItemsCount + productionOrdersCount + shipmentItemsCount +
            invoiceItemsCount + stockMovementsCount;
        if (totalDependencies > 0) {
            const reasons = [];
            if (salesOrderItemsCount > 0)
                reasons.push(`${salesOrderItemsCount} sales order item(s)`);
            if (productionOrdersCount > 0)
                reasons.push(`${productionOrdersCount} production order(s)`);
            if (shipmentItemsCount > 0)
                reasons.push(`${shipmentItemsCount} shipment item(s)`);
            if (invoiceItemsCount > 0)
                reasons.push(`${invoiceItemsCount} invoice item(s)`);
            if (stockMovementsCount > 0)
                reasons.push(`${stockMovementsCount} stock movement(s)`);
            res.status(400).json({
                error: `Cannot delete variant "${existing.sku || existing.name}" because historical records exist (${reasons.join(', ')}). Please deactivate the variant instead.`
            });
            return;
        }
        await db_1.prisma.variant.delete({
            where: { id: variantId }
        });
        res.json({ message: 'Variant deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete variant:', error);
        res.status(500).json({ error: error.message || 'Failed to delete variant' });
    }
});
exports.default = router;
//# sourceMappingURL=variants.js.map
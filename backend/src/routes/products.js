"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_PRODUCT_STATUSES = exports.VALID_GARMENT_TYPES = void 0;
exports.normalizeGarmentType = normalizeGarmentType;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all product routes
router.use(auth_1.authenticateUser);
exports.VALID_GARMENT_TYPES = [
    'T_SHIRT',
    'SHIRT',
    'TROUSER',
    'JEANS',
    'JACKET',
    'DRESS',
    'HOODIE',
    'OTHER'
];
exports.VALID_PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
function normalizeGarmentType(input) {
    if (!input || typeof input !== 'string')
        return null;
    const clean = input.trim().toUpperCase().replace(/[-\s]+/g, '_');
    if (exports.VALID_GARMENT_TYPES.includes(clean))
        return clean;
    if (clean.includes('HOODIE'))
        return 'HOODIE';
    if (clean.includes('T_SHIRT') || clean.includes('TSHIRT') || clean.includes('TEE'))
        return 'T_SHIRT';
    if (clean.includes('SHIRT'))
        return 'SHIRT';
    if (clean.includes('TROUSER') || clean.includes('PANT'))
        return 'TROUSER';
    if (clean.includes('JEAN'))
        return 'JEANS';
    if (clean.includes('JACKET'))
        return 'JACKET';
    if (clean.includes('DRESS'))
        return 'DRESS';
    return 'OTHER';
}
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
// GET /api/products - List products with pagination, search, filters & sorting
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, garmentType, status, category, page, limit, sortBy, sortOrder, format } = req.query;
        const searchStr = ((q || search) || '').trim();
        const garmentTypeFilter = (garmentType || '').trim().toUpperCase();
        const statusFilter = (status || '').trim().toUpperCase();
        const categoryFilter = (category || '').trim();
        const whereClause = { companyId };
        if (statusFilter && exports.VALID_PRODUCT_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (garmentTypeFilter && exports.VALID_GARMENT_TYPES.includes(garmentTypeFilter)) {
            whereClause.garmentType = garmentTypeFilter;
        }
        if (categoryFilter) {
            whereClause.category = { contains: categoryFilter };
        }
        if (searchStr) {
            whereClause.OR = [
                { name: { contains: searchStr } },
                { productCode: { contains: searchStr } },
                { sku: { contains: searchStr } },
                { category: { contains: searchStr } },
                { description: { contains: searchStr } },
            ];
        }
        // Determine sorting
        const validSortFields = ['name', 'productCode', 'sku', 'category', 'garmentType', 'status', 'createdAt', 'updatedAt'];
        const sortField = typeof sortBy === 'string' && validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
        const orderBy = { [sortField]: sortDirection };
        // Check if pagination was explicitly requested
        const isPaginated = page !== undefined || limit !== undefined || format === 'paginated';
        if (isPaginated) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
            const skip = (pageNum - 1) * limitNum;
            const [total, products] = await Promise.all([
                db_1.prisma.product.count({ where: whereClause }),
                db_1.prisma.product.findMany({
                    where: whereClause,
                    include: {
                        variants: true,
                        _count: { select: { variants: true, salesOrderItems: true, boms: true } }
                    },
                    orderBy,
                    skip,
                    take: limitNum
                })
            ]);
            res.json({
                success: true,
                message: 'Products retrieved successfully',
                data: products,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
            return;
        }
        // Default backward compatible array response for standard requests
        const products = await db_1.prisma.product.findMany({
            where: whereClause,
            include: {
                variants: true,
                _count: { select: { variants: true } }
            },
            orderBy
        });
        res.json(products);
    }
    catch (error) {
        console.error('Failed to fetch products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// GET /api/products/:id - Single product view
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const product = await db_1.prisma.product.findFirst({
            where: {
                id: req.params.id,
                companyId
            },
            include: {
                variants: true,
                boms: true,
                routings: true,
                product3dModel: true,
                _count: {
                    select: {
                        variants: true,
                        salesOrderItems: true,
                        productionOrders: true,
                        boms: true,
                        routings: true
                    }
                }
            }
        });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// POST /api/products - Create new product
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, productCode, slug, description, sku, category, garmentType, status } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Product name is required' });
            return;
        }
        const trimmedName = name.trim();
        const finalProductCode = (productCode && typeof productCode === 'string' && productCode.trim())
            ? productCode.trim()
            : (sku && typeof sku === 'string' && sku.trim())
                ? sku.trim()
                : `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const finalSku = (sku && typeof sku === 'string' && sku.trim())
            ? sku.trim()
            : finalProductCode;
        const finalSlug = (slug && typeof slug === 'string' && slug.trim())
            ? slug.trim()
            : slugify(trimmedName);
        // Validate status
        const finalStatus = (status && typeof status === 'string' && status.trim().toUpperCase()) || 'ACTIVE';
        if (!exports.VALID_PRODUCT_STATUSES.includes(finalStatus)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${exports.VALID_PRODUCT_STATUSES.join(', ')}` });
            return;
        }
        // Validate and normalize garmentType if provided
        let finalGarmentType = null;
        if (garmentType !== undefined && garmentType !== null) {
            finalGarmentType = normalizeGarmentType(garmentType);
        }
        // Check productCode uniqueness in this company
        const existingCode = await db_1.prisma.product.findFirst({
            where: { productCode: finalProductCode, companyId }
        });
        if (existingCode) {
            res.status(400).json({ error: 'Product code already exists in this company' });
            return;
        }
        // Check SKU uniqueness in this company
        if (finalSku) {
            const existingSku = await db_1.prisma.product.findFirst({
                where: { sku: finalSku, companyId }
            });
            if (existingSku) {
                res.status(400).json({ error: 'SKU already exists in this company' });
                return;
            }
            // Check variant SKU as well
            const existingVariantSku = await db_1.prisma.variant.findFirst({
                where: { sku: finalSku, companyId }
            });
            if (existingVariantSku) {
                res.status(400).json({ error: 'SKU already exists on a variant in this company' });
                return;
            }
        }
        const product = await db_1.prisma.product.create({
            data: {
                name: trimmedName,
                productCode: finalProductCode,
                slug: finalSlug,
                description: description ? String(description).trim() : null,
                sku: finalSku,
                category: category ? String(category).trim() : null,
                garmentType: finalGarmentType,
                status: finalStatus,
                companyId
            },
            include: {
                variants: true
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Failed to create product:', error);
        res.status(500).json({ error: error.message || 'Failed to create product' });
    }
});
// PUT /api/products/:id - Update product
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.id;
        const { name, productCode, slug, description, sku, category, garmentType, status } = req.body;
        // Verify ownership
        const existing = await db_1.prisma.product.findFirst({
            where: { id: productId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Check productCode uniqueness if changed
        if (productCode && typeof productCode === 'string') {
            const trimmedCode = productCode.trim();
            if (trimmedCode !== existing.productCode) {
                const codeCheck = await db_1.prisma.product.findFirst({
                    where: { productCode: trimmedCode, companyId }
                });
                if (codeCheck) {
                    res.status(400).json({ error: 'Product code already exists in this company' });
                    return;
                }
            }
        }
        // Check SKU uniqueness if changed
        if (sku && typeof sku === 'string') {
            const trimmedSku = sku.trim();
            if (trimmedSku !== existing.sku) {
                const skuCheck = await db_1.prisma.product.findFirst({
                    where: { sku: trimmedSku, companyId }
                });
                if (skuCheck) {
                    res.status(400).json({ error: 'SKU already exists in this company' });
                    return;
                }
                const variantSkuCheck = await db_1.prisma.variant.findFirst({
                    where: { sku: trimmedSku, companyId }
                });
                if (variantSkuCheck) {
                    res.status(400).json({ error: 'SKU already exists on a variant in this company' });
                    return;
                }
            }
        }
        // Validate status if changed
        let finalStatus = existing.status;
        if (status && typeof status === 'string') {
            const st = status.trim().toUpperCase();
            if (!exports.VALID_PRODUCT_STATUSES.includes(st)) {
                res.status(400).json({ error: `Invalid status. Must be one of: ${exports.VALID_PRODUCT_STATUSES.join(', ')}` });
                return;
            }
            finalStatus = st;
        }
        // Validate and normalize garmentType if changed
        let finalGarmentType = existing.garmentType;
        if (garmentType !== undefined) {
            finalGarmentType = normalizeGarmentType(garmentType);
        }
        const updatedName = (name && typeof name === 'string' && name.trim()) ? name.trim() : existing.name;
        const updatedSlug = (slug && typeof slug === 'string' && slug.trim())
            ? slug.trim()
            : (name && name !== existing.name) ? slugify(updatedName) : existing.slug;
        const product = await db_1.prisma.product.update({
            where: { id: productId },
            data: {
                name: updatedName,
                productCode: (productCode !== undefined && typeof productCode === 'string') ? productCode.trim() : existing.productCode,
                slug: updatedSlug,
                description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
                sku: (sku !== undefined && typeof sku === 'string') ? sku.trim() : existing.sku,
                category: category !== undefined ? (category ? String(category).trim() : null) : existing.category,
                garmentType: finalGarmentType,
                status: finalStatus
            },
            include: {
                variants: true
            }
        });
        res.json(product);
    }
    catch (error) {
        console.error('Failed to update product:', error);
        res.status(500).json({ error: error.message || 'Failed to update product' });
    }
});
// DELETE /api/products/:id - Delete product or protect if historical dependencies exist
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.id;
        const existing = await db_1.prisma.product.findFirst({
            where: { id: productId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Check for dependent records
        const [salesOrderItemsCount, productionOrdersCount, bomsCount, routingsCount, shipmentItemsCount, invoiceItemsCount, stockMovementsCount, variantsCount] = await Promise.all([
            db_1.prisma.salesOrderItem.count({ where: { productId } }),
            db_1.prisma.productionOrder.count({ where: { productId } }),
            db_1.prisma.bOM.count({ where: { productId } }),
            db_1.prisma.routing.count({ where: { productId } }),
            db_1.prisma.shipmentItem.count({ where: { productId } }),
            db_1.prisma.invoiceItem.count({ where: { productId } }),
            db_1.prisma.stockMovement.count({ where: { productId } }),
            db_1.prisma.variant.count({ where: { productId } })
        ]);
        const totalDependencies = salesOrderItemsCount + productionOrdersCount + bomsCount +
            routingsCount + shipmentItemsCount + invoiceItemsCount + stockMovementsCount + variantsCount;
        if (totalDependencies > 0) {
            const reasons = [];
            if (salesOrderItemsCount > 0)
                reasons.push(`${salesOrderItemsCount} sales order item(s)`);
            if (productionOrdersCount > 0)
                reasons.push(`${productionOrdersCount} production order(s)`);
            if (bomsCount > 0)
                reasons.push(`${bomsCount} BOM(s)`);
            if (routingsCount > 0)
                reasons.push(`${routingsCount} routing(s)`);
            if (shipmentItemsCount > 0)
                reasons.push(`${shipmentItemsCount} shipment item(s)`);
            if (invoiceItemsCount > 0)
                reasons.push(`${invoiceItemsCount} invoice item(s)`);
            if (stockMovementsCount > 0)
                reasons.push(`${stockMovementsCount} stock movement(s)`);
            if (variantsCount > 0)
                reasons.push(`${variantsCount} variant(s)`);
            res.status(400).json({
                error: `Cannot delete product "${existing.name}" because dependent records exist (${reasons.join(', ')}). Please archive or deactivate the product instead.`
            });
            return;
        }
        await db_1.prisma.product.delete({
            where: { id: productId }
        });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete product:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map
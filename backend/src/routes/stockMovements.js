"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_MOVEMENT_TYPES = [
    'INWARD_GRN',
    'PRODUCTION_ISSUE',
    'PRODUCTION_RETURN',
    'FINISHED_GOODS',
    'SCRAP_WASTAGE',
    'ADJUSTMENT'
];
// GET /api/stock-movements - List stock movements
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, type, materialId, productId } = req.query;
        const searchStr = (q || '').trim().toLowerCase();
        const typeFilter = (type || '').trim();
        const materialFilter = (materialId || '').trim();
        const productFilter = (productId || '').trim();
        const whereClause = { companyId };
        if (typeFilter && VALID_MOVEMENT_TYPES.includes(typeFilter)) {
            whereClause.type = typeFilter;
        }
        if (materialFilter) {
            whereClause.materialId = materialFilter;
        }
        if (productFilter) {
            whereClause.productId = productFilter;
        }
        if (searchStr) {
            whereClause.OR = [
                { movementNumber: { contains: searchStr } },
                { notes: { contains: searchStr } },
                { material: { name: { contains: searchStr } } },
                { material: { materialCode: { contains: searchStr } } },
                { product: { name: { contains: searchStr } } }
            ];
        }
        const movements = await db_1.prisma.stockMovement.findMany({
            where: whereClause,
            include: {
                material: {
                    select: { id: true, name: true, materialCode: true, unit: true }
                },
                product: {
                    select: { id: true, name: true, sku: true }
                },
                variant: {
                    select: { id: true, name: true, sku: true, color: true, size: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(movements);
    }
    catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
});
// POST /api/stock-movements/adjust - Manual stock adjustment or scrap
router.post('/adjust', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { materialId, type, quantity, notes } = req.body;
        if (!materialId || typeof materialId !== 'string') {
            res.status(400).json({ error: 'Material ID is required' });
            return;
        }
        const adjType = VALID_MOVEMENT_TYPES.includes(type) ? type : 'ADJUSTMENT';
        const qty = Number(quantity);
        if (isNaN(qty) || qty === 0) {
            res.status(400).json({ error: 'Adjustment quantity must be a non-zero number' });
            return;
        }
        const material = await db_1.prisma.material.findFirst({
            where: { id: materialId, companyId }
        });
        if (!material) {
            res.status(404).json({ error: 'Material not found' });
            return;
        }
        // Check if negative adjustment would result in negative stock
        const currentStock = material.currentStock || 0;
        if (qty < 0 && currentStock + qty < 0) {
            res.status(400).json({
                error: `Adjustment would result in negative stock (${currentStock + qty}). Current stock is ${currentStock}.`
            });
            return;
        }
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const smCount = await db_1.prisma.stockMovement.count({ where: { companyId } });
        const movementNumber = `SM-ADJ-${dateStr}-${String(smCount + 1).padStart(4, '0')}`;
        const result = await db_1.prisma.$transaction(async (tx) => {
            await tx.material.update({
                where: { id: materialId },
                data: {
                    currentStock: {
                        increment: qty
                    }
                }
            });
            const movement = await tx.stockMovement.create({
                data: {
                    movementNumber,
                    materialId,
                    type: adjType,
                    quantity: qty,
                    unit: material.unit || 'Pcs',
                    referenceType: 'ADJUSTMENT',
                    notes: notes ? String(notes).trim() : 'Manual stock adjustment',
                    companyId
                },
                include: {
                    material: true
                }
            });
            return movement;
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error recording stock adjustment:', error);
        res.status(500).json({ error: 'Failed to record stock adjustment' });
    }
});
exports.default = router;
//# sourceMappingURL=stockMovements.js.map
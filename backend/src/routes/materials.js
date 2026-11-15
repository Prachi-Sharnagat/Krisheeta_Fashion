"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const materials = await db_1.prisma.material.findMany({
            where: { companyId: req.user.companyId }
        });
        res.json(materials);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const material = await db_1.prisma.material.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user.companyId
            }
        });
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        res.json(material);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch material' });
    }
});
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { name, description, materialCode, category, unit, minimumStockLevel, currentStock, status } = req.body;
        if (materialCode) {
            const existing = await db_1.prisma.material.findFirst({
                where: { materialCode, companyId: req.user.companyId }
            });
            if (existing) {
                return res.status(400).json({ error: 'Material Code already exists in this company' });
            }
        }
        const material = await db_1.prisma.material.create({
            data: {
                name,
                description,
                materialCode,
                category,
                unit,
                minimumStockLevel: minimumStockLevel || 0,
                currentStock: currentStock || 0,
                status: status || 'ACTIVE',
                companyId: req.user.companyId
            }
        });
        res.status(201).json(material);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create material' });
    }
});
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { name, description, materialCode, category, unit, minimumStockLevel, currentStock, status } = req.body;
        const existing = await db_1.prisma.material.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Material not found' });
        }
        if (materialCode && materialCode !== existing.materialCode) {
            const codeCheck = await db_1.prisma.material.findFirst({
                where: { materialCode, companyId: req.user.companyId }
            });
            if (codeCheck) {
                return res.status(400).json({ error: 'Material Code already exists in this company' });
            }
        }
        const updateData = { name, description, materialCode, category, unit, minimumStockLevel, status };
        if (currentStock !== undefined) {
            updateData.currentStock = Number(currentStock);
        }
        const material = await db_1.prisma.material.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.json(material);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update material' });
    }
});
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const existing = await db_1.prisma.material.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Material not found' });
        }
        await db_1.prisma.material.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Material deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete material' });
    }
});
exports.default = router;
//# sourceMappingURL=materials.js.map
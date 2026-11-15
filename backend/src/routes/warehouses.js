"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_TYPES = ['RAW_MATERIALS', 'FINISHED_GOODS', 'TRANSIT'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];
// GET /api/warehouses - List all warehouses for the company
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, type, status } = req.query;
        const searchStr = (q || '').trim().toLowerCase();
        const typeFilter = (type || '').trim();
        const statusFilter = (status || '').trim();
        const whereClause = { companyId };
        if (typeFilter && VALID_TYPES.includes(typeFilter)) {
            whereClause.type = typeFilter;
        }
        if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (searchStr) {
            whereClause.OR = [
                { code: { contains: searchStr } },
                { name: { contains: searchStr } },
                { location: { contains: searchStr } },
            ];
        }
        const warehouses = await db_1.prisma.warehouse.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        res.json(warehouses);
    }
    catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({ error: 'Failed to fetch warehouses', details: error.message });
    }
});
// GET /api/warehouses/:id - Single warehouse details
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const warehouse = await db_1.prisma.warehouse.findFirst({
            where: { id, companyId },
        });
        if (!warehouse) {
            res.status(404).json({ error: 'Warehouse not found' });
            return;
        }
        res.json(warehouse);
    }
    catch (error) {
        console.error('Error fetching warehouse:', error);
        res.status(500).json({ error: 'Failed to fetch warehouse', details: error.message });
    }
});
// POST /api/warehouses - Create warehouse
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { code, name, location, type = 'RAW_MATERIALS', status = 'ACTIVE' } = req.body;
        if (!code || !name) {
            res.status(400).json({ error: 'Warehouse code and name are required' });
            return;
        }
        const trimmedCode = String(code).trim().toUpperCase();
        const trimmedName = String(name).trim();
        const existing = await db_1.prisma.warehouse.findFirst({
            where: { code: trimmedCode, companyId },
        });
        if (existing) {
            res.status(400).json({ error: `Warehouse with code '${trimmedCode}' already exists in your company` });
            return;
        }
        const warehouse = await db_1.prisma.warehouse.create({
            data: {
                code: trimmedCode,
                name: trimmedName,
                location: location ? String(location).trim() : null,
                type: VALID_TYPES.includes(type) ? type : 'RAW_MATERIALS',
                status: VALID_STATUSES.includes(status) ? status : 'ACTIVE',
                companyId,
            },
        });
        res.status(201).json(warehouse);
    }
    catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ error: 'Failed to create warehouse', details: error.message });
    }
});
// PUT /api/warehouses/:id - Update warehouse
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const { code, name, location, type, status } = req.body;
        const existing = await db_1.prisma.warehouse.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Warehouse not found' });
            return;
        }
        if (code) {
            const trimmedCode = String(code).trim().toUpperCase();
            if (trimmedCode !== existing.code) {
                const codeCheck = await db_1.prisma.warehouse.findFirst({
                    where: { code: trimmedCode, companyId, id: { not: id } },
                });
                if (codeCheck) {
                    res.status(400).json({ error: `Warehouse code '${trimmedCode}' already in use` });
                    return;
                }
            }
        }
        const updated = await db_1.prisma.warehouse.update({
            where: { id },
            data: {
                code: code ? String(code).trim().toUpperCase() : existing.code,
                name: name ? String(name).trim() : existing.name,
                location: location !== undefined ? (location ? String(location).trim() : null) : existing.location,
                type: type && VALID_TYPES.includes(type) ? type : existing.type,
                status: status && VALID_STATUSES.includes(status) ? status : existing.status,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating warehouse:', error);
        res.status(500).json({ error: 'Failed to update warehouse', details: error.message });
    }
});
// DELETE /api/warehouses/:id - Delete warehouse
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const existing = await db_1.prisma.warehouse.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Warehouse not found' });
            return;
        }
        await db_1.prisma.warehouse.delete({ where: { id } });
        res.json({ message: 'Warehouse deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting warehouse:', error);
        res.status(500).json({ error: 'Failed to delete warehouse', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=warehouses.js.map
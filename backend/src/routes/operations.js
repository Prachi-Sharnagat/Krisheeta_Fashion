"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
// GET /api/operations - List operations master for company
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = String(req.user.companyId);
        const operations = await db_1.prisma.operation.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.json(operations);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch operations' });
    }
});
// GET /api/operations/:id - Get single operation
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const companyId = String(req.user.companyId);
        const operation = await db_1.prisma.operation.findFirst({
            where: { id, companyId }
        });
        if (!operation) {
            return res.status(404).json({ error: 'Operation not found' });
        }
        res.json(operation);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch operation' });
    }
});
// POST /api/operations - Create operation
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = String(req.user.companyId);
        const { name, code, description, machineType, standardTime, status = 'ACTIVE' } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Operation name is required' });
        }
        // Check code uniqueness if code is provided
        if (code) {
            const existing = await db_1.prisma.operation.findFirst({
                where: { code: String(code), companyId }
            });
            if (existing) {
                return res.status(400).json({ error: 'Operation code already exists in this company' });
            }
        }
        const operation = await db_1.prisma.operation.create({
            data: {
                name: String(name),
                code: code ? String(code) : null,
                description: description ? String(description) : null,
                machineType: machineType ? String(machineType) : null,
                standardTime: standardTime ? parseFloat(standardTime) : null,
                status: String(status),
                companyId
            }
        });
        res.status(201).json(operation);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create operation' });
    }
});
// PUT /api/operations/:id - Update operation
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const companyId = String(req.user.companyId);
        const { name, code, description, machineType, standardTime, status } = req.body;
        const existing = await db_1.prisma.operation.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Operation not found' });
        }
        if (code && String(code) !== existing.code) {
            const codeCheck = await db_1.prisma.operation.findFirst({
                where: { code: String(code), companyId }
            });
            if (codeCheck) {
                return res.status(400).json({ error: 'Operation code already exists in this company' });
            }
        }
        const updated = await db_1.prisma.operation.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: String(name) }),
                ...(code !== undefined && { code: code ? String(code) : null }),
                ...(description !== undefined && { description: description ? String(description) : null }),
                ...(machineType !== undefined && { machineType: machineType ? String(machineType) : null }),
                ...(standardTime !== undefined && { standardTime: standardTime !== null ? parseFloat(standardTime) : null }),
                ...(status !== undefined && { status: String(status) })
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update operation' });
    }
});
// DELETE /api/operations/:id - Delete operation
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const companyId = String(req.user.companyId);
        const existing = await db_1.prisma.operation.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Operation not found' });
        }
        await db_1.prisma.operation.delete({
            where: { id }
        });
        res.json({ message: 'Operation deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete operation' });
    }
});
exports.default = router;
//# sourceMappingURL=operations.js.map
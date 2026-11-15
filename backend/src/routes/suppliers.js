"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all supplier routes
router.use(auth_1.authenticateUser);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// GET /api/suppliers - List suppliers with optional search & filter
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, status } = req.query;
        const searchStr = ((q || search) || '').trim().toLowerCase();
        const statusFilter = (status || '').trim();
        const whereClause = { companyId };
        if (statusFilter) {
            whereClause.status = statusFilter;
        }
        if (searchStr) {
            whereClause.OR = [
                { name: { contains: searchStr } },
                { supplierCode: { contains: searchStr } },
                { companyName: { contains: searchStr } },
                { contact: { contains: searchStr } },
                { email: { contains: searchStr } },
                { phone: { contains: searchStr } },
            ];
        }
        const suppliers = await db_1.prisma.supplier.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(suppliers);
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});
// GET /api/suppliers/:id - View single supplier details
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const supplierId = String(req.params.id);
        const supplier = await db_1.prisma.supplier.findFirst({
            where: {
                id: supplierId,
                companyId
            }
        });
        if (!supplier) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        res.json(supplier);
    }
    catch (error) {
        console.error('Error fetching supplier details:', error);
        res.status(500).json({ error: 'Failed to fetch supplier details' });
    }
});
// POST /api/suppliers - Create new supplier
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, supplierCode, companyName, contact, email, phone, address, city, state, country, status } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Supplier name is required' });
            return;
        }
        if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
            res.status(400).json({ error: 'Invalid email address format' });
            return;
        }
        const trimmedCode = supplierCode && typeof supplierCode === 'string' ? supplierCode.trim() : null;
        if (trimmedCode) {
            const existingCode = await db_1.prisma.supplier.findFirst({
                where: { supplierCode: trimmedCode, companyId }
            });
            if (existingCode) {
                res.status(400).json({ error: 'Supplier Code already exists in your company' });
                return;
            }
        }
        const supplier = await db_1.prisma.supplier.create({
            data: {
                name: name.trim(),
                supplierCode: trimmedCode,
                companyName: companyName ? String(companyName).trim() : null,
                contact: contact ? String(contact).trim() : null,
                email: email ? String(email).trim() : null,
                phone: phone ? String(phone).trim() : null,
                address: address ? String(address).trim() : null,
                city: city ? String(city).trim() : null,
                state: state ? String(state).trim() : null,
                country: country ? String(country).trim() : null,
                status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
                companyId
            }
        });
        res.status(201).json(supplier);
    }
    catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: error.message || 'Failed to create supplier' });
    }
});
// PUT /api/suppliers/:id - Update supplier
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const supplierId = String(req.params.id);
        const { name, supplierCode, companyName, contact, email, phone, address, city, state, country, status } = req.body;
        const existing = await db_1.prisma.supplier.findFirst({
            where: { id: supplierId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
            res.status(400).json({ error: 'Supplier name cannot be empty' });
            return;
        }
        if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
            res.status(400).json({ error: 'Invalid email address format' });
            return;
        }
        const trimmedCode = supplierCode !== undefined
            ? (supplierCode && typeof supplierCode === 'string' ? supplierCode.trim() : null)
            : existing.supplierCode;
        if (trimmedCode && trimmedCode !== existing.supplierCode) {
            const codeCheck = await db_1.prisma.supplier.findFirst({
                where: { supplierCode: trimmedCode, companyId }
            });
            if (codeCheck) {
                res.status(400).json({ error: 'Supplier Code already exists in your company' });
                return;
            }
        }
        const updatedSupplier = await db_1.prisma.supplier.update({
            where: { id: supplierId },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                supplierCode: trimmedCode,
                ...(companyName !== undefined && { companyName: companyName ? String(companyName).trim() : null }),
                ...(contact !== undefined && { contact: contact ? String(contact).trim() : null }),
                ...(email !== undefined && { email: email ? String(email).trim() : null }),
                ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
                ...(address !== undefined && { address: address ? String(address).trim() : null }),
                ...(city !== undefined && { city: city ? String(city).trim() : null }),
                ...(state !== undefined && { state: state ? String(state).trim() : null }),
                ...(country !== undefined && { country: country ? String(country).trim() : null }),
                ...(status !== undefined && { status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
            }
        });
        res.json(updatedSupplier);
    }
    catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: error.message || 'Failed to update supplier' });
    }
});
// DELETE /api/suppliers/:id - Delete supplier (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const supplierId = String(req.params.id);
        const existing = await db_1.prisma.supplier.findFirst({
            where: { id: supplierId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        await db_1.prisma.supplier.delete({
            where: { id: supplierId }
        });
        res.json({ message: 'Supplier deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: error.message || 'Failed to delete supplier' });
    }
});
exports.default = router;
//# sourceMappingURL=suppliers.js.map
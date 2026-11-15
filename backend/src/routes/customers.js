"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all customer routes
router.use(auth_1.authenticateUser);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// GET /api/customers - List customers with optional search & filter
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
                { customerCode: { contains: searchStr } },
                { companyName: { contains: searchStr } },
                { email: { contains: searchStr } },
                { phone: { contains: searchStr } },
            ];
        }
        const customers = await db_1.prisma.customer.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(customers);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
// GET /api/customers/:id - View single customer details
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const customerId = String(req.params.id);
        const customer = await db_1.prisma.customer.findFirst({
            where: {
                id: customerId,
                companyId
            }
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json(customer);
    }
    catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).json({ error: 'Failed to fetch customer details' });
    }
});
// POST /api/customers - Create new customer
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, customerCode, companyName, email, phone, address, city, state, country, status } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Customer name is required' });
            return;
        }
        if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
            res.status(400).json({ error: 'Invalid email address format' });
            return;
        }
        const trimmedCode = customerCode && typeof customerCode === 'string' ? customerCode.trim() : null;
        if (trimmedCode) {
            const existingCode = await db_1.prisma.customer.findFirst({
                where: { customerCode: trimmedCode, companyId }
            });
            if (existingCode) {
                res.status(400).json({ error: 'Customer Code already exists in your company' });
                return;
            }
        }
        const customer = await db_1.prisma.customer.create({
            data: {
                name: name.trim(),
                customerCode: trimmedCode,
                companyName: companyName ? String(companyName).trim() : null,
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
        res.status(201).json(customer);
    }
    catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: error.message || 'Failed to create customer' });
    }
});
// PUT /api/customers/:id - Update customer
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const customerId = String(req.params.id);
        const { name, customerCode, companyName, email, phone, address, city, state, country, status } = req.body;
        const existing = await db_1.prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
            res.status(400).json({ error: 'Customer name cannot be empty' });
            return;
        }
        if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
            res.status(400).json({ error: 'Invalid email address format' });
            return;
        }
        const trimmedCode = customerCode !== undefined
            ? (customerCode && typeof customerCode === 'string' ? customerCode.trim() : null)
            : existing.customerCode;
        if (trimmedCode && trimmedCode !== existing.customerCode) {
            const codeCheck = await db_1.prisma.customer.findFirst({
                where: { customerCode: trimmedCode, companyId }
            });
            if (codeCheck) {
                res.status(400).json({ error: 'Customer Code already exists in your company' });
                return;
            }
        }
        const updatedCustomer = await db_1.prisma.customer.update({
            where: { id: customerId },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                customerCode: trimmedCode,
                ...(companyName !== undefined && { companyName: companyName ? String(companyName).trim() : null }),
                ...(email !== undefined && { email: email ? String(email).trim() : null }),
                ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
                ...(address !== undefined && { address: address ? String(address).trim() : null }),
                ...(city !== undefined && { city: city ? String(city).trim() : null }),
                ...(state !== undefined && { state: state ? String(state).trim() : null }),
                ...(country !== undefined && { country: country ? String(country).trim() : null }),
                ...(status !== undefined && { status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
            }
        });
        res.json(updatedCustomer);
    }
    catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: error.message || 'Failed to update customer' });
    }
});
// DELETE /api/customers/:id - Delete customer (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const customerId = String(req.params.id);
        const existing = await db_1.prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        await db_1.prisma.customer.delete({
            where: { id: customerId }
        });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: error.message || 'Failed to delete customer' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map
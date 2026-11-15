"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_EXPENSE_CATEGORIES = [
    'RAW_MATERIAL',
    'TRANSPORT',
    'ELECTRICITY',
    'MAINTENANCE',
    'SALARY',
    'PACKAGING',
    'RENT',
    'UTILITIES',
    'OTHER'
];
const VALID_EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
// Helper to generate a unique expense number per company
async function generateExpenseNumber(companyId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db_1.prisma.expense.count({ where: { companyId } });
    let nextNum = count + 1;
    let candidate = `EXP-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    while (await db_1.prisma.expense.findFirst({ where: { expenseNumber: candidate, companyId } })) {
        nextNum += 1;
        candidate = `EXP-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
}
// GET /api/expenses - List expenses with filters
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { q, search, category, status, supplierId, dateFrom, dateTo } = req.query;
        const searchStr = ((q || search) || '').trim().toLowerCase();
        const categoryFilter = (category || '').trim();
        const statusFilter = (status || '').trim();
        const supplierFilter = (supplierId || '').trim();
        const whereClause = { companyId };
        if (categoryFilter && VALID_EXPENSE_CATEGORIES.includes(categoryFilter)) {
            whereClause.category = categoryFilter;
        }
        if (statusFilter && VALID_EXPENSE_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (supplierFilter)
            whereClause.supplierId = supplierFilter;
        if (dateFrom || dateTo) {
            whereClause.expenseDate = {};
            if (dateFrom)
                whereClause.expenseDate.gte = new Date(dateFrom);
            if (dateTo)
                whereClause.expenseDate.lte = new Date(dateTo);
        }
        if (searchStr) {
            whereClause.OR = [
                { expenseNumber: { contains: searchStr } },
                { description: { contains: searchStr } },
                { referenceNumber: { contains: searchStr } },
                { notes: { contains: searchStr } },
                { supplier: { name: { contains: searchStr } } }
            ];
        }
        const expenses = await db_1.prisma.expense.findMany({
            where: whereClause,
            include: {
                supplier: { select: { id: true, name: true, supplierCode: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});
// GET /api/expenses/:id - View single expense
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const expense = await db_1.prisma.expense.findFirst({
            where: { id, companyId },
            include: { supplier: true }
        });
        if (!expense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        res.json(expense);
    }
    catch (error) {
        console.error('Error fetching expense details:', error);
        res.status(500).json({ error: 'Failed to fetch expense details' });
    }
});
// POST /api/expenses - Create new expense
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { expenseNumber, category, description, amount, expenseDate, paymentMethod, supplierId, referenceNumber, status, notes } = req.body;
        if (!description || typeof description !== 'string' || !description.trim()) {
            res.status(400).json({ error: 'Expense description is required' });
            return;
        }
        const expAmount = Number(amount);
        if (isNaN(expAmount) || expAmount <= 0) {
            res.status(400).json({ error: 'Expense amount must be a number greater than zero' });
            return;
        }
        const targetCategory = category && VALID_EXPENSE_CATEGORIES.includes(category) ? category : 'OTHER';
        const targetStatus = status && VALID_EXPENSE_STATUSES.includes(status) ? status : 'PENDING';
        let finalExpenseNumber = expenseNumber && typeof expenseNumber === 'string' ? expenseNumber.trim() : '';
        if (finalExpenseNumber) {
            const existing = await db_1.prisma.expense.findFirst({
                where: { expenseNumber: finalExpenseNumber, companyId }
            });
            if (existing) {
                res.status(400).json({ error: 'Expense Number already exists in your company' });
                return;
            }
        }
        else {
            finalExpenseNumber = await generateExpenseNumber(companyId);
        }
        if (supplierId) {
            const supplier = await db_1.prisma.supplier.findFirst({
                where: { id: String(supplierId), companyId }
            });
            if (!supplier) {
                res.status(400).json({ error: 'Selected supplier does not exist in your company' });
                return;
            }
        }
        const expense = await db_1.prisma.expense.create({
            data: {
                expenseNumber: finalExpenseNumber,
                category: targetCategory,
                description: description.trim(),
                amount: expAmount,
                expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
                paymentMethod: paymentMethod ? String(paymentMethod).trim() : 'BANK_TRANSFER',
                supplierId: supplierId ? String(supplierId).trim() : null,
                referenceNumber: referenceNumber ? String(referenceNumber).trim() : null,
                status: targetStatus,
                notes: notes ? String(notes).trim() : null,
                companyId
            },
            include: { supplier: true }
        });
        res.status(201).json(expense);
    }
    catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: error.message || 'Failed to create expense' });
    }
});
// PUT /api/expenses/:id - Update expense
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { expenseNumber, category, description, amount, expenseDate, paymentMethod, supplierId, referenceNumber, status, notes } = req.body;
        const existing = await db_1.prisma.expense.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        let finalExpenseNumber = expenseNumber && typeof expenseNumber === 'string' ? expenseNumber.trim() : existing.expenseNumber;
        if (finalExpenseNumber !== existing.expenseNumber) {
            const codeCheck = await db_1.prisma.expense.findFirst({
                where: { expenseNumber: finalExpenseNumber, companyId }
            });
            if (codeCheck) {
                res.status(400).json({ error: 'Expense Number already exists in your company' });
                return;
            }
        }
        const expAmount = amount !== undefined ? Number(amount) : existing.amount;
        if (isNaN(expAmount) || expAmount <= 0) {
            res.status(400).json({ error: 'Expense amount must be a number greater than zero' });
            return;
        }
        const targetCategory = category && VALID_EXPENSE_CATEGORIES.includes(category) ? category : existing.category;
        const targetStatus = status && VALID_EXPENSE_STATUSES.includes(status) ? status : existing.status;
        const updated = await db_1.prisma.expense.update({
            where: { id: existing.id },
            data: {
                expenseNumber: finalExpenseNumber,
                category: targetCategory,
                description: description ? String(description).trim() : existing.description,
                amount: expAmount,
                expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
                paymentMethod: paymentMethod ? String(paymentMethod).trim() : existing.paymentMethod,
                supplierId: supplierId !== undefined ? (supplierId ? String(supplierId).trim() : null) : existing.supplierId,
                referenceNumber: referenceNumber !== undefined ? (referenceNumber ? String(referenceNumber).trim() : null) : existing.referenceNumber,
                status: targetStatus,
                notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes
            },
            include: { supplier: true }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: error.message || 'Failed to update expense' });
    }
});
// PATCH /api/expenses/:id/status - Update expense status
router.patch('/:id/status', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const { status } = req.body;
        if (!status || !VALID_EXPENSE_STATUSES.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_EXPENSE_STATUSES.join(', ')}` });
            return;
        }
        const existing = await db_1.prisma.expense.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        const updated = await db_1.prisma.expense.update({
            where: { id: existing.id },
            data: { status },
            include: { supplier: true }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating expense status:', error);
        res.status(500).json({ error: error.message || 'Failed to update expense status' });
    }
});
// DELETE /api/expenses/:id - Delete expense (ADMIN only)
router.delete('/:id', (0, auth_1.authorizeRole)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = String(req.params.id);
        const existing = await db_1.prisma.expense.findFirst({
            where: { id, companyId }
        });
        if (!existing) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        await db_1.prisma.expense.delete({ where: { id: existing.id } });
        res.json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: error.message || 'Failed to delete expense' });
    }
});
exports.default = router;
//# sourceMappingURL=expenses.js.map
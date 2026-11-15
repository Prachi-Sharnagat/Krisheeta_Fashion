"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_PAYROLL_STATUSES = ['DRAFT', 'PROCESSED', 'PAID'];
// Helper to calculate net salary on backend
function calculateNetSalary(basic, allowances, overtime, deductions) {
    const b = Math.max(0, Number(basic) || 0);
    const a = Math.max(0, Number(allowances) || 0);
    const o = Math.max(0, Number(overtime) || 0);
    const d = Math.max(0, Number(deductions) || 0);
    return Math.max(0, Math.round((b + a + o - d) * 100) / 100);
}
// GET /api/payroll
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { month, year, employeeId, status } = req.query;
        const whereClause = { companyId };
        if (employeeId && typeof employeeId === 'string') {
            whereClause.employeeId = employeeId;
        }
        if (month)
            whereClause.month = Number(month);
        if (year)
            whereClause.year = Number(year);
        if (status && typeof status === 'string' && VALID_PAYROLL_STATUSES.includes(status)) {
            whereClause.status = status;
        }
        const payrolls = await db_1.prisma.payroll.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: { id: true, employeeCode: true, name: true, department: true, designation: true },
                },
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
        res.json(payrolls);
    }
    catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ error: 'Failed to fetch payroll records', details: error.message });
    }
});
// GET /api/payroll/:id
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const record = await db_1.prisma.payroll.findFirst({
            where: { id, companyId },
            include: {
                employee: {
                    select: { id: true, employeeCode: true, name: true, department: true, designation: true },
                },
            },
        });
        if (!record) {
            res.status(404).json({ error: 'Payroll record not found' });
            return;
        }
        res.json(record);
    }
    catch (error) {
        console.error('Error fetching payroll record:', error);
        res.status(500).json({ error: 'Failed to fetch payroll record', details: error.message });
    }
});
// POST /api/payroll
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { employeeId, month, year, basicSalary, allowances = 0, deductions = 0, overtime = 0, status = 'DRAFT', notes, paymentDate, } = req.body;
        if (!employeeId) {
            res.status(400).json({ error: 'Employee ID is required' });
            return;
        }
        const m = Number(month);
        const y = Number(year);
        if (!m || m < 1 || m > 12) {
            res.status(400).json({ error: 'Valid month (1-12) is required' });
            return;
        }
        if (!y || y < 2000 || y > 2100) {
            res.status(400).json({ error: 'Valid year is required' });
            return;
        }
        if (!VALID_PAYROLL_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        // Verify employee belongs to company
        const employee = await db_1.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
        });
        if (!employee) {
            res.status(404).json({ error: 'Employee not found in your company' });
            return;
        }
        const basic = basicSalary !== undefined ? Number(basicSalary) : employee.salary;
        const allow = Number(allowances) || 0;
        const ded = Number(deductions) || 0;
        const over = Number(overtime) || 0;
        if (basic < 0 || allow < 0 || ded < 0 || over < 0) {
            res.status(400).json({ error: 'Salary components cannot be negative' });
            return;
        }
        // Check duplicate monthly payroll for employee
        const existing = await db_1.prisma.payroll.findFirst({
            where: { employeeId, month: m, year: y },
        });
        if (existing) {
            res.status(400).json({ error: `Payroll for employee '${employee.name}' for ${m}/${y} already exists` });
            return;
        }
        const netSalary = calculateNetSalary(basic, allow, over, ded);
        const record = await db_1.prisma.payroll.create({
            data: {
                employeeId,
                month: m,
                year: y,
                basicSalary: basic,
                allowances: allow,
                deductions: ded,
                overtime: over,
                netSalary,
                status,
                notes: notes ? notes.trim() : null,
                paymentDate: status === 'PAID' ? (paymentDate ? new Date(paymentDate) : new Date()) : (paymentDate ? new Date(paymentDate) : null),
                companyId,
            },
            include: {
                employee: {
                    select: { id: true, employeeCode: true, name: true, department: true },
                },
            },
        });
        res.status(201).json(record);
    }
    catch (error) {
        console.error('Error creating payroll record:', error);
        res.status(500).json({ error: 'Failed to create payroll record', details: error.message });
    }
});
// PUT /api/payroll/:id
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const existing = await db_1.prisma.payroll.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Payroll record not found' });
            return;
        }
        const { basicSalary, allowances, deductions, overtime, status, notes, paymentDate, } = req.body;
        const basic = basicSalary !== undefined ? Number(basicSalary) : existing.basicSalary;
        const allow = allowances !== undefined ? Number(allowances) : existing.allowances;
        const ded = deductions !== undefined ? Number(deductions) : existing.deductions;
        const over = overtime !== undefined ? Number(overtime) : existing.overtime;
        if (basic < 0 || allow < 0 || ded < 0 || over < 0) {
            res.status(400).json({ error: 'Salary components cannot be negative' });
            return;
        }
        const netSalary = calculateNetSalary(basic, allow, over, ded);
        const updatedStatus = status || existing.status;
        let pDate = existing.paymentDate;
        if (paymentDate !== undefined) {
            pDate = paymentDate ? new Date(paymentDate) : null;
        }
        else if (updatedStatus === 'PAID' && !existing.paymentDate) {
            pDate = new Date();
        }
        const updated = await db_1.prisma.payroll.update({
            where: { id },
            data: {
                basicSalary: basic,
                allowances: allow,
                deductions: ded,
                overtime: over,
                netSalary,
                status: updatedStatus,
                notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
                paymentDate: pDate,
            },
            include: {
                employee: {
                    select: { id: true, employeeCode: true, name: true, department: true },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating payroll record:', error);
        res.status(500).json({ error: 'Failed to update payroll record', details: error.message });
    }
});
// PATCH /api/payroll/:id/status
router.patch('/:id/status', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const { status, paymentDate } = req.body;
        if (!status || !VALID_PAYROLL_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const existing = await db_1.prisma.payroll.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Payroll record not found' });
            return;
        }
        let pDate = existing.paymentDate;
        if (status === 'PAID' && (!pDate || paymentDate)) {
            pDate = paymentDate ? new Date(paymentDate) : new Date();
        }
        const updated = await db_1.prisma.payroll.update({
            where: { id },
            data: {
                status,
                paymentDate: pDate,
            },
            include: {
                employee: {
                    select: { id: true, employeeCode: true, name: true, department: true },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating payroll status:', error);
        res.status(500).json({ error: 'Failed to update payroll status', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=payroll.js.map
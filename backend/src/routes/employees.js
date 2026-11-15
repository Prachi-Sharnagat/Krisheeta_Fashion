"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const VALID_EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY'];
const VALID_EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
function sanitizeEmployee(employee, roleName) {
    const isPrivileged = roleName === 'ADMIN' || roleName === 'MANAGER';
    if (!isPrivileged) {
        const { salary, ...rest } = employee;
        return rest;
    }
    return employee;
}
// GET /api/employees - List employees
router.get('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userRole = req.user.role?.name || '';
        const { search, q, department, status, employmentType } = req.query;
        const searchTerm = ((q || search) || '').trim().toLowerCase();
        const deptFilter = (department || '').trim();
        const statusFilter = (status || '').trim();
        const empTypeFilter = (employmentType || '').trim();
        const whereClause = { companyId };
        if (deptFilter)
            whereClause.department = deptFilter;
        if (statusFilter && VALID_EMPLOYEE_STATUSES.includes(statusFilter)) {
            whereClause.status = statusFilter;
        }
        if (empTypeFilter && VALID_EMPLOYMENT_TYPES.includes(empTypeFilter)) {
            whereClause.employmentType = empTypeFilter;
        }
        let employees = await db_1.prisma.employee.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (searchTerm) {
            employees = employees.filter((emp) => emp.name.toLowerCase().includes(searchTerm) ||
                emp.employeeCode.toLowerCase().includes(searchTerm) ||
                (emp.email && emp.email.toLowerCase().includes(searchTerm)) ||
                (emp.department && emp.department.toLowerCase().includes(searchTerm)) ||
                (emp.designation && emp.designation.toLowerCase().includes(searchTerm)));
        }
        const sanitized = employees.map((emp) => sanitizeEmployee(emp, userRole));
        res.json(sanitized);
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
    }
});
// GET /api/employees/:id - Get single employee
router.get('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const userRole = req.user.role?.name || '';
        const employee = await db_1.prisma.employee.findFirst({
            where: { id, companyId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                attendances: { orderBy: { date: 'desc' }, take: 10 },
                payrolls: userRole === 'ADMIN' || userRole === 'MANAGER' ? { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 } : false,
            },
        });
        if (!employee) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json(sanitizeEmployee(employee, userRole));
    }
    catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
    }
});
// POST /api/employees - Create employee
router.post('/', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { employeeCode, name, email, phone, department, designation, joiningDate, employmentType = 'FULL_TIME', salary = 0, status = 'ACTIVE', userId, } = req.body;
        if (!employeeCode || !employeeCode.trim()) {
            res.status(400).json({ error: 'Employee code is required' });
            return;
        }
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Employee name is required' });
            return;
        }
        if (salary < 0) {
            res.status(400).json({ error: 'Salary cannot be negative' });
            return;
        }
        if (!VALID_EMPLOYMENT_TYPES.includes(employmentType)) {
            res.status(400).json({ error: 'Invalid employment type' });
            return;
        }
        if (!VALID_EMPLOYEE_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const existingCode = await db_1.prisma.employee.findFirst({
            where: { employeeCode: employeeCode.trim(), companyId },
        });
        if (existingCode) {
            res.status(400).json({ error: `Employee code '${employeeCode.trim()}' already exists` });
            return;
        }
        const employee = await db_1.prisma.employee.create({
            data: {
                employeeCode: employeeCode.trim(),
                name: name.trim(),
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                department: department ? department.trim() : null,
                designation: designation ? designation.trim() : null,
                joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                employmentType,
                salary: Number(salary),
                status,
                userId: userId || null,
                companyId,
            },
        });
        res.status(201).json(employee);
    }
    catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee', details: error.message });
    }
});
// PUT /api/employees/:id - Update employee
router.put('/:id', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const existing = await db_1.prisma.employee.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        const { employeeCode, name, email, phone, department, designation, joiningDate, employmentType, salary, status, userId, } = req.body;
        if (employeeCode && employeeCode.trim() !== existing.employeeCode) {
            const codeCheck = await db_1.prisma.employee.findFirst({
                where: { employeeCode: employeeCode.trim(), companyId, id: { not: id } },
            });
            if (codeCheck) {
                res.status(400).json({ error: `Employee code '${employeeCode.trim()}' already in use` });
                return;
            }
        }
        if (salary !== undefined && Number(salary) < 0) {
            res.status(400).json({ error: 'Salary cannot be negative' });
            return;
        }
        const updated = await db_1.prisma.employee.update({
            where: { id },
            data: {
                ...(employeeCode ? { employeeCode: employeeCode.trim() } : {}),
                ...(name ? { name: name.trim() } : {}),
                email: email !== undefined ? (email ? email.trim() : null) : existing.email,
                phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
                department: department !== undefined ? (department ? department.trim() : null) : existing.department,
                designation: designation !== undefined ? (designation ? designation.trim() : null) : existing.designation,
                joiningDate: joiningDate ? new Date(joiningDate) : existing.joiningDate,
                employmentType: employmentType || existing.employmentType,
                salary: salary !== undefined ? Number(salary) : existing.salary,
                status: status || existing.status,
                userId: userId !== undefined ? (userId || null) : existing.userId,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee', details: error.message });
    }
});
// PATCH /api/employees/:id/status - Update employee status
router.patch('/:id/status', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const id = req.params.id;
        const companyId = req.user.companyId;
        const { status } = req.body;
        if (!status || !VALID_EMPLOYEE_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid or missing status' });
            return;
        }
        const existing = await db_1.prisma.employee.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        const updated = await db_1.prisma.employee.update({
            where: { id },
            data: { status },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating employee status:', error);
        res.status(500).json({ error: 'Failed to update employee status', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=employees.js.map
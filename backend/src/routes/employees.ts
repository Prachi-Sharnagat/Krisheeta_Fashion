import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

const VALID_EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY'];
const VALID_EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];

function sanitizeEmployee(employee: any, roleName: string) {
  const isPrivileged = roleName === 'ADMIN' || roleName === 'MANAGER';
  if (!isPrivileged) {
    const { salary, ...rest } = employee;
    return rest;
  }
  return employee;
}

// GET /api/employees - List employees
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const userRole = (req as any).user!.role?.name || '';
    const { search, q, department, status, employmentType } = req.query;

    const searchTerm = ((q || search) as string || '').trim().toLowerCase();
    const deptFilter = (department as string || '').trim();
    const statusFilter = (status as string || '').trim();
    const empTypeFilter = (employmentType as string || '').trim();

    const whereClause: any = { companyId };

    if (deptFilter) whereClause.department = deptFilter;
    if (statusFilter && VALID_EMPLOYEE_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }
    if (empTypeFilter && VALID_EMPLOYMENT_TYPES.includes(empTypeFilter)) {
      whereClause.employmentType = empTypeFilter;
    }

    let employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (searchTerm) {
      employees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.employeeCode.toLowerCase().includes(searchTerm) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm)) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm)) ||
        (emp.designation && emp.designation.toLowerCase().includes(searchTerm))
      );
    }

    const sanitized = employees.map((emp) => sanitizeEmployee(emp, userRole));
    res.json(sanitized);
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
  }
});

// GET /api/employees/:id - Get single employee
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;
    const userRole = (req as any).user!.role?.name || '';

    const employee = await prisma.employee.findFirst({
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
  } catch (error: any) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
  }
});

// POST /api/employees - Create employee
router.post('/', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const {
      employeeCode,
      name,
      email,
      phone,
      department,
      designation,
      joiningDate,
      employmentType = 'FULL_TIME',
      salary = 0,
      status = 'ACTIVE',
      userId,
    } = req.body;

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

    const existingCode = await prisma.employee.findFirst({
      where: { employeeCode: employeeCode.trim(), companyId },
    });

    if (existingCode) {
      res.status(400).json({ error: `Employee code '${employeeCode.trim()}' already exists` });
      return;
    }

    const employee = await prisma.employee.create({
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
  } catch (error: any) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const existing = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const {
      employeeCode,
      name,
      email,
      phone,
      department,
      designation,
      joiningDate,
      employmentType,
      salary,
      status,
      userId,
    } = req.body;

    if (employeeCode && employeeCode.trim() !== existing.employeeCode) {
      const codeCheck = await prisma.employee.findFirst({
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

    const updated = await prisma.employee.update({
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
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee', details: error.message });
  }
});

// PATCH /api/employees/:id/status - Update employee status
router.patch('/:id/status', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;
    const { status } = req.body;

    if (!status || !VALID_EMPLOYEE_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid or missing status' });
      return;
    }

    const existing = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ error: 'Failed to update employee status', details: error.message });
  }
});

export default router;

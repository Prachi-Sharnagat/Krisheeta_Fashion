import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticateUser);

// All administration routes require ADMIN or MANAGER role
router.use(authorizeRole('ADMIN', 'MANAGER'));

// ==========================================
// 1. DASHBOARD & SYSTEM OVERVIEW
// ==========================================
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [
      totalUsers,
      activeUsers,
      totalDepartments,
      activeSessions,
      recentAuditLogs,
      pendingOrders,
      lowStockMaterials,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.department.count({ where: { companyId } }),
      prisma.userSession.count({ where: { companyId, isActive: true } }),
      prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.salesOrder.count({ where: { companyId, status: 'PENDING' } }),
      prisma.material.count({ where: { companyId, currentStock: { lte: 10 } } }),
    ]);

    // Smart data-driven administrative insights
    const insights: string[] = [];
    if (pendingOrders > 0) {
      insights.push(`${pendingOrders} sales orders are awaiting confirmation and credit review.`);
    }
    if (lowStockMaterials > 0) {
      insights.push(`${lowStockMaterials} raw materials have dropped below reorder safety thresholds.`);
    }
    if (activeSessions > 10) {
      insights.push(`High concurrency: ${activeSessions} active enterprise user sessions detected.`);
    }
    if (insights.length === 0) {
      insights.push('System operations normal. All security checks and department workloads optimal.');
    }

    res.json({
      kpis: {
        totalUsers,
        activeUsers,
        totalDepartments,
        activeSessions,
        pendingOrders,
        lowStockMaterials,
      },
      insights,
      recentAuditLogs,
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch administration dashboard data' });
  }
});

// ==========================================
// 2. DEPARTMENTS CRUD
// ==========================================
router.get('/departments', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        departmentHead: { select: { id: true, name: true, employeeCode: true, designation: true } },
        _count: { select: { users: true, employees: true } },
      },
      orderBy: { code: 'asc' },
    });

    res.json(departments);
  } catch (error: any) {
    console.error('Error listing departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { code, name, description, departmentHeadId } = req.body;

    if (!code || !name) {
      res.status(400).json({ error: 'Department code and name are required' });
      return;
    }

    const upperCode = code.trim().toUpperCase();

    const existing = await prisma.department.findUnique({
      where: { code_companyId: { code: upperCode, companyId } },
    });
    if (existing) {
      res.status(400).json({ error: `Department code ${upperCode} already exists` });
      return;
    }

    const department = await prisma.department.create({
      data: {
        code: upperCode,
        name: name.trim(),
        description: description?.trim() || null,
        departmentHeadId: departmentHeadId || null,
        companyId,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user!.id,
        userEmail: (req as any).user!.email,
        userName: (req as any).user!.name,
        action: 'CREATE',
        entity: 'Department',
        entityId: department.id,
        details: JSON.stringify({ code: department.code, name: department.name }),
        companyId,
      },
    });

    res.status(201).json(department);
  } catch (error: any) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/departments/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = req.params.id as string;
    const { name, description, departmentHeadId, isActive } = req.body;

    const existing = await prisma.department.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(departmentHeadId !== undefined && { departmentHeadId: departmentHeadId || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(department);
  } catch (error: any) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// ==========================================
// 3. USER MANAGEMENT & CREDENTIALS
// ==========================================
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { search, status } = req.query;

    const where: any = { companyId };
    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { loginId: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        loginId: true,
        email: true,
        name: true,
        isActive: true,
        isTemporaryPassword: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        assignedDepartments: {
          include: {
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error: any) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { name, email, loginId, password, roleName, departmentId, departmentRole } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: 'Email already registered in the system' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Resolve Role
    let role = await prisma.role.findFirst({ where: { name: roleName || 'OPERATOR' } });
    if (!role) {
      role = await prisma.role.findFirst({ where: { name: 'OPERATOR' } });
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        loginId: loginId ? loginId.trim() : null,
        password: hashedPassword,
        companyId,
        roleId: role!.id,
        isTemporaryPassword: true,
        mustChangePassword: true,
        isActive: true,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Optional Department Assignment
    if (departmentId) {
      await prisma.userDepartment.create({
        data: {
          userId: newUser.id,
          departmentId,
          role: departmentRole || 'OPERATOR',
          isPrimary: true,
          companyId,
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user!.id,
        userEmail: (req as any).user!.email,
        userName: (req as any).user!.name,
        action: 'CREATE',
        entity: 'User',
        entityId: newUser.id,
        details: JSON.stringify({ email: newUser.email, name: newUser.name }),
        companyId,
      },
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = req.params.id as string;
    const { isActive } = req.body;

    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, name: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user!.id,
        userEmail: (req as any).user!.email,
        userName: (req as any).user!.name,
        action: 'STATUS_CHANGE',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ isActive: user.isActive }),
        companyId,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to change user status' });
  }
});

// ==========================================
// 4. AUDIT LOGS STREAM
// ==========================================
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { action, entity, limit = 50 } = req.query;

    const where: any = { companyId };
    if (action) where.action = String(action);
    if (entity) where.entity = String(entity);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 200),
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==========================================
// 5. ACTIVE SESSIONS & REVOCATION
// ==========================================
router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const sessions = await prisma.userSession.findMany({
      where: { companyId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

router.delete('/sessions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = req.params.id as string;

    const existing = await prisma.userSession.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await prisma.userSession.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Session revoked successfully' });
  } catch (error: any) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// ==========================================
// 6. COMPANY SETTINGS
// ==========================================
router.get('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const settings = await prisma.companySetting.findMany({
      where: { companyId },
      orderBy: { category: 'asc' },
    });

    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
});

router.put('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { settings } = req.body; // Array of { key, value, category }

    if (!Array.isArray(settings)) {
      res.status(400).json({ error: 'Settings array required' });
      return;
    }

    const updated = [];
    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const s = await prisma.companySetting.upsert({
          where: { key_companyId: { key: item.key, companyId } },
          create: {
            key: item.key,
            value: String(item.value),
            category: item.category || 'GENERAL',
            companyId,
          },
          update: {
            value: String(item.value),
            category: item.category || 'GENERAL',
          },
        });
        updated.push(s);
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

export default router;

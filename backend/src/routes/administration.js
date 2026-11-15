"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
// All administration routes require ADMIN or MANAGER role
router.use((0, auth_1.authorizeRole)('ADMIN', 'MANAGER'));
// ==========================================
// 1. DASHBOARD & SYSTEM OVERVIEW
// ==========================================
router.get('/dashboard', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const [totalUsers, activeUsers, totalDepartments, activeSessions, recentAuditLogs, pendingOrders, lowStockMaterials,] = await Promise.all([
            db_1.prisma.user.count({ where: { companyId } }),
            db_1.prisma.user.count({ where: { companyId, isActive: true } }),
            db_1.prisma.department.count({ where: { companyId } }),
            db_1.prisma.userSession.count({ where: { companyId, isActive: true } }),
            db_1.prisma.auditLog.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            db_1.prisma.salesOrder.count({ where: { companyId, status: 'PENDING' } }),
            db_1.prisma.material.count({ where: { companyId, currentStock: { lte: 10 } } }),
        ]);
        // Smart data-driven administrative insights
        const insights = [];
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
    }
    catch (error) {
        console.error('Error fetching admin dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch administration dashboard data' });
    }
});
// ==========================================
// 2. DEPARTMENTS CRUD
// ==========================================
router.get('/departments', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const departments = await db_1.prisma.department.findMany({
            where: { companyId },
            include: {
                departmentHead: { select: { id: true, name: true, employeeCode: true, designation: true } },
                _count: { select: { users: true, employees: true } },
            },
            orderBy: { code: 'asc' },
        });
        res.json(departments);
    }
    catch (error) {
        console.error('Error listing departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});
router.post('/departments', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { code, name, description, departmentHeadId } = req.body;
        if (!code || !name) {
            res.status(400).json({ error: 'Department code and name are required' });
            return;
        }
        const upperCode = code.trim().toUpperCase();
        const existing = await db_1.prisma.department.findUnique({
            where: { code_companyId: { code: upperCode, companyId } },
        });
        if (existing) {
            res.status(400).json({ error: `Department code ${upperCode} already exists` });
            return;
        }
        const department = await db_1.prisma.department.create({
            data: {
                code: upperCode,
                name: name.trim(),
                description: description?.trim() || null,
                departmentHeadId: departmentHeadId || null,
                companyId,
            },
        });
        // Record audit log
        await db_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                action: 'CREATE',
                entity: 'Department',
                entityId: department.id,
                details: JSON.stringify({ code: department.code, name: department.name }),
                companyId,
            },
        });
        res.status(201).json(department);
    }
    catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});
router.put('/departments/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const { name, description, departmentHeadId, isActive } = req.body;
        const existing = await db_1.prisma.department.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Department not found' });
            return;
        }
        const department = await db_1.prisma.department.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(departmentHeadId !== undefined && { departmentHeadId: departmentHeadId || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(department);
    }
    catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});
// ==========================================
// 3. USER MANAGEMENT & CREDENTIALS
// ==========================================
router.get('/users', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { search, status } = req.query;
        const where = { companyId };
        if (status === 'ACTIVE')
            where.isActive = true;
        if (status === 'INACTIVE')
            where.isActive = false;
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { email: { contains: String(search), mode: 'insensitive' } },
                { loginId: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        const users = await db_1.prisma.user.findMany({
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
    }
    catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
router.post('/users', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, email, loginId, password, roleName, departmentId, departmentRole } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }
        const existingEmail = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(400).json({ error: 'Email already registered in the system' });
            return;
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        // Resolve Role
        let role = await db_1.prisma.role.findFirst({ where: { name: roleName || 'OPERATOR' } });
        if (!role) {
            role = await db_1.prisma.role.findFirst({ where: { name: 'OPERATOR' } });
        }
        const newUser = await db_1.prisma.user.create({
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                loginId: loginId ? loginId.trim() : null,
                password: hashedPassword,
                companyId,
                roleId: role.id,
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
            await db_1.prisma.userDepartment.create({
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
        await db_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                action: 'CREATE',
                entity: 'User',
                entityId: newUser.id,
                details: JSON.stringify({ email: newUser.email, name: newUser.name }),
                companyId,
            },
        });
        res.status(201).json(newUser);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
router.patch('/users/:id/status', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const { isActive } = req.body;
        const existing = await db_1.prisma.user.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = await db_1.prisma.user.update({
            where: { id },
            data: { isActive },
            select: { id: true, email: true, name: true, isActive: true },
        });
        await db_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                action: 'STATUS_CHANGE',
                entity: 'User',
                entityId: user.id,
                details: JSON.stringify({ isActive: user.isActive }),
                companyId,
            },
        });
        res.json(user);
    }
    catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: 'Failed to change user status' });
    }
});
// ==========================================
// 4. AUDIT LOGS STREAM
// ==========================================
router.get('/audit-logs', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { action, entity, limit = 50 } = req.query;
        const where = { companyId };
        if (action)
            where.action = String(action);
        if (entity)
            where.entity = String(entity);
        const logs = await db_1.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number(limit), 200),
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
// ==========================================
// 5. ACTIVE SESSIONS & REVOCATION
// ==========================================
router.get('/sessions', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const sessions = await db_1.prisma.userSession.findMany({
            where: { companyId, isActive: true },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { lastActiveAt: 'desc' },
        });
        res.json(sessions);
    }
    catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
});
router.delete('/sessions/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const id = req.params.id;
        const existing = await db_1.prisma.userSession.findFirst({ where: { id, companyId } });
        if (!existing) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        await db_1.prisma.userSession.update({
            where: { id },
            data: { isActive: false },
        });
        res.json({ message: 'Session revoked successfully' });
    }
    catch (error) {
        console.error('Error revoking session:', error);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
});
// ==========================================
// 6. COMPANY SETTINGS
// ==========================================
router.get('/settings', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const settings = await db_1.prisma.companySetting.findMany({
            where: { companyId },
            orderBy: { category: 'asc' },
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch company settings' });
    }
});
router.put('/settings', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { settings } = req.body; // Array of { key, value, category }
        if (!Array.isArray(settings)) {
            res.status(400).json({ error: 'Settings array required' });
            return;
        }
        const updated = [];
        for (const item of settings) {
            if (item.key && item.value !== undefined) {
                const s = await db_1.prisma.companySetting.upsert({
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
    }
    catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});
exports.default = router;
//# sourceMappingURL=administration.js.map
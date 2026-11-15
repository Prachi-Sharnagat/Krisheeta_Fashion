"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, companyName, roleName } = req.body;
        if (!email || !password || !name || !companyName || !roleName) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Check if user already exists
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already in use' });
            return;
        }
        // Check or create Role
        let role = await db_1.prisma.role.findUnique({ where: { name: roleName } });
        if (!role) {
            role = await db_1.prisma.role.create({ data: { name: roleName } });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create Company and User
        // Note: for simplicity in registration, we create a new company. 
        // In a real scenario, you might join an existing company.
        const user = await db_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: { connect: { id: role.id } },
                company: {
                    create: { name: companyName },
                },
            },
            include: {
                company: true,
                role: true,
            }
        });
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                companyId: user.companyId,
                role: user.role.name
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Missing email or password' });
            return;
        }
        // Find user
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id, companyId: user.companyId, role: user.role.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role.name } });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                companyId: true,
                role: { select: { name: true } },
                createdAt: true,
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('Fetch me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
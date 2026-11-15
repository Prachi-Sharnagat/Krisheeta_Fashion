"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const attendance_1 = __importDefault(require("./attendance"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.use('/attendance', attendance_1.default);
// GET /api/hr/summary
router.get('/summary', (0, auth_1.authorizeRole)('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const [totalEmployees, activeEmployees, onLeaveEmployees, todayAttendance, pendingPayrollCount, maintenanceDueCount,] = await Promise.all([
            db_1.prisma.employee.count({ where: { companyId } }),
            db_1.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
            db_1.prisma.employee.count({ where: { companyId, status: 'ON_LEAVE' } }),
            db_1.prisma.attendance.findMany({
                where: {
                    companyId,
                    date: { gte: startOfDay, lte: endOfDay },
                },
            }),
            db_1.prisma.payroll.count({
                where: { companyId, status: { in: ['DRAFT', 'PROCESSED'] } },
            }),
            db_1.prisma.maintenanceRecord.count({
                where: {
                    companyId,
                    status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                    scheduledDate: { lte: now },
                },
            }),
        ]);
        const presentToday = todayAttendance.filter((a) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)).length;
        const leaveTodayAttendance = todayAttendance.filter((a) => a.status === 'LEAVE').length;
        const totalOnLeave = Math.max(onLeaveEmployees, leaveTodayAttendance);
        res.json({
            totalEmployees,
            activeEmployees,
            presentToday,
            onLeave: totalOnLeave,
            pendingPayroll: pendingPayrollCount,
            maintenanceDue: maintenanceDueCount,
        });
    }
    catch (error) {
        console.error('Error fetching HR summary:', error);
        res.status(500).json({ error: 'Failed to fetch HR summary', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=hr.js.map
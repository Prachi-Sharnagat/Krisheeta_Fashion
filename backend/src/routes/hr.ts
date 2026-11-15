import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import attendanceRouter from './attendance';

const router = Router();
router.use(authenticateUser);
router.use('/attendance', attendanceRouter);

// GET /api/hr/summary
router.get('/summary', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      todayAttendance,
      pendingPayrollCount,
      maintenanceDueCount,
    ] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { companyId, status: 'ON_LEAVE' } }),
      prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.payroll.count({
        where: { companyId, status: { in: ['DRAFT', 'PROCESSED'] } },
      }),
      prisma.maintenanceRecord.count({
        where: {
          companyId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledDate: { lte: now },
        },
      }),
    ]);

    const presentToday = todayAttendance.filter((a) =>
      ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)
    ).length;

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
  } catch (error: any) {
    console.error('Error fetching HR summary:', error);
    res.status(500).json({ error: 'Failed to fetch HR summary', details: error.message });
  }
});

export default router;

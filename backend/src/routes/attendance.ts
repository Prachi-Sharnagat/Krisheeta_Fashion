import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

const VALID_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'LATE'];

// GET /api/attendance
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { date, employeeId, status, startDate, endDate } = req.query;

    const whereClause: any = { companyId };

    if (employeeId && typeof employeeId === 'string') {
      whereClause.employeeId = employeeId;
    }

    if (status && typeof status === 'string' && VALID_ATTENDANCE_STATUSES.includes(status)) {
      whereClause.status = status;
    }

    if (date && typeof date === 'string') {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    } else if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, employeeCode: true, name: true, department: true, designation: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate status counts
    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      leave: records.filter((r) => r.status === 'LEAVE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
    };

    res.json({ records, summary });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records', details: error.message });
  }
});

// GET /api/attendance/:id
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const record = await prisma.attendance.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          select: { id: true, employeeCode: true, name: true, department: true, designation: true },
        },
      },
    });

    if (!record) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }

    res.json(record);
  } catch (error: any) {
    console.error('Error fetching attendance record:', error);
    res.status(500).json({ error: 'Failed to fetch attendance record', details: error.message });
  }
});

// POST /api/attendance
router.post('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { employeeId, date, checkIn, checkOut, status = 'PRESENT', remarks } = req.body;

    if (!employeeId) {
      res.status(400).json({ error: 'Employee ID is required' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    if (!VALID_ATTENDANCE_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid attendance status' });
      return;
    }

    // Check employee belongs to company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found in your company' });
      return;
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check checkIn / checkOut times
    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;

    if (checkInDate && checkOutDate && checkOutDate.getTime() < checkInDate.getTime()) {
      res.status(400).json({ error: 'Check-out time cannot be earlier than check-in time' });
      return;
    }

    // Check duplicate daily attendance record
    const existing = await prisma.attendance.findFirst({
      where: { employeeId, date: attendanceDate },
    });

    if (existing) {
      res.status(400).json({ error: `Attendance record for employee '${employee.name}' on this date already exists` });
      return;
    }

    const newRecord = await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status,
        remarks: remarks ? remarks.trim() : null,
        companyId,
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, name: true, department: true },
        },
      },
    });

    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ error: 'Failed to create attendance record', details: error.message });
  }
});

// PUT /api/attendance/:id
router.put('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const existing = await prisma.attendance.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }

    const { date, checkIn, checkOut, status, remarks } = req.body;

    if (status && !VALID_ATTENDANCE_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid attendance status' });
      return;
    }

    const checkInDate = checkIn !== undefined ? (checkIn ? new Date(checkIn) : null) : existing.checkIn;
    const checkOutDate = checkOut !== undefined ? (checkOut ? new Date(checkOut) : null) : existing.checkOut;

    if (checkInDate && checkOutDate && checkOutDate.getTime() < checkInDate.getTime()) {
      res.status(400).json({ error: 'Check-out time cannot be earlier than check-in time' });
      return;
    }

    let attendanceDate = existing.date;
    if (date) {
      attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      // check duplicate if date changed
      const duplicate = await prisma.attendance.findFirst({
        where: { employeeId: existing.employeeId, date: attendanceDate, id: { not: id } },
      });
      if (duplicate) {
        res.status(400).json({ error: 'Attendance record already exists for this employee on the specified date' });
        return;
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        date: attendanceDate,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: status || existing.status,
        remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : existing.remarks,
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, name: true, department: true },
        },
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance record', details: error.message });
  }
});

// DELETE /api/attendance/:id
router.delete('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const existing = await prisma.attendance.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }

    await prisma.attendance.delete({ where: { id } });
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance record', details: error.message });
  }
});

export default router;

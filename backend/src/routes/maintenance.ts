import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

const VALID_MAINTENANCE_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'];
const VALID_MAINTENANCE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// GET /api/maintenance
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { status, maintenanceType, search, q, overdue } = req.query;

    const searchTerm = ((q || search) as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();
    const typeFilter = (maintenanceType as string || '').trim();
    const isOverdueOnly = overdue === 'true' || overdue === '1';

    const whereClause: any = { companyId };

    if (statusFilter && VALID_MAINTENANCE_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    if (typeFilter && VALID_MAINTENANCE_TYPES.includes(typeFilter)) {
      whereClause.maintenanceType = typeFilter;
    }

    const now = new Date();
    if (isOverdueOnly) {
      whereClause.scheduledDate = { lt: now };
      whereClause.status = { in: ['SCHEDULED', 'IN_PROGRESS'] };
    }

    let records = await prisma.maintenanceRecord.findMany({
      where: whereClause,
      orderBy: { scheduledDate: 'desc' },
    });

    if (searchTerm) {
      records = records.filter((r) =>
        r.machineName.toLowerCase().includes(searchTerm) ||
        r.machineCode.toLowerCase().includes(searchTerm) ||
        r.technician.toLowerCase().includes(searchTerm) ||
        r.description.toLowerCase().includes(searchTerm)
      );
    }

    // Compute summary stats for dashboard
    const allCompanyRecords = await prisma.maintenanceRecord.findMany({
      where: { companyId },
    });

    const summary = {
      total: allCompanyRecords.length,
      scheduled: allCompanyRecords.filter((r) => r.status === 'SCHEDULED').length,
      inProgress: allCompanyRecords.filter((r) => r.status === 'IN_PROGRESS').length,
      completed: allCompanyRecords.filter((r) => r.status === 'COMPLETED').length,
      overdue: allCompanyRecords.filter(
        (r) => (r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS') && new Date(r.scheduledDate) < now
      ).length,
      totalCost: allCompanyRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
    };

    res.json({ records, summary });
  } catch (error: any) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance records', details: error.message });
  }
});

// GET /api/maintenance/:id
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const record = await prisma.maintenanceRecord.findFirst({
      where: { id, companyId },
    });

    if (!record) {
      res.status(404).json({ error: 'Maintenance record not found' });
      return;
    }

    res.json(record);
  } catch (error: any) {
    console.error('Error fetching maintenance record:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance record', details: error.message });
  }
});

// POST /api/maintenance
router.post('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const {
      machineName,
      machineCode,
      maintenanceType = 'PREVENTIVE',
      description,
      scheduledDate,
      completedDate,
      technician,
      cost = 0,
      status = 'SCHEDULED',
      notes,
    } = req.body;

    if (!machineName || !machineName.trim()) {
      res.status(400).json({ error: 'Machine name is required' });
      return;
    }

    if (!machineCode || !machineCode.trim()) {
      res.status(400).json({ error: 'Machine code is required' });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    if (!scheduledDate) {
      res.status(400).json({ error: 'Scheduled date is required' });
      return;
    }

    if (!technician || !technician.trim()) {
      res.status(400).json({ error: 'Technician name is required' });
      return;
    }

    if (!VALID_MAINTENANCE_TYPES.includes(maintenanceType)) {
      res.status(400).json({ error: 'Invalid maintenance type' });
      return;
    }

    if (!VALID_MAINTENANCE_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid maintenance status' });
      return;
    }

    if (cost < 0) {
      res.status(400).json({ error: 'Cost cannot be negative' });
      return;
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        machineName: machineName.trim(),
        machineCode: machineCode.trim(),
        maintenanceType,
        description: description.trim(),
        scheduledDate: new Date(scheduledDate),
        completedDate: status === 'COMPLETED' ? (completedDate ? new Date(completedDate) : new Date()) : (completedDate ? new Date(completedDate) : null),
        technician: technician.trim(),
        cost: Number(cost),
        status,
        notes: notes ? notes.trim() : null,
        companyId,
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    console.error('Error creating maintenance record:', error);
    res.status(500).json({ error: 'Failed to create maintenance record', details: error.message });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const existing = await prisma.maintenanceRecord.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Maintenance record not found' });
      return;
    }

    const {
      machineName,
      machineCode,
      maintenanceType,
      description,
      scheduledDate,
      completedDate,
      technician,
      cost,
      status,
      notes,
    } = req.body;

    if (cost !== undefined && Number(cost) < 0) {
      res.status(400).json({ error: 'Cost cannot be negative' });
      return;
    }

    const newStatus = status || existing.status;
    let cDate = existing.completedDate;
    if (completedDate !== undefined) {
      cDate = completedDate ? new Date(completedDate) : null;
    } else if (newStatus === 'COMPLETED' && !existing.completedDate) {
      cDate = new Date();
    }

    const updated = await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        machineName: machineName ? machineName.trim() : existing.machineName,
        machineCode: machineCode ? machineCode.trim() : existing.machineCode,
        maintenanceType: maintenanceType || existing.maintenanceType,
        description: description ? description.trim() : existing.description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : existing.scheduledDate,
        completedDate: cDate,
        technician: technician ? technician.trim() : existing.technician,
        cost: cost !== undefined ? Number(cost) : existing.cost,
        status: newStatus,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ error: 'Failed to update maintenance record', details: error.message });
  }
});

// PATCH /api/maintenance/:id/status
router.patch('/:id/status', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;
    const { status, completedDate } = req.body;

    if (!status || !VALID_MAINTENANCE_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const existing = await prisma.maintenanceRecord.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Maintenance record not found' });
      return;
    }

    let cDate = existing.completedDate;
    if (status === 'COMPLETED' && (!cDate || completedDate)) {
      cDate = completedDate ? new Date(completedDate) : new Date();
    }

    const updated = await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status,
        completedDate: cDate,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating maintenance status:', error);
    res.status(500).json({ error: 'Failed to update maintenance status', details: error.message });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const companyId = (req as any).user!.companyId as string;

    const existing = await prisma.maintenanceRecord.findFirst({ where: { id, companyId } });
    if (!existing) {
      res.status(404).json({ error: 'Maintenance record not found' });
      return;
    }

    await prisma.maintenanceRecord.delete({ where: { id } });
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ error: 'Failed to delete maintenance record', details: error.message });
  }
});

export default router;

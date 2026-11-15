import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all supplier routes
router.use(authenticateUser);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/suppliers - List suppliers with optional search & filter
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, search, status } = req.query;
    const searchStr = ((q || search) as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();

    const whereClause: any = { companyId };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    if (searchStr) {
      whereClause.OR = [
        { name: { contains: searchStr } },
        { supplierCode: { contains: searchStr } },
        { companyName: { contains: searchStr } },
        { contact: { contains: searchStr } },
        { email: { contains: searchStr } },
        { phone: { contains: searchStr } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(suppliers);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id - View single supplier details
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const supplierId = String(req.params.id);

    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId
      }
    });

    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    res.json(supplier);
  } catch (error: any) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({ error: 'Failed to fetch supplier details' });
  }
});

// POST /api/suppliers - Create new supplier
router.post('/', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { name, supplierCode, companyName, contact, email, phone, address, city, state, country, status } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Supplier name is required' });
      return;
    }

    if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Invalid email address format' });
      return;
    }

    const trimmedCode = supplierCode && typeof supplierCode === 'string' ? supplierCode.trim() : null;

    if (trimmedCode) {
      const existingCode = await prisma.supplier.findFirst({
        where: { supplierCode: trimmedCode, companyId }
      });
      if (existingCode) {
        res.status(400).json({ error: 'Supplier Code already exists in your company' });
        return;
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        supplierCode: trimmedCode,
        companyName: companyName ? String(companyName).trim() : null,
        contact: contact ? String(contact).trim() : null,
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        city: city ? String(city).trim() : null,
        state: state ? String(state).trim() : null,
        country: country ? String(country).trim() : null,
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        companyId
      }
    });

    res.status(201).json(supplier);
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message || 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const supplierId = String(req.params.id);
    const { name, supplierCode, companyName, contact, email, phone, address, city, state, country, status } = req.body;

    const existing = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'Supplier name cannot be empty' });
      return;
    }

    if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Invalid email address format' });
      return;
    }

    const trimmedCode = supplierCode !== undefined 
      ? (supplierCode && typeof supplierCode === 'string' ? supplierCode.trim() : null)
      : existing.supplierCode;

    if (trimmedCode && trimmedCode !== existing.supplierCode) {
      const codeCheck = await prisma.supplier.findFirst({
        where: { supplierCode: trimmedCode, companyId }
      });
      if (codeCheck) {
        res.status(400).json({ error: 'Supplier Code already exists in your company' });
        return;
      }
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        supplierCode: trimmedCode,
        ...(companyName !== undefined && { companyName: companyName ? String(companyName).trim() : null }),
        ...(contact !== undefined && { contact: contact ? String(contact).trim() : null }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(city !== undefined && { city: city ? String(city).trim() : null }),
        ...(state !== undefined && { state: state ? String(state).trim() : null }),
        ...(country !== undefined && { country: country ? String(country).trim() : null }),
        ...(status !== undefined && { status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      }
    });

    res.json(updatedSupplier);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: error.message || 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id - Delete supplier (ADMIN only)
router.delete('/:id', authorizeRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const supplierId = String(req.params.id);

    const existing = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    await prisma.supplier.delete({
      where: { id: supplierId }
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: error.message || 'Failed to delete supplier' });
  }
});

export default router;

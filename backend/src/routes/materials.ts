import { Router } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: { companyId: (req as any).user!.companyId }
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const material = await prisma.material.findFirst({
      where: { 
        id: (req.params.id as string),
        companyId: (req as any).user!.companyId 
      }
    });
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

router.post('/', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, description, materialCode, category, unit, minimumStockLevel, currentStock, status } = req.body;
    
    if (materialCode) {
      const existing = await prisma.material.findFirst({
        where: { materialCode, companyId: (req as any).user!.companyId }
      });
      if (existing) {
        return res.status(400).json({ error: 'Material Code already exists in this company' });
      }
    }

    const material = await prisma.material.create({
      data: {
        name,
        description,
        materialCode,
        category,
        unit,
        minimumStockLevel: minimumStockLevel || 0,
        currentStock: currentStock || 0,
        status: status || 'ACTIVE',
        companyId: (req as any).user!.companyId
      }
    });
    
    res.status(201).json(material);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create material' });
  }
});

router.put('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, description, materialCode, category, unit, minimumStockLevel, currentStock, status } = req.body;
    
    const existing = await prisma.material.findFirst({
      where: { id: (req.params.id as string), companyId: (req as any).user!.companyId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    if (materialCode && materialCode !== existing.materialCode) {
      const codeCheck = await prisma.material.findFirst({
        where: { materialCode, companyId: (req as any).user!.companyId }
      });
      if (codeCheck) {
        return res.status(400).json({ error: 'Material Code already exists in this company' });
      }
    }

    const updateData: any = { name, description, materialCode, category, unit, minimumStockLevel, status };
    if (currentStock !== undefined) {
      updateData.currentStock = Number(currentStock);
    }

    const material = await prisma.material.update({
      where: { id: (req.params.id as string) },
      data: updateData
    });
    
    res.json(material);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update material' });
  }
});

router.delete('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const existing = await prisma.material.findFirst({
      where: { id: (req.params.id as string), companyId: (req as any).user!.companyId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    await prisma.material.delete({
      where: { id: (req.params.id as string) }
    });
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete material' });
  }
});

export default router;

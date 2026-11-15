import { Router } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// GET /api/products/:productId/boms - Get all BOMs for a product
router.get('/products/:productId/boms', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const productId = String(req.params.productId);
    const companyId = String((req as any).user!.companyId);

    // Check product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const boms = await prisma.bOM.findMany({
      where: { productId, companyId },
      include: {
        items: {
          include: {
            material: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(boms);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch BOMs' });
  }
});

// GET /api/boms/:id - Get a single BOM by ID
router.get('/boms/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const bom = await prisma.bOM.findFirst({
      where: { id, companyId },
      include: {
        product: true,
        items: {
          include: {
            material: true
          }
        }
      }
    });

    if (!bom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    res.json(bom);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch BOM' });
  }
});

// POST /api/products/:productId/boms - Create a new BOM for a product
router.post('/products/:productId/boms', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const productId = String(req.params.productId);
    const companyId = String((req as any).user!.companyId);
    const { version, name, description, status = 'DRAFT', items = [] } = req.body;

    if (!version || !name) {
      return res.status(400).json({ error: 'Version and Name are required' });
    }

    // Verify product exists in company
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate items if provided
    if (Array.isArray(items) && items.length > 0) {
      const materialIds = items.map((i: any) => String(i.materialId));
      const uniqueMaterials = new Set(materialIds);
      if (uniqueMaterials.size !== materialIds.length) {
        return res.status(400).json({ error: 'Duplicate materials in BOM items are not allowed' });
      }

      for (const item of items) {
        if (!item.materialId) {
          return res.status(400).json({ error: 'materialId is required for all items' });
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          return res.status(400).json({ error: 'Quantity must be greater than 0' });
        }
        if (item.wastagePercentage !== undefined && item.wastagePercentage < 0) {
          return res.status(400).json({ error: 'Wastage percentage cannot be negative' });
        }

        // Verify material belongs to same company
        const mat = await prisma.material.findFirst({
          where: { id: String(item.materialId), companyId }
        });
        if (!mat) {
          return res.status(400).json({ error: `Material ${item.materialId} not found in company` });
        }
      }
    }

    // Use transaction if setting status to ACTIVE or inserting items
    const result = await prisma.$transaction(async (tx) => {
      if (status === 'ACTIVE') {
        await tx.bOM.updateMany({
          where: { productId, companyId, status: 'ACTIVE' },
          data: { status: 'INACTIVE' }
        });
      }

      const newBom = await tx.bOM.create({
        data: {
          productId,
          version: String(version),
          name: String(name),
          description: description ? String(description) : null,
          status: String(status),
          companyId,
          items: {
            create: items.map((item: any) => ({
              materialId: String(item.materialId),
              quantity: parseFloat(item.quantity),
              unit: item.unit ? String(item.unit) : 'Piece',
              wastagePercentage: parseFloat(item.wastagePercentage || 0),
              notes: item.notes ? String(item.notes) : null,
              companyId
            }))
          }
        },
        include: {
          items: {
            include: {
              material: true
            }
          }
        }
      });

      return newBom;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create BOM' });
  }
});

// PUT /api/boms/:id - Update BOM header
router.put('/boms/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);
    const { version, name, description, status } = req.body;

    const existingBom = await prisma.bOM.findFirst({
      where: { id, companyId }
    });

    if (!existingBom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'ACTIVE' && existingBom.status !== 'ACTIVE') {
        await tx.bOM.updateMany({
          where: { productId: existingBom.productId, companyId, status: 'ACTIVE' },
          data: { status: 'INACTIVE' }
        });
      }

      return await tx.bOM.update({
        where: { id },
        data: {
          ...(version !== undefined && { version: String(version) }),
          ...(name !== undefined && { name: String(name) }),
          ...(description !== undefined && { description: description ? String(description) : null }),
          ...(status !== undefined && { status: String(status) })
        },
        include: {
          items: {
            include: {
              material: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update BOM' });
  }
});

// DELETE /api/boms/:id - Delete BOM
router.delete('/boms/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const existingBom = await prisma.bOM.findFirst({
      where: { id, companyId }
    });

    if (!existingBom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    await prisma.bOM.delete({
      where: { id }
    });

    res.json({ message: 'BOM deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete BOM' });
  }
});

// POST /api/boms/:bomId/items - Add item to BOM
router.post('/boms/:bomId/items', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const bomId = String(req.params.bomId);
    const companyId = String((req as any).user!.companyId);
    const { materialId, quantity, unit, wastagePercentage = 0, notes } = req.body;

    if (!materialId) {
      return res.status(400).json({ error: 'materialId is required' });
    }
    const matId = String(materialId);
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    const numWastage = parseFloat(wastagePercentage);
    if (isNaN(numWastage) || numWastage < 0) {
      return res.status(400).json({ error: 'Wastage percentage cannot be negative' });
    }

    // Verify BOM belongs to company
    const bom = await prisma.bOM.findFirst({
      where: { id: bomId, companyId }
    });
    if (!bom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    // Verify Material belongs to company
    const material = await prisma.material.findFirst({
      where: { id: matId, companyId }
    });
    if (!material) {
      return res.status(404).json({ error: 'Material not found in this company' });
    }

    // Check for duplicate material in this BOM
    const existingItem = await prisma.bomItem.findFirst({
      where: { bomId, materialId: matId }
    });
    if (existingItem) {
      return res.status(400).json({ error: 'This material is already added to this BOM' });
    }

    const bomItem = await prisma.bomItem.create({
      data: {
        bomId,
        materialId: matId,
        quantity: numQty,
        unit: unit ? String(unit) : (material.unit || 'Piece'),
        wastagePercentage: numWastage,
        notes: notes ? String(notes) : null,
        companyId
      },
      include: {
        material: true
      }
    });

    res.status(201).json(bomItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add BOM item' });
  }
});

// PUT /api/bom-items/:id - Update BOM item
router.put('/bom-items/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);
    const { materialId, quantity, unit, wastagePercentage, notes } = req.body;

    const existingItem = await prisma.bomItem.findFirst({
      where: { id, companyId }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    if (quantity !== undefined) {
      const numQty = parseFloat(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
      }
    }

    if (wastagePercentage !== undefined) {
      const numWastage = parseFloat(wastagePercentage);
      if (isNaN(numWastage) || numWastage < 0) {
        return res.status(400).json({ error: 'Wastage percentage cannot be negative' });
      }
    }

    if (materialId && String(materialId) !== existingItem.materialId) {
      const matId = String(materialId);
      const material = await prisma.material.findFirst({
        where: { id: matId, companyId }
      });
      if (!material) {
        return res.status(404).json({ error: 'Material not found in this company' });
      }

      // Check duplicate
      const dup = await prisma.bomItem.findFirst({
        where: { bomId: existingItem.bomId, materialId: matId, id: { not: id } }
      });
      if (dup) {
        return res.status(400).json({ error: 'This material is already in this BOM' });
      }
    }

    const updatedItem = await prisma.bomItem.update({
      where: { id },
      data: {
        ...(materialId !== undefined && { materialId: String(materialId) }),
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(unit !== undefined && { unit: String(unit) }),
        ...(wastagePercentage !== undefined && { wastagePercentage: parseFloat(wastagePercentage) }),
        ...(notes !== undefined && { notes: notes ? String(notes) : null })
      },
      include: {
        material: true
      }
    });

    res.json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update BOM item' });
  }
});

// DELETE /api/bom-items/:id - Delete BOM item
router.delete('/bom-items/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const existingItem = await prisma.bomItem.findFirst({
      where: { id, companyId }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    await prisma.bomItem.delete({
      where: { id }
    });

    res.json({ message: 'BOM item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete BOM item' });
  }
});

export default router;

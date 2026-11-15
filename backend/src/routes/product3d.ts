import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

// GET /api/3d-garments - List all 3D garment models (or products with 3D configs) for company
router.get('/', authenticateUser, async (req: any, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized: missing company context' });
    }

    // Fetch all products for company, including 3D model config and variants
    const products = await prisma.product.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        product3dModel: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ products });
  } catch (error: any) {
    console.error('Error fetching 3D garments:', error);
    res.status(500).json({ error: 'Failed to fetch 3D garments' });
  }
});

// GET /api/3d-garments/:productId - Get 3D garment details by product ID
router.get('/:productId', authenticateUser, async (req: any, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { productId } = req.params;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
      include: {
        product3dModel: true,
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error: any) {
    console.error('Error fetching 3D garment:', error);
    res.status(500).json({ error: 'Failed to fetch 3D garment details' });
  }
});

// POST /api/3d-garments - Create or upsert 3D model configuration
router.post('/', authenticateUser, authorizeRole('ADMIN', 'MANAGER'), async (req: any, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, modelUrl, thumbnailUrl, defaultColor, scale, status } = req.body;

    if (!productId || !modelUrl) {
      return res.status(400).json({ error: 'productId and modelUrl are required' });
    }

    // Verify product belongs to user's company
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found in company' });
    }

    // Upsert 3D model configuration
    const updateData: any = {};
    if (modelUrl !== undefined) updateData.modelUrl = modelUrl;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (defaultColor !== undefined) updateData.defaultColor = defaultColor;
    if (scale !== undefined) updateData.scale = parseFloat(scale);
    if (status !== undefined) updateData.status = status;

    const modelConfig = await prisma.product3DModel.upsert({
      where: { productId },
      create: {
        productId,
        modelUrl,
        thumbnailUrl: thumbnailUrl || null,
        defaultColor: defaultColor || '#1e293b',
        scale: scale !== undefined ? parseFloat(scale) : 1.0,
        status: status || 'ACTIVE',
        companyId,
      },
      update: updateData,
      include: {
        product: {
          include: { variants: true },
        },
      },
    });

    res.status(201).json({ modelConfig, message: '3D model configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving 3D garment model:', error);
    res.status(500).json({ error: 'Failed to save 3D garment model configuration' });
  }
});

// PUT /api/3d-garments/:id - Update 3D model configuration by ID
router.put('/:id', authenticateUser, authorizeRole('ADMIN', 'MANAGER'), async (req: any, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await prisma.product3DModel.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: '3D model configuration not found' });
    }

    const { modelUrl, thumbnailUrl, defaultColor, scale, status } = req.body;

    const updateData: any = {};
    if (modelUrl !== undefined) updateData.modelUrl = modelUrl;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (defaultColor !== undefined) updateData.defaultColor = defaultColor;
    if (scale !== undefined) updateData.scale = parseFloat(scale);
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.product3DModel.update({
      where: { id },
      data: updateData,
      include: {
        product: { include: { variants: true } },
      },
    });

    res.json({ modelConfig: updated, message: '3D model configuration updated successfully' });
  } catch (error: any) {
    console.error('Error updating 3D garment model:', error);
    res.status(500).json({ error: 'Failed to update 3D model configuration' });
  }
});

// DELETE /api/3d-garments/:id - Delete 3D model configuration
router.delete('/:id', authenticateUser, authorizeRole('ADMIN', 'MANAGER'), async (req: any, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await prisma.product3DModel.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: '3D model configuration not found' });
    }

    await prisma.product3DModel.delete({
      where: { id },
    });

    res.json({ message: '3D model configuration deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting 3D garment model:', error);
    res.status(500).json({ error: 'Failed to delete 3D model configuration' });
  }
});

export default router;

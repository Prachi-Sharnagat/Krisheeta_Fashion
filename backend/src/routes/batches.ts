import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

const VALID_STATUSES = ['PLANNED', 'IN_PROGRESS', 'IN_INSPECTION', 'COMPLETED', 'CANCELLED'];

async function generateBatchNumber(companyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.productionBatch.count({ where: { companyId } });
  let batchNum = `BAT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let exists = await prisma.productionBatch.findFirst({
    where: { batchNumber: batchNum, companyId }
  });
  let attempt = 1;
  while (exists) {
    batchNum = `BAT-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
    exists = await prisma.productionBatch.findFirst({
      where: { batchNumber: batchNum, companyId }
    });
    attempt++;
  }
  return batchNum;
}

// GET /api/batches - List production batches
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, status, productionOrderId, productId } = req.query;

    const searchStr = (q as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();
    const orderFilter = (productionOrderId as string || '').trim();
    const productFilter = (productId as string || '').trim();

    const whereClause: any = { companyId };

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }
    if (orderFilter) whereClause.productionOrderId = orderFilter;
    if (productFilter) whereClause.productId = productFilter;

    if (searchStr) {
      whereClause.OR = [
        { batchNumber: { contains: searchStr } },
        { productionOrder: { orderNumber: { contains: searchStr } } },
        { product: { name: { contains: searchStr } } }
      ];
    }

    const batches = await prisma.productionBatch.findMany({
      where: whereClause,
      include: {
        productionOrder: {
          select: { id: true, orderNumber: true, status: true, routingId: true }
        },
        product: {
          select: { id: true, name: true, sku: true }
        },
        variant: {
          select: { id: true, name: true, color: true, size: true }
        },
        currentOperation: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(batches);
  } catch (error: any) {
    console.error('Error fetching production batches:', error);
    res.status(500).json({ error: 'Failed to fetch production batches' });
  }
});

// GET /api/batches/:id - View batch detail
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const batch = await prisma.productionBatch.findFirst({
      where: { id, companyId },
      include: {
        productionOrder: {
          include: {
            routing: {
              include: {
                operations: {
                  include: { operation: true },
                  orderBy: { sequence: 'asc' }
                }
              }
            }
          }
        },
        product: true,
        variant: true,
        currentOperation: true,
        wipLogs: {
          include: { operation: true },
          orderBy: { createdAt: 'desc' }
        },
        qualityInspections: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!batch) {
      res.status(404).json({ error: 'Production batch not found' });
      return;
    }

    res.json(batch);
  } catch (error: any) {
    console.error('Error fetching production batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch details' });
  }
});

// POST /api/batches - Create Production Batch / Bundle
router.post('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { productionOrderId, targetQuantity, notes } = req.body;

    if (!productionOrderId || typeof productionOrderId !== 'string') {
      res.status(400).json({ error: 'Production Order ID is required' });
      return;
    }

    const targetQty = Number(targetQuantity);
    if (isNaN(targetQty) || targetQty <= 0) {
      res.status(400).json({ error: 'Target quantity must be greater than 0' });
      return;
    }

    const order = await prisma.productionOrder.findFirst({
      where: { id: productionOrderId, companyId },
      include: {
        routing: {
          include: {
            operations: {
              orderBy: { sequence: 'asc' },
              take: 1
            }
          }
        }
      }
    });

    if (!order) {
      res.status(400).json({ error: 'Production Order not found' });
      return;
    }

    const batchNumber = await generateBatchNumber(companyId);

    // Initial current operation from routing if available
    let initialOpId: string | null = null;
    if (order.routing && Array.isArray(order.routing.operations) && order.routing.operations.length > 0 && order.routing.operations[0]) {
      initialOpId = order.routing.operations[0].operationId;
    }

    const newBatch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        productionOrderId: order.id,
        productId: order.productId,
        variantId: order.variantId,
        targetQuantity: targetQty,
        status: 'PLANNED',
        currentOperationId: initialOpId,
        companyId
      },
      include: {
        productionOrder: true,
        product: true,
        variant: true,
        currentOperation: true
      }
    });

    res.status(201).json(newBatch);
  } catch (error: any) {
    console.error('Error creating production batch:', error);
    res.status(500).json({ error: 'Failed to create production batch' });
  }
});

export default router;

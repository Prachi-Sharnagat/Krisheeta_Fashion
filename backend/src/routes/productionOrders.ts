import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

const VALID_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// Helper to generate unique order number
async function generateOrderNumber(companyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.productionOrder.count({ where: { companyId } });
  let orderNum = `WO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let exists = await prisma.productionOrder.findFirst({
    where: { orderNumber: orderNum, companyId }
  });
  let attempt = 1;
  while (exists) {
    orderNum = `WO-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
    exists = await prisma.productionOrder.findFirst({
      where: { orderNumber: orderNum, companyId }
    });
    attempt++;
  }
  return orderNum;
}

// GET /api/production-orders - List Production Orders
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, status, productId } = req.query;

    const searchStr = (q as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();
    const productFilter = (productId as string || '').trim();

    const whereClause: any = { companyId };

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }
    if (productFilter) {
      whereClause.productId = productFilter;
    }

    if (searchStr) {
      whereClause.OR = [
        { orderNumber: { contains: searchStr } },
        { notes: { contains: searchStr } },
        { product: { name: { contains: searchStr } } },
        { product: { sku: { contains: searchStr } } }
      ];
    }

    const orders = await prisma.productionOrder.findMany({
      where: whereClause,
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true }
        },
        variant: {
          select: { id: true, name: true, sku: true, color: true, size: true }
        },
        salesOrder: {
          select: { id: true, orderNumber: true }
        },
        bom: {
          select: { id: true, name: true, version: true }
        },
        routing: {
          select: { id: true, name: true, version: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching production orders:', error);
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

// GET /api/production-orders/:id - Get detail view of Production Order
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const order = await prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: {
        product: true,
        variant: true,
        salesOrder: true,
        bom: {
          include: {
            items: {
              include: {
                material: true
              }
            }
          }
        },
        routing: {
          include: {
            operations: {
              include: {
                operation: true
              },
              orderBy: { sequence: 'asc' }
            }
          }
        },
        consumptions: {
          include: {
            material: true
          }
        },
        finishedGoods: true
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Production order not found' });
      return;
    }

    // Calculate BOM material requirements vs current stock
    let materialRequirements: any[] = [];
    if (order.bom && order.bom.items) {
      materialRequirements = order.bom.items.map(item => {
        const requiredQty = item.quantity * order.targetQuantity * (1 + (item.wastagePercentage || 0) / 100);
        const currentStock = item.material.currentStock || 0;
        const isSufficient = currentStock >= requiredQty;
        return {
          materialId: item.materialId,
          materialName: item.material.name,
          materialCode: item.material.materialCode,
          unit: item.unit,
          bomQtyPerUnit: item.quantity,
          wastagePercentage: item.wastagePercentage,
          requiredTotalQty: Number(requiredQty.toFixed(2)),
          currentStock: Number(currentStock.toFixed(2)),
          isSufficient
        };
      });
    }

    res.json({
      ...order,
      materialRequirements
    });
  } catch (error: any) {
    console.error('Error fetching production order details:', error);
    res.status(500).json({ error: 'Failed to fetch production order details' });
  }
});

// POST /api/production-orders - Create Production Order
router.post('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { productId, variantId, bomId, routingId, salesOrderId, targetQuantity, startDate, dueDate, notes } = req.body;

    if (!productId || typeof productId !== 'string') {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }

    const targetQty = Number(targetQuantity);
    if (isNaN(targetQty) || targetQty <= 0) {
      res.status(400).json({ error: 'Target quantity must be greater than 0' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      res.status(400).json({ error: 'Product not found' });
      return;
    }

    // Auto-select active BOM if not provided
    let finalBomId = bomId || null;
    if (!finalBomId) {
      const activeBom = await prisma.bOM.findFirst({
        where: { productId, companyId, status: 'ACTIVE' }
      });
      if (activeBom) {
        finalBomId = activeBom.id;
      }
    }

    // Auto-select active Routing if not provided
    let finalRoutingId = routingId || null;
    if (!finalRoutingId) {
      const activeRouting = await prisma.routing.findFirst({
        where: { productId, companyId, status: 'ACTIVE' }
      });
      if (activeRouting) {
        finalRoutingId = activeRouting.id;
      }
    }

    const orderNumber = await generateOrderNumber(companyId);

    const newOrder = await prisma.productionOrder.create({
      data: {
        orderNumber,
        productId,
        variantId: variantId ? String(variantId) : null,
        bomId: finalBomId,
        routingId: finalRoutingId,
        salesOrderId: salesOrderId ? String(salesOrderId) : null,
        targetQuantity: targetQty,
        status: 'PLANNED',
        startDate: startDate ? new Date(startDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ? String(notes).trim() : null,
        companyId
      },
      include: {
        product: true,
        variant: true,
        bom: true,
        routing: true
      }
    });

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Error creating production order:', error);
    res.status(500).json({ error: 'Failed to create production order' });
  }
});

// POST /api/production-orders/:id/issue-materials - Issue raw materials to production
router.post('/:id/issue-materials', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const order = await prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: {
        bom: {
          include: {
            items: {
              include: { material: true }
            }
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Production order not found' });
      return;
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      res.status(400).json({ error: `Cannot issue materials for order with status ${order.status}` });
      return;
    }

    if (!order.bom || !order.bom.items || order.bom.items.length === 0) {
      res.status(400).json({ error: 'No Bill of Materials (BOM) linked to this production order' });
      return;
    }

    // Check material stock sufficiency
    const insufficientMaterials: string[] = [];
    const issueItems = order.bom.items.map(item => {
      const requiredQty = item.quantity * order.targetQuantity * (1 + (item.wastagePercentage || 0) / 100);
      const currentStock = item.material.currentStock || 0;
      if (currentStock < requiredQty) {
        insufficientMaterials.push(
          `${item.material.name} (Required: ${requiredQty.toFixed(2)} ${item.unit}, Available: ${currentStock.toFixed(2)} ${item.unit})`
        );
      }
      return {
        materialId: item.materialId,
        materialName: item.material.name,
        requiredQty,
        unit: item.unit
      };
    });

    if (insufficientMaterials.length > 0) {
      res.status(400).json({
        error: `Insufficient material stock:\n- ${insufficientMaterials.join('\n- ')}`
      });
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const smCount = await prisma.stockMovement.count({ where: { companyId } });
    let smSeq = smCount + 1;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct material stock & log Stock Movement & ProductionConsumption
      for (const item of issueItems) {
        await tx.material.update({
          where: { id: item.materialId },
          data: {
            currentStock: {
              decrement: item.requiredQty
            }
          }
        });

        const movementNumber = `SM-OUT-${dateStr}-${String(smSeq).padStart(4, '0')}`;
        smSeq++;

        await tx.stockMovement.create({
          data: {
            movementNumber,
            materialId: item.materialId,
            type: 'PRODUCTION_ISSUE',
            quantity: -item.requiredQty,
            unit: item.unit,
            referenceType: 'PRODUCTION_ORDER',
            referenceId: order.id,
            notes: `Issued to Work Order ${order.orderNumber}`,
            companyId
          }
        });

        await tx.productionConsumption.create({
          data: {
            productionOrderId: order.id,
            materialId: item.materialId,
            quantity: item.requiredQty,
            unit: item.unit,
            companyId
          }
        });
      }

      // 2. Update ProductionOrder status to IN_PROGRESS
      const updatedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'IN_PROGRESS',
          startDate: order.startDate || new Date()
        },
        include: {
          product: true,
          variant: true,
          consumptions: {
            include: { material: true }
          }
        }
      });

      return updatedOrder;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error issuing production materials:', error);
    res.status(500).json({ error: 'Failed to issue materials for production order' });
  }
});

// POST /api/production-orders/:id/complete - Receive Finished Goods & complete order
router.post('/:id/complete', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);
    const { completedQuantity, scrapQuantity, notes } = req.body;

    const order = await prisma.productionOrder.findFirst({
      where: { id, companyId }
    });

    if (!order) {
      res.status(404).json({ error: 'Production order not found' });
      return;
    }

    if (order.status === 'COMPLETED') {
      res.status(400).json({ error: 'Production order is already completed' });
      return;
    }

    const compQty = Number(completedQuantity || order.targetQuantity);
    const scrapQty = Number(scrapQuantity || 0);

    if (isNaN(compQty) || compQty <= 0) {
      res.status(400).json({ error: 'Completed quantity must be greater than 0' });
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fgCount = await prisma.finishedGoodsReceipt.count({ where: { companyId } });
    const receiptNumber = `FG-${dateStr}-${String(fgCount + 1).padStart(4, '0')}`;

    const smCount = await prisma.stockMovement.count({ where: { companyId } });
    const movementNumber = `SM-FG-${dateStr}-${String(smCount + 1).padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Finished Goods Receipt record
      const fgReceipt = await tx.finishedGoodsReceipt.create({
        data: {
          receiptNumber,
          productionOrderId: order.id,
          productId: order.productId,
          variantId: order.variantId,
          quantity: compQty,
          notes: notes ? String(notes).trim() : null,
          companyId
        }
      });

      // 2. Increment Finished Goods stock on Product & Variant
      await tx.product.update({
        where: { id: order.productId },
        data: {
          finishedGoodsStock: {
            increment: compQty
          }
        }
      });

      if (order.variantId) {
        await tx.variant.update({
          where: { id: order.variantId },
          data: {
            finishedGoodsStock: {
              increment: compQty
            }
          }
        });
      }

      // 3. Log Stock Movement for Finished Goods Receipt
      await tx.stockMovement.create({
        data: {
          movementNumber,
          productId: order.productId,
          variantId: order.variantId,
          type: 'FINISHED_GOODS',
          quantity: compQty,
          unit: 'Pcs',
          referenceType: 'PRODUCTION_ORDER',
          referenceId: order.id,
          notes: `Finished Goods received from Work Order ${order.orderNumber}`,
          companyId
        }
      });

      // 4. Mark Production Order as COMPLETED
      const updatedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          completedQuantity: compQty,
          scrapQuantity: scrapQty,
          status: 'COMPLETED',
          completedDate: new Date()
        },
        include: {
          product: true,
          variant: true,
          finishedGoods: true
        }
      });

      return {
        order: updatedOrder,
        receipt: fgReceipt
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error completing production order:', error);
    res.status(500).json({ error: 'Failed to complete production order' });
  }
});

export default router;

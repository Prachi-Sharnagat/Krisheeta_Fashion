import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all purchase order routes
router.use(authenticateUser);

const VALID_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

// Helper to generate unique PO number
async function generatePONumber(companyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.purchaseOrder.count({ where: { companyId } });
  const sequence = String(count + 1).padStart(4, '0');
  let poNum = `PO-${dateStr}-${sequence}`;

  // Ensure uniqueness
  let exists = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: poNum, companyId }
  });
  let attempt = 1;
  while (exists) {
    poNum = `PO-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
    exists = await prisma.purchaseOrder.findFirst({
      where: { orderNumber: poNum, companyId }
    });
    attempt++;
  }
  return poNum;
}

// GET /api/purchase-orders - List purchase orders
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, search, supplierId, status, priority, startDate, endDate } = req.query;

    const searchStr = ((q || search) as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();
    const priorityFilter = (priority as string || '').trim();
    const supplierFilter = (supplierId as string || '').trim();

    const whereClause: any = { companyId };

    if (supplierFilter) {
      whereClause.supplierId = supplierFilter;
    }

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    if (priorityFilter && VALID_PRIORITIES.includes(priorityFilter)) {
      whereClause.priority = priorityFilter;
    }

    if (startDate || endDate) {
      whereClause.orderDate = {};
      if (startDate) whereClause.orderDate.gte = new Date(startDate as string);
      if (endDate) whereClause.orderDate.lte = new Date(endDate as string);
    }

    if (searchStr) {
      whereClause.OR = [
        { orderNumber: { contains: searchStr } },
        { notes: { contains: searchStr } },
        { supplier: { name: { contains: searchStr } } },
        { supplier: { supplierCode: { contains: searchStr } } },
        { supplier: { companyName: { contains: searchStr } } }
      ];
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: { id: true, name: true, supplierCode: true, companyName: true, email: true, phone: true }
        },
        items: {
          include: {
            material: {
              select: { id: true, name: true, materialCode: true, unit: true, category: true }
            }
          }
        },
        goodsReceipts: {
          select: { id: true, receiptNumber: true, status: true, receiptDate: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total Amount dynamically for each PO
    const formatted = purchaseOrders.map(po => {
      const totalAmount = po.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const totalItems = po.items.length;
      return {
        ...po,
        totalAmount,
        totalItems
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/purchase-orders/:id - Get single purchase order
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: {
          include: {
            material: true
          }
        },
        goodsReceipts: {
          include: {
            items: {
              include: {
                material: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }

    const totalAmount = po.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const totalOrderedQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceivedQty = po.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

    res.json({
      ...po,
      totalAmount,
      totalOrderedQty,
      totalReceivedQty
    });
  } catch (error: any) {
    console.error('Error fetching purchase order details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});

// POST /api/purchase-orders - Create Purchase Order
router.post('/', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { orderNumber, supplierId, orderDate, expectedDeliveryDate, status, priority, notes, items } = req.body;

    if (!supplierId || typeof supplierId !== 'string') {
      res.status(400).json({ error: 'Supplier ID is required' });
      return;
    }

    // Verify supplier belongs to company
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId }
    });

    if (!supplier) {
      res.status(400).json({ error: 'Invalid supplier for your company' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Purchase order must contain at least one item' });
      return;
    }

    // Validate materials and calculate backend item prices
    const itemDataList: { materialId: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; companyId: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.materialId) {
        res.status(400).json({ error: `Item #${i + 1}: Material ID is required` });
        return;
      }

      const material = await prisma.material.findFirst({
        where: { id: item.materialId, companyId }
      });

      if (!material) {
        res.status(400).json({ error: `Item #${i + 1}: Selected material does not exist in your company` });
        return;
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        res.status(400).json({ error: `Item #${i + 1}: Quantity must be greater than 0` });
        return;
      }

      const unitPrice = Number(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        res.status(400).json({ error: `Item #${i + 1}: Unit price cannot be negative` });
        return;
      }

      const unit = (item.unit || material.unit || 'Pcs').trim();
      const totalPrice = Number((quantity * unitPrice).toFixed(2));

      itemDataList.push({
        materialId: item.materialId,
        quantity,
        unit,
        unitPrice,
        totalPrice,
        companyId
      });
    }

    // Determine order number
    let finalOrderNumber = (orderNumber || '').trim();
    if (finalOrderNumber) {
      const existing = await prisma.purchaseOrder.findFirst({
        where: { orderNumber: finalOrderNumber, companyId }
      });
      if (existing) {
        res.status(400).json({ error: `Order Number '${finalOrderNumber}' already exists in your company` });
        return;
      }
    } else {
      finalOrderNumber = await generatePONumber(companyId);
    }

    const finalStatus = VALID_STATUSES.includes(status) ? status : 'DRAFT';
    const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : 'NORMAL';

    const newPO = await prisma.purchaseOrder.create({
      data: {
        orderNumber: finalOrderNumber,
        supplierId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        status: finalStatus,
        priority: finalPriority,
        notes: notes ? String(notes).trim() : null,
        companyId,
        items: {
          create: itemDataList
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            material: true
          }
        }
      }
    });

    const totalAmount = newPO.items.reduce((sum, item) => sum + item.totalPrice, 0);

    res.status(201).json({
      ...newPO,
      totalAmount
    });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: error.message || 'Failed to create purchase order' });
  }
});

// PUT /api/purchase-orders/:id - Update Purchase Order
router.put('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);
    const { supplierId, orderDate, expectedDeliveryDate, status, priority, notes, items } = req.body;

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { items: true }
    });

    if (!existingPO) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }

    if (supplierId && supplierId !== existingPO.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId }
      });
      if (!supplier) {
        res.status(400).json({ error: 'Invalid supplier for your company' });
        return;
      }
    }

    let updatedItemsData: any = undefined;

    if (Array.isArray(items)) {
      if (items.length === 0) {
        res.status(400).json({ error: 'Purchase order must contain at least one item' });
        return;
      }

      const itemDataList: { materialId: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; companyId: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.materialId) {
          res.status(400).json({ error: `Item #${i + 1}: Material ID is required` });
          return;
        }

        const material = await prisma.material.findFirst({
          where: { id: item.materialId, companyId }
        });

        if (!material) {
          res.status(400).json({ error: `Item #${i + 1}: Material not found` });
          return;
        }

        const quantity = Number(item.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          res.status(400).json({ error: `Item #${i + 1}: Quantity must be greater than 0` });
          return;
        }

        const unitPrice = Number(item.unitPrice);
        if (isNaN(unitPrice) || unitPrice < 0) {
          res.status(400).json({ error: `Item #${i + 1}: Unit price cannot be negative` });
          return;
        }

        const unit = (item.unit || material.unit || 'Pcs').trim();
        const totalPrice = Number((quantity * unitPrice).toFixed(2));

        itemDataList.push({
          materialId: item.materialId,
          quantity,
          unit,
          unitPrice,
          totalPrice,
          companyId
        });
      }

      updatedItemsData = itemDataList;
    }

    const nextStatus = status && VALID_STATUSES.includes(status) ? status : existingPO.status;
    const nextPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : existingPO.priority;

    // Transaction to delete old items and insert updated ones if provided
    const updatedPO = await prisma.$transaction(async (tx) => {
      if (updatedItemsData) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id }
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(supplierId && { supplierId }),
          ...(orderDate && { orderDate: new Date(orderDate) }),
          expectedDeliveryDate: expectedDeliveryDate !== undefined 
            ? (expectedDeliveryDate ? new Date(expectedDeliveryDate) : null)
            : existingPO.expectedDeliveryDate,
          status: nextStatus,
          priority: nextPriority,
          ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
          ...(updatedItemsData && {
            items: {
              create: updatedItemsData
            }
          })
        },
        include: {
          supplier: true,
          items: {
            include: { material: true }
          }
        }
      });
    });

    const totalAmount = updatedPO.items.reduce((sum, item) => sum + item.totalPrice, 0);

    res.json({
      ...updatedPO,
      totalAmount
    });
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: error.message || 'Failed to update purchase order' });
  }
});

// PATCH /api/purchase-orders/:id/status - Update PO Status
router.patch('/:id/status', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, companyId }
    });

    if (!existingPO) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { supplier: true, items: { include: { material: true } } }
    });

    res.json(updatedPO);
  } catch (error: any) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

// DELETE /api/purchase-orders/:id - Delete PO (ADMIN only)
router.delete('/:id', authorizeRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { goodsReceipts: true }
    });

    if (!existingPO) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }

    if (existingPO.goodsReceipts.length > 0) {
      res.status(400).json({ error: 'Cannot delete Purchase Order that has linked Goods Receipts.' });
      return;
    }

    await prisma.purchaseOrder.delete({
      where: { id }
    });

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: error.message || 'Failed to delete purchase order' });
  }
});

export default router;

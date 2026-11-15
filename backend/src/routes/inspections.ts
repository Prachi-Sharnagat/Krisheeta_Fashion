import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

const VALID_RESULTS = ['PASS', 'FAIL', 'REWORK_REQUIRED'];
const VALID_TYPES = ['INLINE', 'END_LINE', 'FINAL_AUDIT'];

async function generateInspectionNumber(companyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.qualityInspection.count({ where: { companyId } });
  let qcNum = `QC-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  let exists = await prisma.qualityInspection.findFirst({
    where: { inspectionNumber: qcNum, companyId }
  });
  let attempt = 1;
  while (exists) {
    qcNum = `QC-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
    exists = await prisma.qualityInspection.findFirst({
      where: { inspectionNumber: qcNum, companyId }
    });
    attempt++;
  }
  return qcNum;
}

// GET /api/inspections - List Quality Inspections
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, result, inspectionType, productId, batchId } = req.query;

    const searchStr = (q as string || '').trim().toLowerCase();
    const resultFilter = (result as string || '').trim();
    const typeFilter = (inspectionType as string || '').trim();
    const productFilter = (productId as string || '').trim();
    const batchFilter = (batchId as string || '').trim();

    const whereClause: any = { companyId };

    if (resultFilter && VALID_RESULTS.includes(resultFilter)) {
      whereClause.result = resultFilter;
    }
    if (typeFilter && VALID_TYPES.includes(typeFilter)) {
      whereClause.inspectionType = typeFilter;
    }
    if (productFilter) whereClause.productId = productFilter;
    if (batchFilter) whereClause.batchId = batchFilter;

    if (searchStr) {
      whereClause.OR = [
        { inspectionNumber: { contains: searchStr } },
        { inspectorName: { contains: searchStr } },
        { defectType: { contains: searchStr } },
        { notes: { contains: searchStr } },
        { product: { name: { contains: searchStr } } }
      ];
    }

    const inspections = await prisma.qualityInspection.findMany({
      where: whereClause,
      include: {
        product: {
          select: { id: true, name: true, sku: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        },
        productionOrder: {
          select: { id: true, orderNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(inspections);
  } catch (error: any) {
    console.error('Error fetching quality inspections:', error);
    res.status(500).json({ error: 'Failed to fetch quality inspections' });
  }
});

// POST /api/inspections - Record Quality Inspection
router.post('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const {
      batchId,
      productionOrderId,
      productId,
      variantId,
      inspectorName,
      inspectionType,
      sampleSize,
      passedQuantity,
      reworkQuantity,
      rejectedQuantity,
      defectType,
      result,
      notes
    } = req.body;

    if (!productionOrderId || typeof productionOrderId !== 'string') {
      res.status(400).json({ error: 'Production Order ID is required' });
      return;
    }

    const order = await prisma.productionOrder.findFirst({
      where: { id: productionOrderId, companyId }
    });

    if (!order) {
      res.status(400).json({ error: 'Production Order not found' });
      return;
    }

    const passQty = Number(passedQuantity || 0);
    const reworkQty = Number(reworkQuantity || 0);
    const rejQty = Number(rejectedQuantity || 0);
    const sample = Number(sampleSize || passQty + reworkQty + rejQty);

    if (passQty + reworkQty + rejQty === 0) {
      res.status(400).json({ error: 'At least one inspected item quantity must be greater than 0' });
      return;
    }

    const inspectionNumber = await generateInspectionNumber(companyId);
    const finalResult = VALID_RESULTS.includes(result) ? result : (rejQty > 0 ? 'FAIL' : 'PASS');
    const finalType = VALID_TYPES.includes(inspectionType) ? inspectionType : 'END_LINE';
    const prodId = productId || order.productId;
    const varId = variantId || order.variantId;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Create QualityInspection
      const inspection = await tx.qualityInspection.create({
        data: {
          inspectionNumber,
          batchId: batchId ? String(batchId) : null,
          productionOrderId: order.id,
          productId: prodId,
          variantId: varId,
          inspectorName: inspectorName ? String(inspectorName).trim() : null,
          inspectionType: finalType,
          sampleSize: sample,
          passedQuantity: passQty,
          reworkQuantity: reworkQty,
          rejectedQuantity: rejQty,
          defectType: defectType ? String(defectType).trim() : null,
          result: finalResult,
          notes: notes ? String(notes).trim() : null,
          companyId
        },
        include: {
          product: true,
          batch: true,
          productionOrder: true
        }
      });

      // 1.5. If rework required, create ReworkJob entry
      if (reworkQty > 0 || finalResult === 'REWORK_REQUIRED') {
        const rwkCount = await tx.reworkJob.count({ where: { companyId } });
        const reworkNumber = `RWK-${dateStr}-${String(rwkCount + 1).padStart(4, '0')}`;
        await tx.reworkJob.create({
          data: {
            reworkNumber,
            inspectionId: inspection.id,
            batchId: batchId ? String(batchId) : null,
            productionOrderId: order.id,
            productId: prodId,
            variantId: varId,
            quantity: reworkQty > 0 ? reworkQty : sample,
            defectType: defectType ? String(defectType).trim() : 'Defect for Rework',
            status: 'PENDING_REWORK',
            reworkNotes: notes ? String(notes).trim() : 'Generated from Quality Inspection',
            companyId
          }
        });
      }

      // 2. If PASS on End-Line / Final Audit, receive passed garments into Finished Goods Inventory
      if (finalResult === 'PASS' && passQty > 0 && (finalType === 'END_LINE' || finalType === 'FINAL_AUDIT')) {
        const fgCount = await tx.finishedGoodsReceipt.count({ where: { companyId } });
        const receiptNumber = `FG-${dateStr}-${String(fgCount + 1).padStart(4, '0')}`;

        const smCount = await tx.stockMovement.count({ where: { companyId } });
        const movementNumber = `SM-FG-${dateStr}-${String(smCount + 1).padStart(4, '0')}`;

        // Create FinishedGoodsReceipt
        await tx.finishedGoodsReceipt.create({
          data: {
            receiptNumber,
            productionOrderId: order.id,
            productId: prodId,
            variantId: varId,
            quantity: passQty,
            notes: `Auto-received from Quality Inspection ${inspectionNumber}`,
            companyId
          }
        });

        // Increment Product & Variant FG stock
        await tx.product.update({
          where: { id: prodId },
          data: {
            finishedGoodsStock: { increment: passQty }
          }
        });

        if (varId) {
          await tx.variant.update({
            where: { id: varId },
            data: {
              finishedGoodsStock: { increment: passQty }
            }
          });
        }

        // Log Stock Movement
        await tx.stockMovement.create({
          data: {
            movementNumber,
            productId: prodId,
            variantId: varId,
            type: 'FINISHED_GOODS',
            quantity: passQty,
            unit: 'Pcs',
            referenceType: 'QUALITY_INSPECTION',
            referenceId: inspection.id,
            notes: `Received passed garments from QC ${inspectionNumber}`,
            companyId
          }
        });

        // Update Batch & Order completion status
        if (batchId) {
          await tx.productionBatch.update({
            where: { id: String(batchId) },
            data: {
              completedQuantity: { increment: passQty },
              defectiveQuantity: { increment: rejQty },
              status: 'COMPLETED'
            }
          });
        }

        await tx.productionOrder.update({
          where: { id: order.id },
          data: {
            completedQuantity: { increment: passQty },
            scrapQuantity: { increment: rejQty }
          }
        });
      }

      return inspection;
    });

    res.status(201).json(transactionResult);
  } catch (error: any) {
    console.error('Error recording quality inspection:', error);
    res.status(500).json({ error: 'Failed to record quality inspection' });
  }
});

export default router;

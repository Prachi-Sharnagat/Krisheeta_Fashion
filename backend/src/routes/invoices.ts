import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

const VALID_INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

// Helper to generate a unique invoice number per company
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.invoice.count({ where: { companyId } });
  let nextNum = count + 1;
  let candidate = `INV-${dateStr}-${String(nextNum).padStart(4, '0')}`;

  while (await prisma.invoice.findFirst({ where: { invoiceNumber: candidate, companyId } })) {
    nextNum += 1;
    candidate = `INV-${dateStr}-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
}

// Helper: calculate invoice item & summary totals on backend
function calculateInvoiceTotals(items: any[]) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  const processedItems = items.map(item => {
    const qty = Math.max(0, Number(item.quantity || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice || 0));
    const discount = Math.max(0, Number(item.discount || 0));
    const taxRate = Math.max(0, Number(item.taxRate || 0));

    const lineSubtotal = qty * unitPrice;
    const lineTax = (lineSubtotal - discount) * (taxRate / 100);
    const lineTotal = (lineSubtotal - discount) + lineTax;

    subtotal += lineSubtotal;
    discountAmount += discount;
    taxAmount += lineTax;

    return {
      productId: item.productId || null,
      variantId: item.variantId || null,
      description: item.description ? String(item.description).trim() : 'Item',
      quantity: qty,
      unitPrice: unitPrice,
      taxRate: taxRate,
      discount: discount,
      total: Number(lineTotal.toFixed(2))
    };
  });

  const totalAmount = Number((subtotal - discountAmount + taxAmount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount,
    processedItems
  };
}

// GET /api/invoices - List invoices with search & filtering
router.get('/', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { q, search, status, customerId, salesOrderId, shipmentId, overdue, dateFrom, dateTo } = req.query;

    const searchStr = ((q || search) as string || '').trim().toLowerCase();
    const statusFilter = (status as string || '').trim();
    const customerFilter = (customerId as string || '').trim();
    const orderFilter = (salesOrderId as string || '').trim();
    const shipmentFilter = (shipmentId as string || '').trim();
    const isOverdue = overdue === 'true' || overdue === '1';

    const whereClause: any = { companyId };

    if (statusFilter && VALID_INVOICE_STATUSES.includes(statusFilter)) {
      whereClause.status = statusFilter;
    }
    if (customerFilter) whereClause.customerId = customerFilter;
    if (orderFilter) whereClause.salesOrderId = orderFilter;
    if (shipmentFilter) whereClause.shipmentId = shipmentFilter;

    if (isOverdue) {
      whereClause.dueDate = { lt: new Date() };
      whereClause.balanceAmount = { gt: 0 };
      whereClause.status = { notIn: ['PAID', 'CANCELLED'] };
    }

    if (dateFrom || dateTo) {
      whereClause.invoiceDate = {};
      if (dateFrom) whereClause.invoiceDate.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.invoiceDate.lte = new Date(dateTo as string);
    }

    if (searchStr) {
      whereClause.OR = [
        { invoiceNumber: { contains: searchStr } },
        { notes: { contains: searchStr } },
        { customer: { name: { contains: searchStr } } },
        { customer: { companyName: { contains: searchStr } } },
        { salesOrder: { orderNumber: { contains: searchStr } } }
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, companyName: true, email: true } },
        salesOrder: { select: { id: true, orderNumber: true } },
        shipment: { select: { id: true, shipmentNumber: true } },
        items: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id - View single invoice detail
router.get('/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        salesOrder: { include: { items: { include: { product: true, variant: true } } } },
        shipment: { include: { items: { include: { product: true, variant: true } } } },
        items: { include: { product: true, variant: true } },
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (error: any) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const {
      invoiceNumber,
      customerId,
      salesOrderId,
      shipmentId,
      invoiceDate,
      dueDate,
      status,
      notes,
      items
    } = req.body;

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({ error: 'Customer is required' });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId }
    });
    if (!customer) {
      res.status(400).json({ error: 'Selected customer does not exist in your company' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one invoice line item is required' });
      return;
    }

    let finalInvoiceNumber = invoiceNumber && typeof invoiceNumber === 'string' ? invoiceNumber.trim() : '';
    if (finalInvoiceNumber) {
      const existing = await prisma.invoice.findFirst({
        where: { invoiceNumber: finalInvoiceNumber, companyId }
      });
      if (existing) {
        res.status(400).json({ error: 'Invoice Number already exists in your company' });
        return;
      }
    } else {
      finalInvoiceNumber = await generateInvoiceNumber(companyId);
    }

    // Backend calculation of financial totals
    const totals = calculateInvoiceTotals(items);

    const targetStatus = status && VALID_INVOICE_STATUSES.includes(status) ? status : 'DRAFT';

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: finalInvoiceNumber,
        customerId: customer.id,
        salesOrderId: salesOrderId ? String(salesOrderId).trim() : null,
        shipmentId: shipmentId ? String(shipmentId).trim() : null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        balanceAmount: totals.totalAmount,
        status: targetStatus,
        notes: notes ? String(notes).trim() : null,
        companyId,
        items: {
          create: totals.processedItems.map(item => ({
            ...item,
            companyId
          }))
        }
      },
      include: {
        customer: true,
        items: true,
        salesOrder: true,
        shipment: true
      }
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id - Update invoice details & items
router.put('/:id', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);
    const {
      invoiceNumber,
      customerId,
      salesOrderId,
      shipmentId,
      invoiceDate,
      dueDate,
      status,
      notes,
      items
    } = req.body;

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { payments: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (['PAID', 'CANCELLED'].includes(existing.status)) {
      res.status(400).json({ error: `Cannot edit an invoice with status ${existing.status}` });
      return;
    }

    const targetCustomerId = customerId || existing.customerId;
    const customer = await prisma.customer.findFirst({
      where: { id: targetCustomerId, companyId }
    });
    if (!customer) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one invoice line item is required' });
      return;
    }

    let finalInvoiceNumber = invoiceNumber && typeof invoiceNumber === 'string' ? invoiceNumber.trim() : existing.invoiceNumber;
    if (finalInvoiceNumber !== existing.invoiceNumber) {
      const codeCheck = await prisma.invoice.findFirst({
        where: { invoiceNumber: finalInvoiceNumber, companyId }
      });
      if (codeCheck) {
        res.status(400).json({ error: 'Invoice Number already exists in your company' });
        return;
      }
    }

    const totals = calculateInvoiceTotals(items);
    const paid = existing.paidAmount || 0;
    const balance = Math.max(0, totals.totalAmount - paid);

    let nextStatus = status && VALID_INVOICE_STATUSES.includes(status) ? status : existing.status;
    if (balance === 0 && totals.totalAmount > 0) {
      nextStatus = 'PAID';
    } else if (paid > 0 && balance > 0) {
      nextStatus = 'PARTIALLY_PAID';
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });

      return tx.invoice.update({
        where: { id: existing.id },
        data: {
          invoiceNumber: finalInvoiceNumber,
          customerId: customer.id,
          salesOrderId: salesOrderId !== undefined ? (salesOrderId ? String(salesOrderId).trim() : null) : existing.salesOrderId,
          shipmentId: shipmentId !== undefined ? (shipmentId ? String(shipmentId).trim() : null) : existing.shipmentId,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : existing.invoiceDate,
          dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          balanceAmount: balance,
          status: nextStatus,
          notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
          items: {
            create: totals.processedItems.map(item => ({
              ...item,
              companyId
            }))
          }
        },
        include: {
          customer: true,
          items: true,
          salesOrder: true,
          shipment: true
        }
      });
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
  }
});

// PATCH /api/invoices/:id/status - Update status lifecycle
router.patch('/:id/status', authorizeRole('ADMIN', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);
    const { status } = req.body;

    if (!status || !VALID_INVOICE_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_INVOICE_STATUSES.join(', ')}` });
      return;
    }

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.status === 'PAID' && status !== 'PAID') {
      res.status(400).json({ error: 'A fully paid invoice status cannot be modified' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: { status },
      include: { customer: true, items: true }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: error.message || 'Failed to update invoice status' });
  }
});

// DELETE /api/invoices/:id - Delete invoice (ADMIN only)
router.delete('/:id', authorizeRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const id = String(req.params.id);

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { payments: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.payments && existing.payments.length > 0) {
      const activePayments = existing.payments.filter(p => p.status === 'COMPLETED');
      if (activePayments.length > 0) {
        res.status(400).json({ error: 'Cannot delete an invoice that has completed payments recorded. Cancel or refund payments first.' });
        return;
      }
    }

    await prisma.invoice.delete({ where: { id: existing.id } });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to delete invoice' });
  }
});

export default router;

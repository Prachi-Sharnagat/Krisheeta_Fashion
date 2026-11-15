import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// GET /api/finance/summary - Overview dashboard metrics & reports
router.get('/summary', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    // Fetch invoices, payments, expenses for the company
    const [invoices, payments, expenses] = await Promise.all([
      prisma.invoice.findMany({ where: { companyId } }),
      prisma.payment.findMany({ where: { companyId } }),
      prisma.expense.findMany({ where: { companyId } })
    ]);

    const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED');
    const completedPayments = payments.filter(p => p.status === 'COMPLETED');
    const approvedOrPaidExpenses = expenses.filter(e => ['APPROVED', 'PAID'].includes(e.status));

    const totalSales = activeInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaidInvoices = activeInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const outstandingReceivables = activeInvoices.reduce((sum, i) => sum + i.balanceAmount, 0);
    const totalPaymentsReceived = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = approvedOrPaidExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);

    const today = new Date();
    const overdueCount = activeInvoices.filter(i => i.dueDate && new Date(i.dueDate) < today && i.balanceAmount > 0).length;
    const overdueAmount = activeInvoices.filter(i => i.dueDate && new Date(i.dueDate) < today && i.balanceAmount > 0).reduce((sum, i) => sum + i.balanceAmount, 0);

    const netCashFlow = totalPaymentsReceived - totalExpenses;

    res.json({
      totalSales: Number(totalSales.toFixed(2)),
      outstandingReceivables: Number(outstandingReceivables.toFixed(2)),
      paidAmount: Number(totalPaidInvoices.toFixed(2)),
      totalPaymentsReceived: Number(totalPaymentsReceived.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      pendingExpenses: Number(pendingExpenses.toFixed(2)),
      overdueCount,
      overdueAmount: Number(overdueAmount.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      totalInvoicesCount: invoices.length,
      totalPaymentsCount: payments.length,
      totalExpensesCount: expenses.length
    });
  } catch (error: any) {
    console.error('Error fetching finance summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// GET /api/finance/reports - Detailed report breakdowns
router.get('/reports', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [invoices, payments, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId, status: { not: 'CANCELLED' } },
        include: { customer: { select: { id: true, name: true } } }
      }),
      prisma.payment.findMany({
        where: { companyId, status: 'COMPLETED' },
        include: { customer: { select: { id: true, name: true } } }
      }),
      prisma.expense.findMany({
        where: { companyId, status: { in: ['APPROVED', 'PAID'] } },
        include: { supplier: { select: { id: true, name: true } } }
      })
    ]);

    // Group expenses by category
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    // Group payments by payment method
    const paymentsByMethod: Record<string, number> = {};
    payments.forEach(p => {
      paymentsByMethod[p.paymentMethod] = (paymentsByMethod[p.paymentMethod] || 0) + p.amount;
    });

    res.json({
      salesRevenue: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
      paymentsReceived: payments.reduce((sum, p) => sum + p.amount, 0),
      outstandingReceivables: invoices.reduce((sum, i) => sum + i.balanceAmount, 0),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      netCashFlow: payments.reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0),
      expenseByCategory,
      paymentsByMethod
    });
  } catch (error: any) {
    console.error('Error fetching financial reports:', error);
    res.status(500).json({ error: 'Failed to fetch financial reports' });
  }
});

export default router;

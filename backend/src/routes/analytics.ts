import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);

// Helper for parsing date ranges
function getDateRangeFilter(req: Request, dateField: string = 'createdAt') {
  const { range, dateFrom, dateTo } = req.query;
  const now = new Date();
  let gte: Date | undefined;
  let lte: Date | undefined;

  if (range === 'today') {
    gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'week') {
    const day = now.getDay() || 7;
    gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  } else if (range === 'month') {
    gte = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    gte = new Date(now.getFullYear(), quarterMonth, 1);
  } else if (range === 'year') {
    gte = new Date(now.getFullYear(), 0, 1);
  } else if (dateFrom || dateTo) {
    if (dateFrom) gte = new Date(dateFrom as string);
    if (dateTo) lte = new Date(dateTo as string);
  }

  if (!gte && !lte) return {};
  const filter: any = {};
  if (gte) filter.gte = gte;
  if (lte) filter.lte = lte;
  return { [dateField]: filter };
}

// 1. GET /api/analytics/overview - Management Dashboard KPIs
router.get('/overview', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const dateFilter = getDateRangeFilter(req, 'createdAt');

    const [
      totalSalesOrders,
      activeProductionOrders,
      wipBatches,
      lowStockMaterials,
      pendingInspections,
      readyToShipOrders,
      unpaidInvoices,
      expensesList
    ] = await Promise.all([
      prisma.salesOrder.count({ where: { companyId, ...dateFilter } }),
      prisma.productionOrder.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      prisma.productionBatch.aggregate({
        where: { companyId, status: 'IN_PROGRESS' },
        _sum: { targetQuantity: true, completedQuantity: true }
      }),
      prisma.material.findMany({
        where: { companyId },
        select: { currentStock: true, minimumStockLevel: true }
      }),
      prisma.qualityInspection.count({
        where: { companyId, result: 'REWORK_REQUIRED' }
      }),
      prisma.salesOrder.count({
        where: { companyId, status: 'READY_TO_SHIP' }
      }),
      prisma.invoice.findMany({
        where: { companyId, status: { notIn: ['PAID', 'CANCELLED'] } },
        select: { balanceAmount: true }
      }),
      prisma.expense.aggregate({
        where: { companyId, status: { in: ['APPROVED', 'PAID'] }, ...getDateRangeFilter(req, 'expenseDate') },
        _sum: { amount: true }
      })
    ]);

    const totalWipQty = Math.max(0, (wipBatches._sum.targetQuantity || 0) - (wipBatches._sum.completedQuantity || 0));
    const lowStockCount = lowStockMaterials.filter(m => (m.currentStock || 0) <= (m.minimumStockLevel || 0)).length;
    const outstandingInvoicesAmount = unpaidInvoices.reduce((sum, i) => sum + i.balanceAmount, 0);

    res.json({
      totalSalesOrders,
      activeProductionOrders,
      totalProductionWip: totalWipQty,
      lowStockItems: lowStockCount,
      pendingQualityInspections: pendingInspections,
      readyToShip: readyToShipOrders,
      outstandingInvoices: Number(outstandingInvoicesAmount.toFixed(2)),
      totalExpenses: Number((expensesList._sum.amount || 0).toFixed(2))
    });
  } catch (error: any) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({ error: 'Failed to fetch overview metrics' });
  }
});

// 2. GET /api/analytics/sales - Sales Analytics
router.get('/sales', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const { customerId, productId, status } = req.query;

    const whereClause: any = { companyId, ...getDateRangeFilter(req, 'orderDate') };
    if (customerId) whereClause.customerId = String(customerId);
    if (status) whereClause.status = String(status);
    if (productId) {
      whereClause.items = { some: { productId: String(productId) } };
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where: whereClause,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { orderDate: 'asc' }
    });

    const totalOrders = salesOrders.length;
    const totalOrderValue = salesOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = salesOrders.filter(o => o.status === 'COMPLETED').length;
    const pendingOrders = salesOrders.filter(o => ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(o.status)).length;
    const cancelledOrders = salesOrders.filter(o => o.status === 'CANCELLED').length;
    const averageOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

    // Charts grouping: Orders & Sales value over time (by date)
    const timeMap: Record<string, { count: number; value: number }> = {};
    const statusMap: Record<string, number> = {};
    const priorityMap: Record<string, number> = {};

    salesOrders.forEach(o => {
      const dateKey = new Date(o.orderDate).toISOString().slice(0, 10);
      if (!timeMap[dateKey]) timeMap[dateKey] = { count: 0, value: 0 };
      timeMap[dateKey].count += 1;
      timeMap[dateKey].value += o.totalAmount;

      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      priorityMap[o.priority] = (priorityMap[o.priority] || 0) + 1;
    });

    const ordersOverTime = Object.entries(timeMap).map(([date, data]) => ({
      date,
      orders: data.count,
      value: Number(data.value.toFixed(2))
    }));

    const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    const ordersByPriority = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

    res.json({
      totalOrders,
      totalOrderValue: Number(totalOrderValue.toFixed(2)),
      completedOrders,
      pendingOrders,
      cancelledOrders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      ordersOverTime,
      ordersByStatus,
      ordersByPriority
    });
  } catch (error: any) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
});

// 3. GET /api/analytics/production - Production Analytics
router.get('/production', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [prodOrders, batches, wipLogs] = await Promise.all([
      prisma.productionOrder.findMany({
        where: { companyId, ...getDateRangeFilter(req, 'createdAt') },
        include: { product: { select: { id: true, name: true } } }
      }),
      prisma.productionBatch.findMany({
        where: { companyId },
        include: { currentOperation: { select: { id: true, name: true } } }
      }),
      prisma.wipLog.findMany({
        where: { companyId },
        include: { operation: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const plannedQuantity = prodOrders.reduce((sum, p) => sum + p.targetQuantity, 0);
    const completedQuantity = prodOrders.reduce((sum, p) => sum + p.completedQuantity, 0);
    const rejectedQuantity = batches.reduce((sum, b) => sum + b.defectiveQuantity, 0);
    const totalProducedQuantity = completedQuantity + rejectedQuantity;

    const wipQuantity = batches
      .filter(b => b.status === 'IN_PROGRESS')
      .reduce((sum, b) => sum + Math.max(0, b.targetQuantity - b.completedQuantity), 0);

    const completionPercentage = plannedQuantity > 0 ? (completedQuantity / plannedQuantity) * 100 : 0;
    const rejectionPercentage = totalProducedQuantity > 0 ? (rejectedQuantity / totalProducedQuantity) * 100 : 0;

    // Charts data
    const productMap: Record<string, { planned: number; completed: number }> = {};
    prodOrders.forEach(p => {
      const name = p.product?.name || 'Garment Item';
      if (!productMap[name]) productMap[name] = { planned: 0, completed: 0 };
      productMap[name].planned += p.targetQuantity;
      productMap[name].completed += p.completedQuantity;
    });

    const productionByProduct = Object.entries(productMap).map(([product, d]) => ({
      product,
      planned: d.planned,
      completed: d.completed
    }));

    const opMap: Record<string, { completed: number; rejected: number }> = {};
    wipLogs.forEach(w => {
      const opName = w.operation?.name || 'General Operation';
      if (!opMap[opName]) opMap[opName] = { completed: 0, rejected: 0 };
      opMap[opName].completed += w.completedQuantity;
      opMap[opName].rejected += w.rejectedQuantity;
    });

    const productionByOperation = Object.entries(opMap).map(([operation, d]) => ({
      operation,
      completed: d.completed,
      rejected: d.rejected
    }));

    const wipByOpMap: Record<string, number> = {};
    batches.filter(b => b.status === 'IN_PROGRESS').forEach(b => {
      const opName = b.currentOperation?.name || 'In Process';
      wipByOpMap[opName] = (wipByOpMap[opName] || 0) + Math.max(0, b.targetQuantity - b.completedQuantity);
    });
    const wipByOperation = Object.entries(wipByOpMap).map(([operation, qty]) => ({ operation, quantity: qty }));

    // Trend over time
    const timeTrendMap: Record<string, { completed: number; rejected: number }> = {};
    wipLogs.forEach(w => {
      const date = new Date(w.createdAt).toISOString().slice(0, 10);
      if (!timeTrendMap[date]) timeTrendMap[date] = { completed: 0, rejected: 0 };
      timeTrendMap[date].completed += w.completedQuantity;
      timeTrendMap[date].rejected += w.rejectedQuantity;
    });

    const productionOverTime = Object.entries(timeTrendMap).map(([date, d]) => ({
      date,
      completed: d.completed,
      rejected: d.rejected
    }));

    res.json({
      plannedQuantity,
      completedQuantity,
      wipQuantity,
      rejectedQuantity,
      completionPercentage: Number(completionPercentage.toFixed(1)),
      rejectionPercentage: Number(rejectionPercentage.toFixed(1)),
      productionOverTime,
      productionByProduct,
      productionByOperation,
      wipByOperation,
      rejectionTrend: productionOverTime.map(t => ({ date: t.date, rejected: t.rejected }))
    });
  } catch (error: any) {
    console.error('Error fetching production analytics:', error);
    res.status(500).json({ error: 'Failed to fetch production analytics' });
  }
});

// 4. GET /api/analytics/inventory - Inventory Analytics
router.get('/inventory', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [materials, recentMovements, warehouseCount] = await Promise.all([
      prisma.material.findMany({ where: { companyId } }),
      prisma.stockMovement.findMany({
        where: { companyId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { material: { select: { name: true, materialCode: true } } }
      }),
      prisma.warehouse.count({ where: { companyId, status: 'ACTIVE' } })
    ]);

    const totalInventoryItems = materials.length;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let totalStockQuantity = 0;

    const categoryMap: Record<string, { count: number; totalStock: number }> = {};
    const lowStockList: any[] = [];

    materials.forEach(m => {
      const stock = m.currentStock || 0;
      const minLevel = m.minimumStockLevel || 0;
      const cat = m.category || 'General';

      totalStockQuantity += stock;
      if (stock === 0) outOfStockItems += 1;
      if (stock <= minLevel) {
        lowStockItems += 1;
        lowStockList.push({
          id: m.id,
          material: m.name,
          code: m.materialCode,
          category: cat,
          currentStock: stock,
          minimumLevel: minLevel,
          unit: m.unit || 'Units',
          status: stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
        });
      }

      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, totalStock: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].totalStock += stock;
    });

    const stockByCategory = Object.entries(categoryMap).map(([category, d]) => ({
      category,
      itemCount: d.count,
      totalStock: d.totalStock
    }));

    res.json({
      totalInventoryItems,
      lowStockItems,
      outOfStockItems,
      totalStockQuantity,
      numberOfWarehouses: Math.max(1, warehouseCount),
      recentStockMovementsCount: recentMovements.length,
      recentStockMovements: recentMovements,
      stockByCategory,
      lowStockTable: lowStockList
    });
  } catch (error: any) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
});

// 5. GET /api/analytics/quality - Quality Analytics
router.get('/quality', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const inspections = await prisma.qualityInspection.findMany({
      where: { companyId, ...getDateRangeFilter(req, 'createdAt') },
      orderBy: { createdAt: 'asc' }
    });

    const inspectedQuantity = inspections.reduce((sum, i) => sum + i.sampleSize, 0);
    const acceptedQuantity = inspections.reduce((sum, i) => sum + i.passedQuantity, 0);
    const rejectedQuantity = inspections.reduce((sum, i) => sum + i.rejectedQuantity, 0);
    const reworkQuantity = inspections.reduce((sum, i) => sum + i.reworkQuantity, 0);

    const passRate = inspectedQuantity > 0 ? (acceptedQuantity / inspectedQuantity) * 100 : 0;
    const rejectionRate = inspectedQuantity > 0 ? (rejectedQuantity / inspectedQuantity) * 100 : 0;
    const defectRate = inspectedQuantity > 0 ? (rejectedQuantity / inspectedQuantity) * 100 : 0;

    const defectMap: Record<string, number> = {};
    const timeTrendMap: Record<string, { inspected: number; passed: number; rejected: number; rework: number }> = {};

    inspections.forEach(i => {
      const dType = i.defectType || 'Other';
      defectMap[dType] = (defectMap[dType] || 0) + i.rejectedQuantity;

      const date = new Date(i.createdAt).toISOString().slice(0, 10);
      if (!timeTrendMap[date]) timeTrendMap[date] = { inspected: 0, passed: 0, rejected: 0, rework: 0 };
      timeTrendMap[date].inspected += i.sampleSize;
      timeTrendMap[date].passed += i.passedQuantity;
      timeTrendMap[date].rejected += i.rejectedQuantity;
      timeTrendMap[date].rework += i.reworkQuantity;
    });

    const defectsByType = Object.entries(defectMap).map(([defectType, count]) => ({ defectType, count }));
    const qualityTrend = Object.entries(timeTrendMap).map(([date, d]) => ({
      date,
      inspected: d.inspected,
      passed: d.passed,
      rejected: d.rejected,
      rework: d.rework
    }));

    res.json({
      inspectedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      reworkQuantity,
      passRate: Number(passRate.toFixed(1)),
      rejectionRate: Number(rejectionRate.toFixed(1)),
      defectRate: Number(defectRate.toFixed(1)),
      qualityTrend,
      defectsByType,
      rejectionTrend: qualityTrend.map(q => ({ date: q.date, rejected: q.rejected })),
      reworkTrend: qualityTrend.map(q => ({ date: q.date, rework: q.rework }))
    });
  } catch (error: any) {
    console.error('Error fetching quality analytics:', error);
    res.status(500).json({ error: 'Failed to fetch quality analytics' });
  }
});

// 6. GET /api/analytics/procurement - Procurement Analytics
router.get('/procurement', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [pos, suppliers] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { companyId, ...getDateRangeFilter(req, 'orderDate') },
        include: { supplier: { select: { id: true, name: true } }, items: true },
        orderBy: { orderDate: 'asc' }
      }),
      prisma.supplier.findMany({ where: { companyId } })
    ]);

    const totalPoCount = pos.length;
    let purchaseOrderValue = 0;
    let pendingOrders = 0;
    let partiallyReceived = 0;
    let fullyReceived = 0;

    const timeMap: Record<string, { count: number; value: number }> = {};
    const supplierMap: Record<string, { count: number; value: number }> = {};

    pos.forEach(p => {
      const val = p.items.reduce((sum, item) => sum + item.totalPrice, 0);
      purchaseOrderValue += val;

      if (p.status === 'SENT' || p.status === 'DRAFT') pendingOrders += 1;
      else if (p.status === 'PARTIALLY_RECEIVED') partiallyReceived += 1;
      else if (p.status === 'RECEIVED') fullyReceived += 1;

      const date = new Date(p.orderDate).toISOString().slice(0, 10);
      if (!timeMap[date]) timeMap[date] = { count: 0, value: 0 };
      timeMap[date].count += 1;
      timeMap[date].value += val;

      const sName = p.supplier?.name || 'Direct Procurement';
      if (!supplierMap[sName]) supplierMap[sName] = { count: 0, value: 0 };
      supplierMap[sName].count += 1;
      supplierMap[sName].value += val;
    });

    const purchaseOrdersOverTime = Object.entries(timeMap).map(([date, d]) => ({
      date,
      orders: d.count,
      value: Number(d.value.toFixed(2))
    }));

    const purchasesBySupplier = Object.entries(supplierMap).map(([supplier, d]) => ({
      supplier,
      orders: d.count,
      value: Number(d.value.toFixed(2))
    }));

    res.json({
      purchaseOrdersCount: totalPoCount,
      purchaseOrderValue: Number(purchaseOrderValue.toFixed(2)),
      pendingOrders,
      partiallyReceived,
      fullyReceived,
      supplierCount: suppliers.length,
      purchaseOrdersOverTime,
      purchasesBySupplier
    });
  } catch (error: any) {
    console.error('Error fetching procurement analytics:', error);
    res.status(500).json({ error: 'Failed to fetch procurement analytics' });
  }
});

// 7. GET /api/analytics/finance - Finance Analytics
router.get('/finance', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const [invoices, payments, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId, status: { not: 'CANCELLED' } },
        include: { customer: { select: { name: true } } },
        orderBy: { invoiceDate: 'asc' }
      }),
      prisma.payment.findMany({
        where: { companyId, status: 'COMPLETED' },
        orderBy: { paymentDate: 'asc' }
      }),
      prisma.expense.findMany({
        where: { companyId, status: { in: ['APPROVED', 'PAID'] } },
        orderBy: { expenseDate: 'asc' }
      })
    ]);

    const totalRevenue = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const paymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingReceivables = invoices.reduce((sum, i) => sum + i.balanceAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashFlow = paymentsReceived - totalExpenses;

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueTable = invoices
      .filter(i => i.dueDate && i.dueDate.toISOString().slice(0, 10) < todayStr && i.balanceAmount > 0)
      .map(i => {
        const due = new Date(i.dueDate!);
        const diffDays = Math.max(1, Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          customerName: i.customer?.name || 'Customer',
          dueDate: i.dueDate ? i.dueDate.toISOString().slice(0, 10) : '',
          totalAmount: i.totalAmount,
          paidAmount: i.paidAmount,
          balanceAmount: i.balanceAmount,
          daysOverdue: diffDays
        };
      });

    const timeMap: Record<string, { revenue: number; payments: number; expenses: number }> = {};

    invoices.forEach(i => {
      const date = new Date(i.invoiceDate).toISOString().slice(0, 10);
      if (!timeMap[date]) timeMap[date] = { revenue: 0, payments: 0, expenses: 0 };
      timeMap[date].revenue += i.totalAmount;
    });

    payments.forEach(p => {
      const date = new Date(p.paymentDate).toISOString().slice(0, 10);
      if (!timeMap[date]) timeMap[date] = { revenue: 0, payments: 0, expenses: 0 };
      timeMap[date].payments += p.amount;
    });

    expenses.forEach(e => {
      const date = new Date(e.expenseDate).toISOString().slice(0, 10);
      if (!timeMap[date]) timeMap[date] = { revenue: 0, payments: 0, expenses: 0 };
      timeMap[date].expenses += e.amount;
    });

    const financialTrend = Object.entries(timeMap).map(([date, d]) => ({
      date,
      revenue: Number(d.revenue.toFixed(2)),
      payments: Number(d.payments.toFixed(2)),
      expenses: Number(d.expenses.toFixed(2))
    }));

    res.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      paymentsReceived: Number(paymentsReceived.toFixed(2)),
      outstandingReceivables: Number(outstandingReceivables.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      financialTrend,
      overdueInvoices: overdueTable
    });
  } catch (error: any) {
    console.error('Error fetching finance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch finance analytics' });
  }
});

// 8. GET /api/analytics/hr - HR Analytics (NO salary information exposed)
router.get('/hr', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [employees, todayAttendances, pendingPayrolls] = await Promise.all([
      prisma.employee.findMany({ where: { companyId } }),
      prisma.attendance.findMany({ where: { companyId, date: { gte: todayStart } } }),
      prisma.payroll.count({ where: { companyId, status: { in: ['DRAFT', 'PROCESSED'] } } })
    ]);

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
    const presentToday = todayAttendances.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
    const absentToday = todayAttendances.filter(a => a.status === 'ABSENT').length;
    const onLeave = todayAttendances.filter(a => a.status === 'LEAVE').length;

    const deptMap: Record<string, number> = {};
    employees.forEach(e => {
      const dept = e.department || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const employeeCountByDepartment = Object.entries(deptMap).map(([department, count]) => ({ department, count }));

    res.json({
      totalEmployees,
      activeEmployees,
      presentToday,
      absentToday,
      onLeave,
      pendingPayroll: pendingPayrolls,
      attendanceStatusBreakdown: [
        { status: 'PRESENT', count: presentToday },
        { status: 'ABSENT', count: absentToday },
        { status: 'LEAVE', count: onLeave }
      ],
      employeeCountByDepartment
    });
  } catch (error: any) {
    console.error('Error fetching HR analytics:', error);
    res.status(500).json({ error: 'Failed to fetch HR analytics' });
  }
});

// 9. GET /api/analytics/maintenance - Maintenance Analytics
router.get('/maintenance', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = (req as any).user!.companyId;

    const records = await prisma.maintenanceRecord.findMany({
      where: { companyId, ...getDateRangeFilter(req, 'scheduledDate') },
      orderBy: { scheduledDate: 'asc' }
    });

    const now = new Date();
    const scheduled = records.filter(r => r.status === 'SCHEDULED').length;
    const inProgress = records.filter(r => r.status === 'IN_PROGRESS').length;
    const completed = records.filter(r => r.status === 'COMPLETED').length;
    const overdue = records.filter(r => r.status !== 'COMPLETED' && r.scheduledDate < now).length;
    const maintenanceCost = records.reduce((sum, r) => sum + r.cost, 0);

    const typeMap: Record<string, { count: number; cost: number }> = {};
    const timeMap: Record<string, { count: number; cost: number }> = {};

    records.forEach(r => {
      const type = r.maintenanceType || 'PREVENTIVE';
      if (!typeMap[type]) typeMap[type] = { count: 0, cost: 0 };
      typeMap[type].count += 1;
      typeMap[type].cost += r.cost;

      const date = new Date(r.scheduledDate).toISOString().slice(0, 10);
      if (!timeMap[date]) timeMap[date] = { count: 0, cost: 0 };
      timeMap[date].count += 1;
      timeMap[date].cost += r.cost;
    });

    const maintenanceByType = Object.entries(typeMap).map(([type, d]) => ({
      type,
      count: d.count,
      cost: Number(d.cost.toFixed(2))
    }));

    const maintenanceOverTime = Object.entries(timeMap).map(([date, d]) => ({
      date,
      count: d.count,
      cost: Number(d.cost.toFixed(2))
    }));

    res.json({
      scheduled,
      inProgress,
      completed,
      overdue,
      maintenanceCost: Number(maintenanceCost.toFixed(2)),
      maintenanceOverTime,
      maintenanceByType
    });
  } catch (error: any) {
    console.error('Error fetching maintenance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance analytics' });
  }
});

export default router;

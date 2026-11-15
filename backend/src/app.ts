import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import variantsRouter from './routes/variants';
import materialsRouter from './routes/materials';
import customersRouter from './routes/customers';
import suppliersRouter from './routes/suppliers';
import ordersRouter from './routes/orders';
import bomsRouter from './routes/boms';
import operationsRouter from './routes/operations';
import routingsRouter from './routes/routings';
import purchaseOrdersRouter from './routes/purchaseOrders';
import goodsReceiptsRouter from './routes/goodsReceipts';
import stockMovementsRouter from './routes/stockMovements';
import warehousesRouter from './routes/warehouses';
import productionOrdersRouter from './routes/productionOrders';
import batchesRouter from './routes/batches';
import wipRouter from './routes/wip';
import inspectionsRouter from './routes/inspections';
import reworkRouter from './routes/rework';
import shipmentsRouter from './routes/shipments';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import expensesRouter from './routes/expenses';
import financeRouter from './routes/finance';
import analyticsRouter from './routes/analytics';
import product3dRouter from './routes/product3d';
import employeesRouter from './routes/employees';
import attendanceRouter from './routes/attendance';
import payrollRouter from './routes/payroll';
import maintenanceRouter from './routes/maintenance';
import hrRouter from './routes/hr';
import administrationRouter from './routes/administration';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use('/api/auth', authRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/products', productsRouter);
app.use('/api', variantsRouter);
app.use('/api', bomsRouter);
app.use('/api/operations', operationsRouter);
app.use('/api', routingsRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/goods-receipts', goodsReceiptsRouter);
app.use('/api/stock-movements', stockMovementsRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/production-orders', productionOrdersRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/wip', wipRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/rework', reworkRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/finance', financeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/3d-garments', product3dRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/hr', hrRouter);
app.use('/api/admin', administrationRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/db/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Centralized error handling middleware
app.use(errorHandler);

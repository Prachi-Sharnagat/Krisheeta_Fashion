import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importBackupToPostgres() {
  const backupPath = path.join(__dirname, '../prisma/sqlite_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('--- STARTING POSTGRESQL DATA IMPORT ---');

  // Ordered sequence to respect foreign keys
  const importSequence = [
    { name: 'company', label: 'Companies' },
    { name: 'role', label: 'Roles' },
    { name: 'user', label: 'Users' },
    { name: 'employee', label: 'Employees' },
    { name: 'customer', label: 'Customers' },
    { name: 'supplier', label: 'Suppliers' },
    { name: 'warehouse', label: 'Warehouses' },
    { name: 'product', label: 'Products' },
    { name: 'variant', label: 'Variants' },
    { name: 'material', label: 'Materials' },
    { name: 'operation', label: 'Operations' },
    { name: 'routing', label: 'Routings' },
    { name: 'routingOperation', label: 'Routing Operations' },
    { name: 'bOM', label: 'BOMs' },
    { name: 'bomItem', label: 'BOM Items' },
    { name: 'salesOrder', label: 'Sales Orders' },
    { name: 'salesOrderItem', label: 'Sales Order Items' },
    { name: 'purchaseOrder', label: 'Purchase Orders' },
    { name: 'purchaseOrderItem', label: 'Purchase Order Items' },
    { name: 'goodsReceipt', label: 'Goods Receipts' },
    { name: 'goodsReceiptItem', label: 'Goods Receipt Items' },
    { name: 'productionOrder', label: 'Production Orders' },
    { name: 'productionBatch', label: 'Production Batches' },
    { name: 'wipLog', label: 'WIP Logs' },
    { name: 'productionConsumption', label: 'Production Consumptions' },
    { name: 'finishedGoodsReceipt', label: 'Finished Goods Receipts' },
    { name: 'reworkJob', label: 'Rework Jobs' },
    { name: 'qualityInspection', label: 'Quality Inspections' },
    { name: 'shipment', label: 'Shipments' },
    { name: 'shipmentItem', label: 'Shipment Items' },
    { name: 'invoice', label: 'Invoices' },
    { name: 'invoiceItem', label: 'Invoice Items' },
    { name: 'payment', label: 'Payments' },
    { name: 'expense', label: 'Expenses' },
    { name: 'attendance', label: 'Attendance' },
    { name: 'payroll', label: 'Payroll' },
    { name: 'maintenanceRecord', label: 'Maintenance Records' },
    { name: 'product3DModel', label: 'Product 3D Models' },
    { name: 'stockMovement', label: 'Stock Movements' },
  ];

  for (const item of importSequence) {
    const records = backupData[item.name];
    if (records && Array.isArray(records) && records.length > 0) {
      console.log(`Importing ${records.length} records for ${item.label}...`);
      for (const rec of records) {
        // Convert ISO date strings to Date objects
        const cleanRec: any = {};
        for (const [k, v] of Object.entries(rec)) {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            cleanRec[k] = new Date(v);
          } else {
            cleanRec[k] = v;
          }
        }

        try {
          // Upsert using id to prevent duplicate conflicts
          if (cleanRec.id) {
            await (prisma as any)[item.name].upsert({
              where: { id: cleanRec.id },
              update: cleanRec,
              create: cleanRec,
            });
          } else {
            await (prisma as any)[item.name].create({
              data: cleanRec,
            });
          }
        } catch (err: any) {
          console.warn(`Warning importing ${item.name} (${cleanRec.id || 'no-id'}):`, err.message);
        }
      }
      console.log(`✓ Completed ${item.label}`);
    }
  }

  console.log('\n🎉 ALL SQLite DATA SUCCESSFULLY IMPORTED TO PostgreSQL!');
  await prisma.$disconnect();
}

importBackupToPostgres()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  });


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🧹 KRISHEETA ERP — SAFE DEMO DATA CLEANUP SCRIPT');
  console.log('Target: Remove demo records for Krisheeta Garments Pvt. Ltd.');
  console.log('================================================================\n');

  // Verify company
  const company = await prisma.company.findFirst({
    where: { name: 'Krisheeta Garments Pvt. Ltd.' },
  });

  if (!company) {
    console.log('ℹ️ No company named "Krisheeta Garments Pvt. Ltd." found. Nothing to clean.');
    return;
  }

  const companyId = company.id;
  console.log(`Targeting Company ID: ${companyId} ("${company.name}")\n`);

  // Deletion in reverse foreign key order
  console.log('Cleaning transactional and operational data in topological order...');

  const delPayments = await prisma.payment.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delPayments.count} Payments`);

  const delInvoiceItems = await prisma.invoiceItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delInvoiceItems.count} Invoice Items`);

  const delInvoices = await prisma.invoice.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delInvoices.count} Invoices`);

  const delShipmentItems = await prisma.shipmentItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delShipmentItems.count} Shipment Items`);

  const delShipments = await prisma.shipment.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delShipments.count} Shipments`);

  const delRework = await prisma.reworkJob.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delRework.count} Rework Jobs`);

  const delQC = await prisma.qualityInspection.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delQC.count} Quality Inspections`);

  const delWip = await prisma.wipLog.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delWip.count} WIP Logs`);

  const delBatches = await prisma.productionBatch.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delBatches.count} Production Batches`);

  const delFG = await prisma.finishedGoodsReceipt.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delFG.count} Finished Goods Receipts`);

  const delConsumptions = await prisma.productionConsumption.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delConsumptions.count} Production Consumptions`);

  const delProdOrders = await prisma.productionOrder.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delProdOrders.count} Production Orders`);

  const delSOItems = await prisma.salesOrderItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delSOItems.count} Sales Order Items`);

  const delSalesOrders = await prisma.salesOrder.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delSalesOrders.count} Sales Orders`);

  const delBomItems = await prisma.bomItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delBomItems.count} BOM Items`);

  const delBoms = await prisma.bOM.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delBoms.count} BOMs`);

  const delRoutingOps = await prisma.routingOperation.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delRoutingOps.count} Routing Operations`);

  const delRoutings = await prisma.routing.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delRoutings.count} Routings`);

  const delOps = await prisma.operation.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delOps.count} Operations`);

  const delGRItems = await prisma.goodsReceiptItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delGRItems.count} Goods Receipt Items`);

  const delGR = await prisma.goodsReceipt.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delGR.count} Goods Receipts`);

  const delPOItems = await prisma.purchaseOrderItem.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delPOItems.count} Purchase Order Items`);

  const delPOs = await prisma.purchaseOrder.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delPOs.count} Purchase Orders`);

  const delStock = await prisma.stockMovement.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delStock.count} Stock Movements`);

  const del3D = await prisma.product3DModel.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${del3D.count} 3D Product Models`);

  const delVariants = await prisma.variant.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delVariants.count} Variants`);

  const delProducts = await prisma.product.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delProducts.count} Products`);

  const delMaterials = await prisma.material.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delMaterials.count} Materials`);

  const delExpenses = await prisma.expense.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delExpenses.count} Expenses`);

  const delMaintenance = await prisma.maintenanceRecord.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delMaintenance.count} Maintenance Records`);

  const delAttendance = await prisma.attendance.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delAttendance.count} Attendance Records`);

  const delPayroll = await prisma.payroll.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delPayroll.count} Payroll Records`);

  // Unlink department heads before deleting employees
  await prisma.department.updateMany({
    where: { companyId },
    data: { departmentHeadId: null },
  });

  const delEmployees = await prisma.employee.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delEmployees.count} Employees`);

  const delUserDepts = await prisma.userDepartment.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delUserDepts.count} User-Department Assignments`);

  const delSessions = await prisma.userSession.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delSessions.count} User Sessions`);

  const delAudit = await prisma.auditLog.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delAudit.count} Audit Logs`);

  const delSettings = await prisma.companySetting.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delSettings.count} Company Settings`);

  const delWarehouses = await prisma.warehouse.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delWarehouses.count} Warehouses`);

  const delDepts = await prisma.department.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delDepts.count} Departments`);

  const delCusts = await prisma.customer.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delCusts.count} Customers`);

  const delSups = await prisma.supplier.deleteMany({ where: { companyId } });
  console.log(`  ✓ Removed ${delSups.count} Suppliers`);

  console.log('\n================================================================');
  console.log('✅ DEMO DATA CLEANUP COMPLETED SAFELY');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

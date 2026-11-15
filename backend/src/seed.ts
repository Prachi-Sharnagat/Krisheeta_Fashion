import { prisma } from './db';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding Garment Manufacturing ERP System master data...');

  // 1. Roles
  const roles = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r },
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
  const supervisorRole = await prisma.role.findUnique({ where: { name: 'SUPERVISOR' } });
  const operatorRole = await prisma.role.findUnique({ where: { name: 'OPERATOR' } });

  if (!adminRole || !managerRole || !supervisorRole || !operatorRole) return;

  // 2. Company
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Apex Apparel Manufacturing Co.' },
    });
  }

  // 3. Users across roles
  const hashedPassword = await bcrypt.hash('password123', 10);
  const usersToCreate = [
    { email: 'admin@example.com', name: 'Apex Admin', roleId: adminRole.id },
    { email: 'manager@example.com', name: 'Production Manager', roleId: managerRole.id },
    { email: 'supervisor@example.com', name: 'Floor Supervisor', roleId: supervisorRole.id },
    { email: 'operator@example.com', name: 'Line Operator', roleId: operatorRole.id },
  ];

  for (const u of usersToCreate) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password: hashedPassword,
          companyId: company.id,
          roleId: u.roleId,
        },
      });
    }
  }
  console.log('✓ Users & Roles seeded');

  // 4. Customers
  let customer1 = await prisma.customer.findFirst({ where: { companyId: company.id, name: 'Urban Trends Retailers' } });
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        name: 'Urban Trends Retailers',
        customerCode: 'CUST-URB-001',
        companyName: 'Urban Trends Fashion Pvt Ltd',
        email: 'orders@urbantrends.com',
        phone: '+91 98765 11223',
        address: '45 Fashion Avenue, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  let customer2 = await prisma.customer.findFirst({ where: { companyId: company.id, name: 'Vogue Global Outlets' } });
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        name: 'Vogue Global Outlets',
        customerCode: 'CUST-VOG-002',
        companyName: 'Vogue International Apparel',
        email: 'procurement@vogueglobal.com',
        phone: '+91 98222 33445',
        address: '108 Commercial Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  // 5. Suppliers
  let supplier1 = await prisma.supplier.findFirst({ where: { companyId: company.id, supplierCode: 'SUP-VAR-001' } });
  if (!supplier1) {
    supplier1 = await prisma.supplier.create({
      data: {
        name: 'Vardhman Textiles Ltd.',
        supplierCode: 'SUP-VAR-001',
        companyName: 'Vardhman Group',
        contact: 'Rajesh Sharma',
        email: 'rajesh@vardhman.com',
        phone: '+91 98765 43210',
        address: 'Chandigarh Road Industrial Area',
        city: 'Ludhiana',
        state: 'Punjab',
        country: 'India',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  let supplier2 = await prisma.supplier.findFirst({ where: { companyId: company.id, supplierCode: 'SUP-COA-002' } });
  if (!supplier2) {
    supplier2 = await prisma.supplier.create({
      data: {
        name: 'Coats Thread India',
        supplierCode: 'SUP-COA-002',
        companyName: 'Coats Group plc',
        contact: 'Anita Desai',
        email: 'anita@coats.com',
        phone: '+91 98111 22334',
        address: 'Plot No 12, Cyber City',
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  // 6. Products & Variants
  let product1 = await prisma.product.findFirst({ where: { companyId: company.id, sku: 'TSH-CREW-001' } });
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: 'Classic Cotton Crewneck T-Shirt',
        sku: 'TSH-CREW-001',
        category: 'T-Shirt',
        garmentType: 'Crewneck T-Shirt',
        description: '100% Combed Cotton Premium Crewneck T-Shirt with reinforced stitching.',
        finishedGoodsStock: 250,
        status: 'ACTIVE',
        companyId: company.id,
      },
    });

    await prisma.variant.createMany({
      data: [
        { name: 'Black / M', sku: 'TSH-CREW-BLK-M', color: 'Black', size: 'M', price: 499, finishedGoodsStock: 100, productId: product1.id, companyId: company.id },
        { name: 'Black / L', sku: 'TSH-CREW-BLK-L', color: 'Black', size: 'L', price: 499, finishedGoodsStock: 80, productId: product1.id, companyId: company.id },
        { name: 'Navy / M', sku: 'TSH-CREW-NVY-M', color: 'Navy', size: 'M', price: 549, finishedGoodsStock: 70, productId: product1.id, companyId: company.id },
      ],
    });
  }

  let product2 = await prisma.product.findFirst({ where: { companyId: company.id, sku: 'SHT-OXF-002' } });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: 'Slim Fit Oxford Cotton Shirt',
        sku: 'SHT-OXF-002',
        category: 'Shirt',
        garmentType: 'Button-Down Shirt',
        description: 'Wrinkle-resistant Oxford cotton casual formal button-down shirt.',
        finishedGoodsStock: 120,
        status: 'ACTIVE',
        companyId: company.id,
      },
    });

    await prisma.variant.createMany({
      data: [
        { name: 'White / L', sku: 'SHT-OXF-WHT-L', color: 'White', size: 'L', price: 999, finishedGoodsStock: 60, productId: product2.id, companyId: company.id },
        { name: 'Blue / M', sku: 'SHT-OXF-BLU-M', color: 'Blue', size: 'M', price: 999, finishedGoodsStock: 60, productId: product2.id, companyId: company.id },
      ],
    });
  }

  // 7. Link 3D Models
  const existing3D = await prisma.product3DModel.findFirst({ where: { productId: product1.id } });
  if (!existing3D) {
    await prisma.product3DModel.create({
      data: {
        productId: product1.id,
        modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb',
        thumbnailUrl: 'https://via.placeholder.com/150',
        defaultColor: '#1e293b',
        scale: 1.0,
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  // 8. Raw Materials
  const rawMaterials = [
    { name: '100% Combed Cotton Single Jersey (180 GSM)', materialCode: 'MAT-COT-180', category: 'Fabric', unit: 'Kg', minimumStockLevel: 50, currentStock: 450 },
    { name: 'Poly-Cotton Rib (220 GSM)', materialCode: 'MAT-RIB-220', category: 'Fabric', unit: 'Kg', minimumStockLevel: 20, currentStock: 120 },
    { name: 'Spun Polyester Thread 40/2', materialCode: 'MAT-THR-P40', category: 'Trims', unit: 'Cone', minimumStockLevel: 100, currentStock: 300 },
    { name: '4-Hole Resin Buttons 15mm', materialCode: 'MAT-BTN-RES', category: 'Trims', unit: 'Gross', minimumStockLevel: 50, currentStock: 200 },
    { name: 'Clear Polybag 12x15 inch', materialCode: 'MAT-PKG-BAG', category: 'Packaging', unit: 'Piece', minimumStockLevel: 500, currentStock: 2500 },
  ];

  for (const m of rawMaterials) {
    const existingMat = await prisma.material.findFirst({ where: { companyId: company.id, materialCode: m.materialCode } });
    if (!existingMat) {
      await prisma.material.create({
        data: {
          ...m,
          companyId: company.id,
        },
      });
    }
  }

  // 9. Master Operations & Routing
  const defaultOperations = [
    { name: 'Fabric Cutting', code: 'OP-CUT', description: 'Automatic & manual fabric spreading and panel cutting', machineType: 'CNC Cutter', standardTime: 3.5 },
    { name: 'Sewing & Assembly', code: 'OP-SEW', description: 'Main seam assembly and stitching', machineType: 'Single Needle Lockstitch', standardTime: 8.0 },
    { name: 'Overlock & Edging', code: 'OP-OVK', description: 'Edge finishing and safety stitching', machineType: '4-Thread Overlock Machine', standardTime: 4.0 },
    { name: 'Steam Ironing & Pressing', code: 'OP-IRN', description: 'Garment shaping and steam pressing', machineType: 'Steam Ironing Station', standardTime: 2.5 },
    { name: 'Quality Inspection', code: 'OP-QC', description: '100% visual and measurement quality check', machineType: 'Inspection Table', standardTime: 2.0 },
    { name: 'Packing & Tagging', code: 'OP-PAK', description: 'Hangtag attachment and polybagging', machineType: 'Tag Gun & Barcode Scanner', standardTime: 1.5 },
  ];

  for (const op of defaultOperations) {
    const existingOp = await prisma.operation.findFirst({ where: { companyId: company.id, code: op.code } });
    if (!existingOp) {
      await prisma.operation.create({
        data: {
          ...op,
          companyId: company.id,
        },
      });
    }
  }

  // 9b. Warehouses
  let whRaw = await prisma.warehouse.findFirst({ where: { companyId: company.id, code: 'WH-RAW-01' } });
  if (!whRaw) {
    whRaw = await prisma.warehouse.create({
      data: {
        code: 'WH-RAW-01',
        name: 'Apex Raw Materials Warehouse',
        location: 'Building A, Unit 1, Sector 5',
        type: 'RAW_MATERIALS',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  let whFG = await prisma.warehouse.findFirst({ where: { companyId: company.id, code: 'WH-FG-01' } });
  if (!whFG) {
    whFG = await prisma.warehouse.create({
      data: {
        code: 'WH-FG-01',
        name: 'Apex Finished Goods Central Hub',
        location: 'Building B, Bay 3, Logistics Park',
        type: 'FINISHED_GOODS',
        status: 'ACTIVE',
        companyId: company.id,
      },
    });
  }

  // 10. BOM
  const cottonMat = await prisma.material.findFirst({ where: { companyId: company.id, materialCode: 'MAT-COT-180' } });
  const threadMat = await prisma.material.findFirst({ where: { companyId: company.id, materialCode: 'MAT-THR-P40' } });

  let bom1 = await prisma.bOM.findFirst({ where: { companyId: company.id, productId: product1.id } });
  if (!bom1 && cottonMat && threadMat) {
    bom1 = await prisma.bOM.create({
      data: {
        name: 'BOM - Classic T-Shirt v1.0',
        version: '1.0',
        productId: product1.id,
        companyId: company.id,
        items: {
          create: [
            { materialId: cottonMat.id, quantity: 0.25, unit: 'Kg', companyId: company.id },
            { materialId: threadMat.id, quantity: 0.05, unit: 'Cone', companyId: company.id },
          ],
        },
      },
    });
  }

  // 11. Sales Order
  let salesOrder1 = await prisma.salesOrder.findFirst({ where: { companyId: company.id, orderNumber: 'SO-2026-0001' } });
  if (!salesOrder1) {
    salesOrder1 = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-2026-0001',
        customerId: customer1.id,
        orderDate: new Date(),
        expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
        priority: 'HIGH',
        totalAmount: 49900,
        companyId: company.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 100,
              unitPrice: 499,
              totalPrice: 49900,
              companyId: company.id,
            },
          ],
        },
      },
    });
  }

  // 12. Production Order
  let prodOrder1 = await prisma.productionOrder.findFirst({ where: { companyId: company.id, orderNumber: 'WO-20260925-0001' } });
  if (!prodOrder1 && salesOrder1) {
    prodOrder1 = await prisma.productionOrder.create({
      data: {
        orderNumber: 'WO-20260925-0001',
        salesOrderId: salesOrder1.id,
        productId: product1.id,
        targetQuantity: 100,
        completedQuantity: 100,
        scrapQuantity: 2,
        status: 'COMPLETED',
        startDate: new Date(),
        completedDate: new Date(),
        companyId: company.id,
      },
    });
  }

  // 13. Quality Inspection
  if (prodOrder1) {
    const existingQC = await prisma.qualityInspection.findFirst({ where: { companyId: company.id, productionOrderId: prodOrder1.id } });
    if (!existingQC) {
      await prisma.qualityInspection.create({
        data: {
          inspectionNumber: 'QC-20260925-0001',
          productionOrderId: prodOrder1.id,
          productId: product1.id,
          sampleSize: 100,
          passedQuantity: 98,
          rejectedQuantity: 2,
          reworkQuantity: 0,
          result: 'PASS',
          inspectorName: 'Anita Sharma',
          companyId: company.id,
        },
      });
    }
  }

  // 14. Shipment
  if (salesOrder1) {
    let shipment1 = await prisma.shipment.findFirst({ where: { companyId: company.id, salesOrderId: salesOrder1.id } });
    if (!shipment1) {
      const firstOrderItem = await prisma.salesOrderItem.findFirst({ where: { salesOrderId: salesOrder1.id } });
      if (firstOrderItem) {
        shipment1 = await prisma.shipment.create({
          data: {
            shipmentNumber: 'SH-20260925-0001',
            salesOrderId: salesOrder1.id,
            customerId: customer1.id,
            shipmentDate: new Date(),
            status: 'DISPATCHED',
            carrier: 'BlueDart Logistics',
            trackingNumber: 'BD-9988776655',
            companyId: company.id,
            items: {
              create: [
                {
                  salesOrderItemId: firstOrderItem.id,
                  productId: product1.id,
                  quantity: 100,
                  companyId: company.id,
                },
              ],
            },
          },
        });
      }
    }

    // 15. Invoice & Payment
    let invoice1 = await prisma.invoice.findFirst({ where: { companyId: company.id, salesOrderId: salesOrder1.id } });
    if (!invoice1) {
      invoice1 = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-20260925-0001',
          customerId: customer1.id,
          salesOrderId: salesOrder1.id,
          shipmentId: shipment1?.id || null,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 49900,
          taxAmount: 8982,
          discountAmount: 0,
          totalAmount: 58882,
          paidAmount: 58882,
          balanceAmount: 0,
          status: 'PAID',
          companyId: company.id,
        },
      });

      await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-20260925-0001',
          invoiceId: invoice1.id,
          customerId: customer1.id,
          paymentDate: new Date(),
          amount: 58882,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'HDFC-TXN-998811',
          notes: 'Full payment received via NEFT',
          companyId: company.id,
        },
      });
    }
  }

  console.log('\n--- GARMENT ERP MASTER DATA SEEDING COMPLETE ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from './db';
import jwt from 'jsonwebtoken';
import { app } from './app';
import { Server } from 'http';

async function runDispatchTests() {
  console.log('--- STARTING STEP 13: DISPATCH & SHIPMENT MANAGEMENT INTEGRATION TESTS ---');

  let server: Server | null = null;
  const PORT = 5002;

  try {
    const healthCheck = await fetch(`http://localhost:${PORT}/api/health`);
    if (healthCheck.ok) {
      console.log('✓ Connected to running server on port', PORT);
    }
  } catch (e) {
    console.log(`Starting test server on port ${PORT}...`);
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✓ Test server started on port ${PORT}`);
        resolve();
      });
    });
  }

  try {
    // 1. Get Admin User & Company
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' },
      include: { role: true, company: true }
    });

    if (!adminUser) {
      // Create company & role & user if seed has not been run
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({ data: { name: 'Test Garments Ltd' } });
      }

      let role = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
      if (!role) {
        role = await prisma.role.create({ data: { name: 'ADMIN' } });
      }

      adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin User',
          password: 'hashedpassword',
          companyId: company.id,
          roleId: role.id
        },
        include: { role: true, company: true }
      });
    }

    const companyId = adminUser.companyId;
    const token = jwt.sign(
      { userId: adminUser.id, companyId: adminUser.companyId, role: adminUser.role.name },
      process.env.JWT_SECRET || 'supersecret_jwt_key_for_development',
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 2. Setup Test Customer & Product & SalesOrder
    const dateStr = Date.now().toString().slice(-6);

    const customer = await prisma.customer.create({
      data: {
        name: `Test Customer ${dateStr}`,
        email: `cust${dateStr}@test.com`,
        companyId
      }
    });

    const product = await prisma.product.create({
      data: {
        name: `Export Polo Shirt ${dateStr}`,
        sku: `POLO-EXP-${dateStr}`,
        finishedGoodsStock: 0, // initially 0
        companyId
      }
    });

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-DISP-${dateStr}`,
        customerId: customer.id,
        status: 'CONFIRMED',
        totalAmount: 5000,
        companyId,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 100,
              unitPrice: 50,
              totalPrice: 5000,
              companyId
            }
          ]
        }
      },
      include: { items: true }
    });

    const soItem = salesOrder.items[0]!;
    console.log(`✓ Created test Sales Order ${salesOrder.orderNumber} with quantity: ${soItem.quantity}`);

    // TEST 1: Attempt to create shipment with quantity > order remaining quantity (Should Fail)
    console.log('\n--- TEST 1: Over-shipment Prevention ---');
    const overShipRes = await fetch(`http://localhost:${PORT}/api/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        status: 'DRAFT',
        items: [
          {
            salesOrderItemId: soItem.id,
            productId: product.id,
            quantity: 150 // Exceeds 100
          }
        ]
      })
    });

    const overShipData = await overShipRes.json();
    if (overShipRes.status === 400 && overShipData.error.includes('cannot exceed')) {
      console.log('✓ Successfully blocked over-shipment exceeding remaining order quantity:', overShipData.error);
    } else {
      throw new Error(`Over-shipment check failed. Expected 400 error, got: ${JSON.stringify(overShipData)}`);
    }

    // TEST 2: Attempt to mark shipment READY without Quality Inspection (Should Fail)
    console.log('\n--- TEST 2: Quality Inspection Validation ---');
    const noQcRes = await fetch(`http://localhost:${PORT}/api/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        status: 'READY',
        items: [
          {
            salesOrderItemId: soItem.id,
            productId: product.id,
            quantity: 50
          }
        ]
      })
    });

    const noQcData = await noQcRes.json();
    if (noQcRes.status === 400 && noQcData.error.includes('Insufficient approved quantity')) {
      console.log('✓ Successfully blocked READY status due to missing approved Quality Inspection:', noQcData.error);
    } else {
      throw new Error(`Quality check failed. Expected 400 error, got: ${JSON.stringify(noQcData)}`);
    }

    // TEST 3: Add Approved Quality Inspection and receive Finished Goods
    console.log('\n--- TEST 3: Add Approved Quality Inspection & Stock ---');
    const productionOrder = await prisma.productionOrder.create({
      data: {
        orderNumber: `PO-DISP-${dateStr}`,
        productId: product.id,
        targetQuantity: 100,
        companyId
      }
    });

    const qcRes = await fetch(`http://localhost:${PORT}/api/inspections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productionOrderId: productionOrder.id,
        productId: product.id,
        inspectionType: 'END_LINE',
        passedQuantity: 80, // 80 passed QC
        rejectedQuantity: 5,
        result: 'PASS'
      })
    });

    if (!qcRes.ok) {
      const err = await qcRes.json();
      throw new Error(`Failed to record QC inspection: ${err.error}`);
    }

    // Verify finished goods stock incremented to 80
    const updatedProd = await prisma.product.findUnique({ where: { id: product.id } });
    console.log(`✓ Recorded QC PASS (80 pcs). Updated Finished Goods Stock: ${updatedProd?.finishedGoodsStock} pcs`);

    // TEST 4: Create DRAFT Shipment for 60 pcs
    console.log('\n--- TEST 4: Create Draft Shipment ---');
    const draftRes = await fetch(`http://localhost:${PORT}/api/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        carrier: 'Express Logistics',
        trackingNumber: 'TRK-100293',
        status: 'DRAFT',
        items: [
          {
            salesOrderItemId: soItem.id,
            productId: product.id,
            quantity: 60
          }
        ]
      })
    });

    if (!draftRes.ok) {
      const err = await draftRes.json();
      throw new Error(`Failed to create draft shipment: ${err.error}`);
    }

    const shipment = await draftRes.json();
    console.log(`✓ Created Draft Shipment #${shipment.shipmentNumber} (ID: ${shipment.id})`);

    // TEST 5: Dispatch Shipment & Verify Inventory ISSUE Transaction
    console.log('\n--- TEST 5: Dispatch Shipment & Verify Stock Movements ---');
    const dispatchRes = await fetch(`http://localhost:${PORT}/api/shipments/${shipment.id}/dispatch`, {
      method: 'PATCH',
      headers
    });

    if (!dispatchRes.ok) {
      const err = await dispatchRes.json();
      throw new Error(`Failed to dispatch shipment: ${err.error}`);
    }

    const dispatchedShipment = await dispatchRes.json();
    console.log(`✓ Shipment #${dispatchedShipment.shipmentNumber} status is now: ${dispatchedShipment.status}`);

    // Verify inventory deduction (80 - 60 = 20)
    const afterDispatchProd = await prisma.product.findUnique({ where: { id: product.id } });
    if (afterDispatchProd?.finishedGoodsStock !== 20) {
      throw new Error(`Expected finishedGoodsStock to be 20, got ${afterDispatchProd?.finishedGoodsStock}`);
    }
    console.log(`✓ Finished goods stock correctly deducted to: ${afterDispatchProd.finishedGoodsStock} pcs`);

    // Verify StockMovement entry created with type ISSUE and referenceType SHIPMENT
    const stockMovement = await prisma.stockMovement.findFirst({
      where: { referenceId: shipment.id, referenceType: 'SHIPMENT', companyId }
    });

    if (!stockMovement || stockMovement.type !== 'ISSUE' || stockMovement.quantity !== 60) {
      throw new Error(`Invalid StockMovement created for shipment dispatch: ${JSON.stringify(stockMovement)}`);
    }
    console.log(`✓ Created StockMovement #${stockMovement.movementNumber} with type: ${stockMovement.type}, referenceType: ${stockMovement.referenceType}`);

    // TEST 6: Duplicate Dispatch Prevention
    console.log('\n--- TEST 6: Prevent Duplicate Dispatch ---');
    const dupDispatchRes = await fetch(`http://localhost:${PORT}/api/shipments/${shipment.id}/dispatch`, {
      method: 'PATCH',
      headers
    });

    const dupData = await dupDispatchRes.json();
    if (dupDispatchRes.status === 400 && dupData.error.includes('already been dispatched')) {
      console.log('✓ Successfully blocked duplicate dispatch:', dupData.error);
    } else {
      throw new Error(`Duplicate dispatch check failed. Expected 400 error, got: ${JSON.stringify(dupData)}`);
    }

    // TEST 7: Deliver Shipment & Verify Sales Order Completion Flow
    console.log('\n--- TEST 7: Deliver Shipment & Sales Order Completion ---');

    // Create & dispatch 2nd shipment for remaining 40 pcs
    // First, pass QC for remaining 20 pcs so total passed = 100
    await fetch(`http://localhost:${PORT}/api/inspections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productionOrderId: productionOrder.id,
        productId: product.id,
        passedQuantity: 20,
        result: 'PASS'
      })
    });

    const shipment2Res = await fetch(`http://localhost:${PORT}/api/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        status: 'DISPATCHED', // create and dispatch
        items: [
          {
            salesOrderItemId: soItem.id,
            productId: product.id,
            quantity: 40
          }
        ]
      })
    });

    if (!shipment2Res.ok) {
      const err = await shipment2Res.json();
      throw new Error(`Failed to create second shipment: ${err.error}`);
    }
    const shipment2 = await shipment2Res.json();
    console.log(`✓ Created and dispatched second shipment #${shipment2.shipmentNumber} for 40 pcs`);

    // Deliver both shipments
    await fetch(`http://localhost:${PORT}/api/shipments/${shipment.id}/deliver`, { method: 'PATCH', headers });
    await fetch(`http://localhost:${PORT}/api/shipments/${shipment2.id}/deliver`, { method: 'PATCH', headers });

    // Verify Sales Order status became COMPLETED
    const finalSO = await prisma.salesOrder.findUnique({ where: { id: salesOrder.id } });
    if (finalSO?.status !== 'COMPLETED') {
      throw new Error(`Expected Sales Order status to be COMPLETED after all deliveries, got ${finalSO?.status}`);
    }
    console.log(`✓ Sales Order ${finalSO.orderNumber} status automatically updated to: ${finalSO.status}`);

    // TEST 8: Invalid Status Transition (DELIVERED -> DRAFT)
    console.log('\n--- TEST 8: Invalid Status Transition ---');
    const invalidTransRes = await fetch(`http://localhost:${PORT}/api/shipments/${shipment.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'DRAFT' })
    });

    const invalidTransData = await invalidTransRes.json();
    if (invalidTransRes.status === 400 && invalidTransData.error.includes('Invalid status transition')) {
      console.log('✓ Successfully blocked invalid status transition (DELIVERED -> DRAFT):', invalidTransData.error);
    } else {
      throw new Error(`Invalid status transition check failed. Got: ${JSON.stringify(invalidTransData)}`);
    }

    console.log('\n======================================================');
    console.log('✓ ALL STEP 13 DISPATCH & SHIPMENT TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');

  } catch (error) {
    console.error('Test Failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      (server as Server).close();
      console.log('✓ Test server stopped.');
    }
  }
}

runDispatchTests();

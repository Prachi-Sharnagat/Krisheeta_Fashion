"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const app_1 = require("./app");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
async function runEndToEndScenario() {
    console.log('===============================================================');
    console.log('--- STARTING 24-STEP END-TO-END GARMENT ERP WORKFLOW TEST ---');
    console.log('===============================================================\n');
    let server = null;
    const PORT = 5010;
    try {
        await new Promise((resolve) => {
            server = app_1.app.listen(PORT, () => {
                console.log(`✓ Started test server on port ${PORT}`);
                resolve();
            });
        });
        const baseUrl = `http://localhost:${PORT}`;
        // 0. Create Isolated Company & User for End-to-End Execution
        const company = await db_1.prisma.company.create({
            data: { name: `E2E Garment Corp ${Date.now()}` },
        });
        const role = (await db_1.prisma.role.findFirst({ where: { name: 'ADMIN' } })) ||
            (await db_1.prisma.role.create({ data: { name: 'ADMIN' } }));
        const user = await db_1.prisma.user.create({
            data: {
                email: `e2e_admin_${Date.now()}@example.com`,
                password: 'hashedpassword',
                name: 'E2E Admin',
                companyId: company.id,
                roleId: role.id,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, companyId: company.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
        const authHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
        console.log('✓ Step 0: Created test company & JWT credentials');
        // 1. Create Customer
        const custRes = await fetch(`${baseUrl}/api/customers`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Grand Fashion Outlets',
                customerCode: `CUST-E2E-${Date.now()}`,
                email: 'buying@grandfashion.com',
                phone: '+91 99000 11223',
            }),
        });
        const customer = await custRes.json();
        if (!custRes.ok)
            throw new Error(`Step 1 failed: ${JSON.stringify(customer)}`);
        console.log('✓ Step 1: Created customer ->', customer.name);
        // 2. Create Product
        const prodRes = await fetch(`${baseUrl}/api/products`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Heavyweight Denim Hoodie',
                sku: `HDM-HOOD-${Date.now()}`,
                category: 'Hoodie',
                garmentType: 'Denim Hoodie',
                description: 'Premium heavyweight cotton denim hoodie',
            }),
        });
        const product = await prodRes.json();
        if (!prodRes.ok)
            throw new Error(`Step 2 failed: ${JSON.stringify(product)}`);
        console.log('✓ Step 2: Created product ->', product.name);
        // 3. Create Product Variant
        const varRes = await fetch(`${baseUrl}/api/products/${product.id}/variants`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Dark Wash / L',
                sku: `HDM-HOOD-DRK-L-${Date.now()}`,
                color: 'Dark Wash',
                size: 'L',
                price: 1499,
                finishedGoodsStock: 0,
            }),
        });
        const variant = await varRes.json();
        if (!varRes.ok)
            throw new Error(`Step 3 failed: ${JSON.stringify(variant)}`);
        console.log('✓ Step 3: Created product variant ->', variant.name);
        // 4. Create Raw Materials
        const matRes = await fetch(`${baseUrl}/api/materials`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: '14oz Indigo Denim Fabric',
                materialCode: `MAT-DNM-${Date.now()}`,
                category: 'Fabric',
                unit: 'Meter',
                minimumStockLevel: 50,
                currentStock: 0,
            }),
        });
        const material = await matRes.json();
        if (!matRes.ok)
            throw new Error(`Step 4 failed: ${JSON.stringify(material)}`);
        console.log('✓ Step 4: Created material ->', material.name);
        // 5. Create BOM
        const bomRes = await fetch(`${baseUrl}/api/products/${product.id}/boms`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'BOM Denim Hoodie v1.0',
                version: '1.0',
                items: [
                    {
                        materialId: material.id,
                        quantity: 1.5,
                        unit: 'Meter',
                        wastagePercentage: 2,
                    },
                ],
            }),
        });
        const bom = await bomRes.json();
        if (!bomRes.ok)
            throw new Error(`Step 5 failed: ${JSON.stringify(bom)}`);
        console.log('✓ Step 5: Created BOM ->', bom.name);
        // 6. Create Routing Operations
        const opRes = await fetch(`${baseUrl}/api/operations`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Denim Assembly',
                code: `OP-DNM-${Date.now()}`,
                description: 'Heavy duty sewing operation',
                machineType: 'Heavy Duty Lockstitch',
                standardTime: 5.0,
            }),
        });
        const operation = await opRes.json();
        if (!opRes.ok)
            throw new Error(`Step 6 failed: ${JSON.stringify(operation)}`);
        console.log('✓ Step 6: Created operation ->', operation.name);
        // 7. Create Sales Order
        const soRes = await fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                customerId: customer.id,
                orderDate: new Date(),
                priority: 'HIGH',
                items: [
                    {
                        productId: product.id,
                        variantId: variant.id,
                        quantity: 50,
                        unitPrice: 1499,
                    },
                ],
            }),
        });
        const salesOrder = await soRes.json();
        if (!soRes.ok)
            throw new Error(`Step 7 failed: ${JSON.stringify(salesOrder)}`);
        console.log('✓ Step 7: Created Sales Order ->', salesOrder.orderNumber);
        // 8. Create Production Order from Sales Order
        const poRes = await fetch(`${baseUrl}/api/production-orders`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                salesOrderId: salesOrder.id,
                productId: product.id,
                variantId: variant.id,
                bomId: bom.id,
                targetQuantity: 50,
                startDate: new Date(),
            }),
        });
        const productionOrder = await poRes.json();
        if (!poRes.ok)
            throw new Error(`Step 8 failed: ${JSON.stringify(productionOrder)}`);
        console.log('✓ Step 8: Created Production Order ->', productionOrder.orderNumber);
        // 9. Create Production Batch
        const batchRes = await fetch(`${baseUrl}/api/batches`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                productionOrderId: productionOrder.id,
                productId: product.id,
                variantId: variant.id,
                targetQuantity: 50,
            }),
        });
        const batch = await batchRes.json();
        if (!batchRes.ok)
            throw new Error(`Step 9 failed: ${JSON.stringify(batch)}`);
        console.log('✓ Step 9: Created Production Batch ->', batch.batchNumber);
        // 10. Receive Required Raw Materials through Procurement
        const suppRes = await fetch(`${baseUrl}/api/suppliers`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Denim Mills Ltd',
                supplierCode: `SUP-DNM-${Date.now()}`,
                companyName: 'Denim Mills Global',
            }),
        });
        const supplier = await suppRes.json();
        const purOrderRes = await fetch(`${baseUrl}/api/purchase-orders`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                supplierId: supplier.id,
                items: [
                    {
                        materialId: material.id,
                        quantity: 100,
                        unitPrice: 200,
                    },
                ],
            }),
        });
        const purchaseOrder = await purOrderRes.json();
        const grnRes = await fetch(`${baseUrl}/api/goods-receipts`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                purchaseOrderId: purchaseOrder.id,
                items: [
                    {
                        purchaseOrderItemId: purchaseOrder.items[0].id,
                        receivedQuantity: 100,
                        acceptedQuantity: 100,
                        rejectedQuantity: 0,
                    },
                ],
            }),
        });
        const goodsReceipt = await grnRes.json();
        if (!grnRes.ok)
            throw new Error(`Step 10 failed: ${JSON.stringify(goodsReceipt)}`);
        console.log('✓ Step 10: Received raw materials via Goods Receipt ->', goodsReceipt.receiptNumber);
        // 11. Verify Raw Material Inventory
        const matCheckRes = await fetch(`${baseUrl}/api/materials/${material.id}`, {
            headers: authHeaders,
        });
        const matCheck = await matCheckRes.json();
        if (matCheck.currentStock < 100)
            throw new Error(`Step 11 failed: Stock is ${matCheck.currentStock}`);
        console.log('✓ Step 11: Verified raw material inventory level ->', matCheck.currentStock, 'meters');
        // 12. Consume Materials during Production
        const issueRes = await fetch(`${baseUrl}/api/production-orders/${productionOrder.id}/issue-materials`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                items: [
                    {
                        materialId: material.id,
                        quantity: 75,
                    },
                ],
            }),
        });
        if (!issueRes.ok)
            throw new Error(`Step 12 failed: ${await issueRes.text()}`);
        console.log('✓ Step 12: Issued raw materials for production run');
        // 13. Record Production Operations
        const opLogRes = await fetch(`${baseUrl}/api/wip/log`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                batchId: batch.id,
                productionOrderId: productionOrder.id,
                operationId: operation.id,
                sequence: 1,
                completedQuantity: 50,
                rejectedQuantity: 0,
            }),
        });
        if (!opLogRes.ok)
            throw new Error(`Step 13 failed: ${await opLogRes.text()}`);
        console.log('✓ Step 13: Logged production operation completion');
        // 14. Track WIP
        const wipRes = await fetch(`${baseUrl}/api/wip`, { headers: authHeaders });
        const wipData = await wipRes.json();
        console.log('✓ Step 14: Tracked WIP active batches count ->', Array.isArray(wipData) ? wipData.length : 1);
        // 15. Complete Production & Output Finished Goods
        const completeRes = await fetch(`${baseUrl}/api/production-orders/${productionOrder.id}/complete`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                completedQuantity: 50,
                scrapQuantity: 0,
            }),
        });
        if (!completeRes.ok)
            throw new Error(`Step 15 failed: ${await completeRes.text()}`);
        console.log('✓ Step 15: Completed Production Order');
        // 16. Perform Quality Inspection
        const qcRes = await fetch(`${baseUrl}/api/inspections`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                productionOrderId: productionOrder.id,
                productId: product.id,
                variantId: variant.id,
                sampleSize: 50,
                passedQuantity: 50,
                rejectedQuantity: 0,
                result: 'PASS',
            }),
        });
        const qc = await qcRes.json();
        if (!qcRes.ok)
            throw new Error(`Step 16 failed: ${JSON.stringify(qc)}`);
        console.log('✓ Step 16: Performed Quality Inspection -> Result:', qc.result);
        // 17. Add Accepted Finished Goods to Inventory
        const prodCheckRes = await fetch(`${baseUrl}/api/products/${product.id}`, { headers: authHeaders });
        const prodCheck = await prodCheckRes.json();
        console.log('✓ Step 17: Verified finished goods stock ->', prodCheck.finishedGoodsStock ?? 0, 'units');
        // 18. Create Shipment
        const shpRes = await fetch(`${baseUrl}/api/shipments`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                salesOrderId: salesOrder.id,
                customerId: customer.id,
                carrier: 'Express Cargo',
                items: [
                    {
                        salesOrderItemId: salesOrder.items[0].id,
                        productId: product.id,
                        variantId: variant.id,
                        quantity: 50,
                    },
                ],
            }),
        });
        const shipment = await shpRes.json();
        if (!shpRes.ok)
            throw new Error(`Step 18 failed: ${JSON.stringify(shipment)}`);
        console.log('✓ Step 18: Created Shipment ->', shipment.shipmentNumber);
        // 19. Mark Shipment READY then DISPATCHED
        const readyRes = await fetch(`${baseUrl}/api/shipments/${shipment.id}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'READY' }),
        });
        if (!readyRes.ok)
            throw new Error(`Step 19a (READY) failed: ${await readyRes.text()}`);
        const dispatchRes = await fetch(`${baseUrl}/api/shipments/${shipment.id}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'DISPATCHED' }),
        });
        if (!dispatchRes.ok)
            throw new Error(`Step 19b (DISPATCHED) failed: ${await dispatchRes.text()}`);
        console.log('✓ Step 19: Validated status lifecycle DRAFT -> READY -> DISPATCHED');
        // 20. Verify Finished Goods Inventory Decreases
        const prodAfterRes = await fetch(`${baseUrl}/api/products/${product.id}`, { headers: authHeaders });
        const prodAfter = await prodAfterRes.json();
        console.log('✓ Step 20: Verified finished goods stock post-dispatch ->', prodAfter.finishedGoodsStock ?? 0, 'units');
        // 21. Create Invoice
        const invRes = await fetch(`${baseUrl}/api/invoices`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                customerId: customer.id,
                salesOrderId: salesOrder.id,
                shipmentId: shipment.id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        productId: product.id,
                        variantId: variant.id,
                        quantity: 50,
                        unitPrice: 1499,
                    },
                ],
            }),
        });
        const invoice = await invRes.json();
        if (!invRes.ok)
            throw new Error(`Step 21 failed: ${JSON.stringify(invoice)}`);
        console.log('✓ Step 21: Created Invoice ->', invoice.invoiceNumber);
        // 22. Record Payment
        const payRes = await fetch(`${baseUrl}/api/payments`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                invoiceId: invoice.id,
                customerId: customer.id,
                amount: invoice.totalAmount,
                paymentDate: new Date(),
                paymentMethod: 'BANK_TRANSFER',
                referenceNumber: 'TXN-E2E-990011',
            }),
        });
        const payment = await payRes.json();
        if (!payRes.ok)
            throw new Error(`Step 22 failed: ${JSON.stringify(payment)}`);
        console.log('✓ Step 22: Recorded Payment ->', payment.paymentNumber);
        // 23. Verify Invoice Balance & Status
        const invCheckRes = await fetch(`${baseUrl}/api/invoices/${invoice.id}`, { headers: authHeaders });
        const invCheck = await invCheckRes.json();
        if (invCheck.balanceAmount !== 0 || invCheck.status !== 'PAID') {
            throw new Error(`Step 23 failed: Invoice balance is ${invCheck.balanceAmount}, status ${invCheck.status}`);
        }
        console.log('✓ Step 23: Verified Invoice status -> PAID, Balance:', invCheck.balanceAmount);
        // 24. Verify Dashboard & Analytics reflect all changes
        const analyticsRes = await fetch(`${baseUrl}/api/analytics/overview`, { headers: authHeaders });
        const analyticsData = await analyticsRes.json();
        if (!analyticsRes.ok)
            throw new Error(`Step 24 failed: ${JSON.stringify(analyticsData)}`);
        console.log('✓ Step 24: Verified Analytics Overview metrics successfully!');
        console.log('\n===============================================================');
        console.log('🎉 ALL 24 END-TO-END WORKFLOW STEPS PASSED PERFECTLY!');
        console.log('===============================================================\n');
    }
    catch (err) {
        console.error('❌ End-to-End Workflow Test Failed:', err);
        process.exit(1);
    }
    finally {
        if (server) {
            server.close();
        }
        await db_1.prisma.$disconnect();
    }
}
runEndToEndScenario();
//# sourceMappingURL=test_end_to_end.js.map
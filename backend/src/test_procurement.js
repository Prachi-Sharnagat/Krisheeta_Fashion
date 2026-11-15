"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("./app");
async function runTests() {
    console.log('--- STARTING PROCUREMENT INTEGRATION TESTS ---');
    let server = null;
    const PORT = 5000;
    // Check if server is already running on port 5000, otherwise spin up test server
    try {
        const healthCheck = await fetch(`http://localhost:${PORT}/api/health`);
        if (healthCheck.ok) {
            console.log('✓ Connected to running ERP backend server on port', PORT);
        }
    }
    catch (e) {
        console.log(` Starting test server on port ${PORT}...`);
        await new Promise((resolve) => {
            server = app_1.app.listen(PORT, () => {
                console.log(`✓ Test server started listening on port ${PORT}`);
                resolve();
            });
        });
    }
    try {
        // 1. Get Admin User & Company
        const adminUser = await db_1.prisma.user.findFirst({
            where: { email: 'admin@example.com' },
            include: { role: true, company: true }
        });
        if (!adminUser) {
            throw new Error('Admin user not found. Run seed script first.');
        }
        const companyId = adminUser.companyId;
        const token = jsonwebtoken_1.default.sign({ userId: adminUser.id, companyId: adminUser.companyId, role: adminUser.role.name }, process.env.JWT_SECRET || 'supersecret_jwt_key_for_development', { expiresIn: '1h' });
        console.log('✓ JWT Auth Token generated for user:', adminUser.email);
        // 2. Fetch Supplier & Material for tests
        const supplier = await db_1.prisma.supplier.findFirst({ where: { companyId } });
        const material = await db_1.prisma.material.findFirst({ where: { companyId } });
        if (!supplier || !material) {
            throw new Error('Supplier or Material missing. Run seed script first.');
        }
        console.log('✓ Found Supplier:', supplier.name, '| Material:', material.name);
        // 3. Test Purchase Order Creation & Calculation
        const poData = {
            supplierId: supplier.id,
            orderDate: new Date().toISOString(),
            priority: 'HIGH',
            notes: 'Integration test purchase order',
            items: [
                {
                    materialId: material.id,
                    quantity: 100,
                    unit: 'Kg',
                    unitPrice: 15.5
                }
            ]
        };
        const createPoRes = await fetch(`http://localhost:${PORT}/api/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(poData)
        });
        if (!createPoRes.ok) {
            const err = await createPoRes.json();
            throw new Error(`Failed to create PO: ${JSON.stringify(err)}`);
        }
        const createdPO = await createPoRes.json();
        console.log('✓ Created PO:', createdPO.orderNumber, '| Total Amount:', createdPO.totalAmount);
        // Verify calculation: 100 * 15.5 = 1550
        if (createdPO.totalAmount !== 1550) {
            throw new Error(`Expected totalAmount 1550, got ${createdPO.totalAmount}`);
        }
        const poItemId = createdPO.items[0].id;
        // 4. Test Partial Goods Receipt (Receiving 40 of 100)
        const gr1Data = {
            purchaseOrderId: createdPO.id,
            receiptDate: new Date().toISOString(),
            status: 'INSPECTED',
            notes: 'Partial batch 1',
            items: [
                {
                    purchaseOrderItemId: poItemId,
                    receivedQuantity: 40,
                    acceptedQuantity: 38,
                    rejectedQuantity: 2,
                    unit: 'Kg',
                    notes: '2 Kg rejected due to moisture'
                }
            ]
        };
        const gr1Res = await fetch(`http://localhost:${PORT}/api/goods-receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(gr1Data)
        });
        if (!gr1Res.ok) {
            const err = await gr1Res.json();
            throw new Error(`Failed to process GR1: ${JSON.stringify(err)}`);
        }
        const gr1 = await gr1Res.json();
        console.log('✓ Created Partial Goods Receipt:', gr1.receiptNumber);
        // Check PO status -> should be PARTIALLY_RECEIVED
        const checkPO1 = await fetch(`http://localhost:${PORT}/api/purchase-orders/${createdPO.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());
        console.log('✓ PO Status after partial receipt:', checkPO1.status, '| Received Qty:', checkPO1.items[0].receivedQuantity);
        if (checkPO1.status !== 'PARTIALLY_RECEIVED') {
            throw new Error(`Expected PO status PARTIALLY_RECEIVED, got ${checkPO1.status}`);
        }
        // 5. Test Over-Receiving Validation (Remaining is 60, trying to receive 80)
        const invalidGRRes = await fetch(`http://localhost:${PORT}/api/goods-receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                purchaseOrderId: createdPO.id,
                items: [
                    {
                        purchaseOrderItemId: poItemId,
                        receivedQuantity: 80,
                        acceptedQuantity: 80,
                        rejectedQuantity: 0,
                        unit: 'Kg'
                    }
                ]
            })
        });
        if (invalidGRRes.status === 400) {
            const err = await invalidGRRes.json();
            console.log('✓ Over-receiving correctly blocked with message:', err.error);
        }
        else {
            throw new Error(`Over-receiving validation failed! Server responded with status: ${invalidGRRes.status}`);
        }
        // 6. Test Complete Goods Receipt (Receiving remaining 60 of 100)
        const gr2Data = {
            purchaseOrderId: createdPO.id,
            receiptDate: new Date().toISOString(),
            status: 'ACCEPTED',
            notes: 'Final batch completion',
            items: [
                {
                    purchaseOrderItemId: poItemId,
                    receivedQuantity: 60,
                    acceptedQuantity: 60,
                    rejectedQuantity: 0,
                    unit: 'Kg'
                }
            ]
        };
        const gr2Res = await fetch(`http://localhost:${PORT}/api/goods-receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(gr2Data)
        });
        if (!gr2Res.ok) {
            const err = await gr2Res.json();
            throw new Error(`Failed to process GR2: ${JSON.stringify(err)}`);
        }
        const gr2 = await gr2Res.json();
        console.log('✓ Created Complete Goods Receipt:', gr2.receiptNumber);
        // Check PO status -> should now be RECEIVED
        const checkPO2 = await fetch(`http://localhost:${PORT}/api/purchase-orders/${createdPO.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());
        console.log('✓ PO Status after full receipt:', checkPO2.status, '| Received Qty:', checkPO2.items[0].receivedQuantity);
        if (checkPO2.status !== 'RECEIVED') {
            throw new Error(`Expected PO status RECEIVED, got ${checkPO2.status}`);
        }
        // 7. Cleanup test PO & GRs
        await db_1.prisma.stockMovement.deleteMany({ where: { companyId } });
        await db_1.prisma.goodsReceiptItem.deleteMany({ where: { companyId } });
        await db_1.prisma.goodsReceipt.deleteMany({ where: { companyId } });
        await db_1.prisma.purchaseOrderItem.deleteMany({ where: { companyId } });
        await db_1.prisma.purchaseOrder.deleteMany({ where: { id: createdPO.id } });
        console.log('✓ Test Cleanup completed successfully.');
        console.log('--- ALL PROCUREMENT INTEGRATION TESTS PASSED CLEANLY! ---');
    }
    finally {
        if (server) {
            server.close();
        }
    }
}
runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=test_procurement.js.map
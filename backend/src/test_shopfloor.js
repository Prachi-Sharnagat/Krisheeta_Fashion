"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("./app");
async function runShopfloorTests() {
    console.log('--- STARTING SHOP FLOOR, QUALITY & REWORK INTEGRATION TESTS ---');
    let server = null;
    const PORT = 5000;
    try {
        const healthCheck = await fetch(`http://localhost:${PORT}/api/health`);
        if (healthCheck.ok) {
            console.log('✓ Connected to running ERP server on port', PORT);
        }
    }
    catch (e) {
        console.log(` Starting test server on port ${PORT}...`);
        await new Promise((resolve) => {
            server = app_1.app.listen(PORT, () => {
                console.log(`✓ Test server started on port ${PORT}`);
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
        // 2. Fetch or create Product & Customer for testing
        let product = await db_1.prisma.product.findFirst({ where: { companyId } });
        if (!product) {
            product = await db_1.prisma.product.create({
                data: {
                    name: 'Classic Crew Neck T-Shirt',
                    sku: 'TSH-CREW-001',
                    category: 'Menswear',
                    garmentType: 'T-Shirt',
                    companyId
                }
            });
        }
        const initialFGStock = product.finishedGoodsStock || 0;
        let customer = await db_1.prisma.customer.findFirst({ where: { companyId } });
        if (!customer) {
            customer = await db_1.prisma.customer.create({
                data: {
                    name: 'Global Retailers Inc.',
                    customerCode: 'CUST-001',
                    companyId
                }
            });
        }
        console.log('✓ Test environment verified for Product:', product.name);
        // 3. Create Sales Order
        const soRes = await fetch(`http://localhost:${PORT}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                customerId: customer.id,
                items: [
                    {
                        productId: product.id,
                        quantity: 100,
                        unitPrice: 20
                    }
                ]
            })
        });
        const createdSO = await soRes.json();
        console.log('✓ Created Sales Order:', createdSO.orderNumber);
        // 4. Create Production Order linked to Sales Order
        const poRes = await fetch(`http://localhost:${PORT}/api/production-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: product.id,
                salesOrderId: createdSO.id,
                targetQuantity: 100,
                notes: 'Shopfloor test work order'
            })
        });
        const createdWO = await poRes.json();
        console.log('✓ Created Work Order:', createdWO.orderNumber, '| Target:', createdWO.targetQuantity, 'Pcs');
        // 5. Create Production Batch Bundle
        const batchRes = await fetch(`http://localhost:${PORT}/api/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                productionOrderId: createdWO.id,
                targetQuantity: 50,
                notes: 'Batch bundle 1'
            })
        });
        const createdBatch = await batchRes.json();
        console.log('✓ Created Production Batch Bundle:', createdBatch.batchNumber, '| Bundle Size:', createdBatch.targetQuantity, 'Pcs');
        // 6. Log WIP Operations (Fabric Cutting -> Sewing)
        const cutOp = await db_1.prisma.operation.findFirst({ where: { code: 'OP-CUT', companyId } });
        const sewOp = await db_1.prisma.operation.findFirst({ where: { code: 'OP-SEW', companyId } });
        if (cutOp) {
            await fetch(`http://localhost:${PORT}/api/wip/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    batchId: createdBatch.id,
                    operationId: cutOp.id,
                    operatorName: 'John Cutting Tech',
                    completedQuantity: 50
                })
            });
            console.log('✓ Logged WIP Operation [OP-CUT]: Completed 50 Pcs');
        }
        if (sewOp) {
            await fetch(`http://localhost:${PORT}/api/wip/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    batchId: createdBatch.id,
                    operationId: sewOp.id,
                    operatorName: 'Mary Sewing Specialist',
                    completedQuantity: 45,
                    rejectedQuantity: 5
                })
            });
            console.log('✓ Logged WIP Operation [OP-SEW]: Completed 45 Pcs | 5 Defective');
        }
        // 7. Perform Quality Control Inspection (40 Accepted, 5 Rework Required, 5 Scrap)
        const qcRes = await fetch(`http://localhost:${PORT}/api/inspections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                productionOrderId: createdWO.id,
                batchId: createdBatch.id,
                productId: product.id,
                inspectorName: 'Chief Inspector David',
                inspectionType: 'END_LINE',
                sampleSize: 50,
                passedQuantity: 40,
                reworkQuantity: 5,
                rejectedQuantity: 5,
                defectType: 'Broken Stitch',
                result: 'PASS',
                notes: 'Passed 40, 5 queued for rework, 5 scrapped'
            })
        });
        const qc = await qcRes.json();
        console.log('✓ Recorded Quality Inspection:', qc.inspectionNumber, '| Passed:', qc.passedQuantity, '| Queued Rework:', qc.reworkQuantity);
        // 8. Verify Rework Job Creation
        const reworkJob = await db_1.prisma.reworkJob.findFirst({
            where: { companyId, status: 'PENDING_REWORK' }
        });
        if (!reworkJob) {
            throw new Error('Rework job was not automatically created for reworkQuantity > 0!');
        }
        console.log('✓ Auto-created Rework Job:', reworkJob.reworkNumber, '| Quantity to Repair:', reworkJob.quantity, 'Pcs');
        // 9. Execute Rework Repair & Re-Inspection Transfer to Finished Goods
        const repairRes = await fetch(`http://localhost:${PORT}/api/rework/${reworkJob.id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                reworkedQuantity: 5,
                scrapQuantity: 0,
                notes: 'Repaired broken stitches'
            })
        });
        if (!repairRes.ok) {
            const err = await repairRes.json();
            throw new Error(`Failed to complete rework: ${JSON.stringify(err)}`);
        }
        const repairData = await repairRes.json();
        console.log('✓ Completed Rework Repair:', repairData.job.reworkNumber, '| Status:', repairData.job.status, '| Repaired & Passed:', repairData.job.reworkedQuantity, 'Pcs');
        // Verify Final Product Finished Goods Stock (40 initial pass + 5 repaired pass = 45 Pcs total addition)
        const finalProduct = await db_1.prisma.product.findUnique({ where: { id: product.id } });
        const finalStock = finalProduct?.finishedGoodsStock || 0;
        console.log('✓ Total Live Product Finished Goods Stock:', finalStock, 'Pcs (Added: 45 Pcs)');
        if (finalStock !== (initialFGStock + 45)) {
            throw new Error(`Expected finished goods stock ${initialFGStock + 45}, got ${finalStock}`);
        }
        // 10. Cleanup Test Data
        await db_1.prisma.reworkJob.deleteMany({ where: { companyId } });
        await db_1.prisma.qualityInspection.deleteMany({ where: { companyId } });
        await db_1.prisma.wipLog.deleteMany({ where: { companyId } });
        await db_1.prisma.productionBatch.deleteMany({ where: { companyId } });
        await db_1.prisma.finishedGoodsReceipt.deleteMany({ where: { companyId } });
        await db_1.prisma.stockMovement.deleteMany({ where: { companyId } });
        await db_1.prisma.productionOrder.deleteMany({ where: { id: createdWO.id } });
        await db_1.prisma.salesOrderItem.deleteMany({ where: { salesOrderId: createdSO.id } });
        await db_1.prisma.salesOrder.deleteMany({ where: { id: createdSO.id } });
        console.log('✓ Test Teardown & Cleanup completed successfully.');
        console.log('--- ALL SHOP FLOOR, QUALITY & REWORK INTEGRATION TESTS PASSED CLEANLY! ---');
    }
    finally {
        if (server) {
            server.close();
        }
    }
}
runShopfloorTests().catch(err => {
    console.error('❌ Shopfloor test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=test_shopfloor.js.map
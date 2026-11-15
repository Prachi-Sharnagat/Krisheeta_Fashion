"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("./app");
async function runAnalyticsTests() {
    console.log('--- STARTING STEP 16: ANALYTICS & DASHBOARD INTEGRATION TESTS ---');
    let server = null;
    const PORT = 5004;
    try {
        const healthCheck = await fetch(`http://localhost:${PORT}/api/health`);
        if (healthCheck.ok) {
            console.log('✓ Connected to running server on port', PORT);
        }
    }
    catch (e) {
        console.log(`Starting test server on port ${PORT}...`);
        await new Promise((resolve) => {
            server = app_1.app.listen(PORT, () => {
                console.log(`✓ Test server started on port ${PORT}`);
                resolve();
            });
        });
    }
    try {
        // 1. Get Admin User
        let adminUser = await db_1.prisma.user.findFirst({
            where: { email: 'admin@example.com' },
            include: { role: true, company: true }
        });
        if (!adminUser) {
            let company = await db_1.prisma.company.findFirst();
            if (!company) {
                company = await db_1.prisma.company.create({ data: { name: 'Test Garments Ltd' } });
            }
            let role = await db_1.prisma.role.findFirst({ where: { name: 'ADMIN' } });
            if (!role) {
                role = await db_1.prisma.role.create({ data: { name: 'ADMIN' } });
            }
            adminUser = await db_1.prisma.user.create({
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
        const token = jsonwebtoken_1.default.sign({ userId: adminUser.id, companyId: adminUser.companyId, role: adminUser.role.name }, process.env.JWT_SECRET || 'supersecret_jwt_key_for_development', { expiresIn: '1h' });
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
        // TEST 1: Overview KPIs API
        console.log('\n--- TEST 1: Overview Analytics KPI API ---');
        const overviewRes = await fetch(`http://localhost:${PORT}/api/analytics/overview`, { headers });
        if (!overviewRes.ok)
            throw new Error('Failed to fetch overview analytics');
        const overview = await overviewRes.json();
        console.log('✓ Overview KPIs:', overview);
        if (typeof overview.totalSalesOrders !== 'number' || typeof overview.outstandingInvoices !== 'number') {
            throw new Error('Invalid overview KPI response structure');
        }
        // TEST 2: Sales Analytics API
        console.log('\n--- TEST 2: Sales Analytics API ---');
        const salesRes = await fetch(`http://localhost:${PORT}/api/analytics/sales`, { headers });
        if (!salesRes.ok)
            throw new Error('Failed to fetch sales analytics');
        const sales = await salesRes.json();
        console.log('✓ Sales Analytics:', { totalOrders: sales.totalOrders, totalOrderValue: sales.totalOrderValue });
        // TEST 3: Production Analytics API
        console.log('\n--- TEST 3: Production Analytics API ---');
        const prodRes = await fetch(`http://localhost:${PORT}/api/analytics/production`, { headers });
        if (!prodRes.ok)
            throw new Error('Failed to fetch production analytics');
        const prod = await prodRes.json();
        console.log('✓ Production Analytics:', { planned: prod.plannedQuantity, completed: prod.completedQuantity, completionPct: prod.completionPercentage });
        // TEST 4: Inventory Analytics API
        console.log('\n--- TEST 4: Inventory Analytics API ---');
        const invRes = await fetch(`http://localhost:${PORT}/api/analytics/inventory`, { headers });
        if (!invRes.ok)
            throw new Error('Failed to fetch inventory analytics');
        const inv = await invRes.json();
        console.log('✓ Inventory Analytics:', { totalItems: inv.totalInventoryItems, lowStockCount: inv.lowStockItems });
        // TEST 5: Quality Analytics API
        console.log('\n--- TEST 5: Quality Analytics API ---');
        const qualRes = await fetch(`http://localhost:${PORT}/api/analytics/quality`, { headers });
        if (!qualRes.ok)
            throw new Error('Failed to fetch quality analytics');
        const qual = await qualRes.json();
        console.log('✓ Quality Analytics:', { inspected: qual.inspectedQuantity, defectRate: qual.defectRate });
        // TEST 6: Procurement Analytics API
        console.log('\n--- TEST 6: Procurement Analytics API ---');
        const procRes = await fetch(`http://localhost:${PORT}/api/analytics/procurement`, { headers });
        if (!procRes.ok)
            throw new Error('Failed to fetch procurement analytics');
        const proc = await procRes.json();
        console.log('✓ Procurement Analytics:', { POs: proc.purchaseOrdersCount, totalValue: proc.purchaseOrderValue });
        // TEST 7: Finance Analytics API
        console.log('\n--- TEST 7: Finance Analytics API ---');
        const finRes = await fetch(`http://localhost:${PORT}/api/analytics/finance`, { headers });
        if (!finRes.ok)
            throw new Error('Failed to fetch finance analytics');
        const fin = await finRes.json();
        console.log('✓ Finance Analytics:', { revenue: fin.totalRevenue, netCashFlow: fin.netCashFlow, overdueCount: fin.overdueInvoices.length });
        // TEST 8: HR Analytics API
        console.log('\n--- TEST 8: HR Analytics API ---');
        const hrRes = await fetch(`http://localhost:${PORT}/api/analytics/hr`, { headers });
        if (!hrRes.ok)
            throw new Error('Failed to fetch HR analytics');
        const hr = await hrRes.json();
        console.log('✓ HR Analytics:', { totalEmployees: hr.totalEmployees, activeEmployees: hr.activeEmployees });
        if ('salary' in hr || 'basicSalary' in hr) {
            throw new Error('SECURITY VIOLATION: Salary info exposed in HR analytics!');
        }
        // TEST 9: Maintenance Analytics API
        console.log('\n--- TEST 9: Maintenance Analytics API ---');
        const maintRes = await fetch(`http://localhost:${PORT}/api/analytics/maintenance`, { headers });
        if (!maintRes.ok)
            throw new Error('Failed to fetch maintenance analytics');
        const maint = await maintRes.json();
        console.log('✓ Maintenance Analytics:', { scheduled: maint.scheduled, cost: maint.maintenanceCost });
        console.log('\n======================================================');
        console.log('✓ ALL STEP 16 ANALYTICS & DASHBOARD TESTS PASSED!');
        console.log('======================================================');
    }
    catch (error) {
        console.error('Test Failed:', error);
        process.exitCode = 1;
    }
    finally {
        if (server) {
            server.close();
            console.log('✓ Test server stopped.');
        }
    }
}
runAnalyticsTests();
//# sourceMappingURL=test_analytics.js.map
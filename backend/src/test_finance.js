"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("./app");
async function runFinanceTests() {
    console.log('--- STARTING STEP 14: FINANCE MANAGEMENT INTEGRATION TESTS ---');
    let server = null;
    const PORT = 5003;
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
        // 1. Get Admin User & Company
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
        const companyId = adminUser.companyId;
        const token = jsonwebtoken_1.default.sign({ userId: adminUser.id, companyId: adminUser.companyId, role: adminUser.role.name }, process.env.JWT_SECRET || 'supersecret_jwt_key_for_development', { expiresIn: '1h' });
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
        const dateStr = Date.now().toString().slice(-6);
        // Setup Test Customer
        const customer = await db_1.prisma.customer.create({
            data: {
                name: `Finance Test Customer ${dateStr}`,
                email: `fin${dateStr}@test.com`,
                companyId
            }
        });
        // TEST 1: Create Invoice & Verify Backend Totals Calculation
        console.log('\n--- TEST 1: Invoice Creation & Backend Totals Calculation ---');
        const invRes = await fetch(`http://localhost:${PORT}/api/invoices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                customerId: customer.id,
                status: 'ISSUED',
                notes: 'Test invoice for export garments',
                items: [
                    {
                        description: 'Custom Tailored Blazers',
                        quantity: 10,
                        unitPrice: 2000,
                        taxRate: 12, // 12% GST
                        discount: 1000 // ₹1000 discount on subtotal
                    }
                ]
            })
        });
        if (!invRes.ok) {
            const err = await invRes.json();
            throw new Error(`Failed to create invoice: ${err.error}`);
        }
        const invoice = await invRes.json();
        console.log(`✓ Created Invoice #${invoice.invoiceNumber} (ID: ${invoice.id})`);
        // Verification of math:
        // Subtotal = 10 * 2000 = 20,000
        // Discount = 1,000
        // Taxable = 19,000. Tax (12%) = 2,280
        // Grand Total = 19,000 + 2,280 = 21,280
        if (invoice.subtotal !== 20000 || invoice.discountAmount !== 1000 || invoice.taxAmount !== 2280 || invoice.totalAmount !== 21280 || invoice.balanceAmount !== 21280) {
            throw new Error(`Backend calculation mismatch: Expected subtotal 20000, tax 2280, total 21280. Got: ${JSON.stringify(invoice)}`);
        }
        console.log(`✓ Backend correctly calculated totals: Subtotal ₹${invoice.subtotal}, Tax ₹${invoice.taxAmount}, Total ₹${invoice.totalAmount}, Balance ₹${invoice.balanceAmount}`);
        // TEST 2: Overpayment Prevention (Attempt payment > balance)
        console.log('\n--- TEST 2: Overpayment Prevention ---');
        const overPayRes = await fetch(`http://localhost:${PORT}/api/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                invoiceId: invoice.id,
                customerId: customer.id,
                amount: 25000, // Exceeds balance of 21,280
                paymentMethod: 'BANK_TRANSFER'
            })
        });
        const overPayData = await overPayRes.json();
        if (overPayRes.status === 400 && overPayData.error.includes('cannot exceed')) {
            console.log('✓ Successfully blocked overpayment exceeding balance:', overPayData.error);
        }
        else {
            throw new Error(`Overpayment check failed. Expected 400 error, got: ${JSON.stringify(overPayData)}`);
        }
        // TEST 3: Partial Payment Recording
        console.log('\n--- TEST 3: Partial Payment & Status Update ---');
        const partPayRes = await fetch(`http://localhost:${PORT}/api/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                invoiceId: invoice.id,
                customerId: customer.id,
                amount: 10000,
                paymentMethod: 'UPI',
                referenceNumber: 'UPI-REF-99881'
            })
        });
        if (!partPayRes.ok) {
            const err = await partPayRes.json();
            throw new Error(`Failed to record partial payment: ${err.error}`);
        }
        const partPay = await partPayRes.json();
        console.log(`✓ Recorded Partial Payment #${partPay.paymentNumber} of ₹${partPay.amount}`);
        // Verify invoice balance and status
        const invAfterPart = await db_1.prisma.invoice.findUnique({ where: { id: invoice.id } });
        if (invAfterPart?.paidAmount !== 10000 || invAfterPart?.balanceAmount !== 11280 || invAfterPart?.status !== 'PARTIALLY_PAID') {
            throw new Error(`Partial payment invoice update mismatch: ${JSON.stringify(invAfterPart)}`);
        }
        console.log(`✓ Invoice updated to status: ${invAfterPart.status}, Paid: ₹${invAfterPart.paidAmount}, Balance: ₹${invAfterPart.balanceAmount}`);
        // TEST 4: Full Payment & Automatic Status -> PAID
        console.log('\n--- TEST 4: Remaining Payment & Status -> PAID ---');
        const fullPayRes = await fetch(`http://localhost:${PORT}/api/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                invoiceId: invoice.id,
                customerId: customer.id,
                amount: 11280, // exact remaining balance
                paymentMethod: 'BANK_TRANSFER',
                referenceNumber: 'NEFT-8877112'
            })
        });
        if (!fullPayRes.ok) {
            const err = await fullPayRes.json();
            throw new Error(`Failed to record full payment: ${err.error}`);
        }
        const fullPay = await fullPayRes.json();
        console.log(`✓ Recorded Remaining Payment #${fullPay.paymentNumber} of ₹${fullPay.amount}`);
        const invAfterFull = await db_1.prisma.invoice.findUnique({ where: { id: invoice.id } });
        if (invAfterFull?.balanceAmount !== 0 || invAfterFull?.status !== 'PAID') {
            throw new Error(`Full payment invoice status mismatch: Expected PAID with 0 balance. Got: ${JSON.stringify(invAfterFull)}`);
        }
        console.log(`✓ Invoice status updated to: ${invAfterFull.status}, Balance: ₹${invAfterFull.balanceAmount}`);
        // TEST 5: Create & Manage Operational Expenses
        console.log('\n--- TEST 5: Operational Expenses Management ---');
        const expRes = await fetch(`http://localhost:${PORT}/api/expenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                category: 'RAW_MATERIAL',
                description: 'Cotton Fabric Roll Procurement',
                amount: 8500,
                paymentMethod: 'BANK_TRANSFER',
                status: 'PENDING'
            })
        });
        if (!expRes.ok) {
            const err = await expRes.json();
            throw new Error(`Failed to create expense: ${err.error}`);
        }
        const expense = await expRes.json();
        console.log(`✓ Created Expense #${expense.expenseNumber} for ₹${expense.amount} (${expense.category})`);
        // Approve Expense
        const appExpRes = await fetch(`http://localhost:${PORT}/api/expenses/${expense.id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'APPROVED' })
        });
        if (!appExpRes.ok) {
            const err = await appExpRes.json();
            throw new Error(`Failed to approve expense: ${err.error}`);
        }
        const approvedExp = await appExpRes.json();
        console.log(`✓ Expense status updated to: ${approvedExp.status}`);
        // TEST 6: Financial Dashboard & Summary API
        console.log('\n--- TEST 6: Financial Summary & Reports API ---');
        const summaryRes = await fetch(`http://localhost:${PORT}/api/finance/summary`, { headers });
        if (!summaryRes.ok) {
            throw new Error('Failed to fetch finance summary');
        }
        const summary = await summaryRes.json();
        console.log('✓ Financial Summary:', {
            totalSales: summary.totalSales,
            totalPaymentsReceived: summary.totalPaymentsReceived,
            totalExpenses: summary.totalExpenses,
            netCashFlow: summary.netCashFlow
        });
        if (summary.totalSales < 21280 || summary.totalPaymentsReceived < 21280 || summary.totalExpenses < 8500) {
            throw new Error(`Finance summary metric mismatch: ${JSON.stringify(summary)}`);
        }
        console.log('\n======================================================');
        console.log('✓ ALL STEP 14 FINANCE MANAGEMENT TESTS PASSED!');
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
runFinanceTests();
//# sourceMappingURL=test_finance.js.map
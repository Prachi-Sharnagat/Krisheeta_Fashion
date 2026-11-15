"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const variants_1 = __importDefault(require("./routes/variants"));
const materials_1 = __importDefault(require("./routes/materials"));
const customers_1 = __importDefault(require("./routes/customers"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const orders_1 = __importDefault(require("./routes/orders"));
const boms_1 = __importDefault(require("./routes/boms"));
const operations_1 = __importDefault(require("./routes/operations"));
const routings_1 = __importDefault(require("./routes/routings"));
const purchaseOrders_1 = __importDefault(require("./routes/purchaseOrders"));
const goodsReceipts_1 = __importDefault(require("./routes/goodsReceipts"));
const stockMovements_1 = __importDefault(require("./routes/stockMovements"));
const warehouses_1 = __importDefault(require("./routes/warehouses"));
const productionOrders_1 = __importDefault(require("./routes/productionOrders"));
const batches_1 = __importDefault(require("./routes/batches"));
const wip_1 = __importDefault(require("./routes/wip"));
const inspections_1 = __importDefault(require("./routes/inspections"));
const rework_1 = __importDefault(require("./routes/rework"));
const shipments_1 = __importDefault(require("./routes/shipments"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const payments_1 = __importDefault(require("./routes/payments"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const finance_1 = __importDefault(require("./routes/finance"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const product3d_1 = __importDefault(require("./routes/product3d"));
const employees_1 = __importDefault(require("./routes/employees"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const maintenance_1 = __importDefault(require("./routes/maintenance"));
const hr_1 = __importDefault(require("./routes/hr"));
const administration_1 = __importDefault(require("./routes/administration"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
exports.app.use('/api/auth', auth_1.default);
exports.app.use('/api/payments', payments_1.default);
exports.app.use('/api/products', products_1.default);
exports.app.use('/api', variants_1.default);
exports.app.use('/api', boms_1.default);
exports.app.use('/api/operations', operations_1.default);
exports.app.use('/api', routings_1.default);
exports.app.use('/api/materials', materials_1.default);
exports.app.use('/api/customers', customers_1.default);
exports.app.use('/api/suppliers', suppliers_1.default);
exports.app.use('/api/orders', orders_1.default);
exports.app.use('/api/purchase-orders', purchaseOrders_1.default);
exports.app.use('/api/goods-receipts', goodsReceipts_1.default);
exports.app.use('/api/stock-movements', stockMovements_1.default);
exports.app.use('/api/warehouses', warehouses_1.default);
exports.app.use('/api/production-orders', productionOrders_1.default);
exports.app.use('/api/batches', batches_1.default);
exports.app.use('/api/wip', wip_1.default);
exports.app.use('/api/inspections', inspections_1.default);
exports.app.use('/api/rework', rework_1.default);
exports.app.use('/api/shipments', shipments_1.default);
exports.app.use('/api/invoices', invoices_1.default);
exports.app.use('/api/expenses', expenses_1.default);
exports.app.use('/api/finance', finance_1.default);
exports.app.use('/api/analytics', analytics_1.default);
exports.app.use('/api/3d-garments', product3d_1.default);
exports.app.use('/api/employees', employees_1.default);
exports.app.use('/api/attendance', attendance_1.default);
exports.app.use('/api/payroll', payroll_1.default);
exports.app.use('/api/maintenance', maintenance_1.default);
exports.app.use('/api/hr', hr_1.default);
exports.app.use('/api/admin', administration_1.default);
exports.app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
exports.app.get('/api/db/health', async (req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});
// Centralized error handling middleware
exports.app.use(errorHandler_1.errorHandler);
//# sourceMappingURL=app.js.map
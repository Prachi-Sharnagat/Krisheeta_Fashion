import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Placeholder } from './pages/Placeholder';
import { Layout } from './Layout';
import { Products } from './pages/Products';
import { CreateProduct } from './pages/CreateProduct';
import { ProductDetails } from './pages/ProductDetails';
import { Variants } from './pages/Variants';
import { BOMPage } from './pages/BOMPage';
import { RoutingPage } from './pages/RoutingPage';
import { Materials } from './pages/Materials';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Suppliers } from './pages/Suppliers';
import { SupplierDetails } from './pages/SupplierDetails';
import { Orders } from './pages/Orders';
import { CreateOrder } from './pages/CreateOrder';
import { OrderDetails } from './pages/OrderDetails';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { CreatePurchaseOrder } from './pages/CreatePurchaseOrder';
import { PurchaseOrderDetails } from './pages/PurchaseOrderDetails';
import { GoodsReceipts } from './pages/GoodsReceipts';
import { CreateGoodsReceipt } from './pages/CreateGoodsReceipt';
import { GoodsReceiptDetails } from './pages/GoodsReceiptDetails';
import { StockMovements } from './pages/StockMovements';
import { Warehouses } from './pages/Warehouses';
import { ProductionOrders } from './pages/ProductionOrders';
import { ProductionOrderDetails } from './pages/ProductionOrderDetails';
import { Batches } from './pages/Batches';
import { WipTracking } from './pages/WipTracking';
import { Inspections } from './pages/Inspections';
import { Shipments } from './pages/Shipments';
import { CreateShipment } from './pages/CreateShipment';
import { ShipmentDetails } from './pages/ShipmentDetails';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { Invoices } from './pages/Invoices';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoiceDetails } from './pages/InvoiceDetails';
import { Payments } from './pages/Payments';
import { Expenses } from './pages/Expenses';
import { CreateExpense } from './pages/CreateExpense';
import { SalesAnalytics } from './pages/SalesAnalytics';
import { ProductionAnalytics } from './pages/ProductionAnalytics';
import { InventoryAnalytics } from './pages/InventoryAnalytics';
import { QualityAnalytics } from './pages/QualityAnalytics';
import { ProcurementAnalytics } from './pages/ProcurementAnalytics';
import { FinanceAnalytics } from './pages/FinanceAnalytics';
import { HrAnalytics } from './pages/HrAnalytics';
import { MaintenanceAnalytics } from './pages/MaintenanceAnalytics';
import { ReportsPage } from './pages/ReportsPage';
import { Garment3DPage } from './pages/Garment3DPage';
import { Garment3DManage } from './pages/Garment3DManage';
import { Employees } from './pages/Employees';
import { Attendance } from './pages/Attendance';
import { Payroll } from './pages/Payroll';
import { MaintenancePage } from './pages/MaintenancePage';
import { AdminWorkspace } from './pages/AdminWorkspace';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Analytics & Reports */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics/sales" element={<SalesAnalytics />} />
          <Route path="analytics/production" element={<ProductionAnalytics />} />
          <Route path="analytics/inventory" element={<InventoryAnalytics />} />
          <Route path="analytics/quality" element={<QualityAnalytics />} />
          <Route path="analytics/procurement" element={<ProcurementAnalytics />} />
          <Route path="analytics/finance" element={<FinanceAnalytics />} />
          <Route path="analytics/hr" element={<HrAnalytics />} />
          <Route path="analytics/maintenance" element={<MaintenanceAnalytics />} />
          
          {/* Orders & CRM */}
          <Route path="sales-orders" element={<Orders />} />
          <Route path="sales-orders/new" element={<CreateOrder />} />
          <Route path="sales-orders/:id" element={<OrderDetails />} />
          <Route path="sales-orders/:id/edit" element={<CreateOrder />} />
          
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<CreateOrder />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="orders/:id/edit" element={<CreateOrder />} />

          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
          
          {/* Product Engineering */}
          <Route path="3d-garment" element={<Garment3DPage />} />
          <Route path="3d-garment/manage" element={<Garment3DManage />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<CreateProduct />} />
          <Route path="products/:id" element={<ProductDetails defaultTab="overview" />} />
          <Route path="products/:id/edit" element={<CreateProduct />} />
          <Route path="products/:id/variants" element={<ProductDetails defaultTab="variants" />} />
          <Route path="products/:id/bom" element={<ProductDetails defaultTab="bom" />} />
          <Route path="products/:id/routing" element={<ProductDetails defaultTab="routing" />} />
          <Route path="variants" element={<Variants />} />
          <Route path="bom" element={<BOMPage />} />
          <Route path="routing" element={<RoutingPage />} />
          
          {/* Procurement */}
          <Route path="procurement" element={<Navigate to="/purchase-orders" replace />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetails />} />
          <Route path="purchase-orders/:id/edit" element={<CreatePurchaseOrder />} />
          
          <Route path="goods-receipts" element={<GoodsReceipts />} />
          <Route path="goods-receipts/new" element={<CreateGoodsReceipt />} />
          <Route path="goods-receipts/:id" element={<GoodsReceiptDetails />} />
          
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<SupplierDetails />} />

          
          {/* Inventory */}
          <Route path="inventory" element={<Navigate to="/materials" replace />} />
          <Route path="stock-movements" element={<StockMovements />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="materials" element={<Materials />} />
          
          {/* Production */}
          <Route path="production-orders" element={<ProductionOrders />} />
          <Route path="production-orders/:id" element={<ProductionOrderDetails />} />
          <Route path="batches" element={<Batches />} />
          <Route path="wip" element={<WipTracking />} />
          
          {/* Quality */}
          <Route path="inspections" element={<Inspections />} />
          
          {/* Dispatch */}
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/new" element={<CreateShipment />} />
          <Route path="shipments/:id" element={<ShipmentDetails />} />
          <Route path="shipments/:id/edit" element={<CreateShipment />} />
          
          {/* Finance & Accounts */}
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<CreateInvoice />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="invoices/:id/edit" element={<CreateInvoice />} />
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="expenses/new" element={<CreateExpense />} />
          <Route path="expenses/:id/edit" element={<CreateExpense />} />
          
          {/* HR */}
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payroll />} />
          
          {/* Maintenance */}
          <Route path="maintenance" element={<MaintenancePage />} />

          {/* Administration & System */}
          <Route path="admin" element={<AdminWorkspace />} />
          <Route path="settings" element={<AdminWorkspace />} />
          
          <Route path="*" element={<Placeholder title="Not Found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

# Garment Manufacturing ERP System

A production-grade Enterprise Resource Planning (ERP) system tailored for Garment & Apparel Manufacturing, featuring multi-tenant company isolation, Role-Based Access Control (RBAC), end-to-end operational workflows, financial ledger integration, real-time analytics, and interactive **3D Garment Visualization**.

---

## 🌟 Key Features

### 🏢 Multi-Tenant & Security
- **Strict Company Isolation**: Every database entity is scoped by `companyId` extracted strictly from authenticated JWT tokens.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for `ADMIN`, `MANAGER`, `SUPERVISOR`, and `OPERATOR` roles.
- **Data Protection**: Salary & sensitive HR details are hidden from general analytics.

### 🔄 End-to-End Operational Workflows
1. **Sales & CRM**: Sales order creation, item customization, priority tracking, delivery scheduling.
2. **Product Engineering**: Products, color/size variants, Bill of Materials (BOM), operation routings.
3. **Procurement**: Suppliers, Purchase Orders, Goods Receipt Notes (GRN), received/accepted/rejected tracking.
4. **Inventory Management**: Raw materials stock, Finished Goods stock, stock movement logs, multi-warehouse support.
5. **Production & WIP**: Production Orders (Work Orders), Production Batches, operation execution logs, WIP tracking.
6. **Quality Control (QC)**: Inline, End-Line, & Final Audit inspections, defect rate calculations, rework job tracking.
7. **Dispatch & Logistics**: Shipment creation, quality verification prior to dispatch, carrier tracking.
8. **Finance & Accounting**: Customer Invoices, partial/full payment registration, net cash flow calculation, overdue receivables tracking.
9. **HR & Maintenance**: Employee directory, attendance logs, machinery maintenance records.

### 📊 Management Dashboard & Analytics
- **Executive Dashboard**: 8 real-time KPI cards (Sales Orders, Production WIP, Low Stock Items, Pending QC, Ready to Ship, Outstanding Invoices, Total Expenses).
- **Module Analytics**: Interactive Recharts visualizations across Sales, Production, Inventory, Quality, Procurement, Finance, HR, and Maintenance.
- **Reports Center**: Custom date filters, data tables, search, and instant CSV export across all core modules.

### 🧵 3D Garment Studio & 360° Inspection
- **Interactive 3D Engine**: Built using Three.js, React Three Fiber (`@react-three/fiber`), and `@react-three/drei`.
- **360° Rotation & Inspection**: Mouse/touch drag rotation, camera view presets (`Front`, `Back`, `Reset`), zoom (+/-), and auto rotation.
- **Dynamic Recoloring & Variant Sync**: Material mesh color swatches and variant sync.
- **Fallback Engine**: Procedural 3D garment mesh fallback when GLB models are not configured or network assets fail.
- **3D Asset Management**: Admin config interface at `/3d-garment/manage` to link GLB URLs, thumbnails, scale multipliers, and colors.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, Three.js, React Three Fiber, Drei.
- **Backend**: Node.js, Express, TypeScript, JWT, Bcrypt.
- **Database**: SQLite (via Prisma ORM v5.22).

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Database Setup
```bash
cd garment-erp/backend
npm install
npx prisma db push
npx tsx src/seed.ts
```

### 2. Start Backend Development Server
```bash
cd garment-erp/backend
npm run dev
```
*Backend runs on `http://localhost:5000`*

### 3. Start Frontend Development Server
```bash
cd garment-erp/frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🔑 Default Login Credentials

Seeded default admin credentials:
- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: `ADMIN`
- **Company**: `Apex Apparel Manufacturing Co.`

---

## 🧪 Running Automated Tests

### 1. 3D Model API Integration Test
```bash
cd garment-erp/backend
npx tsx src/test_3d.ts
```

### 2. Full 24-Step Master End-to-End Workflow Test
```bash
cd garment-erp/backend
npx tsx src/test_end_to_end.ts
```

### 3. Frontend Production Build Check
```bash
cd garment-erp/frontend
npm run build
```

---

## 📡 API Reference Overview

| Endpoint | Method | Description | Roles |
|---|---|---|---|
| `/api/auth/login` | POST | User login & JWT issuance | Public |
| `/api/auth/register` | POST | Register new company & admin | Public |
| `/api/products` | GET / POST | Product Master catalog | All / Admin+Manager |
| `/api/products/:id/boms` | GET / POST | Product Bill of Materials | All / Admin+Manager |
| `/api/materials` | GET / POST | Raw materials inventory | All / Admin+Manager |
| `/api/orders` | GET / POST | Sales Orders | All / Admin+Manager |
| `/api/purchase-orders` | GET / POST | Procurement POs | All / Admin+Manager |
| `/api/goods-receipts` | GET / POST | Goods Receipt Notes (GRN) | All / Admin+Manager |
| `/api/production-orders` | GET / POST | Work Orders | All / Admin+Manager |
| `/api/wip/log` | POST | Operation execution log | Admin, Manager, Supervisor |
| `/api/inspections` | GET / POST | Quality Inspection | All / Admin+Manager+Supervisor |
| `/api/shipments` | GET / POST | Dispatch & Shipments | All / Admin+Manager |
| `/api/invoices` | GET / POST | Invoicing & Receivables | Admin, Manager, Supervisor |
| `/api/payments` | GET / POST | Invoice Payments | Admin, Manager |
| `/api/analytics/overview` | GET | Executive Dashboard metrics | Admin, Manager, Supervisor |
| `/api/3d-garments` | GET / POST | 3D Garment Model configurations | All / Admin+Manager |

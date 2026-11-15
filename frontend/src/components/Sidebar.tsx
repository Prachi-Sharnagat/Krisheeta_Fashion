import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Users, Package, 
  Settings, Layers, Truck, PenTool, ClipboardCheck,
  Calendar, FileText, Activity, ShieldCheck, PackageCheck, BarChart3, PieChart, Box, X
} from 'lucide-react';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Reports Center', path: '/reports', icon: FileText }
    ],
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Sales Analytics', path: '/analytics/sales', icon: BarChart3 },
      { name: 'Production Analytics', path: '/analytics/production', icon: Activity },
      { name: 'Inventory Analytics', path: '/analytics/inventory', icon: Package },
      { name: 'Quality Analytics', path: '/analytics/quality', icon: ShieldCheck },
      { name: 'Procurement Analytics', path: '/analytics/procurement', icon: ClipboardCheck },
      { name: 'Finance Analytics', path: '/analytics/finance', icon: PieChart },
      { name: 'HR Analytics', path: '/analytics/hr', icon: Users },
      { name: 'Maintenance Analytics', path: '/analytics/maintenance', icon: PenTool },
    ],
  },
  {
    title: 'Orders & CRM',
    items: [
      { name: 'Sales Orders', path: '/sales-orders', icon: ShoppingCart },
      { name: 'Customers', path: '/customers', icon: Users },
    ],
  },
  {
    title: 'Product Engineering',
    items: [
      { name: '3D Garment Studio', path: '/3d-garment', icon: Box },
      { name: '3D Asset Config', path: '/3d-garment/manage', icon: Settings },
      { name: 'Products', path: '/products', icon: Package },
      { name: 'Variants', path: '/variants', icon: Layers },
      { name: 'BOM', path: '/bom', icon: FileText },
      { name: 'Routing', path: '/routing', icon: Activity },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { name: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardCheck },
      { name: 'Goods Receipts', path: '/goods-receipts', icon: PackageCheck },
      { name: 'Suppliers', path: '/suppliers', icon: Truck },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Materials Inventory', path: '/materials', icon: Package },
      { name: 'Stock Movements', path: '/stock-movements', icon: Activity },
      { name: 'Warehouses', path: '/warehouses', icon: Layers },
    ],
  },
  {
    title: 'Production',
    items: [
      { name: 'Production Orders', path: '/production-orders', icon: PenTool },
      { name: 'Batches', path: '/batches', icon: Layers },
      { name: 'WIP', path: '/wip', icon: Activity },
    ],
  },
  {
    title: 'Quality',
    items: [{ name: 'Inspections', path: '/inspections', icon: ShieldCheck }],
  },
  {
    title: 'Dispatch',
    items: [{ name: 'Shipments', path: '/shipments', icon: Truck }],
  },
  {
    title: 'Finance & Accounts',
    items: [
      { name: 'Finance Overview', path: '/finance', icon: LayoutDashboard },
      { name: 'Invoices', path: '/invoices', icon: FileText },
      { name: 'Payments', path: '/payments', icon: ClipboardCheck },
      { name: 'Expenses', path: '/expenses', icon: PackageCheck },
    ],
  },
  {
    title: 'HR',
    items: [
      { name: 'Employees', path: '/employees', icon: Users },
      { name: 'Attendance', path: '/attendance', icon: Calendar },
      { name: 'Payroll', path: '/payroll', icon: FileText },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { name: 'Machine Maintenance', path: '/maintenance', icon: PenTool },
      { name: 'Maintenance Analytics', path: '/analytics/maintenance', icon: Activity },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Admin Center', path: '/admin', icon: ShieldCheck },
      { name: 'Company Settings', path: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const location = useLocation();

  const navContent = (
    <div className="flex flex-1 flex-col overflow-y-auto pt-4 pb-4 scrollbar-thin">
      <nav className="flex-1 space-y-6 px-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </h3>
            <div className="mt-1.5 space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => onCloseMobile && onCloseMobile()}
                  className={({ isActive }) =>
                    `group flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                    }`
                  }
                >
                  <item.icon
                    className="mr-3 h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-navy-900 border-r border-slate-800 shadow-lg">
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800">
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
            GarmentERP
          </span>
        </div>
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-navy-900 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800">
          <span className="text-lg font-bold tracking-tight text-white">GarmentERP</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {navContent}
      </div>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { 
  ShoppingCart, Activity, Layers, AlertTriangle, ShieldCheck, 
  Truck, Receipt, TrendingDown, Calendar, Filter, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar 
} from 'recharts';

interface OverviewKPIs {
  totalSalesOrders: number;
  activeProductionOrders: number;
  totalProductionWip: number;
  lowStockItems: number;
  pendingQualityInspections: number;
  readyToShip: number;
  outstandingInvoices: number;
  totalExpenses: number;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [prodData, setProdData] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Date Filter State
  const [dateRange, setDateRange] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      let query = `range=${dateRange}`;
      if (dateRange === 'custom' && customFrom) query += `&dateFrom=${customFrom}`;
      if (dateRange === 'custom' && customTo) query += `&dateTo=${customTo}`;

      const [overviewRes, salesRes, prodRes, invRes, ordersRes] = await Promise.all([
        fetch(`http://localhost:5000/api/analytics/overview?${query}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`http://localhost:5000/api/analytics/sales?${query}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`http://localhost:5000/api/analytics/production?${query}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`http://localhost:5000/api/analytics/inventory`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`http://localhost:5000/api/orders`, { headers: { Authorization: `Bearer ${getToken()}` } })
      ]);

      if (overviewRes.ok) setKpis(await overviewRes.json());
      if (salesRes.ok) {
        const sData = await salesRes.json();
        setSalesTrend(sData.ordersOverTime || []);
      }
      if (prodRes.ok) setProdData(await prodRes.json());
      if (invRes.ok) {
        const iData = await invRes.json();
        setLowStockList((iData.lowStockTable || []).slice(0, 5));
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setRecentOrders(oData.slice(0, 5));
      }
    } catch (e) {
      console.error('Error fetching dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [dateRange, customFrom, customTo]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Date Range Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PageHeader 
          title="Management Executive Dashboard" 
          description="Real-time operational KPIs, sales performance, production progress, inventory alerts & finance overview." 
        />

        {/* Global Date Filter Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold overflow-x-auto max-w-full">
          <Calendar className="h-4 w-4 text-slate-400 ml-1.5 shrink-0" />
          <span className="text-slate-500 mr-1 hidden sm:inline">Period:</span>
          {['today', 'week', 'month', 'quarter', 'year', 'custom'].map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-2.5 py-1 rounded-lg transition-colors capitalize text-[11px] sm:text-xs font-medium shrink-0 ${
                dateRange === r 
                  ? 'bg-primary-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : r === 'quarter' ? 'Quarter' : r === 'year' ? 'Year' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if custom is selected */}
      {dateRange === 'custom' && (
        <div className="bg-slate-100 p-3 rounded-xl flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">From:</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input-field bg-white py-1 px-2 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">To:</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input-field bg-white py-1 px-2 text-xs" />
          </div>
        </div>
      )}

      {/* 1. REQUIRED 8 KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* KPI 1: Total Sales Orders */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Orders</span>
            <ShoppingCart className="h-4 w-4 text-primary-600" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-slate-900">{kpis?.totalSalesOrders ?? '-'}</p>
          <span className="text-[10px] text-slate-500">Recorded orders</span>
        </div>

        {/* KPI 2: Active Production Orders */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Orders</span>
            <Activity className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-indigo-600">{kpis?.activeProductionOrders ?? '-'}</p>
          <span className="text-[10px] text-indigo-700 font-medium">In production</span>
        </div>

        {/* KPI 3: Total Production WIP */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prod. WIP</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-blue-700">{kpis?.totalProductionWip ?? '-'} pcs</p>
          <span className="text-[10px] text-slate-500">WIP quantity</span>
        </div>

        {/* KPI 4: Low Stock Items */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${
          (kpis?.lowStockItems || 0) > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-amber-700">{kpis?.lowStockItems ?? '-'}</p>
          <span className="text-[10px] text-amber-800 font-medium">Materials low</span>
        </div>

        {/* KPI 5: Pending Quality Inspections */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality Alert</span>
            <ShieldCheck className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-rose-600">{kpis?.pendingQualityInspections ?? '-'}</p>
          <span className="text-[10px] text-slate-500">Rework jobs</span>
        </div>

        {/* KPI 6: Ready to Ship */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready Ship</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-emerald-600">{kpis?.readyToShip ?? '-'}</p>
          <span className="text-[10px] text-slate-500">Orders ready</span>
        </div>

        {/* KPI 7: Outstanding Invoices */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receivables</span>
            <Receipt className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-base font-extrabold text-purple-700 font-mono truncate">{formatINR(kpis?.outstandingInvoices)}</p>
          <span className="text-[10px] text-slate-500">Unpaid balance</span>
        </div>

        {/* KPI 8: Total Expenses */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</span>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-base font-extrabold text-rose-600 font-mono truncate">{formatINR(kpis?.totalExpenses)}</p>
          <span className="text-[10px] text-slate-500">Approved/Paid</span>
        </div>
      </div>

      {/* 2. MAIN CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Order & Revenue Trend Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary-600 shrink-0" /> Sales Trend & Revenue
            </h2>
            <Link to="/analytics/sales" className="text-xs font-semibold text-primary-600 hover:underline shrink-0">Analytics →</Link>
          </div>

          {salesTrend.length > 0 ? (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales Value']} />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-12 text-center">No sales trend data available for selected period.</p>
          )}
        </Card>

        {/* Production Completion vs Planned */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600 shrink-0" /> Production Progress
            </h2>
            <Link to="/analytics/production" className="text-xs font-semibold text-primary-600 hover:underline shrink-0">Analytics →</Link>
          </div>

          {prodData?.productionByProduct && prodData.productionByProduct.length > 0 ? (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodData.productionByProduct} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="planned" fill="#cbd5e1" name="Planned Qty" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#4f46e5" name="Completed Qty" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-12 text-center">No production order data available for selected period.</p>
          )}
        </Card>
      </div>

      {/* 3. OPERATIONAL TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Sales Orders</h2>
            <Link to="/sales-orders" className="text-xs font-semibold text-primary-600 hover:underline">View All →</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Order #</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Customer</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Total</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-400 italic">No sales orders found.</td>
                  </tr>
                ) : (
                  recentOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-primary-600">
                        <Link to={`/sales-orders/${o.id}`}>{o.orderNumber}</Link>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{o.customer?.name}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">{formatINR(o.totalAmount)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'info'}>
                          {o.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Low Stock Material Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" /> Low Stock Alerts
            </h2>
            <Link to="/analytics/inventory" className="text-xs font-semibold text-primary-600 hover:underline">View All →</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Material</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Stock</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Min. Level</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {lowStockList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-400 italic">All raw material stocks are at optimal levels.</td>
                  </tr>
                ) : (
                  lowStockList.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{m.material}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">{m.currentStock} {m.unit}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{m.minimumLevel} {m.unit}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={m.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                          {m.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Quick Access Navigation to Detailed Analytics Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Link to="/analytics/sales" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-primary-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-primary-600">
          Sales Analytics →
        </Link>
        <Link to="/analytics/production" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-indigo-600">
          Production →
        </Link>
        <Link to="/analytics/inventory" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-amber-600">
          Inventory →
        </Link>
        <Link to="/analytics/quality" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-rose-600">
          Quality →
        </Link>
        <Link to="/analytics/procurement" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-blue-600">
          Procurement →
        </Link>
        <Link to="/analytics/finance" className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs text-center font-semibold text-xs text-slate-700 hover:text-emerald-600">
          Finance →
        </Link>
        <Link to="/reports" className="bg-primary-600 text-white p-2.5 rounded-xl text-center font-bold text-xs hover:bg-primary-700 shadow-xs col-span-2 sm:col-span-1">
          Reports Center →
        </Link>
      </div>
    </div>
  );
};

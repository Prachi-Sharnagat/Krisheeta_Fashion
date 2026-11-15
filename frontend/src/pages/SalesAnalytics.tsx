import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Filter } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export const SalesAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [range, setRange] = useState('month');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:5000/api/analytics/sales?range=${range}&`;
      if (selectedCustomer) url += `customerId=${selectedCustomer}&`;
      if (selectedProduct) url += `productId=${selectedProduct}&`;
      if (selectedStatus) url += `status=${selectedStatus}&`;

      const [salesRes, custRes, prodRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('http://localhost:5000/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('http://localhost:5000/api/products', { headers: { Authorization: `Bearer ${getToken()}` } })
      ]);

      if (salesRes.ok) setData(await salesRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (e) {
      console.error('Error fetching sales analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [range, selectedCustomer, selectedProduct, selectedStatus]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <PageHeader 
        title="Sales & Revenue Analytics" 
        description="Comprehensive sales performance metrics, order volumes, revenue trends, and status distribution." 
      />

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3.5 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 shrink-0">
            <Filter className="h-4 w-4 text-primary-600" />
            <span>Filters:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full md:w-auto">
            <select className="input-field bg-white text-xs" value={range} onChange={e => setRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>

            <select className="input-field bg-white text-xs" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select className="input-field bg-white text-xs" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select className="input-field bg-white text-xs" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="IN_PRODUCTION">IN PRODUCTION</option>
              <option value="READY_TO_SHIP">READY TO SHIP</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
          <p className="mt-2 text-xl font-bold text-slate-900">{data?.totalOrders ?? 0}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Value</span>
          <p className="mt-2 text-xl font-bold text-primary-600 font-mono truncate">{formatINR(data?.totalOrderValue)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
          <p className="mt-2 text-xl font-bold text-emerald-600">{data?.completedOrders ?? 0}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
          <p className="mt-2 text-xl font-bold text-amber-600">{data?.pendingOrders ?? 0}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</span>
          <p className="mt-2 text-xl font-bold text-rose-600">{data?.cancelledOrders ?? 0}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Order Value</span>
          <p className="mt-2 text-lg font-bold text-slate-800 font-mono truncate">{formatINR(data?.averageOrderValue)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Value Over Time */}
        <Card>
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Sales Value Over Time
          </h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.ordersOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales Value']} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="#ddd6fe" fillOpacity={0.5} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders Over Time */}
        <Card>
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Order Count Over Time
          </h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.ordersOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" name="Orders Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders by Status */}
        <Card>
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Orders Distribution by Status
          </h2>
          <div className="h-56 sm:h-64 flex items-center justify-center">
            {data?.ordersByStatus?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label>
                    {data.ordersByStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 italic">No status data available.</p>
            )}
          </div>
        </Card>

        {/* Orders by Priority */}
        <Card>
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Orders Breakdown by Priority
          </h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.ordersByPriority || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="priority" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name="Orders Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

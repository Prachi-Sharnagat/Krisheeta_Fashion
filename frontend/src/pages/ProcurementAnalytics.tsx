import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ClipboardCheck, Truck, Clock, CheckCircle2, Filter } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export const ProcurementAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);

  const fetchProcurementData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/procurement?range=${range}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching procurement analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, [range]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Procurement & Vendor Analytics" 
          description="Track raw material purchase orders, vendor fulfillment rates, purchase spend trends & active supplier metrics." 
        />

        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Period:</span>
          <select value={range} onChange={e => setRange(e.target.value)} className="bg-transparent outline-none font-medium text-slate-800">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Orders</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data?.purchaseOrdersCount ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Spend</span>
          <p className="mt-2 text-2xl font-bold text-primary-600 font-mono">{formatINR(data?.purchaseOrderValue)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Orders</span>
          <p className="mt-2 text-2xl font-bold text-amber-600">{data?.pendingOrders ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Partially Received</span>
          <p className="mt-2 text-2xl font-bold text-blue-600">{data?.partiallyReceived ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fully Received</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{data?.fullyReceived ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Suppliers</span>
          <p className="mt-2 text-2xl font-bold text-slate-800">{data?.supplierCount ?? 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Spend Value Over Time */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Procurement Spend Value Over Time
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.purchaseOrdersOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Purchase Spend']} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.6} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Purchases by Supplier */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Procurement Spend Breakdown by Supplier
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.purchasesBySupplier || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="supplier" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spend']} />
                <Bar dataKey="value" fill="#4f46e5" name="Spend (₹)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

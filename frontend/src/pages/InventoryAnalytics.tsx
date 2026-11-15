import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Package, AlertTriangle, Activity, Warehouse } from 'lucide-react';
import { getToken } from '../utils/auth';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const InventoryAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/analytics/inventory', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching inventory analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader 
        title="Inventory & Material Stock Analytics" 
        description="Monitor raw material levels, stock values, category distribution, low stock alerts, and stock movements." 
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Items</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data?.totalInventoryItems ?? 0}</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Low Stock Items</span>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{data?.lowStockItems ?? 0}</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Out of Stock</span>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">{data?.outOfStockItems ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stock Qty</span>
          <p className="mt-2 text-2xl font-bold text-primary-600 font-mono">{data?.totalStockQuantity ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouses</span>
          <p className="mt-2 text-2xl font-bold text-slate-800">{data?.numberOfWarehouses ?? 1}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Movements</span>
          <p className="mt-2 text-2xl font-bold text-blue-600">{data?.recentStockMovementsCount ?? 0}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Quantity by Category */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Stock Quantity Breakdown by Material Category
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stockByCategory || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalStock" fill="#3b82f6" name="Total Stock Qty" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Item Distribution */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Item Count by Category
          </h2>
          <div className="h-64 flex items-center justify-center">
            {data?.stockByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.stockByCategory} dataKey="itemCount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                    {data.stockByCategory.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 italic">No inventory data available.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Low Stock Material Table */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Low & Out-of-Stock Materials Table
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Current Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Minimum Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {!data?.lowStockTable || data.lowStockTable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 italic">No materials below minimum threshold.</td>
                </tr>
              ) : (
                data.lowStockTable.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.code || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.material}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{item.currentStock} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.minimumLevel} {item.unit}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                        {item.status.replace(/_/g, ' ')}
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
  );
};

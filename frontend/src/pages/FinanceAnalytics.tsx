import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { IndianRupee, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

export const FinanceAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/analytics/finance', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching finance analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader 
        title="Financial & Accounts Analytics" 
        description="Monitor sales revenue, collections, outstanding customer receivables, operational expenses & net cash flow." 
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</span>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">{formatINR(data?.totalRevenue)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments Received</span>
          <p className="mt-2 text-2xl font-bold text-blue-600 font-mono">{formatINR(data?.paymentsReceived)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receivables</span>
          <p className="mt-2 text-2xl font-bold text-amber-600 font-mono">{formatINR(data?.outstandingReceivables)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
          <p className="mt-2 text-2xl font-bold text-rose-600 font-mono">{formatINR(data?.totalExpenses)}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          (data?.netCashFlow || 0) >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Net Cash Flow</span>
          <p className={`mt-2 text-2xl font-extrabold font-mono ${(data?.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatINR(data?.netCashFlow)}
          </p>
          <span className="text-[10px] text-slate-500">Collected - Expenses</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Bar Comparison */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Revenue vs Expenses Comparison
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.financialTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`]} />
                <Legend />
                <Bar dataKey="revenue" fill="#7c3aed" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" fill="#3b82f6" name="Collections" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Collections / Payments Trend */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Collections & Payments Received Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.financialTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Payments']} />
                <Area type="monotone" dataKey="payments" stroke="#3b82f6" fill="#dbeafe" fillOpacity={0.6} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Overdue Invoices Table */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" /> Overdue Invoices Table
          </h2>
          <Link to="/invoices?overdue=true" className="text-xs font-semibold text-primary-600 hover:underline">View All Overdue →</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Invoice Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Days Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {!data?.overdueInvoices || data.overdueInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 italic">No overdue customer invoices. Excellent collections performance!</td>
                </tr>
              ) : (
                data.overdueInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 bg-red-50/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary-600">
                      <Link to={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{inv.customerName}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">{formatINR(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600">{formatINR(inv.paidAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{formatINR(inv.balanceAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-red-100 text-red-800">
                        {inv.daysOverdue} Days Overdue
                      </span>
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

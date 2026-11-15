import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { 
  IndianRupee, TrendingUp, TrendingDown, Clock, AlertTriangle, 
  CheckCircle2, Plus, ArrowUpRight, ArrowDownRight, CreditCard, 
  Receipt, DollarSign, PieChart, BarChart3, FileText, Send 
} from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';
import { formatINR } from '../utils/formatters';

interface SummaryData {
  totalSales: number;
  outstandingReceivables: number;
  paidAmount: number;
  totalPaymentsReceived: number;
  totalExpenses: number;
  pendingExpenses: number;
  overdueCount: number;
  overdueAmount: number;
  netCashFlow: number;
  totalInvoicesCount: number;
  totalPaymentsCount: number;
  totalExpensesCount: number;
}

interface ReportData {
  expenseByCategory: Record<string, number>;
  paymentsByMethod: Record<string, number>;
}

export const FinanceDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [sumRes, repRes] = await Promise.all([
        fetch('http://localhost:5000/api/finance/summary', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('http://localhost:5000/api/finance/reports', { headers: { Authorization: `Bearer ${getToken()}` } })
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (repRes.ok) setReports(await repRes.json());
    } catch (e) {
      console.error('Error fetching finance summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const role = getUserRole();
  const canManage = role === 'ADMIN' || role === 'MANAGER';

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading financial dashboard...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Finance & Accounts Overview" 
          description="Track sales revenue, outstanding receivables, expenses, cash flow, and payment collections." 
        />

        {canManage && (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/invoices/new')} className="btn-primary flex items-center">
              <Plus className="mr-1.5 h-4 w-4" /> Create Invoice
            </button>
            <button onClick={() => navigate('/expenses/new')} className="btn-secondary flex items-center">
              <Plus className="mr-1.5 h-4 w-4" /> Add Expense
            </button>
          </div>
        )}
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatINR(summary?.totalSales)}</p>
          <span className="text-[11px] text-slate-500">{summary?.totalInvoicesCount || 0} Invoices</span>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receivables</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-amber-600">{formatINR(summary?.outstandingReceivables)}</p>
          <span className="text-[11px] text-amber-700 font-medium">Pending collection</span>
        </div>

        {/* Paid Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</span>
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-blue-600">{formatINR(summary?.paidAmount)}</p>
          <span className="text-[11px] text-slate-500">{summary?.totalPaymentsCount || 0} Payments</span>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-rose-600">{formatINR(summary?.totalExpenses)}</p>
          <span className="text-[11px] text-slate-500">{summary?.totalExpensesCount || 0} Records</span>
        </div>

        {/* Net Cash Flow */}
        <div className={`p-4 rounded-xl border shadow-sm ${
          (summary?.netCashFlow || 0) >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Net Cash Flow</span>
            <DollarSign className={`h-5 w-5 ${(summary?.netCashFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <p className={`mt-2 text-xl font-bold ${(summary?.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatINR(summary?.netCashFlow)}
          </p>
          <span className="text-[11px] text-slate-500">Collected - Expenses</span>
        </div>

        {/* Overdue Invoices */}
        <div className={`p-4 rounded-xl border shadow-sm ${
          (summary?.overdueCount || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Overdue</span>
            <AlertTriangle className={`h-5 w-5 ${(summary?.overdueCount || 0) > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className={`mt-2 text-xl font-bold ${(summary?.overdueCount || 0) > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {formatINR(summary?.overdueAmount)}
          </p>
          <span className="text-[11px] text-red-600 font-semibold">{summary?.overdueCount || 0} overdue invoices</span>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-rose-500" /> Expense Breakdown by Category
            </span>
            <Link to="/expenses" className="text-xs font-semibold text-primary-600 hover:underline">View All →</Link>
          </h2>

          {reports?.expenseByCategory && Object.keys(reports.expenseByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(reports.expenseByCategory).map(([cat, amt]) => {
                const totalExp = summary?.totalExpenses || 1;
                const pct = Math.min(100, Math.round((amt / totalExp) * 100));

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{cat.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">{formatINR(amt)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-6 text-center">No approved or paid expense records found.</p>
          )}
        </Card>

        {/* Payments Collections by Method */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" /> Collections by Payment Method
            </span>
            <Link to="/payments" className="text-xs font-semibold text-primary-600 hover:underline">View All →</Link>
          </h2>

          {reports?.paymentsByMethod && Object.keys(reports.paymentsByMethod).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(reports.paymentsByMethod).map(([method, amt]) => {
                const totalPaid = summary?.totalPaymentsReceived || 1;
                const pct = Math.min(100, Math.round((amt / totalPaid) * 100));

                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{method.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">{formatINR(amt)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-6 text-center">No completed payment transactions recorded.</p>
          )}
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/invoices" className="bg-white p-6 rounded-xl border border-slate-200 hover:border-primary-500 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <Receipt className="h-8 w-8 text-primary-600 group-hover:scale-110 transition-transform" />
            <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Invoices</h3>
          <p className="text-sm text-slate-500 mt-1">Issue customer invoices, track due dates, and monitor status.</p>
        </Link>

        <Link to="/payments" className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <CreditCard className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Payments</h3>
          <p className="text-sm text-slate-500 mt-1">Record incoming payments, manage partial payments & references.</p>
        </Link>

        <Link to="/expenses" className="bg-white p-6 rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <TrendingDown className="h-8 w-8 text-rose-600 group-hover:scale-110 transition-transform" />
            <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-rose-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Expenses</h3>
          <p className="text-sm text-slate-500 mt-1">Log operational costs, supplier payments, salary & overheads.</p>
        </Link>
      </div>
    </div>
  );
};

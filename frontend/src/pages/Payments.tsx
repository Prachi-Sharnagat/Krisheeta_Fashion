import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Search, CreditCard, Calendar, User, FileText, Filter } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';

interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: { id: string; invoiceNumber: string; totalAmount: number; balanceAmount: number };
  customerId: string;
  customer?: { id: string; name: string; companyName?: string };
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  notes?: string;
  paymentGateway?: string;
  gatewayStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fetching, setFetching] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchPayments = async () => {
    setFetching(true);
    try {
      let url = 'http://localhost:5000/api/payments?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (methodFilter) url += `paymentMethod=${encodeURIComponent(methodFilter)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setPayments(await res.json());
    } catch (e) {
      console.error('Error fetching payments:', e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const filteredPayments = payments.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(q) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
      (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(q)) ||
      (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(q)) ||
      (p.customer?.name && p.customer.name.toLowerCase().includes(q)) ||
      (p.invoice?.invoiceNumber && p.invoice.invoiceNumber.toLowerCase().includes(q))
    );
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED':
      case 'REFUNDED': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <PageHeader 
        title="Payment Transactions" 
        description="Track incoming customer payment receipts, Razorpay digital payments, bank transfers, and UTR numbers." 
      />

      <Card>
        {/* Search & Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Payment #, Invoice #, Razorpay ID / UTR or Customer..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select 
              className="input-field bg-white text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>

            <select 
              className="input-field bg-white text-sm"
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
            >
              <option value="">All Payment Methods</option>
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="UPI">UPI</option>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Gateway</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reference / Gateway ID</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No payment records found.</td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold font-mono text-slate-900">
                      {p.paymentNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link to={`/invoices/${p.invoiceId}`} className="font-mono font-semibold text-primary-600 hover:underline">
                        {p.invoice?.invoiceNumber || p.invoiceId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      {p.customer?.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {p.paymentGateway === 'RAZORPAY' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Razorpay
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800 font-medium">
                      {p.paymentMethod.replace(/_/g, ' ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-600">
                      {p.razorpayPaymentId ? (
                        <div>
                          <div className="font-semibold text-slate-900">{p.razorpayPaymentId}</div>
                          {p.razorpayOrderId && <div className="text-[10px] text-slate-400">Order: {p.razorpayOrderId}</div>}
                        </div>
                      ) : (
                        p.referenceNumber || '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold font-mono text-emerald-700">
                      {formatINR(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getStatusBadgeType(p.status)}>{p.status}</StatusBadge>
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

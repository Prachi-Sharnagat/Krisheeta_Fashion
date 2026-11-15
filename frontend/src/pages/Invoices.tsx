import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Plus, Search, Eye, Edit2, Trash2, Calendar, CreditCard, 
  AlertTriangle, FileText, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';
import { formatINR } from '../utils/formatters';

interface Customer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  salesOrderId?: string;
  salesOrder?: { orderNumber: string };
  shipmentId?: string;
  shipment?: { shipmentNumber: string };
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Payment Modal State
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchInvoices = async () => {
    setFetching(true);
    try {
      let url = 'http://localhost:5000/api/invoices?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (customerFilter) url += `customerId=${encodeURIComponent(customerFilter)}&`;
      if (overdueOnly) url += `overdue=true&`;
      if (dateFrom) url += `dateFrom=${encodeURIComponent(dateFrom)}&`;
      if (dateTo) url += `dateTo=${encodeURIComponent(dateTo)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setInvoices(await res.json());
    } catch (e) {
      console.error('Error fetching invoices:', e);
    } finally {
      setFetching(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customers', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [statusFilter, customerFilter, overdueOnly, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/invoices/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete invoice');
      }
    } catch (e) {
      alert('Network error deleting invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }

    setPaying(true);
    try {
      const res = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          invoiceId: payModalInvoice.id,
          customerId: payModalInvoice.customerId,
          amount: amt,
          paymentMethod: payMethod,
          referenceNumber: payRef,
          notes: payNotes,
          status: 'COMPLETED'
        })
      });

      if (res.ok) {
        setPayModalInvoice(null);
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to record payment');
      }
    } catch (e) {
      alert('Network error recording payment');
    } finally {
      setPaying(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customer?.name && inv.customer.name.toLowerCase().includes(q)) ||
      (inv.salesOrder?.orderNumber && inv.salesOrder.orderNumber.toLowerCase().includes(q)) ||
      (inv.shipment?.shipmentNumber && inv.shipment.shipmentNumber.toLowerCase().includes(q))
    );
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIALLY_PAID':
      case 'ISSUED': return 'info';
      case 'OVERDUE':
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const role = getUserRole();
  const canManage = role === 'ADMIN' || role === 'MANAGER';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Customer Invoices" 
          description="Manage sales invoices, track outstanding balances, payments, and payment statuses." 
        />
        {canManage && (
          <button onClick={() => navigate('/invoices/new')} className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Create Invoice
          </button>
        )}
      </div>

      <Card>
        {/* Search & Filters */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Invoice #, Customer, Sales Order or Shipment..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select 
              className="input-field bg-white text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select 
              className="input-field bg-white text-sm"
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input 
              type="date"
              title="From Date"
              className="input-field bg-white text-sm"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />

            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`px-3 py-2 rounded-md font-medium text-xs border transition-colors flex items-center justify-center gap-1.5 ${
                overdueOnly 
                  ? 'bg-red-600 text-white border-red-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueOnly ? 'Overdue Only' : 'Filter Overdue'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isOverdue = inv.dueDate && inv.dueDate.slice(0, 10) < todayStr && inv.balanceAmount > 0 && inv.status !== 'CANCELLED';

                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link to={`/invoices/${inv.id}`} className="text-sm font-bold text-primary-600 hover:underline font-mono">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 font-medium">
                        {inv.customer?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {inv.dueDate ? (
                          <span className={isOverdue ? 'text-red-700 font-semibold flex items-center gap-1' : 'text-slate-700'}>
                            {isOverdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                            {new Date(inv.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-slate-900 font-mono">
                        {formatINR(inv.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-semibold text-blue-600 font-mono">
                        {formatINR(inv.paidAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-amber-700 font-mono">
                        {formatINR(inv.balanceAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <StatusBadge status={getStatusBadgeType(isOverdue ? 'OVERDUE' : inv.status)}>
                          {isOverdue ? 'OVERDUE' : inv.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                        <button 
                          title="View Invoice"
                          className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canManage && inv.balanceAmount > 0 && inv.status !== 'CANCELLED' && (
                          <button 
                            title="Record Payment"
                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors" 
                            onClick={() => {
                              setPayModalInvoice(inv);
                              setPayAmount(String(inv.balanceAmount));
                            }}
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}

                        {canManage && ['DRAFT', 'ISSUED'].includes(inv.status) && (
                          <button 
                            title="Edit Invoice"
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" 
                            onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {isAdmin && (
                          <button 
                            title="Delete Invoice"
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                            onClick={() => setDeleteId(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      {payModalInvoice && (
        <Modal 
          isOpen={!!payModalInvoice} 
          onClose={() => setPayModalInvoice(null)}
          title={`Record Payment for Invoice ${payModalInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Customer:</span> <strong className="text-slate-900">{payModalInvoice.customer?.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Amount:</span> <strong className="text-slate-900 font-mono">{formatINR(payModalInvoice.totalAmount)}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Outstanding Balance:</span> <strong className="text-amber-700 font-mono">{formatINR(payModalInvoice.balanceAmount)}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Amount (₹) *</label>
              <input 
                type="number"
                step="any"
                min={0.01}
                max={payModalInvoice.balanceAmount}
                required
                className="input-field w-full text-base font-bold font-mono"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method *</label>
              <select 
                className="input-field w-full bg-white text-sm"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="CARD">CREDIT / DEBIT CARD</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reference Number / UTR / Cheque #</label>
              <input 
                type="text"
                placeholder="e.g. UTR-984710294"
                className="input-field w-full text-sm font-mono"
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea 
                rows={2}
                placeholder="Payment notes..."
                className="input-field w-full text-sm"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setPayModalInvoice(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={paying} className="btn-primary">
                {paying ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Invoice Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this invoice record? An invoice with completed payments cannot be deleted.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

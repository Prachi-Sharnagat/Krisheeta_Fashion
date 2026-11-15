import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Plus, Search, Edit2, Trash2, Calendar, TrendingDown, 
  CheckCircle2, Clock, AlertTriangle, Building2 
} from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';
import { formatINR } from '../utils/formatters';

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  supplierId?: string;
  supplier?: { name: string };
  referenceNumber?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = async () => {
    setFetching(true);
    try {
      let url = 'http://localhost:5000/api/expenses?';
      if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (dateFrom) url += `dateFrom=${encodeURIComponent(dateFrom)}&`;
      if (dateTo) url += `dateTo=${encodeURIComponent(dateTo)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (e) {
      console.error('Error fetching expenses:', e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, statusFilter, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete expense');
      }
    } catch (e) {
      alert('Network error deleting expense');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update expense status');
      }
    } catch (e) {
      alert('Network error updating expense status');
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      exp.expenseNumber.toLowerCase().includes(q) ||
      exp.description.toLowerCase().includes(q) ||
      (exp.referenceNumber && exp.referenceNumber.toLowerCase().includes(q)) ||
      (exp.supplier?.name && exp.supplier.name.toLowerCase().includes(q))
    );
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const role = getUserRole();
  const canManage = role === 'ADMIN' || role === 'MANAGER';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Expense Management" 
          description="Track raw materials cost, transport, factory utilities, maintenance, salary & packaging operational expenses." 
        />
        {canManage && (
          <button onClick={() => navigate('/expenses/new')} className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Add Expense
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
              placeholder="Search by Expense #, Description, Supplier or Reference #..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select 
              className="input-field bg-white text-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="RAW_MATERIAL">RAW MATERIAL</option>
              <option value="TRANSPORT">TRANSPORT</option>
              <option value="ELECTRICITY">ELECTRICITY</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="SALARY">SALARY</option>
              <option value="PACKAGING">PACKAGING</option>
              <option value="RENT">RENT</option>
              <option value="UTILITIES">UTILITIES</option>
              <option value="OTHER">OTHER</option>
            </select>

            <select 
              className="input-field bg-white text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <input 
              type="date"
              title="From Date"
              className="input-field bg-white text-sm"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />

            <input 
              type="date"
              title="To Date"
              className="input-field bg-white text-sm"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expense Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description / Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expense Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment Method</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Loading expenses...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No expense records found.</td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold font-mono text-slate-900">
                      {exp.expenseNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                        {exp.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-900">{exp.description}</div>
                      {exp.supplier && (
                        <div className="text-xs text-slate-500">Supplier: {exp.supplier.name}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 font-medium">
                      {exp.paymentMethod.replace(/_/g, ' ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold font-mono text-rose-700">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getStatusBadgeType(exp.status)}>{exp.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                      {canManage && exp.status === 'PENDING' && (
                        <button 
                          title="Approve Expense"
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold"
                          onClick={() => handleStatusChange(exp.id, 'APPROVED')}
                        >
                          Approve
                        </button>
                      )}

                      {canManage && (
                        <button 
                          title="Edit Expense"
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" 
                          onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <button 
                          title="Delete Expense"
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                          onClick={() => setDeleteId(exp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Expense Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this expense record?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { getUser } from '../utils/auth';
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  machineName: string;
  machineCode: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  scheduledDate: string;
  completedDate?: string | null;
  technician: string;
  cost?: number | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description: string;
  notes?: string | null;
  createdAt: string;
}

interface MaintenanceSummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  totalCost: number;
}

const getMaintenanceBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return <StatusBadge status="success">Completed</StatusBadge>;
    case 'IN_PROGRESS':
      return <StatusBadge status="warning">In Progress</StatusBadge>;
    case 'SCHEDULED':
      return <StatusBadge status="info">Scheduled</StatusBadge>;
    case 'CANCELLED':
      return <StatusBadge status="danger">Cancelled</StatusBadge>;
    default:
      return <StatusBadge status="default">{status || 'Unknown'}</StatusBadge>;
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'EMERGENCY':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'CORRECTIVE':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'PREVENTIVE':
    default:
      return 'bg-blue-100 text-blue-700 border-blue-200';
  }
};

export const MaintenancePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formData, setFormData] = useState({
    machineName: '',
    machineCode: '',
    maintenanceType: 'PREVENTIVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    technician: '',
    cost: '',
    status: 'SCHEDULED',
    description: '',
    notes: '',
  });

  const currentUser = getUser();
  const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SUPERVISOR';

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.maintenanceType = typeFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get<{ records: MaintenanceRecord[]; summary: MaintenanceSummary }>(
        '/api/maintenance',
        params
      );
      if (res && res.records) {
        setRecords(res.records);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, typeFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      machineName: '',
      machineCode: '',
      maintenanceType: 'PREVENTIVE',
      scheduledDate: new Date().toISOString().split('T')[0],
      technician: '',
      cost: '',
      status: 'SCHEDULED',
      description: '',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: MaintenanceRecord) => {
    setEditingId(rec.id);
    setFormData({
      machineName: rec.machineName,
      machineCode: rec.machineCode,
      maintenanceType: rec.maintenanceType,
      scheduledDate: rec.scheduledDate.split('T')[0],
      technician: rec.technician,
      cost: rec.cost != null ? String(rec.cost) : '',
      status: rec.status,
      description: rec.description,
      notes: rec.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload: any = {
        machineName: formData.machineName.trim(),
        machineCode: formData.machineCode.trim(),
        maintenanceType: formData.maintenanceType,
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        technician: formData.technician.trim(),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        status: formData.status,
        description: formData.description.trim(),
        notes: formData.notes.trim() || null,
      };

      if (editingId) {
        await api.put(`/api/maintenance/${editingId}`, payload);
      } else {
        await api.post('/api/maintenance', payload);
      }

      setIsModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save maintenance record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this maintenance record?')) return;
    try {
      await api.delete(`/api/maintenance/${id}`);
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const formatINR = (val?: number | null) => {
    if (val == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.machineName.toLowerCase().includes(term) ||
      r.machineCode.toLowerCase().includes(term) ||
      r.technician.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Machine & Asset Maintenance"
          description="Preventive scheduling, emergency breakdowns, technician work orders, and maintenance expenditures"
        />
        {isPrivileged && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow font-medium text-sm transition"
          >
            <Plus className="h-4 w-4" /> Log Maintenance
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Work Orders</span>
            <Wrench className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.scheduled}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Progress</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.inProgress}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.overdue}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatINR(summary.totalCost)}</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by machine name, code, technician, or issue description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="EMERGENCY">Emergency</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              onClick={fetchRecords}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Maintenance Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm">Loading maintenance records from PostgreSQL...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-medium text-slate-700">No maintenance records found</p>
            <p className="text-xs text-slate-400 mt-1">Create a schedule or check your search filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase border-b border-slate-200 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Machine & Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Description</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rec.machineName}</div>
                      <div className="text-xs text-slate-400 font-mono">{rec.machineCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono border font-semibold ${getTypeBadgeColor(rec.maintenanceType)}`}>
                        {rec.maintenanceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {new Date(rec.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{rec.technician}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{formatINR(rec.cost)}</td>
                    <td className="py-3 px-4">{getMaintenanceBadge(rec.status)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 truncate max-w-[220px]">
                      {rec.description}
                    </td>
                    {isPrivileged && (
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Maintenance Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Maintenance Work Order' : 'Log Maintenance Work Order'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine Name *</label>
              <input
                type="text"
                required
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="e.g. Juki DDL-8700"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine Code *</label>
              <input
                type="text"
                required
                value={formData.machineCode}
                onChange={(e) => setFormData({ ...formData, machineCode: e.target.value })}
                placeholder="e.g. SEW-042"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Maintenance Type *</label>
              <select
                value={formData.maintenanceType}
                onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Scheduled Date *</label>
              <input
                type="date"
                required
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Technician / Assigned To *</label>
              <input
                type="text"
                required
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Monthly oil change, needle replacement, and belt tensioning"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Spare Parts</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Replaced oil pump seal and rubber belt (part #BP-201)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

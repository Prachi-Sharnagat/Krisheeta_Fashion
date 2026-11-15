import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Trash2, Edit2, Warehouse } from 'lucide-react';
import { getToken } from '../utils/auth';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  type: string;
  status: string;
  createdAt: string;
}

export const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    type: 'RAW_MATERIALS',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/warehouses', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setWarehouses(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch warehouses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      location: '',
      type: 'RAW_MATERIALS',
      status: 'ACTIVE',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (w: WarehouseItem) => {
    setEditingId(w.id);
    setFormData({
      code: w.code,
      name: w.name,
      location: w.location || '',
      type: w.type,
      status: w.status,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingId
        ? `http://localhost:5000/api/warehouses/${editingId}`
        : 'http://localhost:5000/api/warehouses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save warehouse');
      }

      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete warehouse '${name}'?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/warehouses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        fetchWarehouses();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete warehouse');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting warehouse');
    }
  };

  const filteredWarehouses = warehouses.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.location && w.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !filterType || w.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Stock Locations"
        description="Manage multi-tier material warehouses, finished goods storage units & transit hubs."
        action={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Warehouse
          </button>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Storage Types</option>
            <option value="RAW_MATERIALS">Raw Materials</option>
            <option value="FINISHED_GOODS">Finished Goods</option>
            <option value="TRANSIT">Transit Hub</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <th className="p-4">Code</th>
                <th className="p-4">Warehouse Name</th>
                <th className="p-4">Location</th>
                <th className="p-4">Storage Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && warehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading warehouses...
                  </td>
                </tr>
              ) : filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Warehouse className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No warehouses found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-medium text-slate-900">{w.code}</td>
                    <td className="p-4 font-medium text-slate-800">{w.name}</td>
                    <td className="p-4 text-slate-600">{w.location || '—'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {w.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={w.status === 'ACTIVE' ? 'success' : 'default'}>
                        {w.status}
                      </StatusBadge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(w)}
                        className="text-slate-500 hover:text-indigo-600 p-1"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(w.id, w.name)}
                        className="text-slate-500 hover:text-rose-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Warehouse' : 'New Warehouse'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Warehouse Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. WH-FAB-01"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm uppercase focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Warehouse Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Central Fabric & Trim Storage"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location / Address</label>
            <input
              type="text"
              placeholder="e.g. Building B, Bay 4, Industrial Area"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Storage Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="RAW_MATERIALS">Raw Materials</option>
                <option value="FINISHED_GOODS">Finished Goods</option>
                <option value="TRANSIT">Transit Hub</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Warehouse' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

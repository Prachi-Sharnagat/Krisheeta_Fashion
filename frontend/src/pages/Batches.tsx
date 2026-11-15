import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Layers, RefreshCw } from 'lucide-react';
import { getToken } from '../utils/auth';

interface ProductionBatch {
  id: string;
  batchNumber: string;
  targetQuantity: number;
  completedQuantity: number;
  defectiveQuantity: number;
  status: string;
  createdAt: string;
  productionOrder: {
    id: string;
    orderNumber: string;
    status: string;
  };
  product: {
    id: string;
    name: string;
    sku?: string;
  };
  variant?: {
    id: string;
    name: string;
    color?: string;
    size?: string;
  };
  currentOperation?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface OrderOption {
  id: string;
  orderNumber: string;
  targetQuantity: number;
  product: { id: string; name: string };
}

export const Batches = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    productionOrderId: '',
    targetQuantity: '50',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/batches', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setBatches(await res.json());
    } catch (e) {
      console.error('Failed to fetch production batches', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/production-orders', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error('Failed to fetch orders', e);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchOrders();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          productionOrderId: formData.productionOrderId,
          targetQuantity: parseInt(formData.targetQuantity, 10),
          notes: formData.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ productionOrderId: '', targetQuantity: '50', notes: '' });
        fetchBatches();
      } else {
        setError(data.error || 'Failed to create batch');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(search) ||
      b.productionOrder.orderNumber.toLowerCase().includes(search) ||
      b.product.name.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter ? b.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <StatusBadge status="info">Planned</StatusBadge>;
      case 'IN_PROGRESS':
        return <StatusBadge status="warning">In Cutting/Sewing</StatusBadge>;
      case 'IN_INSPECTION':
        return <StatusBadge status="warning">In QC Inspection</StatusBadge>;
      case 'COMPLETED':
        return <StatusBadge status="success">Completed</StatusBadge>;
      default:
        return <StatusBadge status="default">{status}</StatusBadge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Production Batches & Bundles" 
          description="Manage production job bundles, size cuts, and track bundle flow through shop floor stations." 
        />
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button onClick={fetchBatches} className="btn-secondary flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-1">
            <Plus className="h-4 w-4" /> Create Bundle Batch
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Batch #, Work Order #, or Garment Style..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-field sm:w-48 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_INSPECTION">In Inspection</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Batch Bundle #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Work Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Garment Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Bundle Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Current Station</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-primary-600">
                    {batch.batchNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-700">
                    {batch.productionOrder.orderNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{batch.product.name}</div>
                    {batch.variant && (
                      <div className="text-xs text-slate-500">Variant: {batch.variant.color || ''} {batch.variant.size || ''}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold text-slate-900">
                    {batch.targetQuantity} Pcs
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                    {batch.currentOperation ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 font-mono">
                        {batch.currentOperation.code || batch.currentOperation.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {getStatusBadge(batch.status)}
                  </td>
                </tr>
              ))}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? 'Loading production batches...' : 'No production batches found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Batch Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Bundle Batch">
        <form onSubmit={handleCreateBatch} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700">Select Work Order *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={formData.productionOrderId}
              onChange={(e) => setFormData({ ...formData, productionOrderId: e.target.value })}
            >
              <option value="">-- Choose Production Order --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.product.name} (Total Target: {o.targetQuantity} Pcs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Bundle Batch Size (Pcs) *</label>
            <input
              required
              type="number"
              min="1"
              className="input-field mt-1"
              value={formData.targetQuantity}
              onChange={(e) => setFormData({ ...formData, targetQuantity: e.target.value })}
            />
            <span className="text-xs text-slate-500">Standard garment bundle size (e.g. 25, 50, 100 Pcs).</span>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

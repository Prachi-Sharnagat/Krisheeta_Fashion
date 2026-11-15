import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Eye, Play, CheckCircle2, AlertTriangle, Layers, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../utils/auth';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  status: string;
  startDate?: string;
  dueDate?: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  variant?: {
    id: string;
    name: string;
    color?: string;
    size?: string;
  };
  salesOrder?: {
    id: string;
    orderNumber: string;
  };
  bom?: {
    id: string;
    name: string;
  };
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  variants?: { id: string; name: string; color?: string; size?: string }[];
  boms?: { id: string; name: string; version: string; status: string }[];
  routings?: { id: string; name: string; version: string; status: string }[];
}

export const ProductionOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    bomId: '',
    routingId: '',
    targetQuantity: '100',
    dueDate: '',
    notes: ''
  });
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/production-orders', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error('Failed to fetch production orders', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error('Failed to fetch products', e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, productId, variantId: '', bomId: '', routingId: '' });
    const found = products.find(p => p.id === productId) || null;
    setSelectedProduct(found);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/production-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...formData,
          targetQuantity: parseInt(formData.targetQuantity, 10)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ productId: '', variantId: '', bomId: '', routingId: '', targetQuantity: '100', dueDate: '', notes: '' });
        fetchOrders();
      } else {
        setError(data.error || 'Failed to create production order');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(search) ||
      o.product.name.toLowerCase().includes(search) ||
      (o.salesOrder && o.salesOrder.orderNumber.toLowerCase().includes(search));
    
    const matchesStatus = statusFilter ? o.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <StatusBadge status="info">Planned</StatusBadge>;
      case 'IN_PROGRESS':
        return <StatusBadge status="warning">In Progress</StatusBadge>;
      case 'COMPLETED':
        return <StatusBadge status="success">Completed</StatusBadge>;
      case 'CANCELLED':
        return <StatusBadge status="danger">Cancelled</StatusBadge>;
      default:
        return <StatusBadge status="default">{status}</StatusBadge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Production Work Orders" 
          description="Schedule manufacturing jobs, issue raw materials, and track cutting/sewing progress through completion." 
        />
        <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4 sm:mt-0 flex items-center gap-1">
          <Plus className="h-4 w-4" /> Create Work Order
        </button>
      </div>

      <Card>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Order #, Garment Style, or Sales Order..." 
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
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Work Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Garment / Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Batch Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredOrders.map(order => {
                const percent = Math.min(100, Math.round((order.completedQuantity / order.targetQuantity) * 100));

                return (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/production-orders/${order.id}`)}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-primary-600">
                      {order.orderNumber}
                      {order.salesOrder && (
                        <div className="text-xs text-slate-500 font-normal">SO: {order.salesOrder.orderNumber}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{order.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {order.variant ? `Variant: ${order.variant.color || ''} ${order.variant.size || ''}` : `SKU: ${order.product.sku || '-'}`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm min-w-[180px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">{order.completedQuantity} / {order.targetQuantity} Pcs</span>
                        <span className="text-slate-500">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-primary-600'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right" onClick={e => e.stopPropagation()}>
                      <Link 
                        to={`/production-orders/${order.id}`}
                        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View & Issue
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? 'Loading work orders...' : 'No production orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Order Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Work Order">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700">Select Product / Garment Style *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
            >
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Target Quantity (Pcs) *</label>
              <input
                required
                type="number"
                min="1"
                className="input-field mt-1"
                value={formData.targetQuantity}
                onChange={(e) => setFormData({ ...formData, targetQuantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Target Completion Date</label>
              <input
                type="date"
                className="input-field mt-1"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Production Notes / Work Order Instructions</label>
            <textarea
              rows={2}
              className="input-field mt-1"
              placeholder="e.g. High priority batch for summer season export"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating Order...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

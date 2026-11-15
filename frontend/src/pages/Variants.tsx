import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Layers, 
  Package, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface Variant {
  id: string;
  sku: string;
  name: string;
  color?: string;
  size?: string;
  price?: number;
  status: 'ACTIVE' | 'INACTIVE';
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode?: string;
    sku?: string;
    garmentType?: string;
    category?: string;
  };
}

interface ProductOption {
  id: string;
  name: string;
  productCode?: string;
  sku?: string;
}

export const Variants: React.FC = () => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    sku: '',
    name: '',
    color: '',
    size: '',
    price: '',
    status: 'ACTIVE'
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const navigate = useNavigate();

  // Load products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products', {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (e) {
        console.error('Failed to load products list', e);
      }
    };
    fetchProducts();
  }, []);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        format: 'paginated'
      });
      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (sizeFilter) params.append('size', sizeFilter);
      if (colorFilter) params.append('color', colorFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`http://localhost:5000/api/variants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch variants');
      }

      const resData = await res.json();
      if (resData.pagination) {
        setVariants(resData.data || []);
        setTotalCount(resData.pagination.total || 0);
        setTotalPages(resData.pagination.totalPages || 1);
      } else if (Array.isArray(resData)) {
        setVariants(resData);
        setTotalCount(resData.length);
        setTotalPages(Math.ceil(resData.length / limit) || 1);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading variants');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, sizeFilter, colorFilter, statusFilter]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleOpenAdd = () => {
    setEditingVariant(null);
    setFormData({
      productId: products[0]?.id || '',
      sku: '',
      name: '',
      color: '',
      size: '',
      price: '',
      status: 'ACTIVE'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Variant) => {
    setEditingVariant(v);
    setFormData({
      productId: v.productId,
      sku: v.sku || '',
      name: v.name || '',
      color: v.color || '',
      size: v.size || '',
      price: v.price ? String(v.price) : '',
      status: v.status || 'ACTIVE'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (v: Variant) => {
    const next = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`http://localhost:5000/api/variants/${v.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) {
        setSuccess(`Variant marked as ${next}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchVariants();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to update status');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
  };

  const handleDelete = async (v: Variant) => {
    if (!confirm(`Are you sure you want to delete variant "${v.sku || v.name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/variants/${v.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setSuccess('Variant deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchVariants();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to delete variant');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant && !formData.productId) {
      setModalError('Please select a Product');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload: any = {
        sku: formData.sku.trim() || undefined,
        name: formData.name.trim() || undefined,
        color: formData.color.trim() || null,
        size: formData.size.trim() || null,
        price: formData.price ? parseFloat(formData.price) : 0,
        status: formData.status
      };

      const url = editingVariant
        ? `http://localhost:5000/api/variants/${editingVariant.id}`
        : `http://localhost:5000/api/products/${formData.productId}/variants`;

      const method = editingVariant ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Operation failed');
      }

      setIsModalOpen(false);
      setSuccess(editingVariant ? 'Variant updated successfully' : 'Variant created successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchVariants();
    } catch (e: any) {
      setModalError(e.message || 'Failed to save variant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Product Variants Catalog" 
          description="Global view of all SKUs, colors, sizes, and pricing across your garment styles." 
        />
        {canEdit() && (
          <button onClick={handleOpenAdd} className="btn-primary inline-flex items-center self-start sm:self-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Variant
          </button>
        )}
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative flex items-center bg-slate-50 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-3" />
            <input 
              type="text" 
              placeholder="Search by SKU, Variant Name, or Parent Product..." 
              className="w-full bg-transparent px-3 py-2 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setPage(1); }} className="mr-3 text-xs text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Filter by Size (e.g. M, L)"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none"
              value={sizeFilter}
              onChange={(e) => { setSizeFilter(e.target.value); setPage(1); }}
            />
          </div>

          <div>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Variants Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Variant Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Parent Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Colour</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                {canEdit() && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mr-2 align-middle"></div>
                    Loading variants...
                  </td>
                </tr>
              ) : variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No variants found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or add a variant.</p>
                  </td>
                </tr>
              ) : (
                variants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-slate-900">
                      {v.sku || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                      {v.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600 hover:text-primary-800 cursor-pointer" onClick={() => navigate(`/products/${v.productId}`)}>
                      <div className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        <span>{v.product?.name || 'View Style'}</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs font-medium font-mono">
                        {v.size || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="h-3 w-3 rounded-full border border-slate-300 inline-block" 
                          style={{ backgroundColor: v.color?.toLowerCase() || '#ccc' }}
                        />
                        <span>{v.color || '-'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-700">
                      {v.price ? `₹${v.price.toFixed(2)}` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={v.status === 'ACTIVE' ? 'success' : 'default'}>
                        {v.status}
                      </StatusBadge>
                    </td>
                    {canEdit() && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                        {/* Status Toggle */}
                        <button 
                          title={v.status === 'ACTIVE' ? 'Deactivate Variant' : 'Activate Variant'}
                          className={`p-1 transition-colors ${
                            v.status === 'ACTIVE' ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          onClick={() => handleToggleStatus(v)}
                        >
                          {v.status === 'ACTIVE' ? <ToggleRight className="h-5 w-5 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                        </button>

                        {/* Edit */}
                        <button 
                          title="Edit Variant"
                          className="text-slate-400 hover:text-blue-600 p-1"
                          onClick={() => handleOpenEdit(v)}
                        >
                          <Edit className="h-4 w-4 inline" />
                        </button>

                        {/* Delete */}
                        <button 
                          title="Delete Variant (Safe)"
                          className="text-slate-400 hover:text-red-600 p-1"
                          onClick={() => handleDelete(v)}
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select 
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              Showing {variants.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn-secondary py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="px-3 py-1 font-medium text-slate-700">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="btn-secondary py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Add / Edit Variant Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVariant ? 'Edit Variant' : 'Add New Variant'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {!editingVariant && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Parent Garment Style <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input-field bg-white text-sm"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              >
                <option value="">Select a Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.productCode || p.sku || 'No Code'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variant SKU
            </label>
            <input 
              type="text" 
              placeholder="e.g. STY-001-L-BLK (auto-generated if empty)"
              className="input-field font-mono text-sm"
              value={formData.sku} 
              onChange={e => setFormData({ ...formData, sku: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variant Name / Label
            </label>
            <input 
              type="text" 
              placeholder="e.g. Large / Jet Black"
              className="input-field text-sm"
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
              <input 
                type="text" 
                placeholder="e.g. S, M, L, XL"
                className="input-field text-sm"
                value={formData.size} 
                onChange={e => setFormData({ ...formData, size: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
              <input 
                type="text" 
                placeholder="e.g. Black, White, Navy"
                className="input-field text-sm"
                value={formData.color} 
                onChange={e => setFormData({ ...formData, color: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                className="input-field text-sm"
                value={formData.price} 
                onChange={e => setFormData({ ...formData, price: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select 
                className="input-field bg-white text-sm"
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : editingVariant ? 'Update Variant' : 'Create Variant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Variants;

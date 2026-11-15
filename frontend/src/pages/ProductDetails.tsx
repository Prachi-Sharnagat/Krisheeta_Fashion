import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { BOMView } from '../components/BOMView';
import { RoutingView } from '../components/RoutingView';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Layers, 
  Activity, 
  FileText, 
  Package, 
  Edit, 
  CheckCircle, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface ProductDetailsProps {
  defaultTab?: 'overview' | 'variants' | 'bom' | 'routing';
}

interface VariantItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  size?: string;
  color?: string;
  price?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ defaultTab }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = () => {
    if (location.pathname.endsWith('/bom')) return 'bom';
    if (location.pathname.endsWith('/routing')) return 'routing';
    if (location.pathname.endsWith('/variants')) return 'variants';
    return defaultTab || 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'bom' | 'routing'>(getTabFromPath());
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Variant Modal State (used for both Add and Edit)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    name: '',
    color: '',
    size: '',
    price: '',
    status: 'ACTIVE'
  });
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [variantError, setVariantError] = useState('');

  // Variant Filters
  const [variantSizeFilter, setVariantSizeFilter] = useState('');
  const [variantColorFilter, setVariantColorFilter] = useState('');
  const [variantStatusFilter, setVariantStatusFilter] = useState('');

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname, defaultTab]);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        throw new Error('Product not found or failed to load');
      }
      const data = await res.json();
      setProduct(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleTabChange = (tab: 'overview' | 'variants' | 'bom' | 'routing') => {
    setActiveTab(tab);
    if (tab === 'overview') navigate(`/products/${id}`);
    else navigate(`/products/${id}/${tab}`);
  };

  const handleOpenAddVariant = () => {
    setEditingVariantId(null);
    setVariantForm({
      sku: '',
      name: '',
      color: '',
      size: '',
      price: '',
      status: 'ACTIVE'
    });
    setVariantError('');
    setIsVariantModalOpen(true);
  };

  const handleOpenEditVariant = (variant: VariantItem) => {
    setEditingVariantId(variant.id);
    setVariantForm({
      sku: variant.sku || '',
      name: variant.name || '',
      color: variant.color || '',
      size: variant.size || '',
      price: variant.price !== undefined && variant.price !== null ? String(variant.price) : '',
      status: variant.status || 'ACTIVE'
    });
    setVariantError('');
    setIsVariantModalOpen(true);
  };

  const handleToggleVariantStatus = async (variant: VariantItem) => {
    const nextStatus = variant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`http://localhost:5000/api/variants/${variant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setSuccess(`Variant "${variant.sku || variant.name}" marked as ${nextStatus}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchProduct();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to update variant status');
      }
    } catch (e: any) {
      setError(e.message || 'Network error updating variant');
    }
  };

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setVariantSubmitting(true);
    setVariantError('');

    try {
      const payload: any = {
        sku: variantForm.sku.trim() || undefined,
        name: variantForm.name.trim() || undefined,
        color: variantForm.color.trim() || null,
        size: variantForm.size.trim() || null,
        price: variantForm.price ? parseFloat(variantForm.price) : 0,
        status: variantForm.status
      };

      const url = editingVariantId
        ? `http://localhost:5000/api/variants/${editingVariantId}`
        : `http://localhost:5000/api/products/${id}/variants`;

      const method = editingVariantId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (editingVariantId ? 'Failed to update variant' : 'Failed to create variant'));
      }

      setIsVariantModalOpen(false);
      setSuccess(editingVariantId ? 'Variant updated successfully' : 'Variant added successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchProduct();
    } catch (e: any) {
      setVariantError(e.message || 'Failed to save variant');
    } finally {
      setVariantSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variant: VariantItem) => {
    if (!confirm(`Are you sure you want to delete variant "${variant.sku || variant.name}"?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/variants/${variant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (res.ok) {
        setSuccess('Variant deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchProduct();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to delete variant');
      }
    } catch (e: any) {
      setError(e.message || 'Error deleting variant');
    }
  };

  const handleArchiveProduct = async () => {
    if (!product) return;
    const newStatus = product.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const actionLabel = newStatus === 'ARCHIVED' ? 'archive' : 'unarchive';
    if (!confirm(`Are you sure you want to ${actionLabel} this product?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setSuccess(`Product ${actionLabel}d successfully`);
        setTimeout(() => setSuccess(''), 3000);
        fetchProduct();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Failed to ${actionLabel} product`);
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary-600 border-t-transparent mb-2"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate('/products')} className="btn-secondary">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products Catalog
        </button>
      </div>
    );
  }

  // Filter product variants on frontend
  const filteredVariants: VariantItem[] = (product.variants || []).filter((v: VariantItem) => {
    if (variantSizeFilter && v.size !== variantSizeFilter) return false;
    if (variantColorFilter && v.color !== variantColorFilter) return false;
    if (variantStatusFilter && v.status !== variantStatusFilter) return false;
    return true;
  });

  // Extract unique available sizes and colors for filter dropdowns
  const availableSizes = Array.from(new Set((product.variants || []).map((v: VariantItem) => v.size).filter(Boolean)));
  const availableColors = Array.from(new Set((product.variants || []).map((v: VariantItem) => v.color).filter(Boolean)));

  const getStatusBadgeType = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'ARCHIVED': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader 
            title={product.name} 
            description={product.description || `Style Code: ${product.productCode || product.sku || '-'}`} 
          />
        </div>

        {canEdit() && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/products/${product.id}/edit`)}
              className="btn-secondary inline-flex items-center text-sm"
            >
              <Edit className="h-4 w-4 mr-1.5" /> Edit Product
            </button>
            <button
              onClick={handleArchiveProduct}
              className="btn-secondary inline-flex items-center text-sm text-slate-600 hover:text-amber-700"
              title={product.status === 'ARCHIVED' ? 'Restore Product' : 'Archive Product'}
            >
              {product.status === 'ARCHIVED' ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-1.5 text-amber-600" /> Unarchive
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-1.5" /> Archive
                </>
              )}
            </button>
          </div>
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

      {/* Navigation Tabs Header */}
      <div className="border-b border-slate-200 bg-white px-4 rounded-xl border shadow-sm">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="h-4 w-4" /> Overview
          </button>

          <button
            onClick={() => handleTabChange('variants')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'variants'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Layers className="h-4 w-4" /> Variants ({product.variants?.length || 0})
          </button>

          <button
            onClick={() => handleTabChange('bom')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bom'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" /> BOM
          </button>

          <button
            onClick={() => handleTabChange('routing')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'routing'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Activity className="h-4 w-4" /> Routing
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-slate-500">Product Code</h3>
              <p className="mt-1 text-lg font-mono font-semibold text-slate-900">{product.productCode || product.sku || '-'}</p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-slate-500">Garment Type</h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">{product.garmentType ? product.garmentType.replace('_', ' ') : '-'}</p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-slate-500">Category</h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">{product.category || 'Standard'}</p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-slate-500">Status</h3>
              <div className="mt-1">
                <StatusBadge status={getStatusBadgeType(product.status)}>{product.status}</StatusBadge>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-base font-semibold text-slate-900 mb-4">Detailed Specifications</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Product Name</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{product.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Slug Identifier</dt>
                <dd className="mt-1 text-sm font-mono text-slate-700">{product.slug || '-'}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Total Variants Configured</dt>
                <dd className="mt-1 text-sm text-slate-900 font-semibold">{product.variants?.length || 0} variant(s)</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Historical Sales Orders</dt>
                <dd className="mt-1 text-sm text-slate-900">{product._count?.salesOrderItems || 0} order item(s)</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">Description / Technical Notes</dt>
                <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {product.description || 'No description provided for this garment style.'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Created Date</dt>
                <dd className="mt-1 text-sm text-slate-900">{new Date(product.createdAt).toLocaleString()}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Last Modified</dt>
                <dd className="mt-1 text-sm text-slate-900">{new Date(product.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {/* Tab 2: Variants Management */}
      {activeTab === 'variants' && (
        <Card className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Product Variants</h3>
              <p className="text-xs text-slate-500">Manage SKUs, sizes, colors, and statuses for this style.</p>
            </div>
            {canEdit() && (
              <button 
                onClick={handleOpenAddVariant} 
                className="btn-primary text-sm inline-flex items-center self-start sm:self-auto"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Variant
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Size</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs outline-none"
                value={variantSizeFilter}
                onChange={(e) => setVariantSizeFilter(e.target.value)}
              >
                <option value="">All Sizes</option>
                {availableSizes.map((s: any) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Colour</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs outline-none"
                value={variantColorFilter}
                onChange={(e) => setVariantColorFilter(e.target.value)}
              >
                <option value="">All Colours</option>
                {availableColors.map((c: any) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Status</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs outline-none"
                value={variantStatusFilter}
                onChange={(e) => setVariantStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Variants Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Variant Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Colour</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                  {canEdit() && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredVariants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-slate-900">
                      {variant.sku || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                      {variant.name || `${product.name} (${variant.size || ''}/${variant.color || ''})`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs font-medium font-mono">
                        {variant.size || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="h-3 w-3 rounded-full border border-slate-300 inline-block" 
                          style={{ backgroundColor: variant.color?.toLowerCase() || '#ccc' }}
                        />
                        <span>{variant.color || '-'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-700">
                      {variant.price ? `₹${variant.price.toFixed(2)}` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={variant.status === 'ACTIVE' ? 'success' : 'default'}>
                        {variant.status}
                      </StatusBadge>
                    </td>
                    {canEdit() && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                        {/* Status Toggle Button */}
                        <button 
                          title={variant.status === 'ACTIVE' ? 'Deactivate Variant' : 'Activate Variant'}
                          className={`p-1 transition-colors ${
                            variant.status === 'ACTIVE' ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          onClick={() => handleToggleVariantStatus(variant)}
                        >
                          {variant.status === 'ACTIVE' ? (
                            <ToggleRight className="h-5 w-5 inline" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 inline" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button 
                          title="Edit Variant"
                          className="text-slate-400 hover:text-blue-600 p-1"
                          onClick={() => handleOpenEditVariant(variant)}
                        >
                          <Edit className="h-4 w-4 inline" />
                        </button>

                        {/* Safe Delete Button */}
                        <button 
                          title="Delete Variant (Safe)"
                          className="text-slate-400 hover:text-red-600 p-1"
                          onClick={() => handleDeleteVariant(variant)}
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredVariants.length === 0 && (
                  <tr>
                    <td colSpan={canEdit() ? 7 : 6} className="px-4 py-10 text-center text-sm text-slate-500">
                      <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No variants match current filters.</p>
                      {product.variants?.length === 0 && canEdit() && (
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Variant" to configure sizes and colors for this style.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: BOM */}
      {activeTab === 'bom' && (
        <BOMView productId={product.id} productName={product.name} />
      )}

      {/* Tab 4: Routing */}
      {activeTab === 'routing' && (
        <RoutingView productId={product.id} productName={product.name} />
      )}

      {/* Variant Add/Edit Modal */}
      <Modal 
        isOpen={isVariantModalOpen} 
        onClose={() => setIsVariantModalOpen(false)} 
        title={editingVariantId ? 'Edit Product Variant' : 'Add New Variant'}
      >
        <form onSubmit={handleSubmitVariant} className="space-y-4">
          {variantError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{variantError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">SKU (Stock Keeping Unit)</label>
            <input 
              type="text" 
              placeholder={`e.g. ${product.productCode || product.sku || 'PRD'}-M-BLU (auto-generated if empty)`}
              className="input-field mt-1 font-mono text-sm" 
              value={variantForm.sku} 
              onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} 
            />
            <p className="text-xs text-slate-400 mt-1">Must be unique within your company.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Variant Name / Label</label>
            <input 
              type="text" 
              placeholder="e.g. Medium / Navy Blue" 
              className="input-field mt-1 text-sm" 
              value={variantForm.name} 
              onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Size</label>
              <input 
                type="text" 
                placeholder="e.g. S, M, L, XL, 32, 34" 
                className="input-field mt-1 text-sm" 
                value={variantForm.size} 
                onChange={e => setVariantForm({ ...variantForm, size: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Colour</label>
              <input 
                type="text" 
                placeholder="e.g. Navy Blue, Heather Grey" 
                className="input-field mt-1 text-sm" 
                value={variantForm.color} 
                onChange={e => setVariantForm({ ...variantForm, color: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Unit Selling Price</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                className="input-field mt-1 text-sm" 
                value={variantForm.price} 
                onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select 
                className="input-field mt-1 bg-white text-sm" 
                value={variantForm.status} 
                onChange={e => setVariantForm({ ...variantForm, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsVariantModalOpen(false)} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={variantSubmitting} 
              className="btn-primary"
            >
              {variantSubmitting ? 'Saving...' : editingVariantId ? 'Update Variant' : 'Create Variant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductDetails;
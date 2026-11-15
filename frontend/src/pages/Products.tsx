import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Layers, 
  Archive, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Activity,
  ArchiveRestore
} from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface Product {
  id: string;
  productCode?: string;
  name: string;
  slug?: string;
  description?: string;
  sku?: string;
  category?: string;
  garmentType?: string;
  finishedGoodsStock?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  variants?: any[];
  _count?: {
    variants: number;
    salesOrderItems?: number;
    boms?: number;
  };
}

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtering, Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [garmentTypeFilter, setGarmentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Overall Counts for KPI Cards
  const [kpiCounts, setKpiCounts] = useState({ total: 0, active: 0, inactive: 0, archived: 0 });

  const navigate = useNavigate();

  const fetchKpis = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list: Product[] = Array.isArray(data) ? data : (data.data || []);
        const total = list.length;
        const active = list.filter(p => p.status === 'ACTIVE').length;
        const inactive = list.filter(p => p.status === 'INACTIVE').length;
        const archived = list.filter(p => p.status === 'ARCHIVED').length;
        setKpiCounts({ total, active, inactive, archived });
      }
    } catch (e) {
      console.error('Failed to fetch KPI counts', e);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        format: 'paginated'
      });

      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (garmentTypeFilter) params.append('garmentType', garmentTypeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`http://localhost:5000/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load products');
      }

      const resData = await res.json();
      if (resData.pagination) {
        setProducts(resData.data || []);
        setTotalPages(resData.pagination.totalPages || 1);
        setTotalCount(resData.pagination.total || 0);
      } else if (Array.isArray(resData)) {
        setProducts(resData);
        setTotalCount(resData.length);
        setTotalPages(Math.ceil(resData.length / limit) || 1);
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching products catalog');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, garmentTypeFilter, statusFilter]);

  useEffect(() => {
    fetchKpis();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const actionLabel = newStatus === 'ARCHIVED' ? 'archive' : 'unarchive';
    if (!confirm(`Are you sure you want to ${actionLabel} this product?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setSuccessMessage(`Product successfully ${actionLabel}d`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchProducts();
        fetchKpis();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Failed to ${actionLabel} product`);
      }
    } catch (e: any) {
      setError(e.message || `Failed to ${actionLabel} product`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (res.ok) {
        setSuccessMessage(`Product "${name}" deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchProducts();
        fetchKpis();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to delete product');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to delete product');
    }
  };

  const getStatusBadgeType = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'ARCHIVED': return 'default';
      default: return 'default';
    }
  };

  const formatGarmentType = (gt?: string) => {
    if (!gt) return '-';
    return gt.replace('_', ' ');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Garment Products Catalog" 
          description="Manage your garment styles, standard product codes, categories, and linked variants." 
        />
        {canEdit() && (
          <button 
            onClick={() => navigate('/products/new')}
            className="btn-primary inline-flex items-center self-start sm:self-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Products</p>
            <p className="text-2xl font-bold text-slate-900">{kpiCounts.total}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Products</p>
            <p className="text-2xl font-bold text-emerald-600">{kpiCounts.active}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Inactive Products</p>
            <p className="text-2xl font-bold text-amber-600">{kpiCounts.inactive}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Archived Products</p>
            <p className="text-2xl font-bold text-slate-600">{kpiCounts.archived}</p>
          </div>
        </Card>
      </div>

      {/* Filters & Search Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="md:col-span-2 relative flex items-center bg-slate-50 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-3" />
            <input 
              type="text" 
              placeholder="Search by Product Name, Code, SKU, Category..." 
              className="w-full bg-transparent px-3 py-2 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => { setSearchTerm(''); setPage(1); }} 
                className="mr-3 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Garment Type Filter */}
          <div>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
              value={garmentTypeFilter}
              onChange={(e) => {
                setGarmentTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Garment Types</option>
              <option value="T_SHIRT">T-Shirt</option>
              <option value="SHIRT">Shirt</option>
              <option value="TROUSER">Trouser</option>
              <option value="JEANS">Jeans</option>
              <option value="JACKET">Jacket</option>
              <option value="DRESS">Dress</option>
              <option value="HOODIE">Hoodie</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Product Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Garment Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Variants</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mr-2 align-middle"></div>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || garmentTypeFilter || statusFilter 
                        ? 'Try adjusting your search criteria or clearing filters.' 
                        : 'Get started by creating your first garment style.'}
                    </p>
                    {canEdit() && !searchTerm && !garmentTypeFilter && !statusFilter && (
                      <button 
                        onClick={() => navigate('/products/new')} 
                        className="btn-primary mt-4 text-xs"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5 inline" /> Add Product
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const variantCount = product._count?.variants ?? product.variants?.length ?? 0;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-slate-900">
                        {product.productCode || product.sku || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-600 hover:text-primary-800 cursor-pointer" onClick={() => navigate(`/products/${product.id}`)}>
                        <div>{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">{product.description}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {formatGarmentType(product.garmentType)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {product.category || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-center">
                        <button 
                          onClick={() => navigate(`/products/${product.id}/variants`)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{variantCount} variant{variantCount === 1 ? '' : 's'}</span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <StatusBadge status={getStatusBadgeType(product.status)}>
                          {product.status}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                        {/* View Action */}
                        <button 
                          title="View Details"
                          className="text-slate-400 hover:text-primary-600 transition-colors p-1"
                          onClick={() => navigate(`/products/${product.id}`)}
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>

                        {/* Edit Action */}
                        {canEdit() && (
                          <button 
                            title="Edit Product"
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 inline" />
                          </button>
                        )}

                        {/* Manage Variants Action */}
                        <button 
                          title="Manage Variants"
                          className="text-slate-400 hover:text-purple-600 transition-colors p-1"
                          onClick={() => navigate(`/products/${product.id}/variants`)}
                        >
                          <Layers className="h-4 w-4 inline" />
                        </button>

                        {/* Archive / Unarchive Action */}
                        {canEdit() && (
                          <button 
                            title={product.status === 'ARCHIVED' ? 'Restore / Unarchive' : 'Archive Product'}
                            className="text-slate-400 hover:text-amber-600 transition-colors p-1"
                            onClick={() => handleArchive(product.id, product.status)}
                          >
                            {product.status === 'ARCHIVED' ? (
                              <ArchiveRestore className="h-4 w-4 inline text-amber-600" />
                            ) : (
                              <Archive className="h-4 w-4 inline" />
                            )}
                          </button>
                        )}

                        {/* Delete Action (guarded) */}
                        {canEdit() && (
                          <button 
                            title="Delete Product (Safe)"
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            onClick={() => handleDelete(product.id, product.name)}
                          >
                            <Trash2 className="h-4 w-4 inline" />
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

        {/* Pagination Controls */}
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
              Showing {products.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} records
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
    </div>
  );
};

export default Products;
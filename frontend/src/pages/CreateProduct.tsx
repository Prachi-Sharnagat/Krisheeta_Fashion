import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { getToken } from '../utils/auth';

export const GARMENT_TYPES = [
  { value: 'T_SHIRT', label: 'T-Shirt' },
  { value: 'SHIRT', label: 'Shirt' },
  { value: 'TROUSER', label: 'Trouser' },
  { value: 'JEANS', label: 'Jeans' },
  { value: 'JACKET', label: 'Jacket' },
  { value: 'DRESS', label: 'Dress' },
  { value: 'HOODIE', label: 'Hoodie' },
  { value: 'OTHER', label: 'Other' },
];

export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const CreateProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    productCode: '',
    name: '',
    description: '',
    category: '',
    garmentType: 'T_SHIRT',
    status: 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode && id) {
      const fetchProduct = async () => {
        setInitialLoading(true);
        try {
          const res = await fetch(`http://localhost:5000/api/products/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (!res.ok) {
            throw new Error('Product not found or failed to load');
          }
          const data = await res.json();
          setFormData({
            productCode: data.productCode || data.sku || '',
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            garmentType: data.garmentType || 'T_SHIRT',
            status: data.status || 'ACTIVE'
          });
        } catch (e: any) {
          setError(e.message || 'Failed to load product details');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Product Name is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = isEditMode
        ? `http://localhost:5000/api/products/${id}`
        : 'http://localhost:5000/api/products';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const payload = {
        name: formData.name.trim(),
        productCode: formData.productCode.trim() || undefined,
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        garmentType: formData.garmentType || null,
        status: formData.status
      };

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
        throw new Error(resData.error || (isEditMode ? 'Failed to update product' : 'Failed to create product'));
      }

      setSuccess(isEditMode ? 'Product updated successfully!' : 'Product created successfully!');
      setTimeout(() => {
        navigate(`/products/${resData.id || id}`);
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary-600 border-t-transparent mb-2"></div>
        <p>Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader
            title={isEditMode ? `Edit Product: ${formData.name || 'Style'}` : 'Create New Garment Product'}
            description={
              isEditMode 
                ? 'Update garment product master data, style codes, and classifications.'
                : 'Define a new garment style master record for your production catalog.'
            }
          />
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-600" />
              General Information
            </h3>
            <p className="text-xs text-slate-500 mt-1">Basic identifiers and description of the garment item.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Code / Style Code
              </label>
              <input
                type="text"
                placeholder="e.g. STY-2026-TSH01 (auto-generated if blank)"
                className="input-field font-mono text-sm"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1">Unique style code within your company.</p>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Premium Cotton Crewneck T-Shirt"
                className="input-field text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Garment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Garment Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field bg-white text-sm"
                value={formData.garmentType}
                onChange={(e) => setFormData({ ...formData, garmentType: e.target.value })}
              >
                {GARMENT_TYPES.map((gt) => (
                  <option key={gt.value} value={gt.value}>{gt.label}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Menswear, Summer 2026"
                className="input-field text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field bg-white text-sm"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {PRODUCT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description / Tech Notes
            </label>
            <textarea
              rows={4}
              placeholder="Technical specifications, fabric blend notes, styling instructions..."
              className="input-field text-sm resize-y"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default CreateProduct;

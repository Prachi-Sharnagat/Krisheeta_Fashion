import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ProductWith3D } from '../features/garment3d/types';
import { getToken, getUser } from '../utils/auth';
import { Box, Plus, Edit2, Trash2, Eye, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Garment3DManage = () => {
  const [products, setProducts] = useState<ProductWith3D[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [modelUrl, setModelUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [defaultColor, setDefaultColor] = useState<string>('#1e293b');
  const [scale, setScale] = useState<number>(1.0);
  const [status, setStatus] = useState<string>('ACTIVE');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const user = getUser();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/3d-garments', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch 3D model configurations');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Error fetching 3D configurations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (p: ProductWith3D) => {
    setSelectedProductId(p.id);
    if (p.product3dModel) {
      setEditingConfigId(p.product3dModel.id);
      setModelUrl(p.product3dModel.modelUrl || '');
      setThumbnailUrl(p.product3dModel.thumbnailUrl || '');
      setDefaultColor(p.product3dModel.defaultColor || '#1e293b');
      setScale(p.product3dModel.scale || 1.0);
      setStatus(p.product3dModel.status || 'ACTIVE');
    } else {
      setEditingConfigId(null);
      setModelUrl('');
      setThumbnailUrl('');
      setDefaultColor('#1e293b');
      setScale(1.0);
      setStatus('ACTIVE');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setSelectedProductId('');
    setEditingConfigId(null);
    setModelUrl('');
    setThumbnailUrl('');
    setDefaultColor('#1e293b');
    setScale(1.0);
    setStatus('ACTIVE');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!selectedProductId || !modelUrl) {
      setMsg({ type: 'error', text: 'Please select a product and enter a GLB model URL.' });
      return;
    }

    setSubmitLoading(true);
    setMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/3d-garments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          modelUrl,
          thumbnailUrl,
          defaultColor,
          scale,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save 3D model configuration');

      setMsg({ type: 'success', text: '3D model configuration saved successfully!' });
      handleResetForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!canEdit || !window.confirm('Are you sure you want to delete this 3D model configuration?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/3d-garments/${configId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to delete configuration');
      setMsg({ type: 'success', text: '3D model configuration deleted successfully.' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Delete operation failed' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Model Configuration & Asset Management"
        description="Link 3D GLB/GLTF models, thumbnails, and default parameters to ERP products."
        actions={
          <Link
            to="/3d-garment"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-lg shadow-sm transition"
          >
            <Eye className="h-4 w-4" /> Open 3D Studio
          </Link>
        }
      />

      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-red-600" />
          )}
          {msg.text}
        </div>
      )}

      {/* Admin Form Section */}
      {canEdit && (
        <Card title={editingConfigId ? 'Edit 3D Model Configuration' : 'Configure New 3D Garment Asset'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) handleEditClick(prod);
                  }}
                  required
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">-- Select ERP Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || 'No SKU'}) {p.product3dModel ? '✓ [Has 3D]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GLB / GLTF Model URL *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/models/tshirt.glb"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/thumbnails/tshirt.jpg"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Default Color Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={defaultColor}
                    onChange={(e) => setDefaultColor(e.target.value)}
                    className="w-10 h-10 rounded border border-slate-300 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={defaultColor}
                    onChange={(e) => setDefaultColor(e.target.value)}
                    className="w-full text-xs font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Model Scale Multiplier ({scale}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {submitLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {editingConfigId ? 'Update Configuration' : 'Save 3D Configuration'}
              </button>
              {editingConfigId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* Configured Products Table */}
      <Card title="Product 3D Model Configurations">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading 3D asset directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">3D Asset Link</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Default Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Scale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-xs">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sku || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-600 text-xs">
                        {p.product3dModel?.modelUrl ? (
                          <span className="font-mono text-xs text-purple-600 truncate block">
                            {p.product3dModel.modelUrl}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Procedural Mesh</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.product3dModel?.defaultColor ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                              style={{ backgroundColor: p.product3dModel.defaultColor }}
                            />
                            <span className="font-mono text-xs">{p.product3dModel.defaultColor}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {p.product3dModel?.scale ? `${p.product3dModel.scale}x` : '1.0x'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.product3dModel?.status === 'ACTIVE' ? 'success' : 'default'}>
                          {p.product3dModel?.status || 'UNCONFIGURED'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEditClick(p)}
                            title="Edit Configuration"
                            className="p-1 text-slate-500 hover:text-purple-600 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && p.product3dModel && (
                          <button
                            onClick={() => handleDelete(p.product3dModel!.id)}
                            title="Delete Configuration"
                            className="p-1 text-slate-500 hover:text-red-600 transition"
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
        )}
      </Card>
    </div>
  );
};

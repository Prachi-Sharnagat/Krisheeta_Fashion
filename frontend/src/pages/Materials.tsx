import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Trash2 } from 'lucide-react';
import { getToken } from '../utils/auth';

interface Material {
  id: string;
  name: string;
  materialCode: string;
  category: string;
  unit: string;
  minimumStockLevel: number;
  currentStock: number;
  status: string;
}

export const Materials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', materialCode: '', category: '', unit: '', minimumStockLevel: '0', currentStock: '0', status: 'ACTIVE' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchMaterials = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/materials', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setMaterials(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { 
        ...formData, 
        minimumStockLevel: parseFloat(formData.minimumStockLevel || '0'),
        currentStock: parseFloat(formData.currentStock || '0')
      };
      const res = await fetch('http://localhost:5000/api/materials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', materialCode: '', category: '', unit: '', minimumStockLevel: '0', currentStock: '0', status: 'ACTIVE' });
        fetchMaterials();
      } else {
        setError(data.error || 'Failed to create material');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await fetch(`http://localhost:5000/api/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchMaterials();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.materialCode && m.materialCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory ? m.category === filterCategory : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader title="Materials Inventory" description="Manage your raw materials, live stock levels, and reorder thresholds." />
        <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </button>
      </div>

      <Card>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Name or Code..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-field sm:w-48 bg-white" 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Fabric">Fabric</option>
            <option value="Thread">Thread</option>
            <option value="Button">Button</option>
            <option value="Zipper">Zipper</option>
            <option value="Label">Label</option>
            <option value="Packaging">Packaging</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Name / Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Current Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Min Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredMaterials.map(mat => {
                const isLowStock = (mat.currentStock || 0) < (mat.minimumStockLevel || 0);
                return (
                  <tr key={mat.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{mat.name}</div>
                      <div className="text-xs text-slate-500">{mat.materialCode || '-'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{mat.category || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{mat.unit || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">
                      <span className={isLowStock ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-900'}>
                        {mat.currentStock || 0} {mat.unit}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{mat.minimumStockLevel || 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={mat.status === 'ACTIVE' ? 'success' : 'default'}>{mat.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right">
                      <button className="text-slate-400 hover:text-red-600" onClick={() => deleteMaterial(mat.id)}>
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No materials found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Material">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Material Name *</label>
            <input required type="text" className="input-field mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Material Code</label>
              <input type="text" className="input-field mt-1" value={formData.materialCode} onChange={e => setFormData({...formData, materialCode: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Category</label>
              <select className="input-field mt-1 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="">Select Category</option>
                <option value="Fabric">Fabric</option>
                <option value="Thread">Thread</option>
                <option value="Button">Button</option>
                <option value="Zipper">Zipper</option>
                <option value="Label">Label</option>
                <option value="Packaging">Packaging</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Unit</label>
              <select className="input-field mt-1 bg-white" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                <option value="">Select Unit</option>
                <option value="Meter">Meter</option>
                <option value="Kg">Kg</option>
                <option value="Piece">Piece</option>
                <option value="Roll">Roll</option>
                <option value="Cone">Cone</option>
                <option value="Gross">Gross</option>
                <option value="Box">Box</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Initial Stock</label>
              <input type="number" step="any" className="input-field mt-1" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Min Stock</label>
              <input type="number" step="any" className="input-field mt-1" value={formData.minimumStockLevel} onChange={e => setFormData({...formData, minimumStockLevel: e.target.value})} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

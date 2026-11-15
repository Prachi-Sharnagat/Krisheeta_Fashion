import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Eye, Edit2, Trash2, Building2, UserCheck, Mail, Phone } from 'lucide-react';
import { getToken } from '../utils/auth';

export interface Supplier {
  id: string;
  name: string;
  supplierCode?: string | null;
  companyName?: string | null;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status: string;
  createdAt: string;
}

export const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const initialFormState = {
    name: '',
    supplierCode: '',
    companyName: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    status: 'ACTIVE'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchSuppliers = async () => {
    setFetching(true);
    try {
      const res = await fetch('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData(initialFormState);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name || '',
      supplierCode: s.supplierCode || '',
      companyName: s.companyName || '',
      contact: s.contact || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      country: s.country || '',
      status: s.status || 'ACTIVE'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation
    if (!formData.name.trim()) {
      setError('Supplier name is required');
      setLoading(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const url = editingSupplier
        ? `http://localhost:5000/api/suppliers/${editingSupplier.id}`
        : 'http://localhost:5000/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData(initialFormState);
        setEditingSupplier(null);
        fetchSuppliers();
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteId(null);
        fetchSuppliers();
      } else {
        alert(data.error || 'Failed to delete supplier');
      }
    } catch (e) {
      alert('Network error while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) || 
                          (s.supplierCode && s.supplierCode.toLowerCase().includes(q)) ||
                          (s.companyName && s.companyName.toLowerCase().includes(q)) ||
                          (s.contact && s.contact.toLowerCase().includes(q)) ||
                          (s.email && s.email.toLowerCase().includes(q)) ||
                          (s.phone && s.phone.toLowerCase().includes(q));
    const matchesStatus = filterStatus ? s.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader title="Suppliers" description="Manage raw material vendors, suppliers, and procurement contacts." />
        <button onClick={handleOpenAddModal} className="btn-primary mt-4 sm:mt-0 flex items-center">
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </button>
      </div>

      <Card>
        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Name, Code, Company, Contact Person, Email, Phone..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-field sm:w-48 bg-white" 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Company / Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Contact Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Loading suppliers...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No suppliers found.</td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-primary-600 font-mono">{s.supplierCode || 'NO CODE'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <div className="space-y-0.5">
                        {s.companyName && (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {s.companyName}
                          </div>
                        )}
                        {s.contact && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <UserCheck className="h-3 w-3 text-slate-400" /> {s.contact}
                          </div>
                        )}
                        {!s.companyName && !s.contact && <span className="text-slate-400 italic">-</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-col text-xs space-y-0.5">
                        {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {s.email}</span>}
                        {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {s.phone}</span>}
                        {!s.email && !s.phone && <span className="text-slate-400 italic">-</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {[s.city, s.state, s.country].filter(Boolean).join(', ') || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={s.status === 'ACTIVE' ? 'success' : 'default'}>{s.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                      <button 
                        title="View Details"
                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                        onClick={() => navigate(`/suppliers/${s.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        title="Edit Supplier"
                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors" 
                        onClick={() => handleOpenEditModal(s)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        title="Delete Supplier"
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Supplier Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier Name *</label>
              <input 
                required 
                type="text" 
                className="input-field mt-1" 
                placeholder="e.g. Apex Textiles"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier Code</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="e.g. SUP-100"
                value={formData.supplierCode} 
                onChange={e => setFormData({...formData, supplierCode: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Company Name</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="e.g. Apex Fabrics Ltd"
                value={formData.companyName} 
                onChange={e => setFormData({...formData, companyName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contact Person</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="e.g. John Doe (Account Manager)"
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input 
                type="email" 
                className="input-field mt-1" 
                placeholder="sales@apextextiles.com"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone Number</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="+1 555-0188"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select 
                className="input-field mt-1 bg-white" 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Street Address</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="456 Mill Street"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">City</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="Boston"
                value={formData.city} 
                onChange={e => setFormData({...formData, city: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State / Region</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="MA"
                value={formData.state} 
                onChange={e => setFormData({...formData, state: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Country</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                placeholder="USA"
                value={formData.country} 
                onChange={e => setFormData({...formData, country: e.target.value})} 
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this supplier? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {loading ? 'Deleting...' : 'Delete Supplier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ArrowLeft, Building2, UserCheck, Mail, Phone, MapPin, Calendar, Edit2, Trash2, ClipboardCheck } from 'lucide-react';
import { getToken } from '../utils/auth';
import { Supplier } from './Suppliers';

export const SupplierDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', supplierCode: '', companyName: '', contact: '', email: '', phone: '', address: '', city: '', state: '', country: '', status: 'ACTIVE'
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSupplierDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
        setFormData({
          name: data.name || '',
          supplierCode: data.supplierCode || '',
          companyName: data.companyName || '',
          contact: data.contact || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          status: data.status || 'ACTIVE'
        });
      } else {
        setError('Supplier not found');
      }
    } catch (e) {
      setError('Network error loading supplier details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSupplierDetails();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Supplier name is required');
      setSaving(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setFormError('Please enter a valid email address');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditOpen(false);
        fetchSupplierDetails();
      } else {
        setFormError(data.error || 'Failed to update supplier');
      }
    } catch (e) {
      setFormError('Network error while updating');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        navigate('/suppliers');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete supplier');
      }
    } catch (e) {
      alert('Network error deleting supplier');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading supplier information...
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate('/suppliers')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
        </button>
        <Card>
          <div className="p-8 text-center text-red-600">
            {error || 'Supplier not found'}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={() => navigate('/suppliers')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsEditOpen(true)} className="btn-secondary flex items-center">
            <Edit2 className="mr-2 h-4 w-4" /> Edit Supplier
          </button>
          <button onClick={() => setIsDeleteOpen(true)} className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-md font-medium text-sm flex items-center">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* Header Info */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
              <StatusBadge status={supplier.status === 'ACTIVE' ? 'success' : 'default'}>
                {supplier.status}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm font-mono text-primary-600">
              Code: {supplier.supplierCode || 'N/A'}
            </p>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Created on {new Date(supplier.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Information Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Details */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" /> Company / Representative
            </h3>
            <div>
              <p className="text-xs text-slate-500">Company Name</p>
              <p className="text-sm font-medium text-slate-800">{supplier.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contact Person</p>
              <p className="text-sm font-medium text-slate-800">{supplier.contact || '-'}</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" /> Contact Info
            </h3>
            <div>
              <p className="text-xs text-slate-500">Email Address</p>
              <p className="text-sm font-medium text-slate-800">{supplier.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Phone Number</p>
              <p className="text-sm font-medium text-slate-800">{supplier.phone || '-'}</p>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" /> Location / Address
            </h3>
            <div>
              <p className="text-xs text-slate-500">Street Address</p>
              <p className="text-sm font-medium text-slate-800">{supplier.address || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">City, State, Country</p>
              <p className="text-sm font-medium text-slate-800">
                {[supplier.city, supplier.state, supplier.country].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Placeholder Section for Future Purchase Orders */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">Purchase Orders</h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Coming Soon</span>
        </div>
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50/50">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-700">No Purchase Orders Issued Yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Purchase orders and material fulfillment records from {supplier.name} will be tracked here in future modules.
          </p>
        </div>
      </Card>

      {/* Edit Supplier Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Supplier Details">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{formError}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier Name *</label>
              <input required type="text" className="input-field mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier Code</label>
              <input type="text" className="input-field mt-1" value={formData.supplierCode} onChange={e => setFormData({...formData, supplierCode: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Company Name</label>
              <input type="text" className="input-field mt-1" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contact Person</label>
              <input type="text" className="input-field mt-1" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input type="email" className="input-field mt-1" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone Number</label>
              <input type="text" className="input-field mt-1" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field mt-1 bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Street Address</label>
              <input type="text" className="input-field mt-1" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">City</label>
              <input type="text" className="input-field mt-1" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State</label>
              <input type="text" className="input-field mt-1" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Country</label>
              <input type="text" className="input-field mt-1" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Supplier Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete supplier <strong className="text-slate-900">{supplier.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Supplier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

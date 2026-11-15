import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Plus, Search, Eye, Edit2, Trash2, Calendar, Truck, 
  Clock, CheckCircle2, AlertTriangle, PackageCheck, Send, AlertCircle 
} from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';

interface ShipmentItem {
  id: string;
  quantity: number;
  unit: string;
  product?: { name: string; sku?: string };
  variant?: { name: string; color?: string; size?: string };
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  salesOrder?: { orderNumber: string; status: string };
  customerId: string;
  customer?: { name: string; companyName?: string };
  warehouseId?: string;
  shipmentDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  shippingAddress?: string;
  notes?: string;
  items: ShipmentItem[];
  createdAt: string;
}

export const Shipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchShipments = async () => {
    setFetching(true);
    try {
      let url = 'http://localhost:5000/api/shipments?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (customerFilter) url += `customerId=${encodeURIComponent(customerFilter)}&`;
      if (dateFromFilter) url += `dateFrom=${encodeURIComponent(dateFromFilter)}&`;
      if (dateToFilter) url += `dateTo=${encodeURIComponent(dateToFilter)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setShipments(await res.json());
      }
    } catch (e) {
      console.error('Error fetching shipments:', e);
    } finally {
      setFetching(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customers', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchCustomers();
  }, [statusFilter, customerFilter, dateFromFilter, dateToFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/shipments/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchShipments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete shipment');
      }
    } catch (e) {
      alert('Network error deleting shipment');
    } finally {
      setDeleting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  // Compute Dispatch Dashboard Metrics
  const readyCount = shipments.filter(s => s.status === 'READY').length;
  const dispatchedCount = shipments.filter(s => s.status === 'DISPATCHED').length;
  const inTransitCount = shipments.filter(s => s.status === 'IN_TRANSIT').length;
  const deliveredCount = shipments.filter(s => s.status === 'DELIVERED').length;
  const pendingCount = shipments.filter(s => ['DRAFT', 'READY'].includes(s.status)).length;
  const delayedCount = shipments.filter(s => 
    s.expectedDeliveryDate && 
    s.expectedDeliveryDate.slice(0, 10) < today && 
    !['DELIVERED', 'CANCELLED'].includes(s.status)
  ).length;

  // Search filtering
  const filteredShipments = shipments.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.shipmentNumber.toLowerCase().includes(q) ||
      (s.customer?.name && s.customer.name.toLowerCase().includes(q)) ||
      (s.salesOrder?.orderNumber && s.salesOrder.orderNumber.toLowerCase().includes(q)) ||
      (s.carrier && s.carrier.toLowerCase().includes(q)) ||
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q))
    );
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'IN_TRANSIT':
      case 'DISPATCHED': return 'info';
      case 'READY': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const role = getUserRole();
  const canCreate = role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERVISOR';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Dispatch & Shipment Management" 
          description="Track outgoing product shipments, quality checks, inventory deductions, and delivery lifecycles." 
        />
        {canCreate && (
          <button onClick={() => navigate('/shipments/new')} className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Create Shipment
          </button>
        )}
      </div>

      {/* Summary Cards / Dispatch Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready to Ship</span>
            <PackageCheck className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{readyCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatched</span>
            <Send className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">{dispatchedCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Transit</span>
            <Truck className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-600">{inTransitCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{deliveredCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
            <Clock className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-700">{pendingCount}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          delayedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Delayed</span>
            <AlertTriangle className={`h-5 w-5 ${delayedCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${delayedCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {delayedCount}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Search & Filter bar */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Shipment #, Customer, Sales Order, Carrier or Tracking #..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select 
              className="input-field bg-white text-sm" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="READY">READY</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select 
              className="input-field bg-white text-sm" 
              value={customerFilter} 
              onChange={e => setCustomerFilter(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input 
              type="date" 
              title="From Date"
              className="input-field bg-white text-sm" 
              value={dateFromFilter} 
              onChange={e => setDateFromFilter(e.target.value)}
            />

            <input 
              type="date" 
              title="To Date"
              className="input-field bg-white text-sm" 
              value={dateToFilter} 
              onChange={e => setDateToFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Shipments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Shipment Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Sales Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Shipment Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Carrier / Tracking</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expected Delivery</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">Loading shipments...</td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No shipments found.</td>
                </tr>
              ) : (
                filteredShipments.map(s => {
                  const isDelayed = s.expectedDeliveryDate && 
                    s.expectedDeliveryDate.slice(0, 10) < today && 
                    !['DELIVERED', 'CANCELLED'].includes(s.status);

                  const totalItemQty = s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${isDelayed ? 'bg-red-50/40' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link 
                          to={`/shipments/${s.id}`} 
                          className="text-sm font-bold text-primary-600 hover:underline font-mono"
                        >
                          {s.shipmentNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800 font-medium">
                        {s.customer?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link 
                          to={`/sales-orders/${s.salesOrderId}`} 
                          className="text-sm text-slate-700 hover:text-primary-600 font-mono"
                        >
                          {s.salesOrder?.orderNumber || s.salesOrderId}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {new Date(s.shipmentDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{totalItemQty} pcs</span>
                        <span className="text-xs text-slate-500 ml-1">({s.items?.length || 0} line items)</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {s.carrier ? (
                          <div>
                            <span className="font-medium text-slate-800">{s.carrier}</span>
                            {s.trackingNumber && (
                              <span className="block text-xs font-mono text-slate-500">#{s.trackingNumber}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {s.expectedDeliveryDate ? (
                          <span className={isDelayed ? 'text-red-700 font-semibold flex items-center gap-1' : 'text-slate-700'}>
                            {isDelayed && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                            {new Date(s.expectedDeliveryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <StatusBadge status={getStatusBadgeType(s.status)}>
                          {s.status.replace(/_/g, ' ')}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                        <button 
                          title="View Details"
                          className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                          onClick={() => navigate(`/shipments/${s.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canCreate && ['DRAFT', 'READY'].includes(s.status) && (
                          <button 
                            title="Edit Shipment"
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" 
                            onClick={() => navigate(`/shipments/${s.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {isAdmin && (
                          <button 
                            title="Delete Shipment"
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                            onClick={() => setDeleteId(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="Confirm Shipment Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this shipment record? If this shipment was already dispatched, stock will be restored back to finished goods inventory.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Shipment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

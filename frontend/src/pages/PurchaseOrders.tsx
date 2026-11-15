import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Eye, Edit2, Trash2, Calendar, Filter, PackageCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

export interface PurchaseOrderItem {
  id?: string;
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  material?: { name: string; materialCode?: string | null; unit?: string | null; category?: string | null };
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string; supplierCode?: string | null; companyName?: string | null };
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' | string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  notes?: string | null;
  totalAmount: number;
  totalItems?: number;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export const PurchaseOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update modal state
  const [statusModalPO, setStatusModalPO] = useState<PurchaseOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchPurchaseOrders = async () => {
    setFetching(true);
    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (e) {
      console.error('Error fetching purchase orders:', e);
    } finally {
      setFetching(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (e) {
      console.error('Error fetching suppliers:', e);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/purchase-orders/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete purchase order');
      }
    } catch (e) {
      alert('Network error while deleting purchase order');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalPO || !selectedStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:5000/api/purchase-orders/${statusModalPO.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });
      if (res.ok) {
        setStatusModalPO(null);
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (e) {
      alert('Network error updating purchase order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(q) ||
      o.supplier?.name.toLowerCase().includes(q) ||
      (o.notes && o.notes.toLowerCase().includes(q));
    
    const matchesSupplier = filterSupplier ? o.supplierId === filterSupplier : true;
    const matchesStatus = filterStatus ? o.status === filterStatus : true;
    const matchesPriority = filterPriority ? o.priority === filterPriority : true;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(o.orderDate) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(o.orderDate) <= new Date(endDate + 'T23:59:59');
    }

    return matchesSearch && matchesSupplier && matchesStatus && matchesPriority && matchesDate;
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'RECEIVED': return 'success';
      case 'PARTIALLY_RECEIVED': return 'warning';
      case 'SENT': return 'info';
      case 'DRAFT': return 'default';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityBadgeType = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Purchase Orders" 
          description="Manage material procurement, track supplier purchase orders, and monitor fulfillment status." 
        />
        {canEdit() && (
          <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary mt-4 sm:mt-0 flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Create Purchase Order
          </button>
        )}
      </div>

      <Card>
        {/* Controls Bar */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Search className="h-5 w-5 text-slate-400 ml-2" />
              <input 
                type="text" 
                placeholder="Search by PO #, Supplier, or Notes..." 
                className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="input-field w-44 bg-white text-sm" 
                value={filterSupplier} 
                onChange={e => setFilterSupplier(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select 
                className="input-field w-40 bg-white text-sm" 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select 
                className="input-field w-36 bg-white text-sm" 
                value={filterPriority} 
                onChange={e => setFilterPriority(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

          {/* Date Filter Row */}
          <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-xs uppercase tracking-wider text-slate-500">Order Date:</span>
            <input 
              type="date" 
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date" 
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {(startDate || endDate || filterSupplier || filterStatus || filterPriority || searchTerm) && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterSupplier('');
                  setFilterStatus('');
                  setFilterPriority('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="ml-auto text-xs text-primary-600 hover:underline font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Order Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expected Delivery</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">Loading purchase orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No purchase orders found matching your criteria.</td>
                </tr>
              ) : (
                filteredOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-bold text-slate-900 font-mono">{po.orderNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{po.supplier?.name || '-'}</div>
                      {po.supplier?.companyName && (
                        <div className="text-xs text-slate-500">{po.supplier.companyName}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 font-medium">
                      {po.items?.length || 0} items
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">
                      ${po.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getPriorityBadgeType(po.priority)}>{po.priority}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getStatusBadgeType(po.status)}>{po.status.replace('_', ' ')}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-1">
                      <button 
                        title="View PO Details"
                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {canEdit() && (
                        <>
                          <button 
                            title="Edit PO"
                            className="p-1 text-slate-400 hover:text-amber-600 transition-colors" 
                            onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button 
                            title="Quick Change Status"
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setStatusModalPO(po);
                              setSelectedStatus(po.status);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {canEdit() && (
                        <button 
                          title="Delete PO"
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                          onClick={() => setDeleteId(po.id)}
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
      </Card>

      {/* Quick Status Change Modal */}
      <Modal
        isOpen={!!statusModalPO}
        onClose={() => setStatusModalPO(null)}
        title={`Update PO Status: ${statusModalPO?.orderNumber}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select a new status for purchase order <strong>{statusModalPO?.orderNumber}</strong>:
          </p>
          <select 
            className="input-field w-full"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setStatusModalPO(null)} className="btn-secondary">Cancel</button>
            <button 
              type="button" 
              onClick={handleUpdateStatus} 
              disabled={updatingStatus} 
              className="btn-primary"
            >
              {updatingStatus ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="Confirm Purchase Order Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this purchase order? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

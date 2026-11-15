import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Eye, Edit2, Trash2, Calendar, ShoppingBag, AlertCircle } from 'lucide-react';
import { getToken } from '../utils/auth';

export interface SalesOrderItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  product?: { name: string; sku?: string | null };
  variant?: { name: string; color?: string | null; size?: string | null } | null;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { name: string; companyName?: string | null; email?: string | null };
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  priority: string;
  notes?: string | null;
  totalAmount: number;
  items: SalesOrderItem[];
  createdAt: string;
}

export const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Status change modal state
  const [statusModalOrder, setStatusModalOrder] = useState<SalesOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    setFetching(true);
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete order');
      }
    } catch (e) {
      alert('Network error while deleting order');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalOrder || !selectedStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${statusModalOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });
      if (res.ok) {
        setStatusModalOrder(null);
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (e) {
      alert('Network error updating order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = o.orderNumber.toLowerCase().includes(q) ||
                          o.customer?.name.toLowerCase().includes(q) ||
                          (o.customer?.companyName && o.customer.companyName.toLowerCase().includes(q));
    const matchesStatus = filterStatus ? o.status === filterStatus : true;
    const matchesPriority = filterPriority ? o.priority === filterPriority : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'READY_TO_SHIP':
      case 'CONFIRMED': return 'info';
      case 'IN_PRODUCTION': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityBadgeType = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader title="Sales Orders" description="Manage customer orders, track production lifecycle, and fulfillment status." />
        <button onClick={() => navigate('/orders/new')} className="btn-primary mt-4 sm:mt-0 flex items-center">
          <Plus className="mr-2 h-4 w-4" /> Create Sales Order
        </button>
      </div>

      <Card>
        {/* Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Order # or Customer..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select 
              className="input-field w-40 bg-white" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="IN_PRODUCTION">IN_PRODUCTION</option>
              <option value="READY_TO_SHIP">READY_TO_SHIP</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select 
              className="input-field w-36 bg-white" 
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Order Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Delivery Date</th>
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
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">Loading orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No sales orders found.</td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-bold text-slate-900 font-mono">{o.orderNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{o.customer?.name}</div>
                      {o.customer?.companyName && (
                        <div className="text-xs text-slate-500">{o.customer.companyName}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString() : <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 font-medium">
                      {o.items?.length || 0} items
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">
                      ${o.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getPriorityBadgeType(o.priority)}>{o.priority}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getStatusBadgeType(o.status)}>{o.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                      <button 
                        title="View Order Details"
                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        title="Edit Order"
                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors" 
                        onClick={() => navigate(`/orders/${o.id}/edit`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        title="Delete Order"
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                        onClick={() => setDeleteId(o.id)}
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

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this sales order? This action cannot be undone.
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

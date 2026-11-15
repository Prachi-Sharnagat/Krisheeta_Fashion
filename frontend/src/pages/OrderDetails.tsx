import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ArrowLeft, Edit2, Trash2, Calendar, ShoppingBag, CheckCircle2, Clock, Truck, Ban, Building2, User, Mail, Phone, FileText } from 'lucide-react';
import { getToken } from '../utils/auth';
import { SalesOrder } from './Orders';

const LIFECYCLE_STAGES = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'COMPLETED'];

export const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setOrder(await res.json());
      } else {
        setError('Sales order not found');
      }
    } catch (e) {
      setError('Network error loading order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrderDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrderDetails();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      alert('Network error updating order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        navigate('/orders');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete sales order');
      }
    } catch (e) {
      alert('Network error deleting order');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading sales order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate('/orders')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </button>
        <Card>
          <div className="p-8 text-center text-red-600">
            {error || 'Order not found'}
          </div>
        </Card>
      </div>
    );
  }

  const currentStageIndex = LIFECYCLE_STAGES.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

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
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={() => navigate('/orders')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="btn-secondary flex items-center">
            <Edit2 className="mr-2 h-4 w-4" /> Edit Order
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
              <h1 className="text-2xl font-bold font-mono text-slate-900">{order.orderNumber}</h1>
              <StatusBadge status={getStatusBadgeType(order.status)}>
                {order.status}
              </StatusBadge>
              <StatusBadge status={getPriorityBadgeType(order.priority)}>
                {order.priority} PRIORITY
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Customer: <strong className="text-slate-900">{order.customer?.name}</strong> {order.customer?.companyName ? `(${order.customer.companyName})` : ''}
            </p>
          </div>

          <div className="text-sm text-slate-500 flex flex-col md:items-end gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Order Date: {new Date(order.orderDate).toLocaleDateString()}
            </div>
            {order.expectedDeliveryDate && (
              <div className="flex items-center gap-2 text-primary-600 font-medium">
                <Clock className="h-4 w-4" />
                Delivery Target: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Order Lifecycle Progress Bar */}
        <div className="mt-6 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Production & Fulfillment Lifecycle
          </h3>

          {isCancelled ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
              <Ban className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Order Cancelled</p>
                <p className="text-xs text-red-600">This order has been marked as cancelled and is not progressing through production.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {LIFECYCLE_STAGES.map((stage, idx) => {
                const isActive = idx === currentStageIndex;
                const isPassed = idx < currentStageIndex;

                return (
                  <button
                    key={stage}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(stage)}
                    className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold flex flex-col items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-600/20'
                        : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{stage.replace(/_/g, ' ')}</span>
                    {isPassed && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Status Quick Action Bar */}
          <div className="mt-4 flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500">Quick Change Status:</span>
            <div className="flex gap-2">
              {['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  disabled={updatingStatus || order.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    order.status === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Customer & Order Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" /> Customer Info
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Customer Name</p>
              <p className="font-semibold text-slate-900">{order.customer?.name}</p>
            </div>
            {order.customer?.companyName && (
              <div>
                <p className="text-xs text-slate-500">Company Name</p>
                <p className="font-medium text-slate-800">{order.customer.companyName}</p>
              </div>
            )}
            {order.customer?.email && (
              <div>
                <p className="text-xs text-slate-500">Email Address</p>
                <p className="font-medium text-slate-800">{order.customer.email}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Notes & Special Instructions */}
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" /> Order Notes
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {order.notes || <span className="text-slate-400 italic">No notes attached to this order.</span>}
          </p>
        </Card>
      </div>

      {/* Order Items Table with Shipment Progress */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            Ordered Products & Fulfillment Status
          </h2>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button 
              onClick={() => navigate(`/shipments/new`)}
              className="btn-secondary text-xs flex items-center"
            >
              <Truck className="mr-1.5 h-3.5 w-3.5" /> Create Shipment
            </button>
            <button 
              onClick={() => navigate(`/invoices/new?salesOrderId=${order.id}`)}
              className="btn-primary text-xs flex items-center"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Create Invoice
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Variant</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Ordered Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Shipped Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Remaining Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {order.items?.map((item: any, idx: number) => {
                const shipped = item.shippedQuantity || 0;
                const remaining = item.remainingQuantity !== undefined ? item.remainingQuantity : Math.max(0, item.quantity - shipped);

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{item.product?.name || 'Product'}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.product?.sku || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.variant ? (
                        <div>
                          <span className="font-medium text-slate-900">{item.variant.name}</span>
                          <span className="text-xs text-slate-500 ml-1.5 font-mono">
                            {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Standard / Base</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{item.quantity} pcs</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{shipped} pcs</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">{remaining} pcs</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                      ${(item.totalPrice || item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm">Totals</td>
                <td className="px-4 py-3 text-sm text-right">{order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0)} pcs</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600">
                  {order.items?.reduce((sum: number, i: any) => sum + (i.shippedQuantity || 0), 0)} pcs
                </td>
                <td className="px-4 py-3 text-sm text-right text-emerald-700">
                  {order.items?.reduce((sum: number, i: any) => sum + (i.remainingQuantity !== undefined ? i.remainingQuantity : Math.max(0, i.quantity - (i.shippedQuantity || 0))), 0)} pcs
                </td>
                <td></td>
                <td className="px-4 py-3 text-sm text-right text-primary-600 font-mono text-base">
                  ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Linked Shipments Section */}
      {(order as any).shipments && (order as any).shipments.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-600" /> Linked Shipments ({((order as any).shipments).length})
          </h2>
          <div className="divide-y divide-slate-100">
            {((order as any).shipments).map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/shipments/${s.id}`} className="font-mono font-bold text-primary-600 hover:underline">
                    {s.shipmentNumber}
                  </Link>
                  <span className="text-xs text-slate-500 ml-3">
                    Created: {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={s.status === 'DELIVERED' ? 'success' : s.status === 'DISPATCHED' ? 'info' : 'warning'}>
                    {s.status}
                  </StatusBadge>
                  <Link to={`/shipments/${s.id}`} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete order <strong className="font-mono text-slate-900">{order.orderNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

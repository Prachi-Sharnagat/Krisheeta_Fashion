import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  ArrowLeft, Edit2, Trash2, Calendar, Truck, Clock, 
  CheckCircle2, PackageCheck, Send, AlertTriangle, Building2, 
  User, MapPin, FileText, Ban 
} from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';

const SHIPMENT_TIMELINE_STAGES = ['DRAFT', 'READY', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];

interface ShipmentItem {
  id: string;
  quantity: number;
  unit: string;
  product?: { id: string; name: string; sku?: string };
  variant?: { id: string; name: string; color?: string; size?: string } | null;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  salesOrder?: { id: string; orderNumber: string; status: string };
  customerId: string;
  customer?: { id: string; name: string; companyName?: string; email?: string; phone?: string; address?: string };
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
  updatedAt: string;
}

export const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchShipmentDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/shipments/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setShipment(await res.json());
      } else {
        setError('Shipment not found');
      }
    } catch (e) {
      setError('Network error fetching shipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchShipmentDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!shipment) return;
    setUpdatingStatus(true);
    try {
      let endpoint = `http://localhost:5000/api/shipments/${shipment.id}/status`;
      if (newStatus === 'DISPATCHED') {
        endpoint = `http://localhost:5000/api/shipments/${shipment.id}/dispatch`;
      } else if (newStatus === 'DELIVERED') {
        endpoint = `http://localhost:5000/api/shipments/${shipment.id}/deliver`;
      }

      const res = await fetch(endpoint, {
        method: newStatus === 'DISPATCHED' || newStatus === 'DELIVERED' ? 'PATCH' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok) {
        fetchShipmentDetails();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      alert('Network error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/shipments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        navigate('/shipments');
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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading shipment details...
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <button onClick={() => navigate('/shipments')} className="flex items-center text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shipments
        </button>
        <Card>
          <div className="p-8 text-center text-red-600">{error || 'Shipment not found'}</div>
        </Card>
      </div>
    );
  }

  const role = getUserRole();
  const canEdit = (role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERVISOR') && ['DRAFT', 'READY'].includes(shipment.status);
  const canDispatch = (role === 'ADMIN' || role === 'MANAGER') && ['DRAFT', 'READY'].includes(shipment.status);
  const canDeliver = (role === 'ADMIN' || role === 'MANAGER') && ['DISPATCHED', 'IN_TRANSIT'].includes(shipment.status);
  const isAdmin = role === 'ADMIN';

  const currentStageIndex = SHIPMENT_TIMELINE_STAGES.indexOf(shipment.status);
  const isCancelled = shipment.status === 'CANCELLED';

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

  const totalQuantity = shipment.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={() => navigate('/shipments')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shipments
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <button onClick={() => navigate(`/shipments/${shipment.id}/edit`)} className="btn-secondary flex items-center">
              <Edit2 className="mr-2 h-4 w-4" /> Edit Shipment
            </button>
          )}

          {canDispatch && (
            <button 
              disabled={updatingStatus}
              onClick={() => handleStatusChange('DISPATCHED')} 
              className="btn-primary flex items-center"
            >
              <Send className="mr-2 h-4 w-4" /> Dispatch Shipment
            </button>
          )}

          {canDeliver && (
            <button 
              disabled={updatingStatus}
              onClick={() => handleStatusChange('DELIVERED')} 
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-medium text-sm flex items-center shadow-sm"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Delivered
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setIsDeleteOpen(true)} className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-md font-medium text-sm flex items-center">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">{shipment.shipmentNumber}</h1>
              <StatusBadge status={getStatusBadgeType(shipment.status)}>
                {shipment.status.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Sales Order: <Link to={`/sales-orders/${shipment.salesOrderId}`} className="font-mono font-semibold text-primary-600 hover:underline">{shipment.salesOrder?.orderNumber}</Link>
              <span className="mx-2 text-slate-300">•</span>
              Customer: <strong className="text-slate-900">{shipment.customer?.name}</strong>
            </p>
          </div>

          <div className="text-sm text-slate-500 flex flex-col md:items-end gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Shipment Date: {new Date(shipment.shipmentDate).toLocaleDateString()}
            </div>
            {shipment.expectedDeliveryDate && (
              <div className="flex items-center gap-2 text-primary-600 font-medium">
                <Clock className="h-4 w-4" />
                Expected Delivery: {new Date(shipment.expectedDeliveryDate).toLocaleDateString()}
              </div>
            )}
            {shipment.actualDeliveryDate && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Delivered On: {new Date(shipment.actualDeliveryDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Progress Bar */}
        <div className="mt-6 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Shipment Timeline & Lifecycle Status
          </h3>

          {isCancelled ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
              <Ban className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Shipment Cancelled</p>
                <p className="text-xs text-red-600">This shipment was cancelled. Stock movements (if dispatched) have been reversed.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {SHIPMENT_TIMELINE_STAGES.map((stage, idx) => {
                const isActive = idx === currentStageIndex;
                const isPassed = idx < currentStageIndex;

                return (
                  <div
                    key={stage}
                    className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold flex flex-col items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-600/20'
                        : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span>{stage.replace(/_/g, ' ')}</span>
                    {isPassed && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Action Bar */}
          {!isCancelled && shipment.status !== 'DELIVERED' && (
            <div className="mt-4 flex flex-wrap justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs gap-2">
              <span className="text-slate-500">Update Status:</span>
              <div className="flex flex-wrap gap-2">
                {['DRAFT', 'READY', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    disabled={updatingStatus || shipment.status === st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      shipment.status === st
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Customer & Shipping Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" /> Customer Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Customer Name</p>
              <p className="font-semibold text-slate-900">{shipment.customer?.name}</p>
            </div>
            {shipment.customer?.companyName && (
              <div>
                <p className="text-xs text-slate-500">Company</p>
                <p className="font-medium text-slate-800">{shipment.customer.companyName}</p>
              </div>
            )}
            {shipment.customer?.email && (
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-800">{shipment.customer.email}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Carrier & Tracking */}
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-500" /> Carrier & Logistics
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Carrier</p>
              <p className="font-semibold text-slate-900">{shipment.carrier || <span className="text-slate-400 italic">Not assigned</span>}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tracking Number</p>
              <p className="font-mono font-medium text-slate-900">{shipment.trackingNumber || <span className="text-slate-400 italic">No tracking #</span>}</p>
            </div>
            {shipment.warehouseId && (
              <div>
                <p className="text-xs text-slate-500">Warehouse ID</p>
                <p className="font-mono text-slate-800">{shipment.warehouseId}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Shipping Address */}
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" /> Destination Address
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {shipment.shippingAddress || <span className="text-slate-400 italic">Standard customer address</span>}
          </p>
          {shipment.notes && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-slate-600 italic">{shipment.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Shipment Items Table */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Shipped Line Items
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Variant</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Shipped Quantity</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {shipment.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{item.product?.name}</div>
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
                  <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-slate-600">
                    {item.unit || 'Pcs'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm">Total Shipment Quantity</td>
                <td className="px-4 py-3 text-sm text-right text-primary-600 font-mono text-base">
                  {totalQuantity} pcs
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete shipment <strong className="font-mono text-slate-900">{shipment.shipmentNumber}</strong>? Any dispatched stock will be restored to inventory.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Shipment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

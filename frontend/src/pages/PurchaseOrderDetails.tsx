import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Edit2, PackageCheck, Truck, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface Material {
  id: string;
  name: string;
  materialCode?: string;
  unit?: string;
  category?: string;
}

interface PurchaseOrderItem {
  id: string;
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  material?: Material;
}

interface GoodsReceiptItem {
  id: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  material?: Material;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  status: string;
  notes?: string;
  items: GoodsReceiptItem[];
}

interface PurchaseOrderDetailsData {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode?: string;
    companyName?: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string;
  priority: string;
  notes?: string;
  totalAmount: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  items: PurchaseOrderItem[];
  goodsReceipts?: GoodsReceipt[];
}

export const PurchaseOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [po, setPo] = useState<PurchaseOrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPODetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setPo(await res.json());
      } else {
        setError('Purchase Order not found');
      }
    } catch (e) {
      console.error('Error fetching PO details:', e);
      setError('Network error fetching purchase order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPODetails();
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-6xl py-12 text-center text-slate-500">Loading purchase order details...</div>;
  }

  if (error || !po) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">{error || 'Purchase Order not found'}</h3>
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary mt-4">
          Return to Purchase Orders
        </button>
      </div>
    );
  }

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

  // Compute fulfillment progress step
  const getProgressStep = () => {
    if (po.status === 'RECEIVED') return 3;
    if (po.status === 'PARTIALLY_RECEIVED') return 2;
    if (po.status === 'SENT') return 1;
    return 0; // DRAFT or CANCELLED
  };

  const activeStep = getProgressStep();
  const hasRemainingItems = po.items.some(item => (item.quantity - (item.receivedQuantity || 0)) > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button 
        onClick={() => navigate('/purchase-orders')} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
      </button>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{po.orderNumber}</span>
            <StatusBadge status={getStatusBadgeType(po.status)}>{po.status.replace('_', ' ')}</StatusBadge>
            <StatusBadge status={getPriorityBadgeType(po.priority)}>{po.priority}</StatusBadge>
          </div>
          <p className="text-sm text-slate-500">
            Created on {new Date(po.orderDate).toLocaleDateString()} for <strong className="text-slate-700">{po.supplier?.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit() && po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
            <button 
              onClick={() => navigate(`/purchase-orders/${po.id}/edit`)} 
              className="btn-secondary flex items-center text-sm"
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit Order
            </button>
          )}

          {hasRemainingItems && po.status !== 'CANCELLED' && (
            <button 
              onClick={() => navigate(`/goods-receipts/new?poId=${po.id}`)} 
              className="btn-primary flex items-center text-sm"
            >
              <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods
            </button>
          )}
        </div>
      </div>

      {/* Progress Indicator Component */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Order Fulfillment Pipeline</h4>
        
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-200 -z-0" />
          <div 
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-primary-600 transition-all duration-500 -z-0" 
            style={{ width: activeStep === 3 ? '100%' : activeStep === 2 ? '66%' : activeStep === 1 ? '33%' : '0%' }}
          />

          {/* Step 1: Draft / Sent */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
              activeStep >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeStep >= 1 ? <CheckCircle2 className="h-6 w-6" /> : '1'}
            </div>
            <span className="mt-2 text-xs font-medium text-slate-700">Ordered</span>
            <span className="text-[10px] text-slate-400">PO Issued to Supplier</span>
          </div>

          {/* Step 2: Partially Received */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
              activeStep >= 2 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeStep >= 2 ? <CheckCircle2 className="h-6 w-6" /> : '2'}
            </div>
            <span className="mt-2 text-xs font-medium text-slate-700">Partially Received</span>
            <span className="text-[10px] text-slate-400">Partial Delivery Received</span>
          </div>

          {/* Step 3: Fully Received */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
              activeStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeStep >= 3 ? <CheckCircle2 className="h-6 w-6" /> : '3'}
            </div>
            <span className="mt-2 text-xs font-medium text-slate-700">Received</span>
            <span className="text-[10px] text-slate-400">All Items Fulfilled</span>
          </div>
        </div>
      </div>

      {/* Supplier & Delivery Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Supplier Information">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Supplier Name:</span>
              <span className="font-semibold text-slate-900">{po.supplier?.name}</span>
            </div>
            {po.supplier?.companyName && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Company Name:</span>
                <span className="text-slate-700">{po.supplier.companyName}</span>
              </div>
            )}
            {po.supplier?.contact && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Contact Person:</span>
                <span className="text-slate-700">{po.supplier.contact}</span>
              </div>
            )}
            {po.supplier?.email && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{po.supplier.email}</span>
              </div>
            )}
            {po.supplier?.phone && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-700">{po.supplier.phone}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Order Schedule & Terms">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Order Date:</span>
              <span className="font-medium text-slate-800">{new Date(po.orderDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Expected Delivery:</span>
              <span className="font-medium text-slate-800">
                {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : <span className="text-slate-400 italic">Not set</span>}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Total Lines:</span>
              <span className="font-medium text-slate-800">{po.items?.length || 0} materials</span>
            </div>
            {po.notes && (
              <div className="pt-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes:</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 italic">{po.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Materials & Quantities Breakdown */}
      <Card title="Ordered Materials & Fulfillment Progress">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Ordered Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Received Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Remaining Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {po.items.map(item => {
                const received = item.receivedQuantity || 0;
                const remaining = Math.max(0, item.quantity - received);
                const isFullyReceived = remaining === 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{item.material?.name || 'Material'}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {item.material?.materialCode ? `Code: ${item.material.materialCode}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700">
                      {received} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {isFullyReceived ? (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Fulfilled</span>
                      ) : (
                        <span className="text-amber-700">{remaining} {item.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-3">Grand Total Amount:</span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              ${po.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Card>

      {/* Linked Goods Receipts History */}
      <Card title="Goods Receipts History">
        {!po.goodsReceipts || po.goodsReceipts.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            No goods receipts recorded yet for this purchase order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Receipt #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Receipt Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Items Received</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {po.goodsReceipts.map(gr => (
                  <tr key={gr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold font-mono text-slate-900">{gr.receiptNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(gr.receiptDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{gr.items?.length || 0} line items</td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={gr.status === 'ACCEPTED' || gr.status === 'RECEIVED' ? 'success' : 'warning'}>
                        {gr.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link 
                        to={`/goods-receipts/${gr.id}`} 
                        className="text-primary-600 hover:text-primary-800 font-medium text-xs hover:underline"
                      >
                        View Receipt Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

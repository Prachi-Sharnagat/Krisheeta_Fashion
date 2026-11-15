import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ArrowLeft, Play, CheckCircle2, AlertCircle, PackageCheck, Layers, FileText, Activity } from 'lucide-react';
import { getToken } from '../utils/auth';

interface MaterialReq {
  materialId: string;
  materialName: string;
  materialCode?: string;
  unit: string;
  bomQtyPerUnit: number;
  wastagePercentage: number;
  requiredTotalQty: number;
  currentStock: number;
  isSufficient: boolean;
}

interface ProductionOrderDetail {
  id: string;
  orderNumber: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  status: string;
  startDate?: string;
  dueDate?: string;
  notes?: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    finishedGoodsStock?: number;
  };
  variant?: {
    id: string;
    name: string;
    color?: string;
    size?: string;
    finishedGoodsStock?: number;
  };
  bom?: {
    id: string;
    name: string;
    version: string;
  };
  routing?: {
    id: string;
    name: string;
    version: string;
  };
  materialRequirements: MaterialReq[];
  consumptions: any[];
  finishedGoods: any[];
}

export const ProductionOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ProductionOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Complete Order Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    completedQuantity: '',
    scrapQuantity: '0',
    notes: ''
  });
  const [completing, setCompleting] = useState(false);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/production-orders/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setCompleteForm(prev => ({
          ...prev,
          completedQuantity: String(data.targetQuantity)
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleIssueMaterials = async () => {
    if (!order) return;
    setActionError('');
    setActionSuccess('');

    const hasInsufficient = order.materialRequirements.some(m => !m.isSufficient);
    if (hasInsufficient) {
      if (!confirm('Warning: Some raw materials have insufficient warehouse stock. Attempt to issue anyway?')) {
        return;
      }
    }

    setIssuing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/production-orders/${order.id}/issue-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess('Raw materials issued successfully! Deducted from Inventory & posted PRODUCTION_ISSUE stock movements.');
        fetchOrderDetail();
      } else {
        setActionError(data.error || 'Failed to issue materials');
      }
    } catch (e) {
      setActionError('Network error while issuing materials');
    } finally {
      setIssuing(false);
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setCompleting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/production-orders/${order.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          completedQuantity: parseInt(completeForm.completedQuantity, 10),
          scrapQuantity: parseInt(completeForm.scrapQuantity || '0', 10),
          notes: completeForm.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsCompleteModalOpen(false);
        setActionSuccess('Production order marked COMPLETED! Finished goods added to Inventory.');
        fetchOrderDetail();
      } else {
        setActionError(data.error || 'Failed to complete production order');
      }
    } catch (e) {
      setActionError('Network error while completing order');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Work Order details...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-slate-500">Work order not found.</div>;
  }

  const allMaterialsSufficient = order.materialRequirements.length > 0 && order.materialRequirements.every(m => m.isSufficient);

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/production-orders" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Production Orders
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
            <StatusBadge status={order.status === 'COMPLETED' ? 'success' : (order.status === 'IN_PROGRESS' ? 'warning' : 'info')}>
              {order.status}
            </StatusBadge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Garment Style: <span className="font-semibold text-slate-800">{order.product.name}</span> | Target: <span className="font-semibold text-slate-800">{order.targetQuantity} Pcs</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-3">
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              onClick={handleIssueMaterials}
              disabled={issuing}
              className={`btn-primary flex items-center gap-2 ${!allMaterialsSufficient ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <Play className="w-4 h-4" />
              {issuing ? 'Issuing Materials...' : 'Issue Raw Materials to Production'}
            </button>
          )}

          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => setIsCompleteModalOpen(true)}
              className="btn-secondary text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" /> Receive Finished Goods
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line">
          <AlertCircle className="w-5 h-5 inline mr-2 text-red-500" />
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
          <CheckCircle2 className="w-5 h-5 inline mr-2 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Target Batch Size</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{order.targetQuantity} Pcs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Completed Garments</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{order.completedQuantity} Pcs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Scrap / Defects</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{order.scrapQuantity} Pcs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Current Finished Goods Stock</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {order.product.finishedGoodsStock || 0} Pcs
          </div>
        </div>
      </div>

      {/* BOM Raw Material Readiness Section */}
      <Card title="Raw Material Availability & BOM Requirements" className="mb-8">
        <p className="text-xs text-slate-500 mb-4">
          Calculated raw material quantities needed for batch size of {order.targetQuantity} garments based on active Bill of Materials.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Raw Material</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">BOM Qty / Garment</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Wastage %</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Batch Requirement</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Warehouse Stock</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-slate-500">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {order.materialRequirements.map(m => (
                <tr key={m.materialId} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{m.materialName}</div>
                    {m.materialCode && <div className="text-xs text-slate-500">{m.materialCode}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-slate-700">
                    {m.bomQtyPerUnit} {m.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-slate-600">
                    {m.wastagePercentage}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold text-slate-900">
                    {m.requiredTotalQty} {m.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono text-slate-700">
                    {m.currentStock} {m.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {m.isSufficient ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Sufficient
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3 h-3 mr-1" /> Insufficient
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {order.materialRequirements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No Bill of Materials (BOM) linked to this product style.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Production Consumptions History */}
      {order.consumptions && order.consumptions.length > 0 && (
        <Card title="Material Issues History" className="mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material Issued</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Issued Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {order.consumptions.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.material?.name || 'Material'}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-amber-700">
                      -{c.quantity} {c.unit}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Receive Finished Goods Modal */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Receive Finished Goods into Inventory">
        <form onSubmit={handleCompleteOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Completed Garments Quantity (Pcs) *</label>
            <input
              required
              type="number"
              min="1"
              className="input-field mt-1"
              value={completeForm.completedQuantity}
              onChange={(e) => setCompleteForm({ ...completeForm, completedQuantity: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Defective / Scrap Garments Quantity (Pcs)</label>
            <input
              type="number"
              min="0"
              className="input-field mt-1"
              value={completeForm.scrapQuantity}
              onChange={(e) => setCompleteForm({ ...completeForm, scrapQuantity: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Receipt Notes</label>
            <textarea
              rows={2}
              className="input-field mt-1"
              placeholder="e.g. Inspected and received 100 finished t-shirts into Warehouse FG A-12"
              value={completeForm.notes}
              onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={completing} className="btn-primary">
              {completing ? 'Posting Receipt...' : 'Confirm Receipt & Complete Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, User } from 'lucide-react';
import { getToken, getUserRole } from '../utils/auth';

interface Material {
  id: string;
  name: string;
  materialCode?: string;
  unit?: string;
}

interface GoodsReceiptItem {
  id: string;
  materialId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;
  notes?: string;
  material?: Material;
}

interface GoodsReceiptDetailsData {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: { id: string; orderNumber: string; status: string };
  supplierId: string;
  supplier?: { id: string; name: string; supplierCode?: string; companyName?: string };
  receiptDate: string;
  status: string;
  notes?: string;
  items: GoodsReceiptItem[];
  createdAt: string;
}

export const GoodsReceiptDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [receipt, setReceipt] = useState<GoodsReceiptDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchReceiptDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/goods-receipts/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setReceipt(await res.json());
      } else {
        setError('Goods Receipt not found');
      }
    } catch (e) {
      console.error('Error fetching goods receipt:', e);
      setError('Network error fetching goods receipt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceiptDetails();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!receipt || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:5000/api/goods-receipts/${receipt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchReceiptDetails();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      alert('Network error updating receipt status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl py-12 text-center text-slate-500">Loading goods receipt details...</div>;
  }

  if (error || !receipt) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">{error || 'Goods Receipt not found'}</h3>
        <button onClick={() => navigate('/goods-receipts')} className="btn-secondary mt-4">
          Return to Goods Receipts
        </button>
      </div>
    );
  }

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'RECEIVED': return 'info';
      case 'INSPECTED': return 'warning';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  };

  const totalReceived = receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalAccepted = receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  const totalRejected = receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);
  const passRate = totalReceived > 0 ? ((totalAccepted / totalReceived) * 100).toFixed(1) : '100';

  const userRole = getUserRole();
  const canUpdate = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'SUPERVISOR';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button 
        onClick={() => navigate('/goods-receipts')} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goods Receipts
      </button>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{receipt.receiptNumber}</span>
            <StatusBadge status={getStatusBadgeType(receipt.status)}>{receipt.status}</StatusBadge>
          </div>
          <p className="text-sm text-slate-500">
            Received on {new Date(receipt.receiptDate).toLocaleDateString()} against Purchase Order{' '}
            <Link to={`/purchase-orders/${receipt.purchaseOrderId}`} className="font-mono text-primary-600 font-semibold hover:underline">
              {receipt.purchaseOrder?.orderNumber}
            </Link>
          </p>
        </div>

        {canUpdate && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Inspection Status:</span>
            <select 
              className="input-field bg-white text-xs py-1.5 font-semibold"
              value={receipt.status}
              disabled={updatingStatus}
              onChange={(e) => handleUpdateStatus(e.target.value)}
            >
              <option value="RECEIVED">RECEIVED</option>
              <option value="INSPECTED">INSPECTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Received</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalReceived}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Accepted</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{totalAccepted}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-red-500 uppercase tracking-wider">Total Rejected</div>
          <div className="text-2xl font-bold text-red-600 mt-1 font-mono">{totalRejected}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Pass Rate</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{passRate}%</div>
        </div>
      </div>

      {/* Supplier & Receipt Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Supplier Details">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-semibold text-slate-800">{receipt.supplier?.name}</span>
            </div>
            {receipt.supplier?.companyName && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Company Name:</span>
                <span className="text-slate-700">{receipt.supplier.companyName}</span>
              </div>
            )}
            {receipt.supplier?.supplierCode && (
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Supplier Code:</span>
                <span className="font-mono text-slate-700">{receipt.supplier.supplierCode}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Receipt Information">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Receipt Date:</span>
              <span className="font-medium text-slate-800">{new Date(receipt.receiptDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Linked PO:</span>
              <Link to={`/purchase-orders/${receipt.purchaseOrderId}`} className="font-mono font-semibold text-primary-600 hover:underline">
                {receipt.purchaseOrder?.orderNumber}
              </Link>
            </div>
            {receipt.notes && (
              <div className="pt-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Receipt Notes:</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 italic">{receipt.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Received Items Breakdown Table */}
      <Card title="Received Material Breakdown & Quality Inspection">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Received Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-emerald-600">Accepted Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-red-500">Rejected Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 pl-6">Line Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {receipt.items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{item.material?.name || 'Material'}</div>
                    {item.material?.materialCode && (
                      <div className="text-xs text-slate-400 font-mono">Code: {item.material.materialCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 font-mono">
                    {item.receivedQuantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700 font-mono">
                    {item.acceptedQuantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-red-600 font-mono">
                    {item.rejectedQuantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 pl-6">
                    {item.notes || <span className="text-slate-300 italic">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, PackageCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getToken } from '../utils/auth';

interface POItem {
  id: string;
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  receivedQuantity: number;
  material?: { name: string; materialCode?: string };
}

interface PurchaseOrderOption {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: string;
  supplier?: { name: string };
  items: POItem[];
}

interface ReceiptLineInput {
  purchaseOrderItemId: string;
  materialName: string;
  materialCode?: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  remainingQty: number;
  receivingNow: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  notes: string;
}

export const CreateGoodsReceipt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPoId = searchParams.get('poId') || '';

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [selectedPoId, setSelectedPoId] = useState(initialPoId);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderOption | null>(null);

  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptStatus, setReceiptStatus] = useState('RECEIVED');
  const [generalNotes, setGeneralNotes] = useState('');

  const [lineInputs, setLineInputs] = useState<ReceiptLineInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOList = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/purchase-orders', {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const data: PurchaseOrderOption[] = await res.json();
          // Filter out cancelled or fully received orders unless pre-selected
          const validPOs = data.filter(po => po.status !== 'CANCELLED' && (po.status !== 'RECEIVED' || po.id === initialPoId));
          setPurchaseOrders(validPOs);

          if (initialPoId) {
            const matched = data.find(p => p.id === initialPoId);
            if (matched) {
              loadPO(matched);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching purchase orders for receipt:', e);
        setError('Failed to fetch purchase orders list');
      } finally {
        setLoading(false);
      }
    };

    fetchPOList();
  }, [initialPoId]);

  const loadPO = (po: PurchaseOrderOption) => {
    setSelectedPO(po);
    setSelectedPoId(po.id);

    const inputs: ReceiptLineInput[] = po.items.map(item => {
      const prevRec = item.receivedQuantity || 0;
      const rem = Math.max(0, item.quantity - prevRec);
      return {
        purchaseOrderItemId: item.id,
        materialName: item.material?.name || 'Material',
        materialCode: item.material?.materialCode,
        orderedQty: item.quantity,
        previouslyReceivedQty: prevRec,
        remainingQty: rem,
        receivingNow: rem,
        acceptedQty: rem,
        rejectedQty: 0,
        unit: item.unit || 'Pcs',
        notes: ''
      };
    });

    setLineInputs(inputs);
  };

  const handlePOChange = (poId: string) => {
    setSelectedPoId(poId);
    setError(null);
    const matched = purchaseOrders.find(p => p.id === poId);
    if (matched) {
      loadPO(matched);
    } else {
      setSelectedPO(null);
      setLineInputs([]);
    }
  };

  const handleLineChange = (index: number, field: keyof ReceiptLineInput, value: any) => {
    const updated = [...lineInputs];
    const targetLine = { ...updated[index] };

    if (field === 'receivingNow') {
      const num = Math.max(0, Number(value) || 0);
      targetLine.receivingNow = num;
      targetLine.acceptedQty = num;
      targetLine.rejectedQty = 0;
    } else if (field === 'acceptedQty') {
      const num = Math.max(0, Number(value) || 0);
      targetLine.acceptedQty = num;
      if (num + targetLine.rejectedQty > targetLine.receivingNow) {
        targetLine.rejectedQty = Math.max(0, targetLine.receivingNow - num);
      }
    } else if (field === 'rejectedQty') {
      const num = Math.max(0, Number(value) || 0);
      targetLine.rejectedQty = num;
      if (targetLine.acceptedQty + num > targetLine.receivingNow) {
        targetLine.acceptedQty = Math.max(0, targetLine.receivingNow - num);
      }
    } else {
      (targetLine as any)[field] = value;
    }

    updated[index] = targetLine;
    setLineInputs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPO) {
      setError('Please select a purchase order');
      return;
    }

    const activeLines = lineInputs.filter(l => l.receivingNow > 0);
    if (activeLines.length === 0) {
      setError('Please enter a receiving quantity greater than 0 for at least one material');
      return;
    }

    for (let i = 0; i < lineInputs.length; i++) {
      const line = lineInputs[i];
      if (line.receivingNow > 0) {
        if (line.receivingNow > line.remainingQty + 0.00001) {
          setError(`Line #${i + 1} (${line.materialName}): Receiving quantity (${line.receivingNow}) exceeds remaining ordered quantity (${line.remainingQty})`);
          return;
        }
        if (line.acceptedQty + line.rejectedQty > line.receivingNow) {
          setError(`Line #${i + 1} (${line.materialName}): Accepted + Rejected quantity cannot exceed Receiving Now quantity`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const payload = {
        receiptNumber: receiptNumber || undefined,
        purchaseOrderId: selectedPO.id,
        receiptDate,
        status: receiptStatus,
        notes: generalNotes,
        items: activeLines.map(line => ({
          purchaseOrderItemId: line.purchaseOrderItemId,
          receivedQuantity: line.receivingNow,
          acceptedQuantity: line.acceptedQty,
          rejectedQuantity: line.rejectedQty,
          unit: line.unit,
          notes: line.notes
        }))
      };

      const res = await fetch('http://localhost:5000/api/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const createdGR = await res.json();
        navigate(`/goods-receipts/${createdGR.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to process goods receipt');
      }
    } catch (e) {
      setError('Network error processing goods receipt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl py-12 text-center text-slate-500">Loading procurement details...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button 
        onClick={() => navigate('/goods-receipts')} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Goods Receipts
      </button>

      <PageHeader 
        title="Create Goods Receipt" 
        description="Receive incoming shipments, verify delivered quantities, and log quality inspection results." 
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 flex items-center border border-red-200">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Order Selection */}
        <Card title="1. Select Purchase Order & Receipt Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Purchase Order <span className="text-red-500">*</span>
              </label>
              <select 
                className="input-field w-full bg-white"
                value={selectedPoId}
                onChange={e => handlePOChange(e.target.value)}
              >
                <option value="">-- Select Purchase Order --</option>
                {purchaseOrders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.orderNumber} - {p.supplier?.name} ({p.status.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Date</label>
              <input 
                type="date" 
                className="input-field w-full bg-white"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Status</label>
              <select 
                className="input-field w-full bg-white"
                value={receiptStatus}
                onChange={e => setReceiptStatus(e.target.value)}
              >
                <option value="RECEIVED">RECEIVED</option>
                <option value="INSPECTED">INSPECTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Number (Optional)</label>
              <input 
                type="text" 
                placeholder="Auto-generated (e.g. GR-20260920-0001)" 
                className="input-field w-full bg-white font-mono"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">General Notes</label>
              <textarea 
                rows={2} 
                className="input-field w-full bg-white" 
                placeholder="Delivery vehicle details, gate pass #, vendor packing slip #..."
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Materials Receiving & Inspection Grid */}
        {selectedPO && (
          <Card title={`2. Goods Receiving for PO: ${selectedPO.orderNumber}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Material</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase text-slate-500">Ordered</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase text-slate-500">Prev. Rec</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase text-amber-600">Remaining</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-900 font-bold bg-blue-50/50">Receiving Now</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase text-emerald-700 font-bold">Accepted</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase text-red-600 font-bold">Rejected</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Line Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lineInputs.map((line, idx) => (
                    <tr key={line.purchaseOrderItemId} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-slate-900">{line.materialName}</div>
                        {line.materialCode && <div className="text-xs text-slate-400 font-mono">{line.materialCode}</div>}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                        {line.orderedQty} {line.unit}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-500">
                        {line.previouslyReceivedQty} {line.unit}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-amber-700 font-mono">
                        {line.remainingQty} {line.unit}
                      </td>
                      <td className="px-3 py-3 bg-blue-50/20">
                        <input 
                          type="number"
                          min="0"
                          max={line.remainingQty}
                          step="any"
                          className="input-field w-24 text-sm font-bold text-blue-900 bg-white"
                          value={line.receivingNow}
                          onChange={e => handleLineChange(idx, 'receivingNow', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input 
                          type="number"
                          min="0"
                          max={line.receivingNow}
                          step="any"
                          className="input-field w-24 text-sm font-semibold text-emerald-800 bg-emerald-50/30"
                          value={line.acceptedQty}
                          onChange={e => handleLineChange(idx, 'acceptedQty', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input 
                          type="number"
                          min="0"
                          max={line.receivingNow}
                          step="any"
                          className="input-field w-24 text-sm font-semibold text-red-700 bg-red-50/30"
                          value={line.rejectedQty}
                          onChange={e => handleLineChange(idx, 'rejectedQty', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input 
                          type="text"
                          placeholder="Line notes..."
                          className="input-field w-36 text-xs bg-white"
                          value={line.notes}
                          onChange={e => handleLineChange(idx, 'notes', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button 
            type="button" 
            onClick={() => navigate('/goods-receipts')}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button 
            type="submit" 
            disabled={saving || !selectedPO}
            className="btn-primary flex items-center"
          >
            <PackageCheck className="mr-2 h-4 w-4" /> {saving ? 'Processing...' : 'Process Goods Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
};

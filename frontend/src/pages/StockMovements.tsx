import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { getToken } from '../utils/auth';

interface StockMovement {
  id: string;
  movementNumber: string;
  type: string;
  quantity: number;
  unit: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
  material?: {
    id: string;
    name: string;
    materialCode?: string;
    unit?: string;
  };
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  variant?: {
    id: string;
    name: string;
    color?: string;
    size?: string;
  };
}

interface MaterialOption {
  id: string;
  name: string;
  materialCode?: string;
  unit?: string;
  currentStock: number;
}

export const StockMovements = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [adjForm, setAdjForm] = useState({
    materialId: '',
    type: 'ADJUSTMENT',
    quantity: '',
    notes: ''
  });
  const [adjError, setAdjError] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/stock-movements', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setMovements(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch stock movements', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/materials', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setMaterials(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch materials', e);
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchMaterials();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjSubmitting(true);
    setAdjError('');

    try {
      const res = await fetch('http://localhost:5000/api/stock-movements/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          materialId: adjForm.materialId,
          type: adjForm.type,
          quantity: parseFloat(adjForm.quantity),
          notes: adjForm.notes
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsAdjustModalOpen(false);
        setAdjForm({ materialId: '', type: 'ADJUSTMENT', quantity: '', notes: '' });
        fetchMovements();
        fetchMaterials();
      } else {
        setAdjError(data.error || 'Failed to submit adjustment');
      }
    } catch (e) {
      setAdjError('Network error');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      m.movementNumber.toLowerCase().includes(search) ||
      (m.notes && m.notes.toLowerCase().includes(search)) ||
      (m.material && m.material.name.toLowerCase().includes(search)) ||
      (m.product && m.product.name.toLowerCase().includes(search));
    
    const matchesType = typeFilter ? m.type === typeFilter : true;
    return matchesSearch && matchesType;
  });

  const getMovementTypeBadge = (type: string, quantity: number) => {
    switch (type) {
      case 'INWARD_GRN':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><ArrowDownLeft className="w-3 h-3 mr-1" /> Inward (GRN)</span>;
      case 'PRODUCTION_ISSUE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><ArrowUpRight className="w-3 h-3 mr-1" /> Production Issue</span>;
      case 'FINISHED_GOODS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><ArrowDownLeft className="w-3 h-3 mr-1" /> Finished Goods</span>;
      case 'SCRAP_WASTAGE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><ArrowUpRight className="w-3 h-3 mr-1" /> Scrap / Wastage</span>;
      case 'ADJUSTMENT':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><SlidersHorizontal className="w-3 h-3 mr-1" /> Adjustment</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Stock Movements Audit Ledger" 
          description="Track all inventory transactions including Receipts, Production Issues, Finished Goods, and Stock Adjustments." 
        />
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button onClick={fetchMovements} className="btn-secondary flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setIsAdjustModalOpen(true)} className="btn-primary flex items-center gap-1">
            <Plus className="h-4 w-4" /> Stock Adjustment
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Movement #, Item, or Reference..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-field sm:w-56 bg-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Movement Types</option>
            <option value="INWARD_GRN">Inward (Goods Receipt)</option>
            <option value="PRODUCTION_ISSUE">Production Issue</option>
            <option value="FINISHED_GOODS">Finished Goods Receipt</option>
            <option value="SCRAP_WASTAGE">Scrap / Wastage</option>
            <option value="ADJUSTMENT">Manual Adjustment</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Movement #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Item / Material / Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Notes / Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredMovements.map((sm) => {
                const isPositive = sm.quantity > 0;
                const itemName = sm.material ? sm.material.name : (sm.product ? `${sm.product.name} ${sm.variant ? `(${sm.variant.color || ''} ${sm.variant.size || ''})` : ''}` : 'Unknown');
                const itemCode = sm.material ? sm.material.materialCode : (sm.product ? sm.product.sku : '');

                return (
                  <tr key={sm.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                      {sm.movementNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {getMovementTypeBadge(sm.type, sm.quantity)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{itemName}</div>
                      {itemCode && <div className="text-xs text-slate-500">{itemCode}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${sm.quantity}` : sm.quantity} {sm.unit}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {sm.notes || sm.referenceType || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(sm.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? 'Loading stock movements...' : 'No stock movements recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjustment Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="New Stock Adjustment">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {adjError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{adjError}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700">Select Material *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={adjForm.materialId}
              onChange={(e) => setAdjForm({ ...adjForm, materialId: e.target.value })}
            >
              <option value="">-- Choose Material --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.materialCode || 'No Code'}) - Current Stock: {m.currentStock || 0} {m.unit || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Adjustment Type</label>
              <select
                className="input-field mt-1 bg-white"
                value={adjForm.type}
                onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
              >
                <option value="ADJUSTMENT">Manual Stock Count Adjustment</option>
                <option value="SCRAP_WASTAGE">Scrap / Damage / Wastage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Quantity * (+ or -)</label>
              <input
                required
                type="number"
                step="any"
                placeholder="e.g. +50 or -15"
                className="input-field mt-1"
                value={adjForm.quantity}
                onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })}
              />
              <span className="text-xs text-slate-500">Use positive value to add stock, negative to deduct.</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes / Reason</label>
            <textarea
              rows={2}
              className="input-field mt-1"
              placeholder="e.g. Physical inventory count discrepancy"
              value={adjForm.notes}
              onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={adjSubmitting} className="btn-primary">
              {adjSubmitting ? 'Posting...' : 'Post Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

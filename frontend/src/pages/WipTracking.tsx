import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Plus, Search, Activity, UserCheck, Play, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getToken } from '../utils/auth';

interface WipLog {
  id: string;
  sequence: number;
  operatorName?: string;
  completedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
  createdAt: string;
  batch: {
    id: string;
    batchNumber: string;
    targetQuantity: number;
    status: string;
  };
  productionOrder: {
    id: string;
    orderNumber: string;
  };
  operation: {
    id: string;
    name: string;
    code?: string;
    machineType?: string;
  };
}

interface BatchOption {
  id: string;
  batchNumber: string;
  targetQuantity: number;
  currentOperationId?: string;
  currentOperation?: { id: string; name: string; code?: string };
  product: { name: string };
  productionOrder: {
    id: string;
    orderNumber: string;
    routing?: {
      operations: { operation: { id: string; name: string; code?: string } }[];
    };
  };
}

interface OperationOption {
  id: string;
  name: string;
  code?: string;
}

export const WipTracking = () => {
  const [wipLogs, setWipLogs] = useState<WipLog[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [operations, setOperations] = useState<OperationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    batchId: '',
    operationId: '',
    operatorName: '',
    completedQuantity: '',
    rejectedQuantity: '0',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchWipLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/wip', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setWipLogs(await res.json());
    } catch (e) {
      console.error('Failed to fetch WIP logs', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/batches', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setBatches(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/operations', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setOperations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWipLogs();
    fetchBatches();
    fetchOperations();
  }, []);

  const handleBatchSelect = (batchId: string) => {
    const selected = batches.find(b => b.id === batchId);
    let opId = selected?.currentOperationId || '';

    setFormData({
      ...formData,
      batchId,
      operationId: opId,
      completedQuantity: selected ? String(selected.targetQuantity) : ''
    });
  };

  const handleLogWip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/wip/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          batchId: formData.batchId,
          operationId: formData.operationId,
          operatorName: formData.operatorName,
          completedQuantity: parseInt(formData.completedQuantity, 10),
          rejectedQuantity: parseInt(formData.rejectedQuantity || '0', 10),
          notes: formData.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ batchId: '', operationId: '', operatorName: '', completedQuantity: '', rejectedQuantity: '0', notes: '' });
        setSuccess('Operation logged successfully! Batch advanced to next routing station.');
        fetchWipLogs();
        fetchBatches();
      } else {
        setError(data.error || 'Failed to log WIP operation');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = wipLogs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.batch.batchNumber.toLowerCase().includes(search) ||
      log.operation.name.toLowerCase().includes(search) ||
      (log.operatorName && log.operatorName.toLowerCase().includes(search))
    );
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <PageHeader 
          title="Shop Floor WIP Tracking" 
          description="Log operation completions across cutting, sewing, embroidery, and assembly stations in real-time." 
        />
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto shrink-0">
          <button onClick={fetchWipLogs} className="btn-secondary flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" /> Log Operation
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-600" />
          {success}
        </div>
      )}

      <Card>
        <div className="mb-4 flex items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
          <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search by Operator, Batch #, or Operation..." 
            className="w-full bg-transparent px-3 py-1 outline-none text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase text-slate-500">Date & Time</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase text-slate-500">Batch #</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase text-slate-500">Station</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase text-slate-500">Operator</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Completed</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold text-primary-600">
                    {log.batch.batchNumber}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 font-mono">
                      {log.operation.code || log.operation.name}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5 hidden sm:inline">{log.operation.name}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">
                    {log.operatorName || 'Operator'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-right font-mono font-bold text-emerald-600">
                    +{log.completedQuantity} Pcs
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-right font-mono font-bold text-rose-600">
                    {log.rejectedQuantity > 0 ? `-${log.rejectedQuantity} Pcs` : '0'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                    {loading ? 'Loading WIP logs...' : 'No WIP operation logs recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log WIP Operation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Shop Floor Operation Progress">
        <form onSubmit={handleLogWip} className="space-y-4">
          {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Production Batch *</label>
            <select
              required
              className="input-field bg-white"
              value={formData.batchId}
              onChange={(e) => handleBatchSelect(e.target.value)}
            >
              <option value="">-- Choose Batch --</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} - {b.product.name} ({b.targetQuantity} Pcs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Operation Station *</label>
            <select
              required
              className="input-field bg-white"
              value={formData.operationId}
              onChange={(e) => setFormData({ ...formData, operationId: e.target.value })}
            >
              <option value="">-- Choose Operation --</option>
              {operations.map(op => (
                <option key={op.id} value={op.id}>
                  {op.code ? `[${op.code}] ` : ''}{op.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Operator Name / ID</label>
              <input
                type="text"
                placeholder="e.g. Operator #12"
                className="input-field"
                value={formData.operatorName}
                onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Completed Qty (Pcs) *</label>
              <input
                required
                type="number"
                min="1"
                className="input-field"
                value={formData.completedQuantity}
                onChange={(e) => setFormData({ ...formData, completedQuantity: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rejected / Scrap Qty (Pcs)</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={formData.rejectedQuantity}
              onChange={(e) => setFormData({ ...formData, rejectedQuantity: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Logging...' : 'Log & Advance Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

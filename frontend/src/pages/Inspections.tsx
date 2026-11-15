import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Wrench, PackageCheck } from 'lucide-react';
import { getToken } from '../utils/auth';

interface QualityInspection {
  id: string;
  inspectionNumber: string;
  inspectorName?: string;
  inspectionType: string;
  sampleSize: number;
  passedQuantity: number;
  reworkQuantity: number;
  rejectedQuantity: number;
  defectType?: string;
  result: string;
  notes?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku?: string;
  };
  batch?: {
    id: string;
    batchNumber: string;
  };
  productionOrder: {
    id: string;
    orderNumber: string;
  };
}

interface ReworkJob {
  id: string;
  reworkNumber: string;
  quantity: number;
  reworkedQuantity: number;
  scrapQuantity: number;
  defectType?: string;
  status: string;
  reworkNotes?: string;
  createdAt: string;
  product: { id: string; name: string };
  productionOrder: { id: string; orderNumber: string };
  batch?: { id: string; batchNumber: string };
}

interface OrderOption {
  id: string;
  orderNumber: string;
  productId: string;
  product: { name: string };
  batches?: { id: string; batchNumber: string; targetQuantity: number }[];
}

export const Inspections = () => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'rework'>('inspections');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [reworkJobs, setReworkJobs] = useState<ReworkJob[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  
  // Inspection Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productionOrderId: '',
    batchId: '',
    inspectorName: '',
    inspectionType: 'END_LINE',
    sampleSize: '50',
    passedQuantity: '45',
    reworkQuantity: '3',
    rejectedQuantity: '2',
    defectType: 'Broken Stitch',
    result: 'PASS',
    notes: ''
  });

  // Rework Repair Modal
  const [selectedRework, setSelectedRework] = useState<ReworkJob | null>(null);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkForm, setReworkForm] = useState({
    reworkedQuantity: '',
    scrapQuantity: '0',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/inspections', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setInspections(await res.json());
    } catch (e) {
      console.error('Failed to fetch inspections', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReworkJobs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rework', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setReworkJobs(await res.json());
    } catch (e) {
      console.error('Failed to fetch rework jobs', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/production-orders', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error('Failed to fetch orders', e);
    }
  };

  useEffect(() => {
    fetchInspections();
    fetchReworkJobs();
    fetchOrders();
  }, []);

  const handleOrderChange = (orderId: string) => {
    const selected = orders.find(o => o.id === orderId);
    setFormData({
      ...formData,
      productionOrderId: orderId,
      batchId: selected?.batches && selected.batches.length > 0 ? selected.batches[0].id : ''
    });
  };

  const handleRecordInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...formData,
          sampleSize: parseInt(formData.sampleSize, 10),
          passedQuantity: parseInt(formData.passedQuantity, 10),
          reworkQuantity: parseInt(formData.reworkQuantity || '0', 10),
          rejectedQuantity: parseInt(formData.rejectedQuantity || '0', 10)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setSuccess('Quality inspection recorded! Passed garments auto-transferred into Finished Goods.');
        fetchInspections();
        fetchReworkJobs();
      } else {
        setError(data.error || 'Failed to record inspection');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const openReworkModal = (job: ReworkJob) => {
    setSelectedRework(job);
    setReworkForm({
      reworkedQuantity: String(job.quantity),
      scrapQuantity: '0',
      notes: ''
    });
    setIsReworkModalOpen(true);
  };

  const handleCompleteRework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRework) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/rework/${selectedRework.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          reworkedQuantity: parseInt(reworkForm.reworkedQuantity, 10),
          scrapQuantity: parseInt(reworkForm.scrapQuantity || '0', 10),
          notes: reworkForm.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsReworkModalOpen(false);
        setSuccess('Rework repair completed! Repaired garments re-inspected and received into Finished Goods Stock.');
        fetchInspections();
        fetchReworkJobs();
      } else {
        setError(data.error || 'Failed to complete rework job');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInspections = inspections.filter(ins => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      ins.inspectionNumber.toLowerCase().includes(search) ||
      ins.product.name.toLowerCase().includes(search) ||
      (ins.inspectorName && ins.inspectorName.toLowerCase().includes(search)) ||
      (ins.defectType && ins.defectType.toLowerCase().includes(search));
    
    const matchesResult = resultFilter ? ins.result === resultFilter : true;
    return matchesSearch && matchesResult;
  });

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> PASS</span>;
      case 'REWORK_REQUIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" /> REWORK</span>;
      case 'FAIL':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><XCircle className="w-3 h-3 mr-1" /> FAIL</span>;
    }
  };

  const totalChecked = inspections.reduce((sum, i) => sum + i.sampleSize, 0);
  const totalPassed = inspections.reduce((sum, i) => sum + i.passedQuantity, 0);
  const totalReworkPending = reworkJobs.filter(j => j.status === 'PENDING_REWORK' || j.status === 'IN_REWORK').reduce((sum, j) => sum + j.quantity, 0);
  const passRate = totalChecked > 0 ? Math.round((totalPassed / totalChecked) * 100) : 100;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Quality Control & Rework Station" 
          description="Perform Inline, End-of-Line, and Final Audit garment inspections, manage rework repairs, and track pass rates." 
        />
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button onClick={() => { fetchInspections(); fetchReworkJobs(); }} className="btn-secondary flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-1">
            <Plus className="h-4 w-4" /> Record Inspection
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
          <CheckCircle2 className="w-5 h-5 inline mr-2 text-emerald-600" />
          {success}
        </div>
      )}

      {/* QC Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Inspected Garments</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalChecked} Pcs</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">First-Time Pass Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{passRate}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Garments Needing Rework</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{totalReworkPending} Pcs</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-semibold">Passed to Finished Goods</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{totalPassed} Pcs</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('inspections')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'inspections' ? 'border-primary-600 text-primary-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Quality Inspections History ({inspections.length})
        </button>
        <button
          onClick={() => setActiveTab('rework')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center gap-1.5 ${
            activeTab === 'rework' ? 'border-primary-600 text-primary-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wrench className="w-4 h-4" /> Rework Station Queue ({reworkJobs.filter(j => j.status === 'PENDING_REWORK').length} Pending)
        </button>
      </div>

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <Card>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Search className="h-5 w-5 text-slate-400 ml-2" />
              <input 
                type="text" 
                placeholder="Search by QC #, Garment Style, Inspector, or Defect Type..." 
                className="w-full bg-transparent px-3 py-1 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="input-field sm:w-48 bg-white"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option value="">All QC Results</option>
              <option value="PASS">PASS</option>
              <option value="REWORK_REQUIRED">REWORK</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Inspection #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Garment Style</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Passed / Rework / Rejected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Defect Classification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredInspections.map(ins => (
                  <tr key={ins.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-slate-900">
                      {ins.inspectionNumber}
                      {ins.batch && <div className="text-xs text-slate-500 font-normal">Batch: {ins.batch.batchNumber}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">
                      {ins.inspectionType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      {ins.product.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold">
                      <span className="text-emerald-600">{ins.passedQuantity} Pass</span> / <span className="text-amber-600">{ins.reworkQuantity} Rwk</span> / <span className="text-rose-600">{ins.rejectedQuantity} Rej</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {ins.defectType || 'None'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {getResultBadge(ins.result)}
                    </td>
                  </tr>
                ))}
                {filteredInspections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      {loading ? 'Loading quality inspections...' : 'No quality inspections recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Rework Queue Tab */}
      {activeTab === 'rework' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Rework Job #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Garment Style</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Defect Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Rework Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {reworkJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-amber-700">
                      {job.reworkNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      {job.product.name}
                      {job.productionOrder && <div className="text-xs text-slate-500">WO: {job.productionOrder.orderNumber}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-amber-800 font-semibold">
                      {job.defectType || 'Defect repair'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-mono font-bold text-slate-900">
                      {job.quantity} Pcs
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={job.status === 'REINSPECTED' ? 'success' : 'warning'}>
                        {job.status}
                      </StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right">
                      {job.status === 'PENDING_REWORK' || job.status === 'IN_REWORK' ? (
                        <button
                          onClick={() => openReworkModal(job)}
                          className="btn-primary text-xs flex items-center gap-1 ml-auto"
                        >
                          <Wrench className="w-3.5 h-3.5" /> Repair & Re-inspect
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">Re-inspected to FG</span>
                      )}
                    </td>
                  </tr>
                ))}
                {reworkJobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No garments currently in Rework Queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Inspection Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Garment Quality Inspection">
        <form onSubmit={handleRecordInspection} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700">Select Production Order *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={formData.productionOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
            >
              <option value="">-- Choose Order --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} - {o.product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Inspection Stage</label>
              <select
                className="input-field mt-1 bg-white"
                value={formData.inspectionType}
                onChange={(e) => setFormData({ ...formData, inspectionType: e.target.value })}
              >
                <option value="END_LINE">End-of-Line Quality Check</option>
                <option value="FINAL_AUDIT">Final QA Audit</option>
                <option value="INLINE">Inline Sewing Check</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Inspector Name</label>
              <input
                type="text"
                placeholder="e.g. Inspector Sarah"
                className="input-field mt-1"
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Sample Size</label>
              <input
                required
                type="number"
                min="1"
                className="input-field mt-1 text-sm"
                value={formData.sampleSize}
                onChange={(e) => setFormData({ ...formData, sampleSize: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 font-semibold">Passed Qty</label>
              <input
                required
                type="number"
                min="0"
                className="input-field mt-1 text-sm"
                value={formData.passedQuantity}
                onChange={(e) => setFormData({ ...formData, passedQuantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 font-semibold">Rework Qty</label>
              <input
                type="number"
                min="0"
                className="input-field mt-1 text-sm"
                value={formData.reworkQuantity}
                onChange={(e) => setFormData({ ...formData, reworkQuantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-rose-700 font-semibold">Scrap Qty</label>
              <input
                type="number"
                min="0"
                className="input-field mt-1 text-sm"
                value={formData.rejectedQuantity}
                onChange={(e) => setFormData({ ...formData, rejectedQuantity: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Defect Classification</label>
              <select
                className="input-field mt-1 bg-white"
                value={formData.defectType}
                onChange={(e) => setFormData({ ...formData, defectType: e.target.value })}
              >
                <option value="None">None (100% Passed)</option>
                <option value="Broken Stitch">Broken Stitch / Skip Stitch</option>
                <option value="Fabric Stain">Fabric Stain / Dirt</option>
                <option value="Measurement Out of Spec">Measurement Out of Spec</option>
                <option value="Button Defect">Button / Zipper Alignment Defect</option>
                <option value="Shading Defect">Color Shading Discrepancy</option>
                <option value="Other">Other Defect</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Overall Result</label>
              <select
                className="input-field mt-1 bg-white"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              >
                <option value="PASS">PASS (Transfer Passed to FG)</option>
                <option value="REWORK_REQUIRED">REWORK REQUIRED (Queue for Repair)</option>
                <option value="FAIL">FAIL (Scrap Batch)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Recording...' : 'Record Inspection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Rework Repair Modal */}
      {selectedRework && (
        <Modal isOpen={isReworkModalOpen} onClose={() => setIsReworkModalOpen(false)} title={`Complete Rework Repair - ${selectedRework.reworkNumber}`}>
          <form onSubmit={handleCompleteRework} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
              Garment Style: <strong>{selectedRework.product.name}</strong> | Defect: <strong>{selectedRework.defectType || 'Repair'}</strong> | Total Needing Repair: <strong>{selectedRework.quantity} Pcs</strong>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Repaired & Passed Qty (Pcs) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="input-field mt-1"
                  value={reworkForm.reworkedQuantity}
                  onChange={(e) => setReworkForm({ ...reworkForm, reworkedQuantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Scrapped Qty (Pcs)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field mt-1"
                  value={reworkForm.scrapQuantity}
                  onChange={(e) => setReworkForm({ ...reworkForm, scrapQuantity: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Rework Repair Notes</label>
              <textarea
                rows={2}
                className="input-field mt-1"
                placeholder="e.g. Re-stitched collar seam and spot cleaned fabric stain"
                value={reworkForm.notes}
                onChange={(e) => setReworkForm({ ...reworkForm, notes: e.target.value })}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsReworkModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Re-inspecting...' : 'Complete Rework & Transfer to FG'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

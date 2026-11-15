import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Modal } from './Modal';
import { Plus, Edit, Trash2, Activity, ArrowUp, ArrowDown, Settings, AlertCircle, ArrowRight } from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface MasterOperation {
  id: string;
  name: string;
  code?: string;
  description?: string;
  machineType?: string;
  standardTime?: number;
  status: string;
}

interface RoutingOperation {
  id: string;
  routingId: string;
  operationId: string;
  operation: MasterOperation;
  sequence: number;
  machineType?: string;
  standardTime?: number;
  notes?: string;
}

interface Routing {
  id: string;
  productId: string;
  version: string;
  name: string;
  description?: string;
  status: string;
  operations: RoutingOperation[];
  createdAt: string;
}

interface RoutingViewProps {
  productId: string;
  productName: string;
}

export const RoutingView: React.FC<RoutingViewProps> = ({ productId, productName }) => {
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [selectedRoutingId, setSelectedRoutingId] = useState<string>('');
  const [masterOperations, setMasterOperations] = useState<MasterOperation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<RoutingOperation | null>(null);
  const [editingMaster, setEditingMaster] = useState<MasterOperation | null>(null);

  // Form states
  const [routingForm, setRoutingForm] = useState({ version: 'v1.0', name: 'Standard Assembly Line', description: '', status: 'ACTIVE' });
  const [stepForm, setStepForm] = useState({ operationId: '', sequence: '1', machineType: '', standardTime: '', notes: '' });
  const [masterForm, setMasterForm] = useState({ name: '', code: '', description: '', machineType: '', standardTime: '', status: 'ACTIVE' });

  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchRoutings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/products/${productId}/routings`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data: Routing[] = await res.json();
        setRoutings(data);
        if (data.length > 0) {
          const active = data.find(r => r.status === 'ACTIVE') || data[0];
          setSelectedRoutingId(active.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch routings', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterOperations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/operations', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setMasterOperations(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRoutings();
    fetchMasterOperations();
  }, [productId]);

  const selectedRouting = routings.find(r => r.id === selectedRoutingId) || null;

  // Create Routing
  const handleCreateRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError('');

    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}/routings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(routingForm)
      });
      const data = await res.json();
      if (res.ok) {
        setIsRoutingModalOpen(false);
        setRoutingForm({ version: `v${routings.length + 1}.0`, name: `${productName} Routing`, description: '', status: 'ACTIVE' });
        await fetchRoutings();
        setSelectedRoutingId(data.id);
      } else {
        setModalError(data.error || 'Failed to create routing');
      }
    } catch (e) {
      setModalError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Set active routing
  const handleSetStatus = async (status: string) => {
    if (!selectedRouting) return;
    try {
      const res = await fetch(`http://localhost:5000/api/routings/${selectedRouting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchRoutings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete routing
  const handleDeleteRouting = async () => {
    if (!selectedRouting) return;
    if (!confirm(`Are you sure you want to delete routing version ${selectedRouting.version}?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/routings/${selectedRouting.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchRoutings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Step Modal
  const handleOpenStepModal = (step?: RoutingOperation) => {
    setModalError('');
    if (step) {
      setEditingStep(step);
      setStepForm({
        operationId: step.operationId,
        sequence: String(step.sequence),
        machineType: step.machineType || '',
        standardTime: step.standardTime !== null && step.standardTime !== undefined ? String(step.standardTime) : '',
        notes: step.notes || ''
      });
    } else {
      setEditingStep(null);
      const defaultOp = masterOperations[0];
      const nextSeq = selectedRouting ? (selectedRouting.operations.length + 1) : 1;
      setStepForm({
        operationId: defaultOp ? defaultOp.id : '',
        sequence: String(nextSeq),
        machineType: defaultOp?.machineType || '',
        standardTime: defaultOp?.standardTime ? String(defaultOp.standardTime) : '',
        notes: ''
      });
    }
    setIsStepModalOpen(true);
  };

  // Master op dropdown change updates default machine type & standard time
  const handleOpDropdownChange = (opId: string) => {
    const master = masterOperations.find(m => m.id === opId);
    setStepForm(prev => ({
      ...prev,
      operationId: opId,
      machineType: master?.machineType || prev.machineType,
      standardTime: master?.standardTime ? String(master.standardTime) : prev.standardTime
    }));
  };

  // Save Operation Step
  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouting) return;
    setActionLoading(true);
    setModalError('');

    try {
      const url = editingStep
        ? `http://localhost:5000/api/routing-operations/${editingStep.id}`
        : `http://localhost:5000/api/routings/${selectedRouting.id}/operations`;
      const method = editingStep ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(stepForm)
      });

      const data = await res.json();
      if (res.ok) {
        setIsStepModalOpen(false);
        fetchRoutings();
      } else {
        setModalError(data.error || 'Failed to save operation step');
      }
    } catch (e) {
      setModalError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Step
  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to remove this operation step from the routing?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/routing-operations/${stepId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchRoutings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Move Step Up / Down
  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    if (!selectedRouting || !selectedRouting.operations) return;
    const ops = [...selectedRouting.operations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ops.length) return;

    // Swap sequence values
    const currentOp = ops[index];
    const targetOp = ops[targetIndex];
    if (!currentOp || !targetOp) return;

    const tempSeq = currentOp.sequence;
    currentOp.sequence = targetOp.sequence;
    targetOp.sequence = tempSeq;

    try {
      const res = await fetch('http://localhost:5000/api/routing-operations/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          items: [
            { id: currentOp.id, sequence: currentOp.sequence },
            { id: targetOp.id, sequence: targetOp.sequence }
          ]
        })
      });
      if (res.ok) {
        fetchRoutings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Master Operations Management
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError('');

    try {
      const url = editingMaster
        ? `http://localhost:5000/api/operations/${editingMaster.id}`
        : 'http://localhost:5000/api/operations';
      const method = editingMaster ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(masterForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditingMaster(null);
        setMasterForm({ name: '', code: '', description: '', machineType: '', standardTime: '', status: 'ACTIVE' });
        fetchMasterOperations();
      } else {
        setModalError(data.error || 'Failed to save master operation');
      }
    } catch (e) {
      setModalError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalTime = selectedRouting?.operations?.reduce((sum, op) => sum + (op.standardTime || 0), 0) || 0;

  if (loading) return <div className="py-8 text-center text-slate-500">Loading Routing data...</div>;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary-600" />
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manufacturing Routing</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">{productName}</span>
              {selectedRouting && (
                <StatusBadge status={selectedRouting.status === 'ACTIVE' ? 'success' : selectedRouting.status === 'DRAFT' ? 'warning' : 'default'}>
                  {selectedRouting.status}
                </StatusBadge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {routings.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Version:</label>
              <select
                className="input-field py-1 px-3 text-sm bg-slate-50 border-slate-300 font-medium"
                value={selectedRoutingId}
                onChange={e => setSelectedRoutingId(e.target.value)}
              >
                {routings.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.version} - {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {canEdit() && (
            <>
              <button onClick={() => setIsMasterModalOpen(true)} className="btn-secondary text-xs py-2">
                <Settings className="h-3.5 w-3.5 mr-1 inline" /> Operations Master
              </button>
              <button onClick={() => setIsRoutingModalOpen(true)} className="btn-secondary text-sm">
                <Plus className="h-4 w-4 mr-1.5 inline" /> New Version
              </button>
            </>
          )}
        </div>
      </div>

      {!selectedRouting ? (
        <Card className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-700">No Routing Defined</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            This garment does not have a manufacturing process routing defined. Create a routing to specify assembly steps and standard time metrics.
          </p>
          {canEdit() && (
            <button onClick={() => setIsRoutingModalOpen(true)} className="btn-primary mt-4 text-sm">
              <Plus className="h-4 w-4 mr-2" /> Create First Routing
            </button>
          )}
        </Card>
      ) : (
        <>
          {/* Visual Manufacturing Flow Representation */}
          <Card className="bg-slate-900 text-white border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Production Process Flow
              </h4>
              <span className="text-xs text-primary-300 font-medium">
                Total Standard Time: <strong className="text-white text-sm">{totalTime.toFixed(1)} mins</strong>
              </span>
            </div>

            {selectedRouting.operations && selectedRouting.operations.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 py-2 overflow-x-auto">
                {selectedRouting.operations.map((op, idx) => (
                  <React.Fragment key={op.id}>
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg shrink-0">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold">
                        {op.sequence}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{op.operation?.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{op.machineType || op.operation?.machineType || 'Manual'}</span>
                          {op.standardTime !== null && op.standardTime !== undefined && (
                            <span className="text-emerald-400">{op.standardTime}m</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {idx < selectedRouting.operations.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 italic">No operations added to this routing version yet.</p>
            )}
          </Card>

          {/* Operations Table */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedRouting.name} ({selectedRouting.version})</h3>
                <p className="text-sm text-slate-500 mt-0.5">{selectedRouting.description || 'No description provided'}</p>
              </div>

              {canEdit() && (
                <div className="flex items-center gap-2">
                  {selectedRouting.status !== 'ACTIVE' && (
                    <button onClick={() => handleSetStatus('ACTIVE')} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-3 py-1.5 rounded-md border border-emerald-200">
                      Set Active
                    </button>
                  )}
                  {selectedRouting.status === 'ACTIVE' && (
                    <button onClick={() => handleSetStatus('INACTIVE')} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium px-3 py-1.5 rounded-md">
                      Set Inactive
                    </button>
                  )}
                  <button onClick={handleDeleteRouting} className="text-xs text-red-600 hover:bg-red-50 p-1.5 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Operation Steps ({selectedRouting.operations?.length || 0})
                </h4>
                {canEdit() && (
                  <button onClick={() => handleOpenStepModal()} className="btn-primary text-xs py-1.5">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 w-16">Seq</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Operation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Machine Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Standard Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Notes</th>
                      {canEdit() && <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedRouting.operations?.map((step, idx) => (
                      <tr key={step.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs">
                            {step.sequence}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {step.operation?.name}
                          {step.operation?.code && (
                            <span className="block text-xs font-normal text-slate-400">Code: {step.operation.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{step.machineType || step.operation?.machineType || 'Manual'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                          {step.standardTime !== null && step.standardTime !== undefined ? `${step.standardTime} mins` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{step.notes || '-'}</td>
                        {canEdit() && (
                          <td className="px-4 py-3 text-sm text-right space-x-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              className={`p-1 rounded ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                              title="Move Up"
                            >
                              <ArrowUp className="h-4 w-4 inline" />
                            </button>
                            <button
                              disabled={idx === (selectedRouting.operations.length - 1)}
                              onClick={() => handleMoveStep(idx, 'down')}
                              className={`p-1 rounded ${idx === (selectedRouting.operations.length - 1) ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                              title="Move Down"
                            >
                              <ArrowDown className="h-4 w-4 inline" />
                            </button>
                            <button onClick={() => handleOpenStepModal(step)} className="p-1 text-slate-400 hover:text-primary-600">
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button onClick={() => handleDeleteStep(step.id)} className="p-1 text-slate-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!selectedRouting.operations || selectedRouting.operations.length === 0) && (
                      <tr>
                        <td colSpan={canEdit() ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-400">
                          No operation steps added to this routing version yet. Click "Add Step" to define process sequence.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal: Create Routing Version */}
      <Modal isOpen={isRoutingModalOpen} onClose={() => setIsRoutingModalOpen(false)} title="Create Routing Version">
        <form onSubmit={handleCreateRouting} className="space-y-4">
          {modalError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{modalError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Version Code *</label>
              <input required type="text" className="input-field mt-1" placeholder="e.g. v1.0" value={routingForm.version} onChange={e => setRoutingForm({...routingForm, version: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field mt-1 bg-white" value={routingForm.status} onChange={e => setRoutingForm({...routingForm, status: e.target.value})}>
                <option value="ACTIVE">ACTIVE (Default for production)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Routing Name *</label>
            <input required type="text" className="input-field mt-1" placeholder="e.g. T-Shirt Standard Assembly" value={routingForm.name} onChange={e => setRoutingForm({...routingForm, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea className="input-field mt-1" rows={3} placeholder="Process instructions, line layout details, or target efficiency notes" value={routingForm.description} onChange={e => setRoutingForm({...routingForm, description: e.target.value})} />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsRoutingModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={actionLoading} className="btn-primary">
              {actionLoading ? 'Creating...' : 'Create Routing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add / Edit Operation Step */}
      <Modal isOpen={isStepModalOpen} onClose={() => setIsStepModalOpen(false)} title={editingStep ? 'Edit Operation Step' : 'Add Operation Step'}>
        <form onSubmit={handleSaveStep} className="space-y-4">
          {modalError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{modalError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Operation *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={stepForm.operationId}
              onChange={e => handleOpDropdownChange(e.target.value)}
            >
              <option value="">-- Select Master Operation --</option>
              {masterOperations.map(op => (
                <option key={op.id} value={op.id}>
                  {op.name} {op.code ? `(${op.code})` : ''} - [{op.machineType || 'Manual'}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Sequence No. *</label>
              <input required type="number" min="1" className="input-field mt-1" value={stepForm.sequence} onChange={e => setStepForm({...stepForm, sequence: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Machine Type</label>
              <input type="text" className="input-field mt-1" placeholder="e.g. Single Needle Lockstitch" value={stepForm.machineType} onChange={e => setStepForm({...stepForm, machineType: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Standard Time (mins)</label>
            <input type="number" step="0.1" min="0" className="input-field mt-1" placeholder="e.g. 2.5" value={stepForm.standardTime} onChange={e => setStepForm({...stepForm, standardTime: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Step Notes / Work Instruction</label>
            <input type="text" className="input-field mt-1" placeholder="e.g. 4-thread overlock, stitch density 12 spi" value={stepForm.notes} onChange={e => setStepForm({...stepForm, notes: e.target.value})} />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsStepModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={actionLoading || masterOperations.length === 0} className="btn-primary">
              {actionLoading ? 'Saving...' : 'Save Step'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Operations Master Management */}
      <Modal isOpen={isMasterModalOpen} onClose={() => setIsMasterModalOpen(false)} title="Operations Master Catalog">
        <div className="space-y-6">
          <form onSubmit={handleSaveMaster} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">
              {editingMaster ? 'Edit Master Operation' : 'Add New Master Operation'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Operation Name *</label>
                <input required type="text" className="input-field mt-1 py-1 text-sm" placeholder="e.g. Button Attachment" value={masterForm.name} onChange={e => setMasterForm({...masterForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Code (Unique)</label>
                <input type="text" className="input-field mt-1 py-1 text-sm" placeholder="e.g. OP-BTN" value={masterForm.code} onChange={e => setMasterForm({...masterForm, code: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Machine Type</label>
                <input type="text" className="input-field mt-1 py-1 text-sm" placeholder="e.g. Button Holing Machine" value={masterForm.machineType} onChange={e => setMasterForm({...masterForm, machineType: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Standard Time (mins)</label>
                <input type="number" step="0.1" className="input-field mt-1 py-1 text-sm" placeholder="1.2" value={masterForm.standardTime} onChange={e => setMasterForm({...masterForm, standardTime: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editingMaster && (
                <button type="button" onClick={() => { setEditingMaster(null); setMasterForm({ name: '', code: '', description: '', machineType: '', standardTime: '', status: 'ACTIVE' }); }} className="btn-secondary text-xs py-1">
                  Cancel Edit
                </button>
              )}
              <button type="submit" disabled={actionLoading} className="btn-primary text-xs py-1">
                {editingMaster ? 'Update Master' : 'Save Master'}
              </button>
            </div>
          </form>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Machine</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Std Time</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {masterOperations.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">{op.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{op.code || '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{op.machineType || 'Manual'}</td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right">{op.standardTime ? `${op.standardTime}m` : '-'}</td>
                    <td className="px-3 py-2 text-xs text-right">
                      <button
                        onClick={() => {
                          setEditingMaster(op);
                          setMasterForm({
                            name: op.name,
                            code: op.code || '',
                            description: op.description || '',
                            machineType: op.machineType || '',
                            standardTime: op.standardTime ? String(op.standardTime) : '',
                            status: op.status
                          });
                        }}
                        className="text-primary-600 hover:text-primary-800 mr-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

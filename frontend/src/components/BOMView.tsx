import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Modal } from './Modal';
import { Plus, Edit, Trash2, Layers, AlertCircle } from 'lucide-react';
import { getToken, canEdit } from '../utils/auth';

interface Material {
  id: string;
  name: string;
  materialCode?: string;
  category?: string;
  unit?: string;
}

interface BomItem {
  id: string;
  bomId: string;
  materialId: string;
  material: Material;
  quantity: number;
  unit: string;
  wastagePercentage: number;
  notes?: string;
}

interface BOM {
  id: string;
  productId: string;
  version: string;
  name: string;
  description?: string;
  status: string;
  items: BomItem[];
  createdAt: string;
}

interface BOMViewProps {
  productId: string;
  productName: string;
}

export const BOMView: React.FC<BOMViewProps> = ({ productId, productName }) => {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItem | null>(null);

  // Form states
  const [bomForm, setBomForm] = useState({ version: 'v1.0', name: 'Default BOM', description: '', status: 'ACTIVE' });
  const [itemForm, setItemForm] = useState({ materialId: '', quantity: '1', unit: 'Meter', wastagePercentage: '5', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchBoms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/products/${productId}/boms`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data: BOM[] = await res.json();
        setBoms(data);
        if (data.length > 0) {
          // Select active BOM first or first available BOM
          const active = data.find(b => b.status === 'ACTIVE') || data[0];
          setSelectedBomId(active.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch BOMs', e);
      setError('Failed to load BOM data');
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
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBoms();
    fetchMaterials();
  }, [productId]);

  const selectedBom = boms.find(b => b.id === selectedBomId) || null;

  // Handle BOM creation
  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setModalError('');

    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}/boms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(bomForm)
      });
      const data = await res.json();
      if (res.ok) {
        setIsBomModalOpen(false);
        setBomForm({ version: `v${boms.length + 1}.0`, name: `${productName} BOM`, description: '', status: 'ACTIVE' });
        await fetchBoms();
        setSelectedBomId(data.id);
      } else {
        setModalError(data.error || 'Failed to create BOM version');
      }
    } catch (e) {
      setModalError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle BOM status
  const handleSetStatus = async (status: string) => {
    if (!selectedBom) return;
    try {
      const res = await fetch(`http://localhost:5000/api/boms/${selectedBom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchBoms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete BOM
  const handleDeleteBom = async () => {
    if (!selectedBom) return;
    if (!confirm(`Are you sure you want to delete BOM version ${selectedBom.version}?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/boms/${selectedBom.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchBoms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Add / Edit Item
  const handleOpenItemModal = (item?: BomItem) => {
    setModalError('');
    if (item) {
      setEditingItem(item);
      setItemForm({
        materialId: item.materialId,
        quantity: String(item.quantity),
        unit: item.unit,
        wastagePercentage: String(item.wastagePercentage),
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      const defaultMat = materials[0];
      setItemForm({
        materialId: defaultMat ? defaultMat.id : '',
        quantity: '1',
        unit: defaultMat?.unit || 'Meter',
        wastagePercentage: '5',
        notes: ''
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom) return;
    setActionLoading(true);
    setModalError('');

    try {
      const url = editingItem
        ? `http://localhost:5000/api/bom-items/${editingItem.id}`
        : `http://localhost:5000/api/boms/${selectedBom.id}/items`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(itemForm)
      });

      const data = await res.json();
      if (res.ok) {
        setIsItemModalOpen(false);
        fetchBoms();
      } else {
        setModalError(data.error || 'Failed to save material item');
      }
    } catch (e) {
      setModalError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this material from the BOM?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/bom-items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchBoms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Material selection change update default unit
  const handleMaterialChange = (matId: string) => {
    const mat = materials.find(m => m.id === matId);
    setItemForm(prev => ({
      ...prev,
      materialId: matId,
      unit: mat?.unit || prev.unit
    }));
  };

  if (loading) return <div className="py-8 text-center text-slate-500">Loading BOM data...</div>;

  return (
    <div className="space-y-6">
      {/* Header bar with Version selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary-600" />
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bill of Materials</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">{productName}</span>
              {selectedBom && (
                <StatusBadge status={selectedBom.status === 'ACTIVE' ? 'success' : selectedBom.status === 'DRAFT' ? 'warning' : 'default'}>
                  {selectedBom.status}
                </StatusBadge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {boms.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Version:</label>
              <select
                className="input-field py-1 px-3 text-sm bg-slate-50 border-slate-300 font-medium"
                value={selectedBomId}
                onChange={e => setSelectedBomId(e.target.value)}
              >
                {boms.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.version} - {b.name} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {canEdit() && (
            <button onClick={() => setIsBomModalOpen(true)} className="btn-secondary text-sm">
              <Plus className="h-4 w-4 mr-1.5 inline" /> New Version
            </button>
          )}
        </div>
      </div>

      {!selectedBom ? (
        <Card className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-700">No BOM Defined</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            This garment does not have any Bill of Materials created yet. Create a BOM version to specify required fabrics and trims.
          </p>
          {canEdit() && (
            <button onClick={() => setIsBomModalOpen(true)} className="btn-primary mt-4 text-sm">
              <Plus className="h-4 w-4 mr-2" /> Create First BOM
            </button>
          )}
        </Card>
      ) : (
        <>
          {/* BOM Header Card & Actions */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedBom.name} ({selectedBom.version})</h3>
                <p className="text-sm text-slate-500 mt-0.5">{selectedBom.description || 'No description provided'}</p>
              </div>

              {canEdit() && (
                <div className="flex items-center gap-2">
                  {selectedBom.status !== 'ACTIVE' && (
                    <button onClick={() => handleSetStatus('ACTIVE')} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-3 py-1.5 rounded-md border border-emerald-200">
                      Set Active
                    </button>
                  )}
                  {selectedBom.status === 'ACTIVE' && (
                    <button onClick={() => handleSetStatus('INACTIVE')} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium px-3 py-1.5 rounded-md">
                      Set Inactive
                    </button>
                  )}
                  <button onClick={handleDeleteBom} className="text-xs text-red-600 hover:bg-red-50 p-1.5 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Material Items Table */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Materials Required ({selectedBom.items?.length || 0})
                </h4>
                {canEdit() && (
                  <button onClick={() => handleOpenItemModal()} className="btn-primary text-xs py-1.5">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Material
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Unit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Wastage %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Est. Requirement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Notes</th>
                      {canEdit() && <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedBom.items?.map(item => {
                      const estReq = item.quantity * (1 + (item.wastagePercentage || 0) / 100);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {item.material?.name}
                            {item.material?.materialCode && (
                              <span className="block text-xs font-normal text-slate-400">Code: {item.material.materialCode}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{item.material?.category || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">{item.wastagePercentage}%</td>
                          <td className="px-4 py-3 text-sm font-semibold text-primary-700 text-right">
                            {estReq.toFixed(3)} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{item.notes || '-'}</td>
                          {canEdit() && (
                            <td className="px-4 py-3 text-sm text-right space-x-2">
                              <button onClick={() => handleOpenItemModal(item)} className="text-slate-400 hover:text-primary-600">
                                <Edit className="h-4 w-4 inline" />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4 inline" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {(!selectedBom.items || selectedBom.items.length === 0) && (
                      <tr>
                        <td colSpan={canEdit() ? 8 : 7} className="px-4 py-8 text-center text-sm text-slate-400">
                          No materials added to this BOM version yet. Click "Add Material" to list fabrics & trims.
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

      {/* Modal: Create BOM Version */}
      <Modal isOpen={isBomModalOpen} onClose={() => setIsBomModalOpen(false)} title="Create BOM Version">
        <form onSubmit={handleCreateBom} className="space-y-4">
          {modalError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{modalError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Version Code *</label>
              <input required type="text" className="input-field mt-1" placeholder="e.g. v1.0" value={bomForm.version} onChange={e => setBomForm({...bomForm, version: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field mt-1 bg-white" value={bomForm.status} onChange={e => setBomForm({...bomForm, status: e.target.value})}>
                <option value="ACTIVE">ACTIVE (Default for production)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">BOM Name *</label>
            <input required type="text" className="input-field mt-1" placeholder="e.g. Cotton T-Shirt Standard BOM" value={bomForm.name} onChange={e => setBomForm({...bomForm, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea className="input-field mt-1" rows={3} placeholder="Notes regarding fabric specs or seasonal variations" value={bomForm.description} onChange={e => setBomForm({...bomForm, description: e.target.value})} />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsBomModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={actionLoading} className="btn-primary">
              {actionLoading ? 'Creating...' : 'Create BOM'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add / Edit Material Item */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem ? 'Edit BOM Material' : 'Add Material to BOM'}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          {modalError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{modalError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Material *</label>
            <select
              required
              className="input-field mt-1 bg-white"
              value={itemForm.materialId}
              onChange={e => handleMaterialChange(e.target.value)}
            >
              <option value="">-- Select Material --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.materialCode ? `(${m.materialCode})` : ''} - [{m.category || 'General'}]
                </option>
              ))}
            </select>
            {materials.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No materials found in Inventory Master. Please add materials under Inventory first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Base Quantity *</label>
              <input required type="number" step="0.001" min="0.0001" className="input-field mt-1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Unit *</label>
              <input required type="text" className="input-field mt-1" placeholder="e.g. Meter, Kg, Piece" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Wastage %</label>
              <input type="number" step="0.1" min="0" className="input-field mt-1" placeholder="5" value={itemForm.wastagePercentage} onChange={e => setItemForm({...itemForm, wastagePercentage: e.target.value})} />
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block text-xs font-medium text-slate-500">Calculated Est. Requirement</span>
              <span className="text-base font-bold text-primary-700 mt-1 block">
                {(parseFloat(itemForm.quantity || '0') * (1 + parseFloat(itemForm.wastagePercentage || '0') / 100)).toFixed(3)} {itemForm.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes / Placement</label>
            <input type="text" className="input-field mt-1" placeholder="e.g. Body fabric, collar piping, care label" value={itemForm.notes} onChange={e => setItemForm({...itemForm, notes: e.target.value})} />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsItemModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={actionLoading || materials.length === 0} className="btn-primary">
              {actionLoading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

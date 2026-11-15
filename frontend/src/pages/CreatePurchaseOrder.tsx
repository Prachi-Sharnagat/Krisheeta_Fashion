import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Plus, Trash2, Save, Send, AlertCircle } from 'lucide-react';
import { getToken } from '../utils/auth';

interface Supplier {
  id: string;
  name: string;
  supplierCode?: string;
  companyName?: string;
}

interface Material {
  id: string;
  name: string;
  materialCode?: string;
  unit?: string;
  category?: string;
}

interface OrderItemForm {
  materialId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [orderNumber, setOrderNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([
    { materialId: '', quantity: 1, unit: 'Kg', unitPrice: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [supRes, matRes] = await Promise.all([
          fetch('http://localhost:5000/api/suppliers', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/materials', { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);

        if (supRes.ok) setSuppliers(await supRes.json());
        if (matRes.ok) setMaterials(await matRes.json());

        // If edit mode, load existing PO data
        if (isEditMode && id) {
          const poRes = await fetch(`http://localhost:5000/api/purchase-orders/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (poRes.ok) {
            const data = await poRes.json();
            setOrderNumber(data.orderNumber || '');
            setSupplierId(data.supplierId || '');
            setOrderDate(data.orderDate ? new Date(data.orderDate).toISOString().slice(0, 10) : '');
            setExpectedDeliveryDate(data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().slice(0, 10) : '');
            setPriority(data.priority || 'NORMAL');
            setNotes(data.notes || '');
            if (Array.isArray(data.items) && data.items.length > 0) {
              setItems(data.items.map((it: any) => ({
                materialId: it.materialId,
                quantity: it.quantity,
                unit: it.unit,
                unitPrice: it.unitPrice
              })));
            }
          } else {
            setError('Failed to load purchase order details');
          }
        }
      } catch (e) {
        console.error('Error initializing form:', e);
        setError('Network error loading initialization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleAddItem = () => {
    const defaultMat = materials[0];
    setItems([
      ...items,
      {
        materialId: defaultMat ? defaultMat.id : '',
        quantity: 1,
        unit: defaultMat && defaultMat.unit ? defaultMat.unit : 'Kg',
        unitPrice: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Purchase order must have at least one item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemForm, value: any) => {
    const updated = [...items];
    if (field === 'materialId') {
      const selectedMat = materials.find(m => m.id === value);
      updated[index].materialId = value;
      if (selectedMat && selectedMat.unit) {
        updated[index].unit = selectedMat.unit;
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      const num = Number(value);
      updated[index][field] = isNaN(num) ? 0 : num;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'SENT') => {
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }

    if (items.length === 0) {
      setError('Purchase order must contain at least one item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.materialId) {
        setError(`Item #${i + 1}: Please select a material`);
        return;
      }
      if (it.quantity <= 0) {
        setError(`Item #${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (it.unitPrice < 0) {
        setError(`Item #${i + 1}: Unit price cannot be negative`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        orderNumber: orderNumber || undefined,
        supplierId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        priority,
        status: targetStatus,
        notes,
        items
      };

      const url = isEditMode 
        ? `http://localhost:5000/api/purchase-orders/${id}` 
        : 'http://localhost:5000/api/purchase-orders';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedPO = await res.json();
        navigate(`/purchase-orders/${savedPO.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save purchase order');
      }
    } catch (e) {
      setError('Network error saving purchase order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center text-slate-500">
        Loading form data...
      </div>
    );
  }

  const subtotal = calculateSubtotal();

  return (
    <div className="mx-auto max-w-5xl">
      <button 
        onClick={() => navigate('/purchase-orders')} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
      </button>

      <PageHeader 
        title={isEditMode ? `Edit Purchase Order: ${orderNumber}` : 'Create Purchase Order'} 
        description="Issue a formal purchase order to raw material suppliers and track order fulfillment." 
      />

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 flex items-center border border-red-200">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Supplier & Order Info Card */}
        <Card title="1. Supplier & Order Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select 
                className="input-field w-full bg-white"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.supplierCode ? `(${s.supplierCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select 
                className="input-field w-full bg-white"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
              <input 
                type="date" 
                className="input-field w-full bg-white"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
              <input 
                type="date" 
                className="input-field w-full bg-white"
                value={expectedDeliveryDate}
                onChange={e => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes & Instructions</label>
              <textarea 
                rows={3} 
                className="input-field w-full bg-white" 
                placeholder="Special delivery instructions, quality specifications, payment terms..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Materials Table Card */}
        <Card title="2. Materials & Line Items">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500 w-1/3">Material</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Quantity</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Unit</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Unit Price ($)</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-slate-500">Total ($)</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item, index) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <select 
                          className="input-field w-full text-sm bg-white"
                          value={item.materialId}
                          onChange={e => handleItemChange(index, 'materialId', e.target.value)}
                        >
                          <option value="">-- Select Material --</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.materialCode ? `(${m.materialCode})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          min="0.01" 
                          step="any"
                          className="input-field w-24 text-sm bg-white"
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="text" 
                          className="input-field w-20 text-sm bg-white"
                          value={item.unit}
                          onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          className="input-field w-28 text-sm bg-white"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800 text-sm whitespace-nowrap">
                        ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <button 
              type="button" 
              onClick={handleAddItem}
              className="btn-secondary flex items-center text-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Material Line Item
            </button>

            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-3">Subtotal:</span>
              <span className="text-lg font-bold text-slate-900">
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        {/* Order Summary & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 rounded-lg text-white">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Grand Total Summary</div>
            <div className="text-2xl font-bold text-white mt-0.5">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-2">({items.length} items)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => navigate('/purchase-orders')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium text-sm transition-colors"
            >
              Cancel
            </button>

            <button 
              type="button" 
              onClick={() => handleSubmit('DRAFT')}
              disabled={saving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md font-medium text-sm flex items-center transition-colors"
            >
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </button>

            <button 
              type="button" 
              onClick={() => handleSubmit('SENT')}
              disabled={saving}
              className="btn-primary flex items-center"
            >
              <Send className="mr-2 h-4 w-4" /> {isEditMode ? 'Save & Send Order' : 'Send Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

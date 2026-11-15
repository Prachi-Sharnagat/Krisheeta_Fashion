import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Plus, Trash2, ShoppingBag, Calculator, CheckCircle2 } from 'lucide-react';
import { getToken } from '../utils/auth';
import { Customer } from './Customers';

interface Variant {
  id: string;
  name: string;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | null;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  variants: Variant[];
}

interface OrderItemRow {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export const CreateOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // If editing an existing order
  const isEditing = Boolean(id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  // Form states
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  // Current item being added in form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial customers & products
  useEffect(() => {
    const loadOptions = async () => {
      setFetchingOptions(true);
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch('http://localhost:5000/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/products', { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);

        if (custRes.ok) setCustomers(await custRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
      } catch (e) {
        console.error('Error loading order options:', e);
      } finally {
        setFetchingOptions(false);
      }
    };

    loadOptions();
  }, []);

  // If editing an existing order, load order details
  useEffect(() => {
    if (isEditing && id) {
      const loadOrderDetails = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/orders/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (res.ok) {
            const data = await res.json();
            setOrderNumber(data.orderNumber || '');
            setCustomerId(data.customerId || '');
            if (data.orderDate) setOrderDate(new Date(data.orderDate).toISOString().split('T')[0]);
            if (data.expectedDeliveryDate) setExpectedDeliveryDate(new Date(data.expectedDeliveryDate).toISOString().split('T')[0]);
            setPriority(data.priority || 'NORMAL');
            setNotes(data.notes || '');
            if (Array.isArray(data.items)) {
              setOrderItems(data.items.map((i: any) => ({
                productId: i.productId,
                variantId: i.variantId || '',
                quantity: i.quantity,
                unitPrice: i.unitPrice
              })));
            }
          }
        } catch (e) {
          console.error('Error loading order for edit:', e);
        }
      };

      loadOrderDetails();
    }
  }, [id, isEditing]);

  // When product is selected, update default unit price if variant or product has price
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableVariants = selectedProduct ? selectedProduct.variants : [];

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    setSelectedVariantId('');
    setItemUnitPrice(0);
  };

  const handleVariantChange = (varId: string) => {
    setSelectedVariantId(varId);
    const variant = availableVariants.find(v => v.id === varId);
    if (variant && typeof variant.price === 'number' && variant.price > 0) {
      setItemUnitPrice(variant.price);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }
    if (itemQuantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (itemUnitPrice < 0) {
      alert('Unit price cannot be negative');
      return;
    }

    setOrderItems([...orderItems, {
      productId: selectedProductId,
      variantId: selectedVariantId,
      quantity: Number(itemQuantity),
      unitPrice: Number(itemUnitPrice)
    }]);

    // Reset item inputs
    setSelectedProductId('');
    setSelectedVariantId('');
    setItemQuantity(1);
    setItemUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Grand total calculation for preview
  const grandTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmitOrder = async (targetStatus: 'DRAFT' | 'CONFIRMED') => {
    setError('');

    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item to the order');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        orderNumber: orderNumber.trim() || undefined,
        customerId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        priority,
        notes,
        status: targetStatus,
        items: orderItems
      };

      const url = isEditing ? `http://localhost:5000/api/orders/${id}` : 'http://localhost:5000/api/orders';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        navigate(`/orders/${data.id}`);
      } else {
        setError(data.error || 'Failed to save sales order');
      }
    } catch (e) {
      setError('Network error saving sales order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/orders')} className="flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Orders
        </button>
      </div>

      <PageHeader 
        title={isEditing ? `Edit Sales Order: ${orderNumber}` : "Create Sales Order"} 
        description="Configure customer details, dates, and order items." 
      />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Order Metadata */}
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary-600" /> Customer & Order Info
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Customer *</label>
                <select 
                  className="input-field bg-white" 
                  value={customerId} 
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} {c.customerCode ? `[${c.customerCode}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Order Number (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Auto-generated if blank"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                  <select 
                    className="input-field bg-white" 
                    value={priority} 
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Order Date</label>
                  <input 
                    type="date" 
                    className="input-field bg-white" 
                    value={orderDate} 
                    onChange={e => setOrderDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expected Delivery Date</label>
                  <input 
                    type="date" 
                    className="input-field bg-white" 
                    value={expectedDeliveryDate} 
                    onChange={e => setExpectedDeliveryDate(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notes / Instructions</label>
                <textarea 
                  rows={2}
                  className="input-field"
                  placeholder="Special instructions, custom labels..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Add Order Items Form & Items Table */}
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Order Items
            </h2>

            {/* Add Item Row Inputs */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Product *</label>
                  <select 
                    className="input-field bg-white" 
                    value={selectedProductId}
                    onChange={e => handleProductChange(e.target.value)}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Variant</label>
                  <select 
                    className="input-field bg-white disabled:bg-slate-100" 
                    disabled={!selectedProductId || availableVariants.length === 0}
                    value={selectedVariantId}
                    onChange={e => handleVariantChange(e.target.value)}
                  >
                    <option value="">
                      {!selectedProductId 
                        ? '-- Select Product First --' 
                        : availableVariants.length === 0 
                          ? 'No variants available' 
                          : '-- Choose Variant --'}
                    </option>
                    {availableVariants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {[v.color, v.size].filter(Boolean).join(' / ')} {v.price ? `($${v.price})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantity *</label>
                  <input 
                    type="number" 
                    min={1} 
                    className="input-field" 
                    value={itemQuantity} 
                    onChange={e => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Unit Price ($) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min={0} 
                    className="input-field" 
                    value={itemUnitPrice} 
                    onChange={e => setItemUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))} 
                  />
                </div>

                <div>
                  <button 
                    type="button"
                    onClick={handleAddItem} 
                    className="btn-primary w-full py-2 flex items-center justify-center text-xs"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* Added Items List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase text-slate-500">Product / Variant</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Qty</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Unit Price</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Subtotal</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400">
                        No items added to order yet. Select a product above to add items.
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      const varnt = prod?.variants.find(v => v.id === item.variantId);
                      const subtotal = item.quantity * item.unitPrice;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-xs">
                            <div className="font-semibold text-slate-900">{prod?.name || 'Product'}</div>
                            {varnt && (
                              <div className="text-[11px] text-slate-500">
                                Variant: {varnt.name} {[varnt.color, varnt.size].filter(Boolean).join(' / ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium text-slate-800">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-xs text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-bold text-slate-900">${subtotal.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-xs text-right">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar Summary (Right 1 col) */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary-600" /> Order Summary
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Items Count:</span>
                <span className="font-semibold text-slate-900">{orderItems.reduce((sum, i) => sum + i.quantity, 0)} pcs</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unique SKUs:</span>
                <span className="font-semibold text-slate-900">{orderItems.length}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between text-sm sm:text-base font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-primary-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2.5">
              <button 
                type="button"
                disabled={loading}
                onClick={() => handleSubmitOrder('CONFIRMED')}
                className="btn-primary w-full py-2.5 flex items-center justify-center text-xs"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> {loading ? 'Saving...' : 'Confirm Order'}
              </button>

              <button 
                type="button"
                disabled={loading}
                onClick={() => handleSubmitOrder('DRAFT')}
                className="btn-secondary w-full py-2.5 text-xs"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/orders')}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

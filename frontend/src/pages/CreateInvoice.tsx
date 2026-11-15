import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Save, Send, Plus, Trash2, AlertCircle } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';

interface Customer {
  id: string;
  name: string;
  companyName?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  variants?: { id: string; name: string; color?: string; size?: string }[];
}

interface PreparedLineItem {
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export const CreateInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PreparedLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custRes, prodRes, orderRes, shipRes] = await Promise.all([
          fetch('http://localhost:5000/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/products', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/orders', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/shipments', { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);

        const fetchedCusts = custRes.ok ? await custRes.json() : [];
        const fetchedProds = prodRes.ok ? await prodRes.json() : [];
        const fetchedOrders = orderRes.ok ? await orderRes.json() : [];
        const fetchedShips = shipRes.ok ? await shipRes.json() : [];

        setCustomers(fetchedCusts);
        setProducts(fetchedProds);
        setSalesOrders(fetchedOrders);
        setShipments(fetchedShips);

        if (isEditMode && id) {
          const invRes = await fetch(`http://localhost:5000/api/invoices/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (invRes.ok) {
            const inv = await invRes.json();
            setInvoiceNumber(inv.invoiceNumber);
            setSelectedCustomerId(inv.customerId);
            setSelectedOrderId(inv.salesOrderId || '');
            setSelectedShipmentId(inv.shipmentId || '');
            setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : '');
            setDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : '');
            setNotes(inv.notes || '');

            if (inv.items) {
              setItems(inv.items.map((i: any) => ({
                productId: i.productId || '',
                variantId: i.variantId || '',
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                taxRate: i.taxRate || 0,
                discount: i.discount || 0
              })));
            }
          }
        } else {
          const queryParams = new URLSearchParams(window.location.search);
          const qOrderId = queryParams.get('salesOrderId');
          const qShipmentId = queryParams.get('shipmentId');

          if (qOrderId) {
            const targetOrder = fetchedOrders.find((o: any) => o.id === qOrderId);
            if (targetOrder) {
              setSelectedOrderId(targetOrder.id);
              setSelectedCustomerId(targetOrder.customerId);
              setItems(targetOrder.items.map((soi: any) => ({
                productId: soi.productId,
                variantId: soi.variantId || '',
                description: `${soi.product?.name || 'Garment'} ${soi.variant ? `(${soi.variant.name})` : ''}`,
                quantity: soi.quantity,
                unitPrice: soi.unitPrice,
                taxRate: 12,
                discount: 0
              })));
            }
          } else if (qShipmentId) {
            const targetShip = fetchedShips.find((s: any) => s.id === qShipmentId);
            if (targetShip) {
              setSelectedShipmentId(targetShip.id);
              setSelectedCustomerId(targetShip.customerId);
              if (targetShip.salesOrderId) setSelectedOrderId(targetShip.salesOrderId);
              if (targetShip.items) {
                setItems(targetShip.items.map((si: any) => ({
                  productId: si.productId,
                  variantId: si.variantId || '',
                  description: `Shipped Item: ${si.product?.name || 'Garment'} ${si.variant ? `(${si.variant.name})` : ''}`,
                  quantity: si.quantity,
                  unitPrice: si.salesOrderItem?.unitPrice || 50,
                  taxRate: 12,
                  discount: 0
                })));
              }
            }
          } else {
            setItems([{ description: 'Garment Manufacturing Services', quantity: 100, unitPrice: 50, taxRate: 12, discount: 0 }]);
          }
        }
      } catch (e) {
        console.error('Error loading data:', e);
        setErrorMessage('Failed to load initial form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  // Handle Order Selection -> populate items
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;

    const order = salesOrders.find(o => o.id === orderId);
    if (order) {
      if (!selectedCustomerId) setSelectedCustomerId(order.customerId);

      const mapped: PreparedLineItem[] = order.items.map((soi: any) => ({
        productId: soi.productId,
        variantId: soi.variantId || '',
        description: `${soi.product?.name || 'Garment'} ${soi.variant ? `(${soi.variant.name})` : ''}`,
        quantity: soi.quantity,
        unitPrice: soi.unitPrice,
        taxRate: 12, // Default tax rate 12% GST
        discount: 0
      }));

      setItems(mapped);
    }
  };

  // Handle Shipment Selection -> populate items
  const handleShipmentChange = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    if (!shipmentId) return;

    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      if (!selectedCustomerId) setSelectedCustomerId(shipment.customerId);
      if (shipment.salesOrderId && !selectedOrderId) setSelectedOrderId(shipment.salesOrderId);

      if (shipment.items) {
        const mapped: PreparedLineItem[] = shipment.items.map((si: any) => ({
          productId: si.productId,
          variantId: si.variantId || '',
          description: `Shipped Item: ${si.product?.name || 'Garment'} ${si.variant ? `(${si.variant.name})` : ''}`,
          quantity: si.quantity,
          unitPrice: si.salesOrderItem?.unitPrice || 50,
          taxRate: 12,
          discount: 0
        }));

        setItems(mapped);
      }
    }
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: 'New Line Item', quantity: 1, unitPrice: 0, taxRate: 12, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof PreparedLineItem, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [field]: value };
        // If product selected, auto-set description
        if (field === 'productId') {
          const prod = products.find(p => p.id === value);
          if (prod) updated.description = prod.name;
        }
        return updated;
      }
      return item;
    }));
  };

  // Real-time summary calculation
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  const calculatedItems = items.map(item => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const price = Math.max(0, Number(item.unitPrice || 0));
    const disc = Math.max(0, Number(item.discount || 0));
    const rate = Math.max(0, Number(item.taxRate || 0));

    const lineSubtotal = qty * price;
    const lineTax = (lineSubtotal - disc) * (rate / 100);
    const lineTotal = (lineSubtotal - disc) + lineTax;

    subtotal += lineSubtotal;
    discountAmount += disc;
    taxAmount += lineTax;

    return { ...item, lineSubtotal, lineTax, lineTotal };
  });

  const grandTotal = subtotal - discountAmount + taxAmount;

  const handleSubmit = async (targetStatus: string) => {
    setErrorMessage('');
    setSubmitting(true);

    try {
      if (!selectedCustomerId) {
        setErrorMessage('Please select a customer.');
        setSubmitting(false);
        return;
      }

      if (items.length === 0) {
        setErrorMessage('Please add at least one line item.');
        setSubmitting(false);
        return;
      }

      const payload = {
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : undefined,
        customerId: selectedCustomerId,
        salesOrderId: selectedOrderId || null,
        shipmentId: selectedShipmentId || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status: targetStatus,
        notes: notes ? notes.trim() : null,
        items: items.map(i => ({
          productId: i.productId || null,
          variantId: i.variantId || null,
          description: i.description ? i.description.trim() : 'Item',
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
          discount: Number(i.discount)
        }))
      };

      const url = isEditMode ? `http://localhost:5000/api/invoices/${id}` : 'http://localhost:5000/api/invoices';
      const method = isEditMode ? 'PUT' : 'POST';

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
        navigate(`/invoices/${data.id || id}`);
      } else {
        setErrorMessage(data.error || 'Failed to save invoice.');
      }
    } catch (e) {
      console.error('Error submitting invoice:', e);
      setErrorMessage('Network error submitting invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableOrders = salesOrders.filter(o => !selectedCustomerId || o.customerId === selectedCustomerId);
  const availableShipments = shipments.filter(s => !selectedCustomerId || s.customerId === selectedCustomerId);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading invoice form...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <PageHeader 
            title={isEditMode ? `Edit Invoice #${invoiceNumber}` : "Create New Customer Invoice"} 
            description="Generate a sales invoice for garments delivered or ordered by a customer." 
          />
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Info & Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Customer & Order Linking
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer *</label>
                <select 
                  className="input-field w-full bg-white text-sm"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  disabled={isEditMode}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sales Order (Optional)</label>
                <select 
                  className="input-field w-full bg-white text-sm"
                  value={selectedOrderId}
                  onChange={e => handleOrderChange(e.target.value)}
                >
                  <option value="">-- Select Sales Order --</option>
                  {availableOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.orderNumber}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment (Optional)</label>
                <select 
                  className="input-field w-full bg-white text-sm"
                  value={selectedShipmentId}
                  onChange={e => handleShipmentChange(e.target.value)}
                >
                  <option value="">-- Select Shipment --</option>
                  {availableShipments.map(s => (
                    <option key={s.id} value={s.id}>{s.shipmentNumber}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Line Items Table */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Invoice Items</h2>
              <button 
                type="button" 
                onClick={handleAddItem}
                className="btn-secondary text-xs flex items-center"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Line Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500 min-w-[200px]">Description / Product</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500 w-24">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500 w-28">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500 w-24">Tax %</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500 w-24">Discount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500 w-32">Total</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {calculatedItems.map((item, idx) => {
                    const selectedProd = products.find(p => p.id === item.productId);

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 space-y-1">
                          <input 
                            type="text"
                            placeholder="Line description..."
                            className="input-field text-sm w-full"
                            value={item.description}
                            onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          />
                          <select 
                            className="input-field text-xs text-slate-500 bg-slate-50 w-full"
                            value={item.productId || ''}
                            onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                          >
                            <option value="">-- Optional Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2">
                          <input 
                            type="number"
                            min={0.01}
                            step="any"
                            className="input-field text-right text-sm font-semibold w-full"
                            value={item.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input 
                            type="number"
                            min={0}
                            step="any"
                            className="input-field text-right text-sm font-semibold w-full"
                            value={item.unitPrice}
                            onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input 
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            className="input-field text-right text-sm w-full"
                            value={item.taxRate}
                            onChange={e => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input 
                            type="number"
                            min={0}
                            step="any"
                            className="input-field text-right text-sm w-full"
                            value={item.discount}
                            onChange={e => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono text-sm">
                          {formatINR(item.lineTotal)}
                        </td>

                        <td className="px-2 py-2 text-center">
                          {items.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Col: Invoice Dates & Financial Summary */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Invoice Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Date *</label>
                <input 
                  type="date"
                  className="input-field w-full bg-white text-sm"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Due Date</label>
                <input 
                  type="date"
                  className="input-field w-full bg-white text-sm"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Terms</label>
                <textarea 
                  rows={3}
                  placeholder="Payment terms, bank details, notes..."
                  className="input-field w-full bg-white text-sm"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Financial Summary Card */}
          <Card>
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Financial Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900 font-mono">{formatINR(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-semibold font-mono">-{formatINR(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Total Tax Amount:</span>
                <span className="font-semibold text-slate-900 font-mono">{formatINR(taxAmount)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-lg font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-primary-600 font-mono">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card>
            <div className="space-y-3">
              <button 
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('DRAFT')}
                className="btn-secondary w-full flex items-center justify-center py-2.5"
              >
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </button>

              <button 
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('ISSUED')}
                className="btn-primary w-full flex items-center justify-center py-2.5"
              >
                <Send className="mr-2 h-4 w-4" /> Issue Invoice
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

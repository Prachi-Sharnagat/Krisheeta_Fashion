import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Save, Send, CheckCircle2, AlertCircle, PackageCheck, AlertTriangle } from 'lucide-react';
import { getToken } from '../utils/auth';

interface Customer {
  id: string;
  name: string;
  companyName?: string;
  address?: string;
}

interface SalesOrderItem {
  id: string;
  productId: string;
  product?: { name: string; sku?: string };
  variantId?: string | null;
  variant?: { name: string; color?: string; size?: string } | null;
  quantity: number;
  unitPrice: number;
  shippedQuantity?: number;
  remainingQuantity?: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  customer?: Customer;
  items: SalesOrderItem[];
}

interface PreparedShipmentItem {
  salesOrderItemId: string;
  productId: string;
  productName: string;
  productSku?: string;
  variantId?: string | null;
  variantName?: string;
  orderedQuantity: number;
  previouslyShipped: number;
  remainingQuantity: number;
  shippingQuantity: number;
  unit: string;
}

export const CreateShipment = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PreparedShipmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custRes, orderRes] = await Promise.all([
          fetch('http://localhost:5000/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('http://localhost:5000/api/orders', { headers: { Authorization: `Bearer ${getToken()}` } })
        ]);

        if (custRes.ok) setCustomers(await custRes.json());
        if (orderRes.ok) {
          const ordersData: SalesOrder[] = await orderRes.json();
          // Filter out CANCELLED or COMPLETED orders unless in edit mode
          setSalesOrders(ordersData);
        }

        // If editing existing shipment
        if (isEditMode && id) {
          const shipRes = await fetch(`http://localhost:5000/api/shipments/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (shipRes.ok) {
            const shipData = await shipRes.json();
            setShipmentNumber(shipData.shipmentNumber);
            setSelectedCustomerId(shipData.customerId);
            setSelectedOrderId(shipData.salesOrderId);
            setShipmentDate(shipData.shipmentDate ? shipData.shipmentDate.slice(0, 10) : '');
            setExpectedDeliveryDate(shipData.expectedDeliveryDate ? shipData.expectedDeliveryDate.slice(0, 10) : '');
            setCarrier(shipData.carrier || '');
            setTrackingNumber(shipData.trackingNumber || '');
            setShippingAddress(shipData.shippingAddress || '');
            setNotes(shipData.notes || '');

            // Populate items
            if (shipData.salesOrder?.items) {
              const prepared = shipData.salesOrder.items.map((soi: any) => {
                const matchedShipItem = shipData.items?.find((si: any) => si.salesOrderItemId === soi.id);
                const prevShipped = (soi.shippedQuantity || 0) - (matchedShipItem ? matchedShipItem.quantity : 0);
                const remQty = Math.max(0, soi.quantity - prevShipped);

                return {
                  salesOrderItemId: soi.id,
                  productId: soi.productId,
                  productName: soi.product?.name || 'Product',
                  productSku: soi.product?.sku || '',
                  variantId: soi.variantId,
                  variantName: soi.variant ? `${soi.variant.name} (${[soi.variant.color, soi.variant.size].filter(Boolean).join('/')})` : 'Standard',
                  orderedQuantity: soi.quantity,
                  previouslyShipped: Math.max(0, prevShipped),
                  remainingQuantity: remQty,
                  shippingQuantity: matchedShipItem ? matchedShipItem.quantity : Math.min(remQty, 0),
                  unit: matchedShipItem?.unit || 'Pcs'
                };
              });
              setItems(prepared);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching data:', e);
        setErrorMessage('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  // Handle Customer Selection
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedOrderId('');
    setItems([]);

    const cust = customers.find(c => c.id === customerId);
    if (cust && cust.address) {
      setShippingAddress(cust.address);
    }
  };

  // Handle Sales Order Selection
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setItems([]);
      return;
    }

    const order = salesOrders.find(o => o.id === orderId);
    if (order) {
      if (!selectedCustomerId) {
        setSelectedCustomerId(order.customerId);
        if (order.customer?.address) {
          setShippingAddress(order.customer.address);
        }
      }

      const prepared: PreparedShipmentItem[] = order.items.map(soi => {
        const prevShipped = soi.shippedQuantity || 0;
        const remQty = Math.max(0, soi.quantity - prevShipped);
        return {
          salesOrderItemId: soi.id,
          productId: soi.productId,
          productName: soi.product?.name || 'Product',
          productSku: soi.product?.sku || '',
          variantId: soi.variantId,
          variantName: soi.variant ? `${soi.variant.name} (${[soi.variant.color, soi.variant.size].filter(Boolean).join('/')})` : 'Standard',
          orderedQuantity: soi.quantity,
          previouslyShipped: prevShipped,
          remainingQuantity: remQty,
          shippingQuantity: remQty, // Default to remaining
          unit: 'Pcs'
        };
      });

      setItems(prepared);
    }
  };

  // Update item shipping quantity
  const handleQuantityChange = (salesOrderItemId: string, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.salesOrderItemId === salesOrderItemId) {
        return {
          ...item,
          shippingQuantity: value
        };
      }
      return item;
    }));
  };

  const availableOrders = salesOrders.filter(o => {
    if (selectedCustomerId && o.customerId !== selectedCustomerId) return false;
    return true;
  });

  const handleSubmit = async (targetStatus: string) => {
    setErrorMessage('');
    setSubmitting(true);

    try {
      if (!selectedCustomerId) {
        setErrorMessage('Please select a customer.');
        setSubmitting(false);
        return;
      }

      if (!selectedOrderId) {
        setErrorMessage('Please select a sales order.');
        setSubmitting(false);
        return;
      }

      // Filter items where shippingQuantity > 0
      const activeItems = items.filter(i => i.shippingQuantity > 0);

      if (activeItems.length === 0) {
        setErrorMessage('Please enter a shipping quantity > 0 for at least one item.');
        setSubmitting(false);
        return;
      }

      // Validate quantities do not exceed remaining
      for (const item of activeItems) {
        if (item.shippingQuantity > item.remainingQuantity) {
          setErrorMessage('Shipment quantity cannot exceed the remaining quantity on the sales order item.');
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        shipmentNumber: shipmentNumber ? shipmentNumber.trim() : undefined,
        customerId: selectedCustomerId,
        salesOrderId: selectedOrderId,
        shipmentDate: shipmentDate ? new Date(shipmentDate).toISOString() : new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
        carrier: carrier ? carrier.trim() : null,
        trackingNumber: trackingNumber ? trackingNumber.trim() : null,
        shippingAddress: shippingAddress ? shippingAddress.trim() : null,
        notes: notes ? notes.trim() : null,
        status: targetStatus,
        items: activeItems.map(i => ({
          salesOrderItemId: i.salesOrderItemId,
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.shippingQuantity,
          unit: i.unit
        }))
      };

      const url = isEditMode ? `http://localhost:5000/api/shipments/${id}` : 'http://localhost:5000/api/shipments';
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
        navigate(`/shipments/${data.id || id}`);
      } else {
        setErrorMessage(data.error || 'Failed to save shipment.');
      }
    } catch (e: any) {
      console.error('Error saving shipment:', e);
      setErrorMessage('Network error submitting shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading shipment form...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/shipments')} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <PageHeader 
            title={isEditMode ? `Edit Shipment #${shipmentNumber}` : "Create New Shipment"} 
            description="Prepare finished goods shipment against an approved Sales Order." 
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

      {/* Form Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Info & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Order Selection */}
          <Card>
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              Order & Customer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer *</label>
                <select 
                  className="input-field w-full bg-white text-sm"
                  value={selectedCustomerId}
                  onChange={e => handleCustomerChange(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sales Order *</label>
                <select 
                  className="input-field w-full bg-white text-sm"
                  value={selectedOrderId}
                  onChange={e => handleOrderChange(e.target.value)}
                  disabled={isEditMode || !selectedCustomerId}
                >
                  <option value="">-- Select Sales Order --</option>
                  {availableOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} ({o.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Shipment Items List */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Shipment Items</h2>
              <span className="text-xs font-medium text-slate-500">
                Specify quantities to dispatch for each order item
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 italic">
                {selectedOrderId ? 'No items found in selected order.' : 'Select a customer and sales order to load items.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Variant</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Ordered</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Prev. Shipped</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Remaining</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-slate-500">Shipping Qty *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((item) => {
                      const isOverLimit = item.shippingQuantity > item.remainingQuantity;

                      return (
                        <tr key={item.salesOrderItemId} className="hover:bg-slate-50">
                          <td className="px-3 py-3 text-sm">
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            <div className="text-xs text-slate-500 font-mono">{item.productSku || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            {item.variantName}
                          </td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-slate-800">
                            {item.orderedQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-3 text-sm text-right text-slate-600">
                            {item.previouslyShipped} {item.unit}
                          </td>
                          <td className="px-3 py-3 text-sm text-right font-semibold text-slate-900">
                            {item.remainingQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input 
                              type="number" 
                              min={0}
                              max={item.remainingQuantity}
                              className={`input-field w-28 text-right font-bold text-sm ${
                                isOverLimit ? 'border-red-500 text-red-700 bg-red-50' : 'bg-white'
                              }`}
                              value={item.shippingQuantity}
                              onChange={e => handleQuantityChange(item.salesOrderItemId, Math.max(0, parseInt(e.target.value) || 0))}
                            />
                            {isOverLimit && (
                              <div className="text-[10px] text-red-600 font-medium mt-1">Exceeds remaining</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Shipping Info & Submit Bar */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Shipping & Carrier Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Date</label>
                <input 
                  type="date"
                  className="input-field w-full bg-white text-sm"
                  value={shipmentDate}
                  onChange={e => setShipmentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                <input 
                  type="date"
                  className="input-field w-full bg-white text-sm"
                  value={expectedDeliveryDate}
                  onChange={e => setExpectedDeliveryDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Carrier Name</label>
                <input 
                  type="text"
                  placeholder="e.g. DHL Express, FedEx, BlueDart"
                  className="input-field w-full bg-white text-sm"
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tracking Number</label>
                <input 
                  type="text"
                  placeholder="e.g. TRK-98741029"
                  className="input-field w-full bg-white text-sm font-mono"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipping Address</label>
                <textarea 
                  rows={3}
                  placeholder="Full destination address for courier / transport..."
                  className="input-field w-full bg-white text-sm"
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Instructions</label>
                <textarea 
                  rows={2}
                  placeholder="Packing requirements, handle with care notes..."
                  className="input-field w-full bg-white text-sm"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
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
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </button>

              <button 
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('READY')}
                className="bg-amber-600 text-white hover:bg-amber-700 w-full flex items-center justify-center py-2.5 rounded-md font-medium text-sm transition-colors"
              >
                <PackageCheck className="mr-2 h-4 w-4" /> Mark as Ready (Approve QC)
              </button>

              <button 
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('DISPATCHED')}
                className="btn-primary w-full flex items-center justify-center py-2.5"
              >
                <Send className="mr-2 h-4 w-4" /> Dispatch Shipment (Deduct Inventory)
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { getToken } from '../utils/auth';

interface Supplier {
  id: string;
  name: string;
  supplierCode?: string;
}

export const CreateExpense = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenseNumber, setExpenseNumber] = useState('');
  const [category, setCategory] = useState('RAW_MATERIAL');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [supplierId, setSupplierId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supRes = await fetch('http://localhost:5000/api/suppliers', {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (supRes.ok) setSuppliers(await supRes.json());

        if (isEditMode && id) {
          const expRes = await fetch(`http://localhost:5000/api/expenses/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          if (expRes.ok) {
            const exp = await expRes.json();
            setExpenseNumber(exp.expenseNumber);
            setCategory(exp.category);
            setDescription(exp.description);
            setAmount(String(exp.amount));
            setExpenseDate(exp.expenseDate ? exp.expenseDate.slice(0, 10) : '');
            setPaymentMethod(exp.paymentMethod || 'BANK_TRANSFER');
            setSupplierId(exp.supplierId || '');
            setReferenceNumber(exp.referenceNumber || '');
            setStatus(exp.status);
            setNotes(exp.notes || '');
          }
        }
      } catch (e) {
        console.error('Error loading expense data:', e);
        setErrorMessage('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const expAmt = Number(amount);
    if (isNaN(expAmt) || expAmt <= 0) {
      setErrorMessage('Amount must be a number greater than zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please enter a description for the expense.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        expenseNumber: expenseNumber ? expenseNumber.trim() : undefined,
        category,
        description: description.trim(),
        amount: expAmt,
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
        paymentMethod,
        supplierId: supplierId || null,
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        status,
        notes: notes ? notes.trim() : null
      };

      const url = isEditMode ? `http://localhost:5000/api/expenses/${id}` : 'http://localhost:5000/api/expenses';
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
        navigate('/expenses');
      } else {
        setErrorMessage(data.error || 'Failed to save expense.');
      }
    } catch (e) {
      console.error('Error submitting expense:', e);
      setErrorMessage('Network error saving expense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center text-slate-500">
        Loading expense form...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/expenses')} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <PageHeader 
          title={isEditMode ? `Edit Expense #${expenseNumber}` : "Record Operational Expense"} 
          description="Log factory operational costs, raw materials, transport, salary or utility expenses." 
        />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Expense Form Card */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Category *</label>
              <select 
                className="input-field w-full bg-white text-sm"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="RAW_MATERIAL">RAW MATERIAL</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="ELECTRICITY">ELECTRICITY</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="SALARY">SALARY</option>
                <option value="PACKAGING">PACKAGING</option>
                <option value="RENT">RENT</option>
                <option value="UTILITIES">UTILITIES</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
              <input 
                type="number"
                step="any"
                min={0.01}
                required
                placeholder="e.g. 25000"
                className="input-field w-full text-base font-bold font-mono"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
              <input 
                type="text"
                required
                placeholder="e.g. Monthly electricity bill for knitting division"
                className="input-field w-full text-sm"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date *</label>
              <input 
                type="date"
                required
                className="input-field w-full bg-white text-sm"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select 
                className="input-field w-full bg-white text-sm"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="CARD">CREDIT / DEBIT CARD</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier (Optional)</label>
              <select 
                className="input-field w-full bg-white text-sm"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">-- None / Direct --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.supplierCode || '-'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select 
                className="input-field w-full bg-white text-sm"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reference Number / Bill #</label>
              <input 
                type="text"
                placeholder="e.g. BILL-982103"
                className="input-field w-full text-sm font-mono"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea 
                rows={3}
                placeholder="Additional notes..."
                className="input-field w-full text-sm"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => navigate('/expenses')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center">
              <Save className="mr-2 h-4 w-4" /> {submitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

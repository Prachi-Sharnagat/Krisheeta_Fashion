import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Search, Eye, Trash2, Calendar, PackageCheck, AlertCircle } from 'lucide-react';
import { getToken, canEdit, getUserRole } from '../utils/auth';

interface GoodsReceiptItem {
  id: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;
  material?: { name: string };
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: { orderNumber: string; status: string };
  supplierId: string;
  supplier?: { name: string; supplierCode?: string };
  receiptDate: string;
  status: string;
  notes?: string;
  items: GoodsReceiptItem[];
  createdAt: string;
}

export const GoodsReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGoodsReceipts = async () => {
    setFetching(true);
    try {
      const res = await fetch('http://localhost:5000/api/goods-receipts', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setReceipts(await res.json());
      }
    } catch (e) {
      console.error('Error fetching goods receipts:', e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchGoodsReceipts();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/goods-receipts/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeleteId(null);
        fetchGoodsReceipts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete goods receipt');
      }
    } catch (e) {
      alert('Network error deleting goods receipt');
    } finally {
      setDeleting(false);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      r.receiptNumber.toLowerCase().includes(q) ||
      (r.purchaseOrder?.orderNumber && r.purchaseOrder.orderNumber.toLowerCase().includes(q)) ||
      (r.supplier?.name && r.supplier.name.toLowerCase().includes(q));
    
    const matchesStatus = filterStatus ? r.status === filterStatus : true;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'RECEIVED': return 'info';
      case 'INSPECTED': return 'warning';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  };

  const role = getUserRole();
  const canCreate = role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERVISOR';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <PageHeader 
          title="Goods Receipts" 
          description="Inspect and process incoming raw material shipments against issued Purchase Orders." 
        />
        {canCreate && (
          <button onClick={() => navigate('/goods-receipts/new')} className="btn-primary mt-4 sm:mt-0 flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Receive Goods
          </button>
        )}
      </div>

      <Card>
        {/* Search & Filter controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Receipt #, PO #, or Supplier..." 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select 
              className="input-field w-44 bg-white text-sm" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="INSPECTED">INSPECTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {/* Goods Receipts Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Receipt #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Receipt Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fetching ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Loading goods receipts...</td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No goods receipts found.</td>
                </tr>
              ) : (
                filteredReceipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-bold text-slate-900 font-mono">{r.receiptNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link 
                        to={`/purchase-orders/${r.purchaseOrderId}`} 
                        className="text-sm font-medium text-primary-600 hover:underline font-mono"
                      >
                        {r.purchaseOrder?.orderNumber || r.purchaseOrderId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                      {r.supplier?.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(r.receiptDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 font-medium">
                      {r.items?.length || 0} line items
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={getStatusBadgeType(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
                      <button 
                        title="View Receipt Details"
                        className="p-1 text-slate-400 hover:text-primary-600 transition-colors" 
                        onClick={() => navigate(`/goods-receipts/${r.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {isAdmin && (
                        <button 
                          title="Delete Receipt"
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="Confirm Receipt Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this goods receipt? This will revert the received quantities on the linked purchase order.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Receipt'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

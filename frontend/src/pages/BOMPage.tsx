import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Search, FileText, ArrowRight, Layers } from 'lucide-react';
import { getToken } from '../utils/auth';

interface ProductWithBoms {
  id: string;
  name: string;
  sku?: string;
  garmentType?: string;
  boms?: {
    id: string;
    version: string;
    name: string;
    status: string;
    _count?: { items: number };
    items?: any[];
  }[];
}

export const BOMPage = () => {
  const [products, setProducts] = useState<ProductWithBoms[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const productList = await res.json();
        
        // Fetch boms summary for each product
        const updatedList = await Promise.all(
          productList.map(async (p: any) => {
            try {
              const bRes = await fetch(`http://localhost:5000/api/products/${p.id}/boms`, {
                headers: { Authorization: `Bearer ${getToken()}` }
              });
              if (bRes.ok) {
                const boms = await bRes.json();
                return { ...p, boms };
              }
            } catch (e) {
              console.error(e);
            }
            return { ...p, boms: [] };
          })
        );

        setProducts(updatedList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <PageHeader
          title="Bill of Materials (BOM) Management"
          description="View and configure material requirements for your garment catalog."
        />
      </div>

      <Card>
        <div className="mb-6 flex items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
          <Search className="h-5 w-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search products by Name or SKU..."
            className="w-full bg-transparent px-3 py-1 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading BOM directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Active BOM Version</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Materials Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map(p => {
                  const activeBom = p.boms?.find(b => b.status === 'ACTIVE') || p.boms?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {p.name}
                        {p.garmentType && <span className="block text-xs font-normal text-slate-400">{p.garmentType}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {activeBom ? (
                          <span className="font-semibold text-slate-800">
                            {activeBom.version} - {activeBom.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No BOM created</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                        {activeBom ? activeBom.items?.length || 0 : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {activeBom ? (
                          <StatusBadge status={activeBom.status === 'ACTIVE' ? 'success' : activeBom.status === 'DRAFT' ? 'warning' : 'default'}>
                            {activeBom.status}
                          </StatusBadge>
                        ) : (
                          <span className="text-xs text-slate-400">UNCONFIGURED</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => navigate(`/products/${p.id}/bom`)}
                          className="btn-secondary text-xs inline-flex items-center gap-1 py-1"
                        >
                          <FileText className="h-3.5 w-3.5" /> Manage BOM <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

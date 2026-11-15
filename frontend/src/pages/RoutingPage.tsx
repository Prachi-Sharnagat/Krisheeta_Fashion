import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Activity, ArrowRight } from 'lucide-react';
import { getToken } from '../utils/auth';

interface ProductWithRoutings {
  id: string;
  name: string;
  sku?: string;
  garmentType?: string;
  routings?: {
    id: string;
    version: string;
    name: string;
    status: string;
    operations?: any[];
  }[];
}

export const RoutingPage = () => {
  const [products, setProducts] = useState<ProductWithRoutings[]>([]);
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

        // Fetch routings summary for each product
        const updatedList = await Promise.all(
          productList.map(async (p: any) => {
            try {
              const rRes = await fetch(`http://localhost:5000/api/products/${p.id}/routings`, {
                headers: { Authorization: `Bearer ${getToken()}` }
              });
              if (rRes.ok) {
                const routings = await rRes.json();
                return { ...p, routings };
              }
            } catch (e) {
              console.error(e);
            }
            return { ...p, routings: [] };
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
          title="Manufacturing Routings Management"
          description="Define operation sequences, machine types, and standard assembly times for garment products."
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
          <div className="py-8 text-center text-slate-500">Loading Routing directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Active Routing Version</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Steps Count</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Total Std Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map(p => {
                  const activeRouting = p.routings?.find(r => r.status === 'ACTIVE') || p.routings?.[0];
                  const totalTime = activeRouting?.operations?.reduce((sum: number, op: any) => sum + (op.standardTime || 0), 0) || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {p.name}
                        {p.garmentType && <span className="block text-xs font-normal text-slate-400">{p.garmentType}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {activeRouting ? (
                          <span className="font-semibold text-slate-800">
                            {activeRouting.version} - {activeRouting.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Routing created</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                        {activeRouting ? activeRouting.operations?.length || 0 : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                        {activeRouting && totalTime > 0 ? `${totalTime.toFixed(1)} mins` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {activeRouting ? (
                          <StatusBadge status={activeRouting.status === 'ACTIVE' ? 'success' : activeRouting.status === 'DRAFT' ? 'warning' : 'default'}>
                            {activeRouting.status}
                          </StatusBadge>
                        ) : (
                          <span className="text-xs text-slate-400">UNCONFIGURED</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => navigate(`/products/${p.id}/routing`)}
                          className="btn-secondary text-xs inline-flex items-center gap-1 py-1"
                        >
                          <Activity className="h-3.5 w-3.5" /> Manage Routing <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
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

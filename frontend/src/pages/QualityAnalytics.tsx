import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { getToken } from '../utils/auth';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export const QualityAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);

  const fetchQualityData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/quality?range=${range}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching quality analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, [range]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Quality Control Analytics" 
          description="Track garment inspection results, pass rate %, defect classifications, rework trends & rejection rates." 
        />

        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Period:</span>
          <select value={range} onChange={e => setRange(e.target.value)} className="bg-transparent outline-none font-medium text-slate-800">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspected Qty</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data?.inspectedQuantity ?? 0} pcs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted Qty</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{data?.acceptedQuantity ?? 0} pcs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected Qty</span>
          <p className="mt-2 text-2xl font-bold text-rose-600">{data?.rejectedQuantity ?? 0} pcs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rework Qty</span>
          <p className="mt-2 text-2xl font-bold text-amber-600">{data?.reworkQuantity ?? 0} pcs</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Pass Rate</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{data?.passRate ?? 0}%</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Rejection Rate</span>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">{data?.rejectionRate ?? 0}%</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Defect Rate</span>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{data?.defectRate ?? 0}%</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Inspection Trend */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Inspection Throughput Trend (Passed vs Rejected vs Rework)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.qualityTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="passed" fill="#10b981" name="Passed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rework" fill="#f59e0b" name="Rework" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Defects Breakdown by Type */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Defects Classification Breakdown
          </h2>
          <div className="h-64 flex items-center justify-center">
            {data?.defectsByType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.defectsByType} dataKey="count" nameKey="defectType" cx="50%" cy="50%" outerRadius={80} label>
                    {data.defectsByType.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 italic">No defect type records logged.</p>
            )}
          </div>
        </Card>

        {/* Rejection Trend */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Rejection Trend Over Time
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.rejectionTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="rejected" stroke="#ef4444" fill="#fee2e2" fillOpacity={0.6} strokeWidth={2} name="Rejected Qty" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Rework Trend */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Rework Jobs Trend Over Time
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.reworkTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="rework" stroke="#f59e0b" fill="#fef3c7" fillOpacity={0.6} strokeWidth={2} name="Rework Qty" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Wrench, Calendar, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export const MaintenanceAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/maintenance?range=${range}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching maintenance analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [range]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Machine Maintenance Analytics" 
          description="Track sewing & knitting machine maintenance jobs, breakdown trends, preventive schedules & total maintenance cost." 
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data?.scheduled ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
          <p className="mt-2 text-2xl font-bold text-blue-600">{data?.inProgress ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{data?.completed ?? 0}</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Overdue Jobs</span>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">{data?.overdue ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maintenance Cost</span>
          <p className="mt-2 text-2xl font-bold text-primary-600 font-mono">{formatINR(data?.maintenanceCost)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Jobs Over Time */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Maintenance Jobs Volume Over Time
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.maintenanceOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Jobs Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Maintenance Cost Trend */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Maintenance Cost Spend Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.maintenanceOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Cost']} />
                <Area type="monotone" dataKey="cost" stroke="#7c3aed" fill="#ddd6fe" fillOpacity={0.6} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Maintenance by Type */}
        <Card className="lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Maintenance Jobs & Cost by Type (Preventive / Corrective / Emergency)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.maintenanceByType || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name="Jobs Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

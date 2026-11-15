import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Users, UserCheck, UserX, Calendar, Clock } from 'lucide-react';
import { getToken } from '../utils/auth';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export const HrAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHrData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/analytics/hr', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Error fetching HR analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader 
        title="Human Resources & Workforce Analytics" 
        description="Track headcount, active personnel, today's attendance status, leave requests & department distribution." 
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data?.totalEmployees ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Employees</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{data?.activeEmployees ?? 0}</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Present Today</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{data?.presentToday ?? 0}</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Absent Today</span>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">{data?.absentToday ?? 0}</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">On Leave</span>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{data?.onLeave ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payroll</span>
          <p className="mt-2 text-2xl font-bold text-purple-600">{data?.pendingPayroll ?? 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Breakdown */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Today's Attendance Status Breakdown
          </h2>
          <div className="h-64 flex items-center justify-center">
            {data?.attendanceStatusBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.attendanceStatusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                    {data.attendanceStatusBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 italic">No attendance records logged for today.</p>
            )}
          </div>
        </Card>

        {/* Employee Count by Department */}
        <Card>
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Workforce Distribution by Department
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.employeeCountByDepartment || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" name="Employee Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

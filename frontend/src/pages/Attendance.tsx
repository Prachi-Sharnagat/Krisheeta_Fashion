import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { getUserRole } from '../utils/auth';
import { Calendar, Clock, Plus, CheckCircle2, AlertCircle, RefreshCw, Filter } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  };
}

const getAttendanceBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PRESENT':
      return <StatusBadge status="success">Present</StatusBadge>;
    case 'LATE':
      return <StatusBadge status="warning">Late</StatusBadge>;
    case 'HALF_DAY':
      return <StatusBadge status="warning">Half Day</StatusBadge>;
    case 'ON_LEAVE':
      return <StatusBadge status="info">On Leave</StatusBadge>;
    case 'ABSENT':
      return <StatusBadge status="danger">Absent</StatusBadge>;
    default:
      return <StatusBadge status="default">{status || 'Unknown'}</StatusBadge>;
  }
};

export const Attendance = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    checkIn: '09:00',
    checkOut: '18:00',
    notes: '',
  });

  const role = getUserRole();
  const isPrivileged = role === 'ADMIN' || role === 'MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = `?date=${selectedDate}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const [attData, empData] = await Promise.all([
        api.get<AttendanceRecord[]>(`/attendance${query}`),
        api.get<any[]>('/employees?status=ACTIVE'),
      ]);

      setRecords(attData || []);
      setEmployees(empData || []);
      if (empData && empData.length > 0 && !formData.employeeId) {
        setFormData((prev) => ({ ...prev, employeeId: empData[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const checkInDateTime = formData.checkIn
        ? new Date(`${formData.date}T${formData.checkIn}:00Z`).toISOString()
        : undefined;

      const checkOutDateTime = formData.checkOut
        ? new Date(`${formData.date}T${formData.checkOut}:00Z`).toISOString()
        : undefined;

      await api.post('/attendance', {
        employeeId: formData.employeeId,
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        notes: formData.notes.trim() || undefined,
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Attendance & Shifts"
        description="Daily biometric / muster roll tracking, shift check-ins, and absenteeism logging."
        actions={
          isPrivileged ? (
            <button
              onClick={() => {
                setFormError('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Log Shift Entry
            </button>
          ) : undefined
        }
      />

      {/* Date & Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm text-slate-700">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm font-medium text-slate-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            >
              <option value="">All Attendance Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late Arrival</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          <div className="text-xs font-mono text-slate-500">
            Records logged for {selectedDate}: <strong className="text-slate-800">{records.length}</strong>
          </div>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-sm font-medium">Loading muster roll records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No shift records for this date</p>
            <p className="text-xs text-slate-400 mt-1">Select a different calendar date or log new entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{rec.employee?.name || 'Staff'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{rec.employee?.employeeCode || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{rec.employee?.department || '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {getAttendanceBadge(rec.status)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 truncate max-w-[200px]">{rec.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Shift Attendance Record"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Employee *</label>
            <select
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Check-In Time</label>
              <input
                type="time"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Check-Out Time</label>
              <input
                type="time"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Shift Notes / Overtime</label>
            <input
              type="text"
              placeholder="e.g. Overtime 2hrs on Line 3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

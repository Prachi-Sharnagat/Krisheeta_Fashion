import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { getUserRole } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { DollarSign, Plus, Calendar, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  paymentDate?: string | null;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getPayrollBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return <StatusBadge status="success">Paid</StatusBadge>;
    case 'APPROVED':
      return <StatusBadge status="info">Approved</StatusBadge>;
    case 'PENDING_APPROVAL':
      return <StatusBadge status="warning">Pending Approval</StatusBadge>;
    case 'DRAFT':
      return <StatusBadge status="default">Draft</StatusBadge>;
    case 'REJECTED':
      return <StatusBadge status="danger">Rejected</StatusBadge>;
    default:
      return <StatusBadge status="default">{status || 'Unknown'}</StatusBadge>;
  }
};

export const Payroll = () => {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: '',
    allowances: '0',
    deductions: '0',
    status: 'PENDING_APPROVAL',
  });

  const role = getUserRole();
  const isPrivileged = role === 'ADMIN' || role === 'MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = `?month=${selectedMonth}&year=${selectedYear}`;
      const [pData, empData] = await Promise.all([
        api.get<PayrollRecord[]>(`/payroll${query}`),
        api.get<any[]>('/employees?status=ACTIVE'),
      ]);

      setPayrolls(pData || []);
      setEmployees(empData || []);
      if (empData && empData.length > 0 && !formData.employeeId) {
        setFormData((prev) => ({
          ...prev,
          employeeId: empData[0].id,
          baseSalary: empData[0].salary ? String(empData[0].salary) : '25000',
        }));
      }
    } catch (err: any) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleSelectEmployee = (empId: string) => {
    const found = employees.find((e) => e.id === empId);
    setFormData({
      ...formData,
      employeeId: empId,
      baseSalary: found?.salary ? String(found.salary) : formData.baseSalary,
    });
  };

  const calculatedNet = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const allow = parseFloat(formData.allowances) || 0;
    const ded = parseFloat(formData.deductions) || 0;
    return Math.max(0, base + allow - ded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const base = parseFloat(formData.baseSalary) || 0;
      const allow = parseFloat(formData.allowances) || 0;
      const ded = parseFloat(formData.deductions) || 0;

      await api.post('/payroll', {
        employeeId: formData.employeeId,
        month: Number(formData.month),
        year: Number(formData.year),
        baseSalary: base,
        allowances: allow,
        deductions: ded,
        netSalary: base + allow - ded,
        status: formData.status,
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to process payroll entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/payroll/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payroll status');
    }
  };

  const totalDisbursed = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Wage Disbursement"
        description="Calculate monthly salaries, statutory deductions, bonuses, and manage disbursement records."
        actions={
          isPrivileged ? (
            <button
              onClick={() => {
                setFormError('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Generate Payslip
            </button>
          ) : undefined
        }
      />

      {/* Month Selector & Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-indigo-600 shrink-0" />
            <div className="grid grid-cols-2 gap-2 w-full">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Slips</span>
            <span className="text-xl font-bold text-slate-900">{payrolls.length}</span>
          </div>
          <FileText className="h-7 w-7 text-indigo-400" />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Net Disbursed</span>
            <span className="text-xl font-bold font-mono text-emerald-600">{formatINR(totalDisbursed)}</span>
          </div>
          <DollarSign className="h-7 w-7 text-emerald-400" />
        </Card>
      </div>

      {/* Payroll Records Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-sm font-medium">Calculating payroll slips...</span>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <DollarSign className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No payroll slips for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            <p className="text-xs text-slate-400 mt-1">Generate payslips for employees in this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Allowances</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Approval Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.employee?.name || 'Staff'}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.employee?.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{p.employee?.department || '—'}</td>
                    <td className="py-3 px-4 font-mono">{formatINR(p.baseSalary)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600">+{formatINR(p.allowances)}</td>
                    <td className="py-3 px-4 font-mono text-rose-600">-{formatINR(p.deductions)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatINR(p.netSalary)}</td>
                    <td className="py-3 px-4">
                      {getPayrollBadge(p.status)}
                    </td>
                    {isPrivileged && (
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {p.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'APPROVED')}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'PAID')}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Employee Payroll Slip"
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
              onChange={(e) => handleSelectEmployee(e.target.value)}
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Period Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Period Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Base Salary (INR) *</label>
              <input
                type="number"
                required
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Allowances / Bonus</label>
              <input
                type="number"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Deductions / Taxes</label>
              <input
                type="number"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Computed Net Preview */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-sm">
            <span className="font-medium text-emerald-800">Net Calculated Payout:</span>
            <span className="font-bold font-mono text-emerald-900 text-base">
              {formatINR(calculatedNet())}
            </span>
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
              {submitting ? 'Generating...' : 'Submit Slip'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

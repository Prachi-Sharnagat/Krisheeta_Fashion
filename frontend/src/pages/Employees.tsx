import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { getUserRole } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { Plus, Search, Edit2, Trash2, Users, Briefcase, Mail, Phone, Calendar, RefreshCw } from 'lucide-react';

interface EmployeeItem {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  email?: string | null;
  phone?: string | null;
  employmentType: string;
  joiningDate: string;
  salary?: number | null;
  status: string;
}

const getEmployeeBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return <StatusBadge status="success">Active</StatusBadge>;
    case 'ON_LEAVE':
      return <StatusBadge status="warning">On Leave</StatusBadge>;
    case 'SUSPENDED':
      return <StatusBadge status="warning">Suspended</StatusBadge>;
    case 'TERMINATED':
      return <StatusBadge status="danger">Terminated</StatusBadge>;
    default:
      return <StatusBadge status="default">{status || 'Unknown'}</StatusBadge>;
  }
};

export const Employees = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    department: 'PRODUCTION',
    designation: '',
    email: '',
    phone: '',
    employmentType: 'FULL_TIME',
    salary: '',
    status: 'ACTIVE',
  });

  const role = getUserRole();
  const isPrivileged = role === 'ADMIN' || role === 'MANAGER';

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = '';
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (deptFilter) params.append('department', deptFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) query = `?${params.toString()}`;

      const data = await api.get<EmployeeItem[]>(`/employees${query}`);
      setEmployees(data || []);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm, deptFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      name: '',
      employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'PRODUCTION',
      designation: '',
      email: '',
      phone: '',
      employmentType: 'FULL_TIME',
      salary: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingId(emp.id);
    setFormError('');
    setFormData({
      name: emp.name,
      employeeCode: emp.employeeCode,
      department: emp.department,
      designation: emp.designation,
      email: emp.email || '',
      phone: emp.phone || '',
      employmentType: emp.employmentType,
      salary: emp.salary ? String(emp.salary) : '',
      status: emp.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        employeeCode: formData.employeeCode.trim(),
        department: formData.department,
        designation: formData.designation.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        employmentType: formData.employmentType,
        status: formData.status,
      };

      if (formData.salary) {
        payload.salary = parseFloat(formData.salary);
      }

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
      } else {
        await api.post('/employees', payload);
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save employee record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete employee "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Roster & Human Capital"
        description="Manage factory personnel, department allocation, designations, and employment status."
        actions={
          isPrivileged ? (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          >
            <option value="">All Departments</option>
            <option value="ADMINISTRATION">Administration</option>
            <option value="SALES">Sales</option>
            <option value="DESIGN">Design & Development</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="INVENTORY">Warehouse & Inventory</option>
            <option value="PLANNING">Production Planning</option>
            <option value="PRODUCTION">Production</option>
            <option value="QUALITY">Quality Control</option>
            <option value="DISPATCH">Dispatch</option>
            <option value="FINANCE">Finance</option>
            <option value="HR">HR</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>
      </Card>

      {/* Employees Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-sm font-medium">Loading employee records...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No employees found</p>
            <p className="text-xs text-slate-400 mt-1">Get started by registering new workforce members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Type</th>
                  {isPrivileged && <th className="py-3 px-4">Salary</th>}
                  <th className="py-3 px-4">Status</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{emp.employeeCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.designation || 'Staff'}</div>
                      <div className="text-xs text-slate-400 font-mono">{emp.department}</div>
                    </td>
                    <td className="py-3 px-4 text-xs space-y-0.5">
                      {emp.email && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400" /> {emp.email}
                        </div>
                      )}
                      {emp.phone && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Phone className="h-3 w-3 text-slate-400" /> {emp.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">{emp.employmentType.replace('_', ' ')}</td>
                    {isPrivileged && (
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {emp.salary ? formatINR(emp.salary) : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      {getEmployeeBadge(emp.status)}
                    </td>
                    {isPrivileged && (
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Employee"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Employee Record' : 'Register New Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Employee Code *</label>
              <input
                type="text"
                required
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ADMINISTRATION">Administration</option>
                <option value="SALES">Sales</option>
                <option value="DESIGN">Design & Development</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="INVENTORY">Warehouse & Inventory</option>
                <option value="PLANNING">Production Planning</option>
                <option value="PRODUCTION">Production</option>
                <option value="QUALITY">Quality Control</option>
                <option value="DISPATCH">Dispatch</option>
                <option value="FINANCE">Finance</option>
                <option value="HR">HR</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Tailor, Line Supervisor"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Salary (INR)</label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
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
              {submitting ? 'Saving...' : editingId ? 'Update Record' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

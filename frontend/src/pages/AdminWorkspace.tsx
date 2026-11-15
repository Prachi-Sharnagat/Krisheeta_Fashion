import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { getUser } from '../utils/auth';
import {
  ShieldAlert,
  Users,
  Building2,
  KeyRound,
  History,
  Activity,
  Settings,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface AdminDashboardData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalDepartments: number;
    activeSessions: number;
    pendingOrders: number;
    lowStockMaterials: number;
  };
  insights: string[];
  recentAuditLogs: any[];
}

export const AdminWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'users' | 'sessions' | 'audit' | 'settings'>('overview');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [deptSubmitting, setDeptSubmitting] = useState<boolean>(false);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    department: 'PRODUCTION',
  });
  const [userSubmitting, setUserSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const currentUser = getUser();

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/api/admin/dashboard');
      if (data) {
        setDashboard({
          summary: data.kpis || data.summary || {},
          insights: data.insights || [],
          recentAuditLogs: data.recentAuditLogs || [],
        });
      }
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get<any>('/api/admin/departments');
      setDepartments(Array.isArray(data) ? data : data?.departments || []);
    } catch (err: any) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get<any>('/api/admin/users');
      setUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await api.get<any>('/api/admin/sessions');
      setSessions(Array.isArray(data) ? data : data?.sessions || []);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await api.get<any>('/api/admin/audit-logs');
      setAuditLogs(Array.isArray(data) ? data : data?.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.get<{ company: any }>('/api/admin/settings');
      setCompanySettings(data.company || null);
    } catch (err: any) {
      console.error('Failed to load company settings:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSubmitting(true);
    try {
      await api.post('/api/admin/departments', deptForm);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSubmitting(true);
    setFormError('');
    try {
      await api.post('/api/admin/users', userForm);
      setIsUserModalOpen(false);
      setUserForm({ name: '', email: '', password: '', role: 'OPERATOR', department: 'PRODUCTION' });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/users/${id}/status`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Revoke and terminate this active login session?')) return;
    try {
      await api.delete(`/api/admin/sessions/${sessionId}`);
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Administration Center"
          description="Multi-tenant user directory, RBAC governance, live session control, and PostgreSQL audit trail"
        />
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
            ENTERPRISE SECURITY
          </span>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-6 overflow-x-auto text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="h-4 w-4" /> Overview & Insights
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="h-4 w-4" /> Departments
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" /> User Management
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <KeyRound className="h-4 w-4" /> Live Sessions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="h-4 w-4" /> Audit Stream
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" /> Company Config
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading && !dashboard ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-sm">Fetching system telemetry from PostgreSQL...</p>
            </div>
          ) : (
            <>
              {/* Stat Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-indigo-500">
                  <div className="text-xs font-medium text-slate-500 uppercase">Total Users</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {dashboard?.summary.totalUsers || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {dashboard?.summary.activeUsers || 0} active
                  </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="text-xs font-medium text-slate-500 uppercase">Departments</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {dashboard?.summary.totalDepartments || 12}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Operational units</div>
                </Card>

                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <div className="text-xs font-medium text-slate-500 uppercase">Active Sessions</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {dashboard?.summary.activeSessions || 1}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Concurrent JWT tokens</div>
                </Card>

                <Card className="p-4 border-l-4 border-l-amber-500">
                  <div className="text-xs font-medium text-slate-500 uppercase">Pending Actions</div>
                  <div className="text-2xl font-bold text-amber-700 mt-1">
                    {(dashboard?.summary.pendingOrders || 0) + (dashboard?.summary.lowStockMaterials || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Orders & inventory alerts</div>
                </Card>
              </div>

              {/* Administrative Insights */}
              {dashboard?.insights && dashboard.insights.length > 0 && (
                <Card className="p-4 bg-indigo-50/40 border-indigo-200">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-indigo-600" />
                    Administrative Notices & Recommendations
                  </h3>
                  <ul className="space-y-1.5 text-xs text-indigo-800">
                    {dashboard.insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Recent Audit Activities */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-500" /> Recent Audit Entries
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {dashboard?.recentAuditLogs.map((log: any) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{log.action}</span>
                        <span className="text-slate-500 ml-2">on {log.entity}</span>
                        <span className="text-slate-400 font-mono text-[10px] ml-2">
                          by {log.user?.name || log.userId}
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">ERP Factory Departments</h3>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow"
            >
              <Plus className="h-4 w-4" /> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept: any) => (
              <Card key={dept.id} className="p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    {dept.code}
                  </span>
                  <span className="text-xs text-slate-400">
                    {dept._count?.employees || 0} Staff
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-2">{dept.name}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description || 'Dedicated manufacturing workflow module'}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Enterprise User Accounts</h3>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow"
            >
              <Plus className="h-4 w-4" /> Provision New User
            </button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{u.department || 'All'}</td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <StatusBadge status="success">Active</StatusBadge>
                      ) : (
                        <StatusBadge status="danger">Deactivated</StatusBadge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleUserActive(u.id, u.isActive)}
                          className={`px-2.5 py-1 text-xs rounded-lg transition font-medium ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 4: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Active Login Sessions</h3>
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">User Agent / Client</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">{s.user?.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 truncate max-w-[280px]">{s.userAgent || 'Chrome/Windows'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {new Date(s.lastActivity).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition font-medium flex items-center gap-1 ml-auto"
                      >
                        <LogOut className="h-3 w-3" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">System Audit Trail</h3>
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{log.action}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">{log.entity}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{log.user?.name || log.userId}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 truncate max-w-[250px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <Card className="p-6 max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-slate-900">Company Profile & Tenant Configuration</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-500">Company Name</label>
              <div className="text-base font-bold text-slate-800">{companySettings?.name || 'Apex Apparel Manufacturing Co.'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Tenant Identifier</label>
              <div className="font-mono text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {companySettings?.id || currentUser?.companyId}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Database Engine</label>
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                PostgreSQL 18.7 (Database: krisheeta_erp on localhost:5432)
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create Department Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Add Department">
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Quality Assurance"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Code *</label>
            <input
              type="text"
              required
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. QA"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deptSubmitting}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
            >
              {deptSubmitting ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Provision New User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="e.g. john@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              >
                <option value="OPERATOR">Operator</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
              <select
                value={userForm.department}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              >
                <option value="PRODUCTION">Production</option>
                <option value="SALES">Sales</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="INVENTORY">Inventory</option>
                <option value="QUALITY">Quality Control</option>
                <option value="FINANCE">Finance</option>
                <option value="HR">Human Resources</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="ADMINISTRATION">Administration</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={userSubmitting}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
            >
              {userSubmitting ? 'Provisioning...' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import { useEffect, useState, useMemo } from 'react';
import api from '../../lib/api';
import { UserRole } from '../../types';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.SYSTEM_ADMIN]: 'System Admin',
  [UserRole.HR_ADMIN]: 'HR Director',
  [UserRole.FINANCE_OFFICER]: 'CFO',
  [UserRole.OPERATIONS]: 'Ops Manager',
  [UserRole.GUARD]: 'Guard',
  [UserRole.HEAD]: 'Head',
  [UserRole.CEO]: 'CEO',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-blue-600 text-white',
  [UserRole.SYSTEM_ADMIN]: 'bg-blue-100 text-blue-700',
  [UserRole.HR_ADMIN]: 'bg-amber-100 text-amber-700',
  [UserRole.FINANCE_OFFICER]: 'bg-emerald-100 text-emerald-700',
  [UserRole.OPERATIONS]: 'bg-violet-100 text-violet-700',
  [UserRole.GUARD]: 'bg-gray-100 text-gray-600',
  [UserRole.HEAD]: 'bg-teal-100 text-teal-700',
  [UserRole.CEO]: 'bg-rose-100 text-rose-700',
};

const DEPARTMENT_MAP: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'System Administration',
  [UserRole.SYSTEM_ADMIN]: 'IT & Systems',
  [UserRole.HR_ADMIN]: 'HR & Recruitment',
  [UserRole.FINANCE_OFFICER]: 'Finance & Accounting',
  [UserRole.OPERATIONS]: 'Operations',
  [UserRole.GUARD]: 'Field Operations',
  [UserRole.HEAD]: 'Management',
  [UserRole.CEO]: 'Executive Management',
};

const SECURITY_MATRIX = [
  { role: 'CEO', hr: 'F', pay: 'F', ops: 'F', fin: 'F', admin: 'F' },
  { role: 'HR Manager', hr: 'F', pay: 'F', ops: 'V', fin: 'N', admin: 'N' },
  { role: 'Ops Manager', hr: 'V', pay: 'V', ops: 'F', fin: 'N', admin: 'N' },
  { role: 'Site Supervisor', hr: 'N', pay: 'N', ops: 'A', fin: 'N', admin: 'N' },
];

const PERMISSION_CELL: Record<string, { label: string; className: string }> = {
  F: { label: 'F', className: 'bg-emerald-100 text-emerald-700' },
  V: { label: 'V', className: 'bg-blue-100 text-blue-700' },
  N: { label: 'N', className: 'bg-red-50 text-red-400' },
  A: { label: 'A', className: 'bg-amber-100 text-amber-700' },
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatLastLogin(date?: string) {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })} GMT`;
}

const TAB_ITEMS = [
  { key: 'users', label: 'Users' },
  { key: 'organization', label: 'Organization' },
  { key: 'roles', label: 'Roles & Permissions' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'system', label: 'System Settings' },
  { key: 'integrations', label: 'Integrations' },
];

export function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/users')
      .then((res) => setUsers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABEL[u.role]?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Vital Security PLC</span>
        <span>/</span>
        <span>Administration</span>
      </div>

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System & User Directory</h1>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Provision New User
        </button>
      </div>

      {/* Tabs - Pill Style */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="relative mb-5">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search system users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Active Systems Account Management</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">System User Details</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">System Role</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Department</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Session Login</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">2FA Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">System State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-400">
                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            Loading users...
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          {search ? 'No users match your search.' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {getInitials(user.firstName, user.lastName)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                              {ROLE_LABEL[user.role] || user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{DEPARTMENT_MAP[user.role] || '—'}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {user.lastLogin ? formatLastLogin(user.lastLogin) : (
                              <span className="text-gray-400">Today, --:-- GMT</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <svg className={`w-5 h-5 ${user.isActive ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </td>
                          <td className="px-5 py-4">
                            {user.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar — Security Matrix */}
          <div className="w-80 flex-shrink-0 hidden xl:block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">ERP Security Matrix Mapping</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-2 font-medium text-gray-500">System Role</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500">HR</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500">Pay</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500">Ops</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500">Fin</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {SECURITY_MATRIX.map((row) => (
                      <tr key={row.role}>
                        <td className="py-2.5 pr-2 font-medium text-gray-700 whitespace-nowrap">{row.role}</td>
                        {(['hr', 'pay', 'ops', 'fin', 'admin'] as const).map((col) => {
                          const cell = PERMISSION_CELL[row[col]];
                          return (
                            <td key={col} className="py-2.5 px-1 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${cell.className}`}>
                                {cell.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Legend</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">F</span>
                    Full Access
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">V</span>
                    View Only
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">A</span>
                    Approve
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-50 text-red-400 font-bold text-[10px]">N</span>
                    No Access
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && <OrganizationTab />}

      {/* Other Tabs - Placeholder */}
      {activeTab !== 'users' && activeTab !== 'organization' && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <svg className="mx-auto h-12 w-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Coming Soon</p>
          <p className="text-xs text-gray-400 mt-1">This section is under development.</p>
        </div>
      )}

      {/* Provision New User Modal */}
      {showProvisionModal && (
        <ProvisionModal onClose={() => setShowProvisionModal(false)} />
      )}
    </div>
  );
}

function OrganizationTab() {
  const [departments, setDepartments] = useState<{ _id: string; name: string; active: boolean }[]>([]);
  const [positions, setPositions] = useState<{ _id: string; name: string; departmentId?: { _id: string; name: string }; active: boolean }[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newPos, setNewPos] = useState('');
  const [newPosDept, setNewPosDept] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/departments').catch(() => ({ data: { data: [] } })),
      api.get('/positions').catch(() => ({ data: { data: [] } })),
    ]).then(([deptRes, posRes]) => {
      setDepartments(deptRes.data.data || []);
      setPositions(posRes.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const addDepartment = async () => {
    if (!newDept.trim()) return;
    try {
      await api.post('/departments', { name: newDept.trim() });
      setNewDept('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add department');
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    await api.delete(`/departments/${id}`);
    loadData();
  };

  const addPosition = async () => {
    if (!newPos.trim()) return;
    try {
      const payload: any = { name: newPos.trim() };
      if (newPosDept) payload.departmentId = newPosDept;
      await api.post('/positions', payload);
      setNewPos('');
      setNewPosDept('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add position');
    }
  };

  const deletePosition = async (id: string) => {
    if (!confirm('Delete this position?')) return;
    await api.delete(`/positions/${id}`);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Departments</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
            placeholder="New department name"
            className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button onClick={addDepartment} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            Add
          </button>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {departments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No departments yet.</p>
          ) : departments.map((d) => (
            <div key={d._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group">
              <span className="text-sm text-gray-700">{d.name}</span>
              <button onClick={() => deleteDepartment(d._id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Positions</h3>
        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={newPos}
            onChange={(e) => setNewPos(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPosition()}
            placeholder="New position name"
            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <div className="flex gap-2">
            <select
              value={newPosDept}
              onChange={(e) => setNewPosDept(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">No department (optional)</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <button onClick={addPosition} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              Add
            </button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {positions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No positions yet.</p>
          ) : positions.map((p) => (
            <div key={p._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group">
              <div>
                <span className="text-sm text-gray-700">{p.name}</span>
                {p.departmentId && (
                  <span className="text-xs text-gray-400 ml-2">({p.departmentId.name})</span>
                )}
              </div>
              <button onClick={() => deletePosition(p._id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProvisionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.GUARD,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users', form);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to provision user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Provision New System User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">System Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>{ROLE_LABEL[role]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 flex items-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Provisioning...' : 'Provision User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

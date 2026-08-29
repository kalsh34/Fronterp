import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import ContractList from '../contracts/ContractList';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  phone?: string;
  hireDate?: string;
  position?: string;
  department?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

const categoryLabels: Record<string, string> = {
  GUARD: 'Guard',
  OFFICE_STAFF: 'Office Staff',
};

const categoryBadge: Record<string, string> = {
  GUARD: 'bg-blue-100 text-blue-700',
  OFFICE_STAFF: 'bg-violet-100 text-violet-700',
};

const tabs = ['Employee Directory', 'Onboarding', 'Documents', 'Contract', 'Site Assignment', 'Attendance', 'Performance'];

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const [stats, setStats] = useState({ total: 0, guards: 0, staff: 0, onLeave: 0, newThisMonth: 0 });

  useEffect(() => { fetchEmployees(); }, [page, search, roleFilter, statusFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.category = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.data);
      setTotalPages(res.data.pagination.totalPages);

      const allRes = await api.get('/employees', { params: { limit: 1 } });
      const allEmps = allRes.data.pagination?.total || 0;
      const guardRes = await api.get('/employees', { params: { limit: 1, category: 'GUARD' } }).catch(() => ({ data: { pagination: { total: 0 } } }));
      const staffRes = await api.get('/employees', { params: { limit: 1, category: 'OFFICE_STAFF' } }).catch(() => ({ data: { pagination: { total: 0 } } }));
      const leaveRes = await api.get('/employees', { params: { limit: 1, status: 'ON_LEAVE' } }).catch(() => ({ data: { pagination: { total: 0 } } }));
      setStats({
        total: allEmps,
        guards: guardRes.data.pagination?.total || 0,
        staff: staffRes.data.pagination?.total || 0,
        onLeave: leaveRes.data.pagination?.total || 0,
        newThisMonth: 0,
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === i
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 3 ? (
        <ContractList />
      ) : (
      <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'TOTAL EMPLOYEES', value: stats.total, dot: 'bg-blue-500' },
          { label: 'ACTIVE GUARDS', value: stats.guards, dot: 'bg-blue-500' },
          { label: 'OFFICE STAFF', value: stats.staff, dot: 'bg-amber-500' },
          { label: 'ON LEAVE', value: stats.onLeave, dot: 'bg-amber-500' },
          { label: 'NEW THIS MONTH', value: stats.newThisMonth, dot: 'bg-emerald-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Add Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="GUARD">Guard</option>
          <option value="OFFICE_STAFF">Office Staff</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none cursor-pointer"
        >
          <option value="">Active Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <div className="flex-1" />

        <Link
          to="/employees/new"
          className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Employee
        </Link>
      </div>

      {/* Main Content: Table + Sidebar */}
      <div className="flex gap-6">
        {/* Employee Table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Active Workforce Directory</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-20 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-sm text-gray-500">No employees found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee ID</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role Type</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Join Date</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-blue-600">{emp.employeeCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-gray-400">{emp.phone || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryBadge[emp.category] || 'bg-gray-100 text-gray-600'}`}>
                            {categoryLabels[emp.category] || emp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[emp.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {emp.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/employees/${emp._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-6 hidden lg:block">
          {/* Gender Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Gender Distribution</h4>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e40af" strokeWidth="3"
                  strokeDasharray="78 22" strokeDashoffset="25" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray="22 78" strokeDashoffset="47" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">78%</span>
                <span className="text-[10px] text-gray-400">Male Workforce</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-700" /> Male (78%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Female (22%)</span>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Department Breakdown</h4>
            <div className="space-y-4">
              {[
                { label: 'Guards / Patrol', pct: stats.guards, color: 'bg-blue-600' },
                { label: 'Operations HQ', pct: Math.round(stats.total * 0.08), color: 'bg-blue-400' },
                { label: 'HR & Payroll', pct: Math.round(stats.total * 0.05), color: 'bg-amber-500' },
                { label: 'Finance & Admin', pct: Math.round(stats.total * 0.04), color: 'bg-amber-400' },
              ].map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{d.label}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${d.color} rounded-full transition-all`} style={{ width: `${stats.total > 0 ? (d.pct / stats.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

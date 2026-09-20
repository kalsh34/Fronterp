import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getApiBaseUrl } from '../../lib/api';
import ContractList from '../contracts/ContractList';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  phone?: string;
  email?: string;
  gender?: string;
  hireDate?: string;
  position?: string;
  department?: string;
  address?: string;
  salary?: number;
  transportAllowance?: number;
  bankName?: string;
  accountNumber?: string;
  guardInfo?: {
    employmentType?: string;
    idCardNumber?: string;
  };
  statusHistory?: {
    from: string;
    to: string;
    reason: string;
    changedBy?: string;
    changedAt: string;
  }[];
}

interface TrendMonth {
  year: number; month: number; monthName: string;
  active: number; inactive: number; onLeave: number;
  newHires: number; deactivated: number;
}

interface EmployeeAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, { total: number; active: number; inactive: number }>;
  activeTotal: number;
  inactiveTotal: number;
  trend: TrendMonth[];
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
  CONTRACTED: 'bg-blue-50 text-blue-700 border-blue-200',
};

const categoryLabels: Record<string, string> = {
  GUARD: 'Guard',
  OFFICE_STAFF: 'Office Staff',
};

const categoryBadge: Record<string, string> = {
  GUARD: 'bg-blue-100 text-blue-700',
  OFFICE_STAFF: 'bg-violet-100 text-violet-700',
};

const tabs = ['Employee Directory', 'Onboarding', 'Guarantor', 'Contract', 'Attendance', 'Performance'];

const STAGES = ['APPLICATION', 'SCREENING', 'INTERVIEW', 'EXAM', 'OFFER', 'HIRED'] as const;
const STAGE_LABELS: Record<string, string> = {
  APPLICATION: 'Application', SCREENING: 'Screening', INTERVIEW: 'Interview',
  EXAM: 'Exam', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected',
};

interface Candidate {
  _id: string; firstName: string; lastName: string; email?: string; phone?: string;
  position: string; department?: string; stage: string; appliedDate: string;
  stageHistory: { stage: string; date: string; notes?: string }[];
}

interface CandidateStats {
  byStage: Record<string, number>;
  total: number;
}

interface AttendanceSummary {
  employee: { _id: string; firstName: string; lastName: string; employeeCode: string; department?: string };
  counts: Record<string, number>;
  payableDays: number;
  totalDaysInMonth: number;
}

interface PerfRecord {
  _id: string;
  employeeId: { firstName: string; lastName: string; employeeCode: string; department?: string } | string;
  period: string; attendanceRate: number; punctualityRate: number;
  score: number; trend: number; flags: string[]; reviewDueDate?: string;
}

interface PerfStats {
  avgScore: number; topDepartment: string; openFlags: number; reviewsDue: number;
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TAB_MAP: Record<string, number> = {
  directory: 0, onboarding: 1, guarantor: 2, contract: 3, attendance: 4, performance: 5,
};

export default function EmployeeList() {
  const [searchParams] = useSearchParams();
  const initialTab = TAB_MAP[searchParams.get('tab') || ''] ?? 0;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [stats, setStats] = useState({ total: 0, guards: 0, staff: 0, onLeave: 0, newThisMonth: 0 });
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

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

      const analyticsRes = await api.get('/employees/analytics/summary', { params: { months: 6 } }).catch(() => null);
      const a: EmployeeAnalytics | null = analyticsRes?.data?.data || null;
      setAnalytics(a);
      if (a) {
        setStats({
          total: a.total,
          guards: a.byCategory?.GUARD?.total || 0,
          staff: a.byCategory?.OFFICE_STAFF?.total || 0,
          onLeave: a.byStatus?.ON_LEAVE || 0,
          newThisMonth: a.trend?.length > 0 ? a.trend[a.trend.length - 1].newHires : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (emp: Employee) => {
    setStatusTarget(emp);
    setNewStatus('');
    setStatusReason('');
    setStatusError('');
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    if (!newStatus) { setStatusError('Select the new status'); return; }
    if (statusReason.trim().length < 3) { setStatusError('A reason (minimum 3 characters) is required'); return; }
    setChangingStatus(true);
    setStatusError('');
    try {
      const res = await api.put(`/employees/${statusTarget._id}/status`, { status: newStatus, reason: statusReason.trim() });
      const updated = res.data.data as Employee;
      setShowStatusModal(false);
      setStatusTarget(null);
      if (selectedEmployee && selectedEmployee._id === updated._id) setSelectedEmployee(updated);
      fetchEmployees();
    } catch (e: any) {
      setStatusError(e.response?.data?.message || 'Failed to change status');
    } finally {
      setChangingStatus(false);
    }
  };

  const statusOptions = ['ACTIVE', 'CONTRACTED', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

  const handleView = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailLoading(true);
    try {
      const res = await api.get(`/employees/${emp._id}`);
      setSelectedEmployee(res.data.data);
    } catch (e) {
      console.error('Failed to load employee details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    if (!confirm(`Delete ${selectedEmployee.firstName} ${selectedEmployee.lastName}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${selectedEmployee._id}`);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

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
      ) : activeTab === 1 ? (
        <OnboardingTab />
      ) : activeTab === 2 ? (
        <GuarantorTab />
      ) : activeTab === 4 ? (
        <AttendanceTab />
      ) : activeTab === 5 ? (
        <PerformanceTab />
      ) : (
      <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'TOTAL EMPLOYEES', value: analytics?.total ?? stats.total, dot: 'bg-blue-500' },
          { label: 'ACTIVE', value: analytics?.activeTotal ?? 0, dot: 'bg-emerald-500' },
          { label: 'INACTIVE', value: analytics?.inactiveTotal ?? 0, dot: 'bg-rose-500' },
          { label: 'ON LEAVE', value: analytics?.byStatus?.ON_LEAVE ?? stats.onLeave, dot: 'bg-amber-500' },
          { label: 'NEW THIS MONTH', value: stats.newThisMonth, dot: 'bg-violet-500' },
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

      {/* Workforce Trend (last 6 months) */}
      {analytics && analytics.trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Workforce Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Active vs inactive headcount at each month-end (last 6 months)</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> Inactive</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> On leave</span>
            </div>
          </div>
          {(() => {
            const max = Math.max(1, ...analytics.trend.map((t) => t.active + t.inactive + t.onLeave));
            return (
              <div className="flex items-end gap-4 sm:gap-6 h-44">
                {analytics.trend.map((t) => {
                  const total = t.active + t.inactive + t.onLeave;
                  const h = (v: number) => `${Math.max(total > 0 && v > 0 ? 4 : 0, (v / max) * 100)}%`;
                  return (
                    <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-700">{total}</span>
                      <div
                        className="w-full max-w-[52px] flex flex-col-reverse rounded-lg overflow-hidden bg-gray-100"
                        style={{ height: '128px' }}
                        title={`${t.monthName} ${t.year}: ${t.active} active, ${t.inactive} inactive, ${t.onLeave} on leave, ${t.newHires} hired, ${t.deactivated} deactivated`}
                      >
                        <div className="bg-emerald-500 transition-all" style={{ height: h(t.active) }} title={`Active: ${t.active}`} />
                        <div className="bg-rose-400 transition-all" style={{ height: h(t.inactive) }} title={`Inactive: ${t.inactive}`} />
                        <div className="bg-amber-400 transition-all" style={{ height: h(t.onLeave) }} title={`On leave: ${t.onLeave}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-gray-600">{t.monthName.slice(0, 3)}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">+{t.newHires} hired</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100 text-xs">
            <div className="text-gray-500">Guards: <span className="font-bold text-gray-900">{analytics.byCategory?.GUARD?.total || 0}</span>
              <span className="text-gray-400"> ({analytics.byCategory?.GUARD?.active || 0} active / {analytics.byCategory?.GUARD?.inactive || 0} inactive)</span>
            </div>
            <div className="text-gray-500">Office staff: <span className="font-bold text-gray-900">{analytics.byCategory?.OFFICE_STAFF?.total || 0}</span>
              <span className="text-gray-400"> ({analytics.byCategory?.OFFICE_STAFF?.active || 0} active / {analytics.byCategory?.OFFICE_STAFF?.inactive || 0} inactive)</span>
            </div>
            <div className="text-gray-500">Contracted: <span className="font-bold text-gray-900">{analytics.byStatus?.CONTRACTED || 0}</span></div>
            <div className="text-gray-500">Terminated: <span className="font-bold text-gray-900">{analytics.byStatus?.TERMINATED || 0}</span></div>
          </div>
        </div>
      )}

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

        <button
          onClick={() => { window.open(`${getApiBaseUrl()}/employees/export`, '_blank'); }}
          className="h-10 px-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>

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
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button onClick={() => handleView(emp)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            View
                          </button>
                          <span className="text-gray-200 mx-2">|</span>
                          <button onClick={() => openStatusModal(emp)} className="text-sm font-medium text-amber-600 hover:text-amber-800 hover:underline">
                            Status
                          </button>
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

          {/* Department Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Department Distribution</h4>
            <div className="space-y-3">
              {[
                { label: 'Operations', pct: Math.round(stats.total * 0.65), color: 'bg-blue-500' },
                { label: 'HR & Admin', pct: Math.round(stats.total * 0.15), color: 'bg-emerald-400' },
                { label: 'Management', pct: Math.round(stats.total * 0.10), color: 'bg-violet-400' },
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

      {/* Employee Detail Sidebar */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedEmployee(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                      <p className="text-sm text-gray-500">{selectedEmployee.employeeCode}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedEmployee.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {selectedEmployee.status?.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${categoryBadge[selectedEmployee.category] || 'bg-gray-100 text-gray-600'}`}>
                    {categoryLabels[selectedEmployee.category] || selectedEmployee.category}
                  </span>
                </div>

                <div className="flex gap-3">
                  <Link to={`/employees/${selectedEmployee._id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </Link>
                  <button onClick={() => openStatusModal(selectedEmployee)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Status
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {/* Status History */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Status History</h3>
                  {(selectedEmployee.statusHistory || []).length === 0 ? (
                    <p className="text-xs text-gray-400">No status changes recorded. Current status since joining.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...(selectedEmployee.statusHistory || [])].reverse().map((h, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
                            {i < (selectedEmployee.statusHistory || []).length - 1 && <span className="w-px flex-1 bg-gray-200" />}
                          </div>
                          <div className="pb-1">
                            <p className="font-semibold text-gray-800">{h.from?.replace(/_/g, ' ')} → {h.to?.replace(/_/g, ' ')}</p>
                            <p className="text-gray-500 mt-0.5">{h.reason}</p>
                            <p className="text-gray-400 mt-0.5">{h.changedAt ? new Date(h.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', value: selectedEmployee.firstName },
                      { label: 'Last Name', value: selectedEmployee.lastName },
                      { label: 'Phone', value: selectedEmployee.phone || '—' },
                      { label: 'Email', value: selectedEmployee.email || '—' },
                      { label: 'Gender', value: selectedEmployee.gender || '—' },
                      { label: 'Date of Birth', value: selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  {selectedEmployee.address && (
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider">Address</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedEmployee.address}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Employee ID', value: selectedEmployee.employeeCode },
                      { label: 'Department', value: selectedEmployee.department || '—' },
                      { label: 'Position', value: selectedEmployee.position || '—' },
                      { label: 'Join Date', value: selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                      { label: 'Category', value: categoryLabels[selectedEmployee.category] || selectedEmployee.category },
                      { label: 'Status', value: selectedEmployee.status?.replace(/_/g, ' ') },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Compensation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Salary', value: selectedEmployee.salary ? `ETB ${selectedEmployee.salary.toLocaleString()}` : '—' },
                      { label: 'Transport Allowance', value: selectedEmployee.transportAllowance ? `ETB ${selectedEmployee.transportAllowance.toLocaleString()}` : '—' },
                      { label: 'Bank Name', value: selectedEmployee.bankName || '—' },
                      { label: 'Account Number', value: selectedEmployee.accountNumber || '—' },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedEmployee.category === 'GUARD' && selectedEmployee.guardInfo && (
                  <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Guard Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Employment Type', value: selectedEmployee.guardInfo.employmentType || '—' },
                        { label: 'ID Card Number', value: selectedEmployee.guardInfo.idCardNumber || '—' },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wider">{f.label}</p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guarantor Quick Link */}
                <Link to={`/employees/${selectedEmployee._id}/guarantor`}
                  className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Guarantor Management</p>
                    <p className="text-xs text-blue-600">View and manage guarantor records</p>
                  </div>
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!changingStatus) { setShowStatusModal(false); setStatusTarget(null); } }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-gray-900">Change Employee Status</h3>
            <p className="text-sm text-gray-500 mt-1">
              {statusTarget.firstName} {statusTarget.lastName} ({statusTarget.employeeCode}) — currently{' '}
              <span className="font-semibold text-gray-700">{statusTarget.status?.replace(/_/g, ' ')}</span>
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                >
                  <option value="">Select status...</option>
                  {statusOptions.filter((s) => s !== statusTarget.status).map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason *</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Resigned voluntarily, end of contract, disciplinary suspension..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none"
                />
              </div>
              {statusError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{statusError}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { if (!changingStatus) { setShowStatusModal(false); setStatusTarget(null); } }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={changingStatus}
                  className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingStatus && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {changingStatus ? 'Saving...' : 'Change Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ONBOARDING TAB
   ============================================================ */
function OnboardingTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats>({ byStage: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '', department: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [candRes, statsRes] = await Promise.all([
        api.get('/candidates', { params: stageFilter !== 'all' ? { stage: stageFilter } : {} }),
        api.get('/candidates/stats'),
      ]);
      setCandidates(candRes.data.data || []);
      setStats(statsRes.data.data || { byStage: {}, total: 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [stageFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddCandidate = async () => {
    try {
      await api.post('/candidates', newCandidate);
      setShowAddModal(false);
      setNewCandidate({ firstName: '', lastName: '', email: '', phone: '', position: '', department: '' });
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleAdvanceStage = async (id: string, nextStage: string) => {
    try {
      await api.put(`/candidates/${id}/stage`, { stage: nextStage });
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/candidates/${id}/reject`, { reason });
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.firstName} ${c.lastName} ${c.position}`.toLowerCase().includes(q);
  });

  const getNextStage = (current: string) => {
    const idx = STAGES.indexOf(current as any);
    return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  };

  const openCandidates = (stats.byStage['APPLICATION'] || 0) + (stats.byStage['SCREENING'] || 0);
  const inInterview = (stats.byStage['INTERVIEW'] || 0) + (stats.byStage['EXAM'] || 0);
  const offers = stats.byStage['OFFER'] || 0;
  const hired = stats.byStage['HIRED'] || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Open Candidates</p>
          <p className="text-2xl font-bold text-gray-900">{openCandidates}</p>
          <p className="text-xs text-gray-500 mt-0.5">Across all stages</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">In Interview or Exam</p>
          <p className="text-2xl font-bold text-gray-900">{inInterview}</p>
          <p className="text-xs text-gray-500 mt-0.5">Awaiting a decision</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Offers Extended</p>
          <p className="text-2xl font-bold text-gray-900">{offers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Awaiting acceptance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hired This Month</p>
          <p className="text-2xl font-bold text-gray-900">{hired}</p>
          <p className="text-xs text-gray-500 mt-0.5">Moved to Employees</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search candidate name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <button onClick={() => setShowAddModal(true)}
          className="h-10 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Candidate
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recruitment Pipeline</h3>
            <p className="text-xs text-gray-500 mt-0.5">HR moves a candidate to the next stage once they pass the current one</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Passed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Current stage</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Rejected</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No candidates found</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(c => {
              const stageIdx = STAGES.indexOf(c.stage as any);
              const nextStage = getNextStage(c.stage);
              return (
                <div key={c._id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                      <span className="text-xs text-gray-400">Applying for: {c.position}</span>
                    </div>
                    <div className="flex items-center gap-0 mt-2">
                      {STAGES.map((s, i) => {
                        const isPassed = stageIdx > i;
                        const isCurrent = c.stage === s;
                        const isRejected = c.stage === 'REJECTED' && i === stageIdx;
                        return (
                          <div key={s} className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              isPassed ? 'bg-emerald-500 text-white' :
                              isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
                              isRejected ? 'bg-red-500 text-white' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {isPassed ? '✓' : i + 1}
                            </div>
                            {i < STAGES.length - 1 && (
                              <div className={`w-10 h-0.5 ${isPassed ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 ml-3">
                        {STAGES.map(s => (
                          <span key={s} className={`text-[10px] w-14 text-center ${c.stage === s ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
                            {STAGE_LABELS[s]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {nextStage && c.stage !== 'HIRED' && c.stage !== 'REJECTED' && (
                      <>
                        <select value={c.stage} onChange={e => handleAdvanceStage(c._id, e.target.value)}
                          className="h-8 px-2 rounded border border-gray-200 text-xs text-gray-700 bg-white">
                          {STAGES.filter((_, i) => i >= stageIdx).map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                        </select>
                        <button onClick={() => nextStage && handleAdvanceStage(c._id, nextStage)}
                          className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                          Mark {STAGE_LABELS[nextStage]} Passed →
                        </button>
                      </>
                    )}
                    {c.stage === 'HIRED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-medium">Hired</span>
                        <Link to="/employees/new" className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          Create Employee
                        </Link>
                      </div>
                    )}
                    {c.stage !== 'HIRED' && c.stage !== 'REJECTED' && (
                      <button onClick={() => handleReject(c._id)}
                        className="h-8 px-3 rounded-lg text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                        Reject
                      </button>
                    )}
                    {c.stage === 'REJECTED' && <span className="text-xs text-red-500">Rejected</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Add New Candidate</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input value={newCandidate.firstName} onChange={e => setNewCandidate({ ...newCandidate, firstName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input value={newCandidate.lastName} onChange={e => setNewCandidate({ ...newCandidate, lastName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Position *</label>
                <input value={newCandidate.position} onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input value={newCandidate.email} onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={newCandidate.phone} onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select value={newCandidate.department} onChange={e => setNewCandidate({ ...newCandidate, department: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm">
                  <option value="">Select</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Administration">Administration</option>
                  <option value="Security">Security</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCandidate} disabled={!newCandidate.firstName || !newCandidate.lastName || !newCandidate.position}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   GUARANTOR TAB
   ============================================================ */
function GuarantorTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [guarantorCounts, setGuarantorCounts] = useState<Record<string, number>>({});

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      const res = await api.get('/employees', { params });
      const emps = res.data.data || [];
      setEmployees(emps);

      const counts: Record<string, number> = {};
      await Promise.all(emps.map(async (emp: Employee) => {
        try {
          const gRes = await api.get(`/guarantors/employee/${emp._id}`);
          counts[emp._id] = (gRes.data.data || []).length;
        } catch { counts[emp._id] = 0; }
      }));
      setGuarantorCounts(counts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = employees.filter(emp => {
    if (statusFilter === 'has_guarantor') return (guarantorCounts[emp._id] || 0) > 0;
    if (statusFilter === 'no_guarantor') return (guarantorCounts[emp._id] || 0) === 0;
    return true;
  });

  const withGuarantor = Object.values(guarantorCounts).filter(c => c > 0).length;
  const withoutGuarantor = employees.length - withGuarantor;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Employees</p>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">With Guarantor</p>
          <p className="text-2xl font-bold text-emerald-600">{withGuarantor}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Without Guarantor</p>
          <p className="text-2xl font-bold text-amber-600">{withoutGuarantor}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search employee name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
          <option value="">All Employees</option>
          <option value="has_guarantor">With Guarantor</option>
          <option value="no_guarantor">Without Guarantor</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Guarantor Status</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click an employee to manage their guarantor</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No employees found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Guarantors</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const count = guarantorCounts[emp._id] || 0;
                  return (
                    <tr key={emp._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryBadge[emp.category] || ''}`}>
                          {categoryLabels[emp.category] || emp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[emp.status] || ''}`}>
                          {emp.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {count > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {count} on file
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/employees/${emp._id}/guarantor`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                          {count > 0 ? 'View' : 'Add Guarantor'}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ATTENDANCE TAB
   ============================================================ */
function AttendanceTab() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [deptFilter, setDeptFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`);
      setSummaries(res.data.data?.summaries || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = summaries.filter(s => {
    const name = `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || s.employee.employeeCode.toLowerCase().includes(q);
    const matchDept = deptFilter === 'all' || s.employee.department === deptFilter;
    return matchSearch && matchDept;
  });

  const presentToday = filtered.filter(s => s.counts.PRESENT > 0).length;
  const lateCount = filtered.filter(s => s.counts.HALF_DAY > 0).length;
  const absentCount = filtered.filter(s => s.counts.ABSENT > 0).length;
  const onLeaveCount = filtered.filter(s => (s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0) > 0).length;

  const departments = [...new Set(summaries.map(s => s.employee.department).filter(Boolean))].sort();

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Present Today</p>
          <p className="text-2xl font-bold text-gray-900">{presentToday}</p>
          <p className="text-xs text-gray-500 mt-0.5">of {summaries.length} office staff</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Late</p>
          <p className="text-2xl font-bold text-gray-900">{lateCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">half-day marks</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Absent</p>
          <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unexplained</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">On Leave</p>
          <p className="text-2xl font-bold text-gray-900">{onLeaveCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Approved leave</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">{monthNames[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d!}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Staff Attendance Log</h3>
          <p className="text-xs text-gray-400 mt-0.5">Office staff only. Guard attendance is tracked separately under Sites.</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Present</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Absent</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Half Day</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Leave</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payable Days</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">No attendance data</td></tr>
                ) : filtered.map(s => {
                  const hasAbsence = s.counts.ABSENT > 0;
                  const hasLeave = (s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0) > 0;
                  const isHalfDay = s.counts.HALF_DAY > 0;
                  let status = 'On time';
                  let statusColor = 'bg-emerald-100 text-emerald-700';
                  if (hasAbsence) { status = 'Absent'; statusColor = 'bg-red-100 text-red-700'; }
                  else if (hasLeave) { status = 'On leave'; statusColor = 'bg-blue-100 text-blue-700'; }
                  else if (isHalfDay) { status = 'Late'; statusColor = 'bg-amber-100 text-amber-700'; }

                  return (
                    <tr key={s.employee._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-semibold">
                            {s.employee.firstName[0]}{s.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.employee.firstName} {s.employee.lastName}</p>
                            <p className="text-xs text-gray-400">{s.employee.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.employee.department || '—'}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium">{s.counts.PRESENT || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-red-600">{s.counts.ABSENT || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-amber-600">{s.counts.HALF_DAY || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-blue-600">
                        {(s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-green-700">{s.payableDays}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PERFORMANCE TAB
   ============================================================ */
function PerformanceTab() {
  const [records, setRecords] = useState<PerfRecord[]>([]);
  const [stats, setStats] = useState<PerfStats>({ avgScore: 0, topDepartment: '—', openFlags: 0, reviewsDue: 0 });
  const [topPerformers, setTopPerformers] = useState<PerfRecord[]>([]);
  const [reviewsDue, setReviewsDue] = useState<PerfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [perfForm, setPerfForm] = useState({ employeeId: '', period: '2026-Q3', attendanceRate: 95, punctualityRate: 90, score: 85, notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, statsRes, topRes, dueRes] = await Promise.all([
        api.get('/performance'),
        api.get('/performance/stats'),
        api.get('/performance/top-performers'),
        api.get('/performance/reviews-due'),
      ]);
      setRecords(recRes.data.data || []);
      setStats(statsRes.data.data || { avgScore: 0, topDepartment: '—', openFlags: 0, reviewsDue: 0 });
      setTopPerformers(topRes.data.data || []);
      setReviewsDue(dueRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 200 } });
      setEmployees(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAddPerformance = async () => {
    try {
      await api.post('/performance', perfForm);
      setShowAddModal(false);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
    const q = search.toLowerCase();
    return emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) : false;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Avg. Performance Score</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
          <p className="text-xs text-gray-500 mt-0.5">Across all staff</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Top Rated Department</p>
          <p className="text-2xl font-bold text-gray-900">{stats.topDepartment}</p>
          <p className="text-xs text-gray-500 mt-0.5">Highest avg. score</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Open Flags</p>
          <p className="text-2xl font-bold text-gray-900">{stats.openFlags}</p>
          <p className="text-xs text-gray-500 mt-0.5">Under HR review</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reviews Due</p>
          <p className="text-2xl font-bold text-gray-900">{stats.reviewsDue}</p>
          <p className="text-xs text-gray-500 mt-0.5">Next 30 days</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <button onClick={() => { setShowAddModal(true); loadEmployees(); }}
              className="h-10 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Review
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Staff Performance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Office staff only, scored from attendance, punctuality, and manager reviews.</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Punctuality</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No performance data yet. Add a review to get started.</td></tr>
                    ) : filtered.map(r => {
                      const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                      if (!emp) return null;
                      return (
                        <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-semibold">
                                {emp.firstName[0]}{emp.lastName[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{emp.department || '—'}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium">{r.attendanceRate}%</td>
                          <td className="px-6 py-4 text-center text-sm font-medium">{r.punctualityRate}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold ${r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{r.score}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.trend > 0 && <span className="text-xs font-medium text-emerald-600">▲ {r.trend}</span>}
                            {r.trend < 0 && <span className="text-xs font-medium text-red-600">▼ {Math.abs(r.trend)}</span>}
                            {r.trend === 0 && <span className="text-xs text-gray-400">— 0</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Top Performers</h4>
            {topPerformers.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((r, i) => {
                  const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                  if (!emp) return null;
                  return (
                    <div key={r._id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{emp.firstName} {emp.lastName}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{r.score}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Reviews Due Soon</h4>
            {reviewsDue.length === 0 ? (
              <p className="text-xs text-gray-400">No reviews due</p>
            ) : (
              <div className="space-y-3">
                {reviewsDue.map(r => {
                  const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                  if (!emp) return null;
                  const dueDate = r.reviewDueDate ? new Date(r.reviewDueDate) : null;
                  const isOverdue = dueDate && dueDate < new Date();
                  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={r._id} className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">{emp.firstName} {emp.lastName}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isOverdue ? 'Overdue' : `Due in ${daysLeft} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Performance Review</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                <select value={perfForm.employeeId} onChange={e => setPerfForm({ ...perfForm, employeeId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm">
                  <option value="">Select employee</option>
                  {employees.map((e: any) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
                <input value={perfForm.period} onChange={e => setPerfForm({ ...perfForm, period: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" placeholder="2026-Q3" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Attendance %</label>
                  <input type="number" value={perfForm.attendanceRate} onChange={e => setPerfForm({ ...perfForm, attendanceRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Punctuality %</label>
                  <input type="number" value={perfForm.punctualityRate} onChange={e => setPerfForm({ ...perfForm, punctualityRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Score</label>
                  <input type="number" value={perfForm.score} onChange={e => setPerfForm({ ...perfForm, score: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={perfForm.notes} onChange={e => setPerfForm({ ...perfForm, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddPerformance} disabled={!perfForm.employeeId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

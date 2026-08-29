import { useEffect, useState, useMemo } from 'react';
import api from '../../lib/api';

interface GuardEmployee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  status: string;
  hireDate?: string;
}

interface GuardProfile {
  position: string;
  employmentType: string;
  rate?: number;
  transportAllowance?: number;
}

interface GuardAssignment {
  _id: string;
  siteId: { siteName: string; siteCode: string; _id: string } | string;
  role: string;
  hourlyRate: number;
  effectiveFrom: string;
  isCurrent: boolean;
  standardMonthlyHours?: number;
}

interface GuardData {
  employee: GuardEmployee;
  profile: GuardProfile | null;
  currentAssignments: GuardAssignment[];
}

type FilterTab = 'active' | 'standby' | 'on-leave' | 'unassigned';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'active', label: 'Active Guards' },
  { key: 'standby', label: 'Standby' },
  { key: 'on-leave', label: 'On Leave' },
  { key: 'unassigned', label: 'Unassigned' },
];

const statusDotColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-gray-400',
  ON_LEAVE: 'bg-amber-500',
  TERMINATED: 'bg-red-500',
};

const positionLabels: Record<string, string> = {
  GUARD: 'Guard',
  SITE_LEADER: 'Supervisor',
};

export default function GuardsPage() {
  const [guards, setGuards] = useState<GuardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('active');
  const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showRelieveModal, setShowRelieveModal] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedAssignmentRole, setSelectedAssignmentRole] = useState<'GUARD' | 'SUPERVISOR'>('GUARD');
  const [sites, setSites] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [guardsRes, sitesRes] = await Promise.all([
        api.get('/guards'),
        api.get('/sites'),
      ]);
      setGuards(guardsRes.data.data || []);
      setSites(sitesRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuards = useMemo(() => {
    let result = guards;
    switch (activeFilter) {
      case 'active':
        result = result.filter((g) => g.currentAssignments.length > 0 && g.employee.status === 'ACTIVE');
        break;
      case 'standby':
        result = result.filter((g) => g.currentAssignments.length === 0 && g.employee.status === 'ACTIVE');
        break;
      case 'on-leave':
        result = result.filter((g) => g.employee.status === 'ON_LEAVE');
        break;
      case 'unassigned':
        result = result.filter((g) => g.currentAssignments.length === 0);
        break;
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) =>
        g.employee.firstName.toLowerCase().includes(q) ||
        g.employee.lastName.toLowerCase().includes(q) ||
        g.employee.employeeCode.toLowerCase().includes(q) ||
        g.currentAssignments.some((a) => {
          const siteId = a.siteId;
          return typeof siteId === 'object' && siteId.siteName.toLowerCase().includes(q);
        })
      );
    }
    return result;
  }, [guards, activeFilter, search]);

  const selectedGuardData = useMemo(() => {
    if (!selectedGuard) return null;
    return guards.find((g) => g.employee._id === selectedGuard) || null;
  }, [guards, selectedGuard]);

  const selectedSiteGuards = useMemo(() => {
    if (!selectedGuardData?.currentAssignments.length) return [];
    const siteIds = selectedGuardData.currentAssignments.map((a) => {
      const siteId = a.siteId;
      return typeof siteId === 'object' ? siteId._id : siteId;
    });
    return guards.filter((g) => {
      if (!g.currentAssignments.length) return false;
      return g.currentAssignments.some((a) => {
        const gSiteId = typeof a.siteId === 'object' ? a.siteId._id : a.siteId;
        return siteIds.includes(gSiteId);
      });
    });
  }, [guards, selectedGuardData]);

  const siteName = useMemo(() => {
    if (!selectedGuardData?.currentAssignments.length) return '';
    const siteId = selectedGuardData.currentAssignments[0].siteId;
    return typeof siteId === 'object' ? siteId.siteName : 'Unknown Site';
  }, [selectedGuardData]);

  const handleAssign = async (guardId: string) => {
    if (!selectedSite) return;
    setSaving(true);
    try {
      await api.post('/guards/assign-site', { guardId, siteId: selectedSite, role: selectedAssignmentRole });
      setShowAssignModal(null);
      setSelectedSite('');
      setSelectedAssignmentRole('GUARD');
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  const handleRelieve = async (assignmentId: string) => {
    setSaving(true);
    try {
      await api.delete(`/guards/site-assignment/${assignmentId}`);
      setShowRelieveModal(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to relieve guard');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (first: string, last: string) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  const getPositionLabel = (pos?: string) => positionLabels[pos || ''] || pos || 'Guard';

  const getShiftPattern = () => '4 Days On, 4 Days Off (12h)';
  const getHoursWorked = () => Math.floor(Math.random() * 80 + 120);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Guard List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 mb-4">
            <h2 className="text-base font-bold text-white">Guard Allocation & Attendance</h2>
            <p className="text-xs text-emerald-100 mt-1">All active field personnel</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-3">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search guards by name, ID, or site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {/* Guard List */}
        <div className="flex-1 overflow-y-auto">
          {filteredGuards.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No guards found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredGuards.map((guard) => {
                const isSelected = selectedGuard === guard.employee._id;
                const firstAssignment = guard.currentAssignments[0];
                const firstSite = firstAssignment?.siteId;
                const siteNameLabel = typeof firstSite === 'object' ? firstSite.siteName : 'Unassigned';
                const dotColor = statusDotColors[guard.employee.status] || 'bg-gray-400';
                const isStandby = guard.currentAssignments.length === 0 && guard.employee.status === 'ACTIVE';
                const hasMultipleSites = guard.currentAssignments.length > 1;

                return (
                  <button
                    key={guard.employee._id}
                    onClick={() => setSelectedGuard(guard.employee._id)}
                    className={`w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-3 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(guard.employee.firstName, guard.employee.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {guard.employee.firstName} {guard.employee.lastName}
                          </p>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isStandby ? 'bg-amber-500' : dotColor}`} />
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{siteNameLabel}{hasMultipleSites ? ` +${guard.currentAssignments.length - 1} more` : ''}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium ${
                            guard.profile?.position === 'SITE_LEADER'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {getPositionLabel(guard.profile?.position)}
                          </span>
                          {isStandby && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700">
                              Standby
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Guard Cards */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {selectedGuardData ? (
          <>
            {/* Site Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{siteName || 'Unassigned'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedSiteGuards.length} Personnel</p>
              </div>
              <div className="flex gap-2">
                {selectedGuardData.currentAssignments.length > 0 && (
                  <button
                    onClick={() => setShowRelieveModal(selectedGuardData!.currentAssignments[0]!._id)}
                    className="h-9 px-4 flex items-center gap-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                    Relieve from Site
                  </button>
                )}
                <button
                  onClick={() => setShowAssignModal(selectedGuardData.employee._id)}
                  className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Assign Guard
                </button>
              </div>
            </div>

            {/* Guard Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {selectedSiteGuards.map((guard) => {
                const assignments = guard.currentAssignments;
                const primaryAssignment = assignments[0];
                const statusLabel = guard.employee.status === 'ACTIVE' ? 'Active' :
                  guard.employee.status === 'ON_LEAVE' ? 'On Leave' :
                  guard.employee.status === 'INACTIVE' ? 'Inactive' : guard.employee.status;
                const statusColor = guard.employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  guard.employee.status === 'ON_LEAVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-gray-50 text-gray-600 border-gray-200';

                return (
                  <div key={guard.employee._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {getInitials(guard.employee.firstName, guard.employee.lastName)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{guard.employee.firstName} {guard.employee.lastName}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              guard.profile?.position === 'SITE_LEADER'
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {getPositionLabel(guard.profile?.position)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedGuard(guard.employee._id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View
                      </button>
                    </div>

                    {/* Card Body - Details */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Rate</p>
                        <p className="text-sm font-medium text-gray-900">${primaryAssignment?.hourlyRate?.toFixed(2) || guard.profile?.rate?.toFixed(2) || '0.00'}/hr</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Shift Pattern</p>
                        <p className="text-sm text-gray-700">{getShiftPattern()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Hours Worked</p>
                        <p className="text-sm text-gray-700">{getHoursWorked()}h this month</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Assigned Since</p>
                        <p className="text-sm text-gray-700">
                          {primaryAssignment?.effectiveFrom
                            ? new Date(primaryAssignment.effectiveFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Multi-Site Assignments */}
                    {assignments.length > 1 && (
                      <div className="pt-3 border-t border-gray-100 mb-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">All Sites ({assignments.length})</p>
                        <div className="space-y-1">
                          {assignments.map((a) => {
                            const siteLabel = typeof a.siteId === 'object' ? a.siteId.siteName : 'Unknown';
                            return (
                              <div key={a._id} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-700">{siteLabel}</span>
                                <span className="text-gray-400">{a.role === 'SUPERVISOR' ? 'Supervisor' : 'Guard'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="pt-3 border-t border-gray-100 space-y-1.5">
                      {guard.employee.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {guard.employee.phone}
                        </div>
                      )}
                      {guard.employee.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {guard.employee.email}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-400">Select a guard from the list to view details</p>
          </div>
        )}
      </div>

      {/* Assign Site Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowAssignModal(null); setSelectedSite(''); setSelectedAssignmentRole('GUARD'); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Site</h3>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 mb-3"
            >
              <option value="">Select Site</option>
              {sites.map((s: any) => (
                <option key={s._id} value={s._id}>{s.siteName} ({s.siteCode})</option>
              ))}
            </select>
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Assignment Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignmentRole('GUARD')}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    selectedAssignmentRole === 'GUARD'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Guard
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAssignmentRole('SUPERVISOR')}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    selectedAssignmentRole === 'SUPERVISOR'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Supervisor
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAssignModal(null); setSelectedSite(''); setSelectedAssignmentRole('GUARD'); }}
                className="flex-1 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssign(showAssignModal)}
                disabled={saving || !selectedSite}
                className="flex-1 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relieve Confirmation Modal */}
      {showRelieveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRelieveModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Relieve Guard from Site</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will end the guard's current site assignment. They will become eligible for reassignment.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRelieveModal(null)}
                className="flex-1 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRelieve(showRelieveModal)}
                disabled={saving}
                className="flex-1 h-10 flex items-center justify-center rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Relieving...' : 'Confirm Relieve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

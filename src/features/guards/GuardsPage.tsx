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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CONTRACTED: 'bg-blue-50 text-blue-700 border-blue-200',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

const positionLabels: Record<string, string> = { GUARD: 'Guard', SITE_LEADER: 'Supervisor' };

export default function GuardsPage() {
  const [guards, setGuards] = useState<GuardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
  const [sites, setSites] = useState<any[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSiteId, setAssignSiteId] = useState('');
  const [assignRole, setAssignRole] = useState<'GUARD' | 'SUPERVISOR'>('GUARD');
  const [saving, setSaving] = useState(false);

  const [relieveTarget, setRelieveTarget] = useState<{ assignmentId: string; siteName: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([api.get('/guards'), api.get('/sites')]);
      setGuards(gRes.data.data || []);
      setSites(sRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectedGuardData = useMemo(() => {
    if (!selectedGuard) return null;
    return guards.find((g) => g.employee._id === selectedGuard) || null;
  }, [guards, selectedGuard]);

  const filteredGuards = useMemo(() => {
    if (!search) return guards;
    const q = search.toLowerCase();
    return guards.filter((g) =>
      g.employee.firstName.toLowerCase().includes(q) ||
      g.employee.lastName.toLowerCase().includes(q) ||
      g.employee.employeeCode.toLowerCase().includes(q)
    );
  }, [guards, search]);

  const handleAssign = async () => {
    if (!selectedGuard || !assignSiteId) return;
    setSaving(true);
    try {
      await api.post('/guards/assign-site', { guardId: selectedGuard, siteId: assignSiteId, role: assignRole });
      setShowAssignModal(false);
      setAssignSiteId('');
      setAssignRole('GUARD');
      await loadData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to assign'); }
    finally { setSaving(false); }
  };

  const handleRelieve = async (assignmentId: string) => {
    setSaving(true);
    try {
      await api.delete(`/guards/site-assignment/${assignmentId}`);
      setRelieveTarget(null);
      await loadData();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to relieve'); }
    finally { setSaving(false); }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  const getSiteName = (sid: GuardAssignment['siteId']) => typeof sid === 'object' ? sid.siteName : 'Unknown';
  const getSiteCode = (sid: GuardAssignment['siteId']) => typeof sid === 'object' ? sid.siteCode : '';
  const getSiteId = (sid: GuardAssignment['siteId']) => typeof sid === 'object' ? sid._id : sid;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar — Guard List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 mb-4">
            <h2 className="text-base font-bold text-white">Guard Roster</h2>
            <p className="text-xs text-indigo-200 mt-1">{guards.length} total personnel</p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGuards.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No guards found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredGuards.map((guard) => {
                const isSelected = selectedGuard === guard.employee._id;
                const siteCount = guard.currentAssignments.length;
                return (
                  <button key={guard.employee._id} onClick={() => setSelectedGuard(guard.employee._id)}
                    className={`w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50 border-l-3 border-l-indigo-600' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(guard.employee.firstName, guard.employee.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{guard.employee.firstName} {guard.employee.lastName}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {siteCount > 0 ? `${siteCount} site${siteCount > 1 ? 's' : ''}` : 'Unassigned'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-medium ${STATUS_COLORS[guard.employee.status] || 'bg-gray-100 text-gray-600'}`}>
                            {guard.employee.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{guard.employee.employeeCode}</span>
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

      {/* Right Content — Selected Guard Detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {selectedGuardData ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Guard Profile Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {getInitials(selectedGuardData.employee.firstName, selectedGuardData.employee.lastName)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedGuardData.employee.firstName} {selectedGuardData.employee.lastName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-mono">{selectedGuardData.employee.employeeCode}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${STATUS_COLORS[selectedGuardData.employee.status] || 'bg-gray-100 text-gray-600'}`}>
                        {selectedGuardData.employee.status}
                      </span>
                      {selectedGuardData.profile?.position && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-indigo-100 text-indigo-700">
                          {positionLabels[selectedGuardData.profile.position] || selectedGuardData.profile.position}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {selectedGuardData.employee.phone && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {selectedGuardData.employee.phone}
                        </span>
                      )}
                      {selectedGuardData.employee.email && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {selectedGuardData.employee.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowAssignModal(true)}
                  className="h-10 px-5 flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Assign Guard
                </button>
              </div>
            </div>

            {/* Site Assignments */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Site Assignments ({selectedGuardData.currentAssignments.length})</h3>
              </div>
              {selectedGuardData.currentAssignments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No site assignments</p>
                  <p className="text-xs text-gray-400 mt-1">Assign this guard to a site to get started</p>
                  <button onClick={() => setShowAssignModal(true)} className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                    + Assign to Site
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {selectedGuardData.currentAssignments.map((a) => {
                    const siteNameLabel = getSiteName(a.siteId);
                    const siteCodeLabel = getSiteCode(a.siteId);
                    return (
                      <div key={a._id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{siteNameLabel}</p>
                                {siteCodeLabel && <span className="text-[10px] text-gray-400 font-mono">{siteCodeLabel}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {a.role}
                                </span>
                                <span>{a.hourlyRate > 0 ? `$${a.hourlyRate.toFixed(2)}/hr` : 'Rate not set'}</span>
                                <span>Since {new Date(a.effectiveFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                {a.standardMonthlyHours && <span>{a.standardMonthlyHours}h/mo</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => setRelieveTarget({ assignmentId: a._id, siteName: siteNameLabel })}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                            Relieve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rate Summary */}
            {selectedGuardData.currentAssignments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Rate Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Profile Rate</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{selectedGuardData.profile?.rate ? `$${selectedGuardData.profile.rate.toFixed(2)}` : '—'}</p>
                    <p className="text-[10px] text-gray-400">/hr</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Transport Allow.</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{selectedGuardData.profile?.transportAllowance ? `$${selectedGuardData.profile.transportAllowance.toFixed(2)}` : '—'}</p>
                    <p className="text-[10px] text-gray-400">/month</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Employment</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{selectedGuardData.profile?.employmentType || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Select a guard to view their details</p>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedGuardData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => { setShowAssignModal(false); setAssignSiteId(''); setAssignRole('GUARD'); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Site</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedGuardData.employee.firstName} {selectedGuardData.employee.lastName}</p>

            {selectedGuardData.currentAssignments.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Currently Assigned</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuardData.currentAssignments.map((a) => (
                    <span key={a._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                      {getSiteName(a.siteId)}
                      <span className="text-indigo-400">({a.role === 'SUPERVISOR' ? 'Supv' : 'Guard'})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block mt-3">New Site</label>
            <select value={assignSiteId} onChange={(e) => setAssignSiteId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 mb-3 transition-all">
              <option value="">Select a site</option>
              {sites.filter((s: any) => {
                const assigned = new Set(selectedGuardData.currentAssignments.map((a) => getSiteId(a.siteId)));
                return !assigned.has(s._id);
              }).map((s: any) => (
                <option key={s._id} value={s._id}>{s.siteName} ({s.siteCode})</option>
              ))}
            </select>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Role</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAssignRole('GUARD')}
                  className={`flex-1 h-10 rounded-xl border text-sm font-medium transition-all ${assignRole === 'GUARD' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  Guard
                </button>
                <button type="button" onClick={() => setAssignRole('SUPERVISOR')}
                  className={`flex-1 h-10 rounded-xl border text-sm font-medium transition-all ${assignRole === 'SUPERVISOR' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  Supervisor
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowAssignModal(false); setAssignSiteId(''); setAssignRole('GUARD'); }}
                className="flex-1 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={saving || !assignSiteId}
                className="flex-1 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relieve Confirmation Modal */}
      {relieveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setRelieveTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Relieve from {relieveTarget.siteName}</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will remove <strong>{selectedGuardData?.employee.firstName} {selectedGuardData?.employee.lastName}</strong> from <strong>{relieveTarget.siteName}</strong>.
              They will become available for reassignment.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRelieveTarget(null)}
                className="flex-1 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleRelieve(relieveTarget.assignmentId)} disabled={saving}
                className="flex-1 h-10 flex items-center justify-center rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-200">
                {saving ? 'Relieving...' : 'Confirm Relieve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

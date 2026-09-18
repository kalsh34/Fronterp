import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

interface Site {
  id: string;
  siteName: string;
  agreedManpower: number;
  requiredGuardCount: number;
}

interface GuardAssignment {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  siteId: string;
  siteName: string;
  role: string;
}

interface AttendanceRecord {
  guardId: string;
  siteId: string;
  date: string;
  totalHours: number;
}

export default function CoverageDashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [allGuards, setAllGuards] = useState<GuardAssignment[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, guardsRes] = await Promise.all([
        api.get('/sites'),
        api.get('/guards'),
      ]);

      const allSites = (sitesRes.data.data || []).map((s: any) => ({
        id: s._id || s.id,
        siteName: s.siteName,
        agreedManpower: s.agreedManpower || 0,
        requiredGuardCount: s.requiredGuardCount || 0,
      }));
      setSites(allSites);

      const guardList: GuardAssignment[] = (guardsRes.data.data || [])
        .filter((g: any) => g.employee.status === 'CONTRACTED')
        .flatMap((g: any) =>
          (g.currentAssignments?.length > 0
            ? g.currentAssignments
            : [{ siteId: null, siteName: 'Unassigned', role: 'GUARD' }]
          ).map((a: any) => ({
            employeeId: g.employee._id,
            employeeCode: g.employee.employeeCode,
            firstName: g.employee.firstName,
            lastName: g.employee.lastName,
            siteId: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId._id : a.siteId,
            siteName: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId.siteName : 'Unassigned',
            role: a.role || 'GUARD',
          }))
        );
      setAllGuards(guardList);

      const attendanceRes = await api.get(
        `/attendance?startDate=${selectedDate}&endDate=${selectedDate}`
      );
      const dayRecords = (attendanceRes.data.data || []).map((r: any) => ({
        guardId: r.guardId?._id || r.guardId,
        siteId: r.siteId?._id || r.siteId,
        date: r.date,
        totalHours: r.totalHours,
      }));
      setRecords(dayRecords);
    } catch (e) {
      console.error('Failed to load coverage data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const siteData = sites.map((site) => {
    const activityAtSite = records.filter((r) => r.siteId === site.id);
    const filedGuardIds = new Set(activityAtSite.map((r) => r.guardId));
    const rosteredAtSite = allGuards.filter((a) => a.siteId === site.id);
    const rosteredIds = new Set(rosteredAtSite.map((a) => a.employeeId));
    const filedNotOnRoster = activityAtSite.filter((r) => !rosteredIds.has(r.guardId));
    const rosteredNotFiled = rosteredAtSite.filter((a) => !filedGuardIds.has(a.employeeId));
    const filedGuardDetails = activityAtSite.map((r) => {
      const guard = allGuards.find((a) => a.employeeId === r.guardId);
      return { ...r, firstName: guard?.firstName || 'Unknown', lastName: guard?.lastName || '', employeeCode: guard?.employeeCode || '', onRoster: rosteredIds.has(r.guardId) };
    });

    return { site, rosterCount: rosteredAtSite.length, filedCount: activityAtSite.length, agreedManpower: site.agreedManpower, rosteredNotFiled, filedNotOnRoster, filedGuardDetails };
  });

  const totalFiled = siteData.reduce((sum, d) => sum + d.filedCount, 0);
  const totalAgreed = siteData.reduce((sum, d) => sum + d.agreedManpower, 0);
  const sitesWithIssues = siteData.filter((d) => d.rosteredNotFiled.length > 0 || d.filedNotOnRoster.length > 0).length;

  return (
    <div className="space-y-5">
      {/* Header + Date Picker */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cross-Site Coverage Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Monitor guard coverage across all sites for a selected date</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Filed</p>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">{totalFiled}</span>
              <span className="text-sm text-gray-400 ml-1">/ {totalAgreed}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Coverage Rate</p>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
            </div>
            <span className={`text-2xl font-bold ${totalAgreed > 0 && (totalFiled / totalAgreed) >= 1 ? 'text-emerald-600' : totalAgreed > 0 && (totalFiled / totalAgreed) >= 0.5 ? 'text-amber-500' : 'text-red-600'}`}>
              {totalAgreed > 0 ? Math.round((totalFiled / totalAgreed) * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sites with Issues</p>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <span className={`text-2xl font-bold ${sitesWithIssues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{sitesWithIssues}</span>
          </div>
        </div>
      </div>

      {/* Site Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {siteData.map(({ site, rosterCount, filedCount, agreedManpower, rosteredNotFiled, filedNotOnRoster, filedGuardDetails }) => {
            const hasIssues = rosteredNotFiled.length > 0 || filedNotOnRoster.length > 0;
            const coveragePct = agreedManpower > 0 ? Math.round((filedCount / agreedManpower) * 100) : 0;
            const isUnderstaffed = agreedManpower > 0 && filedCount < agreedManpower;
            const isOverstaffed = agreedManpower > 0 && filedCount > agreedManpower;

            return (
              <div key={site.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: coveragePct >= 100 ? '#10B981' : coveragePct >= 50 ? '#F59E0B' : '#EF4444' }} />
                      <h3 className="text-sm font-bold text-gray-900">{site.siteName}</h3>
                      {hasIssues && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-semibold">
                          {rosteredNotFiled.length + filedNotOnRoster.length} issue{rosteredNotFiled.length + filedNotOnRoster.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {!hasIssues && filedCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-semibold">OK</span>
                      )}
                    </div>
                    <div className="flex items-center gap-5 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-gray-900">{rosterCount}</div>
                        <div className="text-gray-400">Rostered</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold ${isUnderstaffed ? 'text-red-600' : isOverstaffed ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {filedCount}
                        </div>
                        <div className="text-gray-400">Filed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-500">{agreedManpower}</div>
                        <div className="text-gray-400">Agreed</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold ${coveragePct >= 100 ? 'text-emerald-600' : coveragePct >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
                          {coveragePct}%
                        </div>
                        <div className="text-gray-400">Coverage</div>
                      </div>
                    </div>
                  </div>
                </div>

                {(rosteredNotFiled.length > 0 || filedNotOnRoster.length > 0) && (
                  <div className="px-5 py-3 bg-amber-50/50 space-y-2 text-xs border-b border-amber-100">
                    {rosteredNotFiled.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-700">Rostered but not filed: </span>
                        <span className="text-amber-600">
                          {rosteredNotFiled.map((a) => `${a.firstName} ${a.lastName}`).join(', ')}
                        </span>
                      </div>
                    )}
                    {filedNotOnRoster.length > 0 && (
                      <div>
                        <span className="font-semibold text-indigo-700">Filed but not on roster: </span>
                        <span className="text-indigo-600">
                          {filedNotOnRoster.map((r) => {
                            const guard = allGuards.find((a) => a.employeeId === r.guardId);
                            return guard ? `${guard.firstName} ${guard.lastName}` : r.guardId;
                          }).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {filedGuardDetails.length > 0 && (
                  <div className="px-5 py-3 bg-gray-50/50 text-xs">
                    <div className="font-semibold text-gray-700 mb-2">Filed guards:</div>
                    <div className="flex flex-wrap gap-2">
                      {filedGuardDetails.map((r) => (
                        <span
                          key={r.guardId}
                          className={`px-2.5 py-1 rounded-lg font-medium ${
                            r.onRoster ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {r.firstName} {r.lastName} ({r.totalHours}h)
                          {!r.onRoster && ' — off-roster'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {siteData.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No sites found.</p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Coverage OK
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          Mismatch flagged
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Understaffed
        </div>
      </div>
    </div>
  );
}
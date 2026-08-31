import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Card, LoadingSpinner } from '../../components/ui';

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
  date: string;
  totalHours: number;
}

export default function CoverageDashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [assignments, setAssignments] = useState<GuardAssignment[]>([]);
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

      const allAssignments: GuardAssignment[] = [];
      (guardsRes.data.data || []).forEach((g: any) => {
        (g.currentAssignments || []).forEach((a: any) => {
          allAssignments.push({
            employeeId: g.employee._id,
            employeeCode: g.employee.employeeCode,
            firstName: g.employee.firstName,
            lastName: g.employee.lastName,
            siteId: typeof a.siteId === 'object' ? a.siteId._id : a.siteId,
            siteName: typeof a.siteId === 'object' ? a.siteId.siteName : 'Unknown',
            role: a.role || 'GUARD',
          });
        });
      });
      setAssignments(allAssignments);

      const dateObj = new Date(selectedDate);
      const startOfWeek = new Date(dateObj);
      startOfWeek.setDate(dateObj.getDate() - dateObj.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const attendanceRes = await api.get(
        `/attendance?startDate=${selectedDate}&endDate=${selectedDate}`
      );
      const dayRecords = (attendanceRes.data.data || []).map((r: any) => ({
        guardId: r.guardId?._id || r.guardId,
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
    const siteAssignments = assignments.filter((a) => a.siteId === site.id);
    const rosteredIds = new Set(siteAssignments.map((a) => a.employeeId));
    const attendanceToday = records.filter((r) => rosteredIds.has(r.guardId));
    const filedGuardIds = new Set(attendanceToday.map((r) => r.guardId));

    const rosteredNotFiled = siteAssignments.filter((a) => !filedGuardIds.has(a.employeeId));
    const filedNotRostered = records.filter((r) => {
      const guard = assignments.find((a) => a.employeeId === r.guardId && a.siteId === site.id);
      return !guard && r.guardId;
    });

    return {
      site,
      rosterCount: siteAssignments.length,
      filedCount: attendanceToday.length,
      agreedManpower: site.agreedManpower,
      rosteredNotFiled,
      filedNotRostered,
    };
  });

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Cross-Site Coverage Dashboard</h2>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading coverage data..." />
      ) : (
        <div className="space-y-3">
          {siteData.map(({ site, rosterCount, filedCount, agreedManpower, rosteredNotFiled, filedNotRostered }) => {
            const hasIssues = rosteredNotFiled.length > 0 || filedNotRostered.length > 0;
            const coveragePct = agreedManpower > 0 ? Math.round((filedCount / agreedManpower) * 100) : 0;
            const isUnderstaffed = agreedManpower > 0 && filedCount < agreedManpower;
            const isOverstaffed = agreedManpower > 0 && filedCount > agreedManpower;

            return (
              <Card key={site.id} padding={false} className="overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">{site.siteName}</h3>
                      {hasIssues && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {rosteredNotFiled.length + filedNotRostered.length} issue{rosteredNotFiled.length + filedNotRostered.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {!hasIssues && filedCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          OK
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{rosterCount}</div>
                        <div className="text-gray-400">Rostered</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${isUnderstaffed ? 'text-red-600' : isOverstaffed ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {filedCount}
                        </div>
                        <div className="text-gray-400">Filed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-500">{agreedManpower}</div>
                        <div className="text-gray-400">Agreed</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${coveragePct >= 100 ? 'text-emerald-600' : coveragePct >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
                          {coveragePct}%
                        </div>
                        <div className="text-gray-400">Coverage</div>
                      </div>
                    </div>
                  </div>
                </div>

                {(rosteredNotFiled.length > 0 || filedNotRostered.length > 0) && (
                  <div className="px-5 py-3 bg-amber-50/50 space-y-2 text-xs">
                    {rosteredNotFiled.length > 0 && (
                      <div>
                        <span className="font-medium text-amber-700">Rostered but not filed: </span>
                        <span className="text-amber-600">
                          {rosteredNotFiled.map((a) => `${a.firstName} ${a.lastName}`).join(', ')}
                        </span>
                      </div>
                    )}
                    {filedNotRostered.length > 0 && (
                      <div>
                        <span className="font-medium text-blue-700">Filed but not on roster: </span>
                        <span className="text-blue-600">
                          {filedNotRostered.map((r) => {
                            const guard = assignments.find((a) => a.employeeId === r.guardId);
                            return guard ? `${guard.firstName} ${guard.lastName}` : r.guardId;
                          }).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {siteData.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No sites found.</p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
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

import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import QuickLogPanel from './QuickLogPanel';

interface Guard {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  siteName: string;
  siteId: string;
}

interface DayEntry {
  hoursWorked: number;
  isHoliday: boolean;
  notes: string;
}

interface FiledRecord {
  _id: string;
  guardId: string;
  siteId: string;
  date: string;
  totalHours: number;
  isHoliday: boolean;
  notes?: string;
  source: string;
}

interface PeriodInfo {
  status: string;
  year: number;
  month: number;
  monthName: string;
}

interface SaveResult {
  created: number;
  skipped: number;
  details: { guardId: string; date: string; status: string; reason?: string }[];
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function formatDateShort(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function GuardManualFiling() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [filedRecords, setFiledRecords] = useState<FiledRecord[]>([]);
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [search, setSearch] = useState('');

  const daysInMonth = getDaysInMonth(year, month);
  const isLocked = period?.status === 'LOCKED' || period?.status === 'CLOSED';
  const key = (guardId: string, day: number) => `${guardId}-${day}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [guardsRes, periodsRes] = await Promise.all([
        api.get('/guards'),
        api.get('/finance/periods').catch(() => null),
      ]);

      const allGuards = (guardsRes.data.data || guardsRes.data || [])
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
            siteName: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId.siteName : (a.siteName || 'Unassigned'),
            siteId: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId._id : a.siteId,
            assignmentRole: a.role || 'GUARD',
          }))
        );

      setGuards(allGuards);

      // Lock state comes from the payroll period (same source the backend enforces).
      // Fall back to the staff-attendance summary for roles without period-read permission.
      let p: PeriodInfo | null = null;
      const periodList = periodsRes?.data?.data || [];
      const match = periodList.find((x: any) => x.year === year && x.month === month);
      if (match) {
        p = { status: match.status, year: match.year, month: match.month, monthName: match.monthName };
      } else {
        const staffRes = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`).catch(() => ({ data: { data: null } }));
        const sp = staffRes.data.data;
        if (sp) p = { status: sp.status, year: sp.year, month: sp.month, monthName: sp.monthName };
      }
      setPeriod(p);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const attendanceRes = await api.get(`/attendance?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { data: [] } }));
      const records = (attendanceRes.data.data || attendanceRes.data || [])
        .filter((r: any) => r.source === 'MANUAL_ENTRY' || r.source === 'MANUAL_ENTRY_CORRECTION')
        .map((r: any) => ({
          _id: r._id,
          guardId: r.guardId?._id || r.guardId,
          siteId: r.siteId?._id || r.siteId,
          date: r.date,
          totalHours: r.totalHours,
          isHoliday: r.isHoliday,
          notes: r.notes,
          source: r.source,
        }));

      setFiledRecords(records);

      const initial: Record<string, DayEntry> = {};
      allGuards.forEach((g: Guard) => {
        for (let d = 1; d <= daysInMonth; d++) {
          const existing = records.find((r: FiledRecord) => {
            const rDate = new Date(r.date);
            return r.guardId === g.employeeId && rDate.getFullYear() === year && rDate.getMonth() === month - 1 && rDate.getDate() === d;
          });
          if (existing) {
            initial[key(g.employeeId, d)] = { hoursWorked: existing.totalHours, isHoliday: existing.isHoliday, notes: existing.notes || '' };
          } else {
            initial[key(g.employeeId, d)] = { hoursWorked: 0, isHoliday: false, notes: '' };
          }
        }
      });
      setEntries(initial);
    } catch (e) {
      console.error('Failed to load guard manual filing data:', e);
    } finally {
      setLoading(false);
    }
  }, [year, month, daysInMonth]);

  useEffect(() => { load(); }, [load]);

  const grouped = guards.reduce<Record<string, Guard[]>>((acc, g) => {
    const site = g.siteName;
    if (!acc[site]) acc[site] = [];
    acc[site].push(g);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).reduce<Record<string, Guard[]>>((acc, [siteName, siteGuards]) => {
    if (!search.trim()) { acc[siteName] = siteGuards; return acc; }
    const q = search.toLowerCase();
    const filtered = siteGuards.filter((g) => {
      const name = `${g.firstName} ${g.lastName}`.toLowerCase();
      const code = g.employeeCode.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
    if (filtered.length > 0) acc[siteName] = filtered;
    return acc;
  }, {});

  const setEntry = (guardId: string, day: number, field: keyof DayEntry, value: any) => {
    setEntries((prev) => ({ ...prev, [key(guardId, day)]: { ...prev[key(guardId, day)], [field]: value } }));
  };

  const handleSubmitAll = async () => {
    const bulkEntries: any[] = [];
    const clientSkipped: { guardId: string; date: string; status: string; reason?: string }[] = [];
    Object.entries(entries).forEach(([k, entry]) => {
      if (entry.hoursWorked > 0) {
        const [guardId, dayStr] = [k.substring(0, k.lastIndexOf('-')), parseInt(k.substring(k.lastIndexOf('-') + 1))];
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayStr).padStart(2, '0')}`;
        const guard = guards.find((g) => g.employeeId === guardId);
        if (guard?.siteId) {
          bulkEntries.push({ guardId, siteId: guard.siteId, date: dateStr, hoursWorked: entry.hoursWorked, isHoliday: entry.isHoliday, notes: entry.notes || undefined });
        } else if (guard) {
          clientSkipped.push({ guardId: `${guard.firstName} ${guard.lastName} (${guard.employeeCode})`, date: dateStr, status: 'skipped', reason: 'Guard has no site assignment' });
        }
      }
    });

    if (bulkEntries.length === 0 && clientSkipped.length === 0) {
      alert('No hours to submit. Enter hours in at least one day cell.');
      return;
    }

    if (bulkEntries.length > 0 && !confirm(`Submit ${bulkEntries.length} attendance entries? Entries for existing dates will be skipped.`)) return;

    setSaving(true);
    try {
      if (bulkEntries.length === 0) {
        setSaveResult({ created: 0, skipped: clientSkipped.length, details: clientSkipped });
        return;
      }
      const fallbackSiteId = bulkEntries[0]?.siteId || '';
      const res = await api.post('/attendance/manual-entry/bulk', { siteId: fallbackSiteId, entries: bulkEntries });
      const data = res.data.data || {};
      const serverSkipped = (data.results || [])
        .filter((r: any) => r.status === 'skipped')
        .map((r: any) => ({ guardId: r.guardId, date: r.date, status: 'skipped' as const, reason: r.reason }));
      setSaveResult({
        created: data.summary?.created ?? 0,
        skipped: (data.summary?.skipped ?? 0) + clientSkipped.length,
        details: [...clientSkipped, ...serverSkipped],
      });
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkFill = (siteName: string, hours: number) => {
    if (isLocked) return;
    if (!confirm(`Fill ${hours}h for all guards at ${siteName} for the entire month?`)) return;
    const siteGuards = grouped[siteName] || [];
    setEntries((prev) => {
      const updated = { ...prev };
      siteGuards.forEach((g) => {
        for (let d = 1; d <= daysInMonth; d++) {
          const existing = filedRecords.find((r) => {
            const rDate = new Date(r.date);
            return r.guardId === g.employeeId && rDate.getFullYear() === year && rDate.getMonth() === month - 1 && rDate.getDate() === d;
          });
          if (!existing) {
            updated[key(g.employeeId, d)] = { hoursWorked: hours, isHoliday: false, notes: '' };
          }
        }
      });
      return updated;
    });
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); } };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); } };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Guard Attendance Filing</h2>
            <p className="text-sm text-gray-500 mt-0.5">File guard hours from paper site logs (hours-based, 0-24 per day)</p>
          </div>
          <div className="flex items-center gap-3">
            {isLocked ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Period Locked
                </span>
                <span className="text-xs text-red-600">Read-only</span>
              </>
            ) : (
              <button
                onClick={handleSubmitAll}
                disabled={saving || isLocked}
                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? 'Submitting...' : 'Submit All Hours'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Log Panel */}
      {!isLocked && (
        <QuickLogPanel onLogged={load} />
      )}

      {/* Month Nav + Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h2>
          <button onClick={nextMonth} className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          {period && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold ${
              period.status === 'LOCKED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${period.status === 'LOCKED' ? 'bg-red-500' : 'bg-emerald-500'}`} />
              {period.status}
            </span>
          )}
        </div>
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search guard name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">&times;</button>
          )}
        </div>
      </div>

      {/* Attendance Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No contracted guards with site assignments found.</p>
          <p className="text-xs text-gray-400 mt-1">Guards need CONTRACTED status and an active shift assignment before hours can be filed.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(filteredGrouped).map(([siteName, siteGuards]) => (
            <div key={siteName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-bold text-gray-900">{siteName}</h3>
                  <span className="text-xs text-gray-400">({siteGuards.length} guard{siteGuards.length !== 1 ? 's' : ''})</span>
                </div>
                {!isLocked && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleBulkFill(siteName, 12)} className="px-3 py-1 text-[10px] bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 font-medium transition-colors">
                      Fill 12h
                    </button>
                    <button onClick={() => handleBulkFill(siteName, 24)} className="px-3 py-1 text-[10px] bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 font-medium transition-colors">
                      Fill 24h
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="text-[11px] border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left px-3 py-2 border font-medium sticky left-0 bg-gray-50/50 z-10 min-w-[140px]">Guard</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayOfWeek = new Date(year, month - 1, i + 1).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <th key={i} className={`px-1 py-2 border text-center font-medium min-w-[38px] ${isWeekend ? 'bg-gray-100/50' : ''}`}>
                            {i + 1}
                            <div className="text-[9px] text-gray-400 font-normal">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dayOfWeek]}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-2 py-2 border font-medium text-center bg-gray-50/50 min-w-[40px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteGuards.map((guard) => {
                      let total = 0;
                      for (let d = 1; d <= daysInMonth; d++) {
                        total += entries[key(guard.employeeId, d)]?.hoursWorked || 0;
                      }
                      return (
                        <tr key={guard.employeeId} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1 border sticky left-0 bg-white z-10">
                            <div className="font-medium text-xs text-gray-900">{guard.firstName} {guard.lastName}</div>
                            <div className="text-[9px] text-gray-400">{guard.employeeCode}</div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const k = key(guard.employeeId, day);
                            const entry = entries[k] || { hoursWorked: 0, isHoliday: false, notes: '' };
                            const dayOfWeek = new Date(year, month - 1, day).getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isFiled = filedRecords.some((r) => {
                              const rDate = new Date(r.date);
                              return r.guardId === guard.employeeId && rDate.getFullYear() === year && rDate.getMonth() === month - 1 && rDate.getDate() === day;
                            });
                            return (
                              <td key={day} className={`px-0.5 py-0.5 border ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                {isFiled && !isLocked ? (
                                  <div
                                    className="w-full h-7 flex items-center justify-center text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                                    title={`Filed: ${entry.hoursWorked}h${entry.isHoliday ? ' (Holiday)' : ''}${entry.notes ? '\n' + entry.notes : ''}`}
                                    onClick={() => {
                                      if (confirm(`View filed entry for ${guard.firstName} ${guard.lastName} on ${formatDateShort(year, month, day)}.\nHours: ${entry.hoursWorked}h${entry.isHoliday ? '\nHoliday: Yes' : ''}${entry.notes ? '\nNotes: ' + entry.notes : ''}\n\nEdit this entry?`)) {
                                        const newHours = prompt('Update hours (0-24):', entry.hoursWorked.toString());
                                        if (newHours !== null) {
                                          const h = parseFloat(newHours);
                                          if (!isNaN(h) && h >= 0 && h <= 24) {
                                            const existingRecord = filedRecords.find((r) => {
                                              const rDate = new Date(r.date);
                                              return r.guardId === guard.employeeId && rDate.getFullYear() === year && rDate.getMonth() === month - 1 && rDate.getDate() === day;
                                            });
                                            if (existingRecord) {
                                              api.put(`/attendance/manual-entry/${existingRecord._id}`, { hoursWorked: h, reason: 'Operator correction' })
                                                .then(() => load())
                                                .catch((err: any) => alert(err.response?.data?.message || 'Failed to update'));
                                            }
                                          }
                                        }
                                      }
                                    }}
                                  >
                                    {entry.hoursWorked}h
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    max={24}
                                    step={0.5}
                                    value={entry.hoursWorked || ''}
                                    placeholder="0"
                                    disabled={isLocked}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setEntry(guard.employeeId, day, 'hoursWorked', isNaN(val) ? 0 : val);
                                    }}
                                    className="w-full h-7 text-center text-[10px] border-0 bg-transparent focus:ring-1 focus:ring-indigo-400 rounded-lg disabled:opacity-50 transition-all"
                                    title={`${guard.firstName} — ${formatDateShort(year, month, day)}`}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 border text-center font-bold text-xs bg-gray-50/50">
                            {total.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Result Toast */}
      {saveResult && (
        <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 max-w-sm z-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-900">Submission Result</h4>
            <button onClick={() => setSaveResult(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-600 font-semibold">{saveResult.created} created</span>
            <span className="text-amber-600 font-semibold">{saveResult.skipped} skipped</span>
          </div>
          {saveResult.details.filter((d) => d.status === 'skipped').length > 0 && (
            <div className="mt-2 text-[10px] text-gray-500 max-h-24 overflow-y-auto">
              {saveResult.details.filter((d) => d.status === 'skipped').map((d, i) => (
                <div key={i}>Skipped: {d.guardId} on {d.date} — {d.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
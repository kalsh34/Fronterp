import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

interface GuardAssignment {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  siteName: string;
  siteId: string;
}

interface AttendanceRecord {
  _id: string;
  guardId: string;
  siteId: string;
  date: string;
  totalHours: number;
  isHoliday: boolean;
  source: string;
  notes?: string;
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

export default function GuardAttendanceGrid() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [guards, setGuards] = useState<GuardAssignment[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [correctionModal, setCorrectionModal] = useState<{ record: AttendanceRecord; guardName: string; day: number } | null>(null);
  const [correctionHours, setCorrectionHours] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [guardsRes, attendanceRes] = await Promise.all([
        api.get('/guards'),
        api.get(`/attendance?startDate=${year}-${String(month).padStart(2, '0')}-01&endDate=${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`),
      ]);

      const allGuards = (guardsRes.data.data || [])
        .filter((g: any) => g.employee.status === 'CONTRACTED')
        .flatMap((g: any) =>
          (g.currentAssignments?.length > 0
            ? g.currentAssignments
            : [{ siteId: null, siteName: 'Unassigned' }]
          ).map((a: any) => ({
            employeeId: g.employee._id,
            employeeCode: g.employee.employeeCode,
            firstName: g.employee.firstName,
            lastName: g.employee.lastName,
            siteName: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId.siteName : 'Unassigned',
            siteId: (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId._id : a.siteId,
          }))
        );
      setGuards(allGuards);

      const siteMap = new Map<string, string>();
      allGuards.forEach((g: GuardAssignment) => {
        if (!siteMap.has(g.siteId)) siteMap.set(g.siteId, g.siteName);
      });
      setSites(Array.from(siteMap.entries()).map(([id, name]) => ({ id, name })));

      const allRecords = (attendanceRes.data.data || []).map((r: any) => ({
        _id: r._id,
        guardId: r.guardId?._id || r.guardId,
        siteId: r.siteId?._id || r.siteId,
        date: r.date,
        totalHours: r.totalHours,
        isHoliday: r.isHoliday,
        source: r.source,
        notes: r.notes,
      }));
      setRecords(allRecords);
    } catch (e) {
      console.error('Failed to load guard attendance grid:', e);
    } finally {
      setLoading(false);
    }
  }, [year, month, daysInMonth]);

  useEffect(() => { load(); }, [load]);

  const filteredGuards = guards.filter((g) => {
    if (siteFilter !== 'all' && g.siteId !== siteFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = `${g.firstName} ${g.lastName}`.toLowerCase();
      return name.includes(q) || g.employeeCode.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = filteredGuards.reduce<Record<string, GuardAssignment[]>>((acc, g) => {
    const site = g.siteName;
    if (!acc[site]) acc[site] = [];
    acc[site].push(g);
    return acc;
  }, {});

  const getRecordForDay = (guardId: string, day: number): AttendanceRecord | undefined => {
    return records.find((r) => {
      const d = new Date(r.date);
      return r.guardId === guardId && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    });
  };

  const handleCorrection = async () => {
    if (!correctionModal || !correctionHours || !correctionReason.trim()) return;
    const h = parseFloat(correctionHours);
    if (isNaN(h) || h < 0 || h > 24) {
      alert('Hours must be between 0 and 24');
      return;
    }
    setCorrecting(true);
    try {
      await api.put(`/attendance/manual-entry/${correctionModal.record._id}`, {
        hoursWorked: h,
        reason: correctionReason.trim(),
      });
      setCorrectionModal(null);
      setCorrectionHours('');
      setCorrectionReason('');
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to correct entry');
    } finally {
      setCorrecting(false);
    }
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); } };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); } };

  return (
    <div className="space-y-5">
      {/* Month Nav + Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              <option value="all">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search guard..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No guards with site assignments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([siteName, siteGuards]) => (
            <div key={siteName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  {siteName}
                  <span className="text-gray-400 font-normal ml-2">({siteGuards.length} guard{siteGuards.length !== 1 ? 's' : ''})</span>
                </h3>
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
                        const rec = getRecordForDay(guard.employeeId, d);
                        if (rec) total += rec.totalHours;
                      }
                      return (
                        <tr key={guard.employeeId} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1.5 border sticky left-0 bg-white z-10">
                            <div className="font-medium text-xs text-gray-900">{guard.firstName} {guard.lastName}</div>
                            <div className="text-[9px] text-gray-400">{guard.employeeCode}</div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const rec = getRecordForDay(guard.employeeId, day);
                            const dayOfWeek = new Date(year, month - 1, day).getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isFlagged = rec && rec.totalHours > 16;
                            return (
                              <td key={day} className={`px-0.5 py-0.5 border ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                {rec ? (
                                  <div
                                    className={`w-full h-7 flex items-center justify-center text-[10px] font-medium rounded-lg cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all ${
                                      isFlagged
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                    title={`${rec.totalHours}h — ${rec.source}${rec.isHoliday ? ' (Holiday)' : ''}${rec.notes ? '\n' + rec.notes : ''}\nClick to correct`}
                                    onClick={() => setCorrectionModal({
                                      record: rec,
                                      guardName: `${guard.firstName} ${guard.lastName}`,
                                      day,
                                    })}
                                  >
                                    {rec.totalHours}h
                                  </div>
                                ) : (
                                  <div className="w-full h-7 flex items-center justify-center text-[10px] text-gray-300" />
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

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-lg bg-emerald-50 border border-emerald-200 inline-block" />
          Filed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-lg bg-amber-50 border border-amber-200 inline-block" />
          Flagged (&gt;16h)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-lg border border-gray-200 inline-block" />
          Not filed
        </div>
      </div>

      {/* Correction Modal */}
      {correctionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Correct Attendance Entry</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-bold text-gray-900">{correctionModal.guardName}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {formatDateShort(year, month, correctionModal.day)} — {MONTH_NAMES[month - 1]} {year}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Current: {correctionModal.record.totalHours}h | Source: {correctionModal.record.source}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked (0-24)</label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={correctionHours}
                onChange={(e) => setCorrectionHours(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Correction *</label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Enter reason..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setCorrectionModal(null)} className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleCorrection} disabled={!correctionHours || !correctionReason.trim() || correcting}
                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">
                {correcting ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
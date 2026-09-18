import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, StaffAttendanceStatus } from '../../types';
import { Card, Badge, PageHeader, LoadingSpinner, Modal } from '../../components/ui';
import { Button } from '../../components/ui';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

interface DayCell {
  day: number;
  status: StaffAttendanceStatus | null;
  isWeekend: boolean;
}

interface GridRow {
  employee: Employee;
  days: DayCell[];
}

interface PeriodInfo {
  _id: string;
  year: number;
  month: number;
  monthName: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface StatusCounts {
  PRESENT: number;
  ABSENT: number;
  PAID_LEAVE: number;
  UNPAID_LEAVE: number;
  SICK_LEAVE: number;
  HALF_DAY: number;
  HOLIDAY: number;
  WEEKEND: number;
}

interface StaffSummary {
  employee: Employee;
  counts: StatusCounts;
  payableDays: number;
  totalDaysInMonth: number;
}

const STATUS_OPTIONS = [
  { value: StaffAttendanceStatus.PRESENT, label: 'P', color: 'bg-green-500 text-white', title: 'Present' },
  { value: StaffAttendanceStatus.ABSENT, label: 'A', color: 'bg-red-500 text-white', title: 'Absent' },
  { value: StaffAttendanceStatus.PAID_LEAVE, label: 'PL', color: 'bg-blue-500 text-white', title: 'Paid Leave' },
  { value: StaffAttendanceStatus.UNPAID_LEAVE, label: 'UL', color: 'bg-orange-400 text-white', title: 'Unpaid Leave' },
  { value: StaffAttendanceStatus.SICK_LEAVE, label: 'SL', color: 'bg-yellow-400 text-black', title: 'Sick Leave' },
  { value: StaffAttendanceStatus.HALF_DAY, label: 'HD', color: 'bg-purple-500 text-white', title: 'Half Day' },
  { value: StaffAttendanceStatus.HOLIDAY, label: 'H', color: 'bg-blue-300 text-blue-900', title: 'Holiday' },
  { value: StaffAttendanceStatus.WEEKEND, label: 'W', color: 'bg-gray-300 text-gray-700', title: 'Weekend' },
];

const STATUS_MAP = new Map(STATUS_OPTIONS.map((s) => [s.value, s]));

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function StaffAttendancePage() {
  const { user } = useAuthStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState<{ employeeId: string; day: number } | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'summary' | 'periods'>('grid');
  const [summaries, setSummaries] = useState<StaffSummary[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkDay, setBulkDay] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const isHR = user?.role === UserRole.HR_ADMIN || user?.role === UserRole.FINANCE_OFFICER;
  const isFinance = user?.role === UserRole.FINANCE_OFFICER;
  const isAdmin = user?.role === UserRole.SUPER_ADMIN;
  const canManage = isHR || isAdmin;
  const isLocked = period?.status === 'LOCKED';

  const loadGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-attendance/grid?year=${year}&month=${month}`);
      const data = res.data.data;
      setGrid(data.grid || []);
      setPeriod(data.period || null);
      setDaysInMonth(data.daysInMonth || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`);
      setSummaries(res.data.data.summaries || []);
    } catch (e) { console.error(e); }
  }, [year, month]);

  const loadPeriods = useCallback(async () => {
    try {
      const res = await api.get('/staff-attendance/periods');
      setPeriods(res.data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadGrid(); loadSummary(); setSelectedEmployees(new Set()); setBulkDay(null); }, [loadGrid, loadSummary]);
  useEffect(() => { if (view === 'periods') loadPeriods(); }, [view, loadPeriods]);

  const filteredGrid = grid.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${row.employee.firstName} ${row.employee.lastName}`.toLowerCase();
    const code = row.employee.employeeCode.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const filteredSummary = summaries.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase();
    const code = s.employee.employeeCode.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handleStatusChange = async (employeeId: string, day: number, status: StaffAttendanceStatus) => {
    if (isLocked) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/day', { employeeId, year, month, dayOfMonth: day, status });
      setShowMenu(null);
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleBulkMark = async (status: StaffAttendanceStatus, day?: number) => {
    if (isLocked) return;
    const targetDay = day || showMenu?.day;
    if (!targetDay) return;
    if (!confirm(`Mark ALL staff as ${status} for day ${targetDay}?`)) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/bulk', { year, month, dayOfMonth: targetDay, status });
      setShowMenu(null);
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleQuickMarkAll = async (status: StaffAttendanceStatus) => {
    if (isLocked) return;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const targetDay = isCurrentMonth ? today.getDate() : 1;
    if (!confirm(`Mark ALL staff as ${status} for day ${targetDay} (${monthNames[month - 1]} ${targetDay})?`)) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/bulk', { year, month, dayOfMonth: targetDay, status });
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleBulkApplyStatus = async (status: StaffAttendanceStatus) => {
    if (isLocked || !bulkDay || selectedEmployees.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selectedEmployees).map((employeeId) =>
          api.post('/staff-attendance/day', { employeeId, year, month, dayOfMonth: bulkDay, status })
        )
      );
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to apply status'); }
    finally { setBulkSaving(false); }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredGrid.map((r) => r.employee._id);
    setSelectedEmployees((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allIds);
    });
  };

  const allSelected = filteredGrid.length > 0 && filteredGrid.every((r) => selectedEmployees.has(r.employee._id));

  const handleLock = async () => {
    if (!lockReason.trim()) return alert('Please enter a reason');
    try {
      await api.post('/staff-attendance/lock', { year, month, reason: lockReason });
      setLockReason('');
      await loadGrid();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleUnlock = async () => {
    const reason = prompt('Reason for unlocking:');
    if (!reason) return;
    try {
      await api.post('/staff-attendance/unlock', { year, month, reason });
      await loadGrid();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleLockPeriod = async (targetYear: number, targetMonth: number) => {
    const reason = prompt(`Reason for locking ${monthNames[targetMonth - 1]} ${targetYear}:`);
    if (!reason) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/lock', { year: targetYear, month: targetMonth, reason });
      await loadPeriods();
      if (targetYear === year && targetMonth === month) await loadGrid();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUnlockPeriod = async (targetYear: number, targetMonth: number) => {
    const reason = prompt(`Reason for unlocking ${monthNames[targetMonth - 1]} ${targetYear}:`);
    if (!reason) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/unlock', { year: targetYear, month: targetMonth, reason });
      await loadPeriods();
      if (targetYear === year && targetMonth === month) await loadGrid();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePrint = () => {
    const printContent = document.getElementById(view === 'grid' ? 'attendance-grid' : 'summary-table');
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const title = view === 'grid' ? 'Staff Attendance' : 'Staff Attendance Summary';
    win.document.write(`
      <html><head><title>${title} - ${monthNames[month-1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #666; margin-top: 0; }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
        th { background: #f3f4f6; font-weight: 600; }
        .staff-name { text-align: left; font-weight: 500; min-width: 120px; }
        .weekend { background: #f3f4f6; }
        .p { background: #22c55e; color: white; }
        .a { background: #ef4444; color: white; }
        .pl { background: #3b82f6; color: white; }
        .ul { background: #fb923c; color: white; }
        .sl { background: #facc15; color: #111; }
        .hd { background: #a855f7; color: white; }
        .h { background: #93c5fd; color: #1e3a5f; }
        .w { background: #d1d5db; color: #374151; }
        .summary { font-weight: 700; }
        .legend { margin-top: 12px; font-size: 10px; }
        .legend span { margin-right: 12px; }
        .no-print { display: none; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>Vital Security PLC — ${title}</h1>
      <h2>${monthNames[month-1]} ${year}</h2>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Staff Attendance"
        subtitle={view === 'grid' ? 'Mark daily status for office staff' : view === 'summary' ? 'Payable days summary for payroll' : 'Lock/unlock attendance periods'}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrint}>
              Print
            </Button>
            {canManage && !isLocked && view === 'grid' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleQuickMarkAll(StaffAttendanceStatus.PRESENT)} disabled={saving}>
                  Mark All Present Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleQuickMarkAll(StaffAttendanceStatus.ABSENT)} disabled={saving}>
                  Mark All Absent Today
                </Button>
              </>
            )}
            {isFinance || isAdmin ? (
              isLocked ? (
                <>
                  <Badge variant="danger">Locked</Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={handleUnlock}>Unlock</Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Lock reason..."
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    className="border rounded px-3 py-1 text-sm w-48"
                  />
                  <Button size="sm" onClick={handleLock} disabled={!lockReason.trim()}>
                    Lock Period
                  </Button>
                </div>
              )
            ) : null}
          </div>
        }
      />

      {/* View Toggle + Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={prevMonth}>&larr; Prev</Button>
          <h2 className="text-lg font-semibold">{monthNames[month - 1]} {year}</h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>Next &rarr;</Button>
          {isLocked && <span className="text-xs text-red-600 ml-2">Read-only (period locked)</span>}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('summary')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Summary
          </button>
          {(isFinance || isAdmin) && (
            <button
              onClick={() => setView('periods')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'periods' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Periods
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              &times;
            </button>
          )}
        </div>
        {search && <p className="text-xs text-gray-500 mt-1">{view === 'periods' ? `${periods.length} periods` : `Showing ${view === 'grid' ? filteredGrid.length : filteredSummary.length} of ${view === 'grid' ? grid.length : summaries.length} staff`}</p>}
      </div>

      {/* Bulk Action Toolbar */}
      {!loading && view === 'grid' && canManage && !isLocked && selectedEmployees.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedEmployees.size} staff selected
          </span>
          {bulkDay ? (
            <>
              <span className="text-xs text-blue-600">for Day {bulkDay}</span>
              <button onClick={() => setBulkDay(null)} className="text-xs text-blue-500 hover:text-blue-700 underline">clear day</button>
            </>
          ) : (
            <span className="text-xs text-blue-500 italic">Click a day number in the header to select a target day</span>
          )}
          <div className="flex-1" />
          {STATUS_OPTIONS.filter((s) => s.value !== StaffAttendanceStatus.WEEKEND).map((s) => (
            <button
              key={s.value}
              onClick={() => handleBulkApplyStatus(s.value)}
              disabled={!bulkDay || bulkSaving}
              className={`px-2.5 py-1 rounded text-xs font-medium ${s.color} hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity`}
              title={bulkDay ? `Mark selected as ${s.title} for day ${bulkDay}` : 'Select a day first'}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading && <LoadingSpinner text="Loading attendance data..." />}

      {!loading && view === 'grid' && (
        <div id="attendance-grid">
          <Card padding={false} className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {canManage && !isLocked && (
                    <th className="px-2 py-2 border sticky left-0 bg-gray-50 z-20 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left px-3 py-2 border font-medium sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                    {canManage && !isLocked ? '' : ''}
                    Staff
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dayOfWeek = new Date(year, month - 1, dayNum).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isSelected = bulkDay === dayNum;
                    return (
                      <th
                        key={i}
                        onClick={() => { if (canManage && !isLocked) setBulkDay(isSelected ? null : dayNum); }}
                        className={`px-2 py-2 border text-center font-medium min-w-[36px] ${
                          isWeekend ? 'bg-gray-200' : ''
                        } ${isSelected ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : canManage && !isLocked ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        title={canManage && !isLocked ? (isSelected ? `Day ${dayNum} selected — click to deselect` : `Click to select day ${dayNum} for bulk action`) : ''}
                      >
                        {dayNum}
                        <div className={`text-[10px] font-normal ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                          {['Su','Mo','Tu','We','Th','Fr','Sa'][dayOfWeek]}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 border font-medium text-center bg-gray-50">P</th>
                  <th className="px-3 py-2 border font-medium text-center bg-gray-50">A</th>
                  <th className="px-3 py-2 border font-medium text-center bg-gray-50">PL</th>
                  <th className="px-3 py-2 border font-medium text-center bg-gray-50">HD</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrid.map((row) => {
                  const counts = { PRESENT: 0, ABSENT: 0, PAID_LEAVE: 0, HALF_DAY: 0 };
                  row.days.forEach((d) => {
                    if (d.status === 'PRESENT') counts.PRESENT++;
                    else if (d.status === 'ABSENT') counts.ABSENT++;
                    else if (d.status === 'PAID_LEAVE') counts.PAID_LEAVE++;
                    else if (d.status === 'HALF_DAY') counts.HALF_DAY++;
                  });
                  const isChecked = selectedEmployees.has(row.employee._id);
                  return (
                    <tr key={row.employee._id} className={`hover:bg-gray-50 ${isChecked ? 'bg-blue-50/50' : ''}`}>
                      {canManage && !isLocked && (
                        <td className="px-2 py-1.5 border sticky left-0 bg-white z-10 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEmployeeSelection(row.employee._id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-3 py-1.5 border sticky left-0 bg-white z-10">
                        <div className="font-medium text-sm">{row.employee.firstName} {row.employee.lastName}</div>
                        <div className="text-[10px] text-gray-400">{row.employee.employeeCode}</div>
                      </td>
                      {row.days.map((d) => {
                        const statusInfo = d.status ? STATUS_MAP.get(d.status) : null;
                        return (
                          <td
                            key={d.day}
                            className={`px-1 py-1 border text-center cursor-pointer hover:ring-2 hover:ring-blue-400 ${
                              d.isWeekend ? 'bg-gray-100' : ''
                            } ${statusInfo?.color || 'bg-white'}`}
                            onClick={() => {
                              if (!isLocked && canManage) setShowMenu({ employeeId: row.employee._id, day: d.day });
                            }}
                            title={statusInfo?.title || `Day ${d.day}`}
                          >
                            {statusInfo?.label || ''}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 border text-center font-semibold">{counts.PRESENT}</td>
                      <td className="px-2 py-1.5 border text-center font-semibold text-red-600">{counts.ABSENT}</td>
                      <td className="px-2 py-1.5 border text-center font-semibold text-blue-600">{counts.PAID_LEAVE}</td>
                      <td className="px-2 py-1.5 border text-center font-semibold text-purple-600">{counts.HALF_DAY}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredGrid.length === 0 && <div className="p-8 text-center text-gray-500">{search ? 'No matching staff' : 'No staff found'}</div>}
          </Card>

          <div className="mt-4 flex flex-wrap gap-3 text-xs print:hidden">
            {STATUS_OPTIONS.map((s) => (
              <div key={s.value} className="flex items-center gap-1">
                <span className={`w-4 h-4 rounded ${s.color} flex items-center justify-center text-[8px] font-bold`}>{s.label}</span>
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'summary' && (
        <div id="summary-table">
          <Card padding={false} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Days</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Present</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-red-700 uppercase tracking-wider">Absent</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Paid Leave</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Unpaid</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-yellow-700 uppercase tracking-wider">Sick</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">Half Day</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Weekend</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">Holiday</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider bg-green-50">Payable Days</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSummary.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-500">{search ? 'No matching staff' : 'No data'}</td></tr>
                ) : filteredSummary.map((s) => (
                  <tr key={s.employee._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-left">
                      <p className="font-medium text-gray-900">{s.employee.firstName} {s.employee.lastName}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs font-mono">{s.employee.employeeCode}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{s.totalDaysInMonth}</td>
                    <td className="px-3 py-3 text-center font-medium">{s.counts.PRESENT}</td>
                    <td className="px-3 py-3 text-center font-medium text-red-600">{s.counts.ABSENT}</td>
                    <td className="px-3 py-3 text-center font-medium text-blue-600">{s.counts.PAID_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-orange-600">{s.counts.UNPAID_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-yellow-600">{s.counts.SICK_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-purple-600">{s.counts.HALF_DAY}</td>
                    <td className="px-3 py-3 text-center font-medium text-gray-600">{s.counts.WEEKEND}</td>
                    <td className="px-3 py-3 text-center font-medium text-blue-500">{s.counts.HOLIDAY}</td>
                    <td className="px-3 py-3 text-center bg-green-50">
                      <span className="text-lg font-bold text-green-700">{s.payableDays}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Payroll Formula</h3>
            <p className="text-sm text-blue-700 font-mono">
              payable_days = PRESENT + HOLIDAY + PAID_LEAVE + SICK_LEAVE + WEEKEND + (HALF_DAY × 0.5)
            </p>
            <p className="text-xs text-blue-600 mt-2">
              ABSENT and UNPAID_LEAVE do not count toward payable days. WEEKEND counts as payable.
            </p>
          </div>
        </div>
      )}

      {!loading && view === 'periods' && (
        <div className="space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Payroll Periods</h3>
              <p className="text-xs text-gray-500 mt-0.5">Lock or unlock attendance periods for payroll processing</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">End Date</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                        No periods found. Periods are created automatically when attendance is filed.
                      </td>
                    </tr>
                  ) : periods.map((p) => {
                    const isCurrent = p.year === year && p.month === month;
                    const statusColor = p.status === 'LOCKED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : p.status === 'CLOSED'
                      ? 'bg-gray-50 text-gray-600 border-gray-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    return (
                      <tr key={`${p.year}-${p.month}`} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            <span className={`font-medium text-gray-900 ${isCurrent ? 'text-blue-700' : ''}`}>
                              {p.monthName} {p.year}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-sm text-gray-600">
                          {new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-center text-sm text-gray-600">
                          {new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {p.status === 'LOCKED' ? (
                            <button
                              onClick={() => handleUnlockPeriod(p.year, p.month)}
                              disabled={saving}
                              className="text-xs font-medium text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50"
                            >
                              Unlock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLockPeriod(p.year, p.month)}
                              disabled={saving}
                              className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                            >
                              Lock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">About Period Locking</h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li><strong>OPEN</strong> — Attendance can be filed and edited normally.</li>
              <li><strong>LOCKED</strong> — Attendance is frozen. No new entries or edits allowed. Required before payroll can be generated.</li>
              <li><strong>CLOSED</strong> — Payroll has been finalized. Only SUPER_ADMIN can reopen.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showMenu && (
        <Modal open={!!showMenu} onClose={() => setShowMenu(null)} title={`Day ${showMenu.day} — Select status`}>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(showMenu.employeeId, showMenu.day, s.value)}
                disabled={saving}
                className={`px-2 py-1.5 rounded text-xs font-medium text-left ${s.color} hover:opacity-80 disabled:opacity-50`}
              >
                {s.label} — {s.title}
              </button>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 pt-2 border-t">
              <p className="text-[10px] text-gray-400 mb-1.5">Bulk mark ALL staff for day {showMenu.day} as:</p>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleBulkMark(s.value)}
                    disabled={saving}
                    className="px-2 py-0.5 bg-gray-100 rounded text-[10px] hover:bg-gray-200 disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

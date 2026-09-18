import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../lib/api';

interface GuardAssignment {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  siteName: string;
  siteId: string;
}

interface SessionEntry {
  id: string;
  guardName: string;
  siteName: string;
  hours: number;
  date: string;
  filedAt: string;
  isHoliday: boolean;
  flagged?: string;
}

interface Props {
  onLogged?: () => void;
}

export default function QuickLogPanel({ onLogged }: Props) {
  const [guards, setGuards] = useState<GuardAssignment[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GuardAssignment | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [flagged, setFlagged] = useState('');

  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/guards').then((res) => {
      const all = (res.data.data || []).filter((g: any) => g.employee.status === 'CONTRACTED');
      const flat: GuardAssignment[] = [];
      for (const g of all) {
        const assignments = g.currentAssignments?.length > 0 ? g.currentAssignments : [{ siteId: null, siteName: 'Unassigned' }];
        for (const a of assignments) {
          const siteName = (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId.siteName : 'Unassigned';
          const siteId = (typeof a.siteId === 'object' && a.siteId !== null) ? a.siteId._id : a.siteId;
          flat.push({
            employeeId: g.employee._id,
            employeeCode: g.employee.employeeCode,
            firstName: g.employee.firstName,
            lastName: g.employee.lastName,
            siteName,
            siteId,
          });
        }
      }
      setGuards(flat);
    }).catch(() => {});
  }, []);

  const filtered = query.trim()
    ? guards.filter((g) => {
        const q = query.toLowerCase();
        const name = `${g.firstName} ${g.lastName}`.toLowerCase();
        return name.includes(q) || g.employeeCode.toLowerCase().includes(q);
      })
    : [];

  useEffect(() => { setHighlightIdx(0); }, [query]);

  const selectGuard = useCallback((g: GuardAssignment) => {
    setSelected(g);
    setQuery(`${g.firstName} ${g.lastName}`);
    setShowDropdown(false);
    setError('');
    setFlagged('');
    setTimeout(() => hoursRef.current?.focus(), 50);
  }, []);

  const reset = useCallback(() => {
    setSelected(null);
    setQuery('');
    setDate(today);
    setHours('');
    setIsHoliday(false);
    setNotes('');
    setError('');
    setFlagged('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [today]);

  const submit = useCallback(async () => {
    if (!selected) return;
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0 || h > 24) {
      setError('Hours must be between 0 and 24');
      hoursRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError('');
    setFlagged('');
    try {
      const res = await api.post('/attendance/manual-entry', {
        guardId: selected.employeeId,
        siteId: selected.siteId,
        date,
        hoursWorked: h,
        isHoliday,
        notes: notes.trim() || undefined,
      });
      const entry: SessionEntry = {
        id: Date.now().toString(),
        guardName: `${selected.firstName} ${selected.lastName}`,
        siteName: selected.siteName,
        hours: h,
        date,
        filedAt: new Date().toISOString(),
        isHoliday,
        flagged: res.data.flagged,
      };
      setSessionLog((prev) => [entry, ...prev]);
      if (res.data.flagged) setFlagged(res.data.flagged);
      reset();
      onLogged?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to log attendance');
      hoursRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [selected, date, hours, isHoliday, notes, reset, onLogged]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      selectGuard(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Quick Attendance Log</h3>
          <p className="text-xs text-gray-400">Log one guard at a time — Enter to submit, auto-focus back to search</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 items-end">
        {/* Guard Search */}
        <div className="col-span-12 sm:col-span-3 relative">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Guard</label>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setShowDropdown(true);
              setError('');
            }}
            onFocus={() => { if (filtered.length > 0) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name or code..."
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {filtered.slice(0, 10).map((g, i) => (
                <button
                  key={`${g.employeeId}-${g.siteId}`}
                  onMouseDown={() => selectGuard(g)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 flex items-center justify-between transition-colors ${
                    i === highlightIdx ? 'bg-indigo-50' : ''
                  }`}
                >
                  <span className="font-medium text-gray-900">{g.firstName} {g.lastName}</span>
                  <span className="text-[11px] text-gray-400">{g.employeeCode} — {g.siteName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Site (read-only) */}
        <div className="col-span-12 sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Site</label>
          <div className="h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-600 flex items-center truncate">
            {selected ? selected.siteName : '—'}
          </div>
        </div>

        {/* Date */}
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Hours */}
        <div className="col-span-6 sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Hours *</label>
          <input
            ref={hoursRef}
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={handleHoursKeyDown}
            placeholder="0"
            disabled={!selected}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-50 transition-all"
          />
        </div>

        {/* Holiday */}
        <div className="col-span-4 sm:col-span-1 flex items-center gap-2 pb-0.5">
          <input
            type="checkbox"
            id="holiday-check"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            disabled={!selected}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="holiday-check" className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Holiday</label>
        </div>

        {/* Notes */}
        <div className="col-span-8 sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
          <input
            ref={notesRef}
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="Optional"
            disabled={!selected}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-50 transition-all"
          />
        </div>
      </div>

      {/* Errors / Flags */}
      {error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}
      {flagged && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          {flagged}
        </div>
      )}

      {/* Submit */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!selected || !hours || submitting}
          className="h-10 px-6 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-200"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {submitting ? 'Logging...' : 'Log Entry'}
        </button>
        <span className="text-[11px] text-gray-400">Press Enter from Hours field to submit</span>
      </div>

      {/* Session Log */}
      {sessionLog.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Logged This Session ({sessionLog.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {sessionLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 font-medium">{entry.guardName}</span>
                  <span className="text-gray-400">{entry.siteName}</span>
                  {entry.isHoliday && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-violet-100 text-violet-700 font-medium">Holiday</span>
                  )}
                  {entry.flagged && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-medium">Flagged</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="font-medium">{entry.hours}h</span>
                  <span>{entry.date}</span>
                  <span className="text-gray-400 font-mono">{new Date(entry.filedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
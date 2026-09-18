import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';

interface Site {
  _id: string;
  siteName: string;
  siteCode: string;
  location: string;
}

interface AttendanceRecord {
  _id: string;
  siteId: Site;
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  isHoliday: boolean;
  relievesAttendanceId?: string;
}

interface SiteAssignment {
  _id: string;
  siteId: Site;
  hourlyRate: number;
  standardMonthlyHours: number;
}

interface OnDutyGuard {
  _id: string;
  employeeId: string;
  guardName: string;
  clockIn: string;
  totalHours: number;
}

interface CoverageInfo {
  siteId: string;
  siteName: string;
  required: number;
  onDuty: number;
  status: 'understaffed' | 'at-capacity' | 'overstaffed';
}

type ViewTab = 'shift' | 'history';

type ShiftState = 'loading' | 'active' | 'completed' | 'idle';

interface Toast {
  id: number;
  message: string;
  sub?: string;
}

interface ConfirmDialog {
  title: string;
  message: string;
  onConfirm: () => void;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(records: AttendanceRecord[]) {
  const groups: Record<string, AttendanceRecord[]> = {};
  for (const r of records) {
    const key = new Date(r.date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

export default function MyShiftPage() {
  const navigate = useNavigate();

  const [view, setView] = useState<ViewTab>('shift');
  const [sites, setSites] = useState<SiteAssignment[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [guardId, setGuardId] = useState('');

  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);

  const elapsedRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, sub?: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, sub }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const meRes = await api.get('/auth/me');
      const empId = meRes.data.data.employeeId;
      setGuardId(empId);

      const [sitesRes, todayRes] = await Promise.all([
        api.get(`/guards/${empId}/sites`),
        api.get(`/attendance/today/${empId}`),
      ]);
      setSites(sitesRes.data.data || []);
      setTodayRecord(todayRes.data.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!guardId) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/attendance/recent/${guardId}?days=${historyDays}`);
      setHistoryRecords(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, [guardId, historyDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (view === 'history' && guardId) {
      loadHistory();
    }
  }, [view, guardId, loadHistory]);

  useEffect(() => {
    if (!todayRecord || todayRecord.clockOut) {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
      return;
    }
    const tick = () => {
      const start = new Date(todayRecord.clockIn).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    elapsedRef.current = window.setInterval(tick, 1000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [todayRecord]);

  const handleClockIn = async (relievesAttendanceId?: string) => {
    if (!selectedSite) return alert('Please select a site');
    const siteName = sites.find((s) => s.siteId?._id === selectedSite)?.siteId?.siteName || 'this site';
    setConfirm({
      title: 'Start Shift',
      message: relievesAttendanceId
        ? `Start your shift at ${siteName}? You will be recorded as relieving the predecessor.`
        : `Start your shift at ${siteName}? (No predecessor selected — gap coverage)`,
      onConfirm: async () => {
        setConfirm(null);
        setClocking(true);
        try {
          const body: Record<string, string> = { guardId, siteId: selectedSite };
          if (relievesAttendanceId) body.relievesAttendanceId = relievesAttendanceId;
          const res = await api.post('/attendance/clock-in', body);
          const record = res.data.data;
          const time = new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          showToast('Clocked in successfully', `${siteName} at ${time}`);
          await loadData();
          setSelectedSite('');
        } catch (e: any) {
          alert(e.response?.data?.message || 'Failed to clock in');
        } finally {
          setClocking(false);
        }
      },
    });
  };

  const handleClockOut = async () => {
    setConfirm({
      title: 'End Shift',
      message: 'End your current shift now?',
      onConfirm: async () => {
        setConfirm(null);
        setClocking(true);
        try {
          const res = await api.post(`/attendance/clock-out/${guardId}`);
          const record = res.data.data;
          const time = new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const hours = record.totalHours.toFixed(1);
          showToast('Clocked out successfully', `${time} - ${hours}h worked`);
          await loadData();
        } catch (e: any) {
          alert(e.response?.data?.message || 'Failed to clock out');
        } finally {
          setClocking(false);
        }
      },
    });
  };

  const handleBackToIdle = () => {
    setTodayRecord(null);
  };

  const shiftState: ShiftState = loading ? 'loading' : todayRecord && !todayRecord.clockOut ? 'active' : todayRecord && todayRecord.clockOut ? 'completed' : 'idle';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col">
        <Header
          view={view}
          onTabChange={setView}
          onProfile={() => navigate('/my-profile')}
        />

        <div className="flex-1 px-4 pb-6">
          {view === 'shift' ? (
            <ShiftView
              state={shiftState}
              todayRecord={todayRecord}
              sites={sites}
              selectedSite={selectedSite}
              onSelectSite={setSelectedSite}
              elapsed={elapsed}
              clocking={clocking}
              guardId={guardId}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onBackToIdle={handleBackToIdle}
              onGoToHistory={() => setView('history')}
            />
          ) : (
            <HistoryView
              records={historyRecords}
              loading={historyLoading}
              days={historyDays}
              onChangeDays={(d) => { setHistoryDays(d); }}
            />
          )}
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        {confirm && <ConfirmDialogComp title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      </div>
    </div>
  );
}

function Header({ view, onTabChange, onProfile }: { view: ViewTab; onTabChange: (v: ViewTab) => void; onProfile: () => void }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-10 bg-gray-100 pt-3 pb-2 px-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">My Shift</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onProfile}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Profile
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
      <div className="flex bg-gray-200 rounded-lg p-0.5">
        <button
          onClick={() => onTabChange('shift')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            view === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Shift
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            view === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>
    </div>
  );
}

function ShiftView({ state, todayRecord, sites, selectedSite, onSelectSite, elapsed, clocking, guardId, onClockIn, onClockOut, onBackToIdle, onGoToHistory }: {
  state: ShiftState;
  todayRecord: AttendanceRecord | null;
  sites: SiteAssignment[];
  selectedSite: string;
  onSelectSite: (v: string) => void;
  elapsed: string;
  clocking: boolean;
  guardId: string;
  onClockIn: (relievesAttendanceId?: string) => void;
  onClockOut: () => void;
  onBackToIdle: () => void;
  onGoToHistory: () => void;
}) {
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (state === 'active') {
    return <ActiveView record={todayRecord!} elapsed={elapsed} clocking={clocking} onClockOut={onClockOut} />;
  }

  if (state === 'completed') {
    return <CompletedView record={todayRecord!} onBackToIdle={onBackToIdle} onGoToHistory={onGoToHistory} />;
  }

  return <IdleView sites={sites} selectedSite={selectedSite} onSelectSite={onSelectSite} clocking={clocking} guardId={guardId} onClockIn={onClockIn} />;
}

function IdleView({ sites, selectedSite, onSelectSite, clocking, guardId, onClockIn }: {
  sites: SiteAssignment[];
  selectedSite: string;
  onSelectSite: (v: string) => void;
  clocking: boolean;
  guardId: string;
  onClockIn: (relievesAttendanceId?: string) => void;
}) {
  const [onDutyGuards, setOnDutyGuards] = useState<OnDutyGuard[]>([]);
  const [coverage, setCoverage] = useState<CoverageInfo | null>(null);
  const [selectedPredecessor, setSelectedPredecessor] = useState<string | null>(null);
  const [fetchingOnDuty, setFetchingOnDuty] = useState(false);
  const [showPredecessorModal, setShowPredecessorModal] = useState(false);

  useEffect(() => {
    if (!selectedSite) {
      setOnDutyGuards([]);
      setCoverage(null);
      setSelectedPredecessor(null);
      return;
    }

    let cancelled = false;

    async function fetchOnDutyAndCoverage() {
      setFetchingOnDuty(true);
      try {
        const [onDutyRes, coverageRes] = await Promise.all([
          api.get(`/attendance/on-duty/${selectedSite}`),
          api.get(`/attendance/coverage-alerts/${selectedSite}`),
        ]);
        if (!cancelled) {
          const guards: OnDutyGuard[] = (onDutyRes.data.data || []).filter(
            (g: OnDutyGuard) => g.employeeId !== guardId
          );
          setOnDutyGuards(guards);
          setCoverage(coverageRes.data.data || null);
          setSelectedPredecessor(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setOnDutyGuards([]);
          setCoverage(null);
        }
      } finally {
        if (!cancelled) setFetchingOnDuty(false);
      }
    }

    fetchOnDutyAndCoverage();
    return () => { cancelled = true; };
  }, [selectedSite, guardId]);

  const handleClockInClick = () => {
    if (!selectedSite) return;
    if (onDutyGuards.length > 0) {
      setShowPredecessorModal(true);
    } else {
      onClockIn(undefined);
    }
  };

  const handleConfirmPredecessor = () => {
    setShowPredecessorModal(false);
    onClockIn(selectedPredecessor || undefined);
  };

  const handleSkipPredecessor = () => {
    setShowPredecessorModal(false);
    onClockIn(undefined);
  };

  const coverageBanner = (() => {
    if (!coverage) return null;
    if (coverage.status === 'understaffed') {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Understaffed</p>
            <p className="text-xs text-amber-600">{coverage.onDuty}/{coverage.required} guards on duty</p>
          </div>
        </div>
      );
    }
    if (coverage.status === 'overstaffed') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">Overstaffed</p>
            <p className="text-xs text-blue-600">{coverage.onDuty}/{coverage.required} guards on duty</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">At Capacity</p>
          <p className="text-xs text-green-600">{coverage.onDuty}/{coverage.required} guards on duty</p>
        </div>
      </div>
    );
  })();

  return (
    <div className="mt-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Ready to Clock In</h2>
        <p className="text-sm text-gray-500 mt-1">Select your site and start your shift</p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Select Site</CardTitle>
        </CardHeader>
        {sites.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No site assignments yet</p>
          </div>
        ) : (
          <select
            value={selectedSite}
            onChange={(e) => onSelectSite(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            <option value="">Choose a site...</option>
            {sites.map((s) => (
              <option key={s.siteId?._id} value={s.siteId?._id}>
                {s.siteId?.siteName} ({s.siteId?.siteCode})
              </option>
            ))}
          </select>
        )}
      </Card>

      {selectedSite && coverageBanner}

      {selectedSite && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Relief Chain</CardTitle>
          </CardHeader>
          {fetchingOnDuty ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : onDutyGuards.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-1">No guards currently on duty</p>
              <p className="text-xs text-gray-400">Clock-in will proceed as gap coverage</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-3">Select who you are relieving:</p>
              <div className="space-y-2">
                {onDutyGuards.map((g) => (
                  <button
                    key={g._id}
                    onClick={() => setSelectedPredecessor(g._id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedPredecessor === g._id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedPredecessor === g._id ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <span className={`text-sm font-bold ${
                            selectedPredecessor === g._id ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {g.guardName?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{g.guardName || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">Clocked in at {formatTime(g.clockIn)}</p>
                        </div>
                      </div>
                      {selectedPredecessor === g._id && (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Button
        onClick={handleClockInClick}
        disabled={clocking || !selectedSite || sites.length === 0}
        className="w-full py-4 text-lg font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg"
        variant="primary"
      >
        {clocking ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Starting...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Clock In
          </span>
        )}
      </Button>

      <Modal open={showPredecessorModal} onClose={() => setShowPredecessorModal(false)} title="Select Predecessor">
        <p className="text-sm text-gray-600 mb-4">
          {selectedPredecessor
            ? 'You will be recorded as relieving this guard. Their shift ends when you clock in.'
            : 'No predecessor selected. Your shift will start as gap coverage.'}
        </p>
        {onDutyGuards.length > 0 && (
          <div className="space-y-2 mb-4">
            {onDutyGuards.map((g) => (
              <button
                key={g._id}
                onClick={() => setSelectedPredecessor(g._id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedPredecessor === g._id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedPredecessor === g._id ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      selectedPredecessor === g._id ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {g.guardName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{g.guardName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">On duty since {formatTime(g.clockIn)}</p>
                  </div>
                  {selectedPredecessor === g._id && (
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={handleSkipPredecessor} variant="secondary" className="flex-1">
            Skip (Gap)
          </Button>
          <Button onClick={handleConfirmPredecessor} variant="primary" className="flex-1">
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ActiveView({ record, elapsed, clocking, onClockOut }: {
  record: AttendanceRecord;
  elapsed: string;
  clocking: boolean;
  onClockOut: () => void;
}) {
  return (
    <div className="mt-2">
      <div className="bg-blue-600 text-white rounded-2xl p-5 mb-4 shadow-lg shadow-blue-600/20">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
          </span>
          <span className="text-sm font-medium text-blue-100 uppercase tracking-wide">On Duty</span>
        </div>

        <h2 className="text-2xl font-bold mb-1">{record.siteId?.siteName || 'Unknown Site'}</h2>
        <p className="text-sm text-blue-200 mb-5">{record.siteId?.siteCode}</p>

        <div className="bg-blue-700/50 rounded-xl p-4 mb-4">
          <p className="text-xs text-blue-200 uppercase tracking-wide mb-1">Clock In</p>
          <p className="text-lg font-mono font-semibold">{formatTime(record.clockIn)}</p>
        </div>

        {record.relievesAttendanceId && (
          <div className="bg-blue-700/50 rounded-xl p-4 mb-4">
            <p className="text-xs text-blue-200 uppercase tracking-wide mb-1">Relieving</p>
            <p className="text-sm font-medium">Relief chain active</p>
          </div>
        )}

        <div className="text-center py-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide mb-1">Elapsed</p>
          <p className="text-5xl font-bold font-mono tracking-tight">{elapsed}</p>
        </div>
      </div>

      <Button
        onClick={onClockOut}
        disabled={clocking}
        className="w-full py-4 text-lg font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg"
        variant="danger"
      >
        {clocking ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Ending...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
            Clock Out
          </span>
        )}
      </Button>
    </div>
  );
}

function CompletedView({ record, onBackToIdle, onGoToHistory }: {
  record: AttendanceRecord;
  onBackToIdle: () => void;
  onGoToHistory: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onBackToIdle, 8000);
    return () => clearTimeout(t);
  }, [onBackToIdle]);

  return (
    <div className="mt-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Shift Completed</h2>
        <p className="text-sm text-gray-500 mt-1">Great work today!</p>
      </div>

      <Card className="mb-4">
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Completed
          </span>
        </div>

        <h3 className="text-lg font-semibold text-center text-gray-900 mb-4">{record.siteId?.siteName || 'Unknown Site'}</h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Clock In</p>
            <p className="text-sm font-mono font-semibold text-gray-900">{formatTime(record.clockIn)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Clock Out</p>
            <p className="text-sm font-mono font-semibold text-gray-900">{record.clockOut ? formatTime(record.clockOut) : '--'}</p>
          </div>
        </div>

        <div className="text-center py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Hours</p>
          <p className="text-4xl font-bold text-blue-600 font-mono">{record.totalHours.toFixed(1)}<span className="text-lg font-medium">h</span></p>
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={onBackToIdle}
          className="w-full py-3.5 text-base font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg"
          variant="primary"
        >
          Start Next Shift
        </Button>
        <Button
          onClick={onGoToHistory}
          className="w-full py-3 text-sm font-medium rounded-2xl active:scale-[0.98] transition-all"
          variant="secondary"
        >
          View Shift History
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">Auto-returning in 8 seconds...</p>
    </div>
  );
}

function HistoryView({ records, loading, days, onChangeDays }: {
  records: AttendanceRecord[];
  loading: boolean;
  days: number;
  onChangeDays: (d: number) => void;
}) {
  const grouped = groupByDate(records);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Shift History</h2>
        <select
          value={days}
          onChange={(e) => onChangeDays(parseInt(e.target.value))}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-gray-500 text-sm">No shifts in the last {days} days</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateKey, dayRecords]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {formatDate(dayRecords[0].date)}
                </h3>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">
                  {dayRecords.reduce((sum, r) => sum + r.totalHours, 0).toFixed(1)}h total
                </span>
              </div>
              <div className="space-y-2">
                {dayRecords.map((record) => (
                  <div key={record._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{record.siteId?.siteName || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{record.siteId?.siteCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.relievesAttendanceId && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">Relief</span>
                        )}
                        {record.isHoliday && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">Holiday</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
                          {formatTime(record.clockIn)}
                          {record.clockOut && ` - ${formatTime(record.clockOut)}`}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 font-mono">{record.totalHours.toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmDialogComp({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={true} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="secondary" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="primary" className="flex-1">
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="pointer-events-auto bg-white border border-green-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 cursor-pointer animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t.message}</p>
            {t.sub && <p className="text-xs text-gray-500 mt-0.5">{t.sub}</p>}
          </div>
          <button className="text-gray-400 hover:text-gray-600 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

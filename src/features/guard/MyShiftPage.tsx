import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Shield,
  ShieldCheck,
  Radio,
  Clock,
  Square,
  Users,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react';

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
      const to = new Date().toISOString();
      const from = new Date(Date.now() - historyDays * 86400000).toISOString();
      const res = await api.get(`/attendance/guard/${guardId}`, {
        params: { from, to, limit: 100 },
      });
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
    if (!selectedSite) return alert('Please select an assigned post site');
    const siteName = sites.find((s) => s.siteId?._id === selectedSite)?.siteId?.siteName || 'this site';
    setConfirm({
      title: 'COMMENCE SHIFT DUTY',
      message: relievesAttendanceId
        ? `Initiate duty rotation at ${siteName}? Official relief timestamp will be registered.`
        : `Initiate active shift at ${siteName}? (Proceeding as gap clearance coverage)`,
      onConfirm: async () => {
        setConfirm(null);
        setClocking(true);
        try {
          const body: Record<string, string> = { guardId, siteId: selectedSite };
          if (relievesAttendanceId) body.relievesAttendanceId = relievesAttendanceId;
          const res = await api.post('/attendance/clock-in', body);
          const record = res.data.data;
          const time = new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          showToast('Shift Active', `${siteName} logged at ${time}`);
          await loadData();
          setSelectedSite('');
        } catch (e: any) {
          alert(e.response?.data?.message || 'Failed to initiate clock in');
        } finally {
          setClocking(false);
        }
      },
    });
  };

  const handleClockOut = async () => {
    setConfirm({
      title: 'TERMINATE SHIFT DUTY',
      message: 'Cease active duty and lock final patrol timestamp for this post?',
      onConfirm: async () => {
        setConfirm(null);
        setClocking(true);
        try {
          const res = await api.post(`/attendance/clock-out/${guardId}`);
          const record = res.data.data;
          const time = new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const hours = record.totalHours.toFixed(1);
          showToast('Shift Terminated', `${time} — ${hours}h logged`);
          await loadData();
        } catch (e: any) {
          alert(e.response?.data?.message || 'Failed to log clock out');
        } finally {
          setClocking(false);
        }
      },
    });
  };

  const handleBackToIdle = () => {
    setTodayRecord(null);
  };

  const shiftState: ShiftState = loading
    ? 'loading'
    : todayRecord && !todayRecord.clockOut
    ? 'active'
    : todayRecord && todayRecord.clockOut
    ? 'completed'
    : 'idle';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col bg-slate-900 border-x border-slate-800 shadow-2xl">
        <Header
          view={view}
          onTabChange={setView}
          onProfile={() => navigate('/my-profile')}
        />

        <div className="flex-1 px-4 py-5 overflow-y-auto">
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
        {confirm && (
          <ConfirmDialogComp
            title={confirm.title}
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    </div>
  );
}

function Header({ view, onTabChange, onProfile }: { view: ViewTab; onTabChange: (v: ViewTab) => void; onProfile: () => void }) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800 px-4 pt-3.5 pb-3 shadow-md">
      {/* Top Identity Strip */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center p-1 shadow-md border border-blue-400/40">
            <img src="/logo.png" alt="Vital" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-white uppercase font-mono">
                VITAL TACTICAL
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> PATROL TERMINAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium font-mono">Officer ID: {user?.employeeId || 'GUARD-SEC'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onProfile}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            title="Profile"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-slate-800"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Military Segmented Control Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => onTabChange('shift')}
          className={`flex-1 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            view === 'shift'
              ? 'bg-blue-600 text-white shadow-md border border-blue-400/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Active Shift</span>
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            view === 'history'
              ? 'bg-blue-600 text-white shadow-md border border-blue-400/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Duty Log</span>
        </button>
      </div>
    </div>
  );
}

function ShiftView({
  state,
  todayRecord,
  sites,
  selectedSite,
  onSelectSite,
  elapsed,
  clocking,
  guardId,
  onClockIn,
  onClockOut,
  onBackToIdle,
  onGoToHistory,
}: {
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
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-mono">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>INITIALIZING TERMINAL SECURE TELEMETRY...</p>
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

  return (
    <IdleView
      sites={sites}
      selectedSite={selectedSite}
      onSelectSite={onSelectSite}
      clocking={clocking}
      guardId={guardId}
      onClockIn={onClockIn}
    />
  );
}

function IdleView({
  sites,
  selectedSite,
  onSelectSite,
  clocking,
  guardId,
  onClockIn,
}: {
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

  // High-Contrast Military Site Status Chips
  const coverageBanner = (() => {
    if (!coverage) return null;
    if (coverage.status === 'understaffed') {
      return (
        <div className="bg-amber-950/40 border-2 border-amber-500/70 rounded-2xl p-4 mb-4 flex items-center gap-3.5 text-amber-200 shadow-lg shadow-amber-950/30">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-center shrink-0 text-amber-400">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0 font-mono">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                [ POST ALERT: UNDERSTAFFED ]
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 text-amber-300">
                CRITICAL GAP
              </span>
            </div>
            <p className="text-xs text-amber-300/90 font-sans font-medium">
              Active Complement: <span className="font-mono font-bold text-white">{coverage.onDuty}</span> / <span className="font-mono font-bold text-white">{coverage.required}</span> guards stationed on perimeter.
            </p>
          </div>
        </div>
      );
    }
    if (coverage.status === 'overstaffed') {
      return (
        <div className="bg-blue-950/40 border-2 border-blue-500/70 rounded-2xl p-4 mb-4 flex items-center gap-3.5 text-blue-200 shadow-lg shadow-blue-950/30">
          <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/50 rounded-xl flex items-center justify-center shrink-0 text-blue-400">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0 font-mono">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                [ POST STATUS: REINFORCED ]
              </span>
              <span className="text-[10px] font-bold bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/40 text-blue-300">
                MAX COVERAGE
              </span>
            </div>
            <p className="text-xs text-blue-300/90 font-sans font-medium">
              Active Complement: <span className="font-mono font-bold text-white">{coverage.onDuty}</span> / <span className="font-mono font-bold text-white">{coverage.required}</span> guards on post.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-emerald-950/40 border-2 border-emerald-500/70 rounded-2xl p-4 mb-4 flex items-center gap-3.5 text-emerald-200 shadow-lg shadow-emerald-950/30">
        <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center justify-center shrink-0 text-emerald-400">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="flex-1 min-w-0 font-mono">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
              [ POST STATUS: SECURED ]
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300">
              OPTIMAL
            </span>
          </div>
          <p className="text-xs text-emerald-300/90 font-sans font-medium">
            Post Complement: <span className="font-mono font-bold text-white">{coverage.onDuty}</span> / <span className="font-mono font-bold text-white">{coverage.required}</span> guards verified on duty.
          </p>
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-4">
      {/* Ready Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
        <div className="w-14 h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Radio className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-lg font-black font-mono tracking-wider text-white uppercase">
          PERIMETER CLOCK-IN
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Select authorized post assignment to establish patrol telemetry.
        </p>
      </div>

      {/* Select Site Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <label className="block text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400 mb-2">
          Designated Site Location
        </label>
        {sites.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            NO AUTHORIZED POST ASSIGNMENTS LOCATED
          </div>
        ) : (
          <select
            value={selectedSite}
            onChange={(e) => onSelectSite(e.target.value)}
            className="w-full border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-semibold bg-slate-950 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">-- Choose Assigned Post Location --</option>
            {sites.map((s) => (
              <option key={s.siteId?._id} value={s.siteId?._id}>
                {s.siteId?.siteName} ({s.siteId?.siteCode})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Status Chip */}
      {selectedSite && coverageBanner}

      {/* Relief Chain if guards on duty */}
      {selectedSite && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
              Shift Handover &amp; Relief Chain
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          {fetchingOnDuty ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
              Scanning on-duty roster...
            </div>
          ) : onDutyGuards.length === 0 ? (
            <div className="text-center py-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <p className="font-bold text-slate-300 font-mono mb-0.5">PERIMETER VACANT</p>
              <p className="text-slate-500">Clock-in will initiate as primary gap clearance.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">Select officer you are relieving on post:</p>
              {onDutyGuards.map((g) => (
                <button
                  key={g._id}
                  onClick={() => setSelectedPredecessor(g._id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                    selectedPredecessor === g._id
                      ? 'border-blue-500 bg-blue-950/60 shadow-md text-white'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm text-blue-400">
                      {g.guardName?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white font-mono">{g.guardName}</p>
                      <p className="text-[11px] text-slate-400 font-sans">On duty since {formatTime(g.clockIn)}</p>
                    </div>
                  </div>
                  {selectedPredecessor === g._id && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-600 text-white uppercase">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Military Grade Clock-In Button */}
      <button
        onClick={handleClockInClick}
        disabled={clocking || !selectedSite || sites.length === 0}
        className="w-full py-4.5 px-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-40 text-white font-black font-mono tracking-widest uppercase rounded-2xl shadow-xl shadow-blue-950/60 border-2 border-blue-400 ring-4 ring-blue-600/30 transition-all flex items-center justify-center gap-3 text-base cursor-pointer"
      >
        {clocking ? (
          <span className="flex items-center justify-center gap-2.5">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            INITIALIZING SHIFT TELEMETRY...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2.5">
            <Radio className="w-5 h-5 animate-pulse" />
            <span>[ INITIATE SHIFT / CLOCK IN ]</span>
          </span>
        )}
      </button>

      {/* Relief Modal */}
      <Modal open={showPredecessorModal} onClose={() => setShowPredecessorModal(false)} title="CONFIRM POST RELIEF">
        <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
          {selectedPredecessor
            ? 'You are relieving the selected officer. Their shift duty will be closed automatically when your clock-in is registered.'
            : 'No predecessor officer selected. This deployment will be logged as gap clearance.'}
        </p>

        {onDutyGuards.length > 0 && (
          <div className="space-y-2 mb-5">
            {onDutyGuards.map((g) => (
              <button
                key={g._id}
                onClick={() => setSelectedPredecessor(g._id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                  selectedPredecessor === g._id
                    ? 'border-blue-500 bg-blue-950/60 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
                    {g.guardName?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono text-white">{g.guardName}</p>
                    <p className="text-[10px] text-slate-400 font-sans">Duty started {formatTime(g.clockIn)}</p>
                  </div>
                </div>
                {selectedPredecessor === g._id && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSkipPredecessor} variant="secondary" className="flex-1 text-xs font-mono font-bold">
            Gap Coverage
          </Button>
          <Button onClick={handleConfirmPredecessor} variant="primary" className="flex-1 text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500">
            Confirm Relief
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ActiveView({
  record,
  elapsed,
  clocking,
  onClockOut,
}: {
  record: AttendanceRecord;
  elapsed: string;
  clocking: boolean;
  onClockOut: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tactical Active HUD Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl border-2 border-blue-500/50 relative overflow-hidden">
        {/* Ambient tactical lighting */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              TACTICAL SHIFT ACTIVE
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 uppercase">
            PATROL LOG ON
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
          {record.siteId?.siteName || 'Perimeter Guard Post'}
        </h2>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-mono font-bold text-blue-400 bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800">
            POST ID: {record.siteId?.siteCode || 'SITE-SEC'}
          </span>
          <span className="text-xs text-slate-400 font-sans">{record.siteId?.location || 'Assigned Zone'}</span>
        </div>

        {/* High-Visibility Digital Monospace Elapsed Clock */}
        <div className="bg-slate-950/90 rounded-2xl p-5 mb-5 border border-slate-800 text-center shadow-inner">
          <p className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-1">
            RECORDED SHIFT ELAPSED TIME
          </p>
          <p className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            {elapsed}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2 font-mono">
          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">OFFICIAL CLOCK IN</p>
            <p className="text-sm font-bold text-white">{formatTime(record.clockIn)}</p>
          </div>
          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">RELIEF HANDOVER</p>
            <p className="text-sm font-bold text-blue-400">
              {record.relievesAttendanceId ? 'Verified Handover' : 'Gap Clearance'}
            </p>
          </div>
        </div>
      </div>

      {/* Military Grade Clock Out CTA */}
      <button
        onClick={onClockOut}
        disabled={clocking}
        className="w-full py-4.5 px-6 bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-[0.98] disabled:opacity-40 text-white font-black font-mono tracking-widest uppercase rounded-2xl shadow-xl shadow-rose-950/50 border-2 border-rose-400 ring-4 ring-rose-600/30 transition-all flex items-center justify-center gap-3 text-base cursor-pointer"
      >
        {clocking ? (
          <span className="flex items-center justify-center gap-2.5">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            FINALIZING LOG...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2.5">
            <Square className="w-5 h-5" />
            <span>[ CEASE DUTY / SECURE CLOCK-OUT ]</span>
          </span>
        )}
      </button>
    </div>
  );
}

function CompletedView({
  record,
  onBackToIdle,
  onGoToHistory,
}: {
  record: AttendanceRecord;
  onBackToIdle: () => void;
  onGoToHistory: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onBackToIdle, 8000);
    return () => clearTimeout(t);
  }, [onBackToIdle]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-emerald-950/60 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-black font-mono tracking-wide text-white uppercase">
          DUTY CYCLE COMPLETE
        </h2>
        <p className="text-xs text-slate-400 mt-1">Official patrol records synchronized to central ERP.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-base font-bold text-center text-white mb-4">
          {record.siteId?.siteName || 'Perimeter Site'}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4 font-mono">
          <div className="bg-slate-950 rounded-xl p-3 text-center border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Clock In</p>
            <p className="text-sm font-bold text-white">{formatTime(record.clockIn)}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 text-center border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Clock Out</p>
            <p className="text-sm font-bold text-white">{record.clockOut ? formatTime(record.clockOut) : '--'}</p>
          </div>
        </div>

        <div className="text-center py-4 border-t border-slate-800 font-mono">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Duty Duration</p>
          <p className="text-4xl font-black text-blue-400">{record.totalHours.toFixed(1)}<span className="text-lg">h</span></p>
        </div>
      </div>

      <div className="space-y-3 font-mono">
        <button
          onClick={onBackToIdle}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
        >
          [ COMMENCE NEXT POST ]
        </button>
        <button
          onClick={onGoToHistory}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-slate-700"
        >
          View Duty Archives
        </button>
      </div>
      <p className="text-[11px] text-slate-500 text-center font-mono">Auto-returning to ready state in 8s...</p>
    </div>
  );
}

function HistoryView({
  records,
  loading,
  days,
  onChangeDays,
}: {
  records: AttendanceRecord[];
  loading: boolean;
  days: number;
  onChangeDays: (d: number) => void;
}) {
  const grouped = groupByDate(records);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h2 className="text-sm font-bold font-mono tracking-wider text-white uppercase">DUTY ARCHIVES</h2>
        <select
          value={days}
          onChange={(e) => onChangeDays(parseInt(e.target.value))}
          className="text-xs font-mono font-semibold border border-slate-700 rounded-lg px-2.5 py-1 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-xs text-slate-400 font-mono">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          RETRIEVING DUTY TIMESTAMPS...
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 text-xs font-mono">
          NO PATROL LOGS RECORDED IN THE LAST {days} DAYS
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateKey, dayRecords]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2 font-mono">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  {formatDate(dayRecords[0].date)}
                </span>
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] text-blue-400 font-bold">
                  {dayRecords.reduce((sum, r) => sum + r.totalHours, 0).toFixed(1)}h logged
                </span>
              </div>
              <div className="space-y-2">
                {dayRecords.map((record) => (
                  <div key={record._id} className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-white font-mono">{record.siteId?.siteName || 'Designated Post'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{record.siteId?.siteCode}</p>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        {record.relievesAttendanceId && (
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-500/40 text-[10px] rounded-md font-bold">
                            HANDOVER
                          </span>
                        )}
                        {record.isHoliday && (
                          <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-500/40 text-[10px] rounded-md font-bold">
                            HOLIDAY
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>{formatTime(record.clockIn)} → {record.clockOut ? formatTime(record.clockOut) : 'ACTIVE'}</span>
                      <span className="text-sm font-bold text-white">{record.totalHours.toFixed(1)}h</span>
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

function ConfirmDialogComp({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={true} onClose={onCancel} title={title}>
      <p className="text-xs text-slate-300 mb-6 font-sans leading-relaxed">{message}</p>
      <div className="flex gap-3 font-mono">
        <Button onClick={onCancel} variant="secondary" className="flex-1 text-xs font-bold">
          Abort
        </Button>
        <Button onClick={onConfirm} variant="primary" className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-500">
          Confirm Execution
        </Button>
      </div>
    </Modal>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none font-mono">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="pointer-events-auto bg-slate-900 border-2 border-emerald-500/60 text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 cursor-pointer animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white tracking-wider">{t.message}</p>
            {t.sub && <p className="text-[11px] text-slate-400 font-sans mt-0.5">{t.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

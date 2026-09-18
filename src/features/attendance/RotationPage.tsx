import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { PageHeader, LoadingSpinner } from '../../components/ui';
import { Button } from '../../components/ui';

interface Site { _id: string; siteName: string; siteCode: string; }
interface GuardData { employee: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string }; profile: any; currentAssignments: any[]; }
interface GuardPoolEntry { guardId: any; status: string; order: number; }

interface Rotation {
  _id: string; name: string; description?: string;
  siteId: Site | string;
  guardPool: GuardPoolEntry[];
  floaterPool: any[];
  shiftMode?: 'STANDARD_12H' | 'SINGLE_24H';
  dayShiftCount: number; nightShiftCount: number;
  dayStartTime: string; dayEndTime?: string; nightStartTime?: string; nightEndTime: string;
  startDate: string; status: string;
  lastGeneratedDate?: string; leaveCoverages: any[];
}

const SLOT_COLORS: Record<string, string> = {
  DAY: 'bg-yellow-400 text-yellow-900', NIGHT: 'bg-indigo-500 text-white', REST: 'bg-gray-200 text-gray-600',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', ACTIVE: 'bg-green-100 text-green-700', PAUSED: 'bg-amber-100 text-amber-700', ARCHIVED: 'bg-blue-100 text-blue-700',
};

function computeDayAssignments(rot: Rotation, date: Date) {
  const guards = rot.guardPool.filter((g: any) => g.status === 'ACTIVE').sort((a: any, b: any) => {
    const aKey = String(a.guardId?._id || a.guardId || '');
    const bKey = String(b.guardId?._id || b.guardId || '');
    return aKey.localeCompare(bKey);
  });
  const poolSize = guards.length;
  const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(1, rot.dayShiftCount) : rot.dayShiftCount + rot.nightShiftCount;
  if (poolSize === 0 || slotCountPerDay === 0) return [];

  const startDate = new Date(rot.startDate);
  startDate.setHours(0, 0, 0, 0);
  const dayOffset = Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / 86400000));
  const cycleOffset = (dayOffset * slotCountPerDay) % poolSize;
  const orderedPool = guards.map((_, index) => guards[(index + cycleOffset) % poolSize]);

  const assignments: { guard: any; slot: 'DAY' | 'NIGHT'; shiftTime: string; poolIndex: number }[] = [];
  const assignList = rot.shiftMode === 'SINGLE_24H'
    ? [{ slot: 'DAY' as const, count: Math.max(1, rot.dayShiftCount) }]
    : [
        { slot: 'DAY' as const, count: rot.dayShiftCount },
        { slot: 'NIGHT' as const, count: rot.nightShiftCount },
      ];

  let idx = 0;
  for (const section of assignList) {
    for (let i = 0; i < section.count; i += 1) {
      const g = orderedPool[idx];
      idx += 1;
      if (!g) continue;
      const shiftTime = section.slot === 'DAY'
        ? `${rot.dayStartTime || '06:00'}-${rot.dayEndTime || '18:00'}`
        : `${rot.nightStartTime || '18:00'}-${rot.nightEndTime || '06:00'}`;
      assignments.push({ guard: g.guardId, slot: section.slot, shiftTime, poolIndex: idx - 1 });
    }
  }

  return assignments;
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function getInitials(g: any) { return `${g.firstName?.[0] || ''}${g.lastName?.[0] || ''}`; }

export default function RotationPage() {
  const { user } = useAuthStore();
  const canManage = user?.role === UserRole.OPERATIONS || user?.role === UserRole.SUPER_ADMIN;

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [selected, setSelected] = useState<Rotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [allGuards, setAllGuards] = useState<GuardData[]>([]);

  const loadRotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/rotations?${params}`);
      setRotations(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  const loadFormData = useCallback(async () => {
    try {
      const [sRes, gRes] = await Promise.all([api.get('/sites'), api.get('/guards')]);
      setSites(sRes.data.data || []);
      setAllGuards(gRes.data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadRotations(); }, [loadRotations]);
  useEffect(() => { if (view !== 'list') loadFormData(); }, [view, loadFormData]);

  const loadDetail = async (id: string) => {
    try {
      const res = await api.get(`/rotations/${id}`);
      setSelected(res.data.data);
      setView('detail');
    } catch (e) { console.error(e); }
  };

  if (view === 'create') return <CreateWizard onBack={() => setView('list')} onCreated={(id) => { loadRotations(); loadDetail(id); }} sites={sites} allGuards={allGuards} />;
  if (view === 'detail' && selected) return <DetailView rotation={selected} onBack={() => { setView('list'); setSelected(null); loadRotations(); }} canManage={canManage} />;

  return (
    <div className="p-6">
      <PageHeader title="Rotations" subtitle="Manage guard rotation schedules"
        action={canManage ? <Button onClick={() => setView('create')}>New Rotation</Button> : undefined} />
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rotations..." className="flex-1 max-w-sm px-3 py-2 border rounded-lg text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ARCHIVED">Archived</option>
        </select>
      </div>
      {loading ? <LoadingSpinner text="Loading rotations..." /> : rotations.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">No rotations found</p>
          {canManage && <Button onClick={() => setView('create')}>Create First Rotation</Button>}
        </div>
      ) : (
        <div className="grid gap-4">
          {rotations.map((r) => {
            const ag = r.guardPool.filter((g: any) => g.status === 'ACTIVE').length;
            const siteName = typeof r.siteId === 'object' && r.siteId !== null ? (r.siteId as any).siteName : '';
            return (
              <div key={r._id} onClick={() => loadDetail(r._id)} className="bg-white rounded-xl border p-5 hover:shadow-md cursor-pointer transition-shadow">
                <div className="flex items-center justify-between">
                  <div><h3 className="font-semibold text-gray-900">{r.name}</h3><p className="text-sm text-gray-500 mt-0.5">{siteName || 'No site'}</p></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span>{ag} guards</span><span>{r.dayShiftCount} DAY · {r.nightShiftCount} NIGHT</span>
                  <span>{r.dayStartTime}–{r.nightEndTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateWizard({ onBack, onCreated, sites, allGuards }: {
  onBack: () => void; onCreated: (id: string) => void; sites: Site[]; allGuards: GuardData[];
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [siteId, setSiteId] = useState('');
  const [shiftMode, setShiftMode] = useState<'STANDARD_12H' | 'SINGLE_24H'>('STANDARD_12H');
  const [dayShiftCount, setDayShiftCount] = useState(2);
  const [nightShiftCount, setNightShiftCount] = useState(1);
  const [dayStartTime, setDayStartTime] = useState('06:00');
  const [dayEndTime, setDayEndTime] = useState('18:00');
  const [nightStartTime, setNightStartTime] = useState('18:00');
  const [nightEndTime, setNightEndTime] = useState('06:00');
  const [guardIds, setGuardIds] = useState<string[]>([]);
  const [floaterIds, setFloaterIds] = useState<string[]>([]);

  const slotCountPerDay = shiftMode === 'SINGLE_24H' ? Math.max(dayShiftCount, 1) : dayShiftCount + nightShiftCount;
  const poolSize = guardIds.length;

  const cycleInfo = useMemo(() => {
    if (poolSize === 0 || slotCountPerDay === 0) return null;
    const cycleDays = poolSize / gcd(poolSize, slotCountPerDay);
    const restGuards = poolSize - slotCountPerDay;
    const dutyPct = Math.round((slotCountPerDay / poolSize) * 100);
    return { cycleDays, restGuards, dutyPct };
  }, [poolSize, slotCountPerDay]);

  const toggleGuard = (id: string) => setGuardIds((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);
  const toggleFloater = (id: string) => setFloaterIds((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);

  const handleCreate = async () => {
    if (!name || !siteId || slotCountPerDay < 1 || poolSize < slotCountPerDay) { setError('Fill all required fields'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/rotations', {
        name, description, siteId, shiftMode, dayShiftCount, nightShiftCount,
        dayStartTime, dayEndTime, nightStartTime, nightEndTime, startDate,
      });
      const rotId = res.data.data._id;
      await api.post(`/rotations/${rotId}/guards`, { guardIds });
      if (floaterIds.length > 0) await api.post(`/rotations/${rotId}/floaters`, { guardIds: floaterIds });
      onCreated(rotId);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to create rotation'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Create Rotation" subtitle={`Step ${step} of 4`} action={<Button variant="ghost" onClick={onBack}>Back</Button>} />
      <div className="flex gap-2 mb-6">{[1, 2, 3, 4].map((s) => (<div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />))}</div>

      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., HQ Rotation" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Site *</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select site</option>{sites.map((s) => <option key={s._id} value={s._id}>{s.siteName}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex justify-end"><Button onClick={() => setStep(2)} disabled={!name || !siteId}>Next</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Shift Positions & Times</h2>
            <p className="text-xs text-gray-500 mt-1">Use a fair day/night pattern or a single 24-hour shift. Guard order does not change the cycle.</p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-3">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Shift type</span>
              <select value={shiftMode} onChange={(e) => setShiftMode(e.target.value as 'STANDARD_12H' | 'SINGLE_24H')} className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="STANDARD_12H">Standard 12-hour split (Day / Night)</option>
                <option value="SINGLE_24H">Single 24-hour shift</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50">
              <label className="block text-xs font-bold text-yellow-800 uppercase tracking-wider mb-2">Guards on DAY shift</label>
              <input type="number" min={0} value={dayShiftCount} onChange={(e) => setDayShiftCount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm font-medium bg-white" />
              <label className="block text-xs font-medium text-gray-500 mt-3 mb-1">Start Time</label>
              <input type="time" value={dayStartTime} onChange={(e) => setDayStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm bg-white" />
              <label className="block text-xs font-medium text-gray-500 mt-3 mb-1">End Time</label>
              <input type="time" value={dayEndTime} onChange={(e) => setDayEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm bg-white" />
            </div>
            {shiftMode === 'STANDARD_12H' && (
              <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50">
                <label className="block text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Guards on NIGHT shift</label>
                <input type="number" min={0} value={nightShiftCount} onChange={(e) => setNightShiftCount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-medium bg-white" />
                <label className="block text-xs font-medium text-gray-500 mt-3 mb-1">Start Time</label>
                <input type="time" value={nightStartTime} onChange={(e) => setNightStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-white" />
                <label className="block text-xs font-medium text-gray-500 mt-3 mb-1">End Time</label>
                <input type="time" value={nightEndTime} onChange={(e) => setNightEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-white" />
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Working Positions ({slotCountPerDay})</p>
            <div className="flex gap-1 mb-2 flex-wrap">
              {Array.from({ length: shiftMode === 'SINGLE_24H' ? Math.max(1, dayShiftCount) : dayShiftCount }).map((_, i) => <span key={`d${i}`} className="px-2 py-1 rounded text-xs font-bold bg-yellow-400 text-yellow-900">DAY</span>)}
              {shiftMode === 'STANDARD_12H' && Array.from({ length: nightShiftCount }).map((_, i) => <span key={`n${i}`} className="px-2 py-1 rounded text-xs font-bold bg-indigo-500 text-white">NIGHT</span>)}
            </div>
            {poolSize > 0 && (
              <div className="text-[11px] text-gray-500 space-y-0.5">
                <p>Each day: <strong>{shiftMode === 'SINGLE_24H' ? Math.max(1, dayShiftCount) : dayShiftCount}</strong> on DAY{shiftMode === 'STANDARD_12H' ? ` + <strong>${nightShiftCount}</strong> on NIGHT` : ''} + <strong>{Math.max(0, poolSize - slotCountPerDay)}</strong> on REST</p>
                <p>Each guard works <strong>{slotCountPerDay}</strong> out of every <strong>{poolSize}</strong> days ({Math.round((slotCountPerDay / poolSize) * 100)}% duty rate)</p>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl border p-6 space-y-5">
          <div><h2 className="text-lg font-semibold">Guard Pool</h2>
            <p className="text-xs text-gray-500 mt-0.5">The pool is scheduled fairly by the system; the manual order does not change the rotation pattern. Need at least {slotCountPerDay} guards.</p></div>
          {guardIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">{guardIds.length} guard{guardIds.length !== 1 ? 's' : ''} selected</p>
              <div className="flex flex-wrap gap-2">{guardIds.map((gid, idx) => {
                const g = allGuards.find((x) => x.employee._id === gid);
                if (!g) return null;
                return (<span key={gid} className="inline-flex items-center gap-1.5 bg-white border border-blue-200 rounded-full pl-1 pr-2 py-0.5 text-xs">
                  <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold bg-blue-500">{idx + 1}</span>
                  {g.employee.firstName} {g.employee.lastName}
                  <button onClick={() => toggleGuard(gid)} className="text-blue-400 hover:text-red-500 ml-0.5">&times;</button>
                </span>);
              })}</div>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
            {allGuards.filter((g) => g.employee.status === 'CONTRACTED' || g.employee.status === 'ACTIVE').length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No eligible guards found</div>
            ) : allGuards.filter((g) => g.employee.status === 'CONTRACTED' || g.employee.status === 'ACTIVE').map((g) => {
              const e = g.employee; const sel = guardIds.includes(e._id);
              return (<label key={e._id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={sel} onChange={() => toggleGuard(e._id)} className="w-4 h-4 rounded text-blue-600" />
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${sel ? 'bg-blue-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>{getInitials(e)}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{e.firstName} {e.lastName}</p><p className="text-xs text-gray-400">{e.employeeCode}</p></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${e.status === 'CONTRACTED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{e.status}</span>
              </label>);
            })}
          </div>
          <div>
            <h3 className="font-medium text-sm mb-1">Floater Pool (optional)</h3>
            <p className="text-xs text-gray-500 mb-2">Backup guards for leave coverage.</p>
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {allGuards.filter((g) => (g.employee.status === 'CONTRACTED' || g.employee.status === 'ACTIVE') && !guardIds.includes(g.employee._id)).map((g) => {
                const e = g.employee; const fl = floaterIds.includes(e._id);
                return (<label key={e._id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${fl ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}>
                  <input type="checkbox" checked={fl} onChange={() => toggleFloater(e._id)} className="w-3.5 h-3.5 rounded text-gray-600" />
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">{getInitials(e)}</span>
                  <span className="text-sm text-gray-700">{e.firstName} {e.lastName}</span>
                </label>);
              })}
            </div>
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Back</Button><Button onClick={() => setStep(4)} disabled={guardIds.length < slotCountPerDay}>Next</Button></div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Review & Create</h2>
          {cycleInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 font-medium">Fair cycle: {cycleInfo.cycleDays} days</p>
              <p className="text-xs text-green-600 mt-1">
                The system distributes duty fairly across the selected pool; selection order does not affect the schedule.
              </p>
            </div>
          )}
          {poolSize < slotCountPerDay && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">Need at least {slotCountPerDay} guards. Currently have {poolSize}.</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
            <p><strong>Pool:</strong> {poolSize} guards</p>
            <p><strong>Shifts:</strong> {shiftMode === 'SINGLE_24H' ? `${Math.max(1, dayShiftCount)} DAY only` : `${dayShiftCount} DAY + ${nightShiftCount} NIGHT = ${slotCountPerDay} per day`}</p>
            <p><strong>Times:</strong> {shiftMode === 'SINGLE_24H' ? `DAY ${dayStartTime}-${dayEndTime}` : `DAY ${dayStartTime}-${dayEndTime} · NIGHT ${nightStartTime}-${nightEndTime}`}</p>
            <p><strong>Site:</strong> {sites.find((s) => s._id === siteId)?.siteName}</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={handleCreate} disabled={saving || guardIds.length < slotCountPerDay}>{saving ? 'Creating...' : 'Create Rotation'}</Button></div>
        </div>
      )}
    </div>
  );
}

function DetailView({ rotation: rot, onBack, canManage }: { rotation: Rotation; onBack: () => void; canManage: boolean; }) {
  const [tab, setTab] = useState<'overview' | 'preview' | 'assignments' | 'leave'>('overview');
  const [previewDays, setPreviewDays] = useState(14);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignStart, setAssignStart] = useState(new Date().toISOString().split('T')[0]);
  const [assignEnd, setAssignEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [rotateDate, setRotateDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);
  const [leaveGuardId, setLeaveGuardId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [coverPath, setCoverPath] = useState<'POOL' | 'FLOATER'>('POOL');
  const [coverCandidates, setCoverCandidates] = useState<any[]>([]);
  const [selectedCover, setSelectedCover] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  const activeGuards = rot.guardPool.filter((g: any) => g.status === 'ACTIVE').sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(rot.dayShiftCount, 1) : rot.dayShiftCount + rot.nightShiftCount;

  const doPreview = async () => { setPreviewing(true); try { const res = await api.get(`/rotations/${rot._id}/preview?days=${previewDays}`); setPreviewData(res.data.data); } catch (e) { console.error(e); } finally { setPreviewing(false); } };
  const doGenerate = async () => { if (!confirm(`Generate ${previewDays} days?`)) return; setGenerating(true); try { await api.post(`/rotations/${rot._id}/generate`, { days: previewDays }); alert('Generated'); setTab('assignments'); } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setGenerating(false); } };
  const doRotate = async () => { if (!rotateDate) return; setActionLoading(true); try { await api.post(`/rotations/${rot._id}/rotate`, { date: rotateDate }); alert('Assignments rotated'); await loadAssignments(); } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setActionLoading(false); } };
  const doAction = async (action: string) => { setActionLoading(true); try { await api.post(`/rotations/${rot._id}/${action}`); window.location.reload(); } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setActionLoading(false); } };
  const loadAssignments = async () => { try { const res = await api.get(`/rotations/${rot._id}/assignments?startDate=${assignStart}&endDate=${assignEnd}`); setAssignments(res.data.data || []); } catch (e) { console.error(e); } };
  useEffect(() => { if (tab === 'assignments') loadAssignments(); }, [tab, assignStart, assignEnd]);
  const searchCoverCandidates = async () => { if (!leaveGuardId || !leaveStart) return; setLeaveLoading(true); try { const endpoint = coverPath === 'POOL' ? 'pool' : 'floater'; const res = await api.get(`/rotations/${rot._id}/leave-cover/${endpoint}?guardId=${leaveGuardId}&date=${leaveStart}`); setCoverCandidates(res.data.data || []); } catch (e) { console.error(e); } finally { setLeaveLoading(false); } };
  const applyCoverage = async () => { if (!leaveGuardId || !leaveStart || !leaveEnd || !selectedCover) return; try { await api.post(`/rotations/${rot._id}/leave-cover`, { guardId: leaveGuardId, startDate: leaveStart, endDate: leaveEnd, path: coverPath, coverGuardId: selectedCover }); alert('Applied'); setLeaveGuardId(''); setLeaveStart(''); setLeaveEnd(''); setSelectedCover(''); setCoverCandidates([]); } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } };

  const todayAssignments = useMemo(() => computeDayAssignments(rot, new Date()), [rot]);
  const dayGuards = todayAssignments.filter((a) => a.slot === 'DAY');
  const nightGuards = todayAssignments.filter((a) => a.slot === 'NIGHT');
  const restGuards = activeGuards.filter((g) => !todayAssignments.some((a) => String((a.guard as any)?._id || a.guard) === String((g.guardId as any)._id || g.guardId)));

  const startDateObj = new Date(rot.startDate);
  const today = new Date();
  const dayOffset = Math.max(0, Math.floor((today.getTime() - startDateObj.getTime()) / 86400000));

  const weekDays = useMemo(() => {
    const result: { date: Date; label: string; dayNum: number; assignments: typeof todayAssignments; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const d2 = new Date(today); d2.setDate(d2.getDate() + d);
      result.push({ date: d2, label: d2.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d2.getDate(), assignments: computeDayAssignments(rot, d2), isToday: d === 0 });
    }
    return result;
  }, [rot]);

  const siteName = typeof rot.siteId === 'object' && rot.siteId !== null ? (rot.siteId as any).siteName : '';

  const deleteRotation = async () => {
    if (!confirm('Delete this rotation? This also removes generated assignments.')) return;
    try {
      await api.delete(`/rotations/${rot._id}`);
      alert('Rotation deleted');
      onBack();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-6">
      <PageHeader title={rot.name} subtitle={`${rot.status} · ${activeGuards.length} guards · ${rot.dayShiftCount} DAY + ${rot.nightShiftCount} NIGHT`}
        action={<Button variant="ghost" onClick={onBack}>Back to List</Button>} />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['overview', 'preview', 'assignments', 'leave'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-white">Today's Duty Roster</h2>
                <p className="text-xs text-indigo-200 mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Day {(dayOffset % (activeGuards.length / gcd(activeGuards.length, slotCountPerDay))) + 1} of cycle</p></div>
              <span className="px-3 py-1 rounded-lg bg-white/15 text-white text-xs font-medium">{dayGuards.length} DAY · {nightGuards.length} NIGHT · {restGuards.length} REST</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3"><span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-yellow-900 text-sm font-bold">D</span><div><p className="text-sm font-bold text-gray-900">Day Shift</p><p className="text-[10px] text-gray-400">{rot.dayStartTime}</p></div></div>
                {dayGuards.length === 0 ? <p className="text-xs text-gray-400 italic">None</p> : <div className="space-y-2">{dayGuards.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-yellow-50 border border-yellow-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">{getInitials(a.guard)}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{(a.guard as any).firstName} {(a.guard as any).lastName}</p><p className="text-[10px] text-gray-400">{(a.guard as any).employeeCode}</p></div>
                  </div>))}</div>}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3"><span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">N</span><div><p className="text-sm font-bold text-gray-900">Night Shift</p><p className="text-[10px] text-gray-400">{rot.nightEndTime}</p></div></div>
                {nightGuards.length === 0 ? <p className="text-xs text-gray-400 italic">None</p> : <div className="space-y-2">{nightGuards.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(a.guard)}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{(a.guard as any).firstName} {(a.guard as any).lastName}</p><p className="text-[10px] text-gray-400">{(a.guard as any).employeeCode}</p></div>
                  </div>))}</div>}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3"><span className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">R</span><div><p className="text-sm font-bold text-gray-900">Resting</p><p className="text-[10px] text-gray-400">Off duty</p></div></div>
                {restGuards.length === 0 ? <p className="text-xs text-gray-400 italic">None</p> : <div className="space-y-2">{restGuards.map((g, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold">{getInitials(g.guardId)}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700 truncate">{(g.guardId as any).firstName} {(g.guardId as any).lastName}</p><p className="text-[10px] text-gray-400">{(g.guardId as any).employeeCode}</p></div>
                  </div>))}</div>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">This Week</h3>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((wd) => (
                <div key={wd.label + wd.dayNum} className={`rounded-xl border overflow-hidden ${wd.isToday ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-100'}`}>
                  <div className={`px-2 py-2 text-center ${wd.isToday ? 'bg-indigo-600 text-white' : 'bg-gray-50'}`}>
                    <p className={`text-[10px] font-bold ${wd.isToday ? 'text-indigo-200' : 'text-gray-400'}`}>{wd.label}</p>
                    <p className={`text-lg font-bold ${wd.isToday ? 'text-white' : 'text-gray-900'}`}>{wd.dayNum}</p>
                  </div>
                  <div className="p-1.5 space-y-1 min-h-[80px]">
                    {wd.assignments.map((a, j) => (
                      <div key={j} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium ${a.slot === 'DAY' ? 'bg-yellow-50 text-yellow-800' : 'bg-indigo-50 text-indigo-800'}`}>
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${a.slot === 'DAY' ? 'bg-yellow-400 text-yellow-900' : 'bg-indigo-500 text-white'}`}>{a.slot[0]}</span>
                        <span className="truncate">{(a.guard as any).firstName}</span>
                      </div>
                    ))}
                    {activeGuards.length - slotCountPerDay > 0 && (
                      <p className="text-[9px] text-gray-400 text-center">+{activeGuards.length - slotCountPerDay} resting</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Configuration</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Site</span><span className="font-medium">{siteName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Day Shift</span><span className="font-medium">{rot.dayShiftCount} guards · {rot.dayStartTime}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Night Shift</span><span className="font-medium">{rot.nightShiftCount} guards · {rot.nightEndTime}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Start</span><span className="font-medium">{new Date(rot.startDate).toLocaleDateString()}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Guard Pool ({activeGuards.length})</h3>
              <div className="space-y-1.5">{activeGuards.map((g, i) => {
                const isWorking = todayAssignments.find((a) => (a.guard as any)._id === g.guardId._id);
                const slot = isWorking ? isWorking.slot : 'REST';
                return (<div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${SLOT_COLORS[slot]}`}>{slot[0]}</span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">{getInitials(g.guardId)}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{(g.guardId as any).firstName} {(g.guardId as any).lastName}</p></div>
                  <span className="text-[10px] text-gray-400">#{i + 1}</span>
                </div>);
              })}</div>
            </div>
          </div>

          {canManage && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Actions</h3>
              <div className="flex gap-2 flex-wrap">
                {rot.status === 'DRAFT' && <Button onClick={() => doAction('activate')} disabled={actionLoading}>Activate</Button>}
                {rot.status === 'ACTIVE' && <Button variant="ghost" onClick={() => doAction('pause')} disabled={actionLoading}>Pause</Button>}
                {rot.status === 'PAUSED' && <Button onClick={() => doAction('activate')} disabled={actionLoading}>Resume</Button>}
                <Button variant="ghost" onClick={() => doAction('archive')} disabled={actionLoading}>Archive</Button>
                <Button variant="ghost" onClick={doRotate} disabled={actionLoading}>Rotate on date</Button>
                <Button variant="ghost" onClick={deleteRotation} disabled={actionLoading}>Delete</Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-gray-500">Date</label>
                <input type="date" value={rotateDate} onChange={(e) => setRotateDate(e.target.value)} className="px-2 py-1.5 border rounded-md text-sm" />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'preview' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Days to Preview</label>
                  <input type="number" min={1} max={90} value={previewDays} onChange={(e) => setPreviewDays(parseInt(e.target.value) || 7)}
                    className="w-20 h-9 px-3 border border-gray-200 rounded-xl text-sm text-center font-medium outline-none" />
                </div>
                <button onClick={doPreview} disabled={previewing}
                  className="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 mt-5">
                  {previewing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {previewing ? 'Loading...' : 'Preview Schedule'}
                </button>
              </div>
              {previewData && canManage && rot.status === 'ACTIVE' && (
                <button onClick={doGenerate} disabled={generating}
                  className="h-9 px-5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 mt-5 shadow-sm">
                  {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {generating ? 'Generating...' : `Generate ${previewDays} Days`}
                </button>
              )}
            </div>
          </div>

          {previewData && (() => {
            const groups: Record<string, any[]> = {};
            previewData.assignments.forEach((a: any) => {
              const key = new Date(a.date).toISOString().split('T')[0];
              if (!groups[key]) groups[key] = [];
              groups[key].push(a);
            });
            const dates = Object.keys(groups).sort();
            const guardList: { id: string; name: string; code: string }[] = [];
            const seen = new Set<string>();
            previewData.assignments.forEach((a: any) => {
              if (a.guardId?._id && !seen.has(a.guardId._id)) {
                seen.add(a.guardId._id);
                guardList.push({ id: a.guardId._id, name: `${a.guardId.firstName} ${a.guardId.lastName}`, code: a.guardId.employeeCode });
              }
            });
            const shiftTimes = previewData.shiftTimes || { day: rot.dayStartTime, night: rot.nightEndTime };

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Rotation Schedule — {rot.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{dates.length} days · {guardList.length} guards · DAY = {shiftTimes.day} · NIGHT = {shiftTimes.night}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">Day</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Date</th>
                        {guardList.map((g) => (
                          <th key={g.id} className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                            <div>{g.name}</div>
                            <div className="text-gray-400 normal-case">{g.code}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dates.map((dateKey, di) => {
                        const dayAssigns = groups[dateKey];
                        const dayDate = new Date(dateKey + 'T12:00:00');
                        const isToday = dateKey === new Date().toISOString().split('T')[0];
                        const byGuard: Record<string, any> = {};
                        dayAssigns.forEach((a: any) => { if (a.guardId?._id) byGuard[a.guardId._id] = a; });

                        return (
                          <tr key={dateKey} className={`hover:bg-gray-50/50 ${isToday ? 'bg-indigo-50/50' : ''}`}>
                            <td className="px-3 py-2 font-bold text-gray-500">{di + 1}.</td>
                            <td className={`px-3 py-2 font-medium ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                              {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {isToday && <span className="ml-1 text-[9px] font-bold text-indigo-600">TODAY</span>}
                            </td>
                            {guardList.map((g) => {
                              const a = byGuard[g.id];
                              if (!a) return <td key={g.id} className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400 font-medium text-[10px]">REST</span></td>;
                              const time = a.shiftType === 'DAY' ? shiftTimes.day : shiftTimes.night;
                              return (
                                <td key={g.id} className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${a.shiftType === 'DAY' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                    {time}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {!previewData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <p className="text-sm font-medium text-gray-500">Click "Preview Schedule" to see the rotation</p>
              <p className="text-xs text-gray-400 mt-1">Shows who works which shift each day</p>
            </div>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-3 mb-4">
            <input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} className="px-2 py-1 border rounded text-sm" />
            <span className="text-gray-400">to</span>
            <input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} className="px-2 py-1 border rounded text-sm" />
            <Button variant="ghost" onClick={loadAssignments}>Load</Button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No assignments found. Generate from Preview tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Guard</th><th className="px-2 py-1 text-left">Code</th><th className="px-2 py-1 text-left">Shift</th><th className="px-2 py-1 text-left">Time</th></tr></thead>
                <tbody>{assignments.map((a: any) => (
                  <tr key={a._id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-2 py-1">{a.guardId?.firstName} {a.guardId?.lastName}</td>
                    <td className="px-2 py-1 text-gray-400">{a.guardId?.employeeCode}</td>
                    <td className="px-2 py-1"><span className={`px-1.5 py-0.5 rounded font-bold ${a.shiftType === 'DAY' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>{a.shiftType}</span></td>
                    <td className="px-2 py-1">{a.shiftTime}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'leave' && canManage && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold">Mark Guard on Leave</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1">Guard</label>
                <select value={leaveGuardId} onChange={(e) => { setLeaveGuardId(e.target.value); setCoverCandidates([]); }} className="w-full px-2 py-1.5 border rounded text-sm">
                  <option value="">Select guard</option>
                  {activeGuards.map((g) => (<option key={(g.guardId as any)._id} value={(g.guardId as any)._id}>{(g.guardId as any).firstName} {(g.guardId as any).lastName}</option>))}
                </select></div>
              <div><label className="block text-xs text-gray-500 mb-1">Start</label>
                <input type="date" value={leaveStart} onChange={(e) => { setLeaveStart(e.target.value); setCoverCandidates([]); }} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">End</label>
                <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Coverage path</label>
              <div className="flex gap-2">
                <button onClick={() => { setCoverPath('POOL'); setCoverCandidates([]); }} className={`px-3 py-1.5 rounded text-sm font-medium ${coverPath === 'POOL' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>From Pool</button>
                <button onClick={() => { setCoverPath('FLOATER'); setCoverCandidates([]); }} className={`px-3 py-1.5 rounded text-sm font-medium ${coverPath === 'FLOATER' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>From Floaters</button>
              </div></div>
            <Button onClick={searchCoverCandidates} disabled={leaveLoading || !leaveGuardId || !leaveStart}>{leaveLoading ? 'Searching...' : 'Find Covers'}</Button>
            {coverCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Available covers:</p>
                {coverCandidates.map((c: any) => (
                  <div key={c.guardId._id || c.guardId} className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${selectedCover === (c.guardId._id || c.guardId) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedCover(c.guardId._id || c.guardId)}>
                    <span className="text-sm">{(c.guardId as any).firstName} {(c.guardId as any).lastName}</span>
                    <span className="text-xs text-gray-400">{c.reason}</span>
                  </div>
                ))}
                <Button onClick={applyCoverage} disabled={!selectedCover}>Apply Coverage</Button>
              </div>
            )}
          </div>
          {rot.leaveCoverages && rot.leaveCoverages.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold mb-3">Active Leave Coverages</h3>
              <div className="space-y-2">
                {rot.leaveCoverages.map((lc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{lc.guardId?.firstName || 'Guard'} — {new Date(lc.startDate).toLocaleDateString()} to {new Date(lc.endDate).toLocaleDateString()}</span>
                    <span className="text-xs text-gray-400">Covered by {lc.coverGuardId?.firstName || 'Guard'} ({lc.path})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui';
import api from '../../lib/api';

interface Site {
  _id: string;
  siteCode: string;
  siteName: string;
  client?: string;
  location: string;
  siteType: string;
  status: string;
  agreedManpower: number;
  actualManpower: number;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  createdAt: string;
  updatedAt: string;
}

interface ShiftTemplate {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  maxGuards: number;
  color: string;
  active: boolean;
}

interface ShiftAssignment {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string } | string;
  shiftTemplateId: { _id: string; name: string; startTime: string; endTime: string; color: string } | string;
  startDate: string;
  endDate?: string;
  status: string;
  source?: string;
}

interface PrimaryAssignment {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string } | string;
  role: string;
  standardMonthlyHours: number;
  hourlyRate: number;
  effectiveFrom: string;
}

interface AttendanceRec {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string } | string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours: number;
  source: string;
}

interface SiteNoteRec {
  _id: string;
  date: string;
  noteText: string;
  recordedById?: { firstName: string; lastName: string };
}

interface RotationAssignmentRec {
  _id: string;
  guardId: { firstName: string; lastName: string; employeeCode: string } | string;
  shiftTemplateId: { name: string; startTime: string; endTime: string } | string;
  date: string;
}

interface SiteDetailData {
  site: Site;
  shiftTemplates: ShiftTemplate[];
  activeAssignments: ShiftAssignment[];
  currentAssignments: PrimaryAssignment[];
  recentAttendance: AttendanceRec[];
  recentNotes: SiteNoteRec[];
  rotationAssignments: RotationAssignmentRec[];
  todaySummary: {
    onDuty: number;
    clockedOut: number;
    totalFiled: number;
    onDutyGuards: { guardId: string; name: string; code: string; clockIn: string; totalHours: number }[];
  };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
};

const SITE_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-indigo-100 text-indigo-700',
  RESIDENTIAL: 'bg-violet-100 text-violet-700',
  INDUSTRIAL: 'bg-amber-100 text-amber-700',
  GOVERNMENT: 'bg-teal-100 text-teal-700',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'guards', label: 'Guards' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'notes', label: 'Notes' },
] as const;

function getGuardName(g: any): string {
  if (!g) return 'Unknown';
  if (typeof g === 'string') return g;
  return `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Unknown';
}
function getGuardCode(g: any): string {
  if (!g || typeof g === 'string') return '';
  return g.employeeCode || '';
}
function getTemplateName(t: any): string {
  if (!t) return 'Unknown';
  if (typeof t === 'string') return t;
  return t.name || 'Unknown';
}
function getTemplateTime(t: any): string {
  if (!t || typeof t === 'string') return '';
  return `${t.startTime || ''}–${t.endTime || ''}`;
}

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SiteDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', startTime: '06:00', endTime: '18:00', daysOfWeek: [0,1,2,3,4,5,6], maxGuards: 1, color: '#3B82F6' });
  const [templateSaving, setTemplateSaving] = useState(false);

  const [form, setForm] = useState({
    siteCode: '', siteName: '', client: '', location: '', siteType: 'COMMERCIAL',
    agreedManpower: 0, actualManpower: 0, contactPerson: '', contactPhone: '', address: '',
    status: 'ACTIVE',
  });

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/sites/${id}/detail`);
      const d = res.data.data;
      setData(d);
      const s = d.site;
      setForm({
        siteCode: s.siteCode, siteName: s.siteName, client: s.client || '',
        location: s.location, siteType: s.siteType, agreedManpower: s.agreedManpower,
        actualManpower: s.actualManpower, contactPerson: s.contactPerson || '',
        contactPhone: s.contactPhone || '', address: s.address || '', status: s.status,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/sites/${id}`, form);
      setEditing(false);
      fetchDetail();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || deleteConfirm !== data?.site?.siteCode) return;
    try {
      await api.delete(`/sites/${id}`);
      navigate('/sites');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleAddNote = async () => {
    if (!id || !noteText.trim()) return;
    try {
      await api.post('/site-notes', { siteId: id, date: noteDate, noteText: noteText.trim() });
      setAddNoteOpen(false);
      setNoteText('');
      fetchDetail();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add note');
    }
  };

  const handleAddTemplate = async () => {
    if (!id || !templateForm.name.trim()) return;
    setTemplateSaving(true);
    try {
      await api.post('/shifts/templates', { siteId: id, ...templateForm });
      setAddTemplateOpen(false);
      setTemplateForm({ name: '', startTime: '06:00', endTime: '18:00', daysOfWeek: [0,1,2,3,4,5,6], maxGuards: 1, color: '#3B82F6' });
      fetchDetail();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const toggleTemplateDay = (day: number) => {
    setTemplateForm((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(day) ? p.daysOfWeek.filter((d) => d !== day) : [...p.daysOfWeek, day].sort(),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500">Site not found</p>
        <button onClick={() => navigate('/sites')} className="mt-4 text-indigo-600 hover:underline text-sm">Back to Sites</button>
      </div>
    );
  }

  const { site, shiftTemplates, activeAssignments, currentAssignments, recentAttendance, recentNotes, rotationAssignments, todaySummary } = data;
  const pct = site.agreedManpower > 0 ? Math.round((site.actualManpower / site.agreedManpower) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Back button */}
        <button onClick={() => navigate('/sites')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Sites
        </button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTMgNmgzNHYySDN6TTM2IDE4djJIM3YtMmgzMzoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold tracking-tight">{site.siteName}</h1>
                <span className="text-xs font-mono text-indigo-200">{site.siteCode}</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${STATUS_COLORS[site.status]}`}>{site.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-indigo-200">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {site.location}
                </span>
                {site.client && <span>{site.client}</span>}
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SITE_TYPE_COLORS[site.siteType] || ''}`}>{site.siteType}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="h-9 px-4 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/25 transition-all border border-white/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2">
                    {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setForm({ siteCode: site.siteCode, siteName: site.siteName, client: site.client || '', location: site.location, siteType: site.siteType, agreedManpower: site.agreedManpower, actualManpower: site.actualManpower, contactPerson: site.contactPerson || '', contactPhone: site.contactPhone || '', address: site.address || '', status: site.status }); setError(''); }} className="h-9 px-4 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-all border border-white/20">Cancel</button>
                </>
              )}
              <button onClick={() => setDeleteOpen(true)} className="h-9 px-4 rounded-xl bg-red-500/20 text-white text-sm font-medium hover:bg-red-500/30 transition-all border border-red-400/30 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Deactivate
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Today's Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">{site.agreedManpower}</div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Required Guards</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-violet-600">{todaySummary.onDuty}</div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">On Duty Now</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-emerald-600">{todaySummary.clockedOut}</div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Completed Today</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{currentAssignments.length}</div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Assigned Guards</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`text-2xl font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Coverage</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* Site Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Site Information</h2>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Site Code</label>
                        <input value={form.siteCode} onChange={e => setForm({ ...form, siteCode: e.target.value.toUpperCase() })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Site Name</label>
                        <input value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
                        <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                        <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select value={form.siteType} onChange={e => setForm({ ...form, siteType: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none">
                          <option value="COMMERCIAL">Commercial</option>
                          <option value="RESIDENTIAL">Residential</option>
                          <option value="INDUSTRIAL">Industrial</option>
                          <option value="GOVERNMENT">Government</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Agreed Manpower</label>
                        <input type="number" value={form.agreedManpower} onChange={e => setForm({ ...form, agreedManpower: parseInt(e.target.value) || 0 })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Contact Person</label>
                        <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Contact Phone</label>
                        <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <InfoField label="Site Code" value={site.siteCode} mono />
                      <InfoField label="Site Name" value={site.siteName} />
                      <InfoField label="Client" value={site.client} />
                      <InfoField label="Location" value={site.location} />
                      <InfoField label="Type" value={site.siteType} badge={SITE_TYPE_COLORS[site.siteType]} />
                      <InfoField label="Status" value={site.status} badge={STATUS_COLORS[site.status]} />
                      <InfoField label="Agreed Manpower" value={String(site.agreedManpower)} />
                      <InfoField label="Actual Manpower" value={String(site.actualManpower)} />
                      <InfoField label="Contact Person" value={site.contactPerson} />
                      <InfoField label="Contact Phone" value={site.contactPhone} />
                      <InfoField label="Address" value={site.address} />
                      <InfoField label="Created" value={new Date(site.createdAt).toLocaleDateString()} />
                    </div>
                  </div>
                )}
              </div>

              {/* Coverage Bar */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Guard Coverage</h2>
                <div className="flex items-center gap-6 mb-3">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{site.actualManpower}/{site.agreedManpower}</span>
                    <span className="text-xs text-gray-400 ml-2">({pct}%)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{pct >= 90 ? 'Fully covered' : pct >= 60 ? 'Partially covered — shortfall of ' + (site.agreedManpower - site.actualManpower) + ' guard(s)' : 'Understaffed — shortfall of ' + (site.agreedManpower - site.actualManpower) + ' guard(s)'}</p>
              </div>

              {/* Shift Templates */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Shift Templates ({shiftTemplates.length})</h2>
                  <button onClick={() => setAddTemplateOpen(true)} className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Create Template
                  </button>
                </div>
                {shiftTemplates.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No shift templates configured for this site</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shiftTemplates.map(t => (
                      <div key={t._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: t.color || '#3B82F6' }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.startTime}–{t.endTime} | Max {t.maxGuards} guards</div>
                          <div className="flex gap-1 mt-1">
                            {t.daysOfWeek.map(d => (
                              <span key={d} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{DAY_NAMES[d]}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* On Duty Now */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">On Duty Now</h2>
                {todaySummary.onDutyGuards.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No guards on duty</p>
                ) : (
                  <div className="space-y-3">
                    {todaySummary.onDutyGuards.map((g, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {g.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{g.name}</div>
                          <div className="text-[11px] text-gray-400">{g.code} | In since {new Date(g.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Site Notes */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recent Notes</h2>
                  <button onClick={() => setAddNoteOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add</button>
                </div>
                {recentNotes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No notes yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentNotes.slice(0, 5).map(n => (
                      <div key={n._id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-gray-400">{n.date}</span>
                          {n.recordedById && <span className="text-[10px] text-gray-400">by {n.recordedById.firstName}</span>}
                        </div>
                        <p className="text-xs text-gray-700">{n.noteText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Site Stats */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Statistics</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Shift Templates</span><span className="font-medium">{shiftTemplates.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active Assignments</span><span className="font-medium">{activeAssignments.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Primary Assignments</span><span className="font-medium">{currentAssignments.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Rotation Entries</span><span className="font-medium">{rotationAssignments.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Today's Records</span><span className="font-medium">{todaySummary.totalFiled}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Attendance Records</span><span className="font-medium">{recentAttendance.length}+</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SHIFTS TAB ═══ */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Active Shift Assignments ({activeAssignments.length})</h2>
              </div>
              {activeAssignments.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">No active shift assignments</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Shift</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {activeAssignments.map(a => (
                        <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">{getGuardName(a.guardId).split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                              <div>
                                <span className="font-medium text-gray-900 text-sm">{getGuardName(a.guardId)}</span>
                                <span className="text-[10px] text-gray-400 ml-1.5">{getGuardCode(a.guardId)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700">{getTemplateName(a.shiftTemplateId)}</span>
                          </td>
                          <td className="py-3 px-6 text-gray-600 text-xs">{getTemplateTime(a.shiftTemplateId)}</td>
                          <td className="py-3 px-6 text-gray-600 text-xs">{new Date(a.startDate).toLocaleDateString()}</td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.source === 'ROTATION' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>{a.source || 'MANUAL'}</span>
                          </td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ GUARDS TAB ═══ */}
        {activeTab === 'guards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Assigned Guards ({currentAssignments.length})</h2>
                <p className="text-xs text-gray-500 mt-0.5">Guards with primary site assignment at this location</p>
              </div>
              {currentAssignments.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">No guards currently assigned to this site</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Monthly Hours</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Hourly Rate</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Effective From</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentAssignments.map(a => (
                        <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">{getGuardName(a.guardId).split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                              <div>
                                <span className="font-medium text-gray-900">{getGuardName(a.guardId)}</span>
                                <div className="text-[10px] text-gray-400">{getGuardCode(a.guardId)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{a.role}</span>
                          </td>
                          <td className="py-3 px-6">
                            <span className="text-xs text-gray-600">{(a.guardId as any)?.status || '—'}</span>
                          </td>
                          <td className="py-3 px-6 text-xs text-gray-600">{a.standardMonthlyHours}h</td>
                          <td className="py-3 px-6 text-xs text-gray-600">{a.hourlyRate > 0 ? `${a.hourlyRate.toFixed(2)}/hr` : '—'}</td>
                          <td className="py-3 px-6 text-xs text-gray-600">{new Date(a.effectiveFrom).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rotation Assignments */}
            {rotationAssignments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Recent Rotation Assignments ({rotationAssignments.length})</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-generated from rotation patterns</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Shift</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rotationAssignments.map(a => (
                        <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6">
                            <span className="font-medium text-gray-900">{getGuardName(a.guardId)}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">{getGuardCode(a.guardId)}</span>
                          </td>
                          <td className="py-3 px-6 text-xs text-gray-600">{getTemplateName(a.shiftTemplateId)} ({getTemplateTime(a.shiftTemplateId)})</td>
                          <td className="py-3 px-6 text-xs text-gray-600">{new Date(a.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ATTENDANCE TAB ═══ */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Recent Attendance ({recentAttendance.length})</h2>
            </div>
            {recentAttendance.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No attendance records yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Guard</th>
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Clock In</th>
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Clock Out</th>
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Hours</th>
                      <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentAttendance.map(a => (
                      <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <span className="font-medium text-gray-900">{getGuardName(a.guardId)}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">{getGuardCode(a.guardId)}</span>
                        </td>
                        <td className="py-3 px-6 text-xs text-gray-600">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="py-3 px-6 text-xs text-gray-600 font-mono">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-3 px-6 text-xs text-gray-600 font-mono">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-3 px-6">
                          <span className={`text-xs font-bold ${a.totalHours >= 8 ? 'text-emerald-600' : a.totalHours > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{a.totalHours}h</span>
                        </td>
                        <td className="py-3 px-6">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            a.source === 'MANUAL_ENTRY' ? 'bg-blue-100 text-blue-700' :
                            a.source === 'ROTATION' ? 'bg-violet-100 text-violet-700' :
                            a.source === 'OPERATIONS_EDIT' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{a.source}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Site Notes ({recentNotes.length})</h2>
              <button onClick={() => setAddNoteOpen(true)} className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Add Note
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No notes recorded for this site</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentNotes.map(n => (
                  <div key={n._id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-gray-400">{n.date}</span>
                      {n.recordedById && <span className="text-xs text-gray-400">by {n.recordedById.firstName} {n.recordedById.lastName}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{n.noteText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Modal */}
        <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteConfirm(''); }} title="Deactivate Site">
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              This will deactivate <strong>{site.siteName}</strong> ({site.siteCode}). The site will no longer appear in active listings. This action can be reversed by editing the site status.
            </div>
            <p className="text-sm text-gray-600">Type <strong>{site.siteCode}</strong> to confirm:</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={site.siteCode}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }} className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteConfirm !== site.siteCode} className="h-10 px-5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-200">Deactivate</button>
            </div>
          </div>
        </Modal>

        {/* Add Note Modal */}
        <Modal open={addNoteOpen} onClose={() => setAddNoteOpen(false)} title="Add Site Note">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Enter note..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none transition-all" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setAddNoteOpen(false)} className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteText.trim()} className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">Save Note</button>
            </div>
          </div>
        </Modal>

        {/* Add Shift Template Modal */}
        <Modal open={addTemplateOpen} onClose={() => setAddTemplateOpen(false)} title="Create Shift Template">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g. Morning Shift, Night Watch" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input type="time" value={templateForm.startTime} onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input type="time" value={templateForm.endTime} onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Guards</label>
                <input type="number" min={1} value={templateForm.maxGuards} onChange={(e) => setTemplateForm({ ...templateForm, maxGuards: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={templateForm.color} onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                  <span className="text-xs text-gray-400 font-mono">{templateForm.color}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Active Days</label>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((day, i) => (
                  <button key={i} type="button" onClick={() => toggleTemplateDay(i)}
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${templateForm.daysOfWeek.includes(i) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setAddTemplateOpen(false)} className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAddTemplate} disabled={templateSaving || !templateForm.name.trim()}
                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center gap-2">
                {templateSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {templateSaving ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono, badge }: { label: string; value?: string; mono?: boolean; badge?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
      {value ? (
        badge ? (
          <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold ${badge}`}>{value}</span>
        ) : (
          <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
        )
      ) : (
        <p className="text-sm text-gray-400 italic">—</p>
      )}
    </div>
  );
}

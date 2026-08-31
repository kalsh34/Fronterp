import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Card, Button, Modal, LoadingSpinner } from '../../components/ui';

interface Site {
  id: string;
  siteName: string;
  siteCode: string;
}

interface ShiftTemplate {
  _id: string;
  siteId: { _id: string; siteName: string; siteCode: string } | string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  color: string;
  active: boolean;
}

interface GuardAssignment {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  siteId: string;
  siteName: string;
}

interface ShiftAssignment {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string };
  siteId: { _id: string; siteName: string };
  shiftTemplateId: { _id: string; name: string; startTime: string; endTime: string; color: string };
  startDate: string;
  endDate?: string;
  status: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function ShiftsPage() {
  const [view, setView] = useState<'templates' | 'schedule'>('templates');
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [guards, setGuards] = useState<GuardAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateModal, setTemplateModal] = useState<ShiftTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', startTime: '06:00', endTime: '18:00', daysOfWeek: [0,1,2,3,4,5,6], color: '#3B82F6', siteId: '' });
  const [saving, setSaving] = useState(false);

  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ guardId: '', shiftTemplateId: '', startDate: new Date().toISOString().split('T')[0] });

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    api.get('/sites').then((res) => {
      const all = (res.data.data || []).map((s: any) => ({ id: s._id || s.id, siteName: s.siteName, siteCode: s.siteCode }));
      setSites(all);
      if (all.length > 0 && !selectedSiteId) setSelectedSiteId(all[0].id);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const [templatesRes, assignmentsRes, guardsRes] = await Promise.all([
        api.get(`/shifts/templates?siteId=${selectedSiteId}`),
        api.get(`/shifts/assignments?siteId=${selectedSiteId}`),
        api.get('/guards'),
      ]);
      setTemplates(templatesRes.data.data || []);
      setAssignments(assignmentsRes.data.data || []);
      const allGuards = (guardsRes.data.data || [])
        .filter((g: any) => g.currentAssignments?.length > 0)
        .flatMap((g: any) =>
          (g.currentAssignments || [])
            .filter((a: any) => (typeof a.siteId === 'object' ? a.siteId._id : a.siteId) === selectedSiteId)
            .map((a: any) => ({
              employeeId: g.employee._id,
              employeeCode: g.employee.employeeCode,
              firstName: g.employee.firstName,
              lastName: g.employee.lastName,
              siteId: typeof a.siteId === 'object' ? a.siteId._id : a.siteId,
              siteName: typeof a.siteId === 'object' ? a.siteId.siteName : 'Unknown',
            }))
        );
      setGuards(allGuards);
    } catch (e) {
      console.error('Failed to load shift data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.startTime || !templateForm.endTime) return;
    setSaving(true);
    try {
      if (templateModal?._id) {
        await api.put(`/shifts/templates/${templateModal._id}`, templateForm);
      } else {
        await api.post('/shifts/templates', { ...templateForm, siteId: selectedSiteId });
      }
      setTemplateModal(null);
      setTemplateForm({ name: '', startTime: '06:00', endTime: '18:00', daysOfWeek: [0,1,2,3,4,5,6], color: '#3B82F6', siteId: '' });
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Deactivate this shift template?')) return;
    try {
      await api.delete(`/shifts/templates/${id}`);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleAssign = async () => {
    if (!assignForm.guardId || !assignForm.shiftTemplateId || !assignForm.startDate) return;
    setSaving(true);
    try {
      await api.post('/shifts/assignments', {
        ...assignForm,
        siteId: selectedSiteId,
      });
      setAssignModal(false);
      setAssignForm({ guardId: '', shiftTemplateId: '', startDate: new Date().toISOString().split('T')[0] });
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign guard');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Remove this shift assignment?')) return;
    try {
      await api.delete(`/shifts/assignments/${id}`);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };
  const weekDates = getWeekDates(weekOffset);

  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter((a) => {
      if (a.status !== 'ACTIVE') return false;
      const start = new Date(a.startDate);
      const end = a.endDate ? new Date(a.endDate) : null;
      const dayOfWeek = date.getDay();
      const template = a.shiftTemplateId as any;
      if (!template?.daysOfWeek?.includes(dayOfWeek)) return false;
      if (date < new Date(start.toDateString())) return false;
      if (end && date > new Date(end.toDateString())) return false;
      return true;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.siteName}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('templates')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === 'schedule' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Schedule
            </button>
          </div>
        </div>
        {view === 'templates' ? (
          <Button size="sm" onClick={() => { setTemplateModal(null); setTemplateForm({ name: '', startTime: '06:00', endTime: '18:00', daysOfWeek: [0,1,2,3,4,5,6], color: '#3B82F6', siteId: selectedSiteId }); }}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            New Template
          </Button>
        ) : (
          <Button size="sm" onClick={() => setAssignModal(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Assign Guard
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading shifts..." />
      ) : view === 'templates' ? (
        /* ===== TEMPLATES VIEW ===== */
        <div className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm">No shift templates for this site.</p>
              <p className="text-xs text-gray-300 mt-1">Create one to define shift patterns.</p>
            </div>
          ) : templates.map((t) => (
            <Card key={t._id} padding={false} className="overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: t.color }} />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{t.name}</h3>
                    <p className="text-xs text-gray-500">{t.startTime} — {t.endTime}</p>
                    <div className="flex gap-1 mt-1">
                      {DAY_NAMES.map((d, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            t.daysOfWeek.includes(i)
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTemplateModal(t);
                      setTemplateForm({
                        name: t.name,
                        startTime: t.startTime,
                        endTime: t.endTime,
                        daysOfWeek: t.daysOfWeek,
                        color: t.color,
                        siteId: typeof t.siteId === 'object' ? t.siteId._id : t.siteId,
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t._id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* ===== SCHEDULE VIEW ===== */
        <div className="space-y-3">
          {/* Week Nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>&larr; Prev</Button>
              <span className="text-sm font-medium text-gray-700">
                {weekDates[0].toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>Next &rarr;</Button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600 hover:underline">Today</button>
              )}
            </div>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dayAssignments = getAssignmentsForDay(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={date.toISOString()} className={`rounded-lg border ${isToday ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className={`px-2 py-1.5 text-center border-b ${isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>
                    <div className="text-[10px] text-gray-400 uppercase">{DAY_NAMES[date.getDay()]}</div>
                    <div className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{date.getDate()}</div>
                  </div>
                  <div className="p-1.5 space-y-1 min-h-[80px]">
                    {dayAssignments.length === 0 ? (
                      <div className="text-[10px] text-gray-300 text-center py-4">No shifts</div>
                    ) : dayAssignments.map((a) => {
                      const tmpl = a.shiftTemplateId as any;
                      const guard = a.guardId as any;
                      return (
                        <div
                          key={a._id}
                          className="rounded px-1.5 py-1 text-[10px] text-white font-medium"
                          style={{ backgroundColor: tmpl?.color || '#3B82F6' }}
                          title={`${guard?.firstName} ${guard?.lastName} — ${tmpl?.name} (${tmpl?.startTime}–${tmpl?.endTime})`}
                        >
                          {guard?.firstName?.[0]}{guard?.lastName?.[0]} {tmpl?.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assignment List */}
          <Card padding={false} className="overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Active Assignments ({assignments.filter((a) => a.status === 'ACTIVE').length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {assignments.filter((a) => a.status === 'ACTIVE').length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No active assignments</div>
              ) : assignments.filter((a) => a.status === 'ACTIVE').map((a) => {
                const guard = a.guardId as any;
                const tmpl = a.shiftTemplateId as any;
                return (
                  <div key={a._id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: tmpl?.color || '#3B82F6' }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{guard?.firstName} {guard?.lastName}</p>
                        <p className="text-xs text-gray-500">{tmpl?.name} ({tmpl?.startTime}–{tmpl?.endTime})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        From {new Date(a.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {a.endDate ? ` — ${new Date(a.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                      </span>
                      <button
                        onClick={() => handleRemoveAssignment(a._id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Template Modal */}
      {templateModal !== null || view === 'templates' ? (
        <Modal open={templateModal !== null || (view === 'templates' && false)} onClose={() => setTemplateModal(null)} title={templateModal?._id ? 'Edit Shift Template' : 'New Shift Template'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g. Day Shift, Night Shift" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input type="time" value={templateForm.startTime} onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input type="time" value={templateForm.endTime} onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days of Week</label>
              <div className="flex gap-1">
                {DAY_NAMES.map((d, i) => (
                  <button key={i} onClick={() => {
                    const days = templateForm.daysOfWeek.includes(i)
                      ? templateForm.daysOfWeek.filter((x) => x !== i)
                      : [...templateForm.daysOfWeek, i];
                    setTemplateForm({ ...templateForm, daysOfWeek: days });
                  }} className={`px-2 py-1 text-xs rounded font-medium ${
                    templateForm.daysOfWeek.includes(i)
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setTemplateForm({ ...templateForm, color: c })}
                    className={`w-7 h-7 rounded-full border-2 ${templateForm.color === c ? 'border-gray-900 scale-110' : 'border-gray-200'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setTemplateModal(null)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={!templateForm.name || saving}>
                {saving ? 'Saving...' : templateModal?._id ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Assign Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Guard to Shift">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guard *</label>
            <select value={assignForm.guardId} onChange={(e) => setAssignForm({ ...assignForm, guardId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">Select guard...</option>
              {guards.map((g) => (
                <option key={g.employeeId} value={g.employeeId}>{g.firstName} {g.lastName} ({g.employeeCode})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Template *</label>
            <select value={assignForm.shiftTemplateId} onChange={(e) => setAssignForm({ ...assignForm, shiftTemplateId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{t.name} ({t.startTime}–{t.endTime})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" value={assignForm.startDate} onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignForm.guardId || !assignForm.shiftTemplateId || saving}>
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

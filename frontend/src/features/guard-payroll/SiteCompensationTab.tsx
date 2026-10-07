import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { History, Lock, Pencil, Plus, Save } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner, Select } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';

interface SiteOption { _id: string; siteName: string; siteCode?: string }

interface CompensationRow {
  _id: string;
  siteId: SiteOption | string;
  compensationAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isCurrent: boolean;
  notes?: string;
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const otRateOf = (amount: number) => (amount / 240).toFixed(2);

const siteIdOf = (row: CompensationRow) => (typeof row.siteId === 'object' ? row.siteId?._id : row.siteId);

/**
 * SITE COMPENSATION — the payroll rate source of truth, effective-dated.
 *
 * Finance edits by recording a NEW amount for a site: the previous current row
 * is retired the day before the new one starts and stays visible as history,
 * so past payroll records always trace back to the rate that was in force.
 */
export function SiteCompensationTab({ onError }: { onError: (msg: string | null) => void }) {
  const t = useT();
  const { user } = useAuthStore();
  const canEdit = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.FINANCE_OFFICER;

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [rows, setRows] = useState<CompensationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Update (edit) form — pre-filled from the current row of a site.
  const [editSite, setEditSite] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Request failed';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, compRes] = await Promise.all([
        api.get('/sites'),
        api.get('/guard-payroll/compensations'),
      ]);
      setSites(sitesRes.data.data || []);
      setRows(compRes.data.data || []);
      onError(null);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  /** Current row per site (+ site names), sorted by site name. */
  const currentBySite = useMemo(() => {
    const siteNameById = new Map(sites.map((s) => [s._id, s.siteName]));
    const current = new Map<string, { row: CompensationRow; siteName: string; siteCode?: string; historyCount: number }>();
    for (const row of rows) {
      const sid = siteIdOf(row);
      if (!sid) continue;
      const site = sites.find((s) => s._id === sid);
      const name = (typeof row.siteId === 'object' ? row.siteId?.siteName : '') || site?.siteName || siteNameById.get(sid) || '—';
      if (row.isCurrent) {
        current.set(sid, { row, siteName: name, siteCode: site?.siteCode, historyCount: 0 });
      } else {
        const entry = current.get(sid);
        if (entry) entry.historyCount += 1;
      }
    }
    // Sites with history but no current row still show (with their latest row).
    for (const row of rows) {
      const sid = siteIdOf(row);
      if (!sid || current.has(sid)) continue;
      const site = sites.find((s) => s._id === sid);
      current.set(sid, {
        row,
        siteName: (typeof row.siteId === 'object' ? row.siteId?.siteName : '') || site?.siteName || '—',
        siteCode: site?.siteCode,
        historyCount: rows.filter((r) => siteIdOf(r) === sid).length - 1,
      });
    }
    return Array.from(current.values()).sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [rows, sites]);

  const historyFor = (siteId: string) =>
    rows
      .filter((r) => siteIdOf(r) === siteId && !r.isCurrent)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  const startEdit = (siteId: string, row: CompensationRow) => {
    setEditSite(siteId);
    setEditAmount(String(row.compensationAmount));
    setEditFrom(new Date().toISOString().slice(0, 10));
    setEditNotes('');
    setExpanded(null);
  };

  const saveEdit = async () => {
    if (!editSite || !editAmount || !editFrom) return;
    setSaving(true);
    try {
      await api.post('/guard-payroll/compensations', {
        siteId: editSite,
        compensationAmount: Number(editAmount),
        effectiveFrom: editFrom,
        notes: editNotes || undefined,
      });
      setEditSite(null);
      onError(null);
      await load();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/guard-payroll/compensations/${id}`);
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const visible = siteFilter ? currentBySite.filter((c) => siteIdOf(c.row) === siteFilter) : currentBySite;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xs w-full">
          <Select label={t('gpSite')} value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="">{t('gpAllSites')}</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>{s.siteName}</option>
            ))}
          </Select>
        </div>
        {!canEdit && (
          <p className="flex items-center gap-1.5 text-xs text-subtext">
            <Lock size={13} />
            {t('gpReadOnlyNotice')}
          </p>
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
              <th className="px-4 py-3">{t('gpSite')}</th>
              <th className="px-4 py-3 text-right">{t('gpCompensation')}</th>
              <th className="px-4 py-3 text-right">{t('gpOtRate')}</th>
              <th className="px-4 py-3">{t('gpEffectiveFrom')}</th>
              <th className="px-4 py-3 text-center">{t('gpHistory')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => {
              const sid = siteIdOf(entry.row);
              const history = historyFor(sid);
              return (
                <Fragment key={entry.row._id}>
                  <tr className="border-b border-line hover:bg-subtle/50">
                    <td className="px-4 py-3 font-medium text-ink">
                      {entry.siteName}
                      {entry.siteCode ? <span className="text-xs text-subtext ml-1.5">({entry.siteCode})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{entry.row.compensationAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted">{otRateOf(entry.row.compensationAmount)}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(entry.row.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-center">
                      {history.length > 0 ? (
                        <Badge variant="info">{history.length}</Badge>
                      ) : (
                        <span className="text-subtext">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          onClick={() => setExpanded(expanded === sid ? null : sid)}
                          className="flex items-center gap-1"
                        >
                          <History size={13} />
                          {t('gpHistory')}
                        </Button>
                        {canEdit && (
                          <Button onClick={() => startEdit(sid, entry.row)} className="flex items-center gap-1">
                            <Pencil size={13} />
                            {t('edit')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit form — recording a new version; the old row becomes history. */}
                  {canEdit && editSite === sid && (
                    <tr className="bg-primary-500/5 border-b border-line">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-xs font-medium text-ink mb-2">{t('gpUpdateCompensationTitle')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <FormField label={t('gpCompensation')}>
                            <input className="v-input w-full" type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                          </FormField>
                          <FormField label={t('gpEffectiveFrom')}>
                            <input className="v-input w-full" type="date" value={editFrom} onChange={(e) => setEditFrom(e.target.value)} />
                          </FormField>
                          <FormField label={t('gpLabel')}>
                            <input className="v-input w-full" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                          </FormField>
                          <div className="flex gap-2 justify-end">
                            <Button variant="secondary" onClick={() => setEditSite(null)}>{t('cancel')}</Button>
                            <Button onClick={saveEdit} disabled={saving || !editAmount || !editFrom}>
                              <Save size={13} />
                              {t('save')}
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-subtext">{t('gpUpdateCompensationHint')}</p>
                      </td>
                    </tr>
                  )}

                  {/* History panel — retired compensation versions */}
                  {expanded === sid && (
                    <tr className="bg-subtle/40">
                      <td colSpan={6} className="px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('gpHistory')}</p>
                        {history.length === 0 ? (
                          <p className="text-xs text-muted">{t('noData')}</p>
                        ) : (
                          <ul className="space-y-1.5 text-xs">
                            {history.map((h) => (
                              <li key={h._id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted">
                                <span className="font-medium text-ink">{h.compensationAmount.toLocaleString()}</span>
                                <span>OT {otRateOf(h.compensationAmount)}</span>
                                <span>
                                  {fmtDate(h.effectiveFrom)} → {fmtDate(h.effectiveTo)}
                                </span>
                                {h.notes && <span className="italic">“{h.notes}”</span>}
                                {!h.isCurrent && (
                                  <button
                                    onClick={() => remove(h._id)}
                                    className="text-danger-text hover:underline"
                                    title={t('delete')}
                                  >
                                    {t('delete')}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  <Plus size={16} className="inline mr-2" />
                  {t('gpNoRun')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-subtext">
        OT rate = compensation ÷ 240 · Sunday structural = OT × 32 · transport = 20% (not taxable) · basic hourly = basic ÷ 208
      </p>
    </div>
  );
}


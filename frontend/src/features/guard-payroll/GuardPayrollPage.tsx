import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp, CirclePlus, Clock, Download, Eye, Printer, Undo2, Wallet, Wrench } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal, Select, Tabs } from '../../components/ui';
import { can, useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { ActionHint } from '../../help';
import { fmtMoney, fmtHours, monthNameOf, PayrollRecord, PayrollRun, statusVariant } from './guardPayroll.types';
import { PayrollRecordDetail } from './PayrollRecordDetail';
import { SiteCompensationTab } from './SiteCompensationTab';
import { DeductionsTab } from './DeductionsTab';
import { ConfigTab } from './ConfigTab';
import { AttendanceSummarySection, StaffAttRow, GuardAttRow, RunAttendanceSummary } from '../payroll-shared/AttendanceSummarySection';
import { AddDeductionModal } from '../payroll-shared/AddDeductionModal';
import { PayrollAuditCard } from '../payroll-shared/PayrollAuditCard';
import { downloadCsv, downloadReport, printPayslip } from '../payroll-shared/export';
import PayslipModal from '../../components/payroll/PayslipModal';

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

export default function GuardPayrollPage() {
  const t = useT();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('runs');

  const canCalculate = can(user?.permissions, 'guard-payroll.calculate');
  const canCheck = can(user?.permissions, 'guard-payroll.check');
  const canApprove = can(user?.permissions, 'guard-payroll.approve');
  const canPay = can(user?.permissions, 'guard-payroll.pay');
  const canReturn = can(user?.permissions, 'guard-payroll.return');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Runs list
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calculating, setCalculating] = useState(false);

  // Run detail
  const [detail, setDetail] = useState<{ run: PayrollRun; records: PayrollRecord[]; attendance?: RunAttendanceSummary } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionModal, setActionModal] = useState<{ type: 'return' | 'pay'; runId: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: 'submit' | 'check' | 'approve' | 'recalculate'; runId: string } | null>(null);
  const [readiness, setReadiness] = useState<{ ready: boolean; guardCount: number; issues: { code: string; employeeCode?: string; message: string }[]; lock: { locked: boolean; runStatus: string | null }; rows: { employeeCode: string; guardName: string; sites: { siteName: string; isPrimary: boolean; compensationAmount: number | null; normalHours: number; sundayHours: number; holidayHours: number; source: string }[] }[] } | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState('');
  const [showReadinessHours, setShowReadinessHours] = useState(false);
  const periodKey = `${year}-${String(month).padStart(2, '0')}`;
  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true); setReadinessError(''); setReadiness(null);
    try { const res = await api.get('/guard-payroll/readiness', { params: { periodKey } }); setReadiness(res.data.data); }
    catch (e: any) { setReadinessError(e.response?.data?.message || 'Unable to verify readiness. Retry before calculating.'); }
    finally { setReadinessLoading(false); }
  }, [periodKey]);
  useEffect(() => { if (!detail && tab === 'runs') loadReadiness(); }, [detail, tab, loadReadiness]);
  const [actionText, setActionText] = useState('');
  const [dedModal, setDedModal] = useState<{
    employeeId: string;
    name: string;
    amount?: number | null;
    label?: string;
  } | null>(null);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [payslipRecordId, setPayslipRecordId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  // Attendance summary stays collapsed until explicitly opened.
  const [showAttendance, setShowAttendance] = useState(false);

  // Banks actually used in this run (staff + guard snapshots) — export menu.
  const [banksInUse, setBanksInUse] = useState<{ bank: string; count: number }[]>([]);
  // Site filter for the records table ('ALL' = no filter).
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [guardSearch, setGuardSearch] = useState('');
  const [statutoryGuard, setStatutoryGuard] = useState('');
  const [taxCenter, setTaxCenter] = useState('');
  const [pensionCenter, setPensionCenter] = useState('');

  const siteOptions = (() => {
    const map = new Map<string, string>();
    (detail?.records || []).forEach((r) => {
      const psid = (r.primarySite as any)?.siteId;
      const id = psid?._id ? String(psid._id) : String(psid || '');
      if (id && !map.has(id)) map.set(id, r.primarySite.siteName || id);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  })();
  const filteredRecords = (detail?.records || []).filter((r) => {
    if (siteFilter !== 'ALL') {
      const psid = (r.primarySite as any)?.siteId;
      const id = psid?._id ? String(psid._id) : String(psid || '');
      if (id !== siteFilter) return false;
    }
    if (guardSearch.trim()) {
      const q = guardSearch.trim().toLowerCase();
      const hay = `${r.snapshot.fullName} ${r.snapshot.employeeCode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleExportBank = async (bank: string) => {
    if (!detail?.run._id) return;
    const filterQuery = bank !== 'ALL' ? `?bank=${encodeURIComponent(bank)}` : '';
    try {
      await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/bank${filterQuery}`, `bank-disbursement-${bank}-${detail.run.periodKey}.csv`);
      setNotice('Payment instructions generated. No money was transferred; confirm execution with the bank before recording payment.');
    } catch (e: any) { setError(e.response?.data?.message || 'Unable to generate bank instructions. Check approval and bank details.'); }
    setExportMenuOpen(false);
  };

  const handleExportTax = async (taxBranch?: string) => {
    if (!detail?.run._id) return;
    const q = taxBranch ? `?taxBranch=${encodeURIComponent(taxBranch)}` : '';
    try { await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/tax${q}`, `tax-declaration-${taxBranch || 'ALL'}-${detail.run.periodKey}.csv`); setNotice('Income tax register downloaded.'); }
    catch (e: any) { setError(e.response?.data?.message || 'Unable to download the income tax register.'); }
    setExportMenuOpen(false);
  };

  const handleExportPension = async (pensionCenter?: string) => {
    if (!detail?.run._id) return;
    const q = pensionCenter ? `?pensionCenter=${encodeURIComponent(pensionCenter)}` : '';
    try { await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/pension${q}`, `pension-remittance-${pensionCenter || 'ALL'}-${detail.run.periodKey}.csv`); setNotice('Pension register downloaded.'); }
    catch (e: any) { setError(e.response?.data?.message || 'Unable to download the pension register.'); }
    setExportMenuOpen(false);
  };

  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/guard-payroll/runs');
      setRuns(res.data.data || []);
      setError(null);
    } catch (e: any) {
      setError(errMsg(e, 'Unable to load payroll runs. Please retry.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true);      setSiteFilter('ALL');
    setShowAttendance(false);
    try {
      const res = await api.get(`/guard-payroll/runs/${runId}`);
      setDetail(res.data.data);
      setError(null);
      // Load the distinct banks used in this period (staff + guard combined).
      const periodKey = res.data.data?.run?.periodKey;
      try {
        const b = await api.get('/guard-payroll/banks', { params: periodKey ? { periodKey } : {} });
        setBanksInUse(b.data?.data || []);
      } catch {
        setBanksInUse([]); // non-fatal: menu still shows CBE / Awash / ALL
      }
    } catch (e) {
      setError(errMsg(e, 'Failed to load run'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const calculate = async () => {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    setCalculating(true);
    setError(null);
    try {
      const res = await api.post('/guard-payroll/runs', { periodKey });
      setNotice(`Payroll calculated for ${periodKey}. Review each guard before submitting.`);
      await loadRuns();
      setDetail(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Calculation failed'));
    } finally {
      setCalculating(false);
    }
  };

  const runAction = async (runId: string, action: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/guard-payroll/runs/${runId}/${action}`, body || {});
      setDetail(res.data.data);
      await loadRuns();
      setActionModal(null);
      setActionText('');
      setConfirmAction(null);
      setNotice(`Payroll ${action === 'pay' ? 'recorded as paid (manual confirmation only)' : action === 'recalculate' ? 'recalculated' : action === 'return' ? 'returned for correction' : action + ' completed'}.`);
    } catch (e) {
      setError(errMsg(e, `Failed to ${action}`));
    } finally {
      setBusy(false);
    }
  };

  const run = detail?.run;
  const canInputDeductions = can(user?.permissions, 'guard-payroll.rates') && !!run && ['DRAFT', 'CALCULATED', 'RETURNED'].includes(run.status);

  /** "2026-11" → "November 2026" — month names instead of raw period keys. */
  const monthLabelOf = (periodKey?: string) => {
    const [y, m] = (periodKey || '').split('-').map(Number);
    return y && m ? `${monthNameOf(m)} ${y}` : periodKey || '';
  };

  /** Audit-ready payroll register: one row per guard with all money lines. */
  const exportRegister = () => {
    if (!detail) return;
    const rows: (string | number | null | undefined)[][] = [
      ['Code', 'Name', 'Primary site', 'Additional sites', 'Gross', 'Pension EE', 'Pension ER', 'Tax', 'Deductions', 'Net pay'],
      ...detail.records.map((r) => [
        r.snapshot.employeeCode,
        r.snapshot.fullName,
        r.primarySite.siteName,
        r.additionalSites.length,
        r.grossEarnings,
        r.employeePension,
        r.employerPension,
        r.incomeTax,
        r.totalDeductions,
        r.netPay,
      ]),
      [
        'TOTAL',
        `${detail.records.length} guards`,
        '',
        '',
        run?.totals.grossEarnings ?? '',
        run?.totals.employeePension ?? '',
        run?.totals.employerPension ?? '',
        run?.totals.incomeTax ?? '',
        run?.totals.totalDeductions ?? '',
        run?.totals.netPay ?? '',
      ],
    ];
    downloadCsv(`guard-payroll-register-${detail.run.periodKey}.csv`, rows);
  };

  /** Printable payslip for one guard record. */
  const openPayslip = (rec: PayrollRecord) => {
    const p = rec.primarySite;
    printPayslip({
      title: `Payslip — ${rec.snapshot.fullName} — ${rec.periodKey}`,
      periodLabel: monthLabelOf(rec.periodKey),
      employeeLine: `${rec.snapshot.fullName} · ${rec.snapshot.employeeCode} · ${p.siteName}`,
      sections: [
        {
          heading: 'Earnings (primary site)',
          rows: [
            ['Compensation', fmtMoney(p.compensationAmount)],
            ['Normal hours pay', fmtMoney(p.normalPay)],
            ['Holiday pay', fmtMoney(p.holidayPay)],
            ['Sunday pay', fmtMoney(p.sundayPay)],
            ['Transport (non-taxable)', fmtMoney(p.transportPaid)],
            ['Additional sites', fmtMoney(rec.additionalSites.reduce((s, x) => s + x.siteEarnings, 0))],
            ['Gross earnings', fmtMoney(rec.grossEarnings), true],
          ],
        },
        {
          heading: 'Deductions',
          rows: [
            ['Employee pension', fmtMoney(rec.employeePension)],
            ...rec.deductions.map((d) => [`${d.type} — ${d.label}`, fmtMoney(d.amount)] as [string, string, boolean?]),
            ['Income tax', fmtMoney(rec.incomeTax)],
            ['Total deductions', fmtMoney(rec.employeePension + rec.incomeTax + rec.totalDeductions), true],
          ],
        },
        {
          heading: 'Net pay',
          rows: [['NET PAY', fmtMoney(rec.netPay), true]],
        },
      ],
      footer: 'Computer-generated payslip — snapshots at calculation time. Employer pension is not deducted from the employee.',
    });
  };

  const attNameOf = useCallback(
    (employeeId: string) => {
      const rec = detail?.records.find((r) => r.employeeId?.toString() === employeeId);
      return rec ? `${rec.snapshot.fullName} (${rec.snapshot.employeeCode})` : employeeId;
    },
    [detail]
  );

  const openAttendanceDeduction = (row: StaffAttRow | GuardAttRow) => {
    setDedModal({
      employeeId: row.employeeId,
      name: attNameOf(row.employeeId),
      amount: row.suggestedAmount,
      label: row.suggestedAmount != null ? t('attBasedDeduction') : '',
    });
  };

  /** Group run problems by root cause — one entry per distinct (code, message),
   *  with the count and affected guards so a recurring data defect reports once. */
  const groupedProblems = (() => {
    const map = new Map<string, { key: string; code: string; message: string; count: number; guards: string[]; employeeIds: string[] }>();
    for (const p of run?.problems || []) {
      const key = `${p.code}::${p.message}`;
      const g = map.get(key);
      const who = [p.guardName, p.employeeCode].filter(Boolean).join(' · ') || 'Guard';
      if (g) { g.count += 1; if (!g.guards.includes(who)) g.guards.push(who); if (!g.employeeIds.includes(String(p.employeeId))) g.employeeIds.push(String(p.employeeId)); }
      else map.set(key, { key, code: p.code, message: p.message, count: 1, guards: [who], employeeIds: [String(p.employeeId)] });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  /** Where to send the user to fix the root cause of a problem code. */
  const problemFixTab: (code: string) => 'compensation' | 'deductions' | 'settings' | null = (code) => {
    const c = code.toLowerCase();
    if (c.includes('primary') || c.includes('assignment') || c.includes('attendance')) return null;
    if (c.includes('compensation') || c.includes('rate')) return 'compensation';
    if (c.includes('deduction') || c.includes('loan')) return 'deductions';
    if (c.includes('config') || c.includes('assignment') || c.includes('overlap')) return 'settings';
    return null;
  };

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <div><h1 className="text-xl font-semibold text-ink">Guard Payroll</h1><p className="mt-1 text-sm text-muted">Prepare attendance, review site-by-site pay, then approve and record payment.</p></div>
      <ol aria-label="Payroll workflow" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-3 text-xs text-muted">
        {['Setup & readiness', 'Attendance review', 'Calculate payroll', 'Results review', 'Guard breakdown', 'Approval & payment'].map((step, i) => <li key={step} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-subtle text-ink">{i + 1}</span>{step}</li>)}
      </ol>
      {detail ? (
        <button
          onClick={() => setDetail(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-sm font-medium text-muted hover:text-ink hover:bg-subtle transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          {t('back')}
        </button>
      ) : (
        <div className="border-b border-line overflow-x-auto">
          <Tabs
            tabs={[
              { key: 'runs', label: t('gpRuns') },
              { key: 'compensation', label: t('gpSiteCompensation') },
              { key: 'deductions', label: t('gpDeductions') },
              { key: 'settings', label: t('gpSettings') },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      )}

      {!detail ? (
        <>

          {error && (
            <div className="rounded-xl border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger-text flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-success-line bg-success-subtle px-4 py-3 text-sm text-success-text">{notice}</div>
          )}

          {tab === 'runs' && (
            <div className="space-y-4">
              <Card className="p-4" data-tour="gp-runs-actions">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-32">
                    <Select aria-label="Payroll year" label="Payroll year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-44">
                    <Select aria-label="Payroll month" label="Payroll month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{monthNameOf(i + 1)}</option>
                      ))}
                    </Select>
                  </div>
                  {canCalculate && (
                    <>
                      <Button onClick={calculate} disabled={calculating || readinessLoading || !readiness?.ready || readiness.lock.locked} className="flex items-center gap-2">
                        <Calculator size={16} />
                        {calculating ? 'Calculating payroll…' : t('gpCalculate')}
                      </Button>
                      <ActionHint
                        label="Calculate payroll"
                        does="Creates this month's run and computes every guard from recorded monthly hours and each site's effective compensation — nothing is final until you review and submit."
                        warning="Recalculation replaces the editable draft with current inputs; review the results table before submitting."
                        requires="All readiness items green — contracts, exactly one primary site per guard, site compensation, and recorded hours"
                      />
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-subtext">
                  {monthNameOf(month)} {year} · {t('gpPeriod')}: {year}-{String(month).padStart(2, '0')}
                </p>
              </Card>

              <Card className="p-4 space-y-3" data-tour="gp-readiness">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink">Setup & readiness — {monthNameOf(month)} {year}</h2><Button variant="outline" disabled={readinessLoading} onClick={loadReadiness}>Refresh readiness</Button></div>
                {readinessLoading ? <LoadingSpinner /> : readinessError ? <p role="alert" className="text-sm text-danger-text">{readinessError}</p> : readiness && <>
                  <p role="status" className="text-sm text-muted"><Badge variant={readiness.lock.locked ? 'info' : readiness.ready ? 'success' : 'warning'}>{readiness.lock.locked ? 'Saved payroll — locked' : readiness.ready ? 'Ready to calculate' : 'Action required'}</Badge> <span className="ml-2">{readiness.guardCount} guards · {readiness.lock.locked ? `Attendance locked (${readiness.lock.runStatus}). Open the saved run to review.` : 'Attendance is editable. Refresh after making corrections.'}</span></p>
                  {readiness.issues.length > 0 && <ul className="max-h-56 overflow-auto space-y-1 text-sm text-danger-text">{readiness.issues.map((issue, i) => <li key={i}>{issue.employeeCode && <b>{issue.employeeCode}: </b>}{issue.message}</li>)}</ul>}
                  <div className="flex flex-wrap gap-4 text-sm"><Link className="text-primary-600 hover:underline" to="/guards">Review assignments</Link><Link className="text-primary-600 hover:underline" to="/attendance">Enter attendance</Link><button className="text-primary-600 hover:underline" onClick={() => setTab('compensation')}>Compensation rates</button><button className="text-primary-600 hover:underline" onClick={() => setTab('settings')}>Tax & pension settings</button></div>
                  <button aria-expanded={showReadinessHours} className="text-sm font-medium text-ink hover:underline" onClick={() => setShowReadinessHours(!showReadinessHours)}>{showReadinessHours ? 'Hide' : 'Review'} attendance & rates by guard and site</button>
                  {showReadinessHours && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-muted border-b border-line"><th className="p-2">Guard</th><th className="p-2">Site / role</th><th className="p-2 text-right">Compensation</th><th className="p-2 text-right">Normal</th><th className="p-2 text-right">Sunday</th><th className="p-2 text-right">Holiday</th><th className="p-2">Source</th></tr></thead><tbody>{readiness.rows.flatMap(g => g.sites.map((s, i) => <tr key={`${g.employeeCode}-${i}`} className="border-b border-line text-ink"><td className="p-2">{g.employeeCode}</td><td className="p-2">{s.siteName}<small className="block text-muted">{s.isPrimary ? 'Primary' : 'Additional'}</small></td><td className="p-2 text-right">{s.compensationAmount === null ? 'Missing rate' : fmtMoney(s.compensationAmount)}</td><td className="p-2 text-right">{fmtHours(s.normalHours)}</td><td className="p-2 text-right">{fmtHours(s.sundayHours)}</td><td className="p-2 text-right">{fmtHours(s.holidayHours)}</td><td className="p-2">{s.source}</td></tr>))}</tbody></table></div>}
                </>}
              </Card>
              {loading ? (
                <LoadingSpinner />
              ) : runs.length === 0 ? (
                <EmptyState title={t('gpNoRun')} description="Complete the readiness requirements above, review attendance, then calculate payroll." />
              ) : (
                <Card className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                        <th className="px-4 py-3">{t('gpPeriod')}</th>
                        <th className="px-4 py-3">{t('status')}</th>
                        <th className="px-4 py-3">{t('gpGuards')}</th>
                        <th className="px-4 py-3 text-right">{t('gpGross')}</th>
                        <th className="px-4 py-3 text-right">{t('gpTax')}</th>
                        <th className="px-4 py-3 text-right">{t('gpNet')}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                          <td className="px-4 py-3 font-medium text-ink">{monthLabelOf(r.periodKey)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted">{r.totals.guards}</td>
                          <td className="px-4 py-3 text-right">{fmtMoney(r.totals.grossEarnings)}</td>
                          <td className="px-4 py-3 text-right">{fmtMoney(r.totals.incomeTax)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{fmtMoney(r.totals.netPay)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="outline" onClick={() => loadDetail(r._id)} className="flex items-center gap-1.5">
                              <Eye size={14} />
                              {t('gpViewDetail')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}              {tab === 'compensation' && <SiteCompensationTab onError={setError} />}
          {tab === 'deductions' && <DeductionsTab onError={setError} />}
          {tab === 'settings' && <ConfigTab onError={setError} />}
        </>
      ) : (
        /* ── RUN DETAIL ─────────────────────────────────────────── */
        detailLoading || !run ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-5" data-tour="gp-results">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  {t('gpPeriod')} {monthLabelOf(run.periodKey)}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                  <span className="text-xs text-subtext">
                    {t('gpGuards')}: {run.totals.guards}
                    {run.problems.length > 0 && <> · {t('gpProblems')}: {run.problems.length}</>}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2" data-tour="gp-lifecycle">
                {canCalculate && run.status === 'CALCULATED' && (
                  <Button variant="outline" disabled={busy} onClick={() => setConfirmAction({ runId: run._id, action: 'submit' })}>{t('gpSubmit')}</Button>
                )}
                {canCheck && run.status === 'SUBMITTED' && (
                  <Button variant="outline" disabled={busy} onClick={() => setConfirmAction({ runId: run._id, action: 'check' })}>{t('gpCheck')}</Button>
                )}
                {canApprove && run.status === 'CHECKED' && (
                  <Button disabled={busy} onClick={() => setConfirmAction({ runId: run._id, action: 'approve' })}>{t('gpApprove')}</Button>
                )}
                {canPay && run.status === 'APPROVED' && (
                  <Button disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'pay', runId: run._id }); }}>
                    <Wallet size={14} className="inline mr-1.5" />{t('gpMarkPaid')}
                  </Button>
                )}
                {canReturn && ['SUBMITTED', 'CHECKED', 'APPROVED'].includes(run.status) && (
                  <Button variant="outline" disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'return', runId: run._id }); }}>
                    <Undo2 size={14} className="inline mr-1.5" />{t('gpReturn')}
                  </Button>
                )}
                {canCalculate && ['DRAFT', 'CALCULATED', 'RETURNED'].includes(run.status) && (
                  <Button variant="outline" disabled={busy || calculating} onClick={() => setConfirmAction({ runId: run._id, action: 'recalculate' })}>
                    <Clock size={14} className="inline mr-1.5" />{t('gpRecalculate')}
                  </Button>
                )}
                <div className="relative inline-block text-left">
                  <Button
                    variant="outline"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export
                  </Button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-surface border border-line rounded-xl shadow-card z-50 py-2 divide-y divide-line/60 max-h-[70vh] overflow-y-auto">
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Bank Payment Instructions (CSV)</p>
                        <button disabled={!['APPROVED', 'PAID'].includes(run.status)} onClick={() => handleExportBank('ALL')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors font-semibold">
                          All Banks Combined
                        </button>
                        {(banksInUse.length > 0
                          ? banksInUse.map((b) => ({ label: b.bank, count: b.count }))
                          : [
                              { label: 'CBE', count: 0 },
                              { label: 'Awash', count: 0 },
                            ]
                        ).map((b) => (
                          <button
                            key={b.label}
                            disabled={!['APPROVED', 'PAID'].includes(run.status)}
                            onClick={() => handleExportBank(b.label)}
                            className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors"
                          >
                            {b.label}{b.count > 0 ? ` (${b.count})` : ''}
                          </button>
                        ))}
                      </div>
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Statutory Compliance — Tax</p>
                        <button onClick={() => handleExportTax()} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors font-semibold">
                          Guard Income Tax Register
                        </button>
                        <button onClick={() => handleExportTax('GUARD')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Guards — Private Org Income Tax
                        </button>

                      </div>
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Statutory Compliance — Pension</p>
                        <button onClick={() => handleExportPension()} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors font-semibold">
                          Guard Pension Register
                        </button>
                        <button onClick={() => handleExportPension('GUARD')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          POESSA Private Organization (Guards)
                        </button>

                      </div>
                      <div className="py-1">
                        <button onClick={() => { exportRegister(); setExportMenuOpen(false); }} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors font-semibold">
                          Full Payroll Register (CSV)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger-text">{error}</div>
            )}

            {notice && <p role="status" className="rounded-lg border border-success-line bg-success-subtle p-3 text-sm text-success-text">{notice}</p>}
            <p className="text-sm text-muted">{['DRAFT', 'CALCULATED', 'RETURNED'].includes(run.status) ? 'Attendance and setup remain editable. Recalculate after any change; submission locks the period.' : run.status === 'PAID' ? 'Final paid snapshot. Attendance and payroll cannot be reopened. Payment was recorded manually, not executed by this system.' : 'Attendance is locked. Return for correction with a reason before changing inputs.'}</p>
            {/* Totals — net pay gets emphasis; cards are tabular in light and dark. */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: t('gpGross'), value: run.totals.grossEarnings, tone: 'default' as const },
                { label: `${t('gpPension')} (EE)`, value: run.totals.employeePension, tone: 'default' as const },
                { label: `${t('gpPension')} (ER)`, value: run.totals.employerPension, tone: 'default' as const },
                { label: t('gpTax'), value: run.totals.incomeTax, tone: 'default' as const },
                { label: t('gpDeductions'), value: run.totals.totalDeductions, tone: 'default' as const },
                { label: t('gpNet'), value: run.totals.netPay, tone: 'primary' as const },
              ].map((c) => (
                <Card key={c.label} className={`p-3 ${c.tone === 'primary' ? 'border border-primary-500/40 bg-primary-500/5' : ''}`}>
                  <p className="text-[11px] uppercase tracking-wide text-subtext">{c.label}</p>
                  <p className={`mt-1 text-sm font-semibold tabular-nums ${c.tone === 'primary' ? 'text-primary-600' : 'text-ink'}`}>{fmtMoney(c.value)}</p>
                </Card>
              ))}
            </div>

            <details className="rounded-xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-ink">Tax & pension register — saved calculation</summary>
              <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-3">
                <input aria-label="Filter statutory guard" className="v-input max-w-xs" placeholder="Guard name or identifier" value={statutoryGuard} onChange={(e) => setStatutoryGuard(e.target.value)} />
                <select aria-label="Tax center" className="v-input max-w-xs" value={taxCenter} onChange={(e) => setTaxCenter(e.target.value)}><option value="">All tax centers</option>{Array.from(new Set(detail.records.map((r) => (r.primarySite as any).taxCenter || 'Unspecified'))).map((c) => <option key={c}>{c}</option>)}</select>
                <select aria-label="Pension center" className="v-input max-w-xs" value={pensionCenter} onChange={(e) => setPensionCenter(e.target.value)}><option value="">All pension centers</option>{Array.from(new Set(detail.records.map((r) => (r.primarySite as any).pensionCenter || 'Unspecified'))).map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <p className="text-xs text-muted">Period {run.periodKey} · {run.status}. One row per guard; all additional earnings are included in taxable pay. Unspecified means the snapshot has no center, not a guessed center.</p>
              <div className="overflow-x-auto"><table className="w-full text-xs text-ink"><thead><tr className="text-left border-b border-line"><th className="p-2">Guard / centers</th><th className="p-2 text-right">Taxable earnings</th><th className="p-2 text-right">Non-taxable transport</th><th className="p-2 text-right">Tax payable</th><th className="p-2 text-right">Pension base</th><th className="p-2 text-right">Employee pension</th><th className="p-2 text-right">Employer expense</th></tr></thead><tbody>
              {(() => {
                const rows = detail.records.filter((r) => `${r.snapshot.fullName} ${r.snapshot.employeeCode}`.toLowerCase().includes(statutoryGuard.toLowerCase()) && (!taxCenter || ((r.primarySite as any).taxCenter || 'Unspecified') === taxCenter) && (!pensionCenter || ((r.primarySite as any).pensionCenter || 'Unspecified') === pensionCenter));
                const values = (r: PayrollRecord) => [r.taxableEarnings, r.primarySite.transportPaid, r.incomeTax, r.pensionBase, r.employeePension, r.employerPension];
                return <>{rows.map((r) => <tr key={r._id} className="border-b border-line"><td className="p-2">{r.snapshot.fullName} · {r.snapshot.employeeCode}<small className="block text-muted">{(r.primarySite as any).taxCenter || 'Unspecified tax center'} / {(r.primarySite as any).pensionCenter || 'Unspecified pension center'}</small></td>{values(r).map((n, i) => <td key={i} className="p-2 text-right tabular-nums">{fmtMoney(n)}</td>)}</tr>)}
                <tr className="font-semibold bg-subtle"><td className="p-2">Filtered total ({rows.length} guards)</td>{Array.from({ length: 6 }, (_, i) => <td key={i} className="p-2 text-right tabular-nums">{fmtMoney(rows.reduce((sum, r) => sum + values(r)[i], 0))}</td>)}</tr></>;
              })()}
              </tbody></table></div>
              </div>
            </details>
            {/* Validation issue center — grouped by root cause, with counts,
                affected guards and a direct correction link per group. */}
            {groupedProblems.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-danger-text">
                    <AlertTriangle size={15} />
                    Validation issues — {groupedProblems.length} cause{groupedProblems.length === 1 ? '' : 's'} affecting {run.problems.length} guard entr{run.problems.length === 1 ? 'y' : 'ies'}
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedProblems.map((g) => {
                    const fixTab = problemFixTab(g.code);
                    return (
                      <Card key={g.key} className="p-4 border border-danger-line bg-danger-subtle/60">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-danger-text">
                              {g.message}
                            </p>
                            <p className="text-xs text-danger-text/80 mt-0.5">
                              {g.count} guard{g.count === 1 ? '' : 's'} affected · cause code <span className="font-mono">{g.code}</span>
                            </p>
                            <p className="text-xs text-muted mt-1 max-w-2xl">
                              Affected: {g.guards.slice(0, 8).join(', ')}{g.guards.length > 8 ? ` +${g.guards.length - 8} more` : ''}
                            </p>
                          </div>
                          {!fixTab && <Link className="text-sm text-primary-600 hover:underline" to={g.code.includes('ATTENDANCE') ? '/attendance' : '/guards'}>Review {g.code.includes('ATTENDANCE') ? 'attendance' : 'assignments'}</Link>}
                          {fixTab && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setDetail(null); setTab(fixTab); }}
                              className="flex items-center gap-1.5 flex-shrink-0"
                            >
                              <Wrench size={13} />
                              Go to {fixTab === 'compensation' ? 'site compensation' : fixTab === 'deductions' ? 'deductions' : 'settings'}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Return history */}
            {run.returnHistory.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted mb-2">
                  <Undo2 size={14} />
                  {t('gpHistory')}
                </h4>
                <ul className="space-y-1 text-xs text-muted">
                  {run.returnHistory.map((h, i) => (
                    <li key={i}>• {h.reason} — {new Date(h.returnedAt).toLocaleString()}</li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Attendance summary — collapsed until opened via the toggle button */}
            {detail.attendance && (
              <div>
                <button
                  onClick={() => setShowAttendance((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-line bg-surface text-sm font-medium text-muted hover:text-ink hover:bg-subtle transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {showAttendance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showAttendance ? 'Hide attendance summary' : 'Show attendance summary'}
                  </span>
                  <span className="text-xs text-subtext">{detail.attendance.rows?.length ?? 0} rows</span>
                </button>
                {showAttendance && (
                  <div className="mt-3">
                    <AttendanceSummarySection
                      kind="GUARD"
                      rows={detail.attendance.rows}
                      daysInMonth={detail.attendance.daysInMonth}
                      nameOf={attNameOf}
                      onAddDeduction={openAttendanceDeduction}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Audit trail — lifecycle events for this run */}
            <details className="rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer text-sm font-medium text-ink">Lifecycle audit trail</summary><div className="mt-3"><PayrollAuditCard runId={run._id} /></div></details>

            {/* Guards — filterable by primary site and searchable by name. */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-muted">{t('gpGuards')} ({filteredRecords.length}{siteFilter !== 'ALL' ? ` of ${detail.records.length}` : ''})</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  aria-label="Search guards"
                  className="v-input w-56"
                  placeholder="Search name or code"
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                />
                <div className="w-56">
                  <Select
                    aria-label="Filter primary site"
                    label=""
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                  >
                    <option value="ALL">All sites</option>
                    {siteOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                    <th className="px-4 py-3">{t('gpGuards')}</th>
                    <th className="px-4 py-3">{t('gpPrimarySite')}</th>
                    <th className="px-4 py-3 text-right">Primary-site pay</th>
                    <th className="px-4 py-3">{t('gpAdditionalSites')}</th>
                    <th className="px-4 py-3 text-right">{t('gpGross')}</th>
                    <th className="px-4 py-3 text-right">{t('gpTax')}</th>
                    <th className="px-4 py-3 text-right">{t('gpPension')}</th>
                    <th className="px-4 py-3 text-right">{t('gpDeductions')}</th>
                    <th className="px-4 py-3 text-right">{t('gpNet')}</th>
                    <th className="px-4 py-3 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{rec.snapshot.fullName}</p>
                        <p className="text-xs text-subtext">{rec.snapshot.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{rec.primarySite.siteName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{fmtMoney(rec.primarySite.siteEarnings)}<small className="block text-subtext">Incl. transport {fmtMoney(rec.primarySite.transportPaid)}</small></td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {rec.additionalSites.length === 0 ? (
                          <span className="text-xs text-subtext">—</span>
                        ) : (
                          <span className="text-xs text-muted" title={rec.additionalSites.map((s) => `${s.siteName}: ${s.totalHours}h × ${s.otRate}`).join('\n')}>
                            {fmtMoney(rec.additionalSites.reduce((s, x) => s + x.siteEarnings, 0))}
                            <small className="block text-subtext">{rec.additionalSites.length} site(s) · {rec.additionalSites.reduce((s, x) => s + x.totalHours, 0)}h</small>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(rec.grossEarnings)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{fmtMoney(rec.incomeTax)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{fmtMoney(rec.employeePension)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{fmtMoney(rec.totalDeductions)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">{fmtMoney(rec.netPay)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          {canInputDeductions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDedModal({
                                  employeeId: rec.employeeId.toString(),
                                  name: `${rec.snapshot.fullName} (${rec.snapshot.employeeCode})`,
                                })
                              }
                              title={t('attBasedDeduction')}
                            >
                              <CirclePlus size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPayslipRecordId(rec._id);
                              setPayslipModalOpen(true);
                            }}
                            title="Official Payslip"
                          >
                            <Eye size={14} className="text-primary-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openPayslip(rec)} title={t('payslip')}>
                            <Printer size={14} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRecord(rec)}>{t('gpViewDetail')}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted">
                        <CheckCircle2 size={18} className="inline mr-2" />
                        {siteFilter !== 'ALL' || guardSearch ? 'No payroll records match the current filters' : 'No payable records. Resolve the validation issues, then recalculate.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredRecords.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-line bg-subtle/70 text-xs font-semibold text-ink">
                      <td className="px-4 py-2.5" colSpan={2}>Total ({filteredRecords.length} guards)</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.primarySite.siteEarnings, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.additionalSites.reduce((n, a) => n + a.siteEarnings, 0), 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.grossEarnings, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.incomeTax, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.employeePension, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(filteredRecords.reduce((s, r) => s + r.totalDeductions, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-primary-600">{fmtMoney(filteredRecords.reduce((s, r) => s + r.netPay, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </Card>
          </div>
        )
      )}

      <Modal open={!!confirmAction} onClose={() => !busy && setConfirmAction(null)} title="Confirm payroll action">
        <div className="space-y-4"><p className="text-sm text-muted">{confirmAction?.action === 'submit' ? 'Submit this reviewed payroll? Attendance will be locked for the period. Any changed inputs require recalculation first.' : confirmAction?.action === 'approve' ? 'Approve this checked payroll? Applicable loan and advance balances will be settled.' : confirmAction?.action === 'recalculate' ? 'Replace the editable calculation with current attendance, rates and deductions? Review the new results before submitting.' : 'Confirm that all guard results and statutory deductions have been checked.'}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirmAction(null)}>Cancel</Button><Button disabled={busy} onClick={() => confirmAction && runAction(confirmAction.runId, confirmAction.action)}>{busy ? 'Working…' : 'Confirm'}</Button></div></div>
      </Modal>
      {/* Record breakdown modal */}
      <Modal open={!!record} onClose={() => setRecord(null)} title={record ? `${record.snapshot.fullName} · ${monthLabelOf(record.periodKey)}` : ''} size="xl">
        {record && <PayrollRecordDetail record={record} />}
      </Modal>

      {/* Per-employee deduction input (attendance / penalty / loan) */}
      <AddDeductionModal
        open={!!dedModal}
        onClose={() => setDedModal(null)}
        onSaved={async () => {
          if (detail) await loadDetail(detail.run._id);
        }}
        employeeId={dedModal?.employeeId || ''}
        employeeName={dedModal?.name || ''}
        periodKey={detail?.run.periodKey || ''}
        defaultAmount={dedModal?.amount ?? null}
        defaultLabel={dedModal?.label}
      />

      {/* Return-for-correction / mark-paid modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'return' ? t('gpReturn') : t('gpMarkPaid')}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {actionModal?.type === 'return' ? t('gpReturnReason') : 'Record only a reconciled test/bank payment reference. This final action does not transfer money and cannot be undone.'}
          </p>
          <input
            className="v-input w-full"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder={actionModal?.type === 'return' ? t('gpReturnReason') : t('gpPaymentRef')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionModal(null)}>{t('cancel')}</Button>
            <Button
              disabled={busy || !actionText.trim()}
              onClick={() =>
                actionModal &&
                (actionModal.type === 'return'
                  ? runAction(actionModal.runId, 'return', { reason: actionText })
                  : runAction(actionModal.runId, 'pay', { paymentRef: actionText || undefined }))
              }
            >
              {actionModal?.type === 'return' ? t('gpReturn') : t('gpMarkPaid')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Official Payslip Modal with Print/Download */}
      <PayslipModal
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
        recordId={payslipRecordId}
        type="GUARD"
      />
    </div>
  );
}

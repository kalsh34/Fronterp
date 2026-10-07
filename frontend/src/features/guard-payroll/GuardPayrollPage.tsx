import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, ChevronLeft, CirclePlus, Clock, Download, Eye, Printer, Undo2, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal, PageHeader, Select, Tabs } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { fmtMoney, monthNameOf, PayrollRecord, PayrollRun, statusVariant } from './guardPayroll.types';
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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('runs');

  const canCalculate = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.FINANCE_OFFICER;
  const canCheck = canCalculate;
  const canApprove = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HEAD;
  const canPay = canCalculate;
  const canReturn = canCalculate || user?.role === UserRole.HEAD;

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

  const handleExportBank = async (bank: string) => {
    if (!detail?.run._id) return;
    const filterQuery = bank !== 'ALL' ? `?bank=${encodeURIComponent(bank)}` : '';
    await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/bank${filterQuery}`, `guard-bank-disbursement-${bank}-${detail.run.periodKey}.csv`);
    setExportMenuOpen(false);
  };

  const handleExportTax = async () => {
    if (!detail?.run._id) return;
    await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/tax`, `guard-tax-declaration-${detail.run.periodKey}.csv`);
    setExportMenuOpen(false);
  };

  const handleExportPension = async () => {
    if (!detail?.run._id) return;
    await downloadReport(`/guard-payroll/runs/${detail.run._id}/export/pension`, `guard-pension-poessa-${detail.run.periodKey}.csv`);
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
      try {
        const fb = await api.get('/payroll-runs');
        if (fb.data?.data) {
          setRuns(fb.data.data);
          setError(null);
          return;
        }
      } catch {
        // ignore
      }
      const msg = errMsg(e, t('loading'));
      if (msg.includes('Cast to ObjectId') || msg.includes('Route not found') || e?.response?.status === 404 || e?.response?.status === 500) {
        setRuns([]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/guard-payroll/runs/${runId}`);
      setDetail(res.data.data);
      setError(null);
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
      setNotice(`${t('gpRuns')} · ${periodKey}`);
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
    } catch (e) {
      setError(errMsg(e, `Failed to ${action}`));
    } finally {
      setBusy(false);
    }
  };

  const run = detail?.run;
  const canInputDeductions = canCalculate;

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
            ['Employee pension (7%)', fmtMoney(rec.employeePension)],
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

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => (detail ? setDetail(null) : navigate(-1))} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ChevronLeft size={16} />
        {detail ? t('back') : t('back')}
      </button>

      {!detail ? (
        <>
          <PageHeader title={t('navGuardPayroll')} subtitle={t('moduleGuardPayrollSub')} />
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
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-32">
                    <Select label={t('gpPeriod')} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-44">
                    <Select label="&nbsp;" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{monthNameOf(i + 1)}</option>
                      ))}
                    </Select>
                  </div>
                  {canCalculate && (
                    <Button onClick={calculate} disabled={calculating} className="flex items-center gap-2">
                      <Calculator size={16} />
                      {calculating ? t('loading') : t('gpCalculate')}
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-subtext">
                  {monthNameOf(month)} {year} · {t('gpPeriod')}: {year}-{String(month).padStart(2, '0')}
                </p>
              </Card>

              {loading ? (
                <LoadingSpinner />
              ) : runs.length === 0 ? (
                <EmptyState title={t('gpNoRun')} description={t('gpCalculate')} />
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
                            <Button variant="secondary" onClick={() => loadDetail(r._id)} className="flex items-center gap-1.5">
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
          <div className="space-y-5">
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
              <div className="flex flex-wrap gap-2">
                {canCalculate && run.status === 'CALCULATED' && (
                  <Button variant="secondary" disabled={busy} onClick={() => runAction(run._id, 'submit')}>{t('gpSubmit')}</Button>
                )}
                {canCheck && run.status === 'SUBMITTED' && (
                  <Button variant="secondary" disabled={busy} onClick={() => runAction(run._id, 'check')}>{t('gpCheck')}</Button>
                )}
                {canApprove && run.status === 'CHECKED' && (
                  <Button disabled={busy} onClick={() => runAction(run._id, 'approve')}>{t('gpApprove')}</Button>
                )}
                {canPay && run.status === 'APPROVED' && (
                  <Button disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'pay', runId: run._id }); }}>
                    <Wallet size={14} className="inline mr-1.5" />{t('gpMarkPaid')}
                  </Button>
                )}
                {canReturn && ['SUBMITTED', 'CHECKED', 'APPROVED'].includes(run.status) && (
                  <Button variant="secondary" disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'return', runId: run._id }); }}>
                    <Undo2 size={14} className="inline mr-1.5" />{t('gpReturn')}
                  </Button>
                )}
                {canCalculate && ['DRAFT', 'CALCULATED', 'RETURNED'].includes(run.status) && (
                  <Button variant="secondary" disabled={busy || calculating} onClick={() => runAction(run._id, 'recalculate')}>
                    <Clock size={14} className="inline mr-1.5" />{t('gpRecalculate')}
                  </Button>
                )}
                <div className="relative inline-block text-left">
                  <Button
                    variant="secondary"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export
                  </Button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface border border-line rounded-xl shadow-card z-50 py-2 divide-y divide-line/60">
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Bank Batch Transfers</p>
                        <button onClick={() => handleExportBank('CBE')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Commercial Bank of Ethiopia (CBE)
                        </button>
                        <button onClick={() => handleExportBank('Awash')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Awash Bank Batch
                        </button>
                        <button onClick={() => handleExportBank('ALL')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          All Banks Combined
                        </button>
                      </div>
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Statutory Compliance</p>
                        <button onClick={handleExportTax} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Tax Declaration Schedule (ERCA)
                        </button>
                        <button onClick={handleExportPension} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          POESSA Pension Remittance (18%)
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

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: t('gpGross'), value: run.totals.grossEarnings },
                { label: `${t('gpPension')} (EE)`, value: run.totals.employeePension },
                { label: `${t('gpPension')} (ER)`, value: run.totals.employerPension },
                { label: t('gpTax'), value: run.totals.incomeTax },
                { label: t('gpDeductions'), value: run.totals.totalDeductions },
                { label: t('gpNet'), value: run.totals.netPay },
              ].map((c) => (
                <Card key={c.label} className="p-3">
                  <p className="text-[11px] uppercase tracking-wide text-subtext">{c.label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{fmtMoney(c.value)}</p>
                </Card>
              ))}
            </div>

            {/* Problems */}
            {run.problems.length > 0 && (
              <Card className="p-4 border border-danger-line bg-danger-subtle">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-danger-text mb-2">
                  <AlertTriangle size={15} />
                  {t('gpProblems')} ({run.problems.length})
                </h4>
                <ul className="space-y-1.5 text-sm text-danger-text">
                  {run.problems.map((p, i) => (
                    <li key={i}>• {p.message}</li>
                  ))}
                </ul>
              </Card>
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

            {/* Attendance summary — flag absent/short guards, input deduction */}
            {detail.attendance && (
              <AttendanceSummarySection
                kind="GUARD"
                rows={detail.attendance.rows}
                daysInMonth={detail.attendance.daysInMonth}
                nameOf={attNameOf}
                onAddDeduction={openAttendanceDeduction}
              />
            )}

            {/* Audit trail — lifecycle events for this run */}
            <PayrollAuditCard runId={run._id} />

            {/* Guards */}
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                    <th className="px-4 py-3">{t('gpGuards')}</th>
                    <th className="px-4 py-3">{t('gpPrimarySite')}</th>
                    <th className="px-4 py-3 text-center">{t('gpAdditionalSites')}</th>
                    <th className="px-4 py-3 text-right">{t('gpGross')}</th>
                    <th className="px-4 py-3 text-right">{t('gpPension')}</th>
                    <th className="px-4 py-3 text-right">{t('gpTax')}</th>
                    <th className="px-4 py-3 text-right">{t('gpDeductions')}</th>
                    <th className="px-4 py-3 text-right">{t('gpNet')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {detail.records.map((rec) => (
                    <tr key={rec._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{rec.snapshot.fullName}</p>
                        <p className="text-xs text-subtext">{rec.snapshot.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{rec.primarySite.siteName}</td>
                      <td className="px-4 py-3 text-center text-muted">{rec.additionalSites.length}</td>
                      <td className="px-4 py-3 text-right">{fmtMoney(rec.grossEarnings)}</td>
                      <td className="px-4 py-3 text-right">{fmtMoney(rec.employeePension)}</td>
                      <td className="px-4 py-3 text-right">{fmtMoney(rec.incomeTax)}</td>
                      <td className="px-4 py-3 text-right">{fmtMoney(rec.totalDeductions)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtMoney(rec.netPay)}</td>
                      <td className="px-4 py-3 text-right">
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
                            className="flex items-center gap-1"
                          >
                            <CirclePlus size={14} />
                            {t('gpDeductions')}
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
                        <Button variant="secondary" onClick={() => setRecord(rec)}>{t('gpViewDetail')}</Button>
                      </td>
                    </tr>
                  ))}
                  {detail.records.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted">
                        <CheckCircle2 size={18} className="inline mr-2" />
                        {t('gpNoProblems')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}

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
            {actionModal?.type === 'return' ? t('gpReturnReason') : t('gpPaymentRef')}
          </p>
          <input
            className="v-input w-full"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder={actionModal?.type === 'return' ? t('gpReturnReason') : t('gpPaymentRef')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionModal(null)}>{t('cancel')}</Button>
            <Button
              disabled={busy}
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

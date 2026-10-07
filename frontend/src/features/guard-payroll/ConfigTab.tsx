import { useCallback, useEffect, useMemo, useState } from 'react';
import { Percent, Save } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { fmtMoney } from './guardPayroll.types';

interface ConfigShape {
  transportPercent: number;
  standardMonthlyHours: number;
  sundayStructuralHours: number;
  basicHourlyDivisor: number;
}

interface TaxTable {
  _id: string;
  name: string;
  effectiveFrom: string;
  brackets: { min: number; max: number | null; rate: number }[];
}

interface PensionRuleRow {
  _id: string;
  name: string;
  employeePercent: number;
  employerPercent: number;
  effectiveFrom: string;
}

/** Payroll settings: engine constants, tax tables, pension rules + a rate preview. */
export function ConfigTab({ onError }: { onError: (msg: string | null) => void }) {
  const t = useT();
  const { user } = useAuthStore();
  const canEdit = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.FINANCE_OFFICER;

  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [taxTables, setTaxTables] = useState<TaxTable[]>([]);
  const [pensionRules, setPensionRules] = useState<PensionRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [taxForm, setTaxForm] = useState({ name: '', effectiveFrom: '', brackets: '0,2000,0\n2000,4000,15\n4000,7000,20\n7000,10000,25\n10000,14000,30\n14000,,35' });
  const [pensionForm, setPensionForm] = useState({ name: '', employeePercent: '7', employerPercent: '11', effectiveFrom: '' });
  const [previewComp, setPreviewComp] = useState('12000');

  const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Request failed';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, taxRes, pensionRes] = await Promise.all([
        api.get('/guard-payroll/config'),
        api.get('/payroll-common/tax-brackets'),
        api.get('/payroll-common/pension-rules'),
      ]);
      setConfig(cfgRes.data.data);
      setTaxTables(taxRes.data.data || []);
      setPensionRules(pensionRes.data.data || []);
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

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/guard-payroll/config', {
        transportPercent: Number(config.transportPercent),
        standardMonthlyHours: Number(config.standardMonthlyHours),
        sundayStructuralHours: Number(config.sundayStructuralHours),
        basicHourlyDivisor: Number(config.basicHourlyDivisor),
      });
      onError(null);
      await load();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const addTaxTable = async () => {
    const brackets = taxForm.brackets
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [min, max, rate] = line.split(',').map((s) => s.trim());
        return { min: Number(min), max: max === '' || max === undefined ? null : Number(max), rate: Number(rate) };
      });
    try {
      await api.post('/payroll-common/tax-brackets', {
        name: taxForm.name,
        effectiveFrom: taxForm.effectiveFrom,
        brackets,
      });
      setTaxForm({ ...taxForm, name: '', effectiveFrom: '' });
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const addPensionRule = async () => {
    try {
      await api.post('/payroll-common/pension-rules', {
        name: pensionForm.name,
        employeePercent: Number(pensionForm.employeePercent),
        employerPercent: Number(pensionForm.employerPercent),
        effectiveFrom: pensionForm.effectiveFrom,
      });
      setPensionForm({ ...pensionForm, name: '', effectiveFrom: '' });
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const preview = useMemo(() => {
    if (!config) return null;
    const comp = Number(previewComp);
    if (!Number.isFinite(comp) || comp <= 0) return null;
    const otRate = comp / config.standardMonthlyHours;
    const sundayStructural = otRate * config.sundayStructuralHours;
    const remaining = comp - sundayStructural;
    const transport = (remaining * config.transportPercent) / 100;
    const basic = remaining - transport;
    const basicHourly = basic / config.basicHourlyDivisor;
    return { otRate, sundayStructural, remaining, transport, basic, basicHourly };
  }, [config, previewComp]);

  if (loading || !config) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Engine constants */}
      <Card className="p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
          <Percent size={15} />
          {t('gpSettings')}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <FormField label={t('gpTransportPercent')}>
            <input
              className="v-input w-full"
              type="number"
              min="0"
              max="100"
              step="0.5"
              disabled={!canEdit}
              value={config.transportPercent}
              onChange={(e) => setConfig({ ...config, transportPercent: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpStandardMonthlyHours')}>
            <input
              className="v-input w-full"
              type="number"
              min="1"
              disabled={!canEdit}
              value={config.standardMonthlyHours}
              onChange={(e) => setConfig({ ...config, standardMonthlyHours: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpSundayStructuralHours')}>
            <input
              className="v-input w-full"
              type="number"
              min="0"
              disabled={!canEdit}
              value={config.sundayStructuralHours}
              onChange={(e) => setConfig({ ...config, sundayStructuralHours: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpBasicHourlyDivisor')}>
            <input
              className="v-input w-full"
              type="number"
              min="1"
              disabled={!canEdit}
              value={config.basicHourlyDivisor}
              onChange={(e) => setConfig({ ...config, basicHourlyDivisor: Number(e.target.value) })}
            />
          </FormField>
        </div>
        {canEdit && (
          <div className="mt-3 flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="flex items-center gap-2">
              <Save size={14} />
              {t('save')}
            </Button>
          </div>
        )}

        {/* Rate preview */}
        {preview && (
          <div className="mt-4 rounded-xl border border-line bg-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('gpRatePreview')}</p>
            <div className="max-w-xs mb-2">
              <FormField label={t('gpCompensation')}>
                <input className="v-input w-full" type="number" min="0" value={previewComp} onChange={(e) => setPreviewComp(e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs text-muted">
              <span>OT: <b className="text-ink">{fmtMoney(preview.otRate)}</b></span>
              <span>Sunday ×32: <b className="text-ink">{fmtMoney(preview.sundayStructural)}</b></span>
              <span>Remaining: <b className="text-ink">{fmtMoney(preview.remaining)}</b></span>
              <span>Transport: <b className="text-ink">{fmtMoney(preview.transport)}</b></span>
              <span>Basic: <b className="text-ink">{fmtMoney(preview.basic)}</b></span>
              <span>Hourly ÷{config.basicHourlyDivisor}: <b className="text-ink">{fmtMoney(preview.basicHourly)}</b></span>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax tables */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-ink mb-3">{t('gpTaxTables')}</h4>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {taxTables.map((tb) => (
              <div key={tb._id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{tb.name}</p>
                  <p className="text-xs text-subtext">
                    {new Date(tb.effectiveFrom).toLocaleDateString()} · {tb.brackets.length} brackets
                  </p>
                </div>
                <Badge variant="info">{tb.brackets[0]?.rate ?? 0}%…{tb.brackets[tb.brackets.length - 1]?.rate ?? 0}%</Badge>
              </div>
            ))}
            {taxTables.length === 0 && <p className="text-xs text-muted">—</p>}
          </div>
          {canEdit && (
            <div className="space-y-2 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" placeholder={t('gpLabel')} value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} />
                <input className="v-input" type="date" value={taxForm.effectiveFrom} onChange={(e) => setTaxForm({ ...taxForm, effectiveFrom: e.target.value })} />
              </div>
              <textarea
                className="v-input font-mono text-xs"
                rows={4}
                value={taxForm.brackets}
                onChange={(e) => setTaxForm({ ...taxForm, brackets: e.target.value })}
                placeholder={'min,max,rate — one bracket per line'}
              />
              <p className="text-[11px] text-subtext">min,max,rate per line — empty max = ∞</p>
              <div className="flex justify-end">
                <Button onClick={addTaxTable} disabled={!taxForm.name || !taxForm.effectiveFrom}>{t('save')}</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Pension rules */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-ink mb-3">{t('gpPensionRules')}</h4>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {pensionRules.map((pr) => (
              <div key={pr._id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{pr.name}</p>
                  <p className="text-xs text-subtext">{new Date(pr.effectiveFrom).toLocaleDateString()}</p>
                </div>
                <Badge variant="success">{pr.employeePercent}% / {pr.employerPercent}%</Badge>
              </div>
            ))}
            {pensionRules.length === 0 && <p className="text-xs text-muted">—</p>}
          </div>
          {canEdit && (
            <div className="space-y-2 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" placeholder={t('gpLabel')} value={pensionForm.name} onChange={(e) => setPensionForm({ ...pensionForm, name: e.target.value })} />
                <input className="v-input" type="date" value={pensionForm.effectiveFrom} onChange={(e) => setPensionForm({ ...pensionForm, effectiveFrom: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" type="number" placeholder="EE %" value={pensionForm.employeePercent} onChange={(e) => setPensionForm({ ...pensionForm, employeePercent: e.target.value })} />
                <input className="v-input" type="number" placeholder="ER %" value={pensionForm.employerPercent} onChange={(e) => setPensionForm({ ...pensionForm, employerPercent: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={addPensionRule} disabled={!pensionForm.name || !pensionForm.effectiveFrom}>{t('save')}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

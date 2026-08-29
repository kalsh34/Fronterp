import { useState, useEffect } from 'react';
import api from '../../lib/api';

type TabKey = 'components' | 'formula' | 'tax' | 'pension' | 'history';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'components', label: 'Salary Components' },
  { key: 'formula', label: 'Formula Builder' },
  { key: 'tax', label: 'Tax Brackets' },
  { key: 'pension', label: 'Pension Rates' },
  { key: 'history', label: 'Version History' },
];

interface SalaryComponent {
  _id: string;
  code: string;
  label: string;
  sourceType: 'CONTRACT' | 'HR_MONTHLY_INPUT';
  active: boolean;
}

interface PayrollFormulaVersion {
  _id: string;
  version: number;
  isCurrent: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  grossComponentCodes: string[];
  taxableComponentCodes: string[];
  pensionBaseComponentCodes: string[];
  deductionComponentCodes: string[];
  createdById: { firstName: string; lastName: string } | string;
  createdAt: string;
}

interface TaxBracket {
  _id: string;
  label: string;
  brackets: { min: number; max: number | null; rate: number; deduction: number }[];
  effectiveFrom: string;
  isCurrent: boolean;
}

interface PensionRule {
  _id: string;
  label: string;
  employeeRate: number;
  employerRate: number;
  effectiveFrom: string;
  isCurrent: boolean;
}

interface Dashboard {
  components: SalaryComponent[];
  currentFormula: PayrollFormulaVersion | null;
  currentTax: TaxBracket | null;
  currentPension: PensionRule | null;
  formulaCount: number;
}

const badgeColors: Record<string, string> = {
  CONTRACT: 'bg-blue-50 text-blue-700 border-blue-200',
  HR_MONTHLY_INPUT: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function PayrollConfigPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('components');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Component form
  const [compForm, setCompForm] = useState({ code: '', label: '', sourceType: 'CONTRACT' as 'CONTRACT' | 'HR_MONTHLY_INPUT' });

  // Formula form
  const [formulaForm, setFormulaForm] = useState({
    effectiveFrom: new Date().toISOString().split('T')[0],
    grossComponentCodes: [] as string[],
    taxableComponentCodes: [] as string[],
    pensionBaseComponentCodes: [] as string[],
    deductionComponentCodes: [] as string[],
  });

  // Tax form
  const [taxForm, setTaxForm] = useState({
    label: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    brackets: [
      { min: 0, max: 2000, rate: 0, deduction: 0 },
      { min: 2001, max: 4000, rate: 0.15, deduction: 300 },
      { min: 4001, max: 7000, rate: 0.20, deduction: 500 },
      { min: 7001, max: 10000, rate: 0.25, deduction: 850 },
      { min: 10001, max: 14000, rate: 0.30, deduction: 1350 },
      { min: 14001, max: null as number | null, rate: 0.35, deduction: 2050 },
    ],
  });

  // Pension form
  const [pensionForm, setPensionForm] = useState({
    label: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    employeeRate: 0.07,
    employerRate: 0.11,
  });

  // All formulas for history
  const [allFormulas, setAllFormulas] = useState<PayrollFormulaVersion[]>([]);
  const [allTaxBrackets, setAllTaxBrackets] = useState<TaxBracket[]>([]);
  const [allPensionRules, setAllPensionRules] = useState<PensionRule[]>([]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/payroll-config/dashboard');
      setDashboard(res.data.data);
    } catch { /* ok */ }
    setLoading(false);
  };

  const fetchFormulas = async () => {
    try {
      const [fRes, tRes, pRes] = await Promise.all([
        api.get('/admin/payroll-config/formulas'),
        api.get('/admin/payroll-config/tax-brackets'),
        api.get('/admin/payroll-config/pension-rules'),
      ]);
      setAllFormulas(fRes.data.data || []);
      setAllTaxBrackets(tRes.data.data || []);
      setAllPensionRules(pRes.data.data || []);
    } catch { /* ok */ }
  };

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => {
    if (activeTab === 'history') fetchFormulas();
  }, [activeTab]);

  const components = dashboard?.components || [];
  const currentFormula = dashboard?.currentFormula;

  const toggleFormulaCode = (group: 'gross' | 'taxable' | 'pensionBase' | 'deduction', code: string) => {
    const key = group === 'gross' ? 'grossComponentCodes' :
                group === 'taxable' ? 'taxableComponentCodes' :
                group === 'pensionBase' ? 'pensionBaseComponentCodes' :
                'deductionComponentCodes';
    setFormulaForm((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code] };
    });
  };

  const handleCreateComponent = async () => {
    setSaving(true);
    try {
      await api.post('/admin/payroll-config/components', compForm);
      setCompForm({ code: '', label: '', sourceType: 'CONTRACT' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create component');
    }
    setSaving(false);
  };

  const handleRetireComponent = async (id: string) => {
    if (!confirm('Retire this component? It will be hidden from new formulas but history is preserved.')) return;
    setSaving(true);
    try {
      await api.put(`/admin/payroll-config/components/${id}/retire`);
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retire component');
    }
    setSaving(false);
  };

  const handleCreateFormula = async () => {
    if (!formulaForm.grossComponentCodes.length) { alert('Select at least one Gross component'); return; }
    if (!formulaForm.taxableComponentCodes.length) { alert('Select at least one Taxable component'); return; }
    if (!formulaForm.pensionBaseComponentCodes.length) { alert('Select at least one Pension Base component'); return; }
    if (!formulaForm.deductionComponentCodes.length) { alert('Select at least one Deduction component'); return; }

    if (!formulaForm.grossComponentCodes.includes('BASIC')) {
      if (!confirm('WARNING: BASIC is not included in Gross. This is unusual. Continue anyway?')) return;
    }

    setSaving(true);
    try {
      await api.post('/admin/payroll-config/formulas', formulaForm);
      fetchDashboard();
      alert('New formula version created. It becomes effective on the date you selected.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create formula');
    }
    setSaving(false);
  };

  const handleCreateTaxBracket = async () => {
    if (!taxForm.label) { alert('Label is required'); return; }
    setSaving(true);
    try {
      await api.post('/admin/payroll-config/tax-brackets', taxForm);
      fetchDashboard();
      alert('New tax bracket created. Previous version marked as historical.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create tax bracket');
    }
    setSaving(false);
  };

  const handleCreatePensionRule = async () => {
    if (!pensionForm.label) { alert('Label is required'); return; }
    setSaving(true);
    try {
      await api.post('/admin/payroll-config/pension-rules', pensionForm);
      fetchDashboard();
      alert('New pension rule created. Previous version marked as historical.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create pension rule');
    }
    setSaving(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading payroll configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>Administration</span><span>/</span><span>Payroll Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Formula Engine</h1>
        <p className="text-sm text-gray-500 mt-1">Configure salary components, calculation formulas, tax brackets, and pension rates.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── COMPONENTS TAB ── */}
      {activeTab === 'components' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Create Salary Component</h3>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
                <input value={compForm.code} onChange={(e) => setCompForm({ ...compForm, code: e.target.value.toUpperCase() })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" placeholder="e.g. BASIC" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input value={compForm.label} onChange={(e) => setCompForm({ ...compForm, label: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" placeholder="e.g. Basic Salary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                <select value={compForm.sourceType} onChange={(e) => setCompForm({ ...compForm, sourceType: e.target.value as any })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full">
                  <option value="CONTRACT">Contract</option>
                  <option value="HR_MONTHLY_INPUT">HR Monthly Input</option>
                </select>
              </div>
              <button onClick={handleCreateComponent} disabled={saving || !compForm.code || !compForm.label}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Creating...' : 'Add Component'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Label</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp) => (
                  <tr key={comp._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{comp.code}</td>
                    <td className="px-5 py-3.5 text-gray-700">{comp.label}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${badgeColors[comp.sourceType] || ''}`}>
                        {comp.sourceType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${comp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {comp.active ? 'Active' : 'Retired'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {comp.active && (
                        <button onClick={() => handleRetireComponent(comp._id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Retire</button>
                      )}
                    </td>
                  </tr>
                ))}
                {components.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No salary components defined.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FORMULA BUILDER TAB ── */}
      {activeTab === 'formula' && (
        <div className="space-y-6">
          {currentFormula && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800">Current Active Formula: Version {currentFormula.version}</p>
              <p className="text-xs text-blue-600 mt-1">Effective from {formatDate(currentFormula.effectiveFrom)} — creating a new version will retire this one.</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Create New Formula Version</h3>
            <p className="text-xs text-gray-500 mb-4">Select which components participate in each calculation group. The formula does not mutate — saving creates a new version.</p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Effective From</label>
              <input type="date" value={formulaForm.effectiveFrom} onChange={(e) => setFormulaForm({ ...formulaForm, effectiveFrom: e.target.value })}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-48" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {([
                { key: 'gross' as const, label: 'Gross Salary Components', desc: 'Sum of these = Gross Salary', codes: formulaForm.grossComponentCodes },
                { key: 'taxable' as const, label: 'Taxable Salary Components', desc: 'Sum of these = Taxable Salary (for income tax)', codes: formulaForm.taxableComponentCodes },
                { key: 'pensionBase' as const, label: 'Pension Base Components', desc: 'Sum of these × pension rate = pension amounts', codes: formulaForm.pensionBaseComponentCodes },
                { key: 'deduction' as const, label: 'Deduction Components', desc: 'Sum of these + income tax + employee pension = Total Deductions', codes: formulaForm.deductionComponentCodes },
              ]).map((group) => (
                <div key={group.key} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{group.label}</h4>
                  <p className="text-[10px] text-gray-400 mb-3">{group.desc}</p>
                  <div className="space-y-2">
                    {components.map((comp) => (
                      <label key={comp.code} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={group.codes.includes(comp.code)}
                          onChange={() => toggleFormulaCode(group.key, comp.code)}
                          className="rounded border-gray-300 text-blue-600" />
                        <span className="font-medium">{comp.code}</span>
                        <span className="text-gray-400 text-xs">({comp.label})</span>
                      </label>
                    ))}
                    {components.length === 0 && <p className="text-xs text-gray-400">No components defined. Create them in the Salary Components tab first.</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={handleCreateFormula} disabled={saving}
                className="h-9 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Create Formula Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAX BRACKETS TAB ── */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          {dashboard?.currentTax && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800">Current Tax Brackets: {dashboard.currentTax.label}</p>
              <p className="text-xs text-emerald-600 mt-1">Effective from {formatDate(dashboard.currentTax.effectiveFrom)}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Create New Tax Bracket</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input value={taxForm.label} onChange={(e) => setTaxForm({ ...taxForm, label: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" placeholder="e.g. Ethiopian Income Tax 2025" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Effective From</label>
                <input type="date" value={taxForm.effectiveFrom} onChange={(e) => setTaxForm({ ...taxForm, effectiveFrom: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" />
              </div>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Min</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Max</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Rate (0-1)</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {taxForm.brackets.map((b, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-1.5"><input type="number" value={b.min} onChange={(e) => {
                      const brackets = [...taxForm.brackets]; brackets[i] = { ...brackets[i], min: Number(e.target.value) }; setTaxForm({ ...taxForm, brackets });
                    }} className="h-8 px-2 rounded border border-gray-200 text-sm w-24" /></td>
                    <td className="px-3 py-1.5"><input type="number" value={b.max ?? ''} onChange={(e) => {
                      const brackets = [...taxForm.brackets]; brackets[i] = { ...brackets[i], max: e.target.value ? Number(e.target.value) : null }; setTaxForm({ ...taxForm, brackets });
                    }} className="h-8 px-2 rounded border border-gray-200 text-sm w-24" placeholder="∞" /></td>
                    <td className="px-3 py-1.5"><input type="number" step="0.01" value={b.rate} onChange={(e) => {
                      const brackets = [...taxForm.brackets]; brackets[i] = { ...brackets[i], rate: Number(e.target.value) }; setTaxForm({ ...taxForm, brackets });
                    }} className="h-8 px-2 rounded border border-gray-200 text-sm w-24" /></td>
                    <td className="px-3 py-1.5"><input type="number" value={b.deduction} onChange={(e) => {
                      const brackets = [...taxForm.brackets]; brackets[i] = { ...brackets[i], deduction: Number(e.target.value) }; setTaxForm({ ...taxForm, brackets });
                    }} className="h-8 px-2 rounded border border-gray-200 text-sm w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <button onClick={handleCreateTaxBracket} disabled={saving}
                className="h-9 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Create Tax Bracket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PENSION RATES TAB ── */}
      {activeTab === 'pension' && (
        <div className="space-y-6">
          {dashboard?.currentPension && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800">Current Pension Rule: {dashboard.currentPension.label}</p>
              <p className="text-xs text-blue-600 mt-1">Employee: {(dashboard.currentPension.employeeRate * 100).toFixed(0)}% | Employer: {(dashboard.currentPension.employerRate * 100).toFixed(0)}% — Effective from {formatDate(dashboard.currentPension.effectiveFrom)}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Create New Pension Rule</h3>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input value={pensionForm.label} onChange={(e) => setPensionForm({ ...pensionForm, label: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" placeholder="e.g. Ethiopian Pension 2025" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Employee Rate (decimal)</label>
                <input type="number" step="0.01" value={pensionForm.employeeRate} onChange={(e) => setPensionForm({ ...pensionForm, employeeRate: Number(e.target.value) })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Employer Rate (decimal)</label>
                <input type="number" step="0.01" value={pensionForm.employerRate} onChange={(e) => setPensionForm({ ...pensionForm, employerRate: Number(e.target.value) })}
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-full" />
              </div>
              <button onClick={handleCreatePensionRule} disabled={saving}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Create Rule'}
              </button>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Effective From</label>
              <input type="date" value={pensionForm.effectiveFrom} onChange={(e) => setPensionForm({ ...pensionForm, effectiveFrom: e.target.value })}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-48" />
            </div>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Formula Version History</h3>
            {allFormulas.length === 0 ? (
              <p className="text-sm text-gray-400">No formula versions created yet.</p>
            ) : (
              <div className="space-y-3">
                {allFormulas.map((f) => (
                  <div key={f._id} className={`border rounded-lg p-4 ${f.isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">Version {f.version}</span>
                        {f.isCurrent && <span className="ml-2 text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">CURRENT</span>}
                      </div>
                      <span className="text-xs text-gray-400">Created {formatDate(f.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">Gross:</span> {f.grossComponentCodes.join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Taxable:</span> {f.taxableComponentCodes.join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Pension Base:</span> {f.pensionBaseComponentCodes.join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Deductions:</span> {f.deductionComponentCodes.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Tax Bracket History</h3>
            {allTaxBrackets.length === 0 ? (
              <p className="text-sm text-gray-400">No tax brackets created yet.</p>
            ) : (
              <div className="space-y-3">
                {allTaxBrackets.map((t) => (
                  <div key={t._id} className={`border rounded-lg p-4 ${t.isCurrent ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                        {t.isCurrent && <span className="ml-2 text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">CURRENT</span>}
                      </div>
                      <span className="text-xs text-gray-400">From {formatDate(t.effectiveFrom)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Pension Rule History</h3>
            {allPensionRules.length === 0 ? (
              <p className="text-sm text-gray-400">No pension rules created yet.</p>
            ) : (
              <div className="space-y-3">
                {allPensionRules.map((p) => (
                  <div key={p._id} className={`border rounded-lg p-4 ${p.isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                        {p.isCurrent && <span className="ml-2 text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">CURRENT</span>}
                      </div>
                      <span className="text-xs text-gray-400">Employee {(p.employeeRate * 100).toFixed(0)}% / Employer {(p.employerRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

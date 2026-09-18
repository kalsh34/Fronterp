import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Search, Plus, MoreHorizontal, Eye, Edit3, Archive, Copy, ArrowLeft, ArrowRight, Check, X, Trash2 } from 'lucide-react';

interface SalaryEarning {
  componentCode: string;
  label: string;
  calculationType: 'HOURLY_RATE' | 'FIXED_AMOUNT' | 'PERCENTAGE';
  defaultRate: number;
  taxable: boolean;
  required: boolean;
}

interface SalaryDeduction {
  componentCode: string;
  label: string;
  calculationType: string;
  defaultValue: number;
  enabled: boolean;
}

interface SalaryStructure {
  _id: string;
  name: string;
  employeeType: 'GUARD' | 'STAFF';
  payBasis: 'HOURLY' | 'MONTHLY';
  version: number;
  isCurrent: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  otMultiplier: number;
  holidayMultiplier: number;
  earnings: SalaryEarning[];
  deductions: SalaryDeduction[];
  createdById: { firstName: string; lastName: string } | string;
  createdAt: string;
}

interface Dashboard {
  total: number;
  active: number;
  guardStructures: number;
  staffStructures: number;
}

const GUARD_EARNINGS_DEFAULTS: SalaryEarning[] = [
  { componentCode: 'BASIC', label: 'Basic Salary (Monthly)', calculationType: 'FIXED_AMOUNT', defaultRate: 10800, taxable: true, required: true },
  { componentCode: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
  { componentCode: 'TRANSPORT_ALLOWANCE', label: 'Transport Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: false, required: false },
];

const STAFF_EARNINGS_DEFAULTS: SalaryEarning[] = [
  { componentCode: 'BASIC', label: 'Basic Salary', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: true },
  { componentCode: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
  { componentCode: 'TELE_ALLOWANCE', label: 'Tele Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
  { componentCode: 'TAXABLE_TRANSPORT', label: 'Taxable Transport', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
  { componentCode: 'NON_TAXABLE_ALLOWANCE', label: 'Non-Taxable Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: false, required: false },
  { componentCode: 'OT', label: 'Overtime', calculationType: 'HOURLY_RATE', defaultRate: 0, taxable: true, required: false },
];

const GUARD_DEDUCTIONS_DEFAULTS: SalaryDeduction[] = [
  { componentCode: 'INCOME_TAX', label: 'Income Tax', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
  { componentCode: 'EMPLOYEE_PENSION', label: 'Employee Pension (7%)', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
  { componentCode: 'LOAN', label: 'Loan Deduction', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
];

const STAFF_DEDUCTIONS_DEFAULTS: SalaryDeduction[] = [
  { componentCode: 'INCOME_TAX', label: 'Income Tax', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
  { componentCode: 'EMPLOYEE_PENSION', label: 'Employee Pension (7%)', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
  { componentCode: 'LOAN', label: 'Loan Deduction', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
  { componentCode: 'PENALTY', label: 'Penalty', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
  { componentCode: 'OTHER_DEDUCTIONS', label: 'Other Deductions', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
];

const formatCurrency = (n: number) => `ETB ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalaryStructurePage() {
  useAuthStore();
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard>({ total: 0, active: 0, guardStructures: 0, staffStructures: 0 });
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [viewingStructure, setViewingStructure] = useState<SalaryStructure | null>(null);
  const [step, setStep] = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    employeeType: 'GUARD' as 'GUARD' | 'STAFF',
    payBasis: 'HOURLY' as 'HOURLY' | 'MONTHLY',
    effectiveFrom: new Date().toISOString().split('T')[0],
    otMultiplier: 1.5,
    holidayMultiplier: 2.0,
    earnings: [] as SalaryEarning[],
    deductions: [] as SalaryDeduction[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [structRes, dashRes] = await Promise.all([
        api.get('/salary-structures'),
        api.get('/salary-structures/dashboard'),
      ]);
      setStructures(structRes.data.data || []);
      setDashboard(dashRes.data.data || { total: 0, active: 0, guardStructures: 0, staffStructures: 0 });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = structures.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && s.employeeType !== typeFilter) return false;
    if (statusFilter === 'active' && !s.isCurrent) return false;
    if (statusFilter === 'retired' && s.isCurrent) return false;
    return true;
  });

  const openCreateWizard = (employeeType: 'GUARD' | 'STAFF') => {
    setEditingStructure(null);
    setForm({
      name: '',
      employeeType,
      payBasis: employeeType === 'GUARD' ? 'HOURLY' : 'MONTHLY',
      effectiveFrom: new Date().toISOString().split('T')[0],
      otMultiplier: 1.5,
      holidayMultiplier: 2.0,
      earnings: employeeType === 'GUARD' ? [...GUARD_EARNINGS_DEFAULTS] : [...STAFF_EARNINGS_DEFAULTS],
      deductions: employeeType === 'GUARD' ? [...GUARD_DEDUCTIONS_DEFAULTS] : [...STAFF_DEDUCTIONS_DEFAULTS],
    });
    setStep(1);
    setShowWizard(true);
  };

  const openEditWizard = (s: SalaryStructure) => {
    setEditingStructure(s);
    setForm({
      name: s.name,
      employeeType: s.employeeType,
      payBasis: s.payBasis,
      effectiveFrom: new Date().toISOString().split('T')[0],
      otMultiplier: s.otMultiplier,
      holidayMultiplier: s.holidayMultiplier,
      earnings: s.earnings.map((e) => ({ ...e })),
      deductions: s.deductions.map((d) => ({ ...d })),
    });
    setStep(1);
    setShowWizard(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    try {
      if (editingStructure) {
        await api.put(`/salary-structures/${editingStructure._id}`, {
          name: form.name,
          otMultiplier: form.otMultiplier,
          holidayMultiplier: form.holidayMultiplier,
          earnings: form.earnings,
          deductions: form.deductions,
        });
      } else {
        await api.post('/salary-structures', form);
      }
      setShowWizard(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save');
    }
  };

  const handleRetire = async (id: string) => {
    if (!confirm('Retire this structure? It will no longer be used for new contracts.')) return;
    try {
      await api.put(`/salary-structures/${id}/retire`);
      fetchData();
    } catch {}
    setMenuOpen(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/salary-structures/${id}/duplicate`);
      fetchData();
    } catch {}
    setMenuOpen(null);
  };

  const updateEarning = (index: number, field: keyof SalaryEarning, value: any) => {
    const updated = [...form.earnings];
    (updated[index] as any)[field] = value;
    setForm({ ...form, earnings: updated });
  };

  const addEarning = () => {
    setForm({
      ...form,
      earnings: [...form.earnings, { componentCode: '', label: '', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: false, required: false }],
    });
  };

  const removeEarning = (index: number) => {
    setForm({ ...form, earnings: form.earnings.filter((_, i) => i !== index) });
  };

  const toggleDeduction = (index: number) => {
    const updated = [...form.deductions];
    updated[index].enabled = !updated[index].enabled;
    setForm({ ...form, deductions: updated });
  };

  const updateDeductionValue = (index: number, value: number) => {
    const updated = [...form.deductions];
    updated[index].defaultValue = value;
    setForm({ ...form, deductions: updated });
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{editingStructure ? 'Edit' : 'Create'} Salary Structure</h1>
              <p className="text-sm text-gray-500 mt-0.5">Step {step} of 4</p>
            </div>
            <button onClick={() => setShowWizard(false)} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            {['Basic Info', 'Earnings', 'Deductions', 'Review'].map((label, i) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                i + 1 === step ? 'bg-indigo-100 text-indigo-700' : i + 1 < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {i + 1 < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Structure Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Guard Standard, Office Staff"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
                  <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee Type</label>
                  <select value={form.employeeType} onChange={(e) => {
                    const t = e.target.value as 'GUARD' | 'STAFF';
                    setForm({
                      ...form,
                      employeeType: t,
                      payBasis: t === 'GUARD' ? 'HOURLY' : 'MONTHLY',
                      earnings: t === 'GUARD' ? [...GUARD_EARNINGS_DEFAULTS] : [...STAFF_EARNINGS_DEFAULTS],
                      deductions: t === 'GUARD' ? [...GUARD_DEDUCTIONS_DEFAULTS] : [...STAFF_DEDUCTIONS_DEFAULTS],
                    });
                  }} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    <option value="GUARD">Guard</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pay Basis</label>
                  <select value={form.payBasis} onChange={(e) => setForm({ ...form, payBasis: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    <option value="HOURLY">Hourly (wage ÷ 720)</option>
                    <option value="MONTHLY">Monthly Fixed</option>
                  </select>
                </div>
              </div>
              {form.employeeType === 'GUARD' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">OT Multiplier</label>
                    <input type="number" step="0.1" value={form.otMultiplier}
                      onChange={(e) => setForm({ ...form, otMultiplier: parseFloat(e.target.value) || 1.5 })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                    <p className="text-[11px] text-gray-400 mt-1">e.g. 1.5 = OT rate is 1.5× hourly rate</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Holiday Multiplier</label>
                    <input type="number" step="0.1" value={form.holidayMultiplier}
                      onChange={(e) => setForm({ ...form, holidayMultiplier: parseFloat(e.target.value) || 2.0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                    <p className="text-[11px] text-gray-400 mt-1">e.g. 2.0 = Holiday rate is 2× hourly rate</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Earnings Components</h2>
                <button onClick={addEarning} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Component
                </button>
              </div>
              <div className="space-y-3">
                {form.earnings.map((earning, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input value={earning.componentCode} onChange={(e) => updateEarning(i, 'componentCode', e.target.value.toUpperCase())}
                        placeholder="CODE" className="px-2 py-1.5 text-xs border border-gray-200 rounded-md font-mono" />
                      <input value={earning.label} onChange={(e) => updateEarning(i, 'label', e.target.value)}
                        placeholder="Label" className="px-2 py-1.5 text-xs border border-gray-200 rounded-md" />
                      <select value={earning.calculationType} onChange={(e) => updateEarning(i, 'calculationType', e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-200 rounded-md">
                        <option value="FIXED_AMOUNT">Fixed Amount</option>
                        <option value="HOURLY_RATE">Hourly Rate</option>
                        <option value="PERCENTAGE">Percentage</option>
                      </select>
                      <input type="number" value={earning.defaultRate || ''}
                        onChange={(e) => updateEarning(i, 'defaultRate', parseFloat(e.target.value) || 0)}
                        placeholder="Default Rate" className="px-2 py-1.5 text-xs border border-gray-200 rounded-md" />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-600">
                      <input type="checkbox" checked={earning.taxable}
                        onChange={(e) => updateEarning(i, 'taxable', e.target.checked)}
                        className="rounded border-gray-300" />
                      Taxable
                    </label>
                    {!earning.required && (
                      <button onClick={() => removeEarning(i)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Deductions</h2>
              <div className="space-y-2">
                {form.deductions.map((deduction, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 flex-1">
                      <input type="checkbox" checked={deduction.enabled}
                        onChange={() => toggleDeduction(i)}
                        className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{deduction.label}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({deduction.componentCode})</span>
                    </label>
                    {deduction.calculationType !== 'FORMULA' && (
                      <input type="number" value={deduction.defaultValue || ''}
                        onChange={(e) => updateDeductionValue(i, parseFloat(e.target.value) || 0)}
                        placeholder="Default" disabled={!deduction.enabled}
                        className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-50" />
                    )}
                    {deduction.calculationType === 'FORMULA' && (
                      <span className="text-[11px] text-gray-400">Auto-calculated</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
              <h2 className="text-sm font-semibold text-gray-900">Review</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{form.name || '—'}</span></div>
                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{form.employeeType}</span></div>
                <div><span className="text-gray-500">Pay Basis:</span> <span className="font-medium">{form.payBasis}</span></div>
                <div><span className="text-gray-500">Effective:</span> <span className="font-medium">{form.effectiveFrom}</span></div>
                {form.employeeType === 'GUARD' && (
                  <>
                    <div><span className="text-gray-500">OT Multiplier:</span> <span className="font-medium">{form.otMultiplier}×</span></div>
                    <div><span className="text-gray-500">Holiday Multiplier:</span> <span className="font-medium">{form.holidayMultiplier}×</span></div>
                  </>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-600 mb-2">Earnings</h3>
                <div className="space-y-1">
                  {form.earnings.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                      <span>{e.label} <span className="text-gray-400 font-mono text-xs">({e.componentCode})</span></span>
                      <span className="font-medium">{formatCurrency(e.defaultRate)} <span className="text-gray-400 text-xs">{e.calculationType}</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-600 mb-2">Deductions</h3>
                <div className="space-y-1">
                  {form.deductions.filter((d) => d.enabled).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                      <span>{d.label}</span>
                      <span className="text-xs text-gray-500">{d.calculationType === 'FORMULA' ? 'Auto' : formatCurrency(d.defaultValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowWizard(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              {step < 4 ? (
                <button onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !form.name}
                  className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSave}
                  disabled={!form.name}
                  className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {editingStructure ? 'Update' : 'Create'} Structure
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewingStructure) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setViewingStructure(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{viewingStructure.name}</h1>
                <p className="text-sm text-gray-500">Version {viewingStructure.version} • {viewingStructure.employeeType} • {viewingStructure.payBasis}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${viewingStructure.isCurrent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {viewingStructure.isCurrent ? 'Active' : 'Retired'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div><span className="text-gray-500">Effective From:</span> <span className="font-medium">{new Date(viewingStructure.effectiveFrom).toLocaleDateString()}</span></div>
              <div><span className="text-gray-500">OT Multiplier:</span> <span className="font-medium">{viewingStructure.otMultiplier}×</span></div>
              <div><span className="text-gray-500">Holiday Multiplier:</span> <span className="font-medium">{viewingStructure.holidayMultiplier}×</span></div>
            </div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Earnings</h3>
            <div className="space-y-1 mb-4">
              {viewingStructure.earnings.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                  <span>{e.label} <span className="text-gray-400 font-mono text-xs">({e.componentCode})</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{e.calculationType}</span>
                    <span className="font-medium">{formatCurrency(e.defaultRate)}</span>
                    {e.taxable && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Taxable</span>}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Deductions</h3>
            <div className="space-y-1">
              {viewingStructure.deductions.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                  <span>{d.label}</span>
                  <span className="text-xs text-gray-500">{d.enabled ? (d.calculationType === 'FORMULA' ? 'Auto' : formatCurrency(d.defaultValue)) : 'Disabled'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Salary Structure</h1>
            <p className="text-sm text-gray-500">Define and manage salary structures for guards and staff</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openCreateWizard('GUARD')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Guard Structure
            </button>
            <button onClick={() => openCreateWizard('STAFF')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700">
              <Plus className="w-4 h-4" /> Staff Structure
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Structures', value: dashboard.total, color: 'text-gray-900' },
            { label: 'Active', value: dashboard.active, color: 'text-green-600' },
            { label: 'Guard Structures', value: dashboard.guardStructures, color: 'text-blue-600' },
            { label: 'Staff Structures', value: dashboard.staffStructures, color: 'text-violet-600' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search structures..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">All Types</option>
              <option value="GUARD">Guard</option>
              <option value="STAFF">Staff</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Pay Basis</th>
                <th className="px-4 py-3 font-medium">Components</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Effective From</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-[11px] text-gray-400">v{s.version}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.employeeType === 'GUARD' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                      {s.employeeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.payBasis}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.earnings.length} earnings, {s.deductions.length} deductions</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isCurrent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isCurrent ? 'Active' : 'Retired'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(s.effectiveFrom).toLocaleDateString()}</td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === s._id ? null : s._id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === s._id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-lg shadow-lg z-10 py-1">
                        <button onClick={() => { setViewingStructure(s); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {s.isCurrent && (
                          <button onClick={() => openEditWizard(s)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        <button onClick={() => handleDuplicate(s._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Copy className="w-3.5 h-3.5" /> Duplicate
                        </button>
                        {s.isCurrent && (
                          <button onClick={() => handleRetire(s._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Archive className="w-3.5 h-3.5" /> Retire
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No salary structures found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

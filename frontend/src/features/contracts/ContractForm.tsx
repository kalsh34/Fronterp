import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { EmployeeCategory } from '../../types';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  category?: string;
}

interface Contract {
  _id: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; employeeCode: string };
  salaryStructureId?: string | { _id: string; name: string };
  contractStartDate: string;
  contractEndDate?: string;
  department?: string;
  grade?: string;
  jobPosition?: string;
  contractType: string;
  wage: number;
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableAllowance: number;
  transportAllowance: number;
  pensionEnrolled: boolean;
  notes?: string;
  status: string;
}

interface SalaryStructure {
  _id: string;
  name: string;
  employeeType: string;
  earnings: { componentCode: string; label: string; calculationType: string; defaultRate: number; taxable: boolean; required: boolean }[];
  otMultiplier: number;
  holidayMultiplier: number;
}

const GRADE_OPTIONS = [
  { value: 'Grade A', label: 'Grade A', range: 'ETB 80,000 – 120,000', description: 'Senior Management / Executive' },
  { value: 'Grade B', label: 'Grade B', range: 'ETB 50,000 – 79,999', description: 'Middle Management / Department Heads' },
  { value: 'Grade C', label: 'Grade C', range: 'ETB 30,000 – 49,999', description: 'Junior Management / Officers' },
  { value: 'Grade D', label: 'Grade D', range: 'ETB 15,000 – 29,999', description: 'Support Staff / Assistants' },
  { value: 'Grade E', label: 'Grade E', range: 'ETB 8,000 – 14,999', description: 'Operational / Field Staff' },
];

export default function ContractForm() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [existingContract, setExistingContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employeeId: employeeId || '',
    salaryStructureId: '',
    contractStartDate: '',
    contractEndDate: '',
    department: '',
    grade: '',
    jobPosition: '',
    contractType: 'Full-Time',
    wage: 0,
    responsibilityAllowance: 0,
    teleAllowance: 0,
    taxableTransport: 0,
    nonTaxableAllowance: 0,
    transportAllowance: 0,
    pensionEnrolled: true,
    notes: '',
  });

  const selectedEmployee = employees.find(e => e._id === form.employeeId);
  const isGuard = selectedEmployee?.category === EmployeeCategory.GUARD;

  const handleStructureChange = (structureId: string) => {
    setForm(prev => ({ ...prev, salaryStructureId: structureId }));
    if (!structureId) return;
    const structure = salaryStructures.find(s => s._id === structureId);
    if (!structure) return;

    const wageEarn = structure.earnings.find(e => e.componentCode === 'BASIC');
    const respEarn = structure.earnings.find(e => e.componentCode === 'RESPONSIBILITY_ALLOWANCE');
    const teleEarn = structure.earnings.find(e => e.componentCode === 'TELE_ALLOWANCE');
    const taxTransEarn = structure.earnings.find(e => e.componentCode === 'TAXABLE_TRANSPORT');
    const nonTaxTransEarn = structure.earnings.find(e => e.componentCode === 'NON_TAXABLE_ALLOWANCE');

    setForm(prev => ({
      ...prev,
      salaryStructureId: structureId,
      wage: wageEarn?.defaultRate || prev.wage,
      responsibilityAllowance: respEarn?.defaultRate || prev.responsibilityAllowance,
      teleAllowance: teleEarn?.defaultRate || prev.teleAllowance,
      taxableTransport: taxTransEarn?.defaultRate || prev.taxableTransport,
      nonTaxableAllowance: nonTaxTransEarn?.defaultRate || prev.nonTaxableAllowance,
    }));
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const empRes = await api.get('/employees', { params: { limit: 200 } });
        setEmployees(empRes.data.data || []);

        try {
          const structRes = await api.get('/salary-structures', { params: { status: 'current' } });
          setSalaryStructures(structRes.data.data || []);
        } catch { /* ignore */ }

        if (employeeId) {
          setForm((prev) => ({ ...prev, employeeId }));
          try {
            const contractRes = await api.get(`/contracts/employee/${employeeId}`);
            if (contractRes.data.data) {
              const c = contractRes.data.data;
              setExistingContract(c);
              setForm({
                employeeId: employeeId,
                salaryStructureId: typeof c.salaryStructureId === 'string' ? c.salaryStructureId : c.salaryStructureId?._id || '',
                contractStartDate: c.contractStartDate ? c.contractStartDate.split('T')[0] : '',
                contractEndDate: c.contractEndDate ? c.contractEndDate.split('T')[0] : '',
                department: c.department || '',
                grade: c.grade || '',
                jobPosition: c.jobPosition || '',
                contractType: c.contractType || 'Full-Time',
                wage: c.wage || 0,
                responsibilityAllowance: c.responsibilityAllowance || 0,
                teleAllowance: c.teleAllowance || 0,
                taxableTransport: c.taxableTransport || 0,
                nonTaxableAllowance: c.nonTaxableAllowance || 0,
                transportAllowance: c.transportAllowance || 0,
                pensionEnrolled: c.pensionEnrolled !== false,
                notes: c.notes || '',
              });
            }
          } catch {
            // No existing contract — this is create mode
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [employeeId]);

  const isUpdate = !!existingContract;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        salaryStructureId: form.salaryStructureId || undefined,
        wage: Number(form.wage),
        responsibilityAllowance: Number(form.responsibilityAllowance),
        teleAllowance: Number(form.teleAllowance),
        taxableTransport: Number(form.taxableTransport),
        nonTaxableAllowance: Number(form.nonTaxableAllowance),
        transportAllowance: Number(form.transportAllowance),
        pensionEnrolled: form.pensionEnrolled,
      };

      if (isUpdate && existingContract) {
        await api.put(`/contracts/${existingContract._id}`, payload);
      } else {
        await api.post('/contracts', payload);
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>Vital Security PLC</span>
            <span>/</span>
            <span>HR & People</span>
            <span>/</span>
            <span>Contracts</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{isUpdate ? 'Update Contract' : 'New Contract'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isUpdate ? 'Update the existing employee contract' : 'Create and configure a new employee contract'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="h-10 px-5 flex items-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? 'Saving...' : 'Save Contract'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Contract Information</h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee *</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
                disabled={isUpdate}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">Search employee...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode}) — {emp.category === EmployeeCategory.GUARD ? 'Guard' : 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            {/* Contract Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract Type *</label>
              <select
                value={form.contractType}
                onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {/* Contract Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract Start Date *</label>
              <input
                type="date"
                value={form.contractStartDate}
                onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })}
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Contract End Date — hidden for Full-Time */}
            {form.contractType !== 'Full-Time' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract End Date</label>
                <input
                  type="date"
                  value={form.contractEndDate}
                  onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            )}

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Select department</option>
                <option value="Operations">Operations</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Administration">Administration</option>
                <option value="Security">Security</option>
              </select>
            </div>

            {/* Job Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Position</label>
              <select
                value={form.jobPosition}
                onChange={(e) => setForm({ ...form, jobPosition: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Select position</option>
                <option value="Guard">Guard</option>
                <option value="Site Leader">Site Leader</option>
                <option value="Operations Manager">Operations Manager</option>
                <option value="HR Officer">HR Officer</option>
                <option value="Finance Officer">Finance Officer</option>
                <option value="Admin Officer">Admin Officer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Grade */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Salary Grade</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {GRADE_OPTIONS.map((grade) => (
              <label
                key={grade.value}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  form.grade === grade.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="grade"
                  value={grade.value}
                  checked={form.grade === grade.value}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{grade.label}</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{grade.range}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{grade.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Salary Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Salary Information</h2>
          </div>

          {/* Salary Structure Selector */}
          {salaryStructures.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary Structure</label>
              <select
                value={form.salaryStructureId}
                onChange={(e) => handleStructureChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">No structure — manual entry</option>
                {salaryStructures
                  .filter(s => isGuard ? s.employeeType === 'GUARD' : s.employeeType === 'STAFF')
                  .map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
              </select>
              {form.salaryStructureId && (
                <p className="text-xs text-blue-600 mt-1.5">Earnings pre-filled from structure. Adjust below if needed.</p>
              )}
            </div>
          )}

          {/* Salary */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Basic Salary (ETB) *</label>
            <input
              type="number"
              value={form.wage || ''}
              onChange={(e) => setForm({ ...form, wage: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Allowances */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Allowances</h3>

            {isGuard ? (
              /* Guard: only Transport Allowance */
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Transport Allowance (ETB)</label>
                <input
                  type="number"
                  value={form.transportAllowance || ''}
                  onChange={(e) => setForm({ ...form, transportAllowance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1.5">Guards receive only transport allowance</p>
              </div>
            ) : (
              /* Office Staff: all four allowances */
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsibility Allowance (ETB)</label>
                  <input
                    type="number"
                    value={form.responsibilityAllowance || ''}
                    onChange={(e) => setForm({ ...form, responsibilityAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tele Allowance (ETB)</label>
                  <input
                    type="number"
                    value={form.teleAllowance || ''}
                    onChange={(e) => setForm({ ...form, teleAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Taxable Transport (ETB)</label>
                  <input
                    type="number"
                    value={form.taxableTransport || ''}
                    onChange={(e) => setForm({ ...form, taxableTransport: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Non-Taxable Allowance (ETB)</label>
                  <input
                    type="number"
                    value={form.nonTaxableAllowance || ''}
                    onChange={(e) => setForm({ ...form, nonTaxableAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Pension & Additional Details</h2>
          </div>

          {/* Pension Enrollment Toggle */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">Employee participates in pension scheme</p>
                <p className="text-xs text-gray-500 mt-0.5">When enabled, both employee (7%) and employer (11%) pension contributions are deducted.</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.pensionEnrolled}
                  onChange={(e) => setForm({ ...form, pensionEnrolled: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.pensionEnrolled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${form.pensionEnrolled ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>
            {!form.pensionEnrolled && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Pension opt-out: no employee or employer contributions will be made.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              placeholder="Add any additional notes or contract details..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        </div>
      </form>
    </div>
  );
}

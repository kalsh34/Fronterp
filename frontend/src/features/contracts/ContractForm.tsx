import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
}

interface Contract {
  _id: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; employeeCode: string };
  contractStartDate: string;
  contractEndDate?: string;
  workingSchedule: string;
  salaryStructureType: string;
  department?: string;
  salaryStructure?: string;
  jobPosition?: string;
  contractType: string;
  wage: number;
  monthlyAdvantagesInCash: number;
  allowances: {
    hra: number;
    da: number;
    travelAllowance: number;
    mealAllowance: number;
    medicalAllowance: number;
    otherAllowance: number;
  };
  notes?: string;
  status: string;
}

const emptyAllowances = { hra: 0, da: 0, travelAllowance: 0, mealAllowance: 0, medicalAllowance: 0, otherAllowance: 0 };

export default function ContractForm() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingContract, setExistingContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employeeId: employeeId || '',
    contractStartDate: '',
    contractEndDate: '',
    workingSchedule: 'Monday-Friday (9AM-6PM)',
    salaryStructureType: 'Basic',
    department: '',
    salaryStructure: '',
    jobPosition: '',
    contractType: 'Full-Time',
    wage: 0,
    monthlyAdvantagesInCash: 0,
    allowances: { ...emptyAllowances },
    notes: '',
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const empRes = await api.get('/employees', { params: { limit: 200 } });
        setEmployees(empRes.data.data || []);

        if (employeeId) {
          setForm((prev) => ({ ...prev, employeeId }));
          try {
            const contractRes = await api.get(`/contracts/employee/${employeeId}`);
            if (contractRes.data.data) {
              const c = contractRes.data.data;
              setExistingContract(c);
              setForm({
                employeeId: employeeId,
                contractStartDate: c.contractStartDate ? c.contractStartDate.split('T')[0] : '',
                contractEndDate: c.contractEndDate ? c.contractEndDate.split('T')[0] : '',
                workingSchedule: c.workingSchedule || 'Monday-Friday (9AM-6PM)',
                salaryStructureType: c.salaryStructureType || 'Basic',
                department: c.department || '',
                salaryStructure: c.salaryStructure || '',
                jobPosition: c.jobPosition || '',
                contractType: c.contractType || 'Full-Time',
                wage: c.wage || 0,
                monthlyAdvantagesInCash: c.monthlyAdvantagesInCash || 0,
                allowances: c.allowances || { ...emptyAllowances },
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
        wage: Number(form.wage),
        monthlyAdvantagesInCash: Number(form.monthlyAdvantagesInCash),
        allowances: {
          hra: Number(form.allowances.hra),
          da: Number(form.allowances.da),
          travelAllowance: Number(form.allowances.travelAllowance),
          mealAllowance: Number(form.allowances.mealAllowance),
          medicalAllowance: Number(form.allowances.medicalAllowance),
          otherAllowance: Number(form.allowances.otherAllowance),
        },
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

  const updateAllowance = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      allowances: { ...prev.allowances, [key]: value },
    }));
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
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
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

            {/* Contract End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract End Date</label>
              <input
                type="date"
                value={form.contractEndDate}
                onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Working Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Working Schedule *</label>
              <select
                value={form.workingSchedule}
                onChange={(e) => setForm({ ...form, workingSchedule: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="Monday-Friday (9AM-6PM)">Monday-Friday (9AM-6PM)</option>
                <option value="Monday-Friday (8AM-5PM)">Monday-Friday (8AM-5PM)</option>
                <option value="Monday-Saturday (9AM-6PM)">Monday-Saturday (9AM-6PM)</option>
                <option value="Shift-Based (24/7)">Shift-Based (24/7)</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>

            {/* Salary Structure Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary Structure Type *</label>
              <select
                value={form.salaryStructureType}
                onChange={(e) => setForm({ ...form, salaryStructureType: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Executive">Executive</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

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

            {/* Salary Structure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary Structure</label>
              <select
                value={form.salaryStructure}
                onChange={(e) => setForm({ ...form, salaryStructure: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Select structure</option>
                <option value="Grade A">Grade A</option>
                <option value="Grade B">Grade B</option>
                <option value="Grade C">Grade C</option>
                <option value="Grade D">Grade D</option>
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
          </div>
        </div>

        {/* Salary Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Salary Information</h2>
          </div>

          {/* Wage + Monthly Advantages */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Wage *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  value={form.wage || ''}
                  onChange={(e) => setForm({ ...form, wage: parseFloat(e.target.value) || 0 })}
                  required
                  placeholder="0.00"
                  className="w-full h-10 pl-8 pr-16 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">/ month</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Advantages in Cash</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  value={form.monthlyAdvantagesInCash || ''}
                  onChange={(e) => setForm({ ...form, monthlyAdvantagesInCash: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full h-10 pl-8 pr-16 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">/ month</span>
              </div>
            </div>
          </div>

          {/* Allowances */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Allowances</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { key: 'hra', label: 'HRA' },
                { key: 'da', label: 'DA' },
                { key: 'travelAllowance', label: 'Travel Allowance' },
                { key: 'mealAllowance', label: 'Meal Allowance' },
                { key: 'medicalAllowance', label: 'Medical Allowance' },
                { key: 'otherAllowance', label: 'Other Allowance' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      value={(form.allowances as any)[key] || ''}
                      onChange={(e) => updateAllowance(key, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-10 pl-8 pr-16 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400">/ month</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">Additional Details</h2>
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

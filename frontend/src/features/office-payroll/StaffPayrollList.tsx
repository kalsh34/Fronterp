import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, LoadingSpinner, Select } from '../../components/ui';
import api from '../../lib/api';

interface StaffRecord {
  _id: string;
  employeeId?: { firstName?: string; lastName?: string; employeeCode?: string; department?: string; _id?: string };
  basicSalary: number;
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableTransport: number;
  overtime: number;
  bonus: number;
  grossSalary: number;
  taxableSalary: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  attendanceDataMissing?: boolean;
  payrollPeriodId?: { monthName?: string; year?: number; startDate?: string; endDate?: string; _id?: string };
}

interface PayrollPeriod {
  _id: string;
  monthName: string;
  year: number;
  startDate: string;
  endDate: string;
  status?: string;
}

const PIPELINE_STEPS = [
  { key: 'generate', label: 'Generate', number: 1 },
  { key: 'calculate', label: 'Calculate', number: 2 },
  { key: 'submit', label: 'Submit', number: 3 },
  { key: 'check', label: 'Check', number: 4 },
  { key: 'approve', label: 'Approve', number: 5 },
  { key: 'pay', label: 'Pay', number: 6 },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    DRAFT: 0,
    GENERATED: 0,
    CALCULATED: 1,
    SUBMITTED: 2,
    CHECKED: 3,
    APPROVED: 4,
    PAID: 5,
    RETURNED: 1,
  };
  return map[status] ?? 0;
}

const formatCurrency = (n: number) => `${(n || 0).toLocaleString()} ETB`;

const StaffPayrollList: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('office');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      const response = await api.get('/api/payroll/periods');
      const data = response.data.data;
      setPeriods(data);
      if (data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch periods:', error);
    }
  }, []);

  const fetchPayroll = useCallback(async () => {
    if (!selectedPeriod) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/office-payroll?payrollPeriodId=${selectedPeriod}`);
      setRecords(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch office payroll:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const handleAction = async (id: string, action: string, body?: Record<string, unknown>) => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'salary') {
        await api.put(`/api/office-payroll/${id}/salary`, body);
      } else if (action === 'generate') {
        await api.post(`/api/office-payroll/generate/${selectedPeriod}`);
      } else {
        await api.post(`/api/office-payroll/${id}/${action}`);
      }
      fetchPayroll();
    } catch (error) {
      console.error(`Failed to ${action} payroll:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkCalculate = async () => {
    for (const record of records) {
      if (record.status === 'GENERATED' || record.status === 'DRAFT' || record.status === 'RETURNED') {
        await handleAction(record._id, 'calculate');
      }
    }
  };

  const handleBulkSubmit = async () => {
    for (const record of records) {
      if (record.status === 'CALCULATED' || record.status === 'DRAFT' || record.status === 'RETURNED') {
        await handleAction(record._id, 'submit');
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee Code', 'Name', 'Department', 'Basic Pay', 'Allowances', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
    const rows = records.map(r => [
      r.employeeId?.employeeCode || '',
      `${r.employeeId?.firstName || ''} ${r.employeeId?.lastName || ''}`,
      r.employeeId?.department || '',
      r.basicSalary,
      (r.responsibilityAllowance || 0) + (r.teleAllowance || 0) + (r.taxableTransport || 0) + (r.nonTaxableTransport || 0) + (r.overtime || 0) + (r.bonus || 0),
      r.grossSalary,
      r.totalDeductions,
      r.netPay,
      r.status,
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-payroll-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentStepIndex = records.length > 0 ? getStepIndex(records[0].status) : 0;
  const currentPeriod = periods.find(p => p._id === selectedPeriod);

  const stats = {
    staffCount: records.length,
    totalBasicSalary: records.reduce((sum, r) => sum + (r.basicSalary || 0), 0),
    totalGross: records.reduce((sum, r) => sum + (r.grossSalary || 0), 0),
    totalDeductions: records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0),
    totalNet: records.reduce((sum, r) => sum + (r.netPay || 0), 0),
    totalAllowances: records.reduce((sum, r) =>
      sum + (r.responsibilityAllowance || 0) + (r.teleAllowance || 0) + (r.taxableTransport || 0) + (r.nonTaxableTransport || 0) + (r.overtime || 0) + (r.bonus || 0), 0),
  };

  const getActionButton = (record: StaffRecord) => {
    const st = record.status;
    const id = record._id;
    const busy = actionLoading?.startsWith(`${id}-`);
    switch (st) {
      case 'DRAFT':
      case 'GENERATED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => handleAction(id, 'calculate')}
          >
            Calculate
          </button>
        );
      case 'CALCULATED':
      case 'RETURNED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => handleAction(id, 'submit')}
          >
            Submit
          </button>
        );
      case 'SUBMITTED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => handleAction(id, 'check')}
          >
            Check
          </button>
        );
      case 'CHECKED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => handleAction(id, 'approve')}
          >
            Approve
          </button>
        );
      case 'APPROVED':
        return (
          <button
            className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => handleAction(id, 'pay')}
          >
            Pay
          </button>
        );
      case 'PAID':
        return <span className="text-xs text-gray-400">Completed</span>;
      default:
        return null;
    }
  };

  const tabs = [
    { key: 'guard', label: 'Guard Payroll' },
    { key: 'office', label: 'Office Staff Payroll' },
    { key: 'history', label: 'Payroll History' },
    { key: 'reports', label: 'Reports' },
  ];

  const handleTabClick = (key: string) => {
    setActiveTab(key);
    if (key === 'guard') navigate('/guard-payroll');
    else if (key === 'history') navigate('/payroll/history');
    else if (key === 'reports') navigate('/payroll/reports');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Title + Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">Payroll / Office Staff Payroll</p>
        <h1 className="text-2xl font-bold text-gray-900">Staff Payroll Processing</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-6 ${
                      idx < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Batch Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Office Staff Payroll - {currentPeriod?.monthName} {currentPeriod?.year}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {currentPeriod?.startDate && currentPeriod?.endDate
                    ? `${new Date(currentPeriod.startDate).toLocaleDateString()} – ${new Date(currentPeriod.endDate).toLocaleDateString()}`
                    : 'Select a period'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={records[0]?.status || 'DRAFT'} />
                <Select
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
                  placeholder="Select Period"
                >
                  {periods.map(p => (
                    <option key={p._id} value={p._id}>{p.monthName} {p.year}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Staff Count</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.staffCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Basic Salary</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalBasicSalary)}</p>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Staff Payroll Records</h3>
            </div>
            {loading ? (
              <div className="p-12"><LoadingSpinner text="Loading payroll records..." /></div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-sm">No staff payroll records found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Pay</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Allowances</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Gross Pay</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Deductions</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Pay</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((record) => {
                      const allowances = (record.responsibilityAllowance || 0) + (record.teleAllowance || 0) +
                        (record.taxableTransport || 0) + (record.nonTaxableTransport || 0) + (record.overtime || 0) + (record.bonus || 0);
                      return (
                        <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                                {record.employeeId?.firstName?.[0] || record.employeeId?.lastName?.[0] || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {record.employeeId?.firstName} {record.employeeId?.lastName}
                                  {record.attendanceDataMissing && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="No attendance data logged for this period">
                                      No Attendance
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">{record.employeeId?.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {record.employeeId?.department || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(record.basicSalary)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">
                            {formatCurrency(allowances)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(record.grossSalary)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-red-600">
                            {formatCurrency(record.totalDeductions)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                            {formatCurrency(record.netPay)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getActionButton(record)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Salary Components Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Salary Components Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Basic Salary</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalBasicSalary)}</p>
                <p className="text-xs text-gray-400 mt-1">base compensation</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-indigo-700">Responsibility Allowance</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(records.reduce((sum, r) => sum + (r.responsibilityAllowance || 0), 0))}
                </p>
                <p className="text-xs text-gray-400 mt-1">role-based allowance</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-amber-700">Transport</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(records.reduce((sum, r) => sum + (r.taxableTransport || 0) + (r.nonTaxableTransport || 0), 0))}
                </p>
                <p className="text-xs text-gray-400 mt-1">taxable + non-taxable</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-green-700">Overtime</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(records.reduce((sum, r) => sum + (r.overtime || 0), 0))}
                </p>
                <p className="text-xs text-gray-400 mt-1">OT hours paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6 space-y-6">
            <h3 className="text-sm font-semibold text-gray-700">Batch Summary</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Staff</span>
                <span className="text-sm font-semibold text-gray-900">{stats.staffCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Gross Pay</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.totalGross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Deductions</span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(stats.totalDeductions)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Net Pay</span>
                <span className="text-base font-bold text-green-600">{formatCurrency(stats.totalNet)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleBulkCalculate}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculate All
              </button>
              <button
                onClick={handleBulkSubmit}
                className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit for Review
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPayrollList;

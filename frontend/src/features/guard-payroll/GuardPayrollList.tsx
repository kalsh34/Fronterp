import React, { useState, useEffect, useCallback } from 'react';
import { StatusBadge, LoadingSpinner, Select } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import api from '../../lib/api';

interface PayrollRecord {
  _id: string;
  guardId?: { firstName?: string; lastName?: string; employeeCode?: string; _id?: string };
  guardName: string;
  period: string;
  primarySiteId?: { siteName?: string };
  daysWorked?: number;
  normalHours: number;
  otHours: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  incomeTax?: number;
  employeePension?: number;
  loanDeduction?: number;
  status: string;
  payrollPeriodId?: { monthName?: string; year?: number; startDate?: string; endDate?: string; _id?: string };
}

interface PayrollPeriod {
  _id: string;
  monthName: string;
  year: number;
  startDate: string;
  endDate: string;
  name?: string;
}

const PIPELINE_STEPS = [
  { key: 'generate', label: 'Generate', number: 1 },
  { key: 'rate_entry', label: 'Rate Entry', number: 2 },
  { key: 'calculate', label: 'Calculate', number: 3 },
  { key: 'submit', label: 'Submit', number: 4 },
  { key: 'check', label: 'Check', number: 5 },
  { key: 'approve', label: 'Approve', number: 6 },
  { key: 'pay', label: 'Pay', number: 7 },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    DRAFT: 0,
    GENERATED: 1,
    RATE_ENTERED: 2,
    CALCULATED: 3,
    SUBMITTED: 4,
    CHECKED: 5,
    APPROVED: 6,
    PAID: 7,
    RETURNED: 1,
  };
  return map[status] ?? 0;
}

const GuardPayrollList: React.FC = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('guard');
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
      const response = await api.get(`/guard-payroll?period=${selectedPeriod}`);
      setRecords(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      await api.post(`/guard-payroll/${id}/${action}`);
      fetchPayroll();
    } catch (error) {
      console.error(`Failed to ${action} payroll:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const currentStepIndex = records.length > 0 ? getStepIndex(records[0].status) : 0;
  const currentPeriod = periods.find(p => p._id === selectedPeriod);

  const stats = {
    guardCount: records.length,
    totalNormalHours: records.reduce((sum, r) => sum + (r.normalHours || 0), 0),
    totalOvertime: records.reduce((sum, r) => sum + (r.otHours || 0), 0),
    totalGross: records.reduce((sum, r) => sum + (r.grossPay || 0), 0),
    totalDeductions: records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0),
    totalNet: records.reduce((sum, r) => sum + (r.netPay || 0), 0),
  };

  const getActionButton = (record: PayrollRecord) => {
    const st = record.status;
    const id = record._id;
    const busy = actionLoading === `${id}-`;
    const isOps = user?.role === UserRole.OPERATIONS;
    switch (st) {
      case 'DRAFT':
        return (
          <div className="flex items-center gap-2 justify-center">
            {isOps && (
              <button
                className="text-xs font-medium text-violet-600 hover:text-violet-800"
                onClick={() => handleAction(id, 'rate-entry')}
              >
                Edit Hours
              </button>
            )}
            <button
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
              disabled={busy}
              onClick={() => handleAction(id, 'generate')}
            >
              Generate
            </button>
          </div>
        );
      case 'GENERATED':
        return (
          <div className="flex items-center gap-2 justify-center">
            {isOps && (
              <button
                className="text-xs font-medium text-violet-600 hover:text-violet-800"
                onClick={() => handleAction(id, 'rate-entry')}
              >
                Edit Hours
              </button>
            )}
            <button
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
              disabled={busy}
              onClick={() => handleAction(id, 'rate-entry')}
            >
              Enter Rates
            </button>
          </div>
        );
      case 'RATE_ENTERED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            disabled={busy}
            onClick={() => handleAction(id, 'calculate')}
          >
            Calculate
          </button>
        );
      case 'CALCULATED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            disabled={busy}
            onClick={() => handleAction(id, 'submit')}
          >
            Submit
          </button>
        );
      case 'SUBMITTED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            disabled={busy}
            onClick={() => handleAction(id, 'check')}
          >
            Check
          </button>
        );
      case 'CHECKED':
        return (
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            disabled={busy}
            onClick={() => handleAction(id, 'approve')}
          >
            Approve
          </button>
        );
      case 'APPROVED':
        return (
          <button
            className="text-xs font-medium text-green-600 hover:text-green-800"
            disabled={busy}
            onClick={() => handleAction(id, 'pay')}
          >
            Pay
          </button>
        );
      case 'RETURNED':
        return (
          <div className="flex items-center gap-2 justify-center">
            {isOps && (
              <button
                className="text-xs font-medium text-violet-600 hover:text-violet-800"
                onClick={() => handleAction(id, 'rate-entry')}
              >
                Edit Hours
              </button>
            )}
            <button
              className="text-xs font-medium text-amber-600 hover:text-amber-800"
              disabled={busy}
              onClick={() => handleAction(id, 'rate-entry')}
            >
              Re-enter
            </button>
          </div>
        );
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Title + Breadcrumb */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">Payroll / Guard Payroll</p>
        <h1 className="text-2xl font-bold text-gray-900">Guard Payroll Processing</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
                  Guard Payroll - {currentPeriod?.monthName} {currentPeriod?.year}
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
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Guard Count</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.guardCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Standard Rate Hours</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalNormalHours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Overtime Hours</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalOvertime.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Guard Payroll Records</h3>
            </div>
            {loading ? (
              <div className="p-12"><LoadingSpinner text="Loading payroll records..." /></div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-sm">No payroll records found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guard Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours (Reg/OT)</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Gross Pay</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Deductions</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Pay</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                              {record.guardId?.firstName?.[0] || record.guardName?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {record.guardId?.firstName} {record.guardId?.lastName}
                              </p>
                              <p className="text-xs text-gray-400">{record.guardId?.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.primarySiteId?.siteName || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-center">
                          {record.daysWorked ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="text-gray-700">{(record.normalHours || 0).toFixed(1)}</span>
                          <span className="text-gray-300 mx-1">/</span>
                          <span className="text-amber-600">{(record.otHours || 0).toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {(record.grossPay || 0).toLocaleString()} ETB
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-red-600">
                          {(record.totalDeductions || 0).toLocaleString()} ETB
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                          {(record.netPay || 0).toLocaleString()} ETB
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getActionButton(record)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shift & Rate Details Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Shift & Rate Details Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Day Shifts</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.totalNormalHours.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">hours worked</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-indigo-700">Night Shifts</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{(stats.totalNormalHours * 0.3).toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">hours worked</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-amber-700">Overtime</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.totalOvertime.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">OT hours</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-green-700">Weekend Allowance</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{(stats.totalGross * 0.05).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">ETB estimated</p>
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
                <span className="text-sm text-gray-500">Total Active Guards</span>
                <span className="text-sm font-semibold text-gray-900">{stats.guardCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Calculated Gross Pay</span>
                <span className="text-sm font-semibold text-gray-900">{stats.totalGross.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Deductions</span>
                <span className="text-sm font-semibold text-red-600">{stats.totalDeductions.toLocaleString()} ETB</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Projected Net Pay</span>
                <span className="text-base font-bold text-green-600">{stats.totalNet.toLocaleString()} ETB</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <button className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculate All Metrics
              </button>
              <button className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit for Review
              </button>
              <button className="w-full px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Ledger CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardPayrollList;

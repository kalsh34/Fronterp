import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StatusBadge, LoadingSpinner } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import api from '../../lib/api';

interface PayrollRecord {
  _id: string;
  guardId?: { firstName?: string; lastName?: string; employeeCode?: string; _id?: string };
  guardName: string;
  period: string;
  primarySiteId?: { siteName?: string; _id?: string };
  daysWorked?: number;
  normalHours: number;
  otHours: number;
  regularOtHours: number;
  holidayOtHours: number;
  holidayHours?: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  incomeTax?: number;
  employeePension?: number;
  employerPension?: number;
  loanDeduction?: number;
  normalSalary?: number;
  workedSalary?: number;
  otPay?: number;
  regularOtPay?: number;
  holidayOtPay?: number;
  secondaryShiftPay?: number;
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
  status?: string;
}

const formatCurrency = (n: number) => `ETB ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatHours = (n: number) => `${(n || 0).toFixed(1)}h`;

export default function GuardPayrollList() {
  const { user } = useAuthStore();
  const downloadRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [otModalOpen, setOtModalOpen] = useState(false);
  const [otRecordId, setOtRecordId] = useState<string | null>(null);
  const [otRegularHours, setOtRegularHours] = useState(0);
  const [otHolidayHours, setOtHolidayHours] = useState(0);
  const [otSaving, setOtSaving] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payRecordId, setPayRecordId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payReference, setPayReference] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  const handleOpenOtModal = (id: string) => {
    setOtRecordId(id);
    setOtRegularHours(0);
    setOtHolidayHours(0);
    setOtModalOpen(true);
  };

  const handleSaveOt = async () => {
    if (!otRecordId) return;
    setOtSaving(true);
    try {
      await api.post(`/guard-payroll/${otRecordId}/enter-ot`, {
        regularOtHours: otRegularHours,
        holidayOtHours: otHolidayHours,
      });
      setOtModalOpen(false);
      fetchPayroll();
    } catch (error) {
      console.error('Failed to save OT:', error);
    } finally {
      setOtSaving(false);
    }
  };

  const handleOpenPayModal = (id: string) => {
    setPayRecordId(id);
    setPayMethod('BANK_TRANSFER');
    setPayReference('');
    setPayModalOpen(true);
  };

  const handleConfirmPaid = async () => {
    if (!payRecordId) return;
    setPaySaving(true);
    try {
      await api.post(`/guard-payroll/${payRecordId}/confirm-paid`, {
        paymentMethod: payMethod,
        bankReference: payReference || undefined,
        paymentDate: new Date(),
      });
      setPayModalOpen(false);
      fetchPayroll();
    } catch (error) {
      console.error('Failed to confirm paid:', error);
    } finally {
      setPaySaving(false);
    }
  };

  const fetchPeriods = useCallback(async () => {
    try {
      const response = await api.get('/finance/periods');
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
      const response = await api.get(`/guard-payroll?payrollPeriodId=${selectedPeriod}&limit=500`);
      setRecords(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  useEffect(() => { setPage(1); }, [searchQuery, siteFilter, statusFilter, selectedPeriod]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    records.forEach(r => {
      if (r.primarySiteId?.siteName && r.primarySiteId?._id) {
        sites.set(r.primarySiteId._id, r.primarySiteId.siteName);
      }
    });
    return Array.from(sites.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const name = `${r.guardId?.firstName || ''} ${r.guardId?.lastName || ''}`.toLowerCase();
      const code = (r.guardId?.employeeCode || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || name.includes(q) || code.includes(q);
      const matchesSite = siteFilter === 'all' || r.primarySiteId?._id === siteFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [records, searchQuery, siteFilter, statusFilter]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  const stats = useMemo(() => ({
    totalGuards: records.length,
    totalPayroll: records.reduce((sum, r) => sum + (r.grossPay || 0), 0),
    totalDeductions: records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0),
    netPay: records.reduce((sum, r) => sum + (r.netPay || 0), 0),
  }), [records]);

  const handleExportCSV = () => {
    const headers = ['Guard Name', 'Guard ID', 'Site', 'Days', 'Normal Hours', 'OT Hours', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
    const rows = filteredRecords.map(r => [
      `${r.guardId?.firstName || ''} ${r.guardId?.lastName || ''}`,
      r.guardId?.employeeCode || '',
      r.primarySiteId?.siteName || '',
      r.daysWorked ?? '',
      r.normalHours || 0,
      r.otHours || 0,
      r.grossPay || 0,
      r.totalDeductions || 0,
      r.netPay || 0,
      r.status,
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guard-payroll-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };

  const currentPeriod = periods.find(p => p._id === selectedPeriod);

  const getPeriodRange = (r: PayrollRecord) => {
    if (r.payrollPeriodId?.startDate && r.payrollPeriodId?.endDate) {
      const s = new Date(r.payrollPeriodId.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = new Date(r.payrollPeriodId.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} – ${e}`;
    }
    return `${currentPeriod?.monthName || ''} ${currentPeriod?.year || ''}`;
  };

  const getActionButtons = (record: PayrollRecord) => {
    const st = record.status;
    const id = record._id;
    const busy = actionLoading?.startsWith(`${id}-`);
    const isOps = user?.role === UserRole.OPERATIONS;

    switch (st) {
      case 'DRAFT':
        return (
          <div className="flex items-center gap-2">
            {isOps && (
              <button className="text-xs font-medium text-violet-600 hover:text-violet-800" onClick={() => handleAction(id, 'update-hours')}>Edit Hours</button>
            )}
            <button className="text-xs font-medium text-amber-600 hover:text-amber-800" onClick={() => handleOpenOtModal(id)}>Enter OT</button>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'calculate')}>Calculate</button>
          </div>
        );
      case 'SUBMITTED':
        return (
          <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'check')}>Check</button>
        );
      case 'CALCULATED':
        return (
          <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'submit')}>Submit</button>
        );
      case 'RETURNED':
        return (
          <div className="flex items-center gap-2">
            {isOps && (
              <button className="text-xs font-medium text-violet-600 hover:text-violet-800" onClick={() => handleAction(id, 'update-hours')}>Edit Hours</button>
            )}
            <button className="text-xs font-medium text-amber-600 hover:text-amber-800" onClick={() => handleOpenOtModal(id)}>Enter OT</button>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'calculate')}>Calculate</button>
          </div>
        );
      case 'CHECKED':
        return (
          <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'approve')}>Approve</button>
        );
      case 'APPROVED':
        return (
          <button className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => handleAction(id, 'initiate-payment')}>Initiate Payment</button>
        );
      case 'PAYMENT_PROCESSING':
        return (
          <button className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50" disabled={busy} onClick={() => handleOpenPayModal(id)}>Confirm Paid</button>
        );
      case 'PAID':
        return <span className="px-3 py-2 text-xs text-gray-400">Completed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6 min-w-0">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-400 mb-1">Payroll / Guard Payroll / Payroll History</p>

          {/* Title + Download */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Guard Payroll History</h1>
            </div>
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setDownloadOpen(!downloadOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
                <svg className={`w-4 h-4 transition-transform ${downloadOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {downloadOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2">
                  <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <div className="text-left">
                      <p className="font-medium">Download CSV</p>
                      <p className="text-xs text-gray-400">Comma separated values</p>
                    </div>
                  </button>
                  <button onClick={() => setDownloadOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <div className="text-left">
                      <p className="font-medium">Download Excel</p>
                      <p className="text-xs text-gray-400">Microsoft Excel format</p>
                    </div>
                  </button>
                  <button onClick={() => setDownloadOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <div className="text-left">
                      <p className="font-medium">Download PDF</p>
                      <p className="text-xs text-gray-400">Portable document format</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      <div className="text-left">
                        <p className="font-medium">Download All</p>
                        <p className="text-xs text-gray-400">ZIP (CSV + Excel + PDF)</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {/* Toggle between Guard Payroll and Office Staff Payroll views <button
  onClick={() => navigate('/guard-payroll')}
  // Active tab styling — solid blue background, white text
  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white shadow-sm"
>
  Guard Payroll
</button>
<button
  onClick={() => navigate('/staff-payroll')}
  // Inactive tab styling — white background with border, hover state
  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
>
  Office Staff Payroll
</button>*/}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGuards}</p>
              <p className="text-sm text-gray-500 mt-0.5">Active guards</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPayroll)}</p>
              <p className="text-sm text-gray-500 mt-0.5">Across all guards</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDeductions)}</p>
              <p className="text-sm text-gray-500 mt-0.5">This month</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.netPay)}</p>
              <p className="text-sm text-gray-500 mt-0.5">After deductions</p>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Site / Post</label>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="all">All Sites</option>
                {uniqueSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Guard</label>
              <select
                value="all"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="all">All Guards</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Pay Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                {periods.map(p => (
                  <option key={p._id} value={p._id}>{p.monthName} {p.year}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Payroll Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="RATE_ENTERED">Rate Entered</option>
                <option value="CALCULATED">Calculated</option>
                <option value="CHECKED">Checked</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by guard name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Guard Payroll Records</h3>
            </div>
            {loading ? (
              <div className="p-12"><LoadingSpinner text="Loading payroll records..." /></div>
            ) : paginatedRecords.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-sm">No payroll records found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guard</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guard ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Site / Post</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pay Period</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Hours<br /><span className="font-normal text-gray-400">(Std + OT)</span></th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Overtime<br />Hours</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Gross Pay</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Deductions</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Pay</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRecords.map((record) => {
                      const isSelected = selectedRecord?._id === record._id;
                      const totalHours = (record.normalHours || 0) + (record.otHours || 0);
                      return (
                        <tr
                          key={record._id}
                          onClick={() => setSelectedRecord(isSelected ? null : record)}
                          className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                {record.guardId?.firstName?.[0]}{record.guardId?.lastName?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {record.guardId?.firstName} {record.guardId?.lastName}
                                </p>
                                <p className="text-xs text-gray-400">Security Guard</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-mono">{record.guardId?.employeeCode || '—'}</td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm text-gray-900">{record.primarySiteId?.siteName || '—'}</p>
                              <p className="text-xs text-gray-400">POST-01</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{getPeriodRange(record)}</td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="font-medium text-gray-900">{formatHours(record.normalHours)}</span>
                            <span className="text-gray-300 mx-1">+</span>
                            <span className="text-amber-600">{formatHours(record.otHours)}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{formatHours(totalHours)}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-center font-medium text-gray-900">{formatHours(record.otHours)}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(record.grossPay)}</td>
                          <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(record.totalDeductions)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{formatCurrency(record.netPay)}</td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedRecord(record)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="View details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {getActionButtons(record) && (
                                <div className="relative group">
                                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                                    </svg>
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                                    {getActionButtons(record)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredRecords.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Rows per page</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="h-8 px-2 rounded border border-gray-200 text-sm text-gray-700"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Sidebar */}
        {selectedRecord && (
          <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white min-h-screen p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-700">Payroll Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Guard Profile */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                {selectedRecord.guardId?.firstName?.[0]}{selectedRecord.guardId?.lastName?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedRecord.guardId?.firstName} {selectedRecord.guardId?.lastName}
                </p>
                <p className="text-xs text-gray-500">{selectedRecord.guardId?.employeeCode}</p>
                <StatusBadge status={selectedRecord.status} className="mt-1" />
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">{selectedRecord.primarySiteId?.siteName || '—'}</p>

            {/* Payroll Summary */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Payroll Summary ({currentPeriod?.monthName} {currentPeriod?.year})
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Standard Hours</span>
                  <span className="text-sm font-medium text-gray-900">{formatHours(selectedRecord.normalHours)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Overtime Hours</span>
                  <span className="text-sm font-medium text-gray-900">{formatHours(selectedRecord.otHours)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Gross Pay</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(selectedRecord.grossPay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Allowances</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedRecord.secondaryShiftPay || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Deductions</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(selectedRecord.totalDeductions)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Net Pay</span>
                  <span className="text-base font-bold text-green-600">{formatCurrency(selectedRecord.netPay)}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Payment Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Income Tax</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedRecord.incomeTax || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Employee Pension</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedRecord.employeePension || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Employer Pension</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedRecord.employerPension || 0)}</span>
                </div>
                {selectedRecord.loanDeduction ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Loan Deduction</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedRecord.loanDeduction)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <button className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Payroll Details
              </button>
              <button className="w-full px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Payslip
              </button>
            </div>
          </div>
        )}
      </div>

      {otModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Overtime Hours</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regular OT Hours</label>
                <input type="number" step="0.5" min="0" value={otRegularHours} onChange={(e) => setOtRegularHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday OT Hours</label>
                <input type="number" step="0.5" min="0" value={otHolidayHours} onChange={(e) => setOtHolidayHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setOtModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveOt} disabled={otSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{otSaving ? 'Saving...' : 'Save OT'}</button>
            </div>
          </div>
        </div>
      )}

      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Reference</label>
                <input type="text" value={payReference} onChange={(e) => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirmPaid} disabled={paySaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">{paySaving ? 'Saving...' : 'Confirm Paid'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

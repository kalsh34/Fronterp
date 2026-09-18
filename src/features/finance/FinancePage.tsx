import { useState, useEffect } from 'react';
import api from '../../lib/api';

const tabs = ['Overview', 'Invoicing', 'Payments', 'General Ledger', 'Budgets', 'Tax', 'Fixed Assets'];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface JournalEntry {
  _id: string;
  entryNumber: string;
  entryDate: string;
  entryType: string;
  description: string;
  reference: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  lines: { accountCode: string; accountName: string; description: string; debit: number; credit: number }[];
}

interface DashboardSummary {
  totalRevenueYTD: number;
  totalExpensesYTD: number;
  netProfitYTD: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  cashBalance: number;
  accountSummary: { accountCode: string; accountName: string; totalDebit: number; totalCredit: number }[];
  recentEntries: JournalEntry[];
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: string;
  amount: number;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  createdAt: string;
}

interface Payment {
  _id: string;
  reference: string;
  payee: string;
  amount: number;
  date: string;
  method: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

interface Budget {
  _id: string;
  category: string;
  budgeted: number;
  actual: number;
  department: string;
}

interface FixedAsset {
  _id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationRate: number;
  status: 'ACTIVE' | 'DISPOSED' | 'UNDER_MAINTENANCE';
}

const sampleInvoices: Invoice[] = [
  { _id: '1', invoiceNumber: 'INV-2024-001', client: 'Omega PetroCorp', amount: 45000, dueDate: '2024-11-15', status: 'SENT', createdAt: '2024-10-01' },
  { _id: '2', invoiceNumber: 'INV-2024-002', client: 'Metro Transit Authority', amount: 32000, dueDate: '2024-11-20', status: 'PAID', createdAt: '2024-10-05' },
  { _id: '3', invoiceNumber: 'INV-2024-003', client: 'Crown Real Estate', amount: 28500, dueDate: '2024-10-30', status: 'OVERDUE', createdAt: '2024-09-25' },
  { _id: '4', invoiceNumber: 'INV-2024-004', client: 'Zenith Holdings', amount: 18200, dueDate: '2024-12-01', status: 'DRAFT', createdAt: '2024-10-20' },
];

const samplePayments: Payment[] = [
  { _id: '1', reference: 'PAY-001', payee: 'Staff Salaries - October', amount: 85000, date: '2024-10-28', method: 'Bank Transfer', status: 'COMPLETED' },
  { _id: '2', reference: 'PAY-002', payee: 'Guard Payroll - October', amount: 124000, date: '2024-10-28', method: 'Bank Transfer', status: 'COMPLETED' },
  { _id: '3', reference: 'PAY-003', payee: 'Office Supplies Co.', amount: 3200, date: '2024-10-22', method: 'Cash', status: 'COMPLETED' },
  { _id: '4', reference: 'PAY-004', payee: 'Fleet Maintenance Ltd.', amount: 8500, date: '2024-10-25', method: 'Bank Transfer', status: 'PENDING' },
];

const sampleBudgets: Budget[] = [
  { _id: '1', category: 'Guard Operations', budgeted: 240000, actual: 228000, department: 'Operations' },
  { _id: '2', category: 'Fleet Logistics', budgeted: 90000, actual: 96000, department: 'Operations' },
  { _id: '3', category: 'Office Admin', budgeted: 45000, actual: 38000, department: 'Administration' },
  { _id: '4', category: 'HR & Training', budgeted: 35000, actual: 32000, department: 'HR' },
  { _id: '5', category: 'IT & Systems', budgeted: 28000, actual: 31000, department: 'IT' },
];

const sampleAssets: FixedAsset[] = [
  { _id: '1', name: 'Toyota Hilux - Fleet #1', category: 'Vehicle', purchaseDate: '2022-03-15', purchasePrice: 45000, currentValue: 32000, depreciationRate: 15, status: 'ACTIVE' },
  { _id: '2', name: 'Office Building - HQ', category: 'Property', purchaseDate: '2020-01-10', purchasePrice: 350000, currentValue: 310000, depreciationRate: 2, status: 'ACTIVE' },
  { _id: '3', name: 'Server Infrastructure', category: 'Equipment', purchaseDate: '2023-06-01', purchasePrice: 25000, currentValue: 18000, depreciationRate: 20, status: 'ACTIVE' },
  { _id: '4', name: 'CCTV System - Site A', category: 'Equipment', purchaseDate: '2023-02-20', purchasePrice: 12000, currentValue: 8400, depreciationRate: 15, status: 'ACTIVE' },
];

const statusColors: Record<string, string> = {
  Posted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POSTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISPOSED: 'bg-gray-50 text-gray-600 border-gray-200',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  VOID: 'bg-red-50 text-red-700 border-red-200',
};

function formatMoney(n: number) {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [ledgerFilter, setLedgerFilter] = useState<'All' | 'PAYROLL' | 'MANUAL' | 'ADJUSTMENT'>('All');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalPage, setJournalPage] = useState(1);
  const [journalTotal, setJournalTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, journalRes] = await Promise.all([
          api.get('/journal/dashboard').catch(() => ({ data: { data: null } })),
          api.get('/journal', { params: { page: 1, limit: 20 } }).catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
        ]);
        setDashboard(dashRes.data.data);
        setJournalEntries(journalRes.data.data || []);
        setJournalTotal(journalRes.data.pagination?.total || 0);
      } catch { /* ok */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const loadMoreJournal = async (page: number) => {
    const params: any = { page, limit: 20 };
    if (ledgerFilter !== 'All') params.entryType = ledgerFilter;
    const res = await api.get('/journal', { params }).catch(() => ({ data: { data: [], pagination: { total: 0 } } }));
    setJournalEntries((prev) => page === 1 ? (res.data.data || []) : [...prev, ...(res.data.data || [])]);
    setJournalTotal(res.data.pagination?.total || 0);
    setJournalPage(page);
  };

  useEffect(() => {
    if (!loading) loadMoreJournal(1);
  }, [ledgerFilter]);

  const stats = dashboard || { totalRevenueYTD: 0, totalExpensesYTD: 0, netProfitYTD: 0, monthlyRevenue: 0, monthlyExpenses: 0, cashBalance: 0, accountSummary: [], recentEntries: [] };

  const filteredLedger = ledgerFilter === 'All'
    ? journalEntries
    : journalEntries.filter((e) => e.entryType === ledgerFilter);

  const arClients = [
    { name: 'Omega PetroCorp', paid: 75, pending: 25 },
    { name: 'Metro Transit Authority', paid: 60, pending: 40 },
    { name: 'Crown Real Estate', paid: 40, pending: 60 },
  ];

  const payrollAccounts = stats.accountSummary.filter((a) => a.accountCode.startsWith('5'));
  const revenueAccounts = stats.accountSummary.filter((a) => a.accountCode.startsWith('4') || a.accountCode.startsWith('8'));
  const balanceAccounts = stats.accountSummary.filter((a) => a.accountCode.startsWith('1') || a.accountCode.startsWith('2'));

  const monthlyData = months.map((_, i) => ({
    revenue: i <= new Date().getMonth() ? Math.round(stats.monthlyRevenue / (new Date().getMonth() + 1)) : 0,
    expense: i <= new Date().getMonth() ? Math.round(stats.monthlyExpenses / (new Date().getMonth() + 1)) : 0,
  }));
  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.revenue, d.expense)), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>Vital Security PLC</span>
          <span>/</span>
          <span>Finance & Operations</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Control Tower</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === i
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'TOTAL REVENUE YTD', value: formatMoney(stats.totalRevenueYTD), trend: stats.monthlyRevenue > 0 ? `+${((stats.monthlyRevenue / (stats.totalRevenueYTD || 1)) * 100).toFixed(1)}%` : '', up: true },
              { label: 'TOTAL EXPENSES YTD', value: formatMoney(stats.totalExpensesYTD), trend: stats.monthlyExpenses > 0 ? `+${((stats.monthlyExpenses / (stats.totalExpensesYTD || 1)) * 100).toFixed(1)}%` : '', up: true },
              { label: 'NET PROFIT', value: formatMoney(stats.netProfitYTD), trend: stats.netProfitYTD > 0 ? 'Positive' : stats.netProfitYTD < 0 ? 'Negative' : '', up: stats.netProfitYTD >= 0 },
              { label: 'CASH BALANCE', value: formatMoney(stats.cashBalance), trend: '', up: true },
              { label: 'JOURNAL ENTRIES', value: journalTotal.toString(), trend: '', up: true },
              { label: 'ACCOUNTS TRACKED', value: stats.accountSummary.length.toString(), trend: '', up: true },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">{s.value}</span>
                  {s.trend && (
                    <span className={`text-[10px] font-semibold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                      {s.up ? '↗' : '↘'} {s.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-6">
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Revenue vs Expenses Monthly Trend</h3>
                  <p className="text-xs text-gray-400 mt-1">Fiscal Year {new Date().getFullYear()} — Operational Cash Movements</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-300" /> Expenses</span>
                </div>
              </div>
              <div className="flex items-end gap-3 h-56">
                {months.map((m, i) => (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 w-full" style={{ height: '200px' }}>
                      <div
                        className="flex-1 bg-blue-600 rounded-t"
                        style={{ height: `${(monthlyData[i].revenue / maxVal) * 100}%`, minHeight: monthlyData[i].revenue > 0 ? '4px' : '0' }}
                      />
                      <div
                        className="flex-1 bg-blue-300 rounded-t"
                        style={{ height: `${(monthlyData[i].expense / maxVal) * 100}%`, minHeight: monthlyData[i].expense > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-72 flex-shrink-0 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">AR Aging Breakdown (by Client)</h3>
                <div className="space-y-4">
                  {arClients.map((client) => (
                    <div key={client.name}>
                      <p className="text-xs font-medium text-gray-700 mb-1.5">{client.name}</p>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-600 rounded-l" style={{ width: `${client.paid}%` }} />
                        <div className="bg-amber-400" style={{ width: `${client.pending}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>{client.paid}% paid</span>
                        <span>{client.pending}% pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Budget vs Actual (Monthly)</h3>
                <div className="space-y-4">
                  {sampleBudgets.slice(0, 3).map((b) => {
                    const pct = b.budgeted > 0 ? Math.round((b.actual / b.budgeted) * 100) : 0;
                    return (
                      <div key={b._id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{b.category}</span>
                          <span className="text-gray-400">${(b.actual / 1000).toFixed(0)}K / ${(b.budgeted / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Recent Ledger Activity</h3>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {(['All', 'PAYROLL', 'MANUAL', 'ADJUSTMENT'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLedgerFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      ledgerFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'All' ? 'All' : f === 'PAYROLL' ? 'Payroll' : f === 'MANUAL' ? 'Manual' : 'Adjustment'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entry #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Debit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Credit</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                        No journal entries yet. Entries are created automatically when payroll is paid.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((entry) => (
                      <tr key={entry._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-blue-600">{entry.entryNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">{entry.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.reference}</td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-emerald-600">
                          {entry.totalDebit > 0 ? `+$${entry.totalDebit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-red-600">
                          {entry.totalCredit > 0 ? `-$${entry.totalCredit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            entry.entryType === 'PAYROLL' ? 'bg-blue-50 text-blue-600' :
                            entry.entryType === 'MANUAL' ? 'bg-purple-50 text-purple-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {entry.entryType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[entry.status] || ''}`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {journalEntries.length < journalTotal && (
              <div className="mt-4 text-center">
                <button onClick={() => loadMoreJournal(journalPage + 1)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Load more entries
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
            <button className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Invoice
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 text-gray-700">{inv.client}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">${inv.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-gray-600">{new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[inv.status] || ''}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Payments</h3>
            <button className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Record Payment
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Payee</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {samplePayments.map((pay) => (
                  <tr key={pay._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-blue-600">{pay.reference}</td>
                    <td className="px-5 py-3.5 text-gray-700">{pay.payee}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-red-600">-${pay.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-gray-600">{new Date(pay.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5 text-gray-600">{pay.method}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[pay.status] || ''}`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">General Ledger</h3>
            <div className="flex gap-2">
              <button className="h-9 px-4 flex items-center gap-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Name</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Debit</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Credit</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody>
                {balanceAccounts.length === 0 && payrollAccounts.length === 0 && revenueAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                      No accounts with activity yet. Accounts are populated when payroll is processed.
                    </td>
                  </tr>
                ) : (
                  [...balanceAccounts, ...revenueAccounts, ...payrollAccounts].map((a) => {
                    const balance = a.totalDebit - a.totalCredit;
                    return (
                      <tr key={a.accountCode} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-blue-600">{a.accountCode}</td>
                        <td className="px-5 py-3.5 text-gray-700">{a.accountName}</td>
                        <td className="px-5 py-3.5 text-right text-emerald-600">${a.totalDebit.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-red-600">${a.totalCredit.toLocaleString()}</td>
                        <td className={`px-5 py-3.5 text-right font-medium ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                          ${Math.abs(balance).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Budget Management</h3>
            <button className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Budget
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Budgeted</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actual</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Utilization</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody>
                {sampleBudgets.map((b) => {
                  const pct = b.budgeted > 0 ? Math.round((b.actual / b.budgeted) * 100) : 0;
                  const variance = b.budgeted - b.actual;
                  return (
                    <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{b.category}</td>
                      <td className="px-5 py-3.5 text-gray-600">{b.department}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700">${b.budgeted.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700">${b.actual.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-right font-medium ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {variance >= 0 ? '+' : ''}${variance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 5 && (
        <div className="space-y-6">
          <h3 className="text-base font-semibold text-gray-900">Tax Management</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Income Tax Collected', value: formatMoney(payrollAccounts.filter((a) => a.accountCode === '2200').reduce((s, a) => s + a.totalCredit, 0)), period: 'YTD', color: 'bg-emerald-50 border-emerald-200' },
              { label: 'Pension Contributions', value: formatMoney(payrollAccounts.filter((a) => a.accountCode === '2210').reduce((s, a) => s + a.totalCredit, 0)), period: 'YTD', color: 'bg-blue-50 border-blue-200' },
              { label: 'Employer Pension Cost', value: formatMoney(payrollAccounts.filter((a) => a.accountCode === '5200').reduce((s, a) => s + a.totalDebit, 0)), period: 'YTD', color: 'bg-amber-50 border-amber-200' },
            ].map((t) => (
              <div key={t.label} className={`rounded-xl border p-6 ${t.color}`}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.label}</p>
                <p className="text-2xl font-bold text-gray-900">{t.value}</p>
                <p className="text-xs text-gray-400 mt-1">{t.period}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Tax Brackets (Employee Income Tax)</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Bracket</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400">Rate</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { range: '≤ 2,000', rate: '0%', deduction: '0' },
                  { range: '2,001 – 4,000', rate: '15%', deduction: '300' },
                  { range: '4,001 – 7,000', rate: '20%', deduction: '500' },
                  { range: '7,001 – 10,000', rate: '25%', deduction: '850' },
                  { range: '10,001 – 14,000', rate: '30%', deduction: '1,350' },
                  { range: '> 14,000', rate: '35%', deduction: '2,050' },
                ].map((b) => (
                  <tr key={b.range} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{b.range}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{b.rate}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{b.deduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Fixed Assets Register</h3>
            <button className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Asset
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'TOTAL ASSETS', value: sampleAssets.length.toString(), dot: 'bg-blue-500' },
              { label: 'TOTAL VALUE', value: `$${(sampleAssets.reduce((s, a) => s + a.purchasePrice, 0) / 1000).toFixed(0)}K`, dot: 'bg-emerald-500' },
              { label: 'CURRENT VALUE', value: `$${(sampleAssets.reduce((s, a) => s + a.currentValue, 0) / 1000).toFixed(0)}K`, dot: 'bg-amber-500' },
              { label: 'UNDER MAINTENANCE', value: sampleAssets.filter((a) => a.status === 'UNDER_MAINTENANCE').length.toString(), dot: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-xl font-bold text-gray-900">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchase Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchase Price</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Value</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Depr. Rate</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleAssets.map((asset) => (
                  <tr key={asset._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{asset.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{asset.category}</td>
                    <td className="px-5 py-3.5 text-gray-600">{new Date(asset.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">${asset.purchasePrice.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">${asset.currentValue.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{asset.depreciationRate}%</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[asset.status] || ''}`}>
                        {asset.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

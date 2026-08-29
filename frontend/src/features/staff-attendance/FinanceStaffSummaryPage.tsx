import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { Button } from '../../components/ui';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

interface StatusCounts {
  PRESENT: number;
  ABSENT: number;
  PAID_LEAVE: number;
  UNPAID_LEAVE: number;
  SICK_LEAVE: number;
  HALF_DAY: number;
  HOLIDAY: number;
  WEEKEND: number;
}

interface StaffSummary {
  employee: Employee;
  counts: StatusCounts;
  payableDays: number;
  totalDaysInMonth: number;
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function FinanceStaffSummaryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summaries, setSummaries] = useState<StaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`);
      setSummaries(res.data.data.summaries || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = summaries.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase();
    const code = s.employee.employeeCode.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handlePrint = () => {
    const printContent = document.getElementById('summary-table');
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Attendance Summary - ${monthNames[month-1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #666; margin-top: 0; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
        th { background: #f3f4f6; font-weight: 600; }
        .text-left { text-align: left; }
        .payable { background: #dcfce7; font-weight: 700; color: #166534; }
        .formula { margin-top: 16px; font-size: 11px; color: #555; border: 1px solid #ddd; padding: 10px; }
        .header { margin-bottom: 20px; }
        .header p { color: #888; font-size: 12px; }
      </style></head><body>
      <div class="header">
        <h1>Vital Security PLC — Monthly Staff Attendance Summary</h1>
        <h2>${monthNames[month-1]} ${year}</h2>
      </div>
      ${printContent.innerHTML}
      <div class="formula">
        <strong>Payroll Formula:</strong> payable_days = PRESENT + HOLIDAY + PAID_LEAVE + SICK_LEAVE + (HALF_DAY x 0.5)<br>
        ABSENT and UNPAID_LEAVE do not count toward payable days.
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Staff Attendance Summary"
        subtitle={`Payable days for payroll — ${monthNames[month - 1]} ${year}`}
        action={
          <Button variant="ghost" size="sm" onClick={handlePrint}>
            Print Report
          </Button>
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}>&larr; Prev</Button>
        <h2 className="text-lg font-semibold">{monthNames[month - 1]} {year}</h2>
        <Button variant="ghost" size="sm" onClick={nextMonth}>Next &rarr;</Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              &times;
            </button>
          )}
        </div>
        {search && <p className="text-xs text-gray-500 mt-1">Showing {filtered.length} of {summaries.length} staff</p>}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading attendance summary..." />
      ) : (
        <>
          <Card padding={false} className="overflow-x-auto">
            <div id="summary-table">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-center px-3 py-3">Code</th>
                    <th className="text-center px-3 py-3">Days</th>
                    <th className="text-center px-3 py-3 text-green-700">Present</th>
                    <th className="text-center px-3 py-3 text-red-700">Absent</th>
                    <th className="text-center px-3 py-3 text-blue-700">Paid Leave</th>
                    <th className="text-center px-3 py-3 text-orange-700">Unpaid</th>
                    <th className="text-center px-3 py-3 text-yellow-700">Sick</th>
                    <th className="text-center px-3 py-3 text-purple-700">Half Day</th>
                    <th className="text-center px-3 py-3 text-blue-500">Holiday</th>
                    <th className="text-center px-3 py-3 bg-green-50 font-bold text-green-800">Payable Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">{search ? 'No matching staff' : 'No data'}</td></tr>
                  ) : filtered.map((s) => (
                    <tr key={s.employee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-left">
                        <p className="font-medium">{s.employee.firstName} {s.employee.lastName}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 text-xs">{s.employee.employeeCode}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{s.totalDaysInMonth}</td>
                      <td className="px-3 py-3 text-center">{s.counts.PRESENT}</td>
                      <td className="px-3 py-3 text-center">{s.counts.ABSENT}</td>
                      <td className="px-3 py-3 text-center">{s.counts.PAID_LEAVE}</td>
                      <td className="px-3 py-3 text-center">{s.counts.UNPAID_LEAVE}</td>
                      <td className="px-3 py-3 text-center">{s.counts.SICK_LEAVE}</td>
                      <td className="px-3 py-3 text-center">{s.counts.HALF_DAY}</td>
                      <td className="px-3 py-3 text-center">{s.counts.HOLIDAY}</td>
                      <td className="px-3 py-3 text-center bg-green-50">
                        <span className="text-lg font-bold text-green-700">{s.payableDays}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Payroll Formula</h3>
            <p className="text-sm text-blue-700 font-mono">
              payable_days = PRESENT + HOLIDAY + PAID_LEAVE + SICK_LEAVE + (HALF_DAY × 0.5)
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Use this <code>payable_days</code> value when entering staff salary inputs in payroll.
              ABSENT and UNPAID_LEAVE do not count toward payable days.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

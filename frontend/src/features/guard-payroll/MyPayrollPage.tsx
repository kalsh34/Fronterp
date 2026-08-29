import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { Card, PageHeader, StatusBadge, LoadingSpinner } from '../../components/ui';

export function MyPayrollPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }
    api.get('/guard-payroll').then((res) => {
      const all = res.data.data || [];
      const mine = all.filter((r: any) => r.guardId?._id === user.employeeId);
      setRecords(mine);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <PageHeader title="My Payroll" subtitle="View your payroll records and deductions" />

      {loading ? (
        <LoadingSpinner text="Loading payroll records..." />
      ) : records.length === 0 ? (
        <Card className="text-center">
          <p className="text-gray-500">No payroll records found yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((r: any) => (
            <Card key={r._id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{r.payrollPeriodId?.monthName} {r.payrollPeriodId?.year}</h3>
                  <p className="text-sm text-gray-500">Site: {r.primarySiteId?.siteName}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Hours Worked:</span>
                  <p className="font-medium">{r.normalHours?.toFixed(1)}</p>
                </div>
                <div>
                  <span className="text-gray-500">OT Hours:</span>
                  <p className="font-medium">{r.otHours?.toFixed(1)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Gross Pay:</span>
                  <p className="font-medium">{r.grossPay?.toLocaleString()} ETB</p>
                </div>
                <div>
                  <span className="text-gray-500">Net Pay:</span>
                  <p className="font-bold text-green-600 text-lg">{r.netPay?.toLocaleString()} ETB</p>
                </div>
              </div>
              {(r.status === 'CALCULATED' || r.status === 'APPROVED' || r.status === 'PAID') && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                  <div>Income Tax: <span className="text-red-600">{r.incomeTax?.toLocaleString()} ETB</span></div>
                  <div>Employee Pension: <span className="text-orange-600">{r.employeePension?.toLocaleString()} ETB</span></div>
                  <div>Loan Deduction: <span className="text-red-600">{r.loanDeduction?.toLocaleString()} ETB</span></div>
                  <div>Total Deductions: <span className="text-red-600">{r.totalDeductions?.toLocaleString()} ETB</span></div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

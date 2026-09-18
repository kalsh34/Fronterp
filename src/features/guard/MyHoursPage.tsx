import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { Card, PageHeader, StatusBadge, LoadingSpinner } from '../../components/ui';
import { Button } from '../../components/ui';

interface HoursRecord {
  _id: string;
  siteId: { siteName: string; siteCode: string };
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  isHoliday: boolean;
}

export default function MyHoursPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [records, setRecords] = useState<HoursRecord[]>([]);
  const [summary, setSummary] = useState({ totalHours: 0, normalHours: 0, holidayHours: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHours();
  }, []);

  const loadHours = async () => {
    try {
      const meRes = await api.get('/auth/me');
      const empId = meRes.data.data.employeeId;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const res = await api.get(`/attendance/guard/${empId}?startDate=${startOfMonth}&endDate=${endOfMonth}`);
      setRecords(res.data.data.records || []);
      setSummary({
        totalHours: res.data.data.totalHours || 0,
        normalHours: res.data.data.normalHours || 0,
        holidayHours: res.data.data.holidayHours || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading hours..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <PageHeader
          title="My Hours"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-red-500 hover:text-red-700"
            >
              Logout
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-2xl font-bold">{summary.totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500">hours</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500">Normal</p>
            <p className="text-2xl font-bold text-green-600">{summary.normalHours.toFixed(1)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500">Holiday</p>
            <p className="text-2xl font-bold text-purple-600">{summary.holidayHours.toFixed(1)}</p>
          </Card>
        </div>

        <Card padding={false}>
          {records.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No hours recorded this month</div>
          ) : (
            <div className="divide-y">
              {records.map((r) => (
                <div key={r._id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.siteId?.siteName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{r.totalHours.toFixed(1)}h</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {r.clockOut && ` - ${new Date(r.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    {r.isHoliday && <StatusBadge status="HOLIDAY" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

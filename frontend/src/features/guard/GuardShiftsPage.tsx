import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import GuardLayout from './GuardLayout';
import { fetchMyShifts, errorMessage, fmtTime, fmtDate, fmtHours, MyShiftsData } from './guardApi';
import { useT } from '../../i18n';

export default function GuardShiftsPage() {
  const t = useT();
  const [data, setData] = useState<MyShiftsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await fetchMyShifts());
    } catch (err) {
      setError(errorMessage(err, 'Failed to load your shifts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthLabel = data?.periodKey
    ? new Date(`${data.periodKey}-01T00:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : '';

  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/guard" className="p-2 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink">{t('myShifts')}</h1>
            <p className="text-xs text-muted">{t('myShiftsSub')}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="v-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted text-sm">
            <Clock className="w-4 h-4" />
            {t('hoursThisMonth')} {monthLabel && <span className="text-xs">({monthLabel})</span>}
          </div>
          <p className="text-2xl font-bold text-ink">{fmtHours(data?.monthHours)}</p>
        </div>

        {loading ? (
          <div className="v-card p-10 text-center text-muted text-sm">{t('loading')}</div>
        ) : (data?.shifts || []).length === 0 ? (
          <div className="v-card p-10 text-center text-muted text-sm">{t('noShifts')}</div>
        ) : (
          <div className="space-y-3">
            {data!.shifts.map((s) => (
              <div
                key={s._id}
                className={`v-card p-4 border-l-4 ${
                  s.status === 'OPEN' ? 'border-l-green-500' : 'border-l-line'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{s.siteId?.siteName || 'Site'}</p>
                    <p className="text-xs text-muted font-mono">{s.siteId?.siteCode}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      s.status === 'OPEN'
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : 'bg-subtle border border-line text-muted'
                    }`}
                  >
                    {s.status === 'OPEN' ? t('onShift') : fmtHours(s.computedHours)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted">{t('date')}</p>
                    <p className="font-medium text-ink">{fmtDate(s.clockInAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('clockIn')}</p>
                    <p className="font-medium text-ink">{fmtTime(s.clockInAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('clockOut')}</p>
                    <p className="font-medium text-ink">{s.clockOutAt ? fmtTime(s.clockOutAt) : '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuardLayout>
  );
}

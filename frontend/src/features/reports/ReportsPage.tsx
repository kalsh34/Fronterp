import { useEffect, useState, useMemo } from 'react';
import api from '../../lib/api';
import { Card, CardTitle, Button, Badge, Select } from '../../components/ui';

interface AuditEntry {
  _id: string;
  timestamp: string;
  user?: { firstName: string; lastName: string; email: string; role?: string } | string;
  module?: string;
  action?: string;
  description?: string;
  ip?: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface StatCard {
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
}

const MODULE_COLORS: Record<string, string> = {
  auth: 'bg-purple-100 text-purple-700',
  payroll: 'bg-green-100 text-green-700',
  hr: 'bg-blue-100 text-blue-700',
  finance: 'bg-amber-100 text-amber-700',
  settings: 'bg-gray-100 text-gray-700',
  reports: 'bg-indigo-100 text-indigo-700',
  sites: 'bg-teal-100 text-teal-700',
  users: 'bg-pink-100 text-pink-700',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export function ReportsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [complianceProgress] = useState({
    firstAid: 72,
    siaLicenses: 88,
    mandatoryTraining: 65,
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit');
      setLogs(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const user = typeof entry.user === 'object' ? entry.user : null;
      const name = user ? `${user.firstName} ${user.lastName}` : typeof entry.user === 'string' ? entry.user : '';
      const matchesSearch =
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.module || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = moduleFilter === 'all' || (entry.module || '').toLowerCase() === moduleFilter;
      const matchesAction = actionFilter === 'all' || (entry.action || '').toLowerCase() === actionFilter;
      return matchesSearch && matchesModule && matchesAction;
    });
  }, [logs, searchQuery, moduleFilter, actionFilter]);

  const uniqueModules = useMemo(() => {
    const set = new Set(logs.map((l) => (l.module || '').toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => (l.action || '').toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayLogs = useMemo(() => logs.filter((l) => (l.timestamp || '').slice(0, 10) === todayStr), [logs, todayStr]);

  const uniqueUsers = useMemo(() => {
    const set = new Set(
      logs.map((l) => {
        if (typeof l.user === 'object' && l.user) return l.user.email || l.user.firstName;
        return l.user || '';
      }).filter(Boolean)
    );
    return set.size;
  }, [logs]);

  const failedLogins = useMemo(
    () => todayLogs.filter((l) => (l.action || '').toLowerCase().includes('failed') || (l.action || '').toLowerCase().includes('login_failed')).length,
    [todayLogs]
  );

  const dataExports = useMemo(
    () => logs.filter((l) => (l.action || '').toLowerCase().includes('export')).length,
    [logs]
  );

  const highSeverityEvents = useMemo(
    () => logs.filter((l) => l.severity === 'critical' || l.severity === 'warning').slice(0, 8),
    [logs]
  );

  const stats: StatCard[] = [
    { label: 'Total System Logs Today', value: todayLogs.length, trend: '+12% from yesterday', trendUp: true },
    { label: 'Unique Active Users', value: uniqueUsers, trend: 'Last 24 hours' },
    { label: 'Failed Logins Flagged', value: failedLogins, trend: failedLogins > 0 ? 'Alert' : 'None flagged', alert: failedLogins > 0 },
    { label: 'Data Exports Conducted', value: dataExports, trend: 'All time' },
  ];

  const formatTime = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplay = (user: AuditEntry['user']) => {
    if (typeof user === 'object' && user) {
      return { name: `${user.firstName} ${user.lastName}`, role: user.role || 'User', initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` };
    }
    if (typeof user === 'string') return { name: user, role: 'User', initials: user.slice(0, 2).toUpperCase() };
    return { name: 'System', role: 'System', initials: 'SY' };
  };

  const exportCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Description', 'IP Address', 'Severity'];
    const rows = filteredLogs.map((l) => {
      const u = getUserDisplay(l.user);
      return [
        l.timestamp,
        u.name,
        u.role,
        l.module || '',
        l.action || '',
        (l.description || '').replace(/"/g, '""'),
        l.ip || '',
        l.severity || '',
      ].map((v) => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Administration / Audit Log &amp; Compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Compliance &amp; Governance Center</h1>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                {stat.alert && (
                  <Badge variant="danger" className="mt-1">
                    Alert
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                {stat.trendUp !== undefined ? (
                  <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trendUp ? '↑' : '↓'} {stat.trend}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">{stat.trend}</span>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Filter Bar */}
            <Card className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search entity or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="w-40">
                  <Select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                  >
                    <option value="all">All Modules</option>
                    {uniqueModules.map((m) => (
                      <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <Select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    {uniqueActions.map((a) => (
                      <option key={a} value={a}>
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="secondary" size="md" onClick={exportCsv}>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </Button>
                <Button variant="secondary" size="md">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule Report
                </Button>
              </div>
            </Card>

            {/* Audit Event Trail Table */}
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-gray-200">
                <CardTitle>Audit Event Trail</CardTitle>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading audit logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No audit logs found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User / Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Details</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.map((entry) => {
                        const u = getUserDisplay(entry.user);
                        const moduleKey = (entry.module || '').toLowerCase();
                        const moduleStyle = MODULE_COLORS[moduleKey] || 'bg-gray-100 text-gray-600';
                        return (
                          <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatTime(entry.timestamp)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {u.initials}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                  <p className="text-xs text-gray-500">{u.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${moduleStyle}`}>
                                {entry.module || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-[280px] truncate" title={entry.description || entry.action || ''}>
                              <span className="font-medium">{entry.action || '—'}</span>
                              {entry.description && (
                                <span className="text-gray-400 ml-2">— {entry.description.length > 50 ? entry.description.slice(0, 50) + '…' : entry.description}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{entry.ip || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* High-Severity Events */}
            <Card>
              <CardTitle className="mb-4">High-Severity Events</CardTitle>
              {highSeverityEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No high-severity events recorded.</p>
              ) : (
                <div className="space-y-4">
                  {highSeverityEvents.map((event) => {
                    const u = getUserDisplay(event.user);
                    return (
                      <div key={event._id} className="flex gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_DOT[event.severity || 'info']}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{event.action || 'Event'}</p>
                          <p className="text-xs text-gray-500 truncate">{event.description || u.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatTime(event.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Compliance Checklist */}
            <Card>
              <CardTitle className="mb-4">Compliance Checklist</CardTitle>
              <div className="space-y-5">
                {[
                  { label: 'First Aid Certifications', value: complianceProgress.firstAid, color: 'bg-green-500' },
                  { label: 'SIA Security Licenses', value: complianceProgress.siaLicenses, color: 'bg-blue-500' },
                  { label: 'Mandatory Training Modules', value: complianceProgress.mandatoryTraining, color: 'bg-amber-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

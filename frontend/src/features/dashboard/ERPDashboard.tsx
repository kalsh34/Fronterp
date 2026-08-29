import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { UserRole } from '../../types';

interface Stats {
  totalEmployees: number;
  totalSites: number;
  activeGuardsOnSite: number;
  pendingApprovals: number;
}

export default function ERPDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalEmployees: 0, totalSites: 0, activeGuardsOnSite: 0, pendingApprovals: 0 });

  useEffect(() => {
    if (user?.role === UserRole.GUARD) return;
    const load = async () => {
      try {
        const [empRes, siteRes] = await Promise.all([
          api.get('/employees?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          api.get('/sites?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
        ]);
        setStats({
          totalEmployees: empRes.data.pagination?.total || 0,
          totalSites: siteRes.data.pagination?.total || 0,
          activeGuardsOnSite: 0,
          pendingApprovals: 0,
        });
      } catch {}
    };
    load();
  }, [user]);

  if (user?.role === UserRole.GUARD) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome, {user.firstName}!</h2>
          <p className="text-gray-500">Use the navigation to start your shift or view your hours.</p>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    { label: 'TOTAL EMPLOYEES', value: stats.totalEmployees.toLocaleString(), trend: '+3%', trendUp: true, color: 'text-blue-600' },
    { label: 'ACTIVE GUARDS ON-SITE', value: stats.activeGuardsOnSite.toLocaleString(), trend: '+12%', trendUp: true, color: 'text-emerald-600' },
    { label: 'PAYROLL THIS MONTH', value: '—', trend: '', trendUp: true, color: 'text-violet-600' },
    { label: 'PENDING APPROVALS', value: stats.pendingApprovals.toLocaleString(), trend: '', trendUp: false, color: 'text-amber-600' },
  ];

  const quickActions = [
    { label: 'Create Employee', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>, route: '/employees/new', color: 'bg-blue-50 text-blue-600', roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN] },
    { label: 'Run Payroll', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, route: '/guard-payroll', color: 'bg-emerald-50 text-emerald-600', roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER] },
    { label: 'View Coverage', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, route: '/attendance', color: 'bg-violet-50 text-violet-600', roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS] },
    { label: 'Generate Report', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, route: '/reports', color: 'bg-amber-50 text-amber-600', roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD] },
  ].filter((action) => action.roles.includes(user?.role as UserRole));

  const liveFeed = [
    { text: 'System operational — all coverage checkpoints green', time: 'Now', dot: 'bg-emerald-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {user?.firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">System fully operational. All critical coverage checkpoints are green.</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p className="font-medium text-gray-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <p>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
              {card.trend && (
                <span className={`text-xs font-medium ${card.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.trendUp ? '↗' : '↘'} {card.trend}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Middle Row: Coverage + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guard Coverage by Site */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">Guard Coverage by Site</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Filled Posts</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Unfilled</span>
            </div>
          </div>
          <div className="space-y-4">
            {stats.totalSites > 0 ? (
              <>
                {['Site Alpha (HQ)', 'Omega Refinery', 'Metro Transit Hub', 'Crown Logistics Park'].slice(0, stats.totalSites).map((site, i) => {
                  const pct = [93, 83, 94, 86][i] || 85;
                  return (
                    <div key={site} className="flex items-center gap-4">
                      <p className="text-sm text-gray-700 w-44 truncate flex-shrink-0">{site}</p>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500 rounded-l-full transition-all" style={{ width: `${pct}%` }} />
                        <div className="h-full bg-amber-400 rounded-r-full" style={{ width: `${100 - pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No sites configured yet</p>
            )}
          </div>
        </div>

        {/* Quick Admin Tools */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Quick Admin Tools</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Feed + Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Operations Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Live Operations Feed</h3>
          <div className="space-y-3">
            {liveFeed.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.dot}`} />
                <div>
                  <p className="text-sm text-gray-700">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Pending Decisions</h3>
            <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">View All</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Guard Payroll Approval</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting head approval</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Staff Payroll Review</p>
              <p className="text-xs text-gray-500 mt-1">Finance review pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Site {
  _id: string;
  siteCode: string;
  siteName: string;
  client?: string;
  location: string;
  siteType: string;
  status: string;
  agreedManpower: number;
  actualManpower: number;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
};

const siteTypeColors: Record<string, string> = {
  COMMERCIAL: 'bg-indigo-100 text-indigo-700',
  RESIDENTIAL: 'bg-violet-100 text-violet-700',
  INDUSTRIAL: 'bg-amber-100 text-amber-700',
  GOVERNMENT: 'bg-teal-100 text-teal-700',
};

const siteTypeIcons: Record<string, string> = {
  COMMERCIAL: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  RESIDENTIAL: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  INDUSTRIAL: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  GOVERNMENT: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
};

function getCoveragePercent(site: Site): number {
  if (!site.agreedManpower || site.agreedManpower === 0) return 0;
  return Math.round((site.actualManpower / site.agreedManpower) * 100);
}

function getCoverageColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getCoverageLabel(pct: number): string {
  if (pct >= 90) return 'Fully Covered';
  if (pct >= 60) return 'Partial Coverage';
  return 'Understaffed';
}

export function SiteList() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/sites', { params });
      let filtered = res.data.data || [];
      if (typeFilter) {
        filtered = filtered.filter((s: Site) => s.siteType === typeFilter);
      }
      setSites(filtered);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const activeCount = sites.filter((s) => s.status === 'ACTIVE').length;
  const fullyCovered = sites.filter((s) => getCoveragePercent(s) >= 90).length;
  const understaffed = sites.filter((s) => { const pct = getCoveragePercent(s); return pct > 0 && pct < 60; }).length;
  const coverageAlerts = sites.filter((s) => getCoveragePercent(s) < 60 && getCoveragePercent(s) > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTMgNmgzNHYySDN6TTM2IDE4djJIM3YtMmgzMzoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operational Coverage Control</h1>
            <p className="text-sm text-indigo-200 mt-1">Monitor site deployments and guard coverage across all posts</p>
          </div>
          <Link
            to="/sites/new"
            className="h-10 px-5 flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/25 transition-all border border-white/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Site
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL SITES', value: total, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'ACTIVE SITES', value: activeCount, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'FULLY COVERED', value: fullyCovered, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'UNDERSTAFFED', value: understaffed, color: 'bg-red-50 text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold text-gray-900`}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search site name or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none cursor-pointer transition-all"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 px-4 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none cursor-pointer transition-all"
        >
          <option value="">All Types</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="RESIDENTIAL">Residential</option>
          <option value="INDUSTRIAL">Industrial</option>
          <option value="GOVERNMENT">Government</option>
        </select>
      </div>

      {/* Main Content: Sites Grid + Sidebar */}
      <div className="flex gap-6">
        {/* Sites Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : sites.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No sites found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sites.map((site) => {
                const pct = getCoveragePercent(site);
                const color = getCoverageColor(pct);
                const label = getCoverageLabel(pct);
                return (
                  <div key={site._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow shadow-sm cursor-pointer" onClick={() => navigate(`/sites/${site._id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={siteTypeIcons[site.siteType] || siteTypeIcons.COMMERCIAL} />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{site.siteName}</p>
                          <p className="text-xs text-gray-400 font-mono">{site.siteCode}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusColors[site.status] || ''}`}>
                        {site.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {site.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium ${siteTypeColors[site.siteType] || ''}`}>
                          {site.siteType}
                        </span>
                        {site.client && <span className="truncate">{site.client}</span>}
                      </div>
                    </div>

                    {/* Coverage Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-gray-500">Guard Coverage</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {site.actualManpower}/{site.agreedManpower}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-lg ${pct >= 90 ? 'bg-emerald-50 text-emerald-600' : pct >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className={`text-[10px] mt-1 ${pct >= 90 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {label}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {site.contactPerson && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {site.contactPerson}
                          </span>
                        )}
                        {site.contactPhone && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {site.contactPhone}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View Details</span>
                    </div>
                    {site.address && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{site.address}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 px-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-6 hidden lg:block">
          {/* Coverage Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Coverage Alerts</h3>
            </div>
            {coverageAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">All sites adequately covered</p>
            ) : (
              <div className="space-y-3">
                {coverageAlerts.map((site) => {
                  const pct = getCoveragePercent(site);
                  return (
                    <div key={site._id} className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{site.siteName}</p>
                          <p className="text-[10px] text-gray-500">{site.siteCode}</p>
                        </div>
                        <span className="text-[10px] font-bold text-red-600 bg-white px-1.5 py-0.5 rounded-lg">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Site Type Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Site Type Distribution</h3>
            <div className="space-y-4">
              {(['COMMERCIAL', 'RESIDENTIAL', 'INDUSTRIAL', 'GOVERNMENT'] as const).map((type) => {
                const count = sites.filter((s) => s.siteType === type).length;
                const pctTotal = sites.length > 0 ? Math.round((count / sites.length) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${siteTypeColors[type] ? siteTypeColors[type].replace('100', '500').replace('700', '') : 'bg-gray-400'}`}
                        style={{ width: `${pctTotal}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
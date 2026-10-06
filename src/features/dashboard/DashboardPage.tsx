import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { MODULES } from '../../config/modules';
import {
  Search,
  Bell,
  ChevronRight,
  Shield,
  Users,
  MapPin,
  CalendarCheck,
  Receipt,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

type ModuleCategory = 'ALL' | 'ops' | 'hr' | 'payroll' | 'finance' | 'admin';

const CATEGORY_TABS: { id: ModuleCategory; label: string }[] = [
  { id: 'ALL', label: 'All Modules' },
  { id: 'ops', label: 'Operations & Sites' },
  { id: 'hr', label: 'HR & Personnel' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'finance', label: 'Finance' },
  { id: 'admin', label: 'Administration' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('ALL');

  if (user?.role === UserRole.GUARD) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-900/10">
              <img src="/logo.png" alt="Vital Security" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Vital Security</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">Security Officer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-70px)]">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <ShieldCheck className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome, Officer {user?.firstName}!</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Use your portal navigation to verify site deployments, record active shift hours, and check monthly payroll.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/my-shift')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                Go to Active Shift <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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

  const allowedModules = useMemo(() => {
    return MODULES.filter((m) => m.roles.includes(user?.role as UserRole));
  }, [user?.role]);

  const filteredModules = useMemo(() => {
    let result = allowedModules;

    if (activeCategory !== 'ALL') {
      result = result.filter((m) => m.groupId === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allowedModules, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-900/10">
            <img src="/logo.png" alt="Vital Security" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 leading-tight tracking-tight">Vital Security</p>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                ERP Command
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">Operations, Workforce & Payroll</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, guard rosters, sites, or payroll..."
              className="w-full pl-10 pr-16 py-2 text-xs bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 font-medium"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-slate-400 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              <span>Ctrl</span><span>K</span>
            </div>
          </div>
        </div>

        {/* Status & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </div>

          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-blue-500/20">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-6">
        {/* Welcome & Command Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                <Shield className="w-4 h-4" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {greeting()}, {user?.firstName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise management dashboard for security deployments, attendance logs, and payroll validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Personnel */}
          <div
            onClick={() => navigate('/employees')}
            className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xs">
                <Users className="w-5 h-5 stroke-[1.9]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Personnel</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">Workforce Registry</p>
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  View staff & guards <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Sites */}
          <div
            onClick={() => navigate('/sites')}
            className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xs">
                <MapPin className="w-5 h-5 stroke-[1.9]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Client Posts</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">Active Sites</p>
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  Manage locations <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Attendance */}
          <div
            onClick={() => navigate('/attendance')}
            className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xs">
                <CalendarCheck className="w-5 h-5 stroke-[1.9]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daily Roster</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">Guard Attendance</p>
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  Track active shifts <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Payroll */}
          <div
            onClick={() => navigate('/guard-payroll')}
            className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xs">
                <Receipt className="w-5 h-5 stroke-[1.9]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monthly Cycle</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">Payroll Processing</p>
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                  Run calculations <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Header & Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">System Applications</h2>
            <span className="text-xs text-slate-500 font-medium">({filteredModules.length} available)</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sidebar-scrollbar">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Uniform Bold Module Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            const isClickable = mod.active && mod.route;

            return (
              <button
                key={mod.id}
                onClick={() => isClickable && navigate(mod.route!)}
                disabled={!isClickable}
                className={`group relative bg-white rounded-2xl border p-5 text-left transition-all duration-200 min-h-[185px] flex flex-col justify-between ${
                  isClickable
                    ? 'border-slate-200/90 hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer shadow-xs'
                    : 'border-slate-200/60 opacity-60 cursor-not-allowed bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Executive Uniform Icon */}
                  <div className="mb-3.5">
                    <Icon size={56} />
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xs font-bold text-slate-900 mb-1 leading-snug tracking-tight group-hover:text-blue-600 transition-colors">
                    {mod.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    {mod.subtitle}
                  </p>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  {isClickable ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wider transition-colors">
                        Launch
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-600 flex items-center justify-center transition-all duration-200 group-hover:scale-105">
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white" strokeWidth={2.5} />
                      </div>
                    </>
                  ) : (
                    <span className="text-[9px] font-bold tracking-wider text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                      Planned
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

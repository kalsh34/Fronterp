import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { MODULES } from '../../config/modules';
import { Search, Bell, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  if (user?.role === UserRole.GUARD) {
    return (
      <div className="min-h-screen bg-[#f5f6fa]">
        <header className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vital Security" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Vital Security</p>
              <p className="text-[11px] text-gray-400 leading-tight">Enterprise resource planning</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-gray-400 leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-60px)]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-md">
            <img src="/logo.png" alt="Vital Security" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome, {user?.firstName}!</h2>
            <p className="text-gray-500 text-sm">Use the navigation to start your shift or view your hours.</p>
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

  const modules = MODULES.filter((m) => m.roles.includes(user?.role as UserRole));

  const filteredModules = searchQuery.trim()
    ? modules.filter(
        (m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modules;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vital Security" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Vital Security</p>
              <p className="text-[11px] text-gray-400 leading-tight">Enterprise resource planning</p>
            </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, employees, sites, or anything..."
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center min-w-[18px] h-[18px]">
              3
            </span>
          </button>
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-gray-400 leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        {/* Welcome Banner */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 mb-1">
              {greeting()}, {user?.firstName}!{' '}
              <span className="inline-block" role="img" aria-label="wave">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="inline-block -mt-1">
                  <text x="2" y="26" fontSize="26">👋</text>
                </svg>
              </span>
            </h1>
            <p className="text-sm text-gray-500">Here's what's happening with your HR and payroll today.</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
              <span className="text-base">📅</span>
              <div>
                <p className="text-sm font-semibold text-gray-700 leading-tight">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            const isClickable = mod.active && mod.route;
            return (
              <button
                key={mod.id}
                onClick={() => isClickable && navigate(mod.route!)}
                disabled={!isClickable}
                className={`group relative bg-white rounded-[16px] border p-5 text-left transition-all duration-200 min-h-[170px] flex flex-col ${
                  isClickable
                    ? `border-gray-100 hover:border-gray-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-pointer`
                    : 'border-gray-100 opacity-55 cursor-not-allowed'
                }`}
              >
                {/* Icon */}
                <div className="mb-3">
                  <Icon size={56} />
                </div>

                {/* Content */}
                <h3 className="text-[13px] font-semibold text-gray-900 mb-0.5 leading-snug">{mod.label}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed flex-1">{mod.subtitle}</p>

                {/* Arrow button — only for active */}
                {isClickable && (
                  <div className="absolute bottom-5 right-5">
                    <div className={`w-8 h-8 rounded-full ${mod.arrowBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <ChevronRight className={`w-4 h-4 ${mod.arrowText}`} strokeWidth={2.5} />
                    </div>
                  </div>
                )}

                {/* SOON badge */}
                {!mod.active && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

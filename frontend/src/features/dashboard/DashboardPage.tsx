import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { MODULES } from '../../config/modules';
import { useT } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';
import { NotificationBell } from '../../components/NotificationBell';
import { Search, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');

  if (user?.role === UserRole.GUARD) {
    return (
      <div className="min-h-screen bg-canvas ">
        <header className="bg-white border-b border-line px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vital Security" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold text-ink leading-tight">Vital Security</p>
              <p className="text-[11px] text-muted leading-tight">Enterprise resource planning</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="My Profile">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-semibold text-ink leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-muted leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </Link>
          </div>
        </header>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-60px)]">
          <div className="v-card p-10 text-center max-w-md">
            <img src="/logo.png" alt="Vital Security" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h2 className="text-xl font-bold text-ink mb-2">{t('welcomeGuard')}, {user?.firstName}!</h2>
            <p className="text-muted text-sm">{t('guardDashboardHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  // `hidden` module cards are left out of the grid - they stay reachable from
  // their parent module (e.g. Payroll > Configuration, HR & People > Staff Attendance)
  const modules = MODULES.filter((m) => !m.hidden && m.roles.includes(user?.role as UserRole));

  const filteredModules = searchQuery.trim()
    ? modules.filter(
        (m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modules;

  return (
    <div className="min-h-screen bg-canvas ">
      {/* Header */}
      <header className="bg-surface border-b border-line px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vital Security" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold text-ink leading-tight">Vital Security</p>
              <p className="text-[11px] text-muted leading-tight">Enterprise resource planning</p>
            </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-canvas  border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-muted"
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title="My Profile">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold text-ink leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-muted leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </Link>
        </div>
      </header>

      <div className="px-8 py-8 max-w-[1600px] mx-auto">
        {/* Welcome Banner */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-bold text-ink mb-1">
              {greeting()}, {user?.firstName}!{' '}
              <span className="inline-block" role="img" aria-label="wave">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="inline-block -mt-1">
                  <text x="2" y="26" fontSize="26">👋</text>
                </svg>
              </span>
            </h1>
            <p className="text-sm text-muted">{t('dashboardSubtitle')}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-surface border border-line rounded-xl px-4 py-2.5 shadow-card">
              <span className="text-base">📅</span>
              <div>
                <p className="text-sm font-semibold text-ink leading-tight">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Grid — uniform card size, generous breathing room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            const isClickable = mod.active && mod.route;
            return (
              <button
                key={mod.id}
                onClick={() => isClickable && navigate(mod.route!)}
                disabled={!isClickable}
                className={`group relative bg-surface rounded-2xl border p-6 text-left transition-all duration-200 min-h-[10.75rem] flex flex-col ${
                  isClickable
                    ? `border-line shadow-card hover:border-primary-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer`
                    : 'border-line opacity-55 cursor-not-allowed'
                }`}
              >
                {/* Icon on a tinted plate — continuity: same plate, per-module accent */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shrink-0"
                  style={{ backgroundColor: `${mod.color}14` }}
                >
                  <Icon size={56} className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-[15px] font-semibold text-ink mb-1 leading-snug">
                  {t(mod.labelKey as any) || mod.label}
                </h3>
                <p className="text-[13px] text-muted leading-relaxed flex-1 line-clamp-2">
                  {t(mod.subtitleKey as any) || mod.subtitle}
                </p>

                {/* Footer row: arrow or SOON — same slot on every card */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-medium text-muted group-hover:text-primary-600 transition-colors">
                    {isClickable ? t('openModule') : t('comingSoon')}
                  </span>
                  {isClickable ? (
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                      style={{ backgroundColor: `${mod.color}14`, color: mod.color }}
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted bg-canvas  border border-line px-2 py-0.5 rounded-full">
                      {t('soon')}
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

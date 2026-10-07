import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useT } from '../i18n';
import { ThemeToggle, LanguageToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { LogOut, Home } from 'lucide-react';
import type { ModuleGroup } from '../config/modules';
import type { DictKey } from '../i18n';

interface Props {
  moduleGroup: ModuleGroup;
}

export default function ModuleNavbar({ moduleGroup }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  return (
    <div className="bg-surface border-b border-line sticky top-0 z-50">
      {/* Top bar: logo + module name + user */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Vital Security" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <p className="text-xs font-bold text-ink leading-tight">Vital Security</p>
              <p className="text-[10px] text-muted leading-tight">Enterprise resource planning</p>
            </div>
          </button>
          <div className="h-6 w-px bg-line" />
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${moduleGroup.color}12`,
              color: moduleGroup.color,
            }}
          >
            {moduleGroup.labelKey ? t(moduleGroup.labelKey as DictKey) : moduleGroup.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors px-2 py-1 rounded-lg hover:bg-subtle"
          >
            <Home className="w-3.5 h-3.5" />
            {t('dashboard')}
          </button>
          <NotificationBell />
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="My Profile"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-[11px]">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="text-right">
              <p className="text-xs font-semibold text-ink leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-muted leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </Link>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-feature tabs */}
      <div className="flex items-center gap-1 px-6 pb-0">
        {moduleGroup.subFeatures.map((sf) => {
          const sfPath = sf.route.split('?')[0];
          const isActive =
            location.pathname === sfPath ||
            (sfPath !== '/' && location.pathname.startsWith(sfPath));
          const Icon = sf.icon;

          return (
            <NavLink
              key={sf.route}
              to={sf.route}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 ${
                isActive
                  ? 'border-current'
                  : 'border-transparent text-muted hover:text-ink hover:border-line'
              }`}
              style={isActive ? { color: moduleGroup.color, borderColor: moduleGroup.color } : undefined}
            >
              {Icon && <Icon size={18} />}
              {sf.labelKey ? t(sf.labelKey as DictKey) : sf.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

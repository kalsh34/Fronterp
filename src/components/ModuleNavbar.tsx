import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, LayoutDashboard, Shield } from 'lucide-react';
import type { ModuleGroup } from '../config/modules';

interface Props {
  moduleGroup: ModuleGroup;
}

export default function ModuleNavbar({ moduleGroup }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      {/* Top bar: logo + module name + user */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-900/10">
              <img src="/logo.png" alt="Vital Security" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight tracking-tight">Vital Security</p>
              <p className="text-[10px] text-slate-500 leading-tight font-medium">Operations & ERP</p>
            </div>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-white tracking-wide shadow-xs flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-blue-400" />
              {moduleGroup.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
            Dashboard
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shadow-xs ring-2 ring-blue-500/20">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-feature tabs */}
      <div className="flex items-center gap-1 px-6 border-t border-slate-100 bg-slate-50/50">
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
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white shadow-xs -mb-px'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {Icon && <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-500'} />}
              {sf.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

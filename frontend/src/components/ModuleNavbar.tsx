import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, Home } from 'lucide-react';
import type { ModuleGroup } from '../config/modules';
interface Props {
  moduleGroup: ModuleGroup;
}

export default function ModuleNavbar({ moduleGroup }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Top bar: logo + module name + user */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Vital Security" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">Vital Security</p>
              <p className="text-[10px] text-gray-400 leading-tight">Enterprise resource planning</p>
            </div>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${moduleGroup.color}12`,
              color: moduleGroup.color,
            }}
          >
            {moduleGroup.label}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-[11px]">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-gray-400 leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
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
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
              style={isActive ? { color: moduleGroup.color, borderColor: moduleGroup.color } : undefined}
            >
              {Icon && <Icon size={18} />}
              {sf.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

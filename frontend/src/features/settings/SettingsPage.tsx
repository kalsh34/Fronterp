import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { UserRole } from '../../types';
import { Card, FormField, Modal, Select, Tabs } from '../../components/ui';
import { useT, type DictKey, type TParams } from '../../i18n';

type T = (key: DictKey, params?: TParams) => string;

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  moduleGrants?: string[];
  moduleDenies?: string[];
}

const ROLE_LABEL_KEY: Record<string, DictKey> = {
  [UserRole.SUPER_ADMIN]: 'settingsRoleSuperAdmin',
  [UserRole.SYSTEM_ADMIN]: 'settingsRoleSystemAdmin',
  [UserRole.HR_ADMIN]: 'settingsRoleHrAdmin',
  [UserRole.FINANCE_OFFICER]: 'settingsRoleFinanceOfficer',
  [UserRole.OPERATIONS]: 'settingsRoleOperations',
  [UserRole.GUARD]: 'guard',
  [UserRole.HEAD]: 'settingsRoleHead',
  [UserRole.CEO]: 'settingsRoleCeo',
};

const DEPARTMENT_LABEL_KEY: Record<string, DictKey> = {
  [UserRole.SUPER_ADMIN]: 'settingsDeptSuperAdmin',
  [UserRole.SYSTEM_ADMIN]: 'settingsDeptSystemAdmin',
  [UserRole.HR_ADMIN]: 'settingsDeptHrAdmin',
  [UserRole.FINANCE_OFFICER]: 'settingsDeptFinanceOfficer',
  [UserRole.OPERATIONS]: 'settingsDeptOperations',
  [UserRole.GUARD]: 'settingsDeptGuard',
  [UserRole.HEAD]: 'settingsDeptHead',
  [UserRole.CEO]: 'settingsDeptCeo',
};

/** Theme-token badge palette so every role chip reads correctly in both themes. */
const ROLE_BADGE_STYLES: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-primary-600 text-white border border-primary-600',
  [UserRole.SYSTEM_ADMIN]: 'bg-info-subtle text-info-text border border-info-line',
  [UserRole.HR_ADMIN]: 'bg-warning-subtle text-warning-text border border-warning-line',
  [UserRole.FINANCE_OFFICER]: 'bg-success-subtle text-success-text border border-success-line',
  [UserRole.OPERATIONS]:
    'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  [UserRole.GUARD]: 'bg-subtle text-muted border border-line',
  [UserRole.HEAD]: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  [UserRole.CEO]: 'bg-danger-subtle text-danger-text border border-danger-line',
};

const ROLE_BADGE_FALLBACK = 'bg-subtle text-muted border border-line';

const SECURITY_MATRIX: { roleKey: DictKey; hr: string; pay: string; ops: string; fin: string; admin: string }[] = [
  { roleKey: 'settingsRoleCeo', hr: 'F', pay: 'F', ops: 'F', fin: 'F', admin: 'F' },
  { roleKey: 'settingsRoleHrManager', hr: 'F', pay: 'F', ops: 'V', fin: 'N', admin: 'N' },
  { roleKey: 'settingsRoleOperations', hr: 'V', pay: 'V', ops: 'F', fin: 'N', admin: 'N' },
  { roleKey: 'settingsRoleSiteSupervisor', hr: 'N', pay: 'N', ops: 'A', fin: 'N', admin: 'N' },
];

const PERMISSION_CELL: Record<string, { label: string; className: string }> = {
  F: { label: 'F', className: 'bg-success-subtle text-success-text' },
  V: { label: 'V', className: 'bg-info-subtle text-info-text' },
  N: { label: 'N', className: 'bg-danger-subtle text-danger-text' },
  A: { label: 'A', className: 'bg-warning-subtle text-warning-text' },
};

const TAB_ITEMS: { key: string; labelKey: DictKey }[] = [
  { key: 'users', labelKey: 'settingsTabUsers' },
  { key: 'roles', labelKey: 'settingsTabRoles' },
  { key: 'audit', labelKey: 'settingsTabAudit' },
  { key: 'system', labelKey: 'settingsTabSystem' },
  { key: 'integrations', labelKey: 'settingsTabIntegrations' },
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function roleLabel(role: string, t: T): string {
  const key = ROLE_LABEL_KEY[role];
  return key ? t(key) : role;
}

function departmentLabel(role: string, t: T): string {
  const key = DEPARTMENT_LABEL_KEY[role];
  return key ? t(key) : '—';
}

function formatLastLogin(date: string | undefined, t: T): string {
  if (!date) return t('settingsNeverLoggedIn');
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return t('settingsJustNow');
  if (diffMin < 60) return t('settingsMinsAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('settingsHoursAgo', { count: diffHr });
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function SettingsPage() {
  const t = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const refreshUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then((res) => setUsers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel(u.role, t).toLowerCase().includes(q),
    );
  }, [users, search, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-subtext">
        <span>Vital Security PLC</span>
        <span>/</span>
        <span>{t('settingsAdminCrumb')}</span>
      </div>

      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('settingsTitle')}</h1>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('settingsProvisionNewUser')}
        </button>
      </div>

      <Tabs tabs={TAB_ITEMS.map((tab) => ({ key: tab.key, label: t(tab.labelKey) }))} active={activeTab} onChange={setActiveTab} className="w-fit" />

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="relative mb-5">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('settingsSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="v-input pl-10"
              />
            </div>

            {/* Table */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h3 className="text-base font-semibold text-ink">{t('settingsUsersTableTitle')}</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColUserDetails')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColSystemRole')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColDepartment')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColLastLogin')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColTwoFa')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColAccess')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-winder">{t('settingsColSystemState')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted">
                            <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                            {t('settingsLoadingUsers')}
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-subtext">
                          {search ? t('settingsNoUsersMatch') : t('settingsNoUsersFound')}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-surface-hover transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {getInitials(user.firstName, user.lastName)}
                              </div>
                              <div>
                                <p className="font-medium text-ink">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-subtext">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_FALLBACK}`}>
                              {roleLabel(user.role, t)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted">{departmentLabel(user.role, t)}</td>
                          <td className="px-5 py-4 text-sm text-muted">
                            {user.lastLogin ? (
                              formatLastLogin(user.lastLogin, t)
                            ) : (
                              <span className="text-subtext">{t('settingsNoSessionToday')}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <svg
                              className={`w-5 h-5 ${user.isActive ? 'text-success' : 'text-subtext'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.moduleGrants || []).map((k) => (
                                <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-subtle text-success-text border border-success-line">+{k}</span>
                              ))}
                              {(user.moduleDenies || []).map((k) => (
                                <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger-subtle text-danger-text border border-danger-line">−{k}</span>
                              ))}
                              <button
                                onClick={() => setEditingUser(user)}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-line text-primary-600 dark:text-primary-300 hover:bg-subtle transition-colors"
                              >
                                {t('settingsEditAccess')}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {user.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-text border border-success-line">
                                {t('active')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-subtle text-muted border border-line">
                                {t('inactive')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar — Security Matrix */}
          <div className="w-80 flex-shrink-0 hidden xl:block">
            <div className="bg-surface rounded-xl border border-line p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-ink mb-4">{t('settingsSecurityMatrixTitle')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-2 pr-2 font-medium text-muted">{t('settingsColSystemRole')}</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">HR</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Pay</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Ops</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Fin</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {SECURITY_MATRIX.map((row) => (
                      <tr key={row.roleKey}>
                        <td className="py-2.5 pr-2 font-medium text-ink whitespace-nowrap">{t(row.roleKey)}</td>
                        {(['hr', 'pay', 'ops', 'fin', 'admin'] as const).map((col) => {
                          const cell = PERMISSION_CELL[row[col]];
                          return (
                            <td key={col} className="py-2.5 px-1 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${cell.className}`}>
                                {cell.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-line space-y-2">
                <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider">{t('settingsLegend')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-success-subtle text-success-text font-bold text-[10px]">F</span>
                    {t('settingsLegendFull')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-info-subtle text-info-text font-bold text-[10px]">V</span>
                    {t('settingsLegendView')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-warning-subtle text-warning-text font-bold text-[10px]">A</span>
                    {t('settingsLegendApprove')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-danger-subtle text-danger-text font-bold text-[10px]">N</span>
                    {t('settingsLegendNone')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles & Permissions */}
      {activeTab === 'roles' && <RolesPermissionsTab />}

      {/* Other Tabs - Placeholder */}
      {activeTab !== 'users' && activeTab !== 'roles' && (
        <Card className="py-14 text-center">
          <svg className="mx-auto h-12 w-12 mb-3 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm font-medium text-muted">{t('settingsSectionComingSoon')}</p>
          <p className="text-xs text-subtext mt-1">{t('settingsSectionUnderDev')}</p>
        </Card>
      )}

      {/* Provision New User Modal */}
      {showProvisionModal && <ProvisionModal onClose={() => setShowProvisionModal(false)} />}

      {/* Edit user access modal */}
      {editingUser && (
        <EditAccessModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={refreshUsers}
        />
      )}
    </div>
  );
}

function ProvisionModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.GUARD,
  });
  const [grants, setGrants] = useState<string[]>([]);
  const [denies, setDenies] = useState<string[]>([]);
  const [modules, setModules] = useState<{ key: string; label: string; permissions: string[] }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/module-access').then((res) => setModules(res.data.data || [])).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const grantAll = (key: string) => {
    // Granting a module removes it from denies (deny wins at runtime, so keep the two in sync)
    setDenies((d) => d.filter((k) => k !== key));
    setGrants((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  };

  const denyAll = (key: string) => {
    setGrants((g) => g.filter((k) => k !== key));
    setDenies((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users', { ...form, moduleGrants: grants, moduleDenies: denies });
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || t('settingsFailedProvision'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('settingsProvisionTitle')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-danger-text bg-danger-subtle rounded-lg border border-danger-line">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            name="firstName"
            label={t('settingsFieldFirstName')}
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <FormField
            name="lastName"
            label={t('settingsFieldLastName')}
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <FormField
          name="email"
          type="email"
          label={t('settingsFieldEmail')}
          value={form.email}
          onChange={handleChange}
          required
        />
        <FormField
          name="password"
          type="password"
          label={t('settingsFieldPassword')}
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
        />
        <Select
          name="role"
          label={t('settingsFieldSystemRole')}
          value={form.role}
          onChange={handleChange}
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>
              {roleLabel(role, t)}
            </option>
          ))}
        </Select>

        {/* Module access — grant or deny per module (deny wins at runtime) */}
        <div>
          <p className="text-sm font-medium text-ink mb-1">{t('settingsModuleAccessTitle')}</p>
          <p className="text-xs text-subtext mb-3">{t('settingsModuleAccessHint')}</p>
          <div className="space-y-2 max-h-72 overflow-y-auto border border-line rounded-lg p-3">
            {modules.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{m.label}</p>
                  <p className="text-[11px] text-subtext truncate">
                    {m.permissions.length} {m.permissions.length === 1 ? 'permission' : 'permissions'} — {m.permissions.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => grantAll(m.key)}
                    className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      grants.includes(m.key)
                        ? 'bg-success-subtle text-success-text border-success-line'
                        : 'border-line text-muted hover:bg-subtle'
                    }`}
                  >
                    {t('settingsModuleGrant')}
                  </button>
                  <button
                    type="button"
                    onClick={() => denyAll(m.key)}
                    className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      denies.includes(m.key)
                        ? 'bg-danger-subtle text-danger-text border-danger-line'
                        : 'border-line text-muted hover:bg-subtle'
                    }`}
                  >
                    {t('settingsModuleDeny')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">{t('settingsModuleRoleHint')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 flex items-center rounded-lg border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? t('settingsProvisioning') : t('settingsProvisionUser')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Edit a user's role + module access (grant/deny) inline. */
function EditAccessModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [role, setRole] = useState<string>(user.role);
  const [grants, setGrants] = useState<string[]>(user.moduleGrants || []);
  const [denies, setDenies] = useState<string[]>(user.moduleDenies || []);
  const [modules, setModules] = useState<{ key: string; label: string; permissions: string[] }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/module-access').then((res) => setModules(res.data.data || [])).catch(() => {});
  }, []);

  const grantAll = (key: string) => {
    setDenies((d) => d.filter((k) => k !== key));
    setGrants((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  };
  const denyAll = (key: string) => {
    setGrants((g) => g.filter((k) => k !== key));
    setDenies((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/users/${user._id}`, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role,
        moduleGrants: grants,
        moduleDenies: denies,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user access');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${user.firstName} ${user.lastName} — ${t('settingsEditAccess')}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-danger-text bg-danger-subtle rounded-lg border border-danger-line">{error}</div>
        )}
        <Select name="role" label={t('settingsFieldSystemRole')} value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.values(UserRole).map((r) => (
            <option key={r} value={r}>
              {roleLabel(r, t)}
            </option>
          ))}
        </Select>
        <div>
          <p className="text-sm font-medium text-ink mb-1">{t('settingsModuleAccessTitle')}</p>
          <p className="text-xs text-subtext mb-3">{t('settingsModuleAccessHint')}</p>
          <div className="space-y-2 max-h-72 overflow-y-auto border border-line rounded-lg p-3">
            {modules.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{m.label}</p>
                  <p className="text-[11px] text-subtext truncate">{m.permissions.length} permissions</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => grantAll(m.key)}
                    className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      grants.includes(m.key) ? 'bg-success-subtle text-success-text border-success-line' : 'border-line text-muted hover:bg-subtle'
                    }`}
                  >
                    {t('settingsModuleGrant')}
                  </button>
                  <button
                    type="button"
                    onClick={() => denyAll(m.key)}
                    className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      denies.includes(m.key) ? 'bg-danger-subtle text-danger-text border-danger-line' : 'border-line text-muted hover:bg-subtle'
                    }`}
                  >
                    {t('settingsModuleDeny')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">{t('settingsModuleRoleHint')}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 flex items-center rounded-lg border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Saving…' : t('save') || 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   ROLES & PERMISSIONS TAB
   Shows the EFFECTIVE permission grants per role — the same
   union (hardcoded role map + module-registered permissions)
   that the backend authorize() middleware enforces.
   ============================================================ */

interface RolePermissions {
  role: string;
  permissions: string[];
}

const PERM_LABEL_KEYS: Record<string, DictKey> = {
  'user.create': 'permUserCreate',
  'user.read': 'permUserRead',
  'user.update': 'permUserUpdate',
  'user.delete': 'permUserDelete',
  'employee.create': 'permEmployeeCreate',
  'employee.read': 'permEmployeeRead',
  'employee.update': 'permEmployeeUpdate',
  'employee.delete': 'permEmployeeDelete',
  'site.create': 'permSiteCreate',
  'site.read': 'permSiteRead',
  'site.update': 'permSiteUpdate',
  'guard.register': 'permGuardRegister',
  'guard.assign-site': 'permGuardAssignSite',
  'guard.modify-hours': 'permGuardModifyHours',
  'guard-attendance.read': 'permGuardAttendanceRead',
  'guard-attendance.manage': 'permGuardAttendanceManage',
  'guard-attendance.future': 'permGuardAttendanceFuture',
  'staff-attendance.manage': 'permStaffAttendanceManage',
  'guard-payroll.read': 'permGuardPayrollRead',
  'guard-payroll.rates': 'permGuardPayrollRates',
  'guard-payroll.calculate': 'permGuardPayrollCalculate',
  'guard-payroll.check': 'permGuardPayrollCheck',
  'guard-payroll.approve': 'permGuardPayrollApprove',
  'guard-payroll.pay': 'permGuardPayrollPay',
  'guard-payroll.return': 'permGuardPayrollReturn',
  'office-payroll.create': 'permOfficePayrollCreate',
  'office-payroll.calculate': 'permOfficePayrollCalculate',
  'office-payroll.submit': 'permOfficePayrollSubmit',
  'office-payroll.check': 'permOfficePayrollCheck',
  'office-payroll.enter-ot': 'permOfficePayrollEnterOt',
  'office-payroll.return': 'permOfficePayrollReturn',
  'office-payroll.rates': 'permOfficePayrollRates',
  'office-payroll.approve': 'permOfficePayrollApprove',
  'office-payroll.pay': 'permOfficePayrollPay',
  'report.read': 'permReportRead',
  'audit.read': 'permAuditRead',
  'settings.read': 'permSettingsRead',
  'settings.update': 'permSettingsUpdate',
  'payroll-period.read': 'permPayrollPeriodRead',
  'payroll-config.manage': 'permPayrollConfigManage',
  'organization.read': 'permOrganizationRead',
  'organization.manage': 'permOrganizationManage',
  'candidate.read': 'permCandidateRead',
  'candidate.manage': 'permCandidateManage',
  'performance.read': 'permPerformanceRead',
  'performance.manage': 'permPerformanceManage',
  'rotation.read': 'permRotationRead',
  'rotation.manage': 'permRotationManage',
  'rotation.generate': 'permRotationGenerate',
  'rotation.approve': 'permRotationApprove',
  'rotation.publish': 'permRotationPublish',
  'rotation.override': 'permRotationOverride',
};

// Order matters: findIndex returns the FIRST matching prefix, so longer
// prefixes (guard-payroll., guard-attendance.) must precede the bare 'guard'.
const PERM_GROUP_ORDER = [
  'user.', 'employee.', 'site.', 'guard-payroll.', 'guard-attendance.', 'guard',
  'staff-attendance.', 'payroll-period.',
  'office-payroll.', 'payroll-config.', 'organization.',
  'candidate.', 'performance.', 'rotation.', 'report.', 'audit.', 'settings.',
];

function permGroup(permission: string): string {
  const idx = PERM_GROUP_ORDER.findIndex((p) => permission.startsWith(p));
  return idx >= 0 ? PERM_GROUP_ORDER[idx] : 'other.';
}

const GROUP_LABEL_KEYS: Record<string, DictKey> = {
  'user.': 'permGroupUsers',
  'employee.': 'permGroupEmployees',
  'site.': 'permGroupSites',
  guard: 'permGroupGuards',
  'guard-attendance.': 'permGroupGuardAttendance',
  'staff-attendance.': 'permGroupStaffAttendance',
  'payroll-period.': 'permGroupPayrollPeriods',
  'guard-payroll.': 'permGroupGuardPayroll',
  'office-payroll.': 'permGroupStaffPayroll',
  'payroll-config.': 'permGroupPayrollConfig',
  'organization.': 'permGroupOrganization',
  'candidate.': 'permGroupRecruitment',
  'performance.': 'permGroupPerformance',
  'rotation.': 'permGroupRotations',
  'report.': 'permGroupReports',
  'audit.': 'permGroupAudit',
  'settings.': 'permGroupSettings',
  'other.': 'permGroupOther',
};

/** Column order (excluding the catch-all "Other" bucket). */
const GROUP_ORDER = [
  'user.', 'employee.', 'site.', 'guard', 'guard-attendance.', 'staff-attendance.',
  'payroll-period.', 'guard-payroll.', 'office-payroll.', 'payroll-config.',
  'organization.', 'candidate.', 'performance.', 'rotation.', 'report.', 'audit.', 'settings.',
];

/** Short column captions — the grid is too narrow for the full group names. */
const GROUP_ABBREV_KEYS: Record<string, DictKey> = {
  'guard': 'colAbbrevGuards',
  'guard-attendance.': 'colAbbrevGuardAtt',
  'staff-attendance.': 'colAbbrevStaffAtt',
  'payroll-period.': 'colAbbrevPeriods',
  'payroll-config.': 'colAbbrevPayConfig',
};

function RolesPermissionsTab() {
  const t = useT();
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(UserRole.SUPER_ADMIN);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/users/roles')
      .then((res) => setRoles(res.data.data || []))
      .catch(() => setError(t('settingsFailedLoadRoles')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-line py-16 flex items-center justify-center gap-2 text-muted">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        {t('settingsLoadingPermissions')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-subtle border border-danger-line text-danger-text rounded-xl px-5 py-4 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-info-subtle border border-info-line text-info-text rounded-xl px-5 py-3.5 text-sm flex items-start gap-3">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>{t('settingsEffectiveGrants')}</p>
      </div>

      {/* Compact matrix */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="text-base font-semibold text-ink">{t('settingsPermissionSummary')}</h3>
          <p className="text-xs text-subtext mt-0.5">{t('settingsClickRoleHint')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColSystemRole')}</th>
                {GROUP_ORDER.map((g) => (
                  <th
                    key={g}
                    className="text-center px-2 py-3 text-[10px] font-semibold text-subtext uppercase tracking-wider"
                    title={t(GROUP_LABEL_KEYS[g])}
                  >
                    {t(GROUP_ABBREV_KEYS[g] || GROUP_LABEL_KEYS[g]).split(' ')[0]}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsTotalCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map(({ role, permissions }) => {
                const groupHas = (prefix: string) => permissions.some((p) => permGroup(p) === prefix);
                return (
                  <tr
                    key={role}
                    onClick={() => setExpandedRole(expandedRole === role ? null : role)}
                    className="hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[role] || ROLE_BADGE_FALLBACK}`}>
                          {roleLabel(role, t)}
                        </span>
                        {expandedRole === role && (
                          <svg className="w-4 h-4 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {GROUP_ORDER.map((g) => (
                      <td key={g} className="text-center px-2 py-3.5">
                        {groupHas(g) ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-success-subtle text-success">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-subtle text-subtext">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-4 py-3.5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-info-subtle text-info-text text-xs font-bold">
                        {permissions.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded detail */}
      {expandedRole && (() => {
        const roleEntry = roles.find((r) => r.role === expandedRole);
        if (!roleEntry) return null;
        const groups = new Map<string, string[]>();
        roleEntry.permissions.forEach((p) => {
          const g = permGroup(p);
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(p);
        });
        const sortedGroups = Array.from(groups.entries()).sort(
          (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
        );
        return (
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-ink">
                  {t('settingsRolePermissionsTitle', { role: roleLabel(roleEntry.role, t) })}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[roleEntry.role] || ROLE_BADGE_FALLBACK}`}>
                  {t('settingsGrantedCount', { count: roleEntry.permissions.length })}
                </span>
              </div>
              <button
                onClick={() => setExpandedRole(null)}
                className="text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                {t('settingsCollapse')}
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedGroups.map(([groupKey, perms]) => (
                <div key={groupKey} className="rounded-xl border border-line bg-subtle p-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                    {t(GROUP_LABEL_KEYS[groupKey])}
                  </p>
                  <ul className="space-y-1.5">
                    {perms
                      .slice()
                      .sort((a, b) => a.localeCompare(b))
                      .map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-ink">
                          <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {PERM_LABEL_KEYS[p] ? t(PERM_LABEL_KEYS[p]) : p}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

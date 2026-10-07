import {
  OrganizationIcon,
  RecruitmentIcon,
  EmployeeIcon,
  CompanyIcon,
  OperationsIcon,
  SitesIcon,
  AttendanceIcon,
  PayrollIcon,
  StaffPayrollIcon,
  ReportsIcon,
  ProjectIcon,
  FleetIcon,
  CRMIcon,
  SettingsIcon,
} from '../components/ModuleIcons';
import { UserRole } from '../types';
import type React from 'react';

export interface SubFeature {
  label: string;
  route: string;
  icon?: React.FC<{ size?: number; className?: string }>;
  /** i18n dictionary key for the nav tab (fallback: label). */
  labelKey?: string;
}

export interface ModuleDef {
  id: string;
  label: string;
  subtitle: string;
  /** i18n dictionary keys for the dashboard cards (fallback: label/subtitle). */
  labelKey?: string;
  subtitleKey?: string;
  route: string | null;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  text: string;
  border: string;
  hoverBorder: string;
  arrowBg: string;
  arrowText: string;
  roles: UserRole[];
  active: boolean;
  groupId?: string;
  /**
   * Hidden dashboard cards. The tile is not rendered on the dashboard, but the
   * route keeps working because the feature stays reachable from its parent
   * module (e.g. HR & People > Staff Attendance).
   */
  hidden?: boolean;
  /** Coming-soon card: shows a placeholder note instead of a live module. */
  comingSoon?: boolean;
  /** i18n key for the coming-soon note shown on the card. */
  soonKey?: string;
}

export interface ModuleGroup {
  id: string;
  label: string;
  /** i18n dictionary key for the nav group label (fallback: label). */
  labelKey?: string;
  color: string;
  bg: string;
  text: string;
  borderColor: string;
  navBg: string;
  subFeatures: SubFeature[];
  roles: UserRole[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'hr',
    label: 'HR and People',
    labelKey: 'groupHr',
    color: '#7C3AED',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    borderColor: 'border-violet-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Employees', route: '/employees', icon: EmployeeIcon, labelKey: 'navEmployees' },
      { label: 'Staff Attendance', route: '/staff-attendance', icon: AttendanceIcon, labelKey: 'navStaffAttendance' },
      { label: 'Departments & Positions', route: '/departments', icon: OrganizationIcon, labelKey: 'navDepartments' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  },
  {
    id: 'company',
    label: 'Company',
    labelKey: 'groupCompany',
    color: '#0D9488',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    borderColor: 'border-teal-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Company', route: '/companies', icon: CompanyIcon, labelKey: 'navCompany' },
      { label: 'Site', route: '/sites', icon: SitesIcon, labelKey: 'navSite' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO],
  },
  {
    id: 'ops',
    label: 'Operations',
    labelKey: 'groupOps',
    color: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    borderColor: 'border-blue-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Guards', route: '/guards', icon: OperationsIcon, labelKey: 'navGuards' },
      { label: 'Attendance', route: '/attendance', icon: AttendanceIcon, labelKey: 'navAttendance' },
      { label: 'Rotations', route: '/rotations', icon: OperationsIcon, labelKey: 'navRotations' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    labelKey: 'groupPayroll',
    color: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    borderColor: 'border-amber-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Staff Payroll', route: '/staff-payroll', icon: StaffPayrollIcon, labelKey: 'navStaffPayroll' },
      { label: 'Guard Payroll', route: '/guard-payroll', icon: PayrollIcon, labelKey: 'navGuardPayroll' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'reports',
    label: 'Reports',
    labelKey: 'groupReports',
    color: '#DC2626',
    bg: 'bg-red-50',
    text: 'text-red-600',
    borderColor: 'border-red-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Reports', route: '/reports', icon: ReportsIcon, labelKey: 'navReports' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'admin',
    label: 'Administration',
    labelKey: 'groupAdmin',
    color: '#475569',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    borderColor: 'border-slate-200',
    navBg: 'bg-white border-b border-gray-100',
    subFeatures: [
      { label: 'Settings', route: '/settings', icon: SettingsIcon, labelKey: 'navSettings' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },];

const ALL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN,
  UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.GUARD, UserRole.CEO,
];

export const MODULES: ModuleDef[] = [
  {
    id: 'organization',
    label: 'Organization',
    subtitle: 'Manage your company structure and settings.',
    labelKey: 'moduleOrganization',
    subtitleKey: 'moduleOrganizationSub',
    route: '/settings',
    icon: OrganizationIcon,
    color: '#6366F1',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-300',
    arrowBg: 'bg-indigo-100',
    arrowText: 'text-indigo-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'admin',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    subtitle: 'Handle job postings, applications and hiring.',
    labelKey: 'moduleRecruitment',
    subtitleKey: 'moduleRecruitmentSub',
    route: null,
    icon: RecruitmentIcon,
    color: '#14B8A6',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    arrowBg: 'bg-teal-100',
    arrowText: 'text-teal-600',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'employee',
    label: 'HR and People',
    subtitle: 'Manage employees, departments, attendance and contracts.',
    labelKey: 'moduleEmployee',
    subtitleKey: 'moduleEmployeeSub',
    route: '/employees',
    icon: EmployeeIcon,
    color: '#7C3AED',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-300',
    arrowBg: 'bg-violet-100',
    arrowText: 'text-violet-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'hr',
  },
  {
    id: 'company',
    label: 'Company',
    subtitle: 'Company details and basic settings.',
    labelKey: 'moduleCompany',
    subtitleKey: 'moduleCompanySub',
    route: '/companies',
    icon: CompanyIcon,
    color: '#0D9488',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    arrowBg: 'bg-teal-100',
    arrowText: 'text-teal-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'company',
  },
  {
    id: 'ops',
    label: 'Operations',
    subtitle: 'Manage daily operations and workflows.',
    labelKey: 'moduleOperations',
    subtitleKey: 'moduleOperationsSub',
    route: '/guards',
    icon: OperationsIcon,
    color: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-300',
    arrowBg: 'bg-blue-100',
    arrowText: 'text-blue-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'ops',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    subtitle: 'Track attendance for staff and guards.',
    labelKey: 'moduleAttendance',
    subtitleKey: 'moduleAttendanceSub',
    route: '/staff-attendance',
    icon: AttendanceIcon,
    color: '#F59E0B',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
    arrowBg: 'bg-amber-100',
    arrowText: 'text-amber-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    hidden: true,
    groupId: 'hr',
  },
  {
    id: 'staff-payroll',
    label: 'Staff Payroll',
    subtitle: 'Contract-driven office payroll — frozen company formula.',
    labelKey: 'moduleStaffPayroll',
    subtitleKey: 'moduleStaffPayrollSub',
    route: '/staff-payroll',
    icon: StaffPayrollIcon,
    color: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
    arrowBg: 'bg-amber-100',
    arrowText: 'text-amber-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    comingSoon: false,
    groupId: 'payroll',
  },
  {
    id: 'guard-payroll',
    label: 'Guard Payroll',
    subtitle: 'Attendance-driven, site-by-site guard payroll with approval and history.',
    labelKey: 'moduleGuardPayroll',
    subtitleKey: 'moduleGuardPayrollSub',
    route: '/guard-payroll',
    icon: PayrollIcon,
    color: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
    arrowBg: 'bg-amber-100',
    arrowText: 'text-amber-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'payroll',
  },
  {
    id: 'project',
    label: 'Project Management',
    subtitle: 'Tasks, milestones, time tracking, resource allocation.',
    labelKey: 'moduleProject',
    subtitleKey: 'moduleProjectSub',
    route: null,
    icon: ProjectIcon,
    color: '#6366F1',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-300',
    arrowBg: 'bg-indigo-100',
    arrowText: 'text-indigo-600',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'fleet',
    label: 'Fleet Management',
    subtitle: 'Vehicles, maintenance, fuel tracking, assignments.',
    labelKey: 'moduleFleet',
    subtitleKey: 'moduleFleetSub',
    route: null,
    icon: FleetIcon,
    color: '#7C3AED',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-300',
    arrowBg: 'bg-purple-100',
    arrowText: 'text-purple-600',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'crm',
    label: 'Sales & CRM',
    subtitle: 'Leads, opportunities, customer relationships.',
    labelKey: 'moduleCrm',
    subtitleKey: 'moduleCrmSub',
    route: null,
    icon: CRMIcon,
    color: '#14B8A6',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    arrowBg: 'bg-teal-100',
    arrowText: 'text-teal-600',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'reports',
    label: 'Reports',
    subtitle: 'Filterable report for every module — filter, export to CSV, or print.',
    labelKey: 'moduleReports',
    subtitleKey: 'moduleReportsSub',
    route: '/reports',
    icon: ReportsIcon,
    color: '#DC2626',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    hoverBorder: 'hover:border-red-300',
    arrowBg: 'bg-red-100',
    arrowText: 'text-red-600',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
    active: true,
  },
];

const ROUTE_OVERRIDES: { pattern: RegExp; groupId: string }[] = [
  { pattern: /^\/employees(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/departments(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/staff-attendance(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/companies(\/.*)?$/, groupId: 'company' },
  { pattern: /^\/sites(\/.*)?$/, groupId: 'company' },
  { pattern: /^\/guards(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/attendance(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/rotations(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/staff-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/guard-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/settings(\/.*)?$/, groupId: 'admin' },
  { pattern: /^\/contracts(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/reports(\/.*)?$/, groupId: 'reports' },
];

export function getModuleGroupForRoute(pathname: string): ModuleGroup | null {
  for (const override of ROUTE_OVERRIDES) {
    if (override.pattern.test(pathname)) {
      return MODULE_GROUPS.find((g) => g.id === override.groupId) || null;
    }
  }
  for (const group of MODULE_GROUPS) {
    for (const sf of group.subFeatures) {
      const sfPath = sf.route.split('?')[0];
      if (pathname === sfPath) {
        return group;
      }
    }
  }
  return null;
}

export function getModuleGroupById(groupId: string): ModuleGroup | undefined {
  return MODULE_GROUPS.find((g) => g.id === groupId);
}

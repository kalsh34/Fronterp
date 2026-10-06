import {
  OrganizationIcon,
  RecruitmentIcon,
  EmployeeIcon,
  CompanyIcon,
  OperationsIcon,
  SitesIcon,
  AttendanceIcon,
  SalaryStructureIcon,
  PayrollIcon,
  StaffPayrollIcon,
  ProjectIcon,
  FleetIcon,
  CRMIcon,
  ReportsIcon,
  ControlTowerIcon,
  GuardFilingIcon,
  SettingsIcon,
  PayrollConfigIcon,
} from '../components/ModuleIcons';
import { UserRole } from '../types';
import type React from 'react';

export interface SubFeature {
  label: string;
  route: string;
  icon?: React.FC<{ size?: number; className?: string }>;
}

export interface ModuleDef {
  id: string;
  label: string;
  subtitle: string;
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
}

export interface ModuleGroup {
  id: string;
  label: string;
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
    label: 'HR & People',
    color: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    borderColor: 'border-blue-200',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Employees', route: '/employees', icon: EmployeeIcon },
      { label: 'Staff Attendance', route: '/staff-attendance', icon: AttendanceIcon },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  },
  {
    id: 'ops',
    label: 'Operations',
    color: '#0F172A',
    bg: 'bg-slate-100',
    text: 'text-slate-900',
    borderColor: 'border-slate-300',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Guard Attendance', route: '/attendance', icon: GuardFilingIcon },
      { label: 'Sites', route: '/sites', icon: SitesIcon },
      { label: 'Guards', route: '/guards', icon: OperationsIcon },
      { label: 'Rotations', route: '/rotations', icon: OperationsIcon },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    color: '#1D4ED8',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    borderColor: 'border-blue-200',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Guard Payroll', route: '/guard-payroll', icon: PayrollIcon },
      { label: 'Staff Payroll', route: '/staff-payroll', icon: StaffPayrollIcon },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'finance',
    label: 'Finance',
    color: '#0369A1',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    borderColor: 'border-sky-200',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Control Tower', route: '/finance', icon: ControlTowerIcon },
      { label: 'Finance Review', route: '/guard-payroll/review' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
  {
    id: 'reports',
    label: 'Reports',
    color: '#1E293B',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    borderColor: 'border-slate-300',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Reports', route: '/reports', icon: ReportsIcon },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'admin',
    label: 'Administration',
    color: '#0F172A',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    borderColor: 'border-slate-300',
    navBg: 'bg-white border-b border-slate-200',
    subFeatures: [
      { label: 'Settings', route: '/settings', icon: SettingsIcon },
      { label: 'Salary Structures', route: '/admin/salary-structures', icon: SalaryStructureIcon },
      { label: 'Payroll Config', route: '/admin/payroll-config', icon: PayrollConfigIcon },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
];

const ALL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN,
  UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.GUARD, UserRole.CEO,
];

export const MODULES: ModuleDef[] = [
  {
    id: 'organization',
    label: 'Organization',
    subtitle: 'Manage your company structure and settings.',
    route: '/settings',
    icon: OrganizationIcon,
    color: '#0F172A',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'admin',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    subtitle: 'Handle job postings, applications and hiring.',
    route: null,
    icon: RecruitmentIcon,
    color: '#64748B',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    arrowBg: 'bg-slate-100',
    arrowText: 'text-slate-400',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'employee',
    label: 'Employees & Staff',
    subtitle: 'Manage workforce profiles and credentials.',
    route: '/employees',
    icon: EmployeeIcon,
    color: '#2563EB',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'hr',
  },
  {
    id: 'company',
    label: 'Company Profile',
    subtitle: 'Legal entity details and master records.',
    route: null,
    icon: CompanyIcon,
    color: '#64748B',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    arrowBg: 'bg-slate-100',
    arrowText: 'text-slate-400',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'ops',
    label: 'Operations & Sites',
    subtitle: 'Monitor client locations, deployments and guards.',
    route: '/sites',
    icon: OperationsIcon,
    color: '#0F172A',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'ops',
  },
  {
    id: 'attendance',
    label: 'Staff Attendance',
    subtitle: 'Track office attendance and time logs.',
    route: '/staff-attendance',
    icon: AttendanceIcon,
    color: '#2563EB',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'hr',
  },
  {
    id: 'salary',
    label: 'Salary Structure',
    subtitle: 'Define compensation tiers and allowances.',
    route: '/admin/salary-structures',
    icon: SalaryStructureIcon,
    color: '#0F172A',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'admin',
  },
  {
    id: 'payroll',
    label: 'Guard Payroll',
    subtitle: 'Process and audit guard monthly payroll.',
    route: '/guard-payroll',
    icon: PayrollIcon,
    color: '#1D4ED8',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'payroll',
  },
  {
    id: 'staff-payroll',
    label: 'Staff Payroll',
    subtitle: 'Process and manage office staff payroll.',
    route: '/staff-payroll',
    icon: StaffPayrollIcon,
    color: '#1D4ED8',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'payroll',
  },
  {
    id: 'project',
    label: 'Project Management',
    subtitle: 'Tasks, milestones, time tracking, resource allocation.',
    route: null,
    icon: ProjectIcon,
    color: '#64748B',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    arrowBg: 'bg-slate-100',
    arrowText: 'text-slate-400',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'fleet',
    label: 'Fleet Management',
    subtitle: 'Vehicles, patrol dispatch, fuel and maintenance.',
    route: null,
    icon: FleetIcon,
    color: '#64748B',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    arrowBg: 'bg-slate-100',
    arrowText: 'text-slate-400',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'crm',
    label: 'Client CRM & Contracts',
    subtitle: 'Leads, service proposals and agreements.',
    route: null,
    icon: CRMIcon,
    color: '#64748B',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    arrowBg: 'bg-slate-100',
    arrowText: 'text-slate-400',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    subtitle: 'Operational metrics, audit logs & exports.',
    route: '/reports',
    icon: ReportsIcon,
    color: '#0F172A',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'reports',
  },
  {
    id: 'control',
    label: 'Control Tower',
    subtitle: 'Real-time financial and operational oversight.',
    route: '/finance',
    icon: ControlTowerIcon,
    color: '#0369A1',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
    active: true,
    groupId: 'finance',
  },
  {
    id: 'guard-filing',
    label: 'Guard Attendance & Rosters',
    subtitle: 'Log duty shifts, rotations and check-ins.',
    route: '/attendance',
    icon: GuardFilingIcon,
    color: '#0F172A',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-500/50',
    arrowBg: 'bg-slate-100 group-hover:bg-blue-600',
    arrowText: 'text-slate-600 group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'ops',
  },
];

const ROUTE_OVERRIDES: { pattern: RegExp; groupId: string }[] = [
  { pattern: /^\/employees(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/staff-attendance\/summary$/, groupId: 'finance' },
  { pattern: /^\/staff-attendance(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/sites(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/guards(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/attendance(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/rotations(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/guard-payroll\/review$/, groupId: 'finance' },
  { pattern: /^\/guard-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/staff-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/finance(\/.*)?$/, groupId: 'finance' },
  { pattern: /^\/reports(\/.*)?$/, groupId: 'reports' },
  { pattern: /^\/settings(\/.*)?$/, groupId: 'admin' },
  { pattern: /^\/contracts(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/admin\/salary-structures$/, groupId: 'admin' },
  { pattern: /^\/admin\/payroll-config$/, groupId: 'admin' },
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

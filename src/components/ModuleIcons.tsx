import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const OrganizationIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <rect x="14" y="16" width="28" height="26" rx="3" fill="#6366F1" />
    <rect x="14" y="16" width="28" height="8" rx="3" fill="#818CF8" />
    <rect x="18" y="27" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="25.5" y="27" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="33" y="27" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="18" y="34" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="25.5" y="34" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="33" y="34" width="5" height="5" rx="1" fill="#C7D2FE" />
    <rect x="24" y="12" width="8" height="4" rx="1" fill="#4F46E5" />
    <circle cx="28" cy="13" r="1.5" fill="#FCD34D" />
  </svg>
);

export const RecruitmentIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#ECFDF5" />
    <circle cx="28" cy="22" r="8" fill="#14B8A6" />
    <circle cx="28" cy="20" r="5" fill="#FFFFFF" />
    <circle cx="28" cy="19" r="3" fill="#5EEAD4" />
    <path d="M16 42c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#0D9488" />
    <circle cx="38" cy="16" r="5" fill="#10B981" />
    <path d="M36 16h4M38 14v4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const EmployeeIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <circle cx="28" cy="20" r="6" fill="#6366F1" />
    <circle cx="28" cy="19" r="4" fill="#E0E7FF" />
    <circle cx="28" cy="18.5" r="2.5" fill="#818CF8" />
    <path d="M18 42c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#4F46E5" />
    <circle cx="18" cy="24" r="4" fill="#A5B4FC" />
    <circle cx="18" cy="23" r="2.5" fill="#E0E7FF" />
    <circle cx="38" cy="24" r="4" fill="#A5B4FC" />
    <circle cx="38" cy="23" r="2.5" fill="#E0E7FF" />
    <path d="M12 42c0-4 3-7 6-8" fill="#818CF8" />
    <path d="M44 42c0-4-3-7-6-8" fill="#818CF8" />
  </svg>
);

export const CompanyIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#ECFDF5" />
    <rect x="12" y="18" width="16" height="24" rx="2" fill="#0D9488" />
    <rect x="12" y="18" width="16" height="6" rx="2" fill="#14B8A6" />
    <rect x="15" y="26" width="4" height="4" rx="0.5" fill="#CCFBF1" />
    <rect x="21" y="26" width="4" height="4" rx="0.5" fill="#CCFBF1" />
    <rect x="15" y="32" width="4" height="4" rx="0.5" fill="#CCFBF1" />
    <rect x="21" y="32" width="4" height="4" rx="0.5" fill="#CCFBF1" />
    <rect x="30" y="24" width="14" height="18" rx="2" fill="#5EEAD4" />
    <rect x="30" y="24" width="14" height="5" rx="2" fill="#99F6E4" />
    <rect x="33" y="31" width="3" height="3" rx="0.5" fill="#FFFFFF" />
    <rect x="38" y="31" width="3" height="3" rx="0.5" fill="#FFFFFF" />
    <rect x="33" y="36" width="3" height="3" rx="0.5" fill="#FFFFFF" />
    <rect x="38" y="36" width="3" height="3" rx="0.5" fill="#FFFFFF" />
    <rect x="33" y="14" width="8" height="10" rx="1" fill="#2DD4BF" />
    <path d="M33 24h8" stroke="#0D9488" strokeWidth="1" />
  </svg>
);

export const OperationsIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <circle cx="28" cy="28" r="14" fill="#6366F1" />
    <circle cx="28" cy="28" r="10" fill="#818CF8" />
    <circle cx="28" cy="28" r="4" fill="#E0E7FF" />
    <path d="M28 14v4M28 38v4M14 28h4M38 28h4" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
    <path d="M20.3 20.3l2.8 2.8M32.9 32.9l2.8 2.8M35.7 20.3l-2.8 2.8M23.1 32.9l-2.8 2.8" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="28" cy="28" r="2" fill="#FFFFFF" />
  </svg>
);

export const SitesIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#F0FDF4" />
    <path d="M28 10C20 10 14 16 14 24c0 10 14 22 14 22s14-12 14-22c0-8-6-14-14-14z" fill="#10B981" />
    <circle cx="28" cy="23" r="6" fill="#FFFFFF" />
    <circle cx="28" cy="23" r="3" fill="#34D399" />
    <path d="M22 38l-4 6h20l-4-6" fill="#059669" />
    <rect x="24" y="32" width="8" height="4" rx="1" fill="#D1FAE5" />
  </svg>
);

export const AttendanceIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FEF3C7" />
    <rect x="12" y="14" width="32" height="28" rx="4" fill="#F59E0B" />
    <rect x="12" y="14" width="32" height="8" rx="4" fill="#D97706" />
    <rect x="16" y="10" width="3" height="8" rx="1.5" fill="#92400E" />
    <rect x="37" y="10" width="3" height="8" rx="1.5" fill="#92400E" />
    <circle cx="36" cy="36" r="7" fill="#FFFFFF" />
    <path d="M36 32v5l3 2" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="17" y="26" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="23" y="26" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="29" y="26" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="17" y="32" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="23" y="32" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="29" y="32" width="4" height="4" rx="1" fill="#FDE68A" />
    <rect x="17" y="38" width="4" height="3" rx="1" fill="#FDE68A" />
    <rect x="23" y="38" width="4" height="3" rx="1" fill="#FDE68A" />
  </svg>
);

export const SalaryStructureIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FEF3C7" />
    <ellipse cx="28" cy="34" rx="12" ry="8" fill="#D97706" />
    <ellipse cx="28" cy="32" rx="12" ry="8" fill="#F59E0B" />
    <ellipse cx="28" cy="30" rx="10" ry="6" fill="#FBBF24" />
    <path d="M22 24c0-4 3-8 6-8s6 4 6 8" fill="#92400E" />
    <path d="M22 24c0 4 3 6 6 6s6-2 6-6" fill="#D97706" />
    <circle cx="28" cy="22" r="3" fill="#FEF3C7" />
    <text x="28" y="23" textAnchor="middle" fill="#92400E" fontSize="5" fontWeight="bold">$</text>
    <circle cx="20" cy="36" r="2" fill="#FCD34D" />
    <circle cx="36" cy="36" r="2" fill="#FCD34D" />
    <circle cx="28" cy="40" r="2" fill="#FCD34D" />
  </svg>
);

export const SalaryAdjustmentIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#F0FDF4" />
    <rect x="12" y="32" width="8" height="10" rx="2" fill="#86EFAC" />
    <rect x="24" y="26" width="8" height="16" rx="2" fill="#34D399" />
    <rect x="36" y="18" width="8" height="24" rx="2" fill="#10B981" />
    <path d="M14 20l10 8 10-6 8-8" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 14l4 6h-4" fill="#059669" />
    <path d="M40 14v-4h-4" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PayrollIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FEF3C7" />
    <rect x="12" y="10" width="24" height="32" rx="3" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
    <rect x="12" y="10" width="24" height="8" rx="3" fill="#F59E0B" />
    <rect x="16" y="22" width="16" height="2" rx="1" fill="#E5E7EB" />
    <rect x="16" y="27" width="12" height="2" rx="1" fill="#E5E7EB" />
    <rect x="16" y="32" width="14" height="2" rx="1" fill="#E5E7EB" />
    <circle cx="40" cy="36" r="10" fill="#F59E0B" />
    <circle cx="40" cy="36" r="7" fill="#FBBF24" />
    <text x="40" y="38" textAnchor="middle" fill="#92400E" fontSize="10" fontWeight="bold">$</text>
  </svg>
);

export const StaffPayrollIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <rect x="10" y="12" width="22" height="30" rx="3" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
    <rect x="10" y="12" width="22" height="7" rx="3" fill="#6366F1" />
    <rect x="14" y="23" width="14" height="2" rx="1" fill="#E5E7EB" />
    <rect x="14" y="28" width="10" height="2" rx="1" fill="#E5E7EB" />
    <rect x="14" y="33" width="12" height="2" rx="1" fill="#E5E7EB" />
    <circle cx="38" cy="34" r="10" fill="#6366F1" />
    <circle cx="38" cy="34" r="7" fill="#818CF8" />
    <text x="38" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">$</text>
  </svg>
);

export const LeaveIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FDF2F8" />
    <rect x="12" y="14" width="32" height="28" rx="4" fill="#EC4899" />
    <rect x="12" y="14" width="32" height="8" rx="4" fill="#DB2777" />
    <rect x="16" y="10" width="3" height="8" rx="1.5" fill="#9D174D" />
    <rect x="37" y="10" width="3" height="8" rx="1.5" fill="#9D174D" />
    <circle cx="36" cy="36" r="7" fill="#FFFFFF" />
    <path d="M33 36h6M36 33v6" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="17" y="26" width="4" height="4" rx="1" fill="#FBCFE8" />
    <rect x="23" y="26" width="4" height="4" rx="1" fill="#FBCFE8" />
    <rect x="29" y="26" width="4" height="4" rx="1" fill="#FBCFE8" />
    <rect x="17" y="32" width="4" height="4" rx="1" fill="#FBCFE8" />
    <rect x="23" y="32" width="4" height="4" rx="1" fill="#FBCFE8" />
    <rect x="29" y="32" width="4" height="4" rx="1" fill="#FBCFE8" />
  </svg>
);

export const ProjectIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <rect x="12" y="10" width="32" height="36" rx="4" fill="#6366F1" />
    <rect x="12" y="10" width="32" height="10" rx="4" fill="#4F46E5" />
    <rect x="16" y="24" width="24" height="3" rx="1.5" fill="#C7D2FE" />
    <rect x="16" y="30" width="20" height="3" rx="1.5" fill="#C7D2FE" />
    <rect x="16" y="36" width="22" height="3" rx="1.5" fill="#C7D2FE" />
    <circle cx="14" cy="25" r="1.5" fill="#FFFFFF" />
    <circle cx="14" cy="31" r="1.5" fill="#FFFFFF" />
    <circle cx="14" cy="37" r="1.5" fill="#FFFFFF" />
    <path d="M34 14l4 4-4 4" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FleetIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#F5F3FF" />
    <rect x="8" y="22" width="28" height="14" rx="3" fill="#7C3AED" />
    <rect x="36" y="26" width="12" height="10" rx="2" fill="#8B5CF6" />
    <rect x="8" y="22" width="28" height="5" rx="3" fill="#8B5CF6" />
    <rect x="10" y="28" width="6" height="5" rx="1" fill="#DDD6FE" />
    <rect x="18" y="28" width="6" height="5" rx="1" fill="#DDD6FE" />
    <circle cx="16" cy="40" r="4" fill="#6D28D9" />
    <circle cx="16" cy="40" r="2" fill="#EDE9FE" />
    <circle cx="40" cy="40" r="4" fill="#6D28D9" />
    <circle cx="40" cy="40" r="2" fill="#EDE9FE" />
    <rect x="38" y="28" width="8" height="4" rx="1" fill="#C4B5FD" />
  </svg>
);

export const ProcurementIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#ECFDF5" />
    <path d="M14 18h4l4 16h20l4-12H20" fill="#10B981" />
    <path d="M14 18h4l4 16h20l4-12H20" stroke="#059669" strokeWidth="1" />
    <circle cx="24" cy="40" r="3" fill="#059669" />
    <circle cx="24" cy="40" r="1.5" fill="#D1FAE5" />
    <circle cx="38" cy="40" r="3" fill="#059669" />
    <circle cx="38" cy="40" r="1.5" fill="#D1FAE5" />
    <rect x="24" y="22" width="8" height="4" rx="1" fill="#6EE7B7" />
    <path d="M26 20v-4l4-2 4 2v4" fill="#34D399" />
  </svg>
);

export const ManufacturingIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <rect x="10" y="20" width="14" height="22" rx="2" fill="#6366F1" />
    <rect x="26" y="14" width="14" height="28" rx="2" fill="#4F46E5" />
    <rect x="42" y="26" width="6" height="16" rx="1" fill="#818CF8" />
    <rect x="12" y="22" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="18" y="22" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="12" y="28" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="18" y="28" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="28" y="16" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="34" y="16" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="28" y="22" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="34" y="22" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="28" y="28" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="34" y="28" width="4" height="4" rx="0.5" fill="#C7D2FE" />
    <rect x="10" y="16" width="6" height="4" rx="1" fill="#818CF8" />
    <rect x="26" y="10" width="6" height="4" rx="1" fill="#6366F1" />
  </svg>
);

export const CRMIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#ECFDF5" />
    <circle cx="22" cy="22" r="8" fill="#14B8A6" />
    <circle cx="22" cy="20" r="5" fill="#FFFFFF" />
    <circle cx="22" cy="19" r="3" fill="#5EEAD4" />
    <circle cx="34" cy="22" r="8" fill="#0D9488" />
    <circle cx="34" cy="20" r="5" fill="#FFFFFF" />
    <circle cx="34" cy="19" r="3" fill="#99F6E4" />
    <path d="M14 42c0-6 4-10 8-10h12c4 0 8 4 8 10" fill="#0D9488" />
    <path d="M22 34l4 4 8-8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ReportsIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <rect x="10" y="12" width="36" height="32" rx="4" fill="#4F46E5" />
    <rect x="14" y="16" width="28" height="24" rx="2" fill="#FFFFFF" />
    <rect x="18" y="32" width="4" height="6" rx="1" fill="#818CF8" />
    <rect x="24" y="26" width="4" height="12" rx="1" fill="#6366F1" />
    <rect x="30" y="22" width="4" height="16" rx="1" fill="#4F46E5" />
    <rect x="36" y="28" width="4" height="10" rx="1" fill="#A5B4FC" />
    <path d="M18 30l6-4 6 2 6-6" stroke="#C7D2FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ControlTowerIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#ECFDF5" />
    <circle cx="28" cy="28" r="16" fill="#0D9488" />
    <circle cx="28" cy="28" r="12" fill="#14B8A6" />
    <circle cx="28" cy="28" r="8" fill="#2DD4BF" />
    <circle cx="28" cy="28" r="4" fill="#FFFFFF" />
    <circle cx="28" cy="28" r="2" fill="#0D9488" />
    <path d="M28 12v4M28 40v4M12 28h4M40 28h4" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="24" r="2" fill="#FCD34D" />
  </svg>
);

export const GuardFilingIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#EEF2FF" />
    <circle cx="28" cy="18" r="7" fill="#6366F1" />
    <circle cx="28" cy="16" r="4.5" fill="#E0E7FF" />
    <circle cx="28" cy="15.5" r="2.5" fill="#818CF8" />
    <path d="M18 44c0-6 4.5-10 10-10s10 4 10 10" fill="#4F46E5" />
    <rect x="22" y="28" width="12" height="8" rx="2" fill="#818CF8" />
    <path d="M28 11l3-4h-6l3 4" fill="#FCD34D" />
    <rect x="12" y="38" width="8" height="6" rx="1" fill="#C7D2FE" />
    <rect x="36" y="38" width="8" height="6" rx="1" fill="#C7D2FE" />
    <path d="M14 40l2 2 4-4" stroke="#4F46E5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SiteCoverageIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FEF2F2" />
    <path d="M28 8C18 8 10 16 10 26c0 14 18 22 18 22s18-8 18-22c0-10-8-18-18-18z" fill="#EF4444" />
    <circle cx="28" cy="25" r="8" fill="#FFFFFF" />
    <circle cx="28" cy="25" r="4" fill="#FCA5A5" />
    <circle cx="28" cy="25" r="2" fill="#EF4444" />
    <path d="M20 42l-4 6h24l-4-6" fill="#DC2626" />
    <rect x="14" y="44" width="28" height="3" rx="1" fill="#FEE2E2" />
  </svg>
);

export const SignNoteIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#FEF3C7" />
    <rect x="12" y="8" width="24" height="32" rx="3" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
    <rect x="16" y="14" width="16" height="2" rx="1" fill="#E5E7EB" />
    <rect x="16" y="19" width="12" height="2" rx="1" fill="#E5E7EB" />
    <rect x="16" y="24" width="14" height="2" rx="1" fill="#E5E7EB" />
    <rect x="16" y="29" width="10" height="2" rx="1" fill="#E5E7EB" />
    <path d="M36 28l8-8 6 6-8 8-4 2 2-4z" fill="#F59E0B" />
    <path d="M40 22l4 4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="34" y="34" width="14" height="14" rx="2" fill="#FBBF24" />
    <path d="M38 40l2 2 4-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#F1F5F9" />
    <circle cx="28" cy="28" r="10" fill="#475569" />
    <circle cx="28" cy="28" r="6" fill="#FFFFFF" />
    <circle cx="28" cy="28" r="3" fill="#94A3B8" />
    <path d="M28 12v6M28 38v6M12 28h6M38 28h6M17 17l4.2 4.2M34.8 34.8L39 39M39 17l-4.2 4.2M21.2 34.8L17 39" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const PayrollConfigIcon: React.FC<IconProps> = ({ size = 56, className }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className={className}>
    <circle cx="28" cy="28" r="28" fill="#F5F3FF" />
    <rect x="10" y="12" width="36" height="32" rx="4" fill="#7C3AED" />
    <rect x="14" y="16" width="28" height="24" rx="2" fill="#FFFFFF" />
    <rect x="18" y="20" width="20" height="3" rx="1.5" fill="#E9D5FF" />
    <rect x="18" y="26" width="16" height="3" rx="1.5" fill="#E9D5FF" />
    <rect x="18" y="32" width="18" height="3" rx="1.5" fill="#E9D5FF" />
    <circle cx="40" cy="38" r="8" fill="#8B5CF6" />
    <circle cx="40" cy="38" r="5" fill="#A78BFA" />
    <path d="M38 38h4M40 36v4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

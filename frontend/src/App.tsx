import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { UserRole } from './types';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleNavbar from './components/ModuleNavbar';
import { getModuleGroupForRoute } from './config/modules';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeeList from './features/employees/EmployeeList';
import EmployeeForm from './features/employees/EmployeeForm';
import { SiteList } from './features/sites/SiteList';
import SiteDetail from './features/sites/SiteDetail';
import CompanyList from './features/companies/CompanyList';
import RotationListPage from './features/rotations/RotationListPage';
import RotationWizardPage from './features/rotations/RotationWizardPage';
import RotationDetailPage from './features/rotations/RotationDetailPage';
import StaffAttendancePage from './features/staff-attendance/StaffAttendancePage';
import GuardAttendancePage from './features/attendance/GuardAttendancePage';
import { SettingsPage } from './features/settings/SettingsPage';
import OrganizationStructurePage from './features/organization/OrganizationStructurePage';
import GuardsPage from './features/guards/GuardsPage';
import MySitesPage from './features/guard/MySitesPage';import MyProfilePage from './features/guard/MyProfilePage';
import GuardDashboardPage from './features/guard/GuardDashboardPage';
import GuardScanPage from './features/guard/GuardScanPage';
import GuardShiftsPage from './features/guard/GuardShiftsPage';
import ProfilePage from './features/profile/ProfilePage';
import SiteQRCodesPage from './features/organization/SiteQRCodesPage';
import ContractForm from './features/contracts/ContractForm';
import GuarantorPage from './features/guarantor/GuarantorPage';
import StaffPayrollPage from './features/staff-payroll/StaffPayrollPage';
import GuardPayrollPage from './features/guard-payroll/GuardPayrollPage';
import ModuleReportsPage from './features/reports/ModuleReportsPage';

function AppLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isGuard = user?.role === UserRole.GUARD;

  if (isGuard) {
    return (
      <Routes>
        <Route path="/guard" element={<GuardDashboardPage />} />
        <Route path="/guard/scan" element={<GuardScanPage />} />
        <Route path="/guard/shifts" element={<GuardShiftsPage />} />
        <Route path="/my-sites" element={<MySitesPage />} />
        <Route path="/my-profile" element={<MyProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/guard" />} />
      </Routes>
    );
  }

  const moduleGroup = getModuleGroupForRoute(location.pathname);

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      {moduleGroup && <ModuleNavbar moduleGroup={moduleGroup} />}
      <main className={moduleGroup ? 'overflow-x-hidden' : 'min-h-screen overflow-x-hidden'}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/employees" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><EmployeeList /></ProtectedRoute>} />
          <Route path="/employees/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/edit" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/guarantor" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><GuarantorPage /></ProtectedRoute>} />

          <Route path="/companies" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><CompanyList /></ProtectedRoute>} />
          <Route path="/sites" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteList /></ProtectedRoute>} />
          <Route path="/sites/qr-codes" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO]}><SiteQRCodesPage /></ProtectedRoute>} />
          <Route path="/sites/new" element={<Navigate to="/sites" replace />} />
          <Route path="/sites/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteDetail /></ProtectedRoute>} />

          <Route path="/guards" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO]}><GuardsPage /></ProtectedRoute>} />
          <Route path="/rotations" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><RotationListPage /></ProtectedRoute>} />
          <Route path="/rotations/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS]}><RotationWizardPage /></ProtectedRoute>} />
          <Route path="/rotations/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><RotationDetailPage /></ProtectedRoute>} />

          <Route path="/staff-attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><StaffAttendancePage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE_OFFICER, UserRole.CEO]}><GuardAttendancePage /></ProtectedRoute>} />

          <Route path="/departments" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><OrganizationStructurePage /></ProtectedRoute>} />

          {/* Payroll v2 — staff (contract-driven) and guard (attendance-driven), separate systems */}
          <Route path="/staff-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><StaffPayrollPage /></ProtectedRoute>} />
          <Route path="/guard-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><GuardPayrollPage /></ProtectedRoute>} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><SettingsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><ModuleReportsPage /></ProtectedRoute>} />
          <Route path="/contracts/:employeeId" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><ContractForm /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

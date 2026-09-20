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
import { SiteForm } from './features/sites/SiteForm';
import SiteDetail from './features/sites/SiteDetail';
import AttendancePage from './features/attendance/AttendancePage';
import RotationPage from './features/attendance/RotationPage';
import AttendanceTracker from './features/attendance/AttendanceTracker';
import StaffAttendancePage from './features/staff-attendance/StaffAttendancePage';
import FinanceStaffSummaryPage from './features/staff-attendance/FinanceStaffSummaryPage';
import GuardPayrollList from './features/guard-payroll/GuardPayrollList';
import StaffPayrollList from './features/office-payroll/StaffPayrollList';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { FinanceReview } from './features/finance/FinanceReview';
import FinancePage from './features/finance/FinancePage';
import GuardsPage from './features/guards/GuardsPage';
import MyShiftPage from './features/guard/MyShiftPage';
import MyHoursPage from './features/guard/MyHoursPage';
import MySitesPage from './features/guard/MySitesPage';
import MyProfilePage from './features/guard/MyProfilePage';
import { MyPayrollPage } from './features/guard-payroll/MyPayrollPage';
import ContractForm from './features/contracts/ContractForm';
import GuarantorPage from './features/guarantor/GuarantorPage';
import PayrollConfigPage from './features/admin/PayrollConfigPage';
import SalaryStructurePage from './features/admin/SalaryStructurePage';

function AppLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isGuard = user?.role === UserRole.GUARD;

  if (isGuard) {
    return (
      <Routes>
        <Route path="/my-shift" element={<MyShiftPage />} />
        <Route path="/my-hours" element={<MyHoursPage />} />
        <Route path="/my-sites" element={<MySitesPage />} />
        <Route path="/my-payroll" element={<MyPayrollPage />} />
        <Route path="/my-profile" element={<MyProfilePage />} />
        <Route path="*" element={<Navigate to="/my-shift" />} />
      </Routes>
    );
  }

  const moduleGroup = getModuleGroupForRoute(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {moduleGroup && <ModuleNavbar moduleGroup={moduleGroup} />}
      <main className={moduleGroup ? '' : 'min-h-screen'}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/employees" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><EmployeeList /></ProtectedRoute>} />
          <Route path="/employees/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/edit" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/guarantor" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><GuarantorPage /></ProtectedRoute>} />

          <Route path="/sites" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteList /></ProtectedRoute>} />
          <Route path="/sites/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><SiteForm /></ProtectedRoute>} />
          <Route path="/sites/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteDetail /></ProtectedRoute>} />

          <Route path="/guards" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO]}><GuardsPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/tracker" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><AttendanceTracker /></ProtectedRoute>} />
          <Route path="/rotations" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><RotationPage /></ProtectedRoute>} />

          <Route path="/staff-attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><StaffAttendancePage /></ProtectedRoute>} />
          <Route path="/staff-attendance/summary" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><FinanceStaffSummaryPage /></ProtectedRoute>} />

          <Route path="/guard-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><GuardPayrollList /></ProtectedRoute>} />
          <Route path="/guard-payroll/review" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><FinanceReview /></ProtectedRoute>} />
          <Route path="/staff-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><StaffPayrollList /></ProtectedRoute>} />

          <Route path="/reports" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><ReportsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><SettingsPage /></ProtectedRoute>} />
          <Route path="/contracts/:employeeId" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><ContractForm /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><FinancePage /></ProtectedRoute>} />
          <Route path="/admin/payroll-config" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN]}><PayrollConfigPage /></ProtectedRoute>} />
          <Route path="/admin/salary-structures" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.CEO]}><SalaryStructurePage /></ProtectedRoute>} />

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

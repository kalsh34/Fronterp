import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { UserRole } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeeList from './features/employees/EmployeeList';
import EmployeeForm from './features/employees/EmployeeForm';
import { SiteList } from './features/sites/SiteList';
import { SiteForm } from './features/sites/SiteForm';
import AttendancePage from './features/attendance/AttendancePage';
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
import PayrollConfigPage from './features/admin/PayrollConfigPage';

const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Executive Dashboard' },
  '/employees': { title: 'HR & People', subtitle: 'Manage employees and guards' },
  '/employees/new': { title: 'HR & People', subtitle: 'Create new employee' },
  '/sites': { title: 'Sites', subtitle: 'Manage client sites' },
  '/sites/new': { title: 'Sites', subtitle: 'Create new site' },
  '/guards': { title: 'Guards Management', subtitle: 'View and manage guard profiles' },
  '/attendance': { title: 'Operations', subtitle: 'Guard attendance tracking' },
  '/attendance/tracker': { title: 'Attendance Tracker', subtitle: 'View attendance records' },
  '/staff-attendance': { title: 'Staff Attendance', subtitle: 'Manage office staff attendance' },
  '/staff-attendance/summary': { title: 'Attendance Summary', subtitle: 'Finance view of staff attendance' },
  '/guard-payroll': { title: 'Payroll', subtitle: 'Guard payroll management' },
  '/guard-payroll/review': { title: 'Finance Review', subtitle: 'Review and process guard payroll' },
  '/staff-payroll': { title: 'Payroll', subtitle: 'Staff payroll management' },
  '/reports': { title: 'Reporting & Analytics', subtitle: 'View reports and analytics' },
  '/settings': { title: 'Administration', subtitle: 'System settings and configuration' },
  '/contracts': { title: 'HR & People', subtitle: 'Employee contracts' },
  '/finance': { title: 'Finance & Operations', subtitle: 'Financial Control Tower' },
  '/admin/payroll-config': { title: 'Administration', subtitle: 'Payroll Formula Engine' },
};

function getHeaderInfo(pathname: string) {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith('/employees/')) return { title: 'HR & People', subtitle: 'Edit employee' };
  if (pathname.startsWith('/sites/')) return { title: 'Sites', subtitle: 'Edit site' };
  if (pathname.startsWith('/contracts/')) return { title: 'HR & People', subtitle: 'Manage employee contract' };
  return { title: 'Vital Security PLC' };
}

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

  const headerInfo = getHeaderInfo(location.pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={headerInfo.title} subtitle={headerInfo.subtitle} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeList /></ProtectedRoute>} />
            <Route path="/employees/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
            <Route path="/employees/:id/edit" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><SiteList /></ProtectedRoute>} />
            <Route path="/sites/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><SiteForm /></ProtectedRoute>} />
            <Route path="/sites/:id/edit" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><SiteForm /></ProtectedRoute>} />
            <Route path="/guards" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS]}><GuardsPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><AttendancePage /></ProtectedRoute>} />
            <Route path="/attendance/tracker" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS]}><AttendanceTracker /></ProtectedRoute>} />
            <Route path="/staff-attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><StaffAttendancePage /></ProtectedRoute>} />
            <Route path="/staff-attendance/summary" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER]}><FinanceStaffSummaryPage /></ProtectedRoute>} />
            <Route path="/guard-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD]}><GuardPayrollList /></ProtectedRoute>} />
            <Route path="/guard-payroll/review" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER]}><FinanceReview /></ProtectedRoute>} />
            <Route path="/staff-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD]}><StaffPayrollList /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD]}><ReportsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER]}><SettingsPage /></ProtectedRoute>} />
            <Route path="/contracts/:employeeId" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER]}><ContractForm /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER]}><FinancePage /></ProtectedRoute>} />
            <Route path="/admin/payroll-config" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN]}><PayrollConfigPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

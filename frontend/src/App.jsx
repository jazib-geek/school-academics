import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage.jsx'
import DashboardPage from './pages/Campus/dashboard/DashboardPage.jsx'
import StudentsPage from './pages/Campus/students/StudentsPage.jsx'
import CampusDashboardPage from './pages/Campus/dashboard/CampusDashboardPage.jsx'
import CampusDailyReportingPage from './pages/Campus/daily-reporting/CampusDailyReportingPage.jsx'
import CampusEmployeeAttendancePage from './pages/Campus/employee-attendance/CampusEmployeeAttendancePage.jsx'
import FeeReportsPage from './pages/Campus/fee/FeeReportsPage.jsx'
import IncomeReportPage from './pages/Campus/reports/IncomeReportPage.jsx'
import CampusDailyDiaryPage from './pages/Campus/daily-diary/CampusDailyDiaryPage.jsx'
import CampusDailyDiaryListPage from './pages/Campus/daily-diary/CampusDailyDiaryListPage.jsx'
import CampusStudentResultPage from './pages/Campus/exams/CampusStudentResultPage.jsx'
import CampusExamMarkSheetPage from './pages/Campus/exams/CampusExamMarkSheetPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AcademicProtectedRoute from './components/AcademicProtectedRoute.jsx'
import AcademicLoginPage from './pages/Auth/AcademicLoginPage.jsx'
import EmployeeLoginPage from './pages/Auth/EmployeeLoginPage.jsx'
import AcademicDashboardPage from './pages/Academics/dashboard/AcademicDashboardPage.jsx'
import AcademicClassesPage from './pages/Academics/curriculum/AcademicClassesPage.jsx'
import AcademicSubjectsPage from './pages/Academics/curriculum/AcademicSubjectsPage.jsx'
import AcademicQuestionCatalogPage from './pages/Academics/questions/AcademicQuestionCatalogPage.jsx'
import AcademicChaptersPage from './pages/Academics/curriculum/AcademicChaptersPage.jsx'
import AcademicExamMakerMinimalPage from './pages/Academics/exams/AcademicExamMakerMinimalPage.jsx'
import AcademicExamTitlesPage from './pages/Academics/exams/AcademicExamTitlesPage.jsx'
import AcademicInstituteSettingsPage from './pages/Academics/settings/AcademicInstituteSettingsPage.jsx'
import EmployeeProtectedRoute from './components/EmployeeProtectedRoute.jsx'
import EmployeeCoordinatorRoute from './components/EmployeeCoordinatorRoute.jsx'
import EmployeeDashboardPage from './pages/Employee/EmployeeDashboardPage.jsx'
import EmployeeAttendancePage from './pages/Employee/EmployeeAttendancePage.jsx'
import EmployeeAttendanceReportPage from './pages/Employee/EmployeeAttendanceReportPage.jsx'
import CoordinatorDailyReportPage from './pages/Employee/CoordinatorDailyReportPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employee/login" element={<EmployeeLoginPage />} />
      <Route path="/academics/login" element={<AcademicLoginPage />} />
      <Route
        path="/employee/dashboard"
        element={
          <EmployeeProtectedRoute>
            <EmployeeDashboardPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/attendance"
        element={
          <EmployeeProtectedRoute>
            <EmployeeAttendancePage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/attendance-report"
        element={
          <EmployeeProtectedRoute>
            <EmployeeAttendanceReportPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/coordinator-daily-report"
        element={
          <EmployeeCoordinatorRoute>
            <CoordinatorDailyReportPage />
          </EmployeeCoordinatorRoute>
        }
      />
      <Route
        path="/campus/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/students"
        element={
          <ProtectedRoute>
            <StudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/fee/reports"
        element={
          <ProtectedRoute>
            <FeeReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/reports/income"
        element={
          <ProtectedRoute>
            <IncomeReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/overview"
        element={
          <ProtectedRoute>
            <CampusDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/daily-reporting"
        element={
          <ProtectedRoute>
            <CampusDailyReportingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employee-attendance"
        element={
          <ProtectedRoute>
            <CampusEmployeeAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/daily-diary/list"
        element={
          <ProtectedRoute>
            <CampusDailyDiaryListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/daily-diary"
        element={
          <ProtectedRoute>
            <CampusDailyDiaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/exams/mark-sheet"
        element={
          <ProtectedRoute>
            <CampusExamMarkSheetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/exams/result"
        element={
          <ProtectedRoute>
            <CampusStudentResultPage />
          </ProtectedRoute>
        }
      />
      <Route path="/campus/fee-reports" element={<Navigate to="/campus/fee/reports" replace />} />
      <Route path="/campus/income-report" element={<Navigate to="/campus/reports/income" replace />} />
      <Route path="/campus/exam-mark-sheet" element={<Navigate to="/campus/exams/mark-sheet" replace />} />
      <Route path="/campus/exam-result" element={<Navigate to="/campus/exams/result" replace />} />
      <Route path="/campus/storage-test" element={<Navigate to="/campus/dashboard" replace />} />
      <Route path="/dashboard" element={<Navigate to="/campus/dashboard" replace />} />
      <Route path="/students" element={<Navigate to="/campus/students" replace />} />
      <Route path="/campus-dashboard" element={<Navigate to="/campus/overview" replace />} />
      <Route
        path="/academics/dashboard"
        element={
          <AcademicProtectedRoute>
            <AcademicDashboardPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/classes"
        element={
          <AcademicProtectedRoute>
            <AcademicClassesPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/subjects"
        element={
          <AcademicProtectedRoute>
            <AcademicSubjectsPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/chapters"
        element={
          <AcademicProtectedRoute>
            <AcademicChaptersPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/question-catalog"
        element={
          <AcademicProtectedRoute>
            <AcademicQuestionCatalogPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/exam-titles"
        element={
          <AcademicProtectedRoute>
            <AcademicExamTitlesPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/exam-maker-compact"
        element={
          <AcademicProtectedRoute>
            <AcademicExamMakerMinimalPage />
          </AcademicProtectedRoute>
        }
      />
      <Route
        path="/academics/settings/institute"
        element={
          <AcademicProtectedRoute>
            <AcademicInstituteSettingsPage />
          </AcademicProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

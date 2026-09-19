import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage.jsx'
import DashboardPage from './pages/Campus/dashboard/DashboardPage.jsx'
import StudentsPage from './pages/Campus/students/StudentsPage.jsx'
import CampusStudentAdmitPage from './pages/Campus/students/CampusStudentAdmitPage.jsx'
import CampusStudentBulkEditPage from './pages/Campus/students/CampusStudentBulkEditPage.jsx'
import CampusStudentTransferPage from './pages/Campus/students/CampusStudentTransferPage.jsx'
import CampusStudentUpdateFeePage from './pages/Campus/students/CampusStudentUpdateFeePage.jsx'
import CampusActivityLogsPage from './pages/Campus/activity-logs/CampusActivityLogsPage.jsx'
import VoidReceiptsPage from './pages/Campus/activity-logs/VoidReceiptsPage.jsx'
import CampusDashboardPage from './pages/Campus/dashboard/CampusDashboardPage.jsx'
import CampusDailyReportingPage from './pages/Campus/daily-reporting/CampusDailyReportingPage.jsx'
import CampusEmployeeAttendancePage from './pages/Campus/employee-attendance/CampusEmployeeAttendancePage.jsx'
import CampusLiveAttendancePage from './pages/Campus/employee-attendance/CampusLiveAttendancePage.jsx'
import CampusManageAttendancePage from './pages/Campus/employee-attendance/CampusManageAttendancePage.jsx'
import CampusImportAttendancePage from './pages/Campus/employee-attendance/CampusImportAttendancePage.jsx'
import CampusDesignationsPage from './pages/Campus/designations/CampusDesignationsPage.jsx'
import EmployeeLoansPage from './pages/Campus/employees/EmployeeLoansPage.jsx'
import EmployeeSalaryCalculatorPage from './pages/Campus/employees/EmployeeSalaryCalculatorPage.jsx'
import CampusAllowancesSettingsPage from './pages/Campus/settings/CampusAllowancesSettingsPage.jsx'
import CampusProfileSettingsPage from './pages/Campus/settings/CampusProfileSettingsPage.jsx'
import CampusUsersPage from './pages/Campus/users/CampusUsersPage.jsx'
import CampusLocalitiesPage from './pages/Campus/localities/CampusLocalitiesPage.jsx'
import CampusStationeryItemsPage from './pages/Campus/stationery/CampusStationeryItemsPage.jsx'
import CampusStationeryPurchasesPage from './pages/Campus/stationery/CampusStationeryPurchasesPage.jsx'
import CampusStationeryHandoversPage from './pages/Campus/stationery/CampusStationeryHandoversPage.jsx'
import CampusStationeryReportsPage from './pages/Campus/stationery/CampusStationeryReportsPage.jsx'
import CampusStationeryItemReportPage from './pages/Campus/stationery/CampusStationeryItemReportPage.jsx'
import TeacherAssignmentsPage from './pages/Campus/teacher-assignments/TeacherAssignmentsPage.jsx'
import CampusTimetablesPage from './pages/Campus/timetables/CampusTimetablesPage.jsx'
import CampusTimetableEditorPage from './pages/Campus/timetables/CampusTimetableEditorPage.jsx'
import CampusDateSheetsPage from './pages/Campus/datesheets/CampusDateSheetsPage.jsx'
import CampusDateSheetEditorPage from './pages/Campus/datesheets/CampusDateSheetEditorPage.jsx'
import FeeReportsPage from './pages/Campus/fee/FeeReportsPage.jsx'
import BalanceSheetPage from './pages/Campus/fee/BalanceSheetPage.jsx'
import GenerateFeePage from './pages/Campus/fee/GenerateFeePage.jsx'
import FeeTransactionHistoryPage from './pages/Campus/fee/FeeTransactionHistoryPage.jsx'
import VoidFeeReceiptPage from './pages/Campus/fee/VoidFeeReceiptPage.jsx'
import GenerateFundPage from './pages/Campus/fee/GenerateFundPage.jsx'
import IncomeReportPage from './pages/Campus/reports/IncomeReportPage.jsx'
import CampusStudentReportsPage from './pages/Campus/reports/CampusStudentReportsPage.jsx'
import CampusExamReportsPage from './pages/Campus/reports/CampusExamReportsPage.jsx'
import CampusAttendanceReportsPage from './pages/Campus/reports/CampusAttendanceReportsPage.jsx'
import CampusMarkAttendancePage from './pages/Campus/attendance/CampusMarkAttendancePage.jsx'
import CampusAbsentFollowupPage from './pages/Campus/attendance/CampusAbsentFollowupPage.jsx'
import CampusStudentConductPage from './pages/Campus/conduct/CampusStudentConductPage.jsx'
import CampusAnnouncementsPage from './pages/Campus/family-portal/CampusAnnouncementsPage.jsx'
import CampusFamilyAccountsPage from './pages/Campus/family-portal/CampusFamilyAccountsPage.jsx'
import CampusClassesPage from './pages/Campus/settings/CampusClassesPage.jsx'
import CampusSectionsPage from './pages/Campus/settings/CampusSectionsPage.jsx'
import CampusSectionColorsPage from './pages/Campus/settings/CampusSectionColorsPage.jsx'
import CampusOccupationsPage from './pages/Campus/settings/CampusOccupationsPage.jsx'
import CampusDegreesPage from './pages/Campus/settings/CampusDegreesPage.jsx'
import CampusDailyDiaryPage from './pages/Campus/daily-diary/CampusDailyDiaryPage.jsx'
import CampusDailyDiaryListPage from './pages/Campus/daily-diary/CampusDailyDiaryListPage.jsx'
import CampusStudentResultPage from './pages/Campus/exams/CampusStudentResultPage.jsx'
import CampusExamMarkSheetPage from './pages/Campus/exams/CampusExamMarkSheetPage.jsx'
import CampusExamEntryPage from './pages/Campus/exams/CampusExamEntryPage.jsx'
import CampusSubjectComponentEntryPage from './pages/Campus/exams/CampusSubjectComponentEntryPage.jsx'
import CampusTeacherExamAnalysisPage from './pages/Campus/exams/CampusTeacherExamAnalysisPage.jsx'
import CampusTeacherPerformanceGridPage from './pages/Campus/exams/CampusTeacherPerformanceGridPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import CampusCatchAllRedirect from './components/CampusCatchAllRedirect.jsx'
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
import AcademicUsersPage from './pages/Academics/settings/AcademicUsersPage.jsx'
import EmployeeProtectedRoute from './components/EmployeeProtectedRoute.jsx'
import EmployeeCoordinatorRoute from './components/EmployeeCoordinatorRoute.jsx'
import EmployeeAppAccessRoute from './components/EmployeeAppAccessRoute.jsx'
import EmployeeExamsPage from './pages/Employee/EmployeeExamsPage.jsx'
import EmployeeDashboardPage from './pages/Employee/EmployeeDashboardPage.jsx'
import EmployeeAttendancePage from './pages/Employee/EmployeeAttendancePage.jsx'
import EmployeeAttendanceReportPage from './pages/Employee/EmployeeAttendanceReportPage.jsx'
import EmployeeStudentAttendancePage from './pages/Employee/EmployeeStudentAttendancePage.jsx'
import EmployeeConductPage from './pages/Employee/EmployeeConductPage.jsx'
import EmployeeStudentConductPage from './pages/Employee/EmployeeStudentConductPage.jsx'
import EmployeeConductReportPage from './pages/Employee/EmployeeConductReportPage.jsx'
import EmployeeMyAttendancePage from './pages/Employee/EmployeeMyAttendancePage.jsx'
import EmployeeMySalaryAdjustmentsPage from './pages/Employee/EmployeeMySalaryAdjustmentsPage.jsx'
import EmployeeMyAssignmentsPage from './pages/Employee/EmployeeMyAssignmentsPage.jsx'
import EmployeeMyTimetablePage from './pages/Employee/EmployeeMyTimetablePage.jsx'
import EmployeeBrowseDateSheetsPage from './pages/Employee/EmployeeBrowseDateSheetsPage.jsx'
import EmployeeBrowseDateSheetDetailPage from './pages/Employee/EmployeeBrowseDateSheetDetailPage.jsx'
import CoordinatorDailyReportPage from './pages/Employee/CoordinatorDailyReportPage.jsx'
import EmployeeSubjectAllocationPage from './pages/Employee/academics/EmployeeSubjectAllocationPage.jsx'
import EmployeeDiaryPage from './pages/Employee/academics/EmployeeDiaryPage.jsx'
import EmployeeDiaryUploadPage from './pages/Employee/academics/EmployeeDiaryUploadPage.jsx'
import EmployeeTeacherAnalysisPage from './pages/Employee/academics/EmployeeTeacherAnalysisPage.jsx'
import EmployeeTeacherPerformancePage from './pages/Employee/academics/EmployeeTeacherPerformancePage.jsx'
import EmployeeTimetablesPage from './pages/Employee/academics/EmployeeTimetablesPage.jsx'
import EmployeeTimetableEditorPage from './pages/Employee/academics/EmployeeTimetableEditorPage.jsx'
import EmployeeDateSheetsPage from './pages/Employee/academics/EmployeeDateSheetsPage.jsx'
import EmployeeDateSheetEditorPage from './pages/Employee/academics/EmployeeDateSheetEditorPage.jsx'
import EmployeesPage from './pages/Campus/employees/EmployeesPage.jsx'
import CampusCashPaymentVoucherPage from './pages/Campus/accounts/CampusCashPaymentVoucherPage.jsx'
import CampusCashReceiptVoucherPage from './pages/Campus/accounts/CampusCashReceiptVoucherPage.jsx'
import CampusAccountLedgerPage from './pages/Campus/accounts/CampusAccountLedgerPage.jsx'
import CampusAccountSummaryPage from './pages/Campus/accounts/CampusAccountSummaryPage.jsx'
import CampusCashBookPage from './pages/Campus/accounts/CampusCashBookPage.jsx'
import CampusDayClosingPage from './pages/Campus/accounts/CampusDayClosingPage.jsx'
import CampusAccountSettingsPage from './pages/Campus/accounts/CampusAccountSettingsPage.jsx'

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
        path="/employee/my-attendance"
        element={
          <EmployeeProtectedRoute>
            <EmployeeMyAttendancePage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/my-salary-adjustments"
        element={
          <EmployeeProtectedRoute>
            <EmployeeMySalaryAdjustmentsPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/my-assignments"
        element={
          <EmployeeProtectedRoute>
            <EmployeeMyAssignmentsPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/my-timetable"
        element={
          <EmployeeProtectedRoute>
            <EmployeeMyTimetablePage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/datesheets"
        element={
          <EmployeeProtectedRoute>
            <EmployeeBrowseDateSheetsPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/datesheets/:id"
        element={
          <EmployeeProtectedRoute>
            <EmployeeBrowseDateSheetDetailPage />
          </EmployeeProtectedRoute>
        }
      />
      <Route
        path="/employee/attendance"
        element={
          <EmployeeAppAccessRoute anyOf={['canMarkStudentAttendance']}>
            <EmployeeAttendancePage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/attendance-report"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewStudentAttendance']}>
            <EmployeeAttendanceReportPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/attendance-student"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewStudentAttendance']}>
            <EmployeeStudentAttendancePage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/conduct"
        element={
          <EmployeeAppAccessRoute anyOf={['canRecordStudentConduct']}>
            <EmployeeConductPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/conduct-student"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewStudentConduct']}>
            <EmployeeStudentConductPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/conduct-report"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewStudentConduct']}>
            <EmployeeConductReportPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/exams"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewStudentExamDetail']}>
            <EmployeeExamsPage />
          </EmployeeAppAccessRoute>
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
        path="/employee/academics/subject-allocation"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewSubjectAllocation', 'canEditSubjectAllocation']}>
            <EmployeeSubjectAllocationPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/diary"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewDiary', 'canEditDiary']}>
            <EmployeeDiaryPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/diary/upload"
        element={
          <EmployeeAppAccessRoute anyOf={['canEditDiary']}>
            <EmployeeDiaryUploadPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/teacher-analysis"
        element={
          <EmployeeAppAccessRoute coordinatorOnly>
            <EmployeeTeacherAnalysisPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/teacher-performance"
        element={
          <EmployeeAppAccessRoute coordinatorOnly>
            <EmployeeTeacherPerformancePage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/timetables"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewTimetable', 'canEditTimetable']}>
            <EmployeeTimetablesPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/timetables/:id"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewTimetable', 'canEditTimetable']}>
            <EmployeeTimetableEditorPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/datesheets"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewDatesheet', 'canEditDatesheet']}>
            <EmployeeDateSheetsPage />
          </EmployeeAppAccessRoute>
        }
      />
      <Route
        path="/employee/academics/datesheets/:id"
        element={
          <EmployeeAppAccessRoute anyOf={['canViewDatesheet', 'canEditDatesheet']}>
            <EmployeeDateSheetEditorPage />
          </EmployeeAppAccessRoute>
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
        path="/campus/students/admit"
        element={
          <ProtectedRoute>
            <CampusStudentAdmitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/students/admit/:regId"
        element={
          <ProtectedRoute>
            <CampusStudentAdmitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/students/bulk-edit"
        element={
          <ProtectedRoute>
            <CampusStudentBulkEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/students/transfer"
        element={
          <ProtectedRoute>
            <CampusStudentTransferPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/students/update-fee"
        element={
          <ProtectedRoute>
            <CampusStudentUpdateFeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/activity-logs/void-receipts"
        element={
          <ProtectedRoute>
            <VoidReceiptsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/activity-logs"
        element={
          <ProtectedRoute>
            <CampusActivityLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
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
        path="/campus/fee/balance-sheet"
        element={
          <ProtectedRoute>
            <BalanceSheetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/fee/generate"
        element={
          <ProtectedRoute>
            <GenerateFeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/fee/transactions"
        element={
          <ProtectedRoute>
            <FeeTransactionHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/fee/void-receipt"
        element={
          <ProtectedRoute>
            <VoidFeeReceiptPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/fee/generate-fund"
        element={
          <ProtectedRoute>
            <GenerateFundPage />
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
        path="/campus/reports/students"
        element={
          <ProtectedRoute>
            <CampusStudentReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/reports/exams"
        element={
          <ProtectedRoute>
            <CampusExamReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/reports/attendance"
        element={
          <ProtectedRoute>
            <CampusAttendanceReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/attendance/mark"
        element={
          <ProtectedRoute>
            <CampusMarkAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/attendance/absent-followup"
        element={
          <ProtectedRoute>
            <CampusAbsentFollowupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/student-conduct"
        element={
          <ProtectedRoute>
            <CampusStudentConductPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/family-portal/announcements"
        element={
          <ProtectedRoute>
            <CampusAnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/family-portal/accounts"
        element={
          <ProtectedRoute>
            <CampusFamilyAccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/classes"
        element={
          <ProtectedRoute>
            <CampusClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/sections"
        element={
          <ProtectedRoute>
            <CampusSectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/section-colors"
        element={
          <ProtectedRoute>
            <CampusSectionColorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/occupations"
        element={
          <ProtectedRoute>
            <CampusOccupationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/degrees"
        element={
          <ProtectedRoute>
            <CampusDegreesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/allowances"
        element={
          <ProtectedRoute>
            <CampusAllowancesSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/settings/profile"
        element={
          <ProtectedRoute>
            <CampusProfileSettingsPage />
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
        path="/campus/live-attendance"
        element={
          <ProtectedRoute>
            <CampusLiveAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employee-attendance/manage"
        element={
          <ProtectedRoute>
            <CampusManageAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employee-attendance/import"
        element={
          <ProtectedRoute>
            <CampusImportAttendancePage />
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
        path="/campus/designations"
        element={
          <ProtectedRoute>
            <CampusDesignationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employee-loans"
        element={
          <ProtectedRoute>
            <EmployeeLoansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/employee-salary"
        element={
          <ProtectedRoute>
            <EmployeeSalaryCalculatorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/users"
        element={
          <ProtectedRoute>
            <CampusUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/localities"
        element={
          <ProtectedRoute>
            <CampusLocalitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/items"
        element={
          <ProtectedRoute>
            <CampusStationeryItemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/purchases"
        element={
          <ProtectedRoute>
            <CampusStationeryPurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/handovers"
        element={
          <ProtectedRoute>
            <CampusStationeryHandoversPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/reports"
        element={
          <ProtectedRoute>
            <CampusStationeryReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/item-report"
        element={
          <ProtectedRoute>
            <CampusStationeryItemReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/stationery/history"
        element={
          <ProtectedRoute>
            <CampusStationeryItemReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/cash-payment"
        element={
          <ProtectedRoute>
            <CampusCashPaymentVoucherPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/cash-receipt"
        element={
          <ProtectedRoute>
            <CampusCashReceiptVoucherPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/ledger"
        element={
          <ProtectedRoute>
            <CampusAccountLedgerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/summary"
        element={
          <ProtectedRoute>
            <CampusAccountSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/cash-book"
        element={
          <ProtectedRoute>
            <CampusCashBookPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/day-closing"
        element={
          <ProtectedRoute>
            <CampusDayClosingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/accounts/settings"
        element={
          <ProtectedRoute>
            <CampusAccountSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/teacher-assignments"
        element={
          <ProtectedRoute>
            <TeacherAssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/timetables"
        element={
          <ProtectedRoute>
            <CampusTimetablesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/timetables/:id"
        element={
          <ProtectedRoute>
            <CampusTimetableEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/datesheets"
        element={
          <ProtectedRoute>
            <CampusDateSheetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/datesheets/:id"
        element={
          <ProtectedRoute>
            <CampusDateSheetEditorPage />
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
        path="/campus/exams/entry"
        element={
          <ProtectedRoute>
            <CampusExamEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/exams/detailed-entry"
        element={
          <ProtectedRoute>
            <CampusSubjectComponentEntryPage />
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
      <Route
        path="/campus/exams/teacher-analysis"
        element={
          <ProtectedRoute>
            <CampusTeacherExamAnalysisPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/exams/teacher-performance"
        element={
          <ProtectedRoute>
            <CampusTeacherPerformanceGridPage />
          </ProtectedRoute>
        }
      />
      <Route path="/campus/fee-reports" element={<Navigate to="/campus/fee/reports" replace />} />
      <Route path="/campus/income-report" element={<Navigate to="/campus/reports/income" replace />} />
      <Route path="/campus/exam-mark-sheet" element={<Navigate to="/campus/exams/mark-sheet" replace />} />
      <Route path="/campus/exam-entry" element={<Navigate to="/campus/exams/entry" replace />} />
      <Route path="/campus/exam-detailed-entry" element={<Navigate to="/campus/exams/detailed-entry" replace />} />
      <Route path="/campus/exam-result" element={<Navigate to="/campus/exams/result" replace />} />
      <Route path="/campus/exam-teacher-analysis" element={<Navigate to="/campus/exams/teacher-analysis" replace />} />
      <Route path="/campus/exam-teacher-performance" element={<Navigate to="/campus/exams/teacher-performance" replace />} />
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
      <Route
        path="/academics/settings/users"
        element={
          <AcademicProtectedRoute>
            <AcademicUsersPage />
          </AcademicProtectedRoute>
        }
      />
      <Route path="*" element={<CampusCatchAllRedirect />} />
    </Routes>
  )
}

export default App

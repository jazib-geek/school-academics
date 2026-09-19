import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  HandCoins,
  History,
  Home,
  KeyRound,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  School,
  Settings,
  Smartphone,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { changeCampusPassword, hasAnyCampusPermission, hasCampusPermission, hasCampusPermissionStrict, isCampusSuperAdmin, logout, switchCampusSession } from '../../services/authService'
import { CAMPUS_OPTIONS, getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../constants/branding'
import {
  BIOMETRIC_ATTENDANCE_TYPES,
  CAMPUS_PROFILE_CHANGED_EVENT,
  getStoredCampusProfile,
  normalizeBiometricAttendanceType,
} from '../../utils/campusProfile'
import softelligentLogo from '../../assets/softelligent-transparent.png'
import { useCampusNotifications } from '../../hooks/useCampusNotifications.jsx'
import CampusNotificationsDrawer from './CampusNotificationsDrawer.jsx'

const FORBIDDEN_ACCESS_MESSAGE = "You don't have access to this."

const QUICK_LINKS = [
  {
    label: 'Student List',
    to: '/campus/students',
    permission: 'list_std',
    icon: Users,
    iconClass: 'text-emerald-500',
    tileClass: 'bg-emerald-50 hover:bg-emerald-100',
  },
  {
    label: 'Add Student',
    to: '/campus/students/admit',
    permission: 'add_std',
    icon: UserPlus,
    iconClass: 'text-sky-500',
    tileClass: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    label: 'Student Reports',
    to: '/campus/reports/students',
    permission: 'rpt_std',
    icon: FileBarChart,
    iconClass: 'text-violet-500',
    tileClass: 'bg-violet-50 hover:bg-violet-100',
  },
  {
    label: 'Fee Reports',
    to: '/campus/fee/reports',
    permission: 'rpt_fee',
    icon: HandCoins,
    iconClass: 'text-amber-500',
    tileClass: 'bg-amber-50 hover:bg-amber-100',
  },
  {
    label: 'Student Attendance',
    to: '/campus/attendance/mark',
    permission: 'mark_attnd',
    icon: ClipboardCheck,
    iconClass: 'text-fuchsia-500',
    tileClass: 'bg-fuchsia-50 hover:bg-fuchsia-100',
  },
  {
    label: 'Cash Payment Voucher',
    to: '/campus/accounts/cash-payment',
    permission: 'issue_voucher',
    icon: Receipt,
    iconClass: 'text-orange-500',
    tileClass: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    label: 'Cash Book',
    to: '/campus/accounts/cash-book',
    permission: 'cash_book',
    icon: BookMarked,
    iconClass: 'text-cyan-500',
    tileClass: 'bg-cyan-50 hover:bg-cyan-100',
  },
  {
    label: 'Day Closing',
    to: '/campus/accounts/day-closing',
    permission: 'day_closing',
    icon: CalendarCheck2,
    iconClass: 'text-rose-500',
    tileClass: 'bg-rose-50 hover:bg-rose-100',
  },
]

const passwordInputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

function navItemAllowed(item) {
  if (item.anyOf?.length) return hasAnyCampusPermission(...item.anyOf)
  if (item.permission) return hasCampusPermission(item.permission)
  return true
}

/** Single source of truth for campus (per-campus DB) shell navigation. */
export const CAMPUS_SHELL_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, iconClass: 'text-sky-300', to: '/campus/dashboard', permission: 'stats_home' },
  {
    id: 'daily',
    label: 'Coordinator Reporting',
    icon: ClipboardList,
    iconClass: 'text-fuchsia-300',
    to: '/campus/daily-reporting',
    permission: 'view_coordinator_reporting',
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    iconClass: 'text-emerald-300',
    children: [
      { label: 'All Students', to: '/campus/students', permission: 'list_std' },
      { label: 'Add Student', to: '/campus/students/admit', permission: 'add_std' },
      { label: 'Bulk Edit', to: '/campus/students/bulk-edit', permission: 'edit_std' },
      { label: 'Transfer Student', to: '/campus/students/transfer', permission: 'trasnfer_std' },
      { label: 'Student Reports', to: '/campus/reports/students', permission: 'rpt_std' },
    ],
  },
  {
    id: 'fee',
    label: 'Fee',
    icon: HandCoins,
    iconClass: 'text-amber-300',
    children: [
      {
        label: 'Generate Fee',
        to: '/campus/fee/generate',
        anyOf: ['generate_fee_all', 'generate_fee_single'],
      },
      {
        label: 'Generate Fund',
        to: '/campus/fee/generate-fund',
        anyOf: ['generate_fund_all', 'generate_fund_single'],
      },
      { label: 'Update Fee', to: '/campus/students/update-fee', permission: 'update_fee' },
      { label: 'Transaction History', to: '/campus/fee/transactions', permission: 'submit_fee' },
      { label: 'Void Receipt', to: '/campus/fee/void-receipt', permission: 'void_rcpt' },
      { label: 'Fee Reports', to: '/campus/fee/reports', permission: 'rpt_fee' },
      { label: 'Balance Sheet', to: '/campus/fee/balance-sheet', permission: 'rpt_fee_balance_sheet' },
    ],
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: FileBarChart,
    iconClass: 'text-rose-300',
    children: [
      { label: 'Exam Entry', to: '/campus/exams/entry', permission: 'create_exam' },
      { label: 'Detailed Subject Entry', to: '/campus/exams/detailed-entry', permission: 'view_detailed_marks' },
      {
        label: 'Exam Reports',
        to: '/campus/reports/exams',
        anyOf: [
          'rpt_exam',
          'rpt_exam_resultcard_single',
          'rpt_exam_resultcard_multiple',
          'rpt_exam_resultcard_fancy_single',
          'rpt_exam_resultcard_fancy_multiple',
          'rpt_exam_awardlist_2c',
          'rpt_exam_awardlist_12c',
          'rpt_exam_top_pos',
        ],
      },
      {
        label: 'Exam Result',
        to: '/campus/exams/result',
        anyOf: [
          'rpt_exam_resultcard_single',
          'rpt_exam_resultcard_multiple',
          'rpt_exam_resultcard_fancy_single',
          'rpt_exam_resultcard_fancy_multiple',
          'rpt_exam',
        ],
      },
      { label: 'Exam Mark Sheet', to: '/campus/exams/mark-sheet', permission: 'rpt_exam' },
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    icon: BookOpen,
    iconClass: 'text-violet-300',
    children: [
      { label: 'Subject Allocation', to: '/campus/teacher-assignments', permission: 'subject_allocation' },
      { label: 'Timetables', to: '/campus/timetables', permission: 'view_timetable' },
      { label: 'Datesheets', to: '/campus/datesheets', permission: 'view_datesheet' },
      { label: 'Diary Management', to: '/campus/daily-diary/list', permission: 'view_daily_diary' },
      { label: 'Teacher Analysis', to: '/campus/exams/teacher-analysis', permission: 'view_teacher_analysis' },
      { label: 'Teacher Performance', to: '/campus/exams/teacher-performance', permission: 'view_teacher_performance' },
    ],
  },
  {
    id: 'student-attendance',
    label: 'Student Attendance',
    icon: ClipboardCheck,
    iconClass: 'text-fuchsia-300',
    children: [
      { label: 'Mark Attendance', to: '/campus/attendance/mark', permission: 'mark_attnd' },
      { label: 'Absent Followup', to: '/campus/attendance/absent-followup', permission: 'mark_attnd' },
      { label: 'Attendance Reports', to: '/campus/reports/attendance', permission: 'rpt_attnd' },
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: UsersRound,
    iconClass: 'text-cyan-300',
    children: [
      { label: 'All Employees', to: '/campus/employees', permission: 'view_employees' },
      { label: 'Designations', to: '/campus/designations', permission: 'manage_designations' },
      { label: 'Salary Adjustments', to: '/campus/employee-loans', permission: 'manage_employee_loans' },
      { label: 'Calculate Salary', to: '/campus/employee-salary', permission: 'calculate_employee_salary' },
      { label: 'Live Attendance', to: '/campus/live-attendance', permission: 'view_live_emp_attendance', attendanceType: BIOMETRIC_ATTENDANCE_TYPES.Kiosk },
      {
        label: 'Manage Attendance',
        to: '/campus/employee-attendance/manage',
        anyOf: ['edit_emp_attendance', 'view_live_emp_attendance', 'view_emp_monthly_attendance'],
      },
      { label: 'Import Attendance', to: '/campus/employee-attendance/import', permission: 'edit_emp_attendance', attendanceType: BIOMETRIC_ATTENDANCE_TYPES.ZkTeco },
      { label: 'Monthly Attendance', to: '/campus/employee-attendance', permission: 'view_emp_monthly_attendance' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: BookMarked,
    iconClass: 'text-orange-300',
    children: [
      { label: 'Cash Payment Voucher', to: '/campus/accounts/cash-payment', permission: 'issue_voucher' },
      { label: 'Cash Receipt Voucher', to: '/campus/accounts/cash-receipt', permission: 'issue_voucher' },
      { label: 'Ledger Statement', to: '/campus/accounts/ledger', permission: 'view_ledger' },
      { label: 'Accounts Summary', to: '/campus/accounts/summary', permission: 'view_account_summary' },
      { label: 'Cash Book', to: '/campus/accounts/cash-book', permission: 'cash_book' },
      { label: 'Day Closing', to: '/campus/accounts/day-closing', permission: 'day_closing' },
      { label: 'Profit Loss Statement', to: '/campus/reports/income', permission: 'view_profit_loss' },
      { label: 'Settings', to: '/campus/accounts/settings', permission: 'acct_settings' },
    ],
  },
  {
    id: 'family-portal',
    label: 'Family Portal',
    icon: Smartphone,
    iconClass: 'text-sky-300',
    children: [
      { label: 'Announcements', to: '/campus/family-portal/announcements', permission: 'manage_family_announcements' },
      { label: 'Family Accounts', to: '/campus/family-portal/accounts', permission: 'manage_family_accounts' },
      { label: 'Student Conduct', to: '/campus/student-conduct', permission: 'view_student_conduct' },
    ],
  },
  {
    id: 'stationery',
    label: 'Store',
    icon: Warehouse,
    iconClass: 'text-teal-300',
    children: [
      { label: 'Items', to: '/campus/stationery/items', permission: 'manage_stationery' },
      { label: 'Purchases', to: '/campus/stationery/purchases', permission: 'manage_stationery' },
      { label: 'Handovers', to: '/campus/stationery/handovers', permission: 'manage_stationery' },
      { label: 'Expense Report', to: '/campus/stationery/reports', permission: 'manage_stationery' },
      { label: 'Item History', to: '/campus/stationery/history', permission: 'manage_stationery' },
    ],
  },
  {
    id: 'settings',
    label: 'General Settings',
    icon: Settings,
    iconClass: 'text-indigo-300',
    children: [
      { label: 'Classes', to: '/campus/settings/classes', permission: 'param_class' },
      { label: 'Sections', to: '/campus/settings/sections', permission: 'param_class' },
      { label: 'Section Colors', to: '/campus/settings/section-colors', permission: 'param_section_color' },
      { label: 'Localities', to: '/campus/localities', permission: 'param_loc' },
      { label: 'Occupations', to: '/campus/settings/occupations', permission: 'param_occ' },
      { label: 'Degrees', to: '/campus/settings/degrees', permission: 'param_degree' },
      { label: 'Allowances', to: '/campus/settings/allowances', permission: 'manage_payroll_allowances' },
    ],
  },
  { id: 'users', label: 'User Management', icon: UserCog, iconClass: 'text-blue-300', to: '/campus/users', anyOf: ['user_list', 'user_mgmt'] },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    icon: History,
    iconClass: 'text-amber-300',
    children: [
      { label: 'Activity Logs', to: '/campus/activity-logs', permission: 'view_activity_logs' },
      { label: 'Void Receipts', to: '/campus/activity-logs/void-receipts', permission: 'void_rcpt' },
    ],
  },
]

function collectNavChildren(items) {
  return items.flatMap((item) => item.children || [])
}

/** Longest matching nav child for the current path (avoids `/campus/students` owning nested Fee routes). */
function findBestMatchingNavChild(pathname, items) {
  const matches = collectNavChildren(items)
    .filter((child) => child.to && (pathname === child.to || pathname.startsWith(`${child.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)
  return matches[0] || null
}

function isParentRowActive(item, pathname, bestChild) {
  if (bestChild && item.children?.some((child) => child.to === bestChild.to)) return true
  if (!item.children?.length && item.to) {
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }
  return false
}

function isChildRowActive(child, bestChild) {
  return Boolean(bestChild && child.to === bestChild.to)
}

function buildInitialOpenMenus(items) {
  return Object.fromEntries(items.filter((item) => item.children?.length).map((item) => [item.label, false]))
}

function buildDerivedOpenMenus(items, pathname) {
  const bestChild = findBestMatchingNavChild(pathname, items)
  return Object.fromEntries(
    items
      .filter((item) => item.children?.length)
      .map((item) => [
        item.label,
        Boolean(bestChild && item.children.some((child) => child.to === bestChild.to)),
      ]),
  )
}

/**
 * Shared campus login layout: sidebar, top bar, user menu.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children — main column content below the fixed header (include your own top padding, e.g. pt-[4.25rem]).
 * @param {string} [props.headerContext] — optional segment between school name and campus (e.g. "Daily reporting").
 * @param {boolean} [props.hideLoggedCampusInHeader] — omit the logged-in campus suffix when headerContext already describes the selected scope.
 * @param {boolean} [props.campusOverviewActive] — highlight the top-bar "Director Dashboard" control (multi-campus overview route).
 * @param {boolean} [props.hideSidebar] — render the shell header without the left navigation.
 * @param {string} [props.rootClassName] — extra classes on the outer min-h-screen wrapper.
 * @param {string} [props.rowClassName] — classes on the flex row (e.g. Fee Reports print wrapper).
 * @param {string} [props.asideClassName] — extra classes on aside (e.g. no-print).
 * @param {string} [props.headerClassName] — extra classes on the fixed top header.
 */
export default function CampusShell({
  children,
  headerContext,
  hideLoggedCampusInHeader = false,
  campusOverviewActive = false,
  hideSidebar = false,
  rootClassName = '',
  rowClassName = '',
  asideClassName = '',
  headerClassName = '',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const {
    notifications,
    unreadCount,
    markAllRead,
  } = useCampusNotifications()

  const campus = localStorage.getItem('campus') || 'N/A'
  const normalizedCampus = getCampusLabel(campus)
  const username = localStorage.getItem('username') || 'Admin'
  const isSuperAdmin = isCampusSuperAdmin()
  const campusSwitchOptions = import.meta.env.PROD
    ? CAMPUS_OPTIONS.filter((item) => item.value !== 'local')
    : CAMPUS_OPTIONS

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false)
  const [isCampusMenuOpen, setIsCampusMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSwitchingCampus, setIsSwitchingCampus] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [attendanceType, setAttendanceType] = useState(() =>
    normalizeBiometricAttendanceType(getStoredCampusProfile()?.biometricAttendanceType),
  )
  const quickLinksRef = useRef(null)
  const campusMenuRef = useRef(null)
  const visibleNav = useMemo(
    () =>
      CAMPUS_SHELL_NAV.map((item) => {
        if (!item.children?.length) return item
        return {
          ...item,
          children: item.children.filter(
            (child) => !child.attendanceType || child.attendanceType === attendanceType,
          ),
        }
      }),
    [attendanceType],
  )
  const [openMenus, setOpenMenus] = useState(() => buildInitialOpenMenus(CAMPUS_SHELL_NAV))

  const derivedOpen = useMemo(() => buildDerivedOpenMenus(visibleNav, pathname), [pathname, visibleNav])
  const bestNavChild = useMemo(
    () => findBestMatchingNavChild(pathname, visibleNav),
    [pathname, visibleNav],
  )
  const canViewDirectorDashboard =
    isSuperAdmin && hasCampusPermissionStrict('view_all_campus_dashboard')

  useEffect(() => {
    setOpenMenus(derivedOpen)
  }, [derivedOpen])

  useEffect(() => {
    const syncAttendanceType = () => {
      setAttendanceType(
        normalizeBiometricAttendanceType(getStoredCampusProfile()?.biometricAttendanceType),
      )
    }
    window.addEventListener(CAMPUS_PROFILE_CHANGED_EVENT, syncAttendanceType)
    window.addEventListener('storage', syncAttendanceType)
    return () => {
      window.removeEventListener(CAMPUS_PROFILE_CHANGED_EVENT, syncAttendanceType)
      window.removeEventListener('storage', syncAttendanceType)
    }
  }, [])

  useEffect(() => {
    setIsQuickLinksOpen(false)
    setIsUserMenuOpen(false)
    setIsCampusMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isQuickLinksOpen) return undefined
    const onPointerDown = (event) => {
      if (!quickLinksRef.current?.contains(event.target)) {
        setIsQuickLinksOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isQuickLinksOpen])

  useEffect(() => {
    if (!isCampusMenuOpen) return undefined
    const onPointerDown = (event) => {
      if (!campusMenuRef.current?.contains(event.target)) {
        setIsCampusMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isCampusMenuOpen])

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const onSwitchCampus = async (nextCampus) => {
    if (!isSuperAdmin || isSwitchingCampus) return
    if (!nextCampus || nextCampus === campus) {
      setIsCampusMenuOpen(false)
      return
    }

    setIsSwitchingCampus(true)
    setIsCampusMenuOpen(false)
    try {
      await switchCampusSession(nextCampus)
      toast.success(`Switched to ${getCampusLabel(nextCampus)}.`)
      navigate('/campus/dashboard', { replace: true })
      window.location.reload()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not switch campus.')
      setIsSwitchingCampus(false)
    }
  }

  const openChangePassword = () => {
    setIsUserMenuOpen(false)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setIsChangePasswordOpen(true)
  }

  const closeChangePassword = () => {
    if (isChangingPassword) return
    setIsChangePasswordOpen(false)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const setPasswordValue = (name, value) => {
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  const submitChangePassword = async (event) => {
    event.preventDefault()
    const currentPassword = passwordForm.currentPassword.trim()
    const newPassword = passwordForm.newPassword.trim()
    const confirmPassword = passwordForm.confirmPassword.trim()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.')
      return
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from the current password.')
      return
    }

    setIsChangingPassword(true)
    const toastId = 'campus-change-password'
    toast.loading('Updating password...', { id: toastId })
    try {
      await changeCampusPassword({ currentPassword, newPassword, confirmPassword })
      toast.success('Password updated. Please sign in again.', { id: toastId })
      setIsChangePasswordOpen(false)
      logout()
      navigate('/login', {
        replace: true,
        state: {
          passwordChanged: true,
          campus,
          username,
        },
      })
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Could not update password.',
        { id: toastId },
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  const toggleMenu = (menuLabel) => {
    setOpenMenus((previous) => {
      const willOpen = !previous[menuLabel]
      return Object.fromEntries(
        Object.keys(previous).map((label) => [label, label === menuLabel ? willOpen : false]),
      )
    })
  }

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false)

  const onNavParentClick = (item) => {
    if (!navItemAllowed(item) && item.to) return
    if (item.to) {
      navigate(item.to)
      closeMobileSidebar()
      return
    }
    if (item.children?.length) {
      toggleMenu(item.label)
    }
  }

  const onNavChildClick = (child) => {
    if (!navItemAllowed(child)) return
    navigate(child.to)
    closeMobileSidebar()
  }

  const headerTitle = headerContext && hideLoggedCampusInHeader
    ? `${SCHOOL_NAME} — ${headerContext}`
    : headerContext
    ? `${SCHOOL_NAME} — ${headerContext} · ${normalizedCampus}`
    : `${SCHOOL_NAME} - ${normalizedCampus}`

  const renderNavItem = (item) => {
    const Icon = item.icon
    const hasChildren = Boolean(item.children?.length)
    const isOpen = Boolean(openMenus[item.label])
    const parentActive = isParentRowActive(item, pathname, bestNavChild)
    const parentAllowed = hasChildren ? true : navItemAllowed(item)
    const parentTitle = parentAllowed ? undefined : FORBIDDEN_ACCESS_MESSAGE

    return (
      <div key={item.id} className="overflow-hidden rounded-xl">
        <span className="block" title={parentTitle}>
          <button
            type="button"
            disabled={!parentAllowed && Boolean(item.to)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
              parentActive ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
            } ${!parentAllowed && item.to ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : 'cursor-pointer'}`}
            onClick={() => onNavParentClick(item)}
          >
            <Icon size={16} className={`shrink-0 ${item.iconClass || 'text-indigo-100'}`} />
            <span className="flex-1">{item.label}</span>
            {hasChildren ? (
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
            ) : null}
          </button>
        </span>

        {hasChildren ? (
          <div
            className={`grid overflow-hidden pl-10 pr-2 transition-all duration-300 ${
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0">
              <div className="mb-2 mt-1 space-y-1">
                {item.children.map((child) => {
                  const childActive = isChildRowActive(child, bestNavChild)
                  const childAllowed = navItemAllowed(child)
                  return (
                    <span key={child.label} className="block" title={childAllowed ? undefined : FORBIDDEN_ACCESS_MESSAGE}>
                      <button
                        type="button"
                        disabled={!childAllowed}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs transition ${
                          childActive ? 'bg-white/15 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                        } ${childAllowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-indigo-200'}`}
                        onClick={() => onNavChildClick(child)}
                      >
                        {child.label}
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-700 ${rootClassName}`.trim()}>
      <div className={rowClassName.trim() ? rowClassName : 'flex min-h-screen w-full'}>
        {isMobileSidebarOpen && !hideSidebar ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={closeMobileSidebar}
          />
        ) : null}

        {!hideSidebar ? (
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col bg-[linear-gradient(280deg,#405189,#283357)] text-indigo-50 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${asideClassName}`.trim()}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/15 px-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/15 p-1">
              <img src={softelligentLogo} alt="Softelligent" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-5">Softelligent</p>
              <p className="text-xs text-indigo-200">School Suite</p>
            </div>
            <button
              type="button"
              className="ml-auto rounded-lg p-2 text-indigo-100 hover:bg-white/10 lg:hidden"
              onClick={closeMobileSidebar}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6 text-sm">
            {visibleNav.map(renderNavItem)}
          </nav>

          <div className="border-t border-white/15 p-3">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-indigo-100 transition hover:bg-white/10"
            >
              <LogOut size={16} className="shrink-0 text-red-400" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-x-hidden max-lg:[&>:not(header)]:pt-[5.75rem] print:[&>:not(header)]:!pt-0">
          <header
            className={`fixed left-0 right-0 top-0 z-40 border-b border-indigo-100 bg-slate-50/95 shadow-sm backdrop-blur-sm ${
              hideSidebar ? 'lg:left-0' : 'lg:left-72'
            } ${headerClassName}`.trim()}
          >
            <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-2 text-slate-700 sm:gap-3">
                {!hideSidebar ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu size={18} />
                  </button>
                ) : null}
                <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 lg:flex">
                  <img src={SCHOOL_LOGO_PATH} alt={`${SCHOOL_NAME} logo`} className="h-5 w-5 shrink-0 object-contain" />
                  <p className="truncate text-sm font-semibold">{headerTitle}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsQuickLinksOpen(false)
                    setIsCampusMenuOpen(false)
                    setIsNotificationsOpen(true)
                    markAllRead()
                  }}
                  className={`relative flex cursor-pointer items-center justify-center rounded-lg border p-2 transition sm:px-2.5 sm:py-1.5 ${
                    isNotificationsOpen || unreadCount > 0
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                  title="Notifications"
                  aria-label="Notifications"
                  aria-expanded={isNotificationsOpen}
                >
                  <Bell size={16} className="shrink-0" strokeWidth={2.25} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                <div className="relative" ref={quickLinksRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsCampusMenuOpen(false)
                      setIsQuickLinksOpen((open) => !open)
                    }}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 transition sm:px-2.5 sm:py-1.5 ${
                      isQuickLinksOpen
                        ? 'border-violet-300 bg-violet-100 text-violet-700'
                        : 'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700'
                    }`}
                    title="Quick links"
                    aria-expanded={isQuickLinksOpen}
                    aria-haspopup="menu"
                  >
                    <LayoutGrid size={16} className="shrink-0" strokeWidth={2.25} />
                  </button>
                  {isQuickLinksOpen ? (
                    <div
                      className="absolute right-0 z-[70] mt-2 w-[19.5rem] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl sm:w-[22rem]"
                      role="menu"
                    >
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Quick links
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {QUICK_LINKS.map((link) => {
                          const Icon = link.icon
                          const allowed = hasCampusPermission(link.permission)
                          return (
                            <span
                              key={link.to}
                              className="block"
                              title={allowed ? link.label : FORBIDDEN_ACCESS_MESSAGE}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                disabled={!allowed}
                                onClick={() => {
                                  if (!allowed) return
                                  setIsQuickLinksOpen(false)
                                  navigate(link.to)
                                }}
                                className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition ${
                                  link.tileClass
                                } ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40 grayscale'}`}
                              >
                                <Icon size={20} className={link.iconClass} strokeWidth={2.1} />
                                <span className="text-[10px] font-semibold leading-tight text-slate-700">
                                  {link.label}
                                </span>
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <span
                  title={
                    canViewDirectorDashboard
                      ? undefined
                      : "Director Dashboard requires Super Admin and all-campus dashboard access."
                  }
                >
                  <button
                    type="button"
                    disabled={!canViewDirectorDashboard}
                    onClick={() => {
                      if (!canViewDirectorDashboard) return
                      navigate('/campus/overview')
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium transition sm:px-2.5 sm:py-1.5 ${
                      campusOverviewActive
                        ? 'border-[#405189]/40 bg-[#405189]/15 text-[#283357]'
                        : 'border-[#405189]/20 bg-[#405189]/08 text-[#405189] hover:bg-[#405189]/12'
                    } ${canViewDirectorDashboard ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'}`}
                    title="Director Dashboard"
                    aria-label="Director Dashboard"
                  >
                    <Building2 size={16} className="shrink-0 text-[#405189]" />
                    <span className="hidden sm:inline">Director Dashboard</span>
                  </button>
                </span>

                {isSuperAdmin ? (
                  <div className="relative" ref={campusMenuRef}>
                    <button
                      type="button"
                      disabled={isSwitchingCampus}
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        setIsQuickLinksOpen(false)
                        setIsCampusMenuOpen((open) => !open)
                      }}
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-sm font-medium transition sm:max-w-[14rem] sm:px-2.5 sm:py-1.5 ${
                        isCampusMenuOpen
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      } disabled:cursor-wait disabled:opacity-70`}
                      title={`Switch campus (${normalizedCampus})`}
                      aria-label={`Switch campus. Current: ${normalizedCampus}`}
                      aria-expanded={isCampusMenuOpen}
                      aria-haspopup="menu"
                    >
                      {isSwitchingCampus ? (
                        <Loader2 size={16} className="shrink-0 animate-spin text-emerald-600" />
                      ) : (
                        <School size={16} className="shrink-0 text-emerald-600" />
                      )}
                      <span className="hidden truncate sm:inline">{normalizedCampus}</span>
                      <ChevronDown
                        size={14}
                        className={`hidden shrink-0 transition-transform duration-300 sm:block ${isCampusMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isCampusMenuOpen ? (
                      <div
                        className="absolute right-0 z-[70] mt-2 max-h-80 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                        role="menu"
                      >
                        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Switch campus
                        </p>
                        {campusSwitchOptions.map((option) => {
                          const active = option.value === campus
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="menuitem"
                              disabled={isSwitchingCampus || active}
                              onClick={() => onSwitchCampus(option.value)}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                active
                                  ? 'bg-emerald-50 font-semibold text-emerald-800'
                                  : 'text-slate-700 hover:bg-slate-100'
                              } disabled:cursor-default`}
                            >
                              <span className="truncate">{option.label}</span>
                              {active ? <BadgeCheck size={14} className="shrink-0 text-emerald-600" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickLinksOpen(false)
                      setIsCampusMenuOpen(false)
                      setIsUserMenuOpen((previous) => !previous)
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-2 sm:py-1.5"
                    aria-label="User menu"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#405189] text-xs font-semibold text-white">
                      {username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{username}</span>
                    <ChevronDown
                      size={16}
                      className={`hidden transition-transform duration-300 sm:block ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isUserMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={openChangePassword}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        <KeyRound size={15} />
                        Change password
                      </button>
                      {hasCampusPermission('manage_campus_profile') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            navigate('/campus/settings/profile')
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <Building2 size={15} />
                          Institute Settings
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        <BadgeCheck size={15} />
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex h-7 items-center gap-2 border-t border-indigo-100/80 bg-indigo-50/70 px-3 lg:hidden">
              <img src={SCHOOL_LOGO_PATH} alt="" className="h-4 w-4 shrink-0 object-contain" />
              <p className="min-w-0 truncate text-[11px] font-semibold leading-none text-slate-700">
                {headerContext && hideLoggedCampusInHeader
                  ? headerContext
                  : headerContext
                    ? `${headerContext} · ${normalizedCampus}`
                    : normalizedCampus}
              </p>
            </div>
          </header>

          {children}
        </main>
      </div>

      {isSwitchingCampus ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-8 py-7 shadow-2xl">
            <Loader2 size={36} className="animate-spin text-emerald-600" strokeWidth={2.25} />
            <p className="text-sm font-semibold text-slate-800">Switching campus…</p>
            <p className="text-xs text-slate-500">Please wait a moment.</p>
          </div>
        </div>
      ) : null}

      {isChangePasswordOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitChangePassword}
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 id="change-password-title" className="text-lg font-bold text-slate-900">
                    Change password
                  </h2>
                  <p className="text-sm text-slate-500">You will need to sign in again after saving.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChangePassword}
                disabled={isChangingPassword}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Current password
                <input
                  type="password"
                  className={`${passwordInputClass} mt-1`}
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordValue('currentPassword', event.target.value)}
                  autoComplete="current-password"
                  maxLength={100}
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                New password
                <input
                  type="password"
                  className={`${passwordInputClass} mt-1`}
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordValue('newPassword', event.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Confirm new password
                <input
                  type="password"
                  className={`${passwordInputClass} mt-1`}
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordValue('confirmPassword', event.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                  required
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isChangingPassword}
                onClick={closeChangePassword}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344574] disabled:opacity-60"
              >
                {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Update password
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <CampusNotificationsDrawer
        open={isNotificationsOpen}
        notifications={notifications}
        onClose={() => setIsNotificationsOpen(false)}
        onSelect={(item) => {
          setIsNotificationsOpen(false)
          if (item?.link) navigate(item.link)
        }}
      />
    </div>
  )
}

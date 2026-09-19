import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookMarked,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  Eye,
  FileBarChart2,
  FileCheck2,
  GraduationCap,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  NotebookPen,
  PenLine,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  changeEmployeePassword,
  employeeLogout,
} from '../../services/employeeAuthService'
import {
  getEmployeeAppAccess,
  isEmployeeCoordinator,
  usesPersonalTeachingNav,
} from '../../services/employeeAppAccess'
import { getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../constants/branding'
import EmployeeBottomNavSubmenu from './EmployeeBottomNavSubmenu'
import { useEmployeeDismissKeyboard } from './EmployeeSelect'
import './employeeTheme.css'

const emptyPasswordForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function EmployeeLayout({
  title,
  subtitle,
  children,
  showQuickTiles: _showQuickTiles = false,
  showProfileCard = false,
  compactContentTop = false,
  hideAppBarSubtitle = false,
  appBarDateLabel = null,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const employeeName = localStorage.getItem('employeeName') || 'Employee'
  const campus = localStorage.getItem('employeeCampus') || '-'
  const campusLabel = getCampusLabel(campus)
  const userInitial = employeeName.trim().charAt(0).toUpperCase() || 'E'
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [submenuParentItem, setSubmenuParentItem] = useState(null)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)

  useEmployeeDismissKeyboard()

  const onLogout = () => {
    employeeLogout()
    navigate('/employee/login', { replace: true })
  }

  const openChangePassword = () => {
    setIsProfileOpen(false)
    setPasswordForm(emptyPasswordForm())
    setIsChangePasswordOpen(true)
  }

  const closeChangePassword = () => {
    if (isChangingPassword) return
    setIsChangePasswordOpen(false)
    setPasswordForm(emptyPasswordForm())
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
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
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
    const toastId = 'emp-change-password'
    toast.loading('Updating password…', { id: toastId })
    try {
      await changeEmployeePassword({ currentPassword, newPassword, confirmPassword })
      toast.success('Password updated. Please sign in again.', { id: toastId })
      setIsChangePasswordOpen(false)
      employeeLogout()
      navigate('/employee/login', { replace: true, state: { passwordChanged: true } })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update password.', { id: toastId })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const isCoordinator = isEmployeeCoordinator()
  const personalTeachingNav = usesPersonalTeachingNav()
  const access = useMemo(() => getEmployeeAppAccess(), [])
  const isHome = location.pathname === '/employee/dashboard'

  const bottomNavItems = useMemo(() => {
    const academicsSubmenu = []
    if (access.canViewSubjectAllocation || access.canEditSubjectAllocation) {
      academicsSubmenu.push({
        id: 'subject-allocation',
        label: 'Subject Allocation',
        description: 'Assign teachers to class subjects',
        icon: GraduationCap,
        iconBadgeClass: 'text-[var(--emp-primary)]',
        path: '/employee/academics/subject-allocation',
      })
    }
    if (access.canViewTimetable || access.canEditTimetable) {
      academicsSubmenu.push({
        id: 'timetables',
        label: 'Timetables',
        description: 'Build and edit class timetables',
        icon: CalendarDays,
        iconBadgeClass: 'text-sky-700',
        path: '/employee/academics/timetables',
      })
    }
    if (access.canViewDatesheet || access.canEditDatesheet) {
      academicsSubmenu.push({
        id: 'manage-datesheets',
        label: 'Manage datesheets',
        description: 'Exam dates and papers',
        icon: NotebookPen,
        iconBadgeClass: 'text-amber-700',
        path: '/employee/academics/datesheets',
      })
    }
    if (access.canViewDiary || access.canEditDiary) {
      academicsSubmenu.push({
        id: 'diary',
        label: 'Diary Management',
        description: 'Class diaries and uploads',
        icon: PenLine,
        iconBadgeClass: 'text-emerald-700',
        path: '/employee/academics/diary',
      })
    }
    if (access.canAccessLessonPlan) {
      academicsSubmenu.push({
        id: 'lesson-plan',
        label: 'Lesson planning',
        description: 'Prepare lessons for your classes',
        icon: NotebookPen,
        iconBadgeClass: 'text-orange-700',
        onSelect: () => {
          toast.message('Lesson planning is not available yet.')
        },
      })
    }
    if (isCoordinator) {
      academicsSubmenu.push(
        {
          id: 'teacher-analysis',
          label: 'Teacher Analysis',
          description: 'Exam results by teacher',
          icon: FileBarChart2,
          iconBadgeClass: 'text-violet-700',
          path: '/employee/academics/teacher-analysis',
        },
        {
          id: 'teacher-performance',
          label: 'Teacher Performance',
          description: 'Cross-exam performance grid',
          icon: Users,
          iconBadgeClass: 'text-rose-700',
          path: '/employee/academics/teacher-performance',
        },
      )
    }

    const personalTeachingItems = [
      {
        id: 'assignments',
        label: 'Assignments',
        description: 'Classes and subjects',
        icon: BookMarked,
        iconBadgeClass: 'text-emerald-700',
        path: '/employee/my-assignments',
      },
      {
        id: 'timetable',
        label: 'Time table',
        description: 'Periods and classes',
        icon: CalendarDays,
        iconBadgeClass: 'text-orange-700',
        path: '/employee/my-timetable',
      },
      {
        id: 'datesheets-browse',
        label: 'Datesheets',
        description: 'Exam schedules',
        icon: NotebookPen,
        iconBadgeClass: 'text-teal-700',
        path: '/employee/datesheets',
      },
    ]

    const attendanceSubmenu = [
      {
        id: 'my-attendance',
        label: personalTeachingNav ? 'Attendance' : 'My Attendance',
        description: 'Your check-in and check-out',
        icon: Clock3,
        iconBadgeClass: 'text-emerald-700',
        path: '/employee/my-attendance',
      },
    ]
    if (access.canMarkStudentAttendance) {
      attendanceSubmenu.push({
        id: 'mark-attendance',
        label: 'Mark Student Attendance',
        description: 'Take register for your classes',
        icon: PenLine,
        iconBadgeClass: 'text-sky-700',
        path: '/employee/attendance',
      })
    }
    if (access.canViewStudentAttendance) {
      attendanceSubmenu.push(
        {
          id: 'search-student-attendance',
          label: 'Search Student Attendance',
          description: 'Calendar for one student',
          icon: Search,
          iconBadgeClass: 'text-indigo-700',
          path: '/employee/attendance-student',
        },
        {
          id: 'view-attendance',
          label: 'Search Monthly Attendance',
          description: 'Summaries and history',
          icon: Eye,
          iconBadgeClass: 'text-violet-700',
          path: '/employee/attendance-report',
        },
      )
    }

    const conductSubmenu = []
    if (access.canRecordStudentConduct) {
      conductSubmenu.push({
        id: 'class-conduct',
        label: 'Class Conduct',
        description: 'Record notes while going through the class',
        icon: ClipboardList,
        iconBadgeClass: 'text-amber-700',
        path: '/employee/conduct',
      })
    }
    if (access.canViewStudentConduct) {
      conductSubmenu.push({
        id: 'student-conduct',
        label: 'Student Conduct',
        description: 'Look up one student’s notes',
        icon: Search,
        iconBadgeClass: 'text-indigo-700',
        path: '/employee/conduct-student',
      })
      conductSubmenu.push({
        id: 'conduct-report',
        label: 'Conduct Report',
        description: 'All classes for a day, or one student',
        icon: FileBarChart2,
        iconBadgeClass: 'text-violet-700',
        path: '/employee/conduct-report',
      })
    }

    const attendanceItem = {
      id: 'attendance',
      label: 'Attendance',
      icon: personalTeachingNav ? Clock3 : CalendarClock,
      path: '/employee/my-attendance',
      submenuItems: attendanceSubmenu.length > 1 ? attendanceSubmenu : undefined,
    }

    const conductItem =
      conductSubmenu.length > 0
        ? {
            id: 'conduct',
            label: 'Conduct',
            icon: ClipboardList,
            path: conductSubmenu[0].path,
            submenuItems: conductSubmenu.length > 1 ? conductSubmenu : undefined,
          }
        : null

    const examsItem = access.canViewStudentExamDetail
      ? { id: 'exams', label: 'Exams', icon: FileCheck2, path: '/employee/exams' }
      : null

    if (personalTeachingNav) {
      const items = [{ id: 'home', label: 'Home', icon: Home, path: '/employee/dashboard' }, attendanceItem]
      const hasExtraModules = academicsSubmenu.length > 0 || Boolean(conductItem) || Boolean(examsItem)

      if (hasExtraModules) {
        items.push({
          id: 'academics',
          label: 'Academics',
          icon: BookOpen,
          submenuItems: [...personalTeachingItems, ...academicsSubmenu],
        })
        if (conductItem) items.push(conductItem)
        if (examsItem) items.push(examsItem)
      } else {
        items.push(
          { id: 'assignments', label: 'Assignments', icon: BookMarked, path: '/employee/my-assignments' },
          { id: 'timetable', label: 'Time table', icon: CalendarDays, path: '/employee/my-timetable' },
          { id: 'datesheets', label: 'Datesheets', icon: NotebookPen, path: '/employee/datesheets' },
        )
      }

      return items
    }

    const items = [{ id: 'home', label: 'Home', icon: Home, path: '/employee/dashboard' }]

    if (academicsSubmenu.length > 0) {
      items.push({
        id: 'academics',
        label: 'Academics',
        icon: BookOpen,
        submenuItems: academicsSubmenu,
      })
    }

    items.push(attendanceItem)
    if (conductItem) items.push(conductItem)
    if (examsItem) items.push(examsItem)

    return items
  }, [access, isCoordinator, personalTeachingNav])

  const resolveActiveNav = () => {
    if (
      location.pathname === '/employee/attendance' ||
      location.pathname === '/employee/attendance-report' ||
      location.pathname === '/employee/attendance-student' ||
      location.pathname === '/employee/my-attendance'
    ) {
      return 'attendance'
    }
    if (location.pathname === '/employee/dashboard') return 'home'
    if (location.pathname === '/employee/coordinator-daily-report') return 'home'
    if (location.pathname === '/employee/my-assignments') {
      return bottomNavItems.some((item) => item.id === 'assignments') ? 'assignments' : 'academics'
    }
    if (location.pathname === '/employee/my-timetable') {
      return bottomNavItems.some((item) => item.id === 'timetable') ? 'timetable' : 'academics'
    }
    if (location.pathname.startsWith('/employee/datesheets')) {
      return bottomNavItems.some((item) => item.id === 'datesheets') ? 'datesheets' : 'academics'
    }
    if (location.pathname.startsWith('/employee/conduct')) return 'conduct'
    if (location.pathname.startsWith('/employee/academics')) return 'academics'
    if (location.pathname.startsWith('/employee/exams')) return 'exams'
    return 'home'
  }

  const onNavClick = (item) => {
    if (item.submenuItems?.length) {
      setSubmenuParentItem(item)
      return
    }
    if (item.path) {
      navigate(item.path)
    }
  }

  const onSubmenuItemActivate = (entry) => {
    if (typeof entry.onSelect === 'function') entry.onSelect()
    else if (entry.path) navigate(entry.path)
    setSubmenuParentItem(null)
  }

  useEffect(() => {
    setSubmenuParentItem(null)
  }, [location.pathname])

  useEffect(() => {
    if (!isProfileOpen) return

    const onDocumentClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [isProfileOpen])

  const showSubtitle = Boolean(subtitle) && !hideAppBarSubtitle && !isHome
  const navCols = Math.min(6, Math.max(2, bottomNavItems.length))
  const passwordInputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'

  return (
    <div className="employee-app min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--emp-border)] bg-[var(--emp-surface)] px-3 py-2.5 sm:px-4">
        <div className="mx-auto flex w-full max-w-screen-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={SCHOOL_LOGO_PATH}
              alt={`${SCHOOL_NAME} logo`}
              className="h-8 w-8 shrink-0 rounded-full bg-[var(--emp-bg)] object-contain p-0.5"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--emp-text)]">
                {title}
              </h1>
              {showSubtitle ? (
                <p className="truncate text-xs text-[var(--emp-text-muted)]">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {appBarDateLabel ? (
              <span className="max-w-[9.5rem] truncate rounded-full bg-[var(--emp-primary-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--emp-primary)] sm:max-w-none">
                {appBarDateLabel}
              </span>
            ) : null}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="emp-avatar-btn"
                aria-label="Open profile menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((value) => !value)}
              >
                {userInitial}
              </button>
              {isProfileOpen ? (
                <div className="emp-surface-raised absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl p-1">
                  <div className="border-b border-[var(--emp-border)] px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-[var(--emp-text)]">{employeeName}</p>
                    <p className="truncate text-xs text-[var(--emp-text-muted)]">{campusLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openChangePassword}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--emp-text)] active:bg-[var(--emp-bg)]"
                  >
                    <KeyRound size={16} className="text-[var(--emp-text-muted)]" />
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--emp-text)] active:bg-[var(--emp-bg)]"
                  >
                    <LogOut size={16} className="text-[var(--emp-text-muted)]" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-screen-md px-3 pb-[calc(var(--emp-nav-height)+1.25rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-4">
        {showProfileCard ? (
          <section className="emp-surface mb-3 rounded-[var(--emp-radius-lg)] p-3.5">
            <p className="text-sm font-semibold text-[var(--emp-text)]">{employeeName}</p>
            <p className="text-xs text-[var(--emp-text-muted)]">{campusLabel}</p>
          </section>
        ) : null}

        <main className={`${compactContentTop ? 'mt-0' : 'mt-1'} space-y-3`}>{children}</main>
      </div>

      <EmployeeBottomNavSubmenu
        open={Boolean(submenuParentItem)}
        title={submenuParentItem?.label}
        items={submenuParentItem?.submenuItems ?? []}
        onClose={() => setSubmenuParentItem(null)}
        onItemActivate={onSubmenuItemActivate}
      />

      {isChangePasswordOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={submitChangePassword}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emp-change-password-title"
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--emp-primary)] text-white">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 id="emp-change-password-title" className="text-base font-bold text-slate-900">
                    Change password
                  </h2>
                  <p className="text-xs text-slate-500">You will need to sign in again after saving.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChangePassword}
                disabled={isChangingPassword}
                className="emp-icon-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current password
                <input
                  type="password"
                  className={passwordInputClass}
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordValue('currentPassword', event.target.value)}
                  autoComplete="current-password"
                  maxLength={100}
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                New password
                <input
                  type="password"
                  className={passwordInputClass}
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordValue('newPassword', event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirm new password
                <input
                  type="password"
                  className={passwordInputClass}
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordValue('confirmPassword', event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  required
                />
              </label>
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={isChangingPassword}
                onClick={closeChangePassword}
                className="emp-cta-btn h-11 flex-1 border-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="emp-cta-btn emp-cta-btn-primary h-11 flex-[1.3]"
              >
                {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <nav className="emp-nav fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-screen-md px-1.5 pt-1 supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-[var(--emp-nav-height)] gap-0.5" style={{ gridTemplateColumns: `repeat(${navCols}, minmax(0, 1fr))` }}>
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = resolveActiveNav() === item.id
            const submenuOpen = submenuParentItem?.id === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavClick(item)}
                className={`emp-nav-item ${isActive ? 'emp-nav-item-active' : ''}`}
                aria-label={item.label}
                aria-expanded={item.submenuItems?.length ? submenuOpen : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.85} />
                <span className="leading-none">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default EmployeeLayout

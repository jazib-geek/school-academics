import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Eye,
  FileCheck2,
  Home,
  LogOut,
  MessageSquare,
  NotebookPen,
  PenLine,
  ScrollText,
  UserCircle2,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { employeeLogout, isEmployeeCoordinator } from '../../services/employeeAuthService'
import { getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../constants/branding'
import EmployeeBottomNavSubmenu from './EmployeeBottomNavSubmenu'
import './employeeTheme.css'

function EmployeeLayout({
  title,
  subtitle,
  children,
  showQuickTiles = true,
  showProfileCard = true,
  compactContentTop = false,
  quickTiles,
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

  const defaultQuickTiles = [
    { id: 'attendance', label: 'Attendance', icon: CalendarClock, value: 'Today: Present' },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, value: '3 Pending' },
    { id: 'notices', label: 'Notices', icon: Bell, value: '2 New' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, value: '5 Unread' },
  ]
  const renderedQuickTiles = quickTiles || defaultQuickTiles

  const onLogout = () => {
    employeeLogout()
    navigate('/employee/login', { replace: true })
  }

  const showCoordinatorNav = isEmployeeCoordinator()

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/employee/dashboard' },
    ...(showCoordinatorNav
      ? [
          {
            id: 'dailyReport',
            label: 'Report',
            icon: ScrollText,
            path: '/employee/coordinator-daily-report',
          },
        ]
      : []),
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarClock,
      path: '/employee/attendance',
      submenuItems: [
        {
          id: 'mark-attendance',
          label: 'Mark Attendance',
          description: 'Take register for your classes',
          icon: PenLine,
          iconBadgeClass: 'text-sky-700',
          tileTopBorderClass: 'border-t-4 border-t-sky-500',
          path: '/employee/attendance',
        },
        {
          id: 'view-attendance',
          label: 'Attendance Report',
          description: 'Summaries and history',
          icon: Eye,
          iconBadgeClass: 'text-violet-700',
          tileTopBorderClass: 'border-t-4 border-t-violet-600',
          path: '/employee/attendance-report',
        },
      ],
    },
    { id: 'datesheet', label: 'Datesheet', icon: CalendarDays },
    { id: 'lesson-plan', label: 'Lesson Plan', icon: NotebookPen },
    { id: 'exams', label: 'Exams', icon: FileCheck2 },
  ]

  const resolveActiveNav = () => {
    if (location.pathname === '/employee/attendance' || location.pathname === '/employee/attendance-report') {
      return 'attendance'
    }
    if (location.pathname === '/employee/dashboard') return 'home'
    if (location.pathname === '/employee/coordinator-daily-report') return 'dailyReport'
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

  return (
    <div className="employee-app min-h-screen text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:px-4">
        <div className="mx-auto w-full max-w-screen-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={SCHOOL_LOGO_PATH}
                alt={`${SCHOOL_NAME} logo`}
                className="h-10 w-10 rounded-xl bg-slate-100 object-contain p-1 ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                  Employee Portal
                </p>
                <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
                {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  className="emp-icon-btn h-10 w-10 text-sm font-bold"
                  aria-label="Open profile menu"
                  onClick={() => setIsProfileOpen((value) => !value)}
                >
                  {userInitial}
                </button>
                {isProfileOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <p className="truncate px-2 py-1 text-sm font-semibold text-slate-900">{employeeName}</p>
                    <p className="truncate px-2 pb-2 text-xs text-slate-500">Campus: {campusLabel}</p>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full rounded-lg bg-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="emp-icon-btn"
                aria-label="Notifications"
              >
                <Bell size={17} />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="emp-icon-btn"
                aria-label="Logout"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-screen-md px-3 pb-24 pt-4 sm:px-4">
        {showProfileCard ? (
          <section className="emp-surface mt-4 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 text-indigo-700">
                <UserCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{employeeName}</p>
                <p className="text-xs text-slate-500">Campus: {campusLabel}</p>
              </div>
            </div>
          </section>
        ) : null}

        {showQuickTiles ? (
          <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {renderedQuickTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <article
                  key={tile.id}
                  className={`emp-surface rounded-2xl p-3 transition active:scale-[0.98] ${
                    tile.onClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={tile.onClick}
                  role={tile.onClick ? 'button' : undefined}
                  tabIndex={tile.onClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!tile.onClick) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      tile.onClick()
                    }
                  }}
                >
                  <div
                    className={`mb-2 inline-flex rounded-lg p-2 ${
                      tile.iconBadgeClass || 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{tile.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{tile.value}</p>
                </article>
              )
            })}
          </section>
        ) : null}

        <main className={`${compactContentTop ? 'mt-2' : 'mt-4'} space-y-4`}>{children}</main>
      </div>

      <EmployeeBottomNavSubmenu
        open={Boolean(submenuParentItem)}
        title={submenuParentItem?.label}
        items={submenuParentItem?.submenuItems ?? []}
        onClose={() => setSubmenuParentItem(null)}
        onItemActivate={onSubmenuItemActivate}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-screen-md border-t border-slate-200 bg-white/95 px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div
          className={`grid gap-1 rounded-2xl ${showCoordinatorNav ? 'grid-cols-6' : 'grid-cols-5'}`}
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = resolveActiveNav() === item.id
            const submenuOpen = submenuParentItem?.id === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavClick(item)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-0.5 text-[10px] font-medium transition sm:px-1 sm:text-[11px] ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-100 to-violet-100 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label={item.label}
                aria-expanded={item.submenuItems?.length ? submenuOpen : undefined}
              >
                <Icon size={18} />
                <span className="mt-1 leading-none">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default EmployeeLayout

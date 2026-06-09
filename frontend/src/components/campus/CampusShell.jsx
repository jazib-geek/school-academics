import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Clock,
  FileBarChart,
  FileSpreadsheet,
  Globe2,
  GraduationCap,
  Home,
  Menu,
  Receipt,
  Users,
  X,
} from 'lucide-react'
import { logout } from '../../services/authService'
import { getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../constants/branding'

/** Single source of truth for campus (per-campus DB) shell navigation. */
export const CAMPUS_SHELL_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, to: '/campus/dashboard' },
  { id: 'daily', label: 'Daily Reporting', icon: ClipboardList, to: '/campus/daily-reporting' },
  {
    id: 'daily-diary',
    label: 'Daily Diary',
    icon: BookOpen,
    children: [
      { label: 'Upload', to: '/campus/daily-diary' },
      { label: 'View all', to: '/campus/daily-diary/list' },
    ],
  },
  { id: 'employee-attendance', label: 'Employee Attendance', icon: Clock, to: '/campus/employee-attendance' },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    children: [{ label: 'All Students', to: '/campus/students' }],
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: FileBarChart,
    children: [
      { label: 'Exam result', to: '/campus/exams/result' },
      { label: 'Exam mark sheet', to: '/campus/exams/mark-sheet' },
    ],
  },
  {
    id: 'fee',
    label: 'Fee',
    icon: Receipt,
    children: [{ label: 'Fee reports', to: '/campus/fee/reports' }],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileSpreadsheet,
    children: [{ label: 'Income report', to: '/campus/reports/income' }],
  },
]

function isParentRowActive(item, pathname) {
  if (item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`))) return true
  return Boolean(item.children?.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`)))
}

function isChildRowActive(child, pathname) {
  return pathname === child.to || pathname.startsWith(`${child.to}/`)
}

function buildInitialOpenMenus(items) {
  return Object.fromEntries(items.filter((item) => item.children?.length).map((item) => [item.label, false]))
}

function buildDerivedOpenMenus(items, pathname) {
  return Object.fromEntries(
    items
      .filter((item) => item.children?.length)
      .map((item) => [
        item.label,
        item.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`)),
      ]),
  )
}

/**
 * Shared campus login layout: sidebar, top bar, user menu.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children — main column content below the fixed header (include your own top padding, e.g. pt-20).
 * @param {string} [props.headerContext] — optional segment between school name and campus (e.g. "Daily reporting").
 * @param {boolean} [props.campusOverviewActive] — highlight the "Campus Dashboard" footer link (multi-campus overview route).
 * @param {string} [props.rootClassName] — extra classes on the outer min-h-screen wrapper.
 * @param {string} [props.rowClassName] — classes on the flex row (e.g. Fee Reports print wrapper).
 * @param {string} [props.asideClassName] — extra classes on aside (e.g. no-print).
 * @param {string} [props.headerClassName] — extra classes on the fixed top header.
 */
export default function CampusShell({
  children,
  headerContext,
  campusOverviewActive = false,
  rootClassName = '',
  rowClassName = '',
  asideClassName = '',
  headerClassName = '',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const campus = localStorage.getItem('campus') || 'N/A'
  const normalizedCampus = getCampusLabel(campus)
  const username = localStorage.getItem('username') || 'Admin'

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState(() => buildInitialOpenMenus(CAMPUS_SHELL_NAV))

  const derivedOpen = useMemo(() => buildDerivedOpenMenus(CAMPUS_SHELL_NAV, pathname), [pathname])

  useEffect(() => {
    setOpenMenus(derivedOpen)
  }, [derivedOpen])

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleMenu = (menuLabel) => {
    setOpenMenus((previous) => ({
      ...previous,
      [menuLabel]: !previous[menuLabel],
    }))
  }

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false)

  const onNavParentClick = (item) => {
    if (item.to) {
      navigate(item.to)
      closeMobileSidebar()
      return
    }
    if (item.children?.length) {
      toggleMenu(item.label)
    }
  }

  const onNavChildClick = (to) => {
    navigate(to)
    closeMobileSidebar()
  }

  const headerTitle = headerContext
    ? `${SCHOOL_NAME} — ${headerContext} · ${normalizedCampus}`
    : `${SCHOOL_NAME} - ${normalizedCampus}`

  const renderNavItem = (item) => {
    const Icon = item.icon
    const hasChildren = Boolean(item.children?.length)
    const isOpen = Boolean(openMenus[item.label])
    const parentActive = isParentRowActive(item, pathname)

    return (
      <div key={item.id} className="overflow-hidden rounded-xl">
        <button
          type="button"
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
            parentActive ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
          }`}
          onClick={() => onNavParentClick(item)}
        >
          <Icon size={16} className="shrink-0" />
          <span className="flex-1">{item.label}</span>
          {hasChildren ? (
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>

        {hasChildren ? (
          <div
            className={`grid overflow-hidden pl-10 pr-2 transition-all duration-300 ${
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0">
              <div className="mb-2 mt-1 space-y-1">
                {item.children.map((child) => {
                  const childActive = isChildRowActive(child, pathname)
                  return (
                    <button
                      key={child.label}
                      type="button"
                      className={`block w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-xs transition ${
                        childActive ? 'bg-white/15 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => onNavChildClick(child.to)}
                    >
                      {child.label}
                    </button>
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
        {isMobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={closeMobileSidebar}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-[linear-gradient(280deg,#405189,#283357)] text-indigo-50 transition-transform duration-300 lg:static lg:z-auto lg:flex lg:translate-x-0 lg:flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${asideClassName}`.trim()}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/15 px-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 text-xl text-white">
              <GraduationCap size={22} />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-5">School Admin</p>
              <p className="text-xs text-indigo-200">Campus portal</p>
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
            {CAMPUS_SHELL_NAV.map(renderNavItem)}
          </nav>

          <div className="border-t border-white/15 p-3">
            <button
              type="button"
              onClick={() => {
                navigate('/campus/overview')
                closeMobileSidebar()
              }}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                campusOverviewActive
                  ? 'bg-white/15 font-medium text-white hover:bg-white/20'
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              <Globe2 size={16} className="shrink-0" />
              <span>Campus Dashboard</span>
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header
            className={`fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-indigo-100 bg-slate-50/95 px-4 shadow-sm backdrop-blur-sm lg:left-72 lg:px-6 ${headerClassName}`.trim()}
          >
            <div className="flex min-w-0 items-center gap-3 text-slate-700">
              <button
                type="button"
                className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-1.5">
                <img src={SCHOOL_LOGO_PATH} alt={`${SCHOOL_NAME} logo`} className="h-5 w-5 shrink-0 object-contain" />
                <p className="truncate text-sm font-semibold">{headerTitle}</p>
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((previous) => !previous)}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#405189] text-xs font-semibold text-white">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{username}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isUserMenuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
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
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}

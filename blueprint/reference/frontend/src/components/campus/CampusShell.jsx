import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  Building2,
  ChevronDown,
  History,
  Home,
  KeyRound,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Palette,
  Settings,
  UserCog,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { changeCampusPassword, hasAnyCampusPermission, hasCampusPermission, isCampusSuperAdmin, logout, switchCampusSession } from '../../services/authService'
import { getAppCampusOptions, getCampusLabel, isCampusAllowedInApp } from '../../constants/branding'
import { loadSidebarTheme, toCssVars } from '../../utils/sidebarTheme'
import useSidebarTheme from '../../hooks/useSidebarTheme'
import SidebarThemeDialog from './SidebarThemeDialog'
import softelligentLogo from '../../assets/softelligent-transparent.png'
import { THEME_SETTINGS_NOTICE_LINK, useCampusNotifications } from '../../hooks/useCampusNotifications.jsx'
import CampusNotificationsDrawer from './CampusNotificationsDrawer.jsx'
import { useCampusRealtime } from '../../contexts/CampusRealtimeContext.jsx'

const FORBIDDEN_ACCESS_MESSAGE = "You don't have access to this."

const QUICK_LINKS = [
  {
    label: 'Users',
    to: '/campus/users',
    permission: 'user_list',
    icon: UserCog,
    iconClass: 'text-sky-500',
    tileClass: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    label: 'Activity Logs',
    to: '/campus/activity-logs',
    permission: 'activity_log_view',
    icon: History,
    iconClass: 'text-amber-500',
    tileClass: 'bg-amber-50 hover:bg-amber-100',
  },
  {
    label: 'System Settings',
    to: '/campus/settings/system',
    permission: 'system_settings_manage',
    icon: Settings,
    iconClass: 'text-violet-500',
    tileClass: 'bg-violet-50 hover:bg-violet-100',
  },
]

const passwordInputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

function navItemAllowed(item) {
  if (item.anyOf?.length) return hasAnyCampusPermission(...item.anyOf)
  if (item.permission) return hasCampusPermission(item.permission)
  return true
}

/** Single source of truth for shell navigation. Leaf = `to`; group = `children`. */
export const CAMPUS_SHELL_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, iconClass: 'text-sky-300', to: '/campus/dashboard', permission: 'dashboard_view' },
  { id: 'users', label: 'User Management', icon: UserCog, iconClass: 'text-blue-300', to: '/campus/users', permission: 'user_list' },
  { id: 'activity-logs', label: 'Activity Logs', icon: History, iconClass: 'text-amber-300', to: '/campus/activity-logs', permission: 'activity_log_view' },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    iconClass: 'text-indigo-300',
    children: [
      { label: 'System Settings', to: '/campus/settings/system', permission: 'system_settings_manage' },
    ],
  },
]

function collectNavChildren(items) {
  return items.flatMap((item) => item.children || [])
}

/** Longest matching nav child for the current path (so a parent route doesn't own nested routes). */
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
 * Shared layout after login: sidebar, top bar, user menu.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children — main column content below the fixed header (include your own top padding, e.g. pt-[4.25rem]).
 * @param {string} [props.headerContext] — optional page label shown before the tenant name.
 * @param {boolean} [props.hideSidebar] — render the shell header without the left navigation.
 * @param {string} [props.rootClassName] — extra classes on the outer min-h-screen wrapper.
 * @param {string} [props.rowClassName] — classes on the flex row.
 * @param {string} [props.asideClassName] — extra classes on aside.
 * @param {string} [props.headerClassName] — extra classes on the fixed top header.
 */
export default function CampusShell({
  children,
  headerContext,
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
  const realtime = useCampusRealtime()

  const campus = localStorage.getItem('campus') || 'N/A'
  const normalizedCampus = getCampusLabel(campus)
  const username = localStorage.getItem('username') || 'Admin'
  const isSuperAdmin = isCampusSuperAdmin()
  const campusSwitchOptions = getAppCampusOptions()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false)
  const [isCampusMenuOpen, setIsCampusMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSwitchingCampus, setIsSwitchingCampus] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [sidebarTheme, setSidebarTheme] = useSidebarTheme()
  const [isSidebarThemeOpen, setIsSidebarThemeOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const quickLinksRef = useRef(null)
  const campusMenuRef = useRef(null)
  const visibleNav = CAMPUS_SHELL_NAV
  const [openMenus, setOpenMenus] = useState(() => buildInitialOpenMenus(CAMPUS_SHELL_NAV))

  const derivedOpen = useMemo(() => buildDerivedOpenMenus(visibleNav, pathname), [pathname, visibleNav])
  const bestNavChild = useMemo(
    () => findBestMatchingNavChild(pathname, visibleNav),
    [pathname, visibleNav],
  )

  useEffect(() => {
    setOpenMenus(derivedOpen)
  }, [derivedOpen])

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
    if (!isCampusAllowedInApp(nextCampus)) {
      toast.error('That campus is not available on this site.')
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

  const openSidebarTheme = () => {
    setIsUserMenuOpen(false)
    setIsSidebarThemeOpen(true)
  }

  const closeSidebarTheme = () => {
    setIsSidebarThemeOpen(false)
    setSidebarTheme(loadSidebarTheme())
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

  const headerTitle = headerContext ? `${headerContext} · ${normalizedCampus}` : normalizedCampus

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
              parentActive
                ? 'bg-[color:var(--sb-active-bg)] font-medium text-[color:var(--sb-active-text)]'
                : 'text-[color:var(--sb-text)] hover:bg-[color:var(--sb-hover-bg)]'
            } ${!parentAllowed && item.to ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : 'cursor-pointer'}`}
            onClick={() => onNavParentClick(item)}
          >
            {sidebarTheme.iconColor ? (
              <Icon size={16} className="shrink-0 text-[color:var(--sb-icon)]" />
            ) : (
              <Icon size={16} className={`shrink-0 ${item.iconClass || 'text-[color:var(--sb-text)]'}`} />
            )}
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
                          childActive
                            ? 'bg-[color:var(--sb-active-bg)] text-[color:var(--sb-active-text)]'
                            : 'text-[color:var(--sb-muted)] hover:bg-[color:var(--sb-hover-bg)] hover:text-[color:var(--sb-active-text)]'
                        } ${childAllowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-[color:var(--sb-muted)]'}`}
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
          style={{ ...toCssVars(sidebarTheme), background: 'var(--sb-bg)' }}
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col text-[color:var(--sb-text)] transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${asideClassName}`.trim()}
        >
          <div className="flex h-16 items-center gap-3 border-b border-[color:var(--sb-border)] px-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[color:var(--sb-active-bg)] p-1">
              <img src={softelligentLogo} alt="Softelligent" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-5 text-[color:var(--sb-active-text)]">Softelligent</p>
              <p className="text-xs text-[color:var(--sb-muted)]">School Suite</p>
            </div>
            <button
              type="button"
              className="ml-auto rounded-lg p-2 text-[color:var(--sb-text)] hover:bg-[color:var(--sb-hover-bg)] lg:hidden"
              onClick={closeMobileSidebar}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6 text-sm">
            {visibleNav.map(renderNavItem)}
          </nav>

          <div className="flex items-center gap-1 border-t border-[color:var(--sb-border)] p-3">
            <button
              type="button"
              onClick={onLogout}
              className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-[color:var(--sb-text)] transition hover:bg-[color:var(--sb-hover-bg)]"
            >
              <LogOut size={16} className="shrink-0 text-red-400" />
              <span>Sign out</span>
            </button>
            <button
              type="button"
              onClick={openSidebarTheme}
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-[color:var(--sb-text)] transition hover:bg-[color:var(--sb-hover-bg)]"
              title="Theme settings"
              aria-label="Theme settings"
            >
              <Palette size={16} />
            </button>
          </div>
        </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-x-hidden max-lg:[&>:not(header)]:pt-[5.75rem]">
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
                  <img src={softelligentLogo} alt="" className="h-5 w-5 shrink-0 object-contain" />
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
                    realtime.openChat()
                  }}
                  className={`relative flex cursor-pointer items-center justify-center rounded-lg border p-2 transition sm:px-2.5 sm:py-1.5 ${
                    realtime.chatUnread > 0 && !realtime.chatOpen
                      ? 'campus-mail-btn-unread-pulse text-emerald-800 hover:bg-emerald-100'
                      : realtime.chatOpen || realtime.chatUnread > 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                  title="Messages"
                  aria-label={
                    realtime.chatUnread > 0
                      ? `${realtime.chatUnread} unread message${realtime.chatUnread === 1 ? '' : 's'}`
                      : 'Messages'
                  }
                  aria-expanded={realtime.chatOpen}
                >
                  <Mail
                    size={16}
                    className={`shrink-0 ${
                      realtime.chatUnread > 0 && !realtime.chatOpen ? 'campus-mail-unread-pulse' : ''
                    }`}
                    strokeWidth={2.25}
                  />
                  {realtime.chatUnread > 0 ? (
                    <span
                      className={`absolute -right-1.5 -top-1.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white ${
                        !realtime.chatOpen ? 'campus-mail-badge-unread-pulse' : ''
                      }`}
                    >
                      {realtime.chatUnread > 9 ? '9+' : realtime.chatUnread}
                    </span>
                  ) : null}
                </button>

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
                        <Building2 size={16} className="shrink-0 text-emerald-600" />
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
                      <button
                        type="button"
                        onClick={openSidebarTheme}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        <Palette size={15} />
                        Theme settings
                      </button>
                      {hasCampusPermission('system_settings_manage') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            navigate('/campus/settings/system')
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <Settings size={15} />
                          System Settings
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
              <img src={softelligentLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
              <p className="min-w-0 truncate text-[11px] font-semibold leading-none text-slate-700">
                {headerTitle}
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

      {isSidebarThemeOpen ? (
        <SidebarThemeDialog
          initialTheme={sidebarTheme}
          onPreview={setSidebarTheme}
          onClose={closeSidebarTheme}
          onSaved={() => setIsSidebarThemeOpen(false)}
        />
      ) : null}

      <CampusNotificationsDrawer
        open={isNotificationsOpen}
        notifications={notifications}
        onClose={() => setIsNotificationsOpen(false)}
        onSelect={(item) => {
          setIsNotificationsOpen(false)
          if (item?.link === THEME_SETTINGS_NOTICE_LINK) openSidebarTheme()
          else if (item?.link) navigate(item.link)
        }}
      />
    </div>
  )
}

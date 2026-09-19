import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  HandCoins,
  UserPlus,
  X,
} from 'lucide-react'
import { groupCampusNotifications } from '../../utils/groupCampusNotifications'

function formatRelativeTime(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'Just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

function iconForNotification(item) {
  const type = item?.type || ''
  const severity = item?.severity || 'info'

  if (type === 'attendance_check_in' || type === 'day_closed' || (type === 'student_conduct' && severity === 'success')) {
    return { Icon: Check, wrap: 'bg-emerald-100 text-emerald-600' }
  }
  if (type === 'attendance_check_out' || (type === 'student_conduct' && severity === 'warning')) {
    return { Icon: Clock3, wrap: 'bg-amber-100 text-amber-600' }
  }
  if (type === 'diary_upload') {
    return { Icon: BookOpen, wrap: 'bg-sky-100 text-sky-600' }
  }
  if (type === 'student_registered') {
    return { Icon: UserPlus, wrap: 'bg-teal-100 text-teal-700' }
  }
  if (type === 'fee_received') {
    return { Icon: HandCoins, wrap: 'bg-violet-100 text-violet-700' }
  }
  if (type === 'student_conduct') {
    return { Icon: AlertTriangle, wrap: 'bg-rose-100 text-rose-600' }
  }
  if (severity === 'warning') {
    return { Icon: Clock3, wrap: 'bg-amber-100 text-amber-600' }
  }
  if (severity === 'success') {
    return { Icon: Check, wrap: 'bg-emerald-100 text-emerald-600' }
  }
  return { Icon: FileText, wrap: 'bg-slate-100 text-slate-600' }
}

export default function CampusNotificationsDrawer({ open, notifications, onClose, onSelect }) {
  const [expandedGroup, setExpandedGroup] = useState(null)

  const rows = useMemo(() => groupCampusNotifications(notifications), [notifications])

  useEffect(() => {
    if (!open) {
      setExpandedGroup(null)
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (expandedGroup) {
        setExpandedGroup(null)
        return
      }
      onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, expandedGroup])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/20 backdrop-blur-[1px]"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="campus-notifications-title"
        className="absolute inset-y-0 right-0 flex w-[min(100vw,24rem)] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)] animate-[campus-notif-slide-in_220ms_ease-out]"
      >
        <div className="flex h-[3.75rem] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <h2
            id="campus-notifications-title"
            className="flex items-center gap-2 text-[1.05rem] font-bold tracking-tight text-slate-900"
          >
            <Bell size={18} className="shrink-0 text-indigo-600" strokeWidth={2.25} />
            Notifications
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-300">
                <FileText size={22} strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium text-slate-600">No recent notifications</p>
              <p className="mt-1 text-xs text-slate-400">New updates will show up here.</p>
            </div>
          ) : (
            <ul>
              {rows.map((item) => {
                const { Icon, wrap } = iconForNotification(item)
                const isGroup = item.kind === 'group'
                const clickable = isGroup || Boolean(item.link)
                return (
                  <li key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => {
                        if (isGroup) {
                          setExpandedGroup(item)
                          return
                        }
                        if (!item.link) return
                        onSelect?.(item)
                      }}
                      className={`group relative flex w-full items-start gap-3.5 px-5 py-4 text-left transition ${
                        clickable ? 'cursor-pointer hover:bg-slate-50/90' : 'cursor-default'
                      }`}
                    >
                      {!item.read ? (
                        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-500" />
                      ) : null}
                      <span
                        className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${wrap}`}
                      >
                        <Icon size={18} strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-[0.925rem] font-semibold leading-snug text-slate-900">
                            {item.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium text-slate-400">
                            {formatRelativeTime(item.occurredAt)}
                            {isGroup ? <ChevronRight size={14} className="text-slate-300" /> : null}
                          </span>
                        </span>
                        {item.message ? (
                          <span className="mt-1 block text-[13px] leading-snug text-slate-500">
                            {item.message}
                          </span>
                        ) : null}
                        {isGroup ? (
                          <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {item.items.length} items
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {expandedGroup ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-white">
              <div className="flex h-[3.25rem] shrink-0 items-center gap-2 border-b border-slate-100 px-3">
                <button
                  type="button"
                  onClick={() => setExpandedGroup(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-800"
                  aria-label="Back"
                  title="Back"
                >
                  <ChevronRight size={16} className="rotate-180" strokeWidth={2.25} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{expandedGroup.title}</p>
                </div>
                {expandedGroup.link ? (
                  <button
                    type="button"
                    onClick={() => onSelect?.(expandedGroup)}
                    className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    See details
                  </button>
                ) : null}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {expandedGroup.items.map((item) => {
                  const { Icon, wrap } = iconForNotification(item)
                  const clickable = Boolean(item.link)
                  return (
                    <li key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => {
                          if (!clickable) return
                          onSelect?.(item)
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          clickable ? 'cursor-pointer hover:bg-slate-50/90' : 'cursor-default'
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${wrap}`}
                        >
                          <Icon size={15} strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-semibold leading-snug text-slate-800">
                              {item.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {formatRelativeTime(item.occurredAt)}
                            </span>
                          </span>
                          {item.message ? (
                            <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">
                              {item.message}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

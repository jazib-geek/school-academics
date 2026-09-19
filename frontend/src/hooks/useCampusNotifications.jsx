import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import api from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'
export const CAMPUS_REALTIME_TOASTER_ID = 'campus-realtime'
/** Match API list window used for grouping into ≤50 drawer slots. */
const MAX_NOTIFICATIONS = 200

const TYPE_ACCENT = {
  diary_upload: 'campus-realtime-toast--diary',
  attendance_check_in: 'campus-realtime-toast--check-in',
  attendance_check_out: 'campus-realtime-toast--check-out',
  student_registered: 'campus-realtime-toast--student',
  fee_received: 'campus-realtime-toast--fee',
  day_closed: 'campus-realtime-toast--day-close',
  student_conduct: 'campus-realtime-toast--conduct',
}

function accentClass(type, severity) {
  if (type === 'student_conduct') {
    if (severity === 'success') return 'campus-realtime-toast--check-in'
    if (severity === 'warning') return 'campus-realtime-toast--check-out'
    return 'campus-realtime-toast--conduct'
  }
  if (TYPE_ACCENT[type]) return TYPE_ACCENT[type]
  if (severity === 'warning') return 'campus-realtime-toast--warning'
  return 'campus-realtime-toast--info'
}

function shouldSkipForCurrentUser(notification) {
  const currentUser = (localStorage.getItem('username') || '').trim().toLowerCase()
  if (!currentUser) return false

  const actor = (notification.actorUserKey || '').trim().toLowerCase()
  const excluded = Array.isArray(notification.audience?.excludeUserKeys)
    ? notification.audience.excludeUserKeys
    : []

  if (actor && actor === currentUser) return true
  if (excluded.some((key) => String(key || '').trim().toLowerCase() === currentUser)) return true
  return false
}

function normalizeItem(notification, readOverride) {
  if (!notification?.id) return null
  return {
    id: notification.id,
    type: notification.type || '',
    title: notification.title || 'Update',
    message: notification.message || '',
    severity: notification.severity || 'info',
    link: typeof notification.link === 'string' ? notification.link.trim() : '',
    occurredAt: notification.occurredAt || new Date().toISOString(),
    read: typeof readOverride === 'boolean' ? readOverride : Boolean(notification.read),
  }
}

function normalizeList(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeItem(item))
    .filter(Boolean)
    .slice(0, MAX_NOTIFICATIONS)
}

function clearLegacyLocalCache() {
  try {
    const user = (localStorage.getItem('username') || '').trim().toLowerCase()
    if (user) localStorage.removeItem(`campusNotifications:${user}`)
  } catch {
    // ignore
  }
}

function showCampusRealtimeToast(notification, navigate) {
  if (!notification?.id) return

  const title = notification.title || 'Update'
  const message = notification.message || ''
  const link = typeof notification.link === 'string' ? notification.link.trim() : ''
  const accent = accentClass(notification.type, notification.severity)

  toast.custom(
    (t) => (
      <div className={`campus-realtime-toast ${accent}`}>
        <div className="campus-realtime-toast__body">
          <div className="campus-realtime-toast__text">
            <p className="campus-realtime-toast__title">{title}</p>
            {message ? <p className="campus-realtime-toast__message">{message}</p> : null}
          </div>
          <div className="campus-realtime-toast__actions">
            {link ? (
              <button
                type="button"
                className="campus-realtime-toast__detail"
                onClick={() => {
                  toast.dismiss(t)
                  navigate(link)
                }}
              >
                Detail
              </button>
            ) : null}
            <button
              type="button"
              className="campus-realtime-toast__close"
              aria-label="Dismiss"
              onClick={() => toast.dismiss(t)}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    ),
    {
      id: notification.id,
      toasterId: CAMPUS_REALTIME_TOASTER_ID,
      duration: 5000,
    },
  )
}

/**
 * Campus bell list comes from the DB (latest 50). SSE only adds live items + toasts.
 * Opening the drawer marks all as read (server + local state).
 */
export function useCampusNotifications() {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const [notifications, setNotifications] = useState([])
  const unreadCount = notifications.reduce((total, item) => total + (item && !item.read ? 1 : 0), 0)

  const fetchFromServer = useCallback(async () => {
    const { data } = await api.get('/api/notifications')
    setNotifications(normalizeList(data))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => (item ? { ...item, read: true } : item)))
    api.post('/api/notifications/mark-read').catch(() => {
      // Badge already cleared; next fetch will resync if mark-read failed.
    })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return undefined

    clearLegacyLocalCache()

    let cancelled = false
    let source = null
    let reconnectTimer = null
    let closed = false

    const loadHistory = async () => {
      try {
        await fetchFromServer()
      } catch {
        if (!cancelled) setNotifications([])
      }
    }

    loadHistory()

    const url = new URL('/api/notifications/stream', API_BASE_URL)
    url.searchParams.set('access_token', token)

    const connect = () => {
      if (closed) return
      source?.close()
      source = new EventSource(url.toString())

      source.addEventListener('notification', (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (shouldSkipForCurrentUser(payload)) return

          const item = normalizeItem(payload, false)
          if (!item) return

          setNotifications((prev) => {
            const rest = prev.filter((n) => n?.id && n.id !== item.id)
            return [item, ...rest].slice(0, MAX_NOTIFICATIONS)
          })
          showCampusRealtimeToast(payload, (path) => navigateRef.current(path))
        } catch {
          // Ignore malformed payloads
        }
      })

      source.onerror = () => {
        source?.close()
        source = null
        if (closed) return
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      cancelled = true
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [fetchFromServer])

  return { notifications, unreadCount, markAllRead, refresh: fetchFromServer }
}

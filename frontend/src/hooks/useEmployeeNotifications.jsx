import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import api from '../services/api'
import { dispatchEmployeeProformaLiveUpdate } from '../utils/employeeProformaLiveUpdate'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'
export const EMPLOYEE_REALTIME_TOASTER_ID = 'employee-realtime'
const MAX_NOTIFICATIONS = 200

function accentClass(type, severity) {
  if (type === 'proforma_approved' || severity === 'success') return 'campus-realtime-toast--check-in'
  if (type === 'proforma_submitted') return 'campus-realtime-toast--info'
  if (type === 'proforma_returned' || severity === 'warning') return 'campus-realtime-toast--check-out'
  if (type === 'proforma_head_comment') return 'campus-realtime-toast--info'
  if (severity === 'warning') return 'campus-realtime-toast--warning'
  return 'campus-realtime-toast--info'
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

function showEmployeeRealtimeToast(notification, navigate) {
  if (!notification?.id) return

  const title = notification.title || 'Update'
  const message = notification.message || ''
  const link = typeof notification.link === 'string' ? notification.link.trim() : ''
  const accent = accentClass(notification.type, notification.severity)

  toast.custom(
    (t) => {
      const goToLink = () => {
        toast.dismiss(t)
        if (link) navigate(link)
      }

      return (
        <div className={`campus-realtime-toast ${accent}`}>
          <div className="campus-realtime-toast__body">
            <div className="campus-realtime-toast__text">
              <p className="campus-realtime-toast__title">{title}</p>
              {message ? <p className="campus-realtime-toast__message">{message}</p> : null}
            </div>
            <div className="campus-realtime-toast__actions">
              {link ? (
                <button type="button" className="campus-realtime-toast__detail" onClick={goToLink}>
                  Open
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
      )
    },
    {
      id: notification.id,
      toasterId: EMPLOYEE_REALTIME_TOASTER_ID,
      duration: 6000,
    },
  )
}

/**
 * Employee portal bell + SSE (same pattern as campus notifications).
 */
export function useEmployeeNotifications({ enabled = true } = {}) {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const [notifications, setNotifications] = useState([])
  const unreadCount = notifications.reduce((total, item) => total + (item && !item.read ? 1 : 0), 0)

  const fetchFromServer = useCallback(async () => {
    const { data } = await api.get('/api/employee/notifications')
    setNotifications(normalizeList(data))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => (item ? { ...item, read: true } : item)))
    api.post('/api/employee/notifications/mark-read').catch(() => {})
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    const token = localStorage.getItem('employeeToken')
    if (!token) return undefined

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

    const url = new URL('/api/employee/notifications/stream', API_BASE_URL)
    url.searchParams.set('access_token', token)

    const connect = () => {
      if (closed) return
      source?.close()
      source = new EventSource(url.toString())

      source.addEventListener('notification', (event) => {
        try {
          const payload = JSON.parse(event.data)
          const item = normalizeItem(payload, false)
          if (!item) return

          setNotifications((prev) => {
            const rest = prev.filter((n) => n?.id && n.id !== item.id)
            return [item, ...rest].slice(0, MAX_NOTIFICATIONS)
          })
          dispatchEmployeeProformaLiveUpdate(payload)
          if (
            payload.type === 'proforma_approved'
            || payload.type === 'proforma_returned'
            || payload.type === 'proforma_submitted'
            || payload.type === 'proforma_head_comment'
          ) {
            showEmployeeRealtimeToast(payload, (path) => navigateRef.current(path))
          }
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
  }, [enabled, fetchFromServer])

  return { notifications, unreadCount, markAllRead, refresh: fetchFromServer }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  dismissReminder,
  listDueReminders,
  markReminderDone,
  snoozeReminder,
} from '../services/reminderService'
import { pkDateKey } from '../utils/pakistanTime'

export const REMINDERS_CHANGED_EVENT = 'campus-reminders-changed'

const CHECK_INTERVAL_MS = 10000
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function dueTime(item) {
  const value = item?.dueAtUtc || item?.snoozedUntilUtc || item?.remindAtUtc
  const time = value ? new Date(value).getTime() : NaN
  return Number.isFinite(time) ? time : null
}

function isAlarmCandidate(item) {
  return item && item.status === 'Pending' && dueTime(item) !== null
}

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT))
}

/**
 * Keeps the signed-in user's upcoming reminders in memory and rings them on screen
 * when their (Pakistan-time) due moment arrives. Snooze / done / dismiss go to the API.
 */
export default function useReminderAlarms({ active, myUserId }) {
  const [dueItems, setDueItems] = useState([])
  const [ringing, setRinging] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const ringingRef = useRef(ringing)
  ringingRef.current = ringing

  const refresh = useCallback(async () => {
    try {
      const rows = await listDueReminders()
      setDueItems(rows.filter(isAlarmCandidate))
    } catch {
      // Keep the last known list.
    }
  }, [])

  useEffect(() => {
    if (!active || !myUserId) {
      setDueItems([])
      setRinging([])
      return undefined
    }

    refresh()
    const tick = window.setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS)
    const poll = window.setInterval(refresh, REFRESH_INTERVAL_MS)
    const onVisible = () => {
      if (!document.hidden) {
        setNow(Date.now())
        refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener(REMINDERS_CHANGED_EVENT, refresh)

    return () => {
      window.clearInterval(tick)
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener(REMINDERS_CHANGED_EVENT, refresh)
    }
  }, [active, myUserId, refresh])

  // Move items whose time has come into the ringing queue.
  useEffect(() => {
    const ringingIds = new Set(ringingRef.current.map((r) => r.id))
    const fresh = dueItems.filter((item) => {
      const at = dueTime(item)
      return at !== null && at <= now && !ringingIds.has(item.id)
    })
    if (fresh.length) setRinging((prev) => [...prev, ...fresh])
  }, [dueItems, now])

  const removeEverywhere = useCallback((id) => {
    setDueItems((prev) => prev.filter((x) => x.id !== id))
    setRinging((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const upsert = useCallback(
    (item) => {
      if (!item?.id) return
      if (item.ownerUserId !== myUserId || !isAlarmCandidate(item)) {
        removeEverywhere(item.id)
        return
      }
      setDueItems((prev) => [...prev.filter((x) => x.id !== item.id), item])
      const at = dueTime(item)
      if (at !== null && at > Date.now()) setRinging((prev) => prev.filter((x) => x.id !== item.id))
      else setRinging((prev) => prev.map((x) => (x.id === item.id ? item : x)))
    },
    [myUserId, removeEverywhere],
  )

  const runAction = useCallback(
    async (id, action, successMessage) => {
      removeEverywhere(id)
      try {
        const updated = await action()
        if (updated) upsert(updated)
        if (successMessage) toast.success(successMessage)
        notifyChanged()
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Could not update the reminder. Please try again.')
        refresh()
      }
    },
    [refresh, removeEverywhere, upsert],
  )

  const snooze = useCallback(
    (id, minutes) =>
      runAction(id, () => snoozeReminder(id, minutes), `Snoozed for ${minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`}`),
    [runAction],
  )
  const done = useCallback((id) => runAction(id, () => markReminderDone(id), 'Marked as done'), [runAction])
  const dismiss = useCallback((id) => runAction(id, () => dismissReminder(id)), [runAction])

  const handleEvent = useCallback(
    (type, data) => {
      if (type === 'reminder-deleted') {
        removeEverywhere(data.id)
      } else {
        if (type === 'reminder-assigned' && data.ownerUserId === myUserId) {
          toast.info(`New ${data.kind === 'Reminder' ? 'reminder' : 'task'} from ${data.createdByName || 'a colleague'}`, {
            description: data.title,
          })
        } else if (
          type === 'reminder-updated' &&
          data.ownerUserId !== myUserId &&
          data.createdByUserId === myUserId &&
          data.status === 'Done'
        ) {
          toast.success(`${data.ownerName || 'User'} completed: ${data.title}`)
        }
        upsert(data)
      }
      notifyChanged()
    },
    [myUserId, removeEverywhere, upsert],
  )

  const todayKey = pkDateKey(new Date(now))
  const pendingTodayCount = useMemo(
    () =>
      dueItems.filter((item) => {
        const at = dueTime(item)
        return at !== null && (at <= now || pkDateKey(new Date(at)) === todayKey)
      }).length,
    [dueItems, now, todayKey],
  )

  return {
    ringing,
    current: ringing[0] || null,
    pendingTodayCount,
    snooze,
    done,
    dismiss,
    handleEvent,
    refresh,
  }
}

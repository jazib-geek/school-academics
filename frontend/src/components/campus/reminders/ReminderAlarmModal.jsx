import { useEffect, useState } from 'react'
import { AlarmClock, Check, Clock3, UserRound, Volume2, VolumeX, X } from 'lucide-react'
import { playAlarmChime } from '../../../utils/campusSounds'
import { formatPkRelative } from '../../../utils/pakistanTime'

const SNOOZE_OPTIONS = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
]

const MUTE_KEY = 'campusReminderAlarmMuted'
const CHIME_EVERY_MS = 8000
const MAX_CHIMES = 6

const KIND_LABEL = {
  Reminder: 'Reminder',
  Todo: 'To-do',
  Instruction: 'Instruction',
  Note: 'Note',
}

export default function ReminderAlarmModal({ item, queueCount, onSnooze, onDone, onDismiss }) {
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const itemId = item?.id

  useEffect(() => {
    if (!itemId || muted) return undefined
    let count = 0
    playAlarmChime()
    const timer = window.setInterval(() => {
      count += 1
      if (count >= MAX_CHIMES) {
        window.clearInterval(timer)
        return
      }
      playAlarmChime()
    }, CHIME_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [itemId, muted])

  if (!item) return null

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  }

  const assignedBy = item.ownerUserId !== item.createdByUserId ? item.createdByName : null
  const priorityLabel = item.priority >= 2 ? 'Urgent' : item.priority === 1 ? 'High priority' : null

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reminder-alarm-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-[reminder-alarm-pop_260ms_ease-out]"
      >
        <div className="relative border-b border-amber-100 bg-amber-50/80 px-5 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              {KIND_LABEL[item.kind] || 'Reminder'}
              {queueCount > 1 ? ` · 1 of ${queueCount}` : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800"
                title={muted ? 'Turn sound on' : 'Mute sound'}
                aria-label={muted ? 'Turn sound on' : 'Mute sound'}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800"
                title="Dismiss"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-3.5">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-200/70" />
              <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-amber-600 ring-1 ring-amber-200">
                <AlarmClock size={22} className="animate-[reminder-alarm-shake_1s_ease-in-out_infinite]" />
              </span>
            </span>
            <div className="min-w-0">
              <h2 id="reminder-alarm-title" className="text-lg font-bold leading-snug text-slate-900">
                {item.title}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 size={12} />
                {formatPkRelative(item.remindAtUtc || item.dueAtUtc)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          {assignedBy || priorityLabel ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {assignedBy ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                  <UserRound size={11} />
                  From {assignedBy}
                </span>
              ) : null}
              {priorityLabel ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                    item.priority >= 2 ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-amber-50 text-amber-700 ring-amber-100'
                  }`}
                >
                  {priorityLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {item.body ? (
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-[13px] leading-snug text-slate-700">
              {item.body}
            </p>
          ) : null}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Snooze for</p>
            <div className="grid grid-cols-5 gap-1.5">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => onSnooze(item.id, opt.minutes)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => onDone(item.id)}
              className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Check size={16} />
              Mark done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

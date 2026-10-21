const PK_TZ = 'Asia/Karachi'

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PK_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function pkParts(date) {
  return Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]))
}

/** `YYYY-MM-DDTHH:mm` in Pakistan time — value for `<input type="datetime-local">`. */
export function toPkInputValue(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const p = pkParts(date)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** Pakistan calendar date key `YYYY-MM-DD`. */
export function pkDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const p = pkParts(date)
  return `${p.year}-${p.month}-${p.day}`
}

/** Pakistan wall-clock date offset by whole days / at a given hour, as input value. */
export function pkInputAt({ addDays = 0, hour, minute = 0, addMinutes = 0 } = {}) {
  const base = new Date(Date.now() + addMinutes * 60000)
  if (hour === undefined && !addDays) return toPkInputValue(base)
  const p = pkParts(base)
  const hh = hour === undefined ? p.hour : String(hour).padStart(2, '0')
  const mm = hour === undefined ? p.minute : String(minute).padStart(2, '0')
  // Pakistan has no DST: fixed +05:00 offset.
  const local = new Date(`${p.year}-${p.month}-${p.day}T${hh}:${mm}:00+05:00`)
  return toPkInputValue(new Date(local.getTime() + addDays * 86400000))
}

export function formatPkDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-PK', {
    timeZone: PK_TZ,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatPkTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-PK', { timeZone: PK_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Friendly relative label: "Today 3:30 PM", "Tomorrow 9:00 AM", "21 Oct, 3:30 PM". */
export function formatPkRelative(value) {
  if (!value) return ''
  const key = pkDateKey(value)
  const today = pkDateKey()
  const tomorrow = pkDateKey(new Date(Date.now() + 86400000))
  const yesterday = pkDateKey(new Date(Date.now() - 86400000))
  if (key === today) return `Today ${formatPkTime(value)}`
  if (key === tomorrow) return `Tomorrow ${formatPkTime(value)}`
  if (key === yesterday) return `Yesterday ${formatPkTime(value)}`
  return formatPkDateTime(value)
}

export function formatPkDayHeading(value) {
  const key = pkDateKey(value)
  if (key === pkDateKey()) return 'Today'
  if (key === pkDateKey(new Date(Date.now() - 86400000))) return 'Yesterday'
  return new Date(value).toLocaleDateString('en-PK', {
    timeZone: PK_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

const PAKISTAN_TIME_ZONE = 'Asia/Karachi'

const pad2 = (value) => String(value).padStart(2, '0')

/** Calendar date in Pakistan (YYYY-MM-DD). Independent of the hosting server timezone. */
export const getPakistanTodayIso = (now = new Date()) => {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: PAKISTAN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const normalized = formatted.replace(/\//g, '-').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: PAKISTAN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)

    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value
    if (year && month && day) return `${year}-${pad2(month)}-${pad2(day)}`
  } catch {
    // Fall through to UTC+5 offset (Pakistan has no DST).
  }

  const shifted = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`
}

/** Keep YYYY-MM-DD; never allow a day after Pakistan today. */
export const clampToPakistanToday = (value) => {
  const today = getPakistanTodayIso()
  const iso = String(value ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return today
  return iso > today ? today : iso
}

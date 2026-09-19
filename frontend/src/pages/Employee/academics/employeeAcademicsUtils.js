export const getId = (item, lower = 'id', upper = 'ID') =>
  Number(item?.[lower] ?? item?.[upper] ?? 0)

export const getText = (item, lower, upper) => item?.[lower] ?? item?.[upper] ?? ''

export const getPakistanTodayIso = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const shiftPakistanIso = (iso, dayDelta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  const shifted = utcNoon + dayDelta * 24 * 60 * 60 * 1000
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(shifted))

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

export const getPakistanYesterdayIso = () => shiftPakistanIso(getPakistanTodayIso(), -1)

export const getPakistanTomorrowIso = () => shiftPakistanIso(getPakistanTodayIso(), 1)

export const getAllowedDiaryDateIsos = () => {
  const today = getPakistanTodayIso()
  return [getPakistanYesterdayIso(), today, getPakistanTomorrowIso()]
}

export const formatDateLabel = (iso) => {
  if (!iso) return '—'
  const value = `${iso}`.slice(0, 10)
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(utcNoon)
}

export const diaryDateChipLabel = (iso) => {
  const today = getPakistanTodayIso()
  if (iso === today) return 'Today'
  if (iso === getPakistanYesterdayIso()) return 'Yesterday'
  if (iso === getPakistanTomorrowIso()) return 'Tomorrow'
  return 'Date'
}

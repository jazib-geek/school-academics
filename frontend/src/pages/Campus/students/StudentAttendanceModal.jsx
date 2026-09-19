import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, Loader2, X } from 'lucide-react'
import { getStudentAttendanceHistory } from '../../../services/attendanceService'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const STATUS_STYLE = {
  P: { cell: 'bg-emerald-100 text-emerald-800', row: 'bg-emerald-50', label: 'Present', dot: 'bg-emerald-500' },
  A: { cell: 'bg-rose-100 text-rose-800', row: 'bg-rose-50', label: 'Absent', dot: 'bg-rose-500' },
  Lt: { cell: 'bg-sky-100 text-sky-800', row: 'bg-sky-50', label: 'Late', dot: 'bg-sky-500' },
  Lv: { cell: 'bg-violet-100 text-violet-800', row: 'bg-violet-50', label: 'Leave', dot: 'bg-violet-500' },
  H: { cell: 'bg-amber-100 text-amber-800', row: 'bg-amber-50', label: 'Holiday', dot: 'bg-amber-500' },
}

const SUMMARY_CARDS = [
  { key: 'P', label: 'Present', tone: 'bg-emerald-50 text-emerald-800' },
  { key: 'A', label: 'Absent', tone: 'bg-rose-50 text-rose-800' },
  { key: 'Lv', label: 'Leave', tone: 'bg-violet-50 text-violet-800' },
  { key: 'Lt', label: 'Late', tone: 'bg-sky-50 text-sky-800' },
  { key: 'H', label: 'Holiday', tone: 'bg-amber-50 text-amber-800' },
]

const pakistanParts = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

const getPakistanToday = () => {
  const parts = pakistanParts()
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
    day: Number(parts.find((p) => p.type === 'day')?.value),
  }
}

const shiftMonth = (year, month, delta) => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

const formatMonthLabel = (year, month) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

const statusKey = (status) => {
  const raw = String(status || '').trim()
  if (raw.toUpperCase() === 'LT') return 'Lt'
  if (raw.toUpperCase() === 'LV') return 'Lv'
  if (raw.toUpperCase() === 'P') return 'P'
  if (raw.toUpperCase() === 'A') return 'A'
  if (raw.toUpperCase() === 'H') return 'H'
  return raw
}

const weekdayAndDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day))
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(date),
    date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date),
    isSunday: date.getUTCDay() === 0,
  }
}

const studentRegId = (student) => student?.reg_Id ?? student?.Reg_Id
const studentName = (student) => student?.fullName ?? student?.FullName ?? 'Student'
const studentClass = (student) => student?.className ?? student?.ClassName ?? ''

function StudentAttendanceModal({ student, onClose }) {
  const current = useMemo(() => getPakistanToday(), [])
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const regId = studentRegId(student)
  const canGoNext = year < current.year || (year === current.year && month < current.month)
  const isCurrentMonth = year === current.year && month === current.month
  const lastVisibleDay = isCurrentMonth ? current.day : new Date(year, month, 0).getDate()

  const load = useCallback(async () => {
    if (!regId) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudentAttendanceHistory(regId, { year, month })
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      setRecords([])
      setError(err?.response?.data?.message || 'Unable to load attendance.')
    } finally {
      setIsLoading(false)
    }
  }, [regId, year, month])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelectedDay(null)
  }, [year, month])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const goPrev = () => {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }

  const goNext = () => {
    if (!canGoNext) return
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }

  const statusByDay = useMemo(() => {
    const map = new Map()
    for (const row of records) {
      const iso = String(row.date || '').slice(0, 10)
      const day = Number(iso.split('-')[2])
      if (!Number.isFinite(day)) continue
      map.set(day, statusKey(row.status))
    }
    return map
  }, [records])

  const counts = useMemo(() => {
    const tally = { P: 0, A: 0, Lt: 0, Lv: 0, H: 0 }
    for (const status of statusByDay.values()) {
      if (tally[status] != null) tally[status] += 1
    }
    return tally
  }, [statusByDay])

  const tableRows = useMemo(() => {
    const rows = []
    for (let day = lastVisibleDay; day >= 1; day -= 1) {
      const parts = weekdayAndDate(year, month, day)
      if (parts.isSunday) continue
      rows.push({
        day,
        weekday: parts.weekday,
        date: parts.date,
        status: statusByDay.get(day) || null,
      })
    }
    return rows
  }, [year, month, lastVisibleDay, statusByDay])

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ empty: true, key: `e-${i}`, isSunday: i === 0 })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const future = isCurrentMonth && day > current.day
      cells.push({
        empty: false,
        key: `d-${day}`,
        day,
        isSunday: new Date(year, month - 1, day).getDay() === 0,
        status: future ? null : statusByDay.get(day) || null,
        muted: future,
      })
    }
    return cells
  }, [year, month, statusByDay, isCurrentMonth, current.day])

  const className = studentClass(student)

  return (
    <div
      className="fixed inset-0 z-[84] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-attendance-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarCheck2 size={14} />
              Attendance
            </p>
            <h2 id="student-attendance-title" className="mt-0.5 truncate text-lg font-semibold text-slate-900">
              {studentName(student)}
              {className ? <span className="font-normal text-slate-500"> · {className}</span> : null}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Reg #{regId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-white"
            aria-label="Close attendance"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Prev month
          </button>
          <p className="text-sm font-semibold text-slate-900">{formatMonthLabel(year, month)}</p>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next month
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-5 gap-2 px-5 py-3">
          {SUMMARY_CARDS.map((card) => (
            <div key={card.key} className={`rounded-xl px-2 py-2 text-center ${card.tone}`}>
              <p className="text-lg font-bold leading-none">{counts[card.key] ?? 0}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center gap-2 text-slate-500">
            <Loader2 size={20} className="animate-spin text-[var(--campus-primary)]" />
            <span className="text-sm">Loading attendance…</span>
          </div>
        ) : error ? (
          <p className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[3fr_2fr]">
            <div className="min-h-0 overflow-auto border-t border-slate-100 lg:border-r lg:border-t-0">
              <table className="w-full text-left text-[13px] leading-snug">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Day</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const style = row.status ? STATUS_STYLE[row.status] : null
                    const isSelected = selectedDay === row.day
                    return (
                      <tr
                        key={row.day}
                        className={`cursor-pointer border-t border-slate-100 ${
                          isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => setSelectedDay(row.day)}
                      >
                        <td className="px-3 py-1.5 text-slate-500">{row.weekday}</td>
                        <td className="px-3 py-1.5 text-slate-800">{row.date}</td>
                        <td className="px-3 py-1.5">
                          {style ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.row} ${style.cell}`}>
                              {style.label}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 p-4 lg:border-t-0">
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {WEEKDAYS.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className={index === 0 ? 'rounded-t-md bg-slate-100 py-1 text-slate-300' : 'py-1'}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-0 grid grid-cols-7 gap-y-1.5">
                {calendarCells.map((cell, index) => {
                  const sundayCol = cell.isSunday
                    ? `bg-slate-100${index + 7 >= calendarCells.length ? ' rounded-b-md' : ''}`
                    : ''
                  if (cell.empty) {
                    return <div key={cell.key} className={sundayCol || undefined} />
                  }
                  const style = cell.status ? STATUS_STYLE[cell.status] : null
                  const isToday = isCurrentMonth && cell.day === current.day
                  const isSelected = selectedDay === cell.day
                  return (
                    <div key={cell.key} className={`flex justify-center ${sundayCol}`}>
                      <button
                        type="button"
                        disabled={cell.muted}
                        onClick={() => setSelectedDay(cell.day)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold disabled:opacity-40 ${
                          style ? style.cell : cell.isSunday ? 'text-slate-400' : 'text-slate-700'
                        } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''} ${
                          isSelected && !isToday ? 'ring-2 ring-slate-400 ring-offset-1' : ''
                        }`}
                      >
                        {cell.day}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
                {SUMMARY_CARDS.map((card) => (
                  <span key={card.key} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[card.key].dot}`} />
                    {card.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentAttendanceModal

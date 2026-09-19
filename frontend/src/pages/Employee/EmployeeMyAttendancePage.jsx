import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, Loader2, X } from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getMyEmployeeAttendance } from '../../services/employeeAttendanceService'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const CELL_STYLE = {
  ontime: { cell: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'On time' },
  late: { cell: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500', label: 'Late' },
  leftearly: { cell: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', label: 'Left early' },
  nopunch: { cell: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'No punch' },
  holiday: { cell: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', label: 'Holiday' },
  sunday: { cell: 'bg-slate-50 text-slate-400', dot: 'bg-slate-300', label: 'Sunday' },
}

const SUMMARY_CARDS = [
  { key: 'presentDays', label: 'Present', tone: 'bg-emerald-50 text-emerald-800' },
  { key: 'lateDays', label: 'Late', tone: 'bg-rose-50 text-rose-800' },
  { key: 'absentDays', label: 'No punch', tone: 'bg-slate-100 text-slate-700' },
  { key: 'holidayDays', label: 'Holiday', tone: 'bg-amber-50 text-amber-800' },
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

const dayKind = (day) => {
  if (!day) return null
  if (day.isHoliday) return 'holiday'
  if (day.hasPunch) {
    const label = String(day.statusLabel || '').trim()
    if (label === 'Left early') return 'leftearly'
    if (label === 'Late' || label === 'Late, left early' || day.isLate) return 'late'
    return 'ontime'
  }
  const iso = String(day.date || '').slice(0, 10)
  const weekday = iso ? new Date(`${iso}T12:00:00`).getDay() : null
  if (weekday === 0) return 'sunday'
  return 'nopunch'
}

const statusTone = (day) => {
  const label = String(day?.statusLabel || '').trim()
  if (label === 'Holiday' || day?.isHoliday) return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (label === 'Late' || label === 'Late, left early') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (label === 'Left early') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (label === 'On time') return 'bg-sky-50 text-sky-800 ring-sky-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

function to12Hour(value) {
  if (!value) return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return text
  let hours = Number(match[1])
  const minutes = match[2]
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return text
  const suffix = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes} ${suffix}`
}

const inTimeClass = (day) => {
  if (!day?.hasPunch || !day.checkInTime) return 'text-slate-800'
  return day.isLate ? 'text-rose-600' : 'text-emerald-600'
}

const lateMinsDisplay = (day) => {
  if (!day?.hasPunch) return '—'
  const minutes = Number(day.lateMinutes ?? 0)
  if (!Number.isFinite(minutes) || minutes <= 0) return '0'
  if (minutes <= 60) return String(minutes)
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining === 0 ? `${hours}hr` : `${hours}hr ${remaining}m`
}

function DayDetailSheet({ employeeName, day, onClose }) {
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

  const inLabel = to12Hour(day.checkInTime) || '—'
  const outLabel = to12Hour(day.checkOutTime) || '—'

  return (
    <div
      role="presentation"
      className="emp-modal-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-day-detail-title"
        className="emp-modal-card w-full max-w-sm rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl sm:px-5 sm:pb-5 sm:pt-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id="emp-day-detail-title" className="truncate text-base font-semibold text-slate-900">
              {employeeName || 'You'}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{day.dayLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="emp-icon-btn shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">In</dt>
            <dd className={`font-semibold ${inTimeClass(day)}`}>{inLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Out</dt>
            <dd className="font-semibold text-slate-800">{outLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Late mins</dt>
            <dd className="font-semibold text-slate-800">{lateMinsDisplay(day)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone(day)}`}
              >
                {day.statusLabel}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5" role="group" aria-label="Attendance view">
      <button
        type="button"
        onClick={() => onChange('calendar')}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
          view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
        }`}
        aria-pressed={view === 'calendar'}
        aria-label="Calendar view"
      >
        <CalendarDays size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
          view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
        }`}
        aria-pressed={view === 'table'}
        aria-label="Table view"
      >
        <List size={16} />
      </button>
    </div>
  )
}

function EmployeeMyAttendancePage() {
  const current = useMemo(() => getPakistanToday(), [])
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [detailDay, setDetailDay] = useState(null)
  const [view, setView] = useState('table')

  const canGoNext = year < current.year || (year === current.year && month < current.month)
  const isCurrentMonth = year === current.year && month === current.month

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await getMyEmployeeAttendance({ year, month }))
    } catch (err) {
      setData(null)
      setError(err?.response?.data?.message || 'Unable to load your attendance.')
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setDetailDay(null)
    setSelectedDay(null)
  }, [year, month])

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

  const daysByNumber = useMemo(() => {
    const map = new Map()
    for (const day of data?.days || []) {
      const iso = String(day.date || '').slice(0, 10)
      const num = Number(iso.split('-')[2])
      if (Number.isFinite(num)) map.set(num, day)
    }
    return map
  }, [data])

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ empty: true, key: `e-${i}`, isSunday: i === 0 })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        empty: false,
        key: `d-${day}`,
        day,
        isSunday: new Date(year, month - 1, day).getDay() === 0,
        record: daysByNumber.get(day) || null,
      })
    }
    return cells
  }, [year, month, daysByNumber])

  const openDay = (record) => {
    if (!record) return
    const iso = String(record.date || '').slice(0, 10)
    const num = Number(iso.split('-')[2])
    if (Number.isFinite(num)) setSelectedDay(num)
    setDetailDay(record)
  }

  const todayRecord = isCurrentMonth ? daysByNumber.get(current.day) : null
  const todayLabel = todayRecord?.statusLabel || '—'
  const tableRows = (data?.days || []).filter((day) => {
    const iso = String(day.date || '').slice(0, 10)
    if (!iso) return true
    return new Date(`${iso}T12:00:00`).getDay() !== 0
  })

  return (
    <EmployeeLayout
      title="My attendance"
      subtitle={data?.monthLabel || 'Your check-in history'}
      showProfileCard={false}
      compactContentTop
    >
      <div className="space-y-3 pb-2">
        <EmployeeBackButton />

        {data ? (
          <section className="emp-surface rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                {data.employeeName || 'You'}
                {data.designationName ? (
                  <span className="font-normal text-slate-500"> · {data.designationName}</span>
                ) : null}
              </p>
              <ViewToggle view={view} onChange={setView} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
                <p className="mt-0.5 font-semibold text-slate-800">{isCurrentMonth ? todayLabel : '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">This month</p>
                <p className="mt-0.5 font-semibold text-slate-800">{data.presentDays ?? 0} present</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              {SUMMARY_CARDS.map((card) => (
                <div key={card.key} className={`rounded-xl px-1 py-2 text-center ${card.tone}`}>
                  <p className="text-base font-bold leading-none">{data[card.key] ?? 0}</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="emp-surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={goPrev} className="emp-icon-btn" aria-label="Previous month">
              <ChevronLeft size={20} />
            </button>
            <p className="min-w-0 truncate text-center text-sm font-semibold text-slate-900">
              {data?.monthLabel || `${year}-${String(month).padStart(2, '0')}`}
            </p>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="emp-icon-btn disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              Loading…
            </div>
          ) : error ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : view === 'table' ? (
            <div className="mt-4 overflow-x-auto">
              <table className="emp-attendance-table w-full min-w-[420px] text-left text-[13px] leading-snug">
                <thead>
                  <tr className="emp-attendance-header text-[11px] uppercase tracking-wide">
                    <th className="rounded-l-xl px-3 py-2">Date</th>
                    <th className="px-3 py-2">In</th>
                    <th className="px-3 py-2">Out</th>
                    <th className="rounded-r-xl px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                        No days for this month.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((day) => (
                      <tr
                        key={String(day.date)}
                        className="emp-table-row cursor-pointer"
                        onClick={() => openDay(day)}
                      >
                        <td className="px-3 py-1.5 font-medium text-slate-800">{day.dayLabel}</td>
                        <td className={`px-3 py-1.5 font-semibold ${inTimeClass(day)}`}>
                          {to12Hour(day.checkInTime) || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">{to12Hour(day.checkOutTime) || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusTone(day)}`}
                          >
                            {day.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                  const kind = dayKind(cell.record)
                  const style = kind ? CELL_STYLE[kind] : null
                  const isToday = isCurrentMonth && cell.day === current.day
                  const isSelected = cell.day === selectedDay
                  const canSelect = Boolean(cell.record)
                  return (
                    <div key={cell.key} className={`flex justify-center ${sundayCol}`}>
                      <button
                        type="button"
                        disabled={!canSelect}
                        onClick={() => openDay(cell.record)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold disabled:opacity-40 ${
                          style ? style.cell : 'text-slate-400'
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
                {Object.entries(CELL_STYLE).map(([key, meta]) => (
                  <span key={key} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {detailDay ? (
        <DayDetailSheet
          employeeName={data?.employeeName}
          day={detailDay}
          onClose={() => setDetailDay(null)}
        />
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeMyAttendancePage

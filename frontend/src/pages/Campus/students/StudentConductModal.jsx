import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, X } from 'lucide-react'
import {
  getStudentConductHistory,
  notePolarity,
} from '../../../services/studentConductService'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const POLARITY_STYLE = {
  good: { cell: 'bg-emerald-100 text-emerald-800', label: 'Good', dot: 'bg-emerald-500' },
  bad: { cell: 'bg-rose-100 text-rose-800', label: 'Needs work', dot: 'bg-rose-500' },
  mixed: { cell: 'bg-amber-100 text-amber-900', label: 'Mixed', dot: 'bg-amber-500' },
  none: { cell: 'bg-slate-100 text-slate-700', label: 'Note', dot: 'bg-slate-400' },
}

const SUMMARY_CARDS = [
  { key: 'good', label: 'Good', tone: 'bg-emerald-50 text-emerald-800' },
  { key: 'bad', label: 'Needs work', tone: 'bg-rose-50 text-rose-800' },
  { key: 'mixed', label: 'Mixed', tone: 'bg-amber-50 text-amber-900' },
  { key: 'total', label: 'Total', tone: 'bg-slate-100 text-slate-800' },
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

const noteDateKey = (value) => String(value || '').slice(0, 10)

const weekdayAndDate = (iso) => {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return { weekday: '—', date: iso || '—' }
  }
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(date),
    date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date),
  }
}

const formatTags = (tags = []) =>
  tags
    .map((tag) => tag?.name)
    .filter(Boolean)
    .join(', ')

const dayPolarityFromNotes = (notes) => {
  let hasGood = false
  let hasBad = false
  for (const note of notes || []) {
    const polarity = notePolarity(note)
    if (polarity === 'good' || polarity === 'mixed') hasGood = true
    if (polarity === 'bad' || polarity === 'mixed') hasBad = true
  }
  if (hasGood && hasBad) return 'mixed'
  if (hasGood) return 'good'
  if (hasBad) return 'bad'
  return notes?.length ? 'none' : null
}

const studentRegId = (student) => student?.reg_Id ?? student?.Reg_Id
const studentName = (student) => student?.fullName ?? student?.FullName ?? 'Student'
const studentClass = (student) => student?.className ?? student?.ClassName ?? ''

function StudentConductModal({ student, onClose }) {
  const current = useMemo(() => getPakistanToday(), [])
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const regId = studentRegId(student)
  const canGoNext = year < current.year || (year === current.year && month < current.month)
  const isCurrentMonth = year === current.year && month === current.month

  const load = useCallback(async () => {
    if (!regId) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudentConductHistory(regId, { year, month })
      setNotes(Array.isArray(data?.notes) ? data.notes : [])
    } catch (err) {
      setNotes([])
      setError(err?.response?.data?.message || 'Unable to load conduct.')
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

  const notesByDay = useMemo(() => {
    const map = new Map()
    for (const note of notes) {
      const iso = noteDateKey(note.noteDate)
      const day = Number(iso.split('-')[2])
      if (!Number.isFinite(day)) continue
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(note)
    }
    return map
  }, [notes])

  const polarityByDay = useMemo(() => {
    const map = new Map()
    for (const [day, dayNotes] of notesByDay.entries()) {
      map.set(day, dayPolarityFromNotes(dayNotes))
    }
    return map
  }, [notesByDay])

  const counts = useMemo(() => {
    const tally = { good: 0, bad: 0, mixed: 0, total: notes.length }
    for (const note of notes) {
      const polarity = notePolarity(note)
      if (polarity === 'good') tally.good += 1
      else if (polarity === 'bad') tally.bad += 1
      else if (polarity === 'mixed') tally.mixed += 1
    }
    return tally
  }, [notes])

  const tableRows = useMemo(() => {
    const filtered = selectedDay
      ? notes.filter((note) => Number(noteDateKey(note.noteDate).split('-')[2]) === selectedDay)
      : notes

    return [...filtered]
      .sort((a, b) => {
        const dateCmp = noteDateKey(b.noteDate).localeCompare(noteDateKey(a.noteDate))
        if (dateCmp !== 0) return dateCmp
        return (b.id || 0) - (a.id || 0)
      })
      .map((note) => {
        const iso = noteDateKey(note.noteDate)
        const parts = weekdayAndDate(iso)
        return {
          note,
          iso,
          day: Number(iso.split('-')[2]),
          weekday: parts.weekday,
          date: parts.date,
          polarity: notePolarity(note),
        }
      })
  }, [notes, selectedDay])

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
        polarity: future ? null : polarityByDay.get(day) || null,
        muted: future,
      })
    }
    return cells
  }, [year, month, polarityByDay, isCurrentMonth, current.day])

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
        aria-labelledby="student-conduct-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardCheck size={14} />
              Conduct
            </p>
            <h2 id="student-conduct-title" className="mt-0.5 truncate text-lg font-semibold text-slate-900">
              {studentName(student)}
              {className ? <span className="font-normal text-slate-500"> · {className}</span> : null}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Reg #{regId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-white"
            aria-label="Close conduct"
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

        <div className="grid shrink-0 grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-4">
          {SUMMARY_CARDS.map((card) => (
            <div key={card.key} className={`rounded-xl px-2 py-2 text-center ${card.tone}`}>
              <p className="text-lg font-bold leading-none">{counts[card.key] ?? 0}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center gap-2 text-slate-500">
            <Loader2 size={20} className="animate-spin text-[var(--campus-primary)]" />
            <span className="text-sm">Loading conduct…</span>
          </div>
        ) : error ? (
          <p className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[3fr_2fr]">
            <div className="min-h-0 overflow-auto border-t border-slate-100 lg:border-r lg:border-t-0">
              {selectedDay ? (
                <div className="sticky top-0 z-[2] flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50 px-3 py-2">
                  <p className="text-[12px] font-medium text-indigo-900">
                    Showing {weekdayAndDate(
                      `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
                    ).date}{' '}
                    only
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="rounded-md bg-white px-2 py-1 text-[12px] font-semibold text-[var(--campus-primary)] ring-1 ring-indigo-200 hover:bg-indigo-100"
                  >
                    Show full month
                  </button>
                </div>
              ) : null}
              <table className="w-full text-left text-[13px] leading-snug">
                <thead
                  className={`sticky z-[1] bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 ${
                    selectedDay ? 'top-10' : 'top-0'
                  }`}
                >
                  <tr>
                    <th className="px-3 py-2 font-semibold">Day</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Item</th>
                    <th className="px-3 py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        {selectedDay
                          ? 'No conduct notes on this day.'
                          : 'No conduct notes this month.'}
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row) => {
                      const style = POLARITY_STYLE[row.polarity] || POLARITY_STYLE.none
                      const isSelected = selectedDay === row.day
                      return (
                        <tr
                          key={row.note.id}
                          className={`cursor-pointer border-t border-slate-100 ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50/70'
                          }`}
                          onClick={() =>
                            setSelectedDay((previous) => (previous === row.day ? null : row.day))
                          }
                        >
                          <td className="px-3 py-1.5 text-slate-500">{row.weekday}</td>
                          <td className="px-3 py-1.5 text-slate-800">{row.date}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.cell}`}
                            >
                              {row.note.conductTypeName || style.label}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {formatTags(row.note.tags) || '—'}
                          </td>
                          <td className="max-w-[12rem] truncate px-3 py-1.5 text-slate-600">
                            {row.note.remarks || '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
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
                  const style = cell.polarity ? POLARITY_STYLE[cell.polarity] : null
                  const isToday = isCurrentMonth && cell.day === current.day
                  const isSelected = selectedDay === cell.day
                  return (
                    <div key={cell.key} className={`flex justify-center ${sundayCol}`}>
                      <button
                        type="button"
                        disabled={cell.muted}
                        onClick={() =>
                          setSelectedDay((previous) => (previous === cell.day ? null : cell.day))
                        }
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
                {['good', 'bad', 'mixed'].map((key) => (
                  <span key={key} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${POLARITY_STYLE[key].dot}`} />
                    {POLARITY_STYLE[key].label}
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

export default StudentConductModal

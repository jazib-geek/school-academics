import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { EmployeeAsyncSelect as AsyncSelect } from '../../components/employee/EmployeeSelect'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getStudentAttendanceHistory } from '../../services/attendanceService'
import { searchStudents } from '../../services/studentService'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const STATUS_STYLE = {
  P: { cell: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'Present' },
  A: { cell: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500', label: 'Absent' },
  Lt: { cell: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', label: 'Late' },
  Lv: { cell: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', label: 'Leave' },
  H: { cell: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', label: 'Holiday' },
}

const SUMMARY_CARDS = [
  { key: 'P', label: 'Present', tone: 'bg-emerald-50 text-emerald-800' },
  { key: 'A', label: 'Absent', tone: 'bg-rose-50 text-rose-800' },
  { key: 'Lv', label: 'Leave', tone: 'bg-violet-50 text-violet-800' },
  { key: 'Lt', label: 'Late', tone: 'bg-sky-50 text-sky-800' },
  { key: 'H', label: 'Holiday', tone: 'bg-amber-50 text-amber-800' },
]

function debouncePromise(fn, waitMs) {
  let timeoutId
  return (...args) =>
    new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fn(...args)
          .then(resolve)
          .catch(() => resolve([]))
      }, waitMs)
    })
}

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

const normalizeClassName = (className) => {
  const parts = (className || '')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    parts.splice(1, 1)
  }

  return parts.join(' - ')
}

const mapStudentOption = (student) => {
  const regId = student.reg_Id ?? student.Reg_Id
  const fullName = student.fullName ?? student.FullName ?? 'Student'
  const className = normalizeClassName(student.className ?? student.ClassName)
  return {
    value: regId,
    label: className ? `${fullName} (${className})` : fullName,
    student,
  }
}

const statusKey = (status) => {
  const raw = String(status || '').trim()
  if (raw.toUpperCase() === 'LT') return 'Lt'
  if (raw.toUpperCase() === 'LV') return 'Lv'
  if (raw.toUpperCase() === 'P') return 'P'
  if (raw.toUpperCase() === 'A') return 'A'
  if (raw.toUpperCase() === 'H') return 'H'
  return raw
}

function EmployeeStudentAttendancePage() {
  const current = useMemo(() => getPakistanToday(), [])
  const [selected, setSelected] = useState(null)
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const shouldScrollToBottomRef = useRef(false)

  const canGoNext = year < current.year || (year === current.year && month < current.month)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentOption)
    }, 300),
  ).current

  const loadHistory = useCallback(async (studentId, targetYear, targetMonth) => {
    if (!studentId) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudentAttendanceHistory(studentId, {
        year: targetYear,
        month: targetMonth,
      })
      setRecords(Array.isArray(data) ? data : [])
      shouldScrollToBottomRef.current = true
    } catch (err) {
      setRecords([])
      shouldScrollToBottomRef.current = false
      setError(err?.response?.data?.message || 'Unable to load this student’s attendance.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selected?.value) {
      setRecords([])
      shouldScrollToBottomRef.current = false
      return
    }
    void loadHistory(selected.value, year, month)
  }, [selected, year, month, loadHistory])

  useEffect(() => {
    if (isLoading || error || !selected || !shouldScrollToBottomRef.current) return
    shouldScrollToBottomRef.current = false
    const timer = window.setTimeout(() => {
      const scroller = document.scrollingElement || document.documentElement
      const top = Math.max(scroller.scrollHeight, document.body.scrollHeight)
      scroller.scrollTo({ top, behavior: 'smooth' })
      window.scrollTo({ top, behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [isLoading, error, selected, records])

  const onSelectStudent = (option) => {
    setSelected(option)
    setYear(current.year)
    setMonth(current.month)
  }

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
        status: statusByDay.get(day) || null,
      })
    }
    return cells
  }, [year, month, statusByDay])

  const isCurrentMonth = year === current.year && month === current.month
  const todayStatus = isCurrentMonth ? statusByDay.get(current.day) : null
  const todayLabel = todayStatus ? STATUS_STYLE[todayStatus]?.label || '—' : '—'

  return (
    <EmployeeLayout
      title="Search Student Attendance"
      subtitle="Find a student and review their month"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <EmployeeBackButton />

      <section className="emp-surface rounded-2xl p-4">
        <label className="text-xs font-medium text-slate-600">
          Student
          <div className="mt-1">
            <AsyncSelect
              cacheOptions
              defaultOptions={false}
              isClearable
              placeholder="Type a name…"
              loadOptions={loadStudentOptions}
              value={selected}
              onChange={onSelectStudent}
              noOptionsMessage={({ inputValue }) =>
                inputValue?.trim().length >= 2 ? 'No matching students' : 'Type at least 2 letters'
              }
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '44px',
                  borderRadius: '0.75rem',
                  borderColor: '#cbd5e1',
                  boxShadow: 'none',
                }),
                menu: (base) => ({ ...base, zIndex: 70, borderRadius: '0.75rem' }),
              }}
            />
          </div>
        </label>
      </section>

      {!selected ? (
        <section className="emp-surface rounded-2xl px-4 py-10 text-center text-sm text-slate-500">
          Search for a student to see their attendance calendar.
        </section>
      ) : (
        <div className="space-y-3">
          <section className="emp-surface rounded-2xl p-4">
            <p className="truncate text-sm font-semibold text-slate-900">{selected.label}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
                <p className="mt-0.5 font-semibold text-slate-800">{isCurrentMonth ? todayLabel : '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">This month</p>
                <p className="mt-0.5 font-semibold text-slate-800">{counts.P + counts.Lt} present</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {SUMMARY_CARDS.map((card) => (
                <div key={card.key} className={`rounded-xl px-1 py-2 text-center ${card.tone}`}>
                  <p className="text-base font-bold leading-none">{counts[card.key] ?? 0}</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="emp-surface rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={goPrev} className="emp-icon-btn" aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <p className="min-w-0 truncate text-center text-sm font-semibold text-slate-900">
                {formatMonthLabel(year, month)}
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
                    const style = cell.status ? STATUS_STYLE[cell.status] : null
                    const isToday = isCurrentMonth && cell.day === current.day
                    return (
                      <div key={cell.key} className={`flex justify-center ${sundayCol}`}>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                            style ? style.cell : cell.isSunday ? 'text-slate-400' : 'text-slate-700'
                          } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                        >
                          {cell.day}
                        </span>
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
              </>
            )}
          </section>
        </div>
      )}
    </EmployeeLayout>
  )
}

export default EmployeeStudentAttendancePage

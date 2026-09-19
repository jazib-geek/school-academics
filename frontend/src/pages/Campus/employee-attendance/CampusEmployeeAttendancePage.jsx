import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Printer, RefreshCw, Search, X } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getEmployeeAttendanceMonthlySheet } from '../../../services/employeeAttendanceService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const getPakistanTodayIso = () => {
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

const getPakistanMonthValue = () => {
  const today = getPakistanTodayIso()
  return today.slice(0, 7)
}

const parseMonthValue = (value) => {
  if (!value || !value.includes('-')) return { year: null, month: null }
  const [yearStr, monthStr] = value.split('-')
  return {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
  }
}

const formatMonthLabel = (year, month) => {
  if (!year || !month) return ''
  const utc = Date.UTC(year, month - 1, 1, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc)
}

const formatCiTime = (value) => {
  if (!value || typeof value !== 'string') return null
  const short = value.length >= 5 ? value.slice(0, 5) : value
  const [hStr, mStr = '00'] = short.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatDisplayTime = (value) => {
  if (!value || typeof value !== 'string') return '—'
  const short = value.length >= 5 ? value.slice(0, 5) : value
  const [hStr, mStr = '00'] = short.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const buildMonthDays = (year, month) => {
  if (!year || !month) return []
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const days = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    const weekday = date.getUTCDay()
    if (weekday === 0) continue
    days.push({
      day,
      weekday,
      weekdayLabel: WEEKDAY_SHORT[weekday],
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    })
  }
  return days
}

const formatDurationMinutes = (minutes) => {
  const n = Math.max(0, Math.round(Number(minutes) || 0))
  if (n <= 0) return null
  if (n < 60) return `${n} min`
  const hours = Math.floor(n / 60)
  const rem = n % 60
  const hourLabel = hours === 1 ? 'hour' : 'hours'
  if (rem === 0) return `${hours} ${hourLabel}`
  return `${hours} ${hourLabel} ${rem} min`
}

const dayKeyFromDate = (value) => {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function CampusEmployeeAttendancePage() {
  const [monthValue, setMonthValue] = useState(getPakistanMonthValue)
  const [sheet, setSheet] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCell, setSelectedCell] = useState(null)
  const tipRef = useRef(null)

  const { year, month } = parseMonthValue(monthValue)
  const monthDays = useMemo(() => buildMonthDays(year, month), [year, month])
  const todayIso = useMemo(() => getPakistanTodayIso(), [])

  const loadSheet = useCallback(async () => {
    if (!year || !month) return

    setIsLoading(true)
    setError('')
    setSelectedCell(null)
    try {
      const data = await getEmployeeAttendanceMonthlySheet({ year, month })
      setSheet(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load monthly attendance.')
      setSheet(null)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void loadSheet()
  }, [loadSheet])

  useEffect(() => {
    if (!selectedCell) return undefined

    const onPointerDown = (event) => {
      if (tipRef.current && !tipRef.current.contains(event.target)) {
        setSelectedCell(null)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedCell(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedCell])

  const employees = useMemo(() => {
    const rows = [...(sheet?.employees || [])]
    rows.sort((a, b) =>
      String(a.employeeName || '')
        .localeCompare(String(b.employeeName || ''), undefined, { sensitivity: 'base', numeric: true }),
    )
    return rows
  }, [sheet])

  const filteredEmployees = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return employees
    return employees.filter((emp) => {
      const name = (emp.employeeName || '').toLowerCase()
      const designation = (emp.designationName || '').toLowerCase()
      const id = String(emp.employeeId || '')
      return name.includes(keyword) || designation.includes(keyword) || id.includes(keyword)
    })
  }, [employees, searchText])

  const attendanceMaps = useMemo(() => {
    const maps = new Map()
    for (const emp of employees) {
      const byDay = new Map()
      for (const day of emp.days || []) {
        const key = dayKeyFromDate(day.date)
        if (key) byDay.set(key, day)
      }
      maps.set(emp.employeeId, byDay)
    }
    return maps
  }, [employees])

  const isHolidayRow = (dayRow) => {
    const status = (dayRow?.status || '').toLowerCase()
    return status === 'holiday' || status === 'h'
  }

  const openCell = (event, employee, dayMeta, dayRow) => {
    event.stopPropagation()
    if (!dayRow || (!dayRow.checkInTime && !dayRow.checkOutTime && !isHolidayRow(dayRow))) {
      setSelectedCell(null)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const tipWidth = 220
    const tipHeight = 150
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - tipWidth / 2),
      window.innerWidth - tipWidth - 12,
    )
    const preferBelow = rect.bottom + tipHeight + 12 < window.innerHeight
    const top = preferBelow ? rect.bottom + 8 : Math.max(12, rect.top - tipHeight - 8)

    setSelectedCell({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName || `Employee ${employee.employeeId}`,
      day: dayMeta.day,
      weekdayLabel: dayMeta.weekdayLabel,
      iso: dayMeta.iso,
      dayRow,
      left,
      top,
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <CampusShell headerContext="Monthly attendance">
      <div className="min-w-0 px-4 pb-8 pt-[4.25rem] print:px-0 print:pt-0 lg:px-6">
        <div className="mx-auto max-w-[1600px] min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-0 print:shadow-none">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Monthly attendance</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Check-in times by day. Tap a cell for check-out, late count, and status.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="text-xs font-medium text-slate-600">
                  Month
                  <input
                    type="month"
                    value={monthValue}
                    onChange={(e) => setMonthValue(e.target.value)}
                    className="mt-1 block h-10 w-full min-w-[11rem] rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-auto"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void loadSheet()}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#344574] disabled:opacity-60 print:hidden"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!sheet || isLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 print:hidden"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1 print:hidden">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="filterMonthlyAttendanceSearch"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search employee"
                  className="h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </div>

              {sheet ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {formatMonthLabel(sheet.year, sheet.month)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {sheet.totalEmployees} staff
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-800">
                    Present = time · Absent = A · Holiday = H
                  </span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-800">
                    Late check-in in red
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {error ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </section>
          ) : null}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border print:shadow-none">
            {isLoading && !sheet ? (
              <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
                Loading monthly attendance…
              </div>
            ) : sheet ? (
              <div className="relative max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto print:max-h-none">
                <table className="w-max min-w-full border-collapse text-[11px] leading-tight">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-[var(--campus-primary)] text-white">
                      <th className="sticky left-0 z-30 min-w-[10rem] border-b border-r border-[#344574] bg-[var(--campus-primary)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide shadow-[4px_0_8px_-4px_rgba(15,23,42,0.35)]">
                        Employee
                      </th>
                      {monthDays.map((day) => (
                        <th
                          key={day.iso}
                          className="min-w-[2.75rem] border-b border-r border-[#344574] px-1 py-1.5 text-center font-semibold"
                        >
                          <div className="text-[11px] leading-none">{day.day}</div>
                          <div className="mt-0.5 text-[9px] font-medium uppercase opacity-80">{day.weekdayLabel}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, index) => {
                      const byDay = attendanceMaps.get(emp.employeeId) || new Map()
                      return (
                        <tr
                          key={emp.employeeId}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          <td
                            className={`sticky left-0 z-10 max-w-[12rem] border-b border-r border-slate-200 px-3 py-1.5 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.25)] ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <p className="truncate font-semibold text-[var(--campus-primary)]">
                              {emp.employeeName || '—'}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              #{emp.employeeId}
                              {emp.designationName ? ` · ${emp.designationName}` : ''}
                            </p>
                          </td>
                          {monthDays.map((day) => {
                            const row = byDay.get(day.iso)
                            const ci = formatCiTime(row?.checkInTime)
                            const isHoliday = isHolidayRow(row)
                            const isLate = Boolean(row?.isLate)
                            const isFutureDay = day.iso > todayIso
                            const isSelected =
                              selectedCell?.employeeId === emp.employeeId && selectedCell?.iso === day.iso

                            return (
                              <td
                                key={`${emp.employeeId}-${day.iso}`}
                                className="border-b border-r border-slate-200 px-0.5 py-0.5 text-center"
                              >
                                {isHoliday ? (
                                  <button
                                    type="button"
                                    onClick={(event) => openCell(event, emp, day, row)}
                                    className={`mx-auto block w-full rounded px-0.5 py-1 text-[11px] font-bold text-amber-700 transition hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                                      isSelected ? 'bg-amber-50 ring-1 ring-amber-300' : ''
                                    }`}
                                    title="Holiday"
                                  >
                                    H
                                  </button>
                                ) : ci ? (
                                  <button
                                    type="button"
                                    onClick={(event) => openCell(event, emp, day, row)}
                                    className={`mx-auto block w-full rounded px-0.5 py-1 font-mono text-[10px] font-semibold tabular-nums transition hover:bg-slate-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                                      isLate ? 'text-rose-600' : 'text-emerald-700'
                                    } ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''}`}
                                    title="View details"
                                  >
                                    {ci}
                                  </button>
                                ) : isFutureDay ? null : (
                                  <span className="mx-auto block px-0.5 py-1 text-[11px] font-bold text-rose-500">
                                    A
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filteredEmployees.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-slate-500">No employees match your search.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {selectedCell ? (
        <div
          ref={tipRef}
          role="dialog"
          aria-label="Attendance details"
          className="fixed z-[90] w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl print:hidden"
          style={{ left: selectedCell.left, top: selectedCell.top }}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{selectedCell.employeeName}</p>
              <p className="text-xs text-slate-500">
                {selectedCell.weekdayLabel} {selectedCell.day}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">IN</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  selectedCell.dayRow?.isLate ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatDisplayTime(selectedCell.dayRow?.checkInTime)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">OUT</dt>
              <dd className="font-semibold tabular-nums text-slate-800">
                {formatDisplayTime(selectedCell.dayRow?.checkOutTime)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">LC</dt>
              <dd className="font-semibold text-slate-800">{selectedCell.dayRow?.lateComings ?? 0}</dd>
            </div>
            {formatDurationMinutes(selectedCell.dayRow?.lateMinutes) ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Late</dt>
                <dd className="font-semibold text-rose-700">
                  {formatDurationMinutes(selectedCell.dayRow?.lateMinutes)}
                </dd>
              </div>
            ) : null}
            {formatDurationMinutes(selectedCell.dayRow?.earlyMinutes) ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Early leave</dt>
                <dd className="font-semibold text-amber-700">
                  {formatDurationMinutes(selectedCell.dayRow?.earlyMinutes)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Status</dt>
              <dd
                className={`rounded px-1.5 py-0.5 font-semibold ${
                  isHolidayRow(selectedCell.dayRow)
                    ? 'bg-amber-50 text-amber-800'
                    : selectedCell.dayRow?.isLate
                      ? 'bg-rose-50 text-rose-700'
                      : selectedCell.dayRow?.checkInTime
                        ? 'bg-sky-50 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedCell.dayRow?.status ||
                  (selectedCell.dayRow?.isLate ? 'Late' : 'On time')}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          table { font-size: 8px !important; }
          th, td { padding: 1px 2px !important; }
        }
      `}</style>
    </CampusShell>
  )
}

export default CampusEmployeeAttendancePage

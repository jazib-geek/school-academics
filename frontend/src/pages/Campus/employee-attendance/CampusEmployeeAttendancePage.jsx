import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock, Loader2, Search } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getEmployeeAttendanceMonthlySheet } from '../../../services/employeeAttendanceService'

const getPakistanMonthValue = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return `${year}-${month}`
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

const formatDayLabel = (isoDate) => {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short' })
}

const formatTime12Hour = (value) => {
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

const lateBadgeClass = (lateComings) => {
  const n = lateComings ?? 0
  if (n <= 0) return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (n <= 2) return 'bg-amber-100 text-amber-900 ring-amber-200'
  return 'bg-rose-100 text-rose-800 ring-rose-200'
}

const lateLabel = (lateComings) => {
  const n = lateComings ?? 0
  if (n <= 0) return '0'
  return String(n)
}

function CampusEmployeeAttendancePage() {
  const [monthValue, setMonthValue] = useState(getPakistanMonthValue)
  const [sheet, setSheet] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { year, month } = parseMonthValue(monthValue)

  const loadSheet = useCallback(async () => {
    if (!year || !month) return

    setIsLoading(true)
    setError('')
    try {
      const data = await getEmployeeAttendanceMonthlySheet({ year, month })
      setSheet(data)
      setExpandedIds(
        new Set(
          (data?.employees || [])
            .filter((e) => (e.dayCount || 0) > 0)
            .map((e) => e.employeeId),
        ),
      )
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load employee attendance.')
      setSheet(null)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadSheet()
  }, [loadSheet])

  const filteredEmployees = useMemo(() => {
    const employees = sheet?.employees || []
    if (!searchText.trim()) return employees

    const keyword = searchText.trim().toLowerCase()
    return employees.filter((emp) => {
      const name = (emp.employeeName || '').toLowerCase()
      const designation = (emp.designationName || '').toLowerCase()
      const id = String(emp.employeeId || '')
      return name.includes(keyword) || designation.includes(keyword) || id.includes(keyword)
    })
  }, [sheet, searchText])

  const toggleExpanded = (employeeId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const expandAll = () => {
    setExpandedIds(new Set(filteredEmployees.map((e) => e.employeeId)))
  }

  const collapseAll = () => setExpandedIds(new Set())

  return (
    <CampusShell headerContext="Employee attendance">
      <div className="px-4 pb-8 pt-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-slate-900">Employee attendance</h1>
            <p className="mt-1 text-sm text-slate-600">
              Monthly check-in, check-out, and late counts per active employee (this campus only).
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="text-xs font-medium text-slate-600">
                Month
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadSheet()}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load month
              </button>
            </div>

            {sheet ? (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-3">
                  <p className="text-xs text-slate-500">Period</p>
                  <p className="font-semibold text-slate-900">{formatMonthLabel(sheet.year, sheet.month)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Staff</p>
                  <p className="font-semibold text-slate-900">{sheet.totalEmployees}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs text-indigo-600">With records</p>
                  <p className="font-semibold text-indigo-900">{sheet.employeesWithAttendance}</p>
                </div>
                <div className="rounded-xl bg-sky-50 px-3 py-2">
                  <p className="text-xs text-sky-700">Day rows</p>
                  <p className="font-semibold text-sky-900">{sheet.totalDayRecords}</p>
                </div>
              </div>
            ) : null}
          </section>

          {error ? (
            <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </section>
          ) : null}

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name, designation, or ID"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {isLoading && !sheet ? (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                Loading attendance…
              </div>
            ) : null}

            {sheet ? (
              <div className="mt-4 space-y-2">
                {filteredEmployees.map((emp) => {
                  const isOpen = expandedIds.has(emp.employeeId)
                  const days = emp.days || []

                  return (
                    <div
                      key={emp.employeeId}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(emp.employeeId)}
                        className="flex w-full items-center gap-3 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
                      >
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {emp.employeeName || '—'}
                            <span className="ml-2 font-normal text-slate-500">#{emp.employeeId}</span>
                          </p>
                          {emp.designationName ? (
                            <p className="truncate text-xs text-slate-500">{emp.designationName}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                          {emp.dayCount} {emp.dayCount === 1 ? 'day' : 'days'}
                        </span>
                      </button>

                      {isOpen ? (
                        days.length > 0 ? (
                          <div className="overflow-x-auto border-t border-slate-100">
                            <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
                                  <th className="px-3 py-2 font-medium">Date</th>
                                  <th className="px-3 py-2 font-medium">CI</th>
                                  <th className="px-3 py-2 font-medium">CO</th>
                                  <th className="px-3 py-2 font-medium">Late</th>
                                </tr>
                              </thead>
                              <tbody>
                                {days.map((day) => (
                                  <tr
                                    key={`${emp.employeeId}-${day.date}`}
                                    className="border-b border-slate-50 last:border-0"
                                  >
                                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                                      {formatDayLabel(day.date)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs ${
                                          day.checkInTime ? 'bg-sky-50 text-sky-900' : 'text-slate-400'
                                        }`}
                                      >
                                        <Clock className="h-3 w-3 opacity-60" />
                                        {day.checkInTime ? formatTime12Hour(day.checkInTime) : '—'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs ${
                                          day.checkOutTime ? 'bg-violet-50 text-violet-900' : 'text-slate-400'
                                        }`}
                                      >
                                        <Clock className="h-3 w-3 opacity-60" />
                                        {day.checkOutTime ? formatTime12Hour(day.checkOutTime) : '—'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${lateBadgeClass(
                                          day.lateComings,
                                        )}`}
                                      >
                                        {lateLabel(day.lateComings)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="border-t border-slate-100 px-3 py-3 text-sm text-slate-500">
                            No attendance records for this month.
                          </p>
                        )
                      ) : null}
                    </div>
                  )
                })}

                {filteredEmployees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No employees match your search.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusEmployeeAttendancePage

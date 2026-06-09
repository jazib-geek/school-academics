import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  ChevronDown,
  ClipboardCheck,
  Clock,
  Loader2,
  RefreshCw,
  Sunrise,
  User,
  UserX,
} from 'lucide-react'
import { getCampusCoordinatorDailyReportingMonitor } from '../../../services/coordinatorDailyReportService'
import { resolveClassLabel, sortClassesByCustomOrder } from '../../../services/classSort.js'
import CampusShell from '../../../components/campus/CampusShell.jsx'

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

const formatTime12Hour = (value) => {
  if (!value || typeof value !== 'string') return '—'
  const short = value.length >= 5 ? value.slice(0, 5) : value
  const [hStr, mStr = '00'] = short.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return '—'
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const formatDateLong = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(utcNoon)
}

const assemblyLabel = (v) => {
  if (v === true) return { text: 'Yes', className: 'bg-emerald-100 text-emerald-800' }
  if (v === false) return { text: 'No', className: 'bg-amber-100 text-amber-900' }
  return { text: 'Not stated', className: 'bg-slate-100 text-slate-600' }
}

const dutyScopeLabel = (row) => {
  if (row.dutyScope === 'Other' && row.dutyScopeOtherLabel) {
    return row.dutyScopeOtherLabel
  }
  return row.dutyScope || '—'
}

const attendancePct = (present, total) => {
  if (!total || total <= 0) return 0
  return Math.round((present / total) * 1000) / 10
}

/** Present % tier: >80 green, 50–80 yellow, <50 red; no enrolment → neutral grey. */
const attendancePresentTier = (present, total) => {
  if (!total || total <= 0) return { key: 'na', rgb: '148 163 184', pctLabelClass: 'text-slate-500' }
  const pct = attendancePct(present, total)
  if (pct > 80) return { key: 'good', rgb: '34 197 94', pctLabelClass: 'text-emerald-700' }
  if (pct >= 50) return { key: 'mid', rgb: '234 179 8', pctLabelClass: 'text-amber-700' }
  return { key: 'low', rgb: '239 68 68', pctLabelClass: 'text-rose-700' }
}

const ATTENDANCE_BAR_FILTERS = [
  {
    id: 'full',
    label: 'All present',
    hint: '100% on roll',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
    matches: (present, total) => total > 0 && present === total,
  },
  {
    id: 'partial',
    label: 'Some present',
    hint: 'Between 1% and 99%',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-900 ring-1 ring-amber-200',
    matches: (present, total) => {
      if (total <= 0) return false
      const pct = attendancePct(present, total)
      return pct > 0 && pct < 100
    },
  },
  {
    id: 'low',
    label: 'Many absent',
    hint: 'Under 50% present',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-900 ring-1 ring-rose-200',
    matches: (present, total) => total > 0 && attendancePct(present, total) < 50,
  },
]

function AttendanceBarFilters({ activeIds, onToggle }) {
  return (
    <div
      className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Filter classes by attendance"
    >
      {ATTENDANCE_BAR_FILTERS.map((f) => {
        const on = activeIds.has(f.id)
        return (
          <button
            key={f.id}
            type="button"
            title={f.hint}
            aria-pressed={on}
            onClick={() => onToggle(f.id)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
              on
                ? f.activeClass
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

function AttendanceDonut({ present, total }) {
  const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
  const angle = Math.min(100, Math.max(0, pct)) * 3.6
  const tier = attendancePresentTier(present, total)

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="relative grid h-36 w-36 place-items-center rounded-full shadow-inner ring-4 ring-white"
        style={{
          background: `conic-gradient(rgb(${tier.rgb}) 0deg ${angle}deg, rgb(226 232 240) ${angle}deg 360deg)`,
        }}
        aria-hidden
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <span className={`text-2xl font-bold ${tier.pctLabelClass}`}>{pct}%</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Present</span>
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">
        {present.toLocaleString()} present · {total.toLocaleString()} on roll
      </p>
    </div>
  )
}

function ClassAttendanceBars({ rows, activeFilterIds }) {
  const sortedRows = useMemo(() => sortClassesByCustomOrder(rows ?? []), [rows])

  const filteredRows = useMemo(() => {
    if (!activeFilterIds?.size) return sortedRows
    return sortedRows.filter((row) => {
      const present = row.presentCount ?? 0
      const total = row.totalCount ?? 0
      return ATTENDANCE_BAR_FILTERS.some((f) => activeFilterIds.has(f.id) && f.matches(present, total))
    })
  }, [sortedRows, activeFilterIds])

  if (!sortedRows.length) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">No class attendance rows for this date.</p>
  }

  if (!filteredRows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-xs text-slate-500">
        No classes match the selected filters.
      </p>
    )
  }

  return (
    <div className="space-y-3 pr-1">
      {filteredRows.map((row) => {
        const total = row.totalCount ?? 0
        const present = row.presentCount ?? 0
        const pct = attendancePct(present, total)
        const tier = attendancePresentTier(present, total)
        return (
          <div key={row.classSectionCompositeId ?? row.className} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-800">{resolveClassLabel(row) || 'Class'}</span>
              <span className={`shrink-0 tabular-nums font-medium ${tier.pctLabelClass}`}>
                {present}/{total} ({pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: `rgb(${tier.rgb})` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Fixed body height so attendance donut and CI table cards align; lists scroll inside. */
const SNAPSHOT_CARD_BODY_CLASS = 'mt-4 h-[12.5rem] min-h-[12.5rem] min-w-0'

function coordinatorDisplayName(report) {
  return report.coordinatorEmployeeName?.trim() || `Coordinator #${report.coordinatorEmployeeId}`
}

function CoordinatorReportBody({ report }) {
  const lines = [...(report.workingReportLines || [])].sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Morning / assembly</p>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Moral lesson topic</dt>
            <dd className="text-slate-800">{report.moralLessonTopic?.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Uniform check</dt>
            <dd className="whitespace-pre-wrap text-slate-800">{report.uniformCheckNotes?.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Campus cleanliness</dt>
            <dd className="whitespace-pre-wrap text-slate-800">{report.campusCleanlinessNotes?.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Teachers in classes</dt>
            <dd className="whitespace-pre-wrap text-slate-800">{report.teachersInClassesNotes?.trim() || '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Daily working report</p>
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500">No bullet lines.</p>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-800">
            {lines.map((line) => (
              <li key={line.id ?? `${report.id}-${line.lineOrder}`} className="pl-1">
                {line.activityDescription}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function CoordinatorReportCard({ report, accordionMode }) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const name = coordinatorDisplayName(report)
  const asm = assemblyLabel(report.assemblyConductedPerPolicy)
  const lineCount = (report.workingReportLines || []).length

  if (!accordionMode) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">Report id {report.id}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${asm.className}`}>
            Assembly per policy: {asm.text}
          </span>
        </div>
        <div className="p-4">
          <CoordinatorReportBody report={report} />
        </div>
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[3.25rem] items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-inner"
          aria-hidden
        >
          <User size={22} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-slate-900">{name}</span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500">
            Report #{report.id} · Assembly: {asm.text}
            {lineCount > 0 ? ` · ${lineCount} working point${lineCount === 1 ? '' : 's'}` : ''}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${asm.className}`}>
          {asm.text}
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-label={name}
            className={`border-t border-slate-100 bg-slate-50/40 px-4 pb-4 pt-3 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out ${
              open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
            }`}
          >
            <CoordinatorReportBody report={report} />
          </div>
        </div>
      </div>
    </section>
  )
}

function CoordinatorCiTimeTable({ reports, isLoading }) {
  if (reports.length === 0 && !isLoading) {
    return (
      <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-sm text-slate-500">
        No coordinator reports for this date.
      </p>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="max-w-0 truncate px-3 py-2 font-medium text-slate-800" title={r.coordinatorEmployeeName?.trim()}>
                {r.coordinatorEmployeeName?.trim() || `#${r.coordinatorEmployeeId}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                {formatTime12Hour(r.arrivalTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampusDailyReportingPage() {
  const [reportDate, setReportDate] = useState(() => getPakistanTodayIso())
  const [bundle, setBundle] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [attendanceBarFilters, setAttendanceBarFilters] = useState(() => new Set())

  const toggleAttendanceBarFilter = useCallback((id) => {
    setAttendanceBarFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getCampusCoordinatorDailyReportingMonitor({ reportDate })
      setBundle(data || null)
    } catch (err) {
      setBundle(null)
      setError(err?.response?.data?.message || err?.message || 'Unable to load daily reporting monitor.')
    } finally {
      setIsLoading(false)
    }
  }, [reportDate])

  useEffect(() => {
    load()
  }, [load])

  const summaries = bundle?.classAttendanceSummaries ?? []
  const reports = bundle?.coordinatorReports ?? []

  const attendanceRollup = useMemo(() => {
    let total = 0
    let present = 0
    for (const row of summaries) {
      total += row.totalCount ?? 0
      present += row.presentCount ?? 0
    }
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
    return { total, present, pct }
  }, [summaries])

  const modFlat = useMemo(() => {
    const rows = []
    for (const r of reports) {
      const coord = r.coordinatorEmployeeName?.trim() || `ID ${r.coordinatorEmployeeId}`
      for (const m of r.modDuties || []) {
        rows.push({
          key: `${r.id}-${m.id}`,
          coordinator: coord,
          scope: dutyScopeLabel(m),
          onDuty: m.onDutyEmployeeName?.trim() || `ID ${m.onDutyEmployeeId}`,
          notes: m.notes?.trim() || '',
        })
      }
    }
    return rows
  }, [reports])

  const absentAggregated = useMemo(() => {
    const map = new Map()
    for (const r of reports) {
      const coord = r.coordinatorEmployeeName?.trim() || `ID ${r.coordinatorEmployeeId}`
      for (const a of r.absentTeachers || []) {
        const id = a.employeeId
        if (!map.has(id)) {
          map.set(id, {
            employeeId: id,
            employeeName: a.employeeName?.trim() || `ID ${id}`,
            coordinators: new Set(),
            notes: [],
          })
        }
        const entry = map.get(id)
        entry.coordinators.add(coord)
        if (a.notes?.trim()) entry.notes.push(a.notes.trim())
      }
    }
    return [...map.values()].map((v) => ({
      ...v,
      coordinators: [...v.coordinators].sort(),
    }))
  }, [reports])

  return (
    <CampusShell headerContext="Daily reporting">
      <div className="space-y-6 p-4 pt-20 md:p-6 md:pt-24 lg:p-7 lg:pt-24">
            <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily coordinator reporting</h1>
              {/*   <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Monitor coordinator submissions: arrival (CI time), student attendance, MOD duties, absent teachers, assembly checks, and daily working points — same data as the employee portal, aggregated for this campus.
                </p> */}
                <p className="mt-2 text-xs font-medium text-indigo-600">{formatDateLong(reportDate)}</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col text-xs font-medium text-slate-600">
                  Report date
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value || getPakistanTodayIso())}
                    className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={load}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Reload
                </button>
              </div>
            </div>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</section>
            ) : null}

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Sunrise size={20} className="text-amber-600" />
                Assembly & morning checks · Daily working report
              </h2>
              <p className="text-sm text-slate-500">
                {reports.length > 1
                  ? 'Expand a coordinator to view morning checks and the daily working report.'
                  : 'Policy flag, free-text fields, and working report bullets.'}
              </p>
              <div className="mt-4 space-y-4">
                {reports.length === 0 && !isLoading ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nothing to show for this date.</p>
                ) : null}
                {reports.map((r) => (
                  <CoordinatorReportCard
                    key={`${reportDate}-${r.id}`}
                    report={r}
                    accordionMode={reports.length > 1}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Attendance snapshot</h2>
                <AttendanceBarFilters activeIds={attendanceBarFilters} onToggle={toggleAttendanceBarFilter} />
                <div className={`${SNAPSHOT_CARD_BODY_CLASS} flex gap-4`}>
                  <div className="flex shrink-0 items-start justify-center">
                    <AttendanceDonut present={attendanceRollup.present} total={attendanceRollup.total} />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <ClassAttendanceBars rows={summaries} activeFilterIds={attendanceBarFilters} />
                  </div>
                </div>
              </article>

              <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Clock size={20} className="text-indigo-600" aria-hidden />
                  Coordinator CI time
                </h2>
                <p className="mt-1 min-h-5 text-sm leading-5 text-slate-500">Arrival time logged in the portal (12-hour clock).</p>
                <div className={SNAPSHOT_CARD_BODY_CLASS}>
                  <CoordinatorCiTimeTable reports={reports} isLoading={isLoading} />
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ClipboardCheck size={20} className="text-violet-600" />
                  MOD duties (all coordinators)
                </h2>
                <p className="text-sm text-slate-500">One row per duty window logged in the portal.</p>
                <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Coordinator</th>
                        <th className="px-3 py-2">Scope</th>
                        <th className="px-3 py-2">On duty</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modFlat.length === 0 && !isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                            No MOD rows for this date.
                          </td>
                        </tr>
                      ) : null}
                      {modFlat.map((row) => (
                        <tr key={row.key} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-800">{row.coordinator}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-900">{row.scope}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{row.onDuty}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-600" title={row.notes}>
                            {row.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <UserX size={20} className="text-rose-600" />
                  Absent teachers (deduplicated)
                </h2>
                <p className="text-sm text-slate-500">Unique staff absent on at least one coordinator report for this date.</p>
                <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Logged by</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absentAggregated.length === 0 && !isLoading ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                            No absent teachers recorded for this date.
                          </td>
                        </tr>
                      ) : null}
                      {absentAggregated.map((row) => (
                        <tr key={row.employeeId} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{row.employeeName}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">{row.coordinators.join(', ')}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {[...new Set(row.notes)].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <footer className="pb-6 text-center text-sm text-slate-400">Daily reporting monitor · campus scoped</footer>
      </div>
    </CampusShell>
  )
}

export default CampusDailyReportingPage

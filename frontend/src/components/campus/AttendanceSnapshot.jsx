import { useMemo } from 'react'
import { resolveClassLabel, sortClassesByCustomOrder } from '../../services/classSort.js'

export const attendancePct = (present, total) => {
  if (!total || total <= 0) return 0
  return Math.round((present / total) * 1000) / 10
}

/** Present % tier: >80 green, 50–80 yellow, <50 red; no enrolment → neutral grey. */
export const attendancePresentTier = (present, total) => {
  if (!total || total <= 0) return { key: 'na', rgb: '148 163 184', pctLabelClass: 'text-slate-500' }
  const pct = attendancePct(present, total)
  if (pct > 80) return { key: 'good', rgb: '34 197 94', pctLabelClass: 'text-emerald-700' }
  if (pct >= 50) return { key: 'mid', rgb: '234 179 8', pctLabelClass: 'text-amber-700' }
  return { key: 'low', rgb: '239 68 68', pctLabelClass: 'text-rose-700' }
}

export const ATTENDANCE_BAR_FILTERS = [
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

/** Fixed body height so donut and side lists align; lists scroll inside. */
export const ATTENDANCE_SNAPSHOT_BODY_CLASS = 'mt-2 min-h-0 min-w-0 flex-1'

export function AttendanceBarFilters({ activeIds, onToggle, className = 'mt-1', endAdornment = null }) {
  return (
    <div className={`${className} flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1.5`}>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
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
      {endAdornment ? (
        <div className="ml-auto shrink-0 text-right text-[11px] leading-snug text-slate-500 max-[380px]:w-full max-[380px]:text-left sm:whitespace-nowrap">
          {endAdornment}
        </div>
      ) : null}
    </div>
  )
}

export function AttendanceDonut({
  present,
  total,
  absentCount = 0,
  onLeaveCount = 0,
  onAbsentClick,
  sizeClass = 'h-36 w-36',
  holeClass = 'h-24 w-24',
}) {
  const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
  const angle = Math.min(100, Math.max(0, pct)) * 3.6
  const tier = attendancePresentTier(present, total)
  const showExtras = onAbsentClick != null || onLeaveCount > 0 || absentCount > 0

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1.5">
      <div
        className={`relative grid ${sizeClass} place-items-center rounded-full shadow-inner ring-4 ring-white`}
        style={{
          background: `conic-gradient(rgb(${tier.rgb}) 0deg ${angle}deg, rgb(226 232 240) ${angle}deg 360deg)`,
        }}
        aria-hidden
      >
        <div className={`flex ${holeClass} flex-col items-center justify-center rounded-full bg-white text-center shadow-sm`}>
          <span className={`text-2xl font-bold ${tier.pctLabelClass}`}>{pct}%</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Present</span>
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">
        {present.toLocaleString()} present · {total.toLocaleString()} on roll
      </p>
      {showExtras ? (
        <p className="text-center text-[11px] leading-snug text-slate-500">
          {onAbsentClick ? (
            <button
              type="button"
              onClick={onAbsentClick}
              className="font-semibold text-rose-700 underline-offset-2 hover:underline"
              title="Open absent list"
            >
              {absentCount.toLocaleString()} absent
            </button>
          ) : (
            <span>{absentCount.toLocaleString()} absent</span>
          )}
          {onLeaveCount > 0 ? (
            <>
              <span aria-hidden> · </span>
              <span>{onLeaveCount.toLocaleString()} on leave</span>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

export function ClassAttendanceBars({ rows, activeFilterIds }) {
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
    return (
      <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 text-center text-xs text-slate-500">
        No class attendance for today yet.
      </p>
    )
  }

  if (!filteredRows.length) {
    return (
      <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 text-center text-xs text-slate-500">
        No classes match the selected filters.
      </p>
    )
  }

  return (
    <div className="space-y-2.5 pr-1">
      {filteredRows.map((row) => {
        const total = row.totalCount ?? 0
        const present = row.presentCount ?? 0
        const pct = attendancePct(present, total)
        const tier = attendancePresentTier(present, total)
        return (
          <div key={row.classSectionCompositeId ?? row.className} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium text-slate-800">
                {resolveClassLabel(row) || 'Class'}
                {(row.shortLeaveCount ?? 0) > 0 ? (
                  <span className="ml-1.5 font-semibold text-teal-700">
                    {row.shortLeaveCount} short leave
                  </span>
                ) : null}
              </span>
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

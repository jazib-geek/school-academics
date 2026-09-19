import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Loader2, RefreshCw } from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getMyTimetable } from '../../services/campusTimeTableService'

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

function formatWindow(start, end) {
  const startLabel = to12Hour(start)
  const endLabel = to12Hour(end)
  if (!startLabel && !endLabel) return '—'
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`
  return startLabel || endLabel
}

function periodOrdinal(n) {
  const num = Number(n)
  if (!Number.isFinite(num) || num <= 0) return '—'
  const mod100 = num % 100
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`
  switch (num % 10) {
    case 1:
      return `${num}st`
    case 2:
      return `${num}nd`
    case 3:
      return `${num}rd`
    default:
      return `${num}th`
  }
}

function EmployeeMyTimetablePage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await getMyTimetable())
    } catch (err) {
      setData(null)
      setError(err?.response?.data?.message || 'Unable to load your timetable.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const slots = data?.slots || data?.Slots || []
  const hasTimetable = Boolean(data?.hasTimetable ?? data?.HasTimetable)
  const timetableName = data?.timetableName || data?.TimetableName || ''
  const subtitle = data?.subtitle || data?.Subtitle || ''

  const rows = useMemo(() => {
    return [...slots]
      .map((slot) => ({
        periodNumber: slot.periodNumber ?? slot.PeriodNumber,
        startTime: slot.startTime || slot.StartTime || null,
        endTime: slot.endTime || slot.EndTime || null,
        className: slot.className || slot.ClassName || 'Class',
        subjectName:
          slot.subjectShortName ||
          slot.SubjectShortName ||
          slot.subjectName ||
          slot.SubjectName ||
          'Subject',
        sectionId: slot.sectionId ?? slot.SectionId,
        subjectId: slot.subjectId ?? slot.SubjectId,
      }))
      .sort((a, b) => {
        if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber
        return String(a.className).localeCompare(String(b.className))
      })
  }, [slots])

  return (
    <EmployeeLayout
      title="My timetable"
      subtitle={timetableName || 'Your teaching periods'}
      showProfileCard={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 px-0.5 text-xs text-[var(--emp-text-muted)]">
            {subtitle
              ? subtitle
              : isLoading && !data
                ? 'Loading…'
                : `${rows.length} period slot${rows.length === 1 ? '' : 's'}`}
          </p>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="emp-cta-btn emp-cta-btn-tonal h-9 shrink-0 px-3"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error ? (
          <div className="emp-surface rounded-2xl px-4 py-3 text-sm text-[var(--emp-danger)]">{error}</div>
        ) : null}

        {isLoading && !data ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-[var(--emp-text-muted)]">
            <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" /> Loading…
          </div>
        ) : !hasTimetable ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center">
            <CalendarDays className="mx-auto text-[var(--emp-text-muted)]" size={28} />
            <p className="mt-3 text-sm font-medium text-[var(--emp-text)]">No timetable published</p>
            <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
              There is no active campus timetable yet.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center">
            <Clock3 className="mx-auto text-[var(--emp-text-muted)]" size={28} />
            <p className="mt-3 text-sm font-medium text-[var(--emp-text)]">No periods assigned to you</p>
            <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
              {timetableName
                ? `You are not listed in “${timetableName}”.`
                : 'You are not listed in the current timetable.'}
            </p>
          </div>
        ) : (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[18rem] border-collapse text-[13px] leading-snug">
                <thead>
                  <tr className="bg-[var(--emp-primary)] text-white">
                    <th className="sticky left-0 z-10 w-12 bg-[var(--emp-primary)] px-2 py-2.5 text-center font-semibold">
                      Period
                    </th>
                    <th className="whitespace-nowrap px-2.5 py-2.5 text-left font-semibold">Time</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5 text-left font-semibold">Class</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5 text-left font-semibold">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const zebra = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    return (
                      <tr key={`${row.periodNumber}-${row.sectionId}-${row.subjectId}-${index}`} className={zebra}>
                        <th
                          className={`sticky left-0 z-10 w-12 border-b border-[var(--emp-border)] px-2 py-2.5 text-center font-semibold text-[var(--emp-text)] ${zebra}`}
                        >
                          {periodOrdinal(row.periodNumber)}
                        </th>
                        <td className="whitespace-nowrap border-b border-[var(--emp-border)] px-2.5 py-2.5 tabular-nums text-[var(--emp-text-muted)]">
                          {formatWindow(row.startTime, row.endTime)}
                        </td>
                        <td className="border-b border-[var(--emp-border)] px-2.5 py-2.5 font-medium text-[var(--emp-text)]">
                          {row.className}
                        </td>
                        <td className="border-b border-[var(--emp-border)] px-2.5 py-2.5 text-[var(--emp-text)]">
                          {row.subjectName}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeMyTimetablePage

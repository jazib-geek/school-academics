import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  AccessForbiddenPanel,
} from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  getConductDayReport,
  notePolarity,
  polarityChipClass,
} from '../../../services/studentConductService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const todayIso = getPakistanTodayIso()

const initialFilters = {
  dateFrom: todayIso,
  dateTo: todayIso,
  search: '',
  className: '',
  recordedByEmployeeId: '',
  polarity: 'all',
}

const formatTags = (tags = []) =>
  tags
    .map((tag) => tag?.name)
    .filter(Boolean)
    .join(', ')

const formatNoteDate = (value) => {
  const iso = String(value || '').slice(0, 10)
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso || '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
}

const rangeLabel = (from, to) => {
  if (!from) return ''
  if (!to || from === to) return formatNoteDate(from)
  return `${formatNoteDate(from)} – ${formatNoteDate(to)}`
}

export default function CampusStudentConductPage() {
  const canView = hasCampusPermission('view_student_conduct')
  const [filters, setFilters] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [serverFilters, setServerFilters] = useState({
    dateFrom: initialFilters.dateFrom,
    dateTo: initialFilters.dateTo,
    recordedByEmployeeId: initialFilters.recordedByEmployeeId,
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState([])

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    void getTeacherAssignmentEmployees()
      .then((employees) => {
        if (cancelled) return
        setEmployeeOptions(
          (employees || [])
            .map((emp) => {
              const id = emp.id ?? emp.ID
              if (id == null) return null
              return {
                value: String(id),
                label: emp.employeeName || emp.EmployeeName || `Teacher ${id}`,
              }
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label)),
        )
      })
      .catch(() => {
        if (!cancelled) setEmployeeOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [canView])

  const load = useCallback(async (query) => {
    if (!canView || !query?.dateFrom) return
    const { dateFrom, dateTo, recordedByEmployeeId } = query
    if (dateTo && dateFrom > dateTo) {
      toast.error('End date must be on or after the start date.')
      return
    }
    setLoading(true)
    try {
      const data = await getConductDayReport({
        date: dateFrom,
        dateTo: dateTo || dateFrom,
        recordedByEmployeeId: recordedByEmployeeId
          ? Number(recordedByEmployeeId)
          : undefined,
      })
      setReport(data || null)
    } catch (error) {
      setReport(null)
      toast.error(error?.response?.data?.message || 'Could not load conduct notes.')
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void load(serverFilters)
  }, [load, serverFilters])

  const isDateRange = Boolean(
    serverFilters.dateFrom &&
      serverFilters.dateTo &&
      serverFilters.dateFrom !== serverFilters.dateTo,
  )

  const classOptions = useMemo(() => {
    const names = (report?.classes || [])
      .map((group) => group.className)
      .filter(Boolean)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b))
  }, [report])

  const rows = useMemo(() => {
    const query = applied.search.trim().toLowerCase()
    const notes = (report?.classes || []).flatMap((group) =>
      (group.notes || []).map((note) => ({
        ...note,
        className: note.className || group.className || '-',
      })),
    )

    return notes
      .filter((note) => {
        if (applied.className && note.className !== applied.className) return false
        const polarity = notePolarity(note)
        if (applied.polarity === 'good' && polarity !== 'good' && polarity !== 'mixed') return false
        if (applied.polarity === 'bad' && polarity !== 'bad' && polarity !== 'mixed') return false
        if (!query) return true
        return (
          String(note.studentName || '').toLowerCase().includes(query) ||
          String(note.studentId || '').includes(query) ||
          String(note.conductTypeName || '').toLowerCase().includes(query) ||
          String(note.recordedByName || '').toLowerCase().includes(query) ||
          String(note.remarks || '').toLowerCase().includes(query) ||
          formatTags(note.tags).toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        const dateCmp = String(a.noteDate || '').localeCompare(String(b.noteDate || ''))
        if (dateCmp !== 0) return dateCmp
        return String(a.studentName || '').localeCompare(String(b.studentName || ''))
      })
  }, [report, applied])

  const onApply = (event) => {
    event?.preventDefault?.()
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      toast.error('End date must be on or after the start date.')
      return
    }
    setApplied({ ...filters })
    setServerFilters({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      recordedByEmployeeId: filters.recordedByEmployeeId,
    })
  }

  const onTeacherFilterChange = (recordedByEmployeeId) => {
    setFilters((previous) => ({ ...previous, recordedByEmployeeId }))
    setServerFilters((previous) => ({ ...previous, recordedByEmployeeId }))
  }

  const onClassFilterChange = (className) => {
    setFilters((previous) => ({ ...previous, className }))
    setApplied((previous) => ({ ...previous, className }))
  }

  const onPolarityFilterChange = (polarity) => {
    setFilters((previous) => ({ ...previous, polarity }))
    setApplied((previous) => ({ ...previous, polarity }))
  }

  const onReset = () => {
    setFilters(initialFilters)
    setApplied(initialFilters)
    setServerFilters({
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      recordedByEmployeeId: initialFilters.recordedByEmployeeId,
    })
  }

  return (
    <CampusShell>
      <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <form
          onSubmit={onApply}
          autoComplete="off"
          className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Student Conduct</h1>
                <p className="text-sm text-slate-500">
                  Review conduct notes for a date range.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load(serverFilters)}
              disabled={loading || !canView}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, dateFrom: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, dateTo: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Teacher</label>
              <select
                value={filters.recordedByEmployeeId}
                onChange={(event) => onTeacherFilterChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All teachers</option>
                {employeeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, search: event.target.value }))
                }
                placeholder="Student, Reg ID, type, note…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Class</label>
              <select
                value={applied.className}
                onChange={(event) => onClassFilterChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All classes</option>
                {classOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-sm font-semibold text-slate-700">Type:</span>
            {[
              ['all', `All (${report?.totalCount ?? 0})`],
              ['good', `Good (${report?.goodCount ?? 0})`],
              ['bad', `Needs work (${report?.badCount ?? 0})`],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="conduct-polarity"
                  value={value}
                  checked={applied.polarity === value}
                  onChange={(event) => onPolarityFilterChange(event.target.value)}
                />
                {label}
              </label>
            ))}
          </div>
        </form>

        <div className="rounded-2xl bg-white shadow-sm">
          {!canView ? (
            <AccessForbiddenPanel
              title="Student conduct restricted"
              message="You don't have access to view student conduct."
              className="m-4 border-0 bg-transparent py-12"
            />
          ) : loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="animate-spin text-indigo-600" />
              Loading conduct notes…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <ClipboardCheck className="mx-auto mb-3 text-slate-300" size={38} />
              <p>No conduct notes match these filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-white">
                    <tr>
                      {isDateRange ? (
                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                      ) : null}
                      <th className="px-3 py-2 text-left font-semibold">Student</th>
                      <th className="px-3 py-2 text-left font-semibold">Class</th>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-left font-semibold">Item</th>
                      <th className="px-3 py-2 text-left font-semibold">Note</th>
                      <th className="px-3 py-2 text-left font-semibold">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((note) => {
                      const polarity = notePolarity(note)
                      return (
                        <tr
                          key={note.id}
                          className="border-t border-slate-100 hover:bg-indigo-50/40"
                        >
                          {isDateRange ? (
                            <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                              {formatNoteDate(note.noteDate)}
                            </td>
                          ) : null}
                          <td className="px-3 py-1.5 font-medium text-slate-800">
                            {note.studentName || '-'}
                            <span className="ml-1 font-normal text-slate-400">
                              #{note.studentId}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">{note.className || '-'}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${polarityChipClass(polarity)}`}
                            >
                              {note.conductTypeName || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {formatTags(note.tags) || '—'}
                          </td>
                          <td className="max-w-[18rem] truncate px-3 py-1.5 text-slate-600">
                            {note.remarks || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {note.recordedByName || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <p className="text-sm text-slate-500">
                  Showing {rows.length}
                  {report?.totalCount != null ? ` of ${report.totalCount}` : ''} for{' '}
                  {rangeLabel(serverFilters.dateFrom, serverFilters.dateTo)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </CampusShell>
  )
}

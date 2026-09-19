import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  AccessForbiddenPanel,
} from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  getConductDayReport,
  notePolarity,
  polarityChipClass,
} from '../../../services/studentConductService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const initialFilters = {
  date: getPakistanTodayIso(),
  search: '',
  className: '',
  polarity: 'all',
}

const formatTags = (tags = []) =>
  tags
    .map((tag) => tag?.name)
    .filter(Boolean)
    .join(', ')

export default function CampusStudentConductPage() {
  const canView = hasCampusPermission('view_student_conduct')
  const [filters, setFilters] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (date) => {
    if (!canView || !date) return
    setLoading(true)
    try {
      const data = await getConductDayReport({ date })
      setReport(data || null)
    } catch (error) {
      setReport(null)
      toast.error(error?.response?.data?.message || 'Could not load conduct notes.')
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void load(applied.date)
  }, [load, applied.date])

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
      .sort((a, b) => String(a.studentName || '').localeCompare(String(b.studentName || '')))
  }, [report, applied])

  const onApply = (event) => {
    event?.preventDefault?.()
    setApplied({ ...filters })
    if (filters.date !== applied.date) {
      void load(filters.date)
    }
  }

  const onReset = () => {
    setFilters(initialFilters)
    setApplied(initialFilters)
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
                  Review conduct notes recorded for a day.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load(applied.date)}
              disabled={loading || !canView}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, date: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </div>
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, search: event.target.value }))
                }
                placeholder="Student, Reg ID, type, staff, note…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Class</label>
              <select
                value={filters.className}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, className: event.target.value }))
                }
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
            <div className="flex items-end gap-2 md:col-span-3">
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onReset}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Reset
              </button>
            </div>
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
                  checked={filters.polarity === value}
                  onChange={(event) =>
                    setFilters((previous) => ({ ...previous, polarity: event.target.value }))
                  }
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
                  {report?.totalCount != null ? ` of ${report.totalCount}` : ''} for this day
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </CampusShell>
  )
}

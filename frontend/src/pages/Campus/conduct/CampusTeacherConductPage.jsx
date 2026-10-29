import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { ClipboardCheck, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getAllActiveEmployees } from '../../../services/employeeService'
import {
  getTeacherConductDayReport,
  notePolarity,
  polarityChipClass,
} from '../../../services/teacherConductService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'
import { CAMPUS_REPORT_PRINT_STYLES } from '../../../utils/campusReportPrint.js'

const todayIso = getPakistanTodayIso()

const initialFilters = {
  dateFrom: todayIso,
  dateTo: todayIso,
  subjectEmployeeId: '',
  search: '',
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

export default function CampusTeacherConductPage() {
  const canView = hasCampusPermission('view_teacher_conduct')
  const [filters, setFilters] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState([])

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    void getAllActiveEmployees()
      .then((employees) => {
        if (cancelled) return
        setEmployeeOptions(
          (employees || [])
            .map((emp) => {
              const id = emp.id ?? emp.ID
              if (id == null) return null
              return {
                value: String(id),
                label: emp.employeeName || emp.EmployeeName || `Staff ${id}`,
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

  const load = useCallback(async () => {
    if (!canView || !applied.dateFrom) return
    if (applied.dateTo && applied.dateFrom > applied.dateTo) {
      toast.error('End date must be on or after the start date.')
      return
    }
    setLoading(true)
    try {
      const data = await getTeacherConductDayReport({
        date: applied.dateFrom,
        dateTo: applied.dateTo || applied.dateFrom,
        subjectEmployeeId: applied.subjectEmployeeId ? Number(applied.subjectEmployeeId) : undefined,
      })
      setReport(data || null)
    } catch (error) {
      setReport(null)
      toast.error(error?.response?.data?.message || 'Could not load conduct notes.')
    } finally {
      setLoading(false)
    }
  }, [canView, applied])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const query = applied.search.trim().toLowerCase()
    const notes = (report?.teachers || []).flatMap((group) =>
      (group.notes || []).map((note) => ({
        ...note,
        employeeName: note.employeeName || group.employeeName || '—',
        designationName: note.designationName || group.designationName || '',
      })),
    )
    return notes
      .filter((note) => {
        const polarity = notePolarity(note)
        if (applied.polarity === 'good' && polarity !== 'good' && polarity !== 'mixed') return false
        if (applied.polarity === 'bad' && polarity !== 'bad' && polarity !== 'mixed') return false
        if (!query) return true
        return (
          String(note.employeeName || '').toLowerCase().includes(query) ||
          String(note.conductTypeName || '').toLowerCase().includes(query) ||
          String(note.recordedByName || '').toLowerCase().includes(query) ||
          String(note.remarks || '').toLowerCase().includes(query) ||
          formatTags(note.tags).toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        const dateCmp = String(a.noteDate || '').localeCompare(String(b.noteDate || ''))
        if (dateCmp !== 0) return dateCmp
        return String(a.employeeName || '').localeCompare(String(b.employeeName || ''))
      })
  }, [report, applied])

  const applyFilters = () => setApplied({ ...filters })

  const printSubtitle = rangeLabel(applied.dateFrom, applied.dateTo)

  if (!canView) {
    return (
      <CampusShell>
        <div className="p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <AccessForbiddenPanel message="You don't have access to view teacher conduct." />
        </div>
      </CampusShell>
    )
  }

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <div className="no-print mb-1 flex flex-wrap items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Teacher Conduct</h1>
              <p className="text-sm text-slate-500">Recorded notes by date range.</p>
            </div>
          </div>
          <section className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-medium text-slate-600">
                From
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                To
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Teacher
                <Select
                  className="mt-1 text-[13px]"
                  classNamePrefix="campus-select"
                  isClearable
                  placeholder="All teachers"
                  options={employeeOptions}
                  value={
                    employeeOptions.find((o) => o.value === filters.subjectEmployeeId) || null
                  }
                  onChange={(opt) =>
                    setFilters((f) => ({ ...f, subjectEmployeeId: opt?.value || '' }))
                  }
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Show
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                  value={filters.polarity}
                  onChange={(e) => setFilters((f) => ({ ...f, polarity: e.target.value }))}
                >
                  <option value="all">All notes</option>
                  <option value="good">Positive only</option>
                  <option value="bad">Needs attention</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
                Search
                <input
                  type="search"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                  placeholder="Name, type, note…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-10 items-center rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#364574] disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </section>

          <section className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[13px] text-slate-600">
              <span>
                {loading ? 'Loading…' : `${rows.length} note${rows.length === 1 ? '' : 's'}`}
                {report?.totalCount != null && rows.length !== report.totalCount
                  ? ` (of ${report.totalCount})`
                  : ''}
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-slate-500">No notes for this range.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-[#405189] text-left text-[13px] font-medium text-white">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Detail</th>
                    <th className="px-3 py-2">Recorded by</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] leading-snug text-slate-800">
                  {rows.map((note) => (
                    <tr key={note.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 whitespace-nowrap">{formatNoteDate(note.noteDate)}</td>
                      <td className="px-3 py-1.5">
                        <div className="font-medium">{note.employeeName}</div>
                        {note.designationName ? (
                          <div className="text-xs text-slate-500">{note.designationName}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${polarityChipClass(notePolarity(note))}`}
                        >
                          {note.conductTypeName}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {formatTags(note.tags) || '—'}
                        {note.remarks ? (
                          <div className="mt-0.5 text-slate-600">{note.remarks}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{note.recordedByName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="print-only print-sheet">
            <CampusReportPrintHeader title="TEACHER CONDUCT" subtitle={printSubtitle} />
            <table className="legacy-print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Teacher</th>
                  <th>Type</th>
                  <th>Detail</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((note) => (
                  <tr key={`p-${note.id}`}>
                    <td>{formatNoteDate(note.noteDate)}</td>
                    <td>{note.employeeName}</td>
                    <td>{note.conductTypeName}</td>
                    <td>
                      {[formatTags(note.tags), note.remarks].filter(Boolean).join(' — ') || '—'}
                    </td>
                    <td>{note.recordedByName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CampusShell>
    </div>
  )
}

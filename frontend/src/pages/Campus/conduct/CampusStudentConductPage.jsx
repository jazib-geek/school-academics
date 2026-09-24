import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  List,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import {
  AccessForbiddenPanel,
} from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  getConductDayReport,
  notePolarity,
  polarityCardClass,
  polarityChipClass,
} from '../../../services/studentConductService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { getCampusProfile } from '../../../services/campusProfileService'
import { getClassGradeRank } from '../../../services/classSort.js'
import { resolveSessionBounds } from '../../../utils/campusProfile.js'
import { CAMPUS_REPORT_PRINT_STYLES } from '../../../utils/campusReportPrint.js'
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

const shiftIsoDays = (iso, days) => {
  const parts = String(iso || '').slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

const sessionDateRange = (profile, today) => {
  const bounds = resolveSessionBounds(profile || {})
  const dateFrom = `${bounds.startYear}-${String(bounds.startMonth).padStart(2, '0')}-01`
  return { dateFrom, dateTo: today, sessionLabel: bounds.label || 'Session' }
}

const VIEW_MODES = [
  { id: 'summary', label: 'By student', icon: Users },
  { id: 'log', label: 'Event log', icon: List },
]

const teacherSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 38,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({ ...base, zIndex: 70 }),
  menuPortal: (base) => ({ ...base, zIndex: 90 }),
}

const compareClassNames = (a, b) => {
  const aRank = getClassGradeRank(a)
  const bRank = getClassGradeRank(b)
  if (aRank !== bRank) return aRank - bRank
  return String(a || '').localeCompare(String(b || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function ConductNoteTree({ notes }) {
  if (!notes?.length) {
    return <p className="ml-10 text-xs text-slate-400">No notes for this student.</p>
  }

  return (
    <div className="conduct-note-tree-root ml-9 mr-2 border-l-2 border-indigo-200/80 py-1">
      <ul className="space-y-0">
        {notes.map((note, index) => {
          const polarity = notePolarity(note)
          const isLast = index === notes.length - 1
          const items = formatTags(note.tags)
          return (
            <li key={note.id} className="relative pl-5">
              <span
                className="absolute left-0 top-[0.85rem] h-px w-4 bg-indigo-200/80"
                aria-hidden
              />
              {!isLast ? (
                <span
                  className="absolute -left-[2px] top-[0.85rem] bottom-0 w-[2px] bg-white"
                  aria-hidden
                />
              ) : null}
              <div
                className={`my-1.5 rounded-lg border px-3 py-2 ${polarityCardClass(polarity)}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {formatNoteDate(note.noteDate)}
                  </span>
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${polarityChipClass(polarity)}`}
                  >
                    {note.conductTypeName || '—'}
                  </span>
                  {items ? (
                    <span className="text-xs text-slate-600">{items}</span>
                  ) : null}
                </div>
                {note.remarks ? (
                  <p className="mt-1 text-xs leading-snug text-slate-700">{note.remarks}</p>
                ) : null}
                {note.recordedByName ? (
                  <p className="mt-1 text-[11px] text-slate-400">Recorded by {note.recordedByName}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
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
  const [campusProfile, setCampusProfile] = useState(null)
  const [viewMode, setViewMode] = useState('summary')
  const [expandedStudentId, setExpandedStudentId] = useState(null)
  const [summarySort, setSummarySort] = useState('needsWork')
  const [repeatOnly, setRepeatOnly] = useState(false)

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

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    void getCampusProfile()
      .then((profile) => {
        if (!cancelled) setCampusProfile(profile)
      })
      .catch(() => {
        if (!cancelled) setCampusProfile(null)
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
    return [...new Set(names)].sort(compareClassNames)
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
        const classCmp = compareClassNames(a.className, b.className)
        if (classCmp !== 0) return classCmp
        const dateCmp = String(a.noteDate || '').localeCompare(String(b.noteDate || ''))
        if (dateCmp !== 0) return dateCmp
        return String(a.studentName || '').localeCompare(String(b.studentName || ''))
      })
  }, [report, applied])

  const studentSummaries = useMemo(() => {
    const byStudent = new Map()
    for (const note of rows) {
      const studentId = note.studentId
      if (studentId == null) continue
      if (!byStudent.has(studentId)) {
        byStudent.set(studentId, {
          studentId,
          studentName: note.studentName || '—',
          className: note.className || '—',
          total: 0,
          good: 0,
          bad: 0,
          notes: [],
          violationDays: new Set(),
          issueCounts: new Map(),
        })
      }
      const entry = byStudent.get(studentId)
      entry.notes.push(note)
      entry.total += 1
      const polarity = notePolarity(note)
      if (polarity === 'good' || polarity === 'mixed') entry.good += 1
      if (polarity === 'bad' || polarity === 'mixed') {
        entry.bad += 1
        entry.violationDays.add(String(note.noteDate || '').slice(0, 10))
        const typeName = note.conductTypeName || 'Other'
        entry.issueCounts.set(typeName, (entry.issueCounts.get(typeName) || 0) + 1)
        for (const tag of note.tags || []) {
          if (tag?.isGood) continue
          const label = tag?.name ? `${typeName} · ${tag.name}` : typeName
          entry.issueCounts.set(label, (entry.issueCounts.get(label) || 0) + 1)
        }
      }
    }

    return [...byStudent.values()].map((entry) => {
      const topIssues = [...entry.issueCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, count }))
      return {
        ...entry,
        violationDayCount: entry.violationDays.size,
        topIssues,
        notes: entry.notes.sort((a, b) => {
          const dateCmp = String(b.noteDate || '').localeCompare(String(a.noteDate || ''))
          if (dateCmp !== 0) return dateCmp
          return String(a.conductTypeName || '').localeCompare(String(b.conductTypeName || ''))
        }),
      }
    })
  }, [rows])

  const sortedSummaries = useMemo(() => {
    let list = [...studentSummaries]
    if (repeatOnly) list = list.filter((entry) => entry.bad >= 2)
    list.sort((a, b) => {
      const classCmp = compareClassNames(a.className, b.className)
      if (classCmp !== 0) return classCmp
      if (summarySort === 'name') {
        return String(a.studentName).localeCompare(String(b.studentName))
      }
      if (summarySort === 'total') return b.total - a.total
      if (b.bad !== a.bad) return b.bad - a.bad
      return b.total - a.total
    })
    return list
  }, [studentSummaries, summarySort, repeatOnly])

  const insight = useMemo(() => {
    if (!studentSummaries.length) return null
    const withRepeat = studentSummaries.filter((s) => s.bad >= 3).length
    const top = [...studentSummaries].sort((a, b) => b.bad - a.bad)[0]
    return { withRepeat, top }
  }, [studentSummaries])

  const datePresets = useMemo(() => {
    const session = sessionDateRange(campusProfile, todayIso)
    return [
      { id: 'today', label: 'Today', dateFrom: todayIso, dateTo: todayIso },
      { id: '7d', label: 'Last 7 days', dateFrom: shiftIsoDays(todayIso, -6), dateTo: todayIso },
      { id: '30d', label: 'Last 30 days', dateFrom: shiftIsoDays(todayIso, -29), dateTo: todayIso },
      {
        id: 'session',
        label: session.sessionLabel ? `Session ${session.sessionLabel}` : 'This session',
        dateFrom: session.dateFrom,
        dateTo: session.dateTo,
      },
    ]
  }, [campusProfile])

  const activePresetId = useMemo(() => {
    const from = serverFilters.dateFrom
    const to = serverFilters.dateTo || from
    const match = datePresets.find((p) => p.dateFrom === from && p.dateTo === to)
    return match?.id || null
  }, [datePresets, serverFilters])

  const applyDatePreset = (preset) => {
    const next = {
      ...filters,
      dateFrom: preset.dateFrom,
      dateTo: preset.dateTo,
    }
    setFilters(next)
    setApplied(next)
    setServerFilters({
      dateFrom: preset.dateFrom,
      dateTo: preset.dateTo,
      recordedByEmployeeId: next.recordedByEmployeeId,
    })
    setExpandedStudentId(null)
  }

  const toggleStudentExpand = (studentId) => {
    setExpandedStudentId((previous) => (previous === studentId ? null : studentId))
  }

  const printSubtitle = useMemo(() => {
    const parts = [rangeLabel(serverFilters.dateFrom, serverFilters.dateTo)]
    if (applied.className) parts.push(`Class: ${applied.className}`)
    const teacher = employeeOptions.find(
      (opt) => opt.value === String(applied.recordedByEmployeeId || ''),
    )
    if (teacher) parts.push(`Teacher: ${teacher.label}`)
    if (applied.polarity === 'good') parts.push('Good notes only')
    if (applied.polarity === 'bad') parts.push('Needs work only')
    if (applied.search.trim()) parts.push(`Search: “${applied.search.trim()}”`)
    if (viewMode === 'summary' && repeatOnly) parts.push('Frequent only (2+ needs work)')
    parts.push(viewMode === 'summary' ? 'By student' : 'Event log')
    return parts.join(' · ')
  }, [applied, serverFilters, employeeOptions, viewMode, repeatOnly])

  const canPrint =
    canView &&
    !loading &&
    rows.length > 0 &&
    (viewMode !== 'summary' || sortedSummaries.length > 0)

  const teacherSelectValue = useMemo(
    () => employeeOptions.find((opt) => opt.value === filters.recordedByEmployeeId) || null,
    [employeeOptions, filters.recordedByEmployeeId],
  )

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
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
      <div className="print-content-wrap space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <form
          onSubmit={onApply}
          autoComplete="off"
          className="no-print space-y-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Student Conduct</h1>
                <p className="text-sm text-slate-500">
                  Track patterns by student or browse individual notes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!canPrint}
                className="no-print inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                type="button"
                onClick={() => void load(serverFilters)}
                disabled={loading || !canView}
                className="no-print inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Reload
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setViewMode(id)
                  setExpandedStudentId(null)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  viewMode === id
                    ? 'bg-[var(--campus-primary)] text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Quick range:</span>
            {datePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  activePresetId === preset.id
                    ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Teacher</label>
              <Select
                isClearable
                isSearchable
                options={employeeOptions}
                placeholder="All teachers"
                value={teacherSelectValue}
                onChange={(selected) => onTeacherFilterChange(selected?.value || '')}
                className="text-sm"
                classNamePrefix="conduct-teacher-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={teacherSelectStyles}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, search: event.target.value }))
                }
                placeholder="Student, Reg ID…"
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
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                type="submit"
                className="h-[38px] flex-1 rounded-lg bg-[var(--campus-primary)] px-3 text-sm font-medium text-white"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onReset}
                className="h-[38px] flex-1 rounded-lg border border-slate-300 px-3 text-sm"
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
                  checked={applied.polarity === value}
                  onChange={(event) => onPolarityFilterChange(event.target.value)}
                />
                {label}
              </label>
            ))}
          </div>
        </form>

        {canView && !loading && rows.length > 0 && insight ? (
          <div className="no-print grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Students</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{studentSummaries.length}</p>
              <p className="text-xs text-slate-500">with notes in this range</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Repeat concerns</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{insight.withRepeat}</p>
              <p className="text-xs text-rose-700/80">3 or more needs-work notes</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <BarChart3 size={14} />
                Most notes
              </p>
              {insight.top?.bad > 0 ? (
                <>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                    {insight.top.studentName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {insight.top.bad} needs work · {insight.top.className}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No needs-work notes in range</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="no-print rounded-2xl bg-white shadow-sm">
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
          ) : rows.length === 0 || (viewMode === 'summary' && sortedSummaries.length === 0) ? (
            <div className="py-16 text-center text-slate-500">
              <ClipboardCheck className="mx-auto mb-3 text-slate-300" size={38} />
              <p>
                {rows.length === 0
                  ? 'No conduct notes match these filters.'
                  : 'No students match the frequent-only filter.'}
              </p>
            </div>
          ) : viewMode === 'summary' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-600">
                  {sortedSummaries.length} student{sortedSummaries.length === 1 ? '' : 's'}
                  {repeatOnly ? ' (2+ needs-work notes)' : ''}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={repeatOnly}
                      onChange={(event) => setRepeatOnly(event.target.checked)}
                    />
                    Frequent only (2+)
                  </label>
                  <select
                    value={summarySort}
                    onChange={(event) => setSummarySort(event.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="needsWork">Sort: needs work</option>
                    <option value="total">Sort: all notes</option>
                    <option value="name">Sort: name</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-white">
                    <tr>
                      <th className="w-8 px-2 py-2" aria-label="Expand" />
                      <th className="px-3 py-2 text-left font-semibold">Student</th>
                      <th className="px-3 py-2 text-left font-semibold">Class</th>
                      <th className="px-3 py-2 text-right font-semibold">Needs work</th>
                      <th className="px-3 py-2 text-right font-semibold">Good</th>
                      <th className="px-3 py-2 text-right font-semibold">Days</th>
                      <th className="px-3 py-2 text-left font-semibold">Common issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSummaries.map((entry) => {
                      const expanded = expandedStudentId === entry.studentId
                      const highlight = entry.bad >= 3
                      return (
                        <Fragment key={entry.studentId}>
                          <tr
                            className={`border-t border-slate-100 hover:bg-indigo-50/40 ${highlight ? 'bg-rose-50/30' : ''}`}
                          >
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => toggleStudentExpand(entry.studentId)}
                                className="btn-table-action grid h-7 w-7 place-items-center rounded text-slate-500 hover:bg-slate-100"
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Hide notes' : 'Show notes'}
                              >
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-800">
                              {entry.studentName}
                              <span className="ml-1 font-normal text-slate-400">#{entry.studentId}</span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">{entry.className}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span
                                className={`inline-flex min-w-[1.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-bold ${
                                  entry.bad > 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-400'
                                }`}
                              >
                                {entry.bad}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right text-emerald-700">{entry.good}</td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {entry.violationDayCount || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {entry.topIssues.length
                                ? entry.topIssues.map((issue) => issue.label).join(' · ')
                                : '—'}
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="bg-slate-50/50">
                              <td colSpan={7} className="px-2 py-2">
                                <ConductNoteTree notes={entry.notes} />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 p-4">
                <p className="text-sm text-slate-500">
                  {rows.length} note{rows.length === 1 ? '' : 's'} for{' '}
                  {rangeLabel(serverFilters.dateFrom, serverFilters.dateTo)}
                </p>
              </div>
            </>
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

        <div className="print-only print-sheet">
          <CampusReportPrintHeader
            title="STUDENT CONDUCT REPORT"
            subtitle={printSubtitle}
            showPhones={false}
          />
          {viewMode === 'summary' ? (
            <table className="legacy-print-table">
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '44%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>Date</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Note</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {sortedSummaries.map((entry) => (
                  <Fragment key={`print-${entry.studentId}`}>
                    <tr className="band-row">
                      <td colSpan={6} style={{ textAlign: 'left' }}>
                        {entry.studentName} (#{entry.studentId}) · {entry.className} · Needs work:{' '}
                        {entry.bad} · Good: {entry.good} · Days: {entry.violationDayCount || 0}
                      </td>
                    </tr>
                    {entry.notes.map((note) => (
                      <tr key={`print-note-${note.id}`}>
                        <td style={{ padding: '3px 2px', textAlign: 'center', fontSize: 10 }}>↳</td>
                        <td>{formatNoteDate(note.noteDate)}</td>
                        <td>{note.conductTypeName || '—'}</td>
                        <td>{formatTags(note.tags) || '—'}</td>
                        <td>{note.remarks || '—'}</td>
                        <td>{note.recordedByName || '—'}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="legacy-print-table">
              <thead>
                <tr>
                  {isDateRange ? <th>Date</th> : null}
                  <th>Student</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Note</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((note) => (
                  <tr key={`print-log-${note.id}`}>
                    {isDateRange ? <td>{formatNoteDate(note.noteDate)}</td> : null}
                    <td>
                      {note.studentName || '—'} (#{note.studentId})
                    </td>
                    <td>{note.className || '—'}</td>
                    <td>{note.conductTypeName || '—'}</td>
                    <td>{formatTags(note.tags) || '—'}</td>
                    <td>{note.remarks || '—'}</td>
                    <td>{note.recordedByName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="print-meta" style={{ marginTop: 10, fontSize: 11 }}>
            {rows.length} note{rows.length === 1 ? '' : 's'}
            {viewMode === 'summary'
              ? ` · ${sortedSummaries.length} student${sortedSummaries.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
      </div>
      </CampusShell>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarX,
  ClipboardList,
  Clock,
  Download,
  FileBarChart2,
  LayoutList,
  List,
  Loader2,
  LogOut,
  Percent,
  Printer,
  Star,
  User,
  Users,
  UserX,
  X,
} from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { ATTENDANCE_REPORT_PERMISSIONS } from '../../../constants/campusPermissions.js'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getClasses } from '../../../services/classService'
import {
  getAttendanceExecutiveSnapshot,
  getSmartAttendanceCatalog,
  runSmartAttendanceReport,
} from '../../../services/attendanceReportService'
import { sortClassesByCustomOrder } from '../../../services/classSort'

const FREQUENT_REPORT_IDS = [
  'day-class-summary',
  'day-status-list',
  'summary-by-date',
  'class-attendance',
  'absent-list',
  'absent-list-ndays',
  'summary-by-interval',
]

const CATEGORIES = [
  { id: 'frequent', label: 'Frequently used', icon: Star },
  { id: 'daily', label: 'Daily & register', icon: CalendarDays },
  { id: 'absentees', label: 'Absentees', icon: UserX },
  { id: 'student', label: 'By student', icon: Users },
]

const REPORT_NATURE_BADGE = {
  daily: 'bg-sky-500',
  absentees: 'bg-rose-500',
  student: 'bg-purple-500',
}

const REPORT_ICONS = {
  'day-class-summary': LayoutList,
  'day-status-list': List,
  'summary-by-date': CalendarDays,
  'class-attendance': Building2,
  'absent-list': UserX,
  'absent-list-ndays': CalendarX,
  'this-student': User,
  'summary-by-interval': BarChart3,
  'detailed-register': ClipboardList,
}

const getReportNatureKey = (item) =>
  item?.category && REPORT_NATURE_BADGE[item.category] ? item.category : 'daily'

const getReportIcon = (item) => REPORT_ICONS[item?.id] || FileBarChart2

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })

const isRegIdKey = (key) => {
  const k = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  return k === 'regid' || k === 'regno'
}

const statusLabel = (value) => {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
  if (raw === 'P' || raw === 'PRESENT') return 'Present'
  if (raw === 'A' || raw === 'ABSENT') return 'Absent'
  if (raw === 'LT' || raw === 'LATE') return 'Late'
  if (raw === 'LV' || raw === 'LEAVE') return 'Leave'
  if (raw === 'H' || raw === 'HOLIDAY') return 'Holiday'
  if (value == null || value === '') return '—'
  return String(value)
}

const dash = (value) => {
  if (value == null || value === '') return '—'
  return String(value)
}

const formatPrintDate = (value) => {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return String(value)
}

const formatLongDate = (value) => {
  if (!value) return '—'
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) return formatPrintDate(value)
  return dateObj.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatCell = (value, format, key) => {
  if (value == null || value === '') return '—'
  if (isRegIdKey(key)) return String(value)
  if (String(key || '').toLowerCase() === 'status') return statusLabel(value)
  if (format === 'number') return money(value)
  if (format === 'percent') {
    return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
  }
  return String(value)
}

const filterAttendanceCatalogByPermission = (items) =>
  (items || []).filter((item) => {
    const code = ATTENDANCE_REPORT_PERMISSIONS[item.id]
    if (!code) return false
    return hasCampusPermission(code)
  })

function SnapshotCard({ label, value, hint, icon: Icon, accent }) {
  const accentMap = {
    violet: { border: 'border-violet-500', icon: 'text-violet-600' },
    emerald: { border: 'border-emerald-500', icon: 'text-emerald-600' },
    rose: { border: 'border-rose-500', icon: 'text-rose-600' },
    sky: { border: 'border-sky-500', icon: 'text-sky-600' },
    amber: { border: 'border-amber-500', icon: 'text-amber-600' },
    indigo: { border: 'border-indigo-500', icon: 'text-indigo-600' },
  }
  const tone = accentMap[accent] || accentMap.indigo

  return (
    <article className={`rounded-2xl border-t-4 ${tone.border} bg-white p-4 shadow-sm ring-1 ring-slate-100`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon ? <Icon size={18} className={tone.icon} /> : null}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-800 sm:text-2xl">{value ?? '—'}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

function buildDefaultParams(report) {
  const params = {}
  for (const def of report?.parameters || []) {
    if (def.defaultValue != null && def.defaultValue !== '') {
      params[def.key] = String(def.defaultValue)
    } else if (report.presetParameters?.[def.key] != null) {
      params[def.key] = String(report.presetParameters[def.key])
    } else {
      params[def.key] = ''
    }
  }
  if (report?.presetParameters) {
    for (const [key, value] of Object.entries(report.presetParameters)) {
      if (params[key] === '' || params[key] == null) params[key] = String(value)
    }
  }
  return params
}

export default function CampusAttendanceReportsPage() {
  const { campusLabel, phonesDisplay: campusPhone, schoolName } = getCampusPrintMeta()
  const [searchParams, setSearchParams] = useSearchParams()

  const [catalog, setCatalog] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [classOptions, setClassOptions] = useState([])
  const [category, setCategory] = useState('frequent')
  const [reportId, setReportId] = useState('')
  const [params, setParams] = useState({})
  const [result, setResult] = useState(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [error, setError] = useState('')
  const [runError, setRunError] = useState('')

  const selectedReport = useMemo(
    () => catalog.find((item) => item.id === reportId) || null,
    [catalog, reportId],
  )

  const catalogFiltered = useMemo(() => {
    if (category === 'frequent') {
      const byId = new Map(catalog.map((item) => [item.id, item]))
      return FREQUENT_REPORT_IDS.map((id) => byId.get(id)).filter(Boolean)
    }
    return catalog.filter((item) => item.category === category)
  }, [catalog, category])

  const classSelectOptions = useMemo(
    () =>
      (classOptions || []).map((item) => ({
        value: String(item.id ?? item.ID ?? ''),
        label: item.className || item.ClassName || item.name || item.label || String(item.id),
      })),
    [classOptions],
  )

  const displayRows = useMemo(() => {
    if (!result?.rows?.length) return []
    const groupKey = result.groupByKey
    const hasClassColumn =
      (result.columns || []).some((col) => col.key === 'className') || groupKey === 'className'

    let ordered
    if (!groupKey) {
      ordered = hasClassColumn
        ? sortClassesByCustomOrder(result.rows, 'className')
        : [...result.rows]
      return ordered.map((row) => ({ __type: 'data', ...row }))
    }

    if (groupKey === 'className') {
      ordered = sortClassesByCustomOrder(result.rows, 'className')
    } else if (hasClassColumn) {
      // Class order first, then stable-sort by group so each band keeps grade order.
      ordered = [...sortClassesByCustomOrder(result.rows, 'className')].sort((a, b) => {
        const ga = String(a[groupKey] || 'Unassigned').toLowerCase()
        const gb = String(b[groupKey] || 'Unassigned').toLowerCase()
        if (ga < gb) return -1
        if (ga > gb) return 1
        return 0
      })
    } else {
      ordered = [...result.rows].sort((a, b) => {
        const ga = String(a[groupKey] || 'Unassigned').toLowerCase()
        const gb = String(b[groupKey] || 'Unassigned').toLowerCase()
        if (ga < gb) return -1
        if (ga > gb) return 1
        return 0
      })
    }

    const rows = []
    let last = ''
    for (const item of ordered) {
      const current = item[groupKey] || 'Unassigned'
      if (current !== last) {
        rows.push({ __type: 'group', label: current })
        last = current
      }
      rows.push({ __type: 'data', ...item })
    }
    return rows
  }, [result])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setIsBooting(true)
      try {
        const [catalogData, snapshotData, classes] = await Promise.all([
          getSmartAttendanceCatalog(),
          getAttendanceExecutiveSnapshot().catch(() => null),
          getClasses().catch(() => []),
        ])
        if (cancelled) return
        const allowedCatalog = filterAttendanceCatalogByPermission(catalogData)
        setCatalog(allowedCatalog)
        setSnapshot(snapshotData)
        setClassOptions(classes || [])

        const presetFromUrl = searchParams.get('report') || searchParams.get('preset')
        const initial =
          allowedCatalog.find((item) => item.id === presetFromUrl) ||
          allowedCatalog.find((item) => item.id === 'day-class-summary') ||
          allowedCatalog.find((item) => item.id === 'summary-by-date') ||
          allowedCatalog[0]
        if (initial) {
          let nextParams = buildDefaultParams(initial)
          const dateFromUrl = searchParams.get('date')
          const dateFromFromUrl = searchParams.get('dateFrom')
          const dateToFromUrl = searchParams.get('dateTo')
          if (dateFromUrl) nextParams = { ...nextParams, date: dateFromUrl }
          if (dateFromFromUrl) nextParams = { ...nextParams, dateFrom: dateFromFromUrl }
          if (dateToFromUrl) nextParams = { ...nextParams, dateTo: dateToFromUrl }

          setReportId(initial.id)
          setParams(nextParams)

          if (searchParams.get('run') === '1') {
            setIsResultOpen(true)
            setIsLoading(true)
            setRunError('')
            try {
              const cleaned = {}
              for (const [key, value] of Object.entries(nextParams)) {
                if (value === '' || value == null) continue
                cleaned[key] = value
              }
              const data = await runSmartAttendanceReport(initial.id, cleaned)
              if (!cancelled) setResult(data)
            } catch (requestError) {
              if (!cancelled) {
                setRunError(requestError?.response?.data?.message || 'Unable to run report.')
                setResult(null)
              }
            } finally {
              if (!cancelled) setIsLoading(false)
            }
          }
        }
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError?.response?.data?.message || 'Unable to load attendance reports.')
        }
      } finally {
        if (!cancelled) setIsBooting(false)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectReport = (report, withPresetParams = true) => {
    const nextParams =
      withPresetParams && report.presetParameters
        ? {
            ...buildDefaultParams(report),
            ...Object.fromEntries(
              Object.entries(report.presetParameters).map(([k, v]) => [k, String(v)]),
            ),
          }
        : buildDefaultParams(report)

    setReportId(report.id)
    setParams(nextParams)
    setResult(null)
    setRunError('')
    setIsResultOpen(false)
    setSearchParams(report.isPreset ? { report: report.id } : {})

    if (!(report.parameters || []).length) {
      void executeReport(report.id, nextParams)
    }
  }

  const closeResultModal = () => {
    setIsResultOpen(false)
    setRunError('')
  }

  const executeReport = async (id, paramValues) => {
    if (!id) return
    setIsResultOpen(true)
    setIsLoading(true)
    setRunError('')
    setResult(null)
    try {
      const cleaned = {}
      for (const [key, value] of Object.entries(paramValues || {})) {
        if (value === '' || value == null) continue
        cleaned[key] = value
      }
      const data = await runSmartAttendanceReport(id, cleaned)
      setResult(data)
    } catch (requestError) {
      setRunError(requestError?.response?.data?.message || 'Unable to run report.')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const runReport = async () => {
    await executeReport(reportId, params)
  }

  useEffect(() => {
    if (!isResultOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeResultModal()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isResultOpen])

  const downloadCsv = () => {
    if (!result?.columns?.length || !result?.rows?.length) return
    const headers = result.columns.map((c) => c.label)
    const lines = [
      headers.join(','),
      ...result.rows.map((row) =>
        result.columns
          .map((col) => {
            const raw = row[col.key] ?? ''
            const text = String(raw).replaceAll('"', '""')
            return `"${text}"`
          })
          .join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.reportId || 'attendance-report'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderParamInput = (def) => {
    const value = params[def.key] ?? ''
    const onChange = (next) => setParams((prev) => ({ ...prev, [def.key]: next }))

    if (def.type === 'date') {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      )
    }

    if (def.type === 'classComposite' || def.optionsSource === 'classes') {
      return (
        <Select
          isClearable={!def.required}
          isSearchable
          options={classSelectOptions}
          placeholder="Search class"
          value={classSelectOptions.find((opt) => opt.value === String(value)) || null}
          onChange={(selectedOption) => onChange(selectedOption?.value || '')}
          className="text-sm"
          classNamePrefix="attendance-class-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              minHeight: '40px',
              borderRadius: '0.5rem',
            }),
            menu: (baseStyles) => ({
              ...baseStyles,
              zIndex: 70,
            }),
            menuPortal: (baseStyles) => ({
              ...baseStyles,
              zIndex: 90,
            }),
          }}
        />
      )
    }

    if (def.options?.length) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {!def.required ? <option value="">Any</option> : null}
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={def.type === 'decimal' || def.type === 'int' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    )
  }

  const printSubtitle = useMemo(() => {
    if (!result) return ''
    const bits = []
    if (params.date) {
      bits.push(`Date: ${formatPrintDate(params.date)}`)
    } else if (params.dateFrom || params.dateTo) {
      bits.push(`From: ${formatPrintDate(params.dateFrom)}   To: ${formatPrintDate(params.dateTo)}`)
    }
    if (params.classCompositeId) {
      const cls = classSelectOptions.find((opt) => opt.value === String(params.classCompositeId))
      bits.push(`Class : ${cls?.label || params.classCompositeId}`)
    }
    if (params.studentId) bits.push(`Reg ID: ${params.studentId}`)
    if (params.minDays) bits.push(`Min absent days: ${params.minDays}`)
    if (params.status) bits.push(`Status: ${params.status}`)
    bits.push(`Printed: ${formatLongDate(result.generatedAt)}`)
    return bits.join('   ')
  }, [params, result, classSelectOptions])

  const printTitle = useMemo(
    () => (result?.title || selectedReport?.title || 'Attendance Report').toUpperCase(),
    [result, selectedReport],
  )

  const printSummaryItems = useMemo(() => {
    if (!result) return []
    return (result.extraKpis || []).map((kpi) => ({
      label: kpi.label,
      value:
        kpi.format === 'number' || kpi.format === 'percent'
          ? formatCell(kpi.value, kpi.format)
          : kpi.value,
    }))
  }, [result])

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          * {
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body, #root {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print,
          .hide-in-print { display: none !important; }
          .print-only { display: block !important; }
          .attendance-result-modal { display: none !important; }
          .print-page-root,
          .print-main-wrap,
          .print-content-wrap {
            background: #ffffff !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            display: block !important;
            width: 100% !important;
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .print-sheet .print-school-name,
          .print-sheet .print-report-title {
            font-size: 16px !important;
            font-weight: 700 !important;
          }
          .legacy-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 12px !important;
          }
          .legacy-print-table th,
          .legacy-print-table td {
            border: 1px solid #000 !important;
            padding: 4px 5px !important;
            vertical-align: middle !important;
            font-size: 12px !important;
          }
          .legacy-print-table thead th {
            background: #d9d9d9 !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .legacy-print-table tr { page-break-inside: avoid !important; }
          .legacy-print-table .band-row td {
            text-align: center !important;
            background: #ffffff !important;
          }
          .legacy-print-summary {
            margin-top: 14px !important;
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 12px !important;
          }
          .legacy-print-summary th,
          .legacy-print-summary td {
            border: 1px solid #000 !important;
            padding: 5px 4px !important;
            text-align: center !important;
            font-weight: 700 !important;
          }
          .legacy-print-summary th {
            background: #d9d9d9 !important;
          }
        }
        .print-only { display: none; }
      `}</style>

      <CampusShell
        headerContext="Attendance Reports"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          {error ? (
            <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isBooting ? (
            <div className="no-print flex min-h-[50vh] items-center justify-center rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="animate-spin text-[var(--campus-primary)]" size={28} />
                <p className="text-sm font-medium">Loading Attendance Reports…</p>
              </div>
            </div>
          ) : (
            <>
              <section className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
                    <p className="text-sm text-slate-500">
                      Daily summaries, class sheets, and absentee lists for campus follow-up.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SnapshotCard
                    label="Present today"
                    value={snapshot ? money(snapshot.presentCount) : '—'}
                    icon={Users}
                    accent="emerald"
                  />
                  <SnapshotCard
                    label="Absent today"
                    value={snapshot ? money(snapshot.absentCount) : '—'}
                    icon={UserX}
                    accent="rose"
                  />
                  <SnapshotCard
                    label="Late today"
                    value={snapshot ? money(snapshot.lateCount) : '—'}
                    icon={Clock}
                    accent="sky"
                  />
                  <SnapshotCard
                    label="Leave today"
                    value={snapshot ? money(snapshot.leaveCount) : '—'}
                    icon={LogOut}
                    accent="violet"
                  />
                  <SnapshotCard
                    label="Present %"
                    value={
                      snapshot
                        ? `${Number(snapshot.presentPercent || 0).toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}%`
                        : '—'
                    }
                    icon={Percent}
                    accent="indigo"
                  />
                  <SnapshotCard
                    label="Classes marked"
                    value={snapshot ? money(snapshot.classesMarked) : '—'}
                    icon={FileBarChart2}
                    accent="violet"
                  />
                  <SnapshotCard
                    label="MTD present %"
                    value={
                      snapshot
                        ? `${Number(snapshot.mtdAveragePresentPercent || 0).toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}%`
                        : '—'
                    }
                    hint="Average of daily present % this month"
                    icon={CalendarDays}
                    accent="amber"
                  />
                </div>
              </section>

              <section className="no-print grid gap-4 lg:grid-cols-5 lg:items-start">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 lg:col-span-3">
                  <div className="mb-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {CATEGORIES.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id)}
                          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium ${
                            category === item.id
                              ? 'bg-[var(--campus-primary)] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Icon size={12} className="shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid max-h-[min(70vh,640px)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {catalogFiltered.length === 0 ? (
                      <p className="col-span-full py-8 text-center text-sm text-slate-500">
                        No reports in this category.
                      </p>
                    ) : (
                      catalogFiltered.map((item) => {
                        const Icon = getReportIcon(item)
                        const badge = REPORT_NATURE_BADGE[getReportNatureKey(item)]
                        const isSelected = reportId === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectReport(item, true)}
                            className={`flex items-start gap-3 rounded-xl border bg-white px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-[var(--campus-primary)] ring-1 ring-[#405189]/30'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${badge}`}
                            >
                              <Icon size={16} strokeWidth={2.25} />
                            </span>
                            <span className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {item.directorBlurb || item.description}
                              </p>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 lg:col-span-2">
                  {selectedReport ? (
                    <>
                      <div className="mb-4 border-b border-slate-100 pb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Selected report
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-slate-800">{selectedReport.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{selectedReport.description}</p>
                      </div>

                      {(selectedReport.parameters || []).length > 0 ? (
                        <div className="grid gap-3">
                          {(selectedReport.parameters || []).map((def) => (
                            <label key={def.key} className="block text-sm">
                              <span className="mb-1 block font-medium text-slate-600">
                                {def.label}
                                {def.required ? ' *' : ''}
                              </span>
                              {renderParamInput(def)}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-3 text-sm text-slate-500">
                          This report opens as soon as you select it from the list.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={runReport}
                        disabled={isLoading || !reportId}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                        Generate report
                      </button>
                    </>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-slate-500">
                      Select a report on the left to configure filters.
                    </div>
                  )}
                </div>
              </section>

              {isResultOpen ? (
                <div className="attendance-result-modal no-print fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
                  <button
                    type="button"
                    aria-label="Close backdrop"
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={closeResultModal}
                  />
                  <div className="relative z-10 mt-2 flex max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:mt-6">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-900">
                          {result?.title || selectedReport?.title || 'Attendance report'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {isLoading
                            ? 'Generating…'
                            : result?.generatedAt
                              ? `Generated ${new Date(result.generatedAt).toLocaleString()}`
                              : runError
                                ? 'Failed to generate'
                                : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!isLoading && result ? (
                          <>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Printer size={16} /> Print
                            </button>
                            <button
                              type="button"
                              onClick={downloadCsv}
                              disabled={!result.rows?.length}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Download size={16} /> CSV
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={closeResultModal}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Close report"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[240px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                      {isLoading ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-slate-500">
                          <Loader2 className="animate-spin text-[var(--campus-primary)]" size={28} />
                          <p className="text-sm font-medium">Fetching report…</p>
                        </div>
                      ) : runError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {runError}
                        </div>
                      ) : result ? (
                        <>
                          <div className="mb-4 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
                              Records: <strong>{money(result.totalRecords)}</strong>
                            </span>
                            {(result.extraKpis || []).map((kpi) => (
                              <span key={kpi.key} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
                                {kpi.label}:{' '}
                                <strong>
                                  {kpi.format === 'number' || kpi.format === 'percent'
                                    ? formatCell(kpi.value, kpi.format)
                                    : kpi.value}
                                </strong>
                              </span>
                            ))}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-[13px] leading-snug">
                              <thead>
                                <tr className="border-b border-slate-200 bg-[var(--campus-primary)] text-left text-xs uppercase tracking-wide text-white">
                                  {(result.columns || []).map((col) => (
                                    <th
                                      key={col.key}
                                      className={`px-3 py-2 font-semibold ${
                                        col.format === 'number' || col.format === 'percent'
                                          ? 'text-right'
                                          : ''
                                      }`}
                                    >
                                      {col.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {displayRows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={Math.max(result.columns?.length || 1, 1)}
                                      className="px-3 py-8 text-center text-slate-500"
                                    >
                                      No rows for this report.
                                    </td>
                                  </tr>
                                ) : (
                                  displayRows.map((row, index) =>
                                    row.__type === 'group' ? (
                                      <tr key={`g-${index}`} className="bg-slate-100">
                                        <td
                                          colSpan={result.columns?.length || 1}
                                          className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600"
                                        >
                                          {row.label}
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr
                                        key={`r-${index}`}
                                        className="border-b border-slate-100 hover:bg-slate-50/80"
                                      >
                                        {(result.columns || []).map((col) => (
                                          <td
                                            key={col.key}
                                            className={`px-3 py-1.5 ${
                                              col.format === 'number' || col.format === 'percent'
                                                ? 'text-right tabular-nums'
                                                : ''
                                            }`}
                                          >
                                            {formatCell(row[col.key], col.format, col.key)}
                                          </td>
                                        ))}
                                      </tr>
                                    ),
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {result ? (
            <div className="print-only print-sheet">
              <div className="mb-2 text-center">
                <div className="print-school-name font-bold">{schoolName}</div>
                <div className="text-[10px]">
                  {campusLabel} · {campusPhone}
                </div>
                <div className="print-report-title mt-1 text-[12px] font-bold">{printTitle}</div>
                <div className="mt-0.5 text-[9px]">{printSubtitle}</div>
              </div>
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    {(result.columns || []).map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, index) =>
                    row.__type === 'group' ? (
                      <tr key={`pg-${index}`} className="band-row">
                        <td colSpan={result.columns?.length || 1}>{row.label}</td>
                      </tr>
                    ) : (
                      <tr key={`pr-${index}`}>
                        {(result.columns || []).map((col) => (
                          <td key={col.key}>{dash(formatCell(row[col.key], col.format, col.key))}</td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              {printSummaryItems.length > 0 ? (
                <table className="legacy-print-summary">
                  <thead>
                    <tr>
                      {printSummaryItems.map((item) => (
                        <th key={item.label}>{item.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {printSummaryItems.map((item) => (
                        <td key={`v-${item.label}`}>{item.value}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}
        </div>
      </CampusShell>
    </div>
  )
}

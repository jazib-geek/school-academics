import { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgePercent,
  Ban,
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Download,
  Gauge,
  HandCoins,
  Layers,
  LayoutList,
  LineChart,
  Loader2,
  Percent,
  PieChart,
  Printer,
  RotateCcw,
  Scale,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
  UserX,
  Wallet,
  X,
} from 'lucide-react'
import Select from 'react-select'
import Chart from 'chart.js/auto'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { FEE_REPORT_PERMISSIONS } from '../../../constants/campusPermissions.js'
import { SCHOOL_LOGO_PATH } from '../../../constants/branding'
import { getCampusFundTypes, hasCampusPermission } from '../../../services/authService'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { amountToWordsPk } from '../../../utils/amountToWordsPk'
import { getClasses } from '../../../services/classService'
import { resolveClassLabel, sortClassesByCustomOrder } from '../../../services/classSort.js'
import {
  getFeeExecutiveSnapshot,
  getFundTypes,
  getSmartFeeCatalog,
  runSmartFeeReport,
} from '../../../services/feeReportService'

const FREQUENT_REPORT_IDS = [
  'collection-by-date',
  'collection-by-interval',
  'tuition-defaulters',
  'fund-defaulters',
  'overall-receivable',
  'overall-receivable-class-wise',
  'expected-income',
]

const CATEGORIES = [
  { id: 'frequent', label: 'Frequently used', icon: Star },
  { id: 'risk', label: 'Risk & Defaulters', icon: AlertTriangle },
  { id: 'cash', label: 'Fee Collection', icon: Wallet },
  { id: 'portfolio', label: 'Portfolio Health', icon: Briefcase },
]

const REPORT_NATURE_BADGE = {
  risk: 'bg-rose-500',
  cash: 'bg-emerald-500',
  portfolio: 'bg-sky-500',
}

const REPORT_ICONS = {
  'tuition-defaulters': AlertTriangle,
  'fund-defaulters': CircleDollarSign,
  'overall-receivable': Wallet,
  'overall-receivable-class-wise': LayoutList,
  'top-defaulters': TrendingUp,
  'chronic-defaulters': Clock,
  'aging-receivable': CalendarClock,
  'never-paid-period': Ban,
  'partial-payers': Percent,
  'family-receivable': Users,
  'inactive-with-dues': UserX,
  'dues-above-threshold': Gauge,
  'collection-by-date': CalendarDays,
  'collection-by-interval': CalendarRange,
  'collection-by-fund': Layers,
  'collection-by-class': Building2,
  'collection-trend': LineChart,
  'collection-mom-compare': ArrowLeftRight,
  'largest-receipts': Banknote,
  'collector-performance': HandCoins,
  'discount-given': Tag,
  'voids-adjustments': RotateCcw,
  'zero-collection-days': CalendarX,
  'class-wise-receivable': Building2,
  'recovery-rate': Percent,
  'tuition-month-matrix': ClipboardList,
  'expected-income': Sparkles,
  'concession-impact': BadgePercent,
  'session-fee-snapshot': ClipboardList,
  'fund-mix-outstanding': PieChart,
  'students-fully-cleared': CheckCircle2,
  'new-charges-vs-receipts': Scale,
}

const getReportNatureKey = (item) =>
  item?.category && REPORT_NATURE_BADGE[item.category] ? item.category : 'cash'

const getReportIcon = (item) => REPORT_ICONS[item?.id] || Wallet

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const now = new Date()
const currentYear = now.getFullYear()
const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((value) => ({
  value: String(value),
  label: String(value),
}))

const COLLECTION_REPORT_IDS = new Set(['collection-by-date', 'collection-by-interval'])
const RECEIVABLE_REPORT_IDS = new Set(['overall-receivable', 'overall-receivable-class-wise'])

const filterFeeCatalogByPermission = (items) =>
  (items || []).filter((item) => {
    const code = FEE_REPORT_PERMISSIONS[item.id]
    if (!code) return false
    return hasCampusPermission(code)
  })

const resolveFundTypeLabel = (fundTypeId, fallback) => {
  const match = getCampusFundTypes().find((item) => Number(item.id) === Number(fundTypeId))
  const name = String(match?.name || '').trim()
  return name || fallback
}

const buildReceivableClassWiseSections = (rows) => {
  const byClass = new Map()
  for (const row of rows || []) {
    const className = resolveClassLabel(row) || 'Unassigned'
    if (!byClass.has(className)) byClass.set(className, [])
    byClass.get(className).push(row)
  }

  const ordered = sortClassesByCustomOrder(
    [...byClass.keys()].map((className) => ({ className })),
  )

  return ordered.map(({ className }) => {
    const students = [...(byClass.get(className) || [])].sort((a, b) =>
      Number(a.studentId || 0) - Number(b.studentId || 0),
    )
    const sum = (key) => students.reduce((acc, row) => acc + Number(row[key] || 0), 0)
    return {
      className,
      students,
      totals: {
        actualFee: sum('actualFee'),
        prevBalance: sum('prevBalance'),
        admissionFee: sum('admissionFee'),
        miscCharges: sum('miscCharges'),
        tuitionOutstanding: sum('tuitionOutstanding'),
        classWiseTotal: sum('classWiseTotal'),
      },
    }
  })
}

const COLLECTION_SUMMARY_COLUMNS = [
  { label: 'Tuition Fee', fundTypeIds: [1], nameMatchers: ['tuition', 'tution'] },
  { label: 'Fine', fundTypeIds: [], nameMatchers: ['fine'] },
  { label: 'Admission Fee', fundTypeIds: [], nameMatchers: ['admission'] },
  { label: 'Misc Charges', fundTypeIds: [], nameMatchers: ['misc'] },
  { label: 'Prev Balance', fundTypeIds: [], nameMatchers: ['prev', 'previous', 'balance'] },
  { label: 'Transport Charges', fundTypeIds: [], nameMatchers: ['transport'] },
]

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const printAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: true,
  })

const dash = (value) => {
  if (value == null || value === '') return '-'
  return String(value)
}

const formatPrintDate = (value) => {
  if (!value) return '-'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) return String(value)
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${dateObj.getFullYear()}`
}

const formatMonthName = (monthValue) => {
  const month = Number(monthValue)
  if (!month || month < 1 || month > 12) return '—'
  return monthOptions.find((option) => Number(option.value) === month)?.label || String(month)
}

/** Keep Month/Year as separate text columns (e.g. August | 2026). */
const normalizeCollectionResult = (data) => {
  if (!data?.columns?.length) return data

  let nextColumns = data.columns.filter((c) => c.key !== 'monthLabel')
  const hasMonth = nextColumns.some((c) => c.key === 'month')
  const hasYear = nextColumns.some((c) => c.key === 'year')

  if (!hasMonth || !hasYear) {
    const insertAt = Math.max(0, nextColumns.findIndex((c) => c.key === 'fundTypeName') + 1)
    if (!hasMonth) nextColumns.splice(insertAt, 0, { key: 'month', label: 'Month', format: 'text' })
    if (!hasYear) {
      const mIdx = nextColumns.findIndex((c) => c.key === 'month')
      nextColumns.splice(mIdx + 1, 0, { key: 'year', label: 'Year', format: 'text' })
    }
  }

  nextColumns = nextColumns.map((c) =>
    c.key === 'month' || c.key === 'year' ? { ...c, format: 'text', label: c.key === 'month' ? 'Month' : 'Year' } : c,
  )

  const nextRows = (data.rows || []).map((row) => {
    const monthRaw = row.month
    const yearRaw = row.year
    const monthIsName = typeof monthRaw === 'string' && /[a-zA-Z]/.test(monthRaw)
    let month = monthIsName ? monthRaw : formatMonthName(monthRaw)
    let year =
      yearRaw != null && yearRaw !== ''
        ? String(yearRaw).replace(/,/g, '')
        : '—'

    // Legacy single monthLabel "August 2026" fallback
    if ((!monthRaw || monthRaw === 0 || monthRaw === '0') && typeof row.monthLabel === 'string' && row.monthLabel.trim()) {
      const parts = row.monthLabel.trim().split(/\s+/)
      if (parts.length >= 2) {
        month = parts.slice(0, -1).join(' ')
        year = parts[parts.length - 1]
      } else if (/^\d{4}$/.test(parts[0])) {
        month = '—'
        year = parts[0]
      }
    }

    if (monthRaw === 0 || monthRaw === '0') month = '—'

    return { ...row, month, year }
  })

  return { ...data, columns: nextColumns, rows: nextRows }
}

const formatCell = (value, format, key) => {
  if (value == null || value === '') return '—'
  const keyNorm = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  // IDs / codes stay ungrouped; only money format uses comma separators.
  if (
    keyNorm === 'regid' ||
    keyNorm === 'regno' ||
    keyNorm === 'studentid' ||
    keyNorm === 'rcptid' ||
    keyNorm === 'transactionid' ||
    keyNorm === 'familycode' ||
    keyNorm === 'fundtypeid' ||
    keyNorm === 'month' ||
    keyNorm === 'year'
  ) {
    return String(value)
  }
  if (format === 'money') return printAmount(value)
  if (format === 'number') return String(Math.round(Number(value || 0)))
  if (format === 'percent') return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
  return String(value)
}

const matchSummaryColumn = (row, column) => {
  const fundTypeId = Number(row.fundTypeId || 0)
  if (column.fundTypeIds.includes(fundTypeId)) return true
  const name = String(row.fundTypeName || '')
    .trim()
    .toLowerCase()
  return column.nameMatchers.some((matcher) => name.includes(matcher))
}

/** Print column sizing: keep IDs/counts/amounts narrow; give names the rest. */
const PRINT_NARROW_KEYS =
  /^(rcptid|manualrcptno|transactionid|studentid|familycode|fundtypeid|month|year|silentmonths|receipts|lines|receiptlines|studentcount|children|topn|paidpercent|recoverypercent)$/i

const PRINT_MEDIUM_KEYS =
  /^(classname|class|classes|fundtypename|fund|type|period|role|transactiondate|date|voiddate|voidby|collector|agingbucket|monthlabel|lastreceiptdate|fathermobile|fathercontact)$/i

const PRINT_WIDE_KEYS = /^(studentname|students|name|fathername)$/i

const PRINT_MONEY_KEYS =
  /amount|received|charged|outstanding|discount|voidamount|due|concession|rosterfee|netpressure|tuitiontotal|fundstotal/

const isPrintMoneyColumn = (key, format) =>
  format === 'money' || PRINT_MONEY_KEYS.test(String(key || '').toLowerCase())

const isPrintNarrowColumn = (key, format) => {
  const k = String(key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (isPrintMoneyColumn(key, format)) return false
  if (PRINT_WIDE_KEYS.test(k)) return false
  return (
    PRINT_NARROW_KEYS.test(k) ||
    /(^|_)id$|count$|percent$/.test(k) ||
    format === 'number' ||
    format === 'percent'
  )
}

const getPrintColumnWidth = (key, format, columnCount = 5) => {
  const k = String(key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

  if (PRINT_WIDE_KEYS.test(k) || (format === 'text' && (k === 'students' || k.endsWith('name')))) {
    return columnCount <= 4 ? '42%' : '36%'
  }

  if (isPrintMoneyColumn(key, format)) {
    return '11%'
  }

  if (isPrintNarrowColumn(key, format)) {
    return '7%'
  }

  if (PRINT_MEDIUM_KEYS.test(k) || k.includes('class')) {
    return '13%'
  }

  return undefined
}

/** Narrow ID/count cols + money cols → center; text names stay left. */
const getPrintColumnAlign = (key, format) => {
  if (isPrintMoneyColumn(key, format) || isPrintNarrowColumn(key, format)) return 'center'
  return 'left'
}

const printCellStyle = (key, format, columnCount) => {
  const width = getPrintColumnWidth(key, format, columnCount)
  const textAlign = getPrintColumnAlign(key, format)
  return {
    ...(width ? { width } : null),
    textAlign,
    ...(isPrintMoneyColumn(key, format) ? { fontWeight: 700 } : null),
    whiteSpace: width && parseFloat(width) <= 11 ? 'nowrap' : undefined,
  }
}

function SnapshotCard({ label, value, hint, icon: Icon, accent }) {
  const accentMap = {
    violet: { border: 'border-violet-500', icon: 'text-violet-600' },
    emerald: { border: 'border-emerald-500', icon: 'text-emerald-600' },
    rose: { border: 'border-rose-500', icon: 'text-rose-600' },
    amber: { border: 'border-amber-500', icon: 'text-amber-600' },
    indigo: { border: 'border-indigo-500', icon: 'text-indigo-600' },
  }
  const tone = accentMap[accent] || accentMap.indigo
  const valueText = value == null ? '—' : String(value)
  const hasRsPrefix = valueText.startsWith('Rs ')
  const amountText = hasRsPrefix ? valueText.slice(3) : valueText

  return (
    <article className={`rounded-2xl border-t-4 ${tone.border} bg-white p-4 shadow-sm ring-1 ring-slate-100`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon ? <Icon size={18} className={tone.icon} /> : null}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-800 sm:text-2xl">
        {hasRsPrefix ? (
          <span className="mr-1 text-xs font-semibold tracking-wide text-slate-400 sm:text-sm">Rs</span>
        ) : null}
        {amountText}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

function ReportChart({ chart }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chart?.labels?.length || !canvasRef.current) return undefined
    chartRef.current?.destroy()
    const colors = ['#4f46e5', '#0d9488', '#ea580c', '#7c3aed']
    chartRef.current = new Chart(canvasRef.current, {
      type: chart.type === 'line' ? 'line' : 'bar',
      data: {
        labels: chart.labels,
        datasets: (chart.series || []).map((series, index) => ({
          label: series.name,
          data: series.data,
          backgroundColor: colors[index % colors.length] + 'cc',
          borderColor: colors[index % colors.length],
          borderWidth: 2,
          tension: 0.3,
          fill: chart.type === 'line',
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: (chart.series || []).length > 1 } },
        scales: {
          y: {
            ticks: {
              callback: (v) => money(v),
            },
          },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [chart])

  if (!chart?.labels?.length) return null
  return (
    <div className="mb-4 h-64 rounded-xl border border-slate-200 bg-white p-3">
      <canvas ref={canvasRef} />
    </div>
  )
}

function findMiscChargesFundTypeId(fundTypes) {
  const match = (fundTypes || []).find((opt) =>
    String(opt.name || '')
      .trim()
      .toLowerCase()
      .includes('misc'),
  )
  return match?.id != null ? String(match.id) : ''
}

function buildDefaultParams(report, fundTypes = []) {
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

  const hasFundTypeParam = (report?.parameters || []).some(
    (def) => def.key === 'fundTypeId' || def.type === 'fundType' || def.optionsSource === 'fundTypes',
  )
  if (hasFundTypeParam && (!params.fundTypeId || params.fundTypeId === '')) {
    const miscId = findMiscChargesFundTypeId(fundTypes)
    if (miscId) params.fundTypeId = miscId
  }

  return params
}

function FeeReportsPage() {
  const { campusLabel, phonesDisplay: campusPhone, schoolName } = getCampusPrintMeta()
  const [searchParams, setSearchParams] = useSearchParams()

  const [catalog, setCatalog] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [fundTypes, setFundTypes] = useState([])
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
  const [printLayoutMode, setPrintLayoutMode] = useState('default')

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
    () => classOptions.map((name) => ({ value: name, label: name })),
    [classOptions],
  )

  const isReceivableReport = RECEIVABLE_REPORT_IDS.has(result?.reportId || reportId)
  const isClassWisePrint =
    printLayoutMode === 'class-wise' ||
    result?.layout === 'receivable-class-wise' ||
    result?.reportId === 'overall-receivable-class-wise'

  const displayRows = useMemo(() => {
    if (!result?.rows?.length) return []
    const groupKey = result.groupByKey
    if (!groupKey) return result.rows.map((row) => ({ __type: 'data', ...row }))

    let sorted
    if (groupKey === 'className') {
      const byClass = new Map()
      for (const row of result.rows) {
        const className = resolveClassLabel(row) || 'Unassigned'
        if (!byClass.has(className)) byClass.set(className, [])
        byClass.get(className).push(row)
      }
      const ordered = sortClassesByCustomOrder(
        [...byClass.keys()].map((className) => ({ className })),
      )
      sorted = ordered.flatMap(({ className }) => byClass.get(className) || [])
    } else {
      sorted = [...result.rows].sort((a, b) => {
        const ga = String(a[groupKey] || 'Unassigned').toLowerCase()
        const gb = String(b[groupKey] || 'Unassigned').toLowerCase()
        if (ga < gb) return -1
        if (ga > gb) return 1
        return 0
      })
    }

    const rows = []
    let last = ''
    for (const item of sorted) {
      const current = item[groupKey] || 'Unassigned'
      if (current !== last) {
        rows.push({ __type: 'group', label: current })
        last = current
      }
      rows.push({ __type: 'data', ...item })
    }
    return rows
  }, [result])

  const receivableClassWiseSections = useMemo(
    () => buildReceivableClassWiseSections(result?.rows),
    [result],
  )

  const receivableClassWiseMasterTotals = useMemo(() => {
    const sum = (key) =>
      receivableClassWiseSections.reduce((acc, section) => acc + Number(section.totals[key] || 0), 0)

    const payload = result?.layoutPayload || {}
    const kpiMap = Object.fromEntries(
      (result?.extraKpis || []).map((kpi) => [String(kpi.key || ''), kpi.value]),
    )

    const pick = (...candidates) => {
      for (const value of candidates) {
        if (value == null || value === '') continue
        const n = Number(value)
        if (!Number.isNaN(n)) return n
      }
      return null
    }

    return {
      actualFee: sum('actualFee'),
      // Campus-wide Payment − Recieved (all active). Prefer API KPIs / layoutPayload over row sums.
      prevBalance:
        pick(kpiMap.totalPrevBalance, payload.totalPrevBalance, payload.TotalPrevBalance) ??
        sum('prevBalance'),
      admissionFee:
        pick(kpiMap.totalAdmissionFee, payload.totalAdmissionFee, payload.TotalAdmissionFee) ??
        sum('admissionFee'),
      miscCharges:
        pick(kpiMap.totalMiscCharges, payload.totalMiscCharges, payload.TotalMiscCharges) ??
        sum('miscCharges'),
      tuitionOutstanding:
        pick(
          kpiMap.totalTuitionOutstanding,
          payload.totalTuitionOutstanding,
          payload.TotalTuitionOutstanding,
        ) ?? sum('tuitionOutstanding'),
      classWiseTotal:
        pick(payload.totalAmount, payload.TotalAmount, result?.totalAmount) ?? sum('classWiseTotal'),
    }
  }, [receivableClassWiseSections, result?.layoutPayload, result?.extraKpis, result?.totalAmount])

  useEffect(() => {
    if (!result) {
      setPrintLayoutMode('default')
      return
    }
    if (
      result.layout === 'receivable-class-wise' ||
      result.reportId === 'overall-receivable-class-wise'
    ) {
      setPrintLayoutMode('class-wise')
    } else {
      setPrintLayoutMode('default')
    }
  }, [result])

  const handlePrint = (mode = 'default') => {
    setPrintLayoutMode(mode)
    window.setTimeout(() => window.print(), 50)
  }

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setIsBooting(true)
      try {
        const [catalogData, snapshotData, funds, classes] = await Promise.all([
          getSmartFeeCatalog(),
          getFeeExecutiveSnapshot().catch(() => null),
          getFundTypes().catch(() => []),
          getClasses().catch(() => []),
        ])
        if (cancelled) return
        const allowedCatalog = filterFeeCatalogByPermission(catalogData)
        setCatalog(allowedCatalog)
        setSnapshot(snapshotData)
        setFundTypes(funds || [])
        setClassOptions(
          (classes || [])
            .map((c) => c.className || c.ClassName || c.name || c.label)
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i),
        )

        const presetFromUrl = searchParams.get('preset')
        const initial =
          allowedCatalog.find((item) => item.id === presetFromUrl) ||
          allowedCatalog.find((item) => item.id === 'top-defaulters') ||
          allowedCatalog.find((item) => item.id === 'collection-by-date') ||
          allowedCatalog[0]
        if (initial) {
          let nextParams = buildDefaultParams(initial, funds || [])
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
              const data = await runSmartFeeReport(initial.id, cleaned)
              if (!cancelled) setResult(normalizeCollectionResult(data))
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
          setError(bootError?.response?.data?.message || 'Unable to load fee reports.')
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
    let nextParams = withPresetParams && report.presetParameters
      ? {
          ...buildDefaultParams(report, fundTypes),
          ...Object.fromEntries(
            Object.entries(report.presetParameters).map(([k, v]) => [k, String(v)]),
          ),
        }
      : buildDefaultParams(report, fundTypes)

    const hasFundTypeParam = (report?.parameters || []).some(
      (def) => def.key === 'fundTypeId' || def.type === 'fundType' || def.optionsSource === 'fundTypes',
    )
    if (hasFundTypeParam && (!nextParams.fundTypeId || nextParams.fundTypeId === '')) {
      const miscId = findMiscChargesFundTypeId(fundTypes)
      if (miscId) nextParams = { ...nextParams, fundTypeId: miscId }
    }

    setReportId(report.id)
    setParams(nextParams)
    setResult(null)
    setRunError('')
    setIsResultOpen(false)
    setSearchParams(report.isPreset ? { preset: report.id } : {})
  }

  const closeResultModal = () => {
    setIsResultOpen(false)
    setRunError('')
  }

  const runReport = async () => {
    if (!reportId) return
    setIsResultOpen(true)
    setIsLoading(true)
    setRunError('')
    setResult(null)
    try {
      const cleaned = {}
      for (const [key, value] of Object.entries(params)) {
        if (value === '' || value == null) continue
        cleaned[key] = value
      }
      const data = await runSmartFeeReport(reportId, cleaned)
      setResult(normalizeCollectionResult(data))
    } catch (requestError) {
      setRunError(requestError?.response?.data?.message || 'Unable to run report.')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
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
    a.download = `${result.reportId || 'fee-report'}.csv`
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
    if (def.type === 'month') {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {!def.required ? <option value="">Any</option> : null}
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }
    if (def.type === 'year') {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {!def.required ? <option value="">Any</option> : null}
          {yearOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }
    if (def.type === 'fundType' || def.optionsSource === 'fundTypes') {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select fund</option>
          {fundTypes.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
              {opt.name}
            </option>
          ))}
        </select>
      )
    }
    if (def.type === 'className' || def.optionsSource === 'classes') {
      return (
        <Select
          isClearable={!def.required}
          isSearchable
          options={classSelectOptions}
          placeholder="Search class"
          value={value ? { value, label: value } : null}
          onChange={(selectedOption) => onChange(selectedOption?.value || '')}
          className="text-sm"
          classNamePrefix="fee-class-select"
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
    if (def.options?.length || def.type === 'fundScope' || def.type === 'topN' || def.type === 'grain') {
      const options = def.options || []
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {options.map((opt) => (
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

  const expectedIncome = result?.layout === 'expected-income' ? result.layoutPayload : null
  const isCollectionPrint = COLLECTION_REPORT_IDS.has(result?.reportId || reportId)

  const prevFundLabel = resolveFundTypeLabel(4, 'Prev Balance')
  const admissionFundLabel = resolveFundTypeLabel(2, 'Admission Fee')
  const miscFundLabel = resolveFundTypeLabel(3, 'Misc Charges')

  const printSubtitle = useMemo(() => {
    if (!result) return ''
    if (isClassWisePrint && isReceivableReport) {
      const classFilter = params.className ? String(params.className) : 'All Classes'
      return `${classFilter}\nAs on Date : ${formatPrintDate(result.generatedAt || new Date())}`
    }
    if (result.reportId === 'collection-by-date') {
      return `As on Date: ${formatPrintDate(params.date)}`
    }
    if (result.reportId === 'collection-by-interval') {
      return `From: ${formatPrintDate(params.dateFrom)}   To: ${formatPrintDate(params.dateTo)}`
    }
    const bits = []
    if (params.date) bits.push(`As on Date: ${formatPrintDate(params.date)}`)
    if (params.dateFrom || params.dateTo) {
      bits.push(`From: ${formatPrintDate(params.dateFrom)}   To: ${formatPrintDate(params.dateTo)}`)
    }
    if (params.month && params.year) {
      bits.push(
        `Month/Year: ${monthOptions.find((m) => m.value === String(params.month))?.label || params.month} ${params.year}`,
      )
    } else if (params.year) {
      bits.push(`Year: ${params.year}`)
    }
    if (params.className) bits.push(`Class: ${params.className}`)
    if (params.fundScope && params.fundScope !== 'all') bits.push(`Scope: ${params.fundScope}`)
    return bits.join('  |  ') || `Generated: ${formatPrintDate(result.generatedAt)}`
  }, [params, result, isClassWisePrint, isReceivableReport])

  const collectionSummary = useMemo(() => {
    const totals = new Map(COLLECTION_SUMMARY_COLUMNS.map((column) => [column.label, 0]))
    for (const row of result?.rows || []) {
      const amount = Number(row.received || 0)
      if (!amount) continue
      const column = COLLECTION_SUMMARY_COLUMNS.find((item) => matchSummaryColumn(row, item))
      if (!column) continue
      totals.set(column.label, (totals.get(column.label) || 0) + amount)
    }
    return COLLECTION_SUMMARY_COLUMNS.map((column) => ({
      label: column.label,
      amount: totals.get(column.label) || 0,
    }))
  }, [result])

  const printTitle = useMemo(() => {
    if (isClassWisePrint && isReceivableReport) return 'Fee Receivables Class Wise'
    if (isCollectionPrint) return 'FEE Collection'
    return result?.title || selectedReport?.title || 'Fee Report'
  }, [isClassWisePrint, isReceivableReport, isCollectionPrint, result, selectedReport])

  const amountColumnKey = useMemo(() => {
    if (!result?.columns?.length) return null
    const moneyCol = [...result.columns].reverse().find((col) => col.format === 'money')
    return moneyCol?.key || result.columns[result.columns.length - 1]?.key
  }, [result])

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{`
        @page {
          size: A4 ${isClassWisePrint && isReceivableReport ? 'landscape' : 'portrait'};
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
          /* Modal must not appear on paper */
          .fee-result-modal { display: none !important; }
          .print-page-root,
          .print-main-wrap,
          .print-content-wrap {
            background: #ffffff !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Clear CampusShell mobile header offset on paper. */
          .print-main-wrap main > :not(header),
          main > .print-content-wrap {
            padding: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
          .print-sheet {
            display: block !important;
            width: 100% !important;
            font-size: 12px !important;
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
            overflow: hidden !important;
            word-wrap: break-word !important;
          }
          .legacy-print-table thead th {
            background: #d9d9d9 !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .legacy-print-table tr { page-break-inside: avoid !important; }
          .legacy-print-table .total-row td {
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .legacy-print-table .class-header-row td {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            text-align: center !important;
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
                <p className="text-sm font-medium">Loading Fee Reports…</p>
              </div>
            </div>
          ) : (
            <>
              <section className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-800">Fee Reports</h1>
                      <p className="text-sm text-slate-500">
                        Director-grade insights for defaulters, collections, and portfolio health.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/campus/reports/income"
                    className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    Open Income P&amp;L →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <SnapshotCard
                    label="Collected today"
                    value={snapshot ? `Rs ${money(snapshot.collectedToday)}` : '—'}
                    icon={Wallet}
                    accent="emerald"
                  />
                  <SnapshotCard
                    label="Collected MTD"
                    value={snapshot ? `Rs ${money(snapshot.collectedMtd)}` : '—'}
                    hint={
                      snapshot
                        ? `Last month same days: Rs ${money(snapshot.collectedLastMonthSamePeriod)}`
                        : undefined
                    }
                    icon={TrendingUp}
                    accent="indigo"
                  />
                  <SnapshotCard
                    label="Total receivable"
                    value={snapshot ? `Rs ${money(snapshot.totalReceivable)}` : '—'}
                    icon={AlertTriangle}
                    accent="rose"
                  />
                  <SnapshotCard
                    label="Defaulters"
                    value={snapshot ? money(snapshot.defaulterCount) : '—'}
                    hint={
                      snapshot ? `${money(snapshot.activeStudentCount)} active students` : undefined
                    }
                    icon={HandCoins}
                    accent="amber"
                  />
                  <SnapshotCard
                    label="Recovery"
                    value={
                      snapshot ? `${Number(snapshot.recoveryPercent || 0).toFixed(1)}%` : '—'
                    }
                    hint={
                      snapshot
                        ? `Received Rs ${money(snapshot.receivedAllTime)} / charged Rs ${money(snapshot.chargedAllTime)}`
                        : undefined
                    }
                    icon={Percent}
                    accent="violet"
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
                          No extra filters for this report. Click Generate to run it.
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
                <div className="fee-result-modal no-print fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
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
                          {result?.title || selectedReport?.title || 'Fee report'}
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
                              onClick={() =>
                                handlePrint(
                                  result?.reportId === 'overall-receivable-class-wise'
                                    ? 'class-wise'
                                    : 'default',
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Printer size={16} /> Print
                            </button>
                            {result?.reportId === 'overall-receivable' ? (
                              <button
                                type="button"
                                onClick={() => handlePrint('class-wise')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Printer size={16} /> Print class wise
                              </button>
                            ) : null}
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
                            <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-900">
                              Total: <strong>{money(result.totalAmount)}</strong>
                            </span>
                            {(result.extraKpis || []).map((kpi) => (
                              <span key={kpi.key} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
                                {kpi.label}:{' '}
                                <strong>
                                  {kpi.format === 'money' || kpi.format === 'number'
                                    ? money(kpi.value)
                                    : kpi.format === 'percent'
                                      ? `${kpi.value}%`
                                      : kpi.value}
                                </strong>
                              </span>
                            ))}
                          </div>

                          <ReportChart chart={result.chart} />

                          {expectedIncome ? (
                            <div className="space-y-4 text-sm">
                              <p className="text-slate-600">
                                Session{' '}
                                <span className="font-semibold text-slate-800">
                                  {expectedIncome.sessionLabel || '—'}
                                </span>
                                {' · '}
                                For the month of{' '}
                                <span className="font-semibold text-slate-800">
                                  {expectedIncome.forMonthLabel || '—'}
                                </span>
                              </p>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <h3 className="mb-2 font-semibold">Tuition Fee</h3>
                                  <table className="min-w-full border-collapse text-[13px] leading-snug">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-[var(--campus-primary)] text-left text-xs uppercase tracking-wide text-white">
                                        <th className="px-3 py-2">Tuition Fee</th>
                                        <th className="px-3 py-2 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(expectedIncome.tuitionByMonth || []).map((row) => (
                                        <tr
                                          key={`${row.year}-${row.month}`}
                                          className="border-b border-slate-100"
                                        >
                                          <td className="px-3 py-1.5">{row.monthLabel}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums">
                                            {money(row.amount)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-100 font-semibold">
                                        <td className="px-3 py-1.5">TOTAL</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">
                                          {money(expectedIncome.tuitionTotal)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <div>
                                  <h3 className="mb-2 font-semibold">Other Income</h3>
                                  <table className="min-w-full border-collapse text-[13px] leading-snug">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-[var(--campus-primary)] text-left text-xs uppercase tracking-wide text-white">
                                        <th className="px-3 py-2">Other Income</th>
                                        <th className="px-3 py-2 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(expectedIncome.fundsOverall || []).map((row) => (
                                        <tr key={row.fundTypeId} className="border-b border-slate-100">
                                          <td className="px-3 py-1.5">{row.fundTypeName}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums">
                                            {money(row.amount)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-100 font-semibold">
                                        <td className="px-3 py-1.5">TOTAL</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">
                                          {money(expectedIncome.fundsTotal)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <p>
                                  Net Total:{' '}
                                  <strong>{money(expectedIncome.netTotal ?? result.totalAmount)}</strong>
                                </p>
                                <p>
                                  Active students:{' '}
                                  <strong>{money(expectedIncome.activeStudentCount)}</strong>
                                </p>
                              </div>
                              <p className="text-slate-600">
                                In Words:{' '}
                                <span className="font-medium text-slate-800">
                                  {amountToWordsPk(expectedIncome.netTotal ?? result.totalAmount)}
                                </span>
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border-collapse text-[13px] leading-snug">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-[var(--campus-primary)] text-left text-xs uppercase tracking-wide text-white">
                                    {(result.columns || []).map((col) => (
                                      <th
                                        key={col.key}
                                        className={`px-3 py-2.5 font-semibold ${
                                          col.format === 'money' ||
                                          col.format === 'number' ||
                                          col.format === 'percent'
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
                                            className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600"
                                          >
                                            {row.label}
                                          </td>
                                        </tr>
                                      ) : (
                                        <tr
                                          key={`r-${index}`}
                                          className="border-b border-slate-100 hover:bg-slate-50"
                                        >
                                          {(result.columns || []).map((col) => (
                                            <td
                                              key={col.key}
                                              className={`px-3 py-2 ${
                                                col.format === 'money' ||
                                                col.format === 'number' ||
                                                col.format === 'percent'
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
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {result ? (
                <>
                  {/* Print sheet — portrait legacy format */}
                  <div className="print-only print-sheet">
                    {expectedIncome ? null : (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 10,
                          gap: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.3 }}>
                            {schoolName}
                          </div>
                          <div style={{ fontSize: 12, marginTop: 2 }}>{campusLabel}</div>
                          <div style={{ fontSize: 12 }}>Tel. {campusPhone}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{printTitle}</div>
                          <div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-line' }}>
                            {printSubtitle}
                          </div>
                        </div>
                      </div>
                    )}

                    {isClassWisePrint && isReceivableReport ? (
                      <table className="legacy-print-table">
                        <thead>
                          <tr>
                            <th style={{ width: '8%' }}>Reg. No.</th>
                            <th style={{ width: '28%' }}>Student Name</th>
                            <th style={{ width: '10%' }}>Actual Fee</th>
                            <th style={{ width: '11%' }}>{prevFundLabel}</th>
                            <th style={{ width: '11%' }}>{admissionFundLabel}</th>
                            <th style={{ width: '11%' }}>{miscFundLabel}</th>
                            <th style={{ width: '9%' }}>T.F</th>
                            <th style={{ width: '12%' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivableClassWiseSections.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center' }}>
                                No report rows found.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {receivableClassWiseSections.map((section) => (
                                <Fragment key={`cls-${section.className}`}>
                                  <tr className="class-header-row">
                                    <td colSpan={8}>{section.className}</td>
                                  </tr>
                                  {section.students.map((row) => (
                                    <tr key={`cw-${section.className}-${row.studentId}`}>
                                      <td style={{ textAlign: 'center' }}>{dash(row.studentId)}</td>
                                      <td>{dash(row.studentName)}</td>
                                      <td style={{ textAlign: 'right' }}>{printAmount(row.actualFee)}</td>
                                      <td style={{ textAlign: 'right' }}>{printAmount(row.prevBalance)}</td>
                                      <td style={{ textAlign: 'right' }}>{printAmount(row.admissionFee)}</td>
                                      <td style={{ textAlign: 'right' }}>{printAmount(row.miscCharges)}</td>
                                      <td style={{ textAlign: 'right' }}>
                                        {printAmount(row.tuitionOutstanding)}
                                      </td>
                                      <td style={{ textAlign: 'right' }}>
                                        {printAmount(row.classWiseTotal)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="total-row">
                                    <td />
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.actualFee)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.prevBalance)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.admissionFee)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.miscCharges)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.tuitionOutstanding)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                      {printAmount(section.totals.classWiseTotal)}
                                    </td>
                                  </tr>
                                </Fragment>
                              ))}
                              <tr className="total-row">
                                <td />
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.actualFee)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.prevBalance)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.admissionFee)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.miscCharges)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.tuitionOutstanding)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  {printAmount(receivableClassWiseMasterTotals.classWiseTotal)}
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    ) : expectedIncome ? (
                      <div className="expected-income-print">
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginBottom: 10,
                            tableLayout: 'fixed',
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  width: '72px',
                                  verticalAlign: 'top',
                                  padding: 0,
                                  border: 'none',
                                }}
                              >
                                <img
                                  src={SCHOOL_LOGO_PATH}
                                  alt=""
                                  style={{
                                    height: 64,
                                    width: 64,
                                    objectFit: 'contain',
                                    display: 'block',
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  verticalAlign: 'middle',
                                  textAlign: 'center',
                                  padding: '0 8px',
                                  border: 'none',
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: 'Arial, Helvetica, sans-serif',
                                    fontSize: 26,
                                    fontWeight: 400,
                                    lineHeight: 1.2,
                                    letterSpacing: 0,
                                    color: '#000',
                                  }}
                                >
                                  Monthly Estimated Income
                                  <br />
                                  Report
                                </div>
                              </td>
                              <td
                                style={{
                                  width: '230px',
                                  verticalAlign: 'top',
                                  padding: 0,
                                  border: 'none',
                                }}
                              >
                                <table
                                  className="legacy-print-table"
                                  style={{
                                    width: '100%',
                                    fontSize: 10,
                                    tableLayout: 'fixed',
                                    margin: 0,
                                  }}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        colSpan={2}
                                        style={{
                                          textAlign: 'center',
                                          fontWeight: 700,
                                          padding: '3px 4px',
                                        }}
                                      >
                                        {schoolName}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ width: '38%', padding: '2px 4px' }}>SOP</td>
                                      <td style={{ padding: '2px 4px' }}>SBS-ACC-WI-03-01</td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: '2px 4px' }}>Revision</td>
                                      <td style={{ padding: '2px 4px' }}>00</td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: '2px 4px' }}>Issue Date</td>
                                      <td style={{ padding: '2px 4px' }}>
                                        {formatPrintDate(
                                          expectedIncome.generatedAt ||
                                            result.generatedAt ||
                                            new Date(),
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginBottom: 12,
                            fontSize: 12,
                            tableLayout: 'fixed',
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ border: 'none', padding: '0 8px 0 0', width: '55%' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ whiteSpace: 'nowrap' }}>For The Month of :</span>
                                  <span
                                    style={{
                                      border: '2px solid #000',
                                      padding: '3px 16px',
                                      minWidth: 130,
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      display: 'inline-block',
                                    }}
                                  >
                                    {expectedIncome.forMonthLabel || '—'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ border: 'none', padding: 0, width: '45%' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ whiteSpace: 'nowrap' }}>Campus :</span>
                                  <span
                                    style={{
                                      border: '2px solid #000',
                                      padding: '3px 16px',
                                      minWidth: 140,
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      display: 'inline-block',
                                    }}
                                  >
                                    {campusLabel}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          <table className="legacy-print-table" style={{ flex: 1 }}>
                            <thead>
                              <tr>
                                <th>Tuition Fee</th>
                                <th style={{ width: '32%' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(expectedIncome.tuitionByMonth || []).map((row) => (
                                <tr key={`p-t-${row.year}-${row.month}`}>
                                  <td>{row.monthLabel}</td>
                                  <td style={{ textAlign: 'center' }}>{printAmount(row.amount)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td style={{ fontWeight: 700 }}>TOTAL</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                  {printAmount(expectedIncome.tuitionTotal)}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <table className="legacy-print-table" style={{ flex: 1 }}>
                            <thead>
                              <tr>
                                <th>Other Income</th>
                                <th style={{ width: '32%' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const funds = expectedIncome.fundsOverall || []
                                const monthCount = (expectedIncome.tuitionByMonth || []).length
                                const pad = Math.max(0, monthCount - funds.length)
                                return (
                                  <>
                                    {funds.map((row) => (
                                      <tr key={`p-f-${row.fundTypeId}`}>
                                        <td>{row.fundTypeName}</td>
                                        <td style={{ textAlign: 'center' }}>
                                          {printAmount(row.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                    {Array.from({ length: pad }).map((_, i) => (
                                      <tr key={`p-f-pad-${i}`}>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                      </tr>
                                    ))}
                                    <tr className="total-row">
                                      <td style={{ fontWeight: 700 }}>TOTAL</td>
                                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                        {printAmount(expectedIncome.fundsTotal)}
                                      </td>
                                    </tr>
                                  </>
                                )
                              })()}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ marginTop: 14, fontSize: 12 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>Net Total in Figures :</span>
                            <span
                              style={{
                                border: '2px solid #000',
                                padding: '3px 16px',
                                fontWeight: 700,
                                minWidth: 120,
                                textAlign: 'center',
                              }}
                            >
                              {printAmount(expectedIncome.netTotal)}
                            </span>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            In Words :{' '}
                            <span style={{ textDecoration: 'underline', fontWeight: 600 }}>
                              {amountToWordsPk(expectedIncome.netTotal)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 18,
                            }}
                          >
                            <span>Total Active Students (At time of print) :</span>
                            <span
                              style={{
                                border: '2px solid #000',
                                padding: '4px 18px',
                                fontWeight: 700,
                                fontSize: 14,
                                minWidth: 64,
                                textAlign: 'center',
                              }}
                            >
                              {printAmount(expectedIncome.activeStudentCount)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              gap: 24,
                              marginTop: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>Date :</span>
                              <span
                                style={{
                                  border: '2px solid #000',
                                  padding: '3px 14px',
                                  minWidth: 100,
                                  textAlign: 'center',
                                }}
                              >
                                {formatPrintDate(
                                  expectedIncome.generatedAt || result.generatedAt || new Date(),
                                )}
                              </span>
                            </div>
                            <div style={{ flex: 1, maxWidth: 360 }}>
                              <div>Signature of Campus Head :</div>
                              <div
                                style={{
                                  borderBottom: '1px solid #000',
                                  marginTop: 22,
                                  height: 1,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isCollectionPrint ? (
                      <>
                        <table className="legacy-print-table">
                          <thead>
                            <tr>
                              <th style={printCellStyle('rcptId', 'number', 9)}>Rcpt ID</th>
                              <th style={printCellStyle('manualRcptNo', 'text', 9)}>Manual Rcpt#</th>
                              <th style={printCellStyle('transactionId', 'number', 9)}>Trx ID</th>
                              <th style={printCellStyle('studentId', 'number', 9)}>Std ID</th>
                              <th style={printCellStyle('studentName', 'text', 9)}>Name</th>
                              <th style={printCellStyle('className', 'text', 9)}>Class/Section</th>
                              <th style={printCellStyle('fundTypeName', 'text', 9)}>Type</th>
                              <th style={printCellStyle('month', 'text', 10)}>Month</th>
                              <th style={printCellStyle('year', 'text', 10)}>Year</th>
                              <th style={printCellStyle('received', 'money', 10)}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(result.rows || []).map((row, index) => (
                              <tr key={`pc-${index}`}>
                                <td style={printCellStyle('rcptId', 'number', 10)}>{dash(row.rcptId)}</td>
                                <td style={printCellStyle('manualRcptNo', 'text', 10)}>{dash(row.manualRcptNo)}</td>
                                <td style={printCellStyle('transactionId', 'number', 10)}>{dash(row.transactionId)}</td>
                                <td style={printCellStyle('studentId', 'number', 10)}>{dash(row.studentId)}</td>
                                <td style={printCellStyle('studentName', 'text', 10)}>{dash(row.studentName)}</td>
                                <td style={printCellStyle('className', 'text', 10)}>{dash(row.className)}</td>
                                <td style={printCellStyle('fundTypeName', 'text', 10)}>{dash(row.fundTypeName)}</td>
                                <td style={printCellStyle('month', 'text', 10)}>
                                  {dash(
                                    typeof row.month === 'string' && /[a-zA-Z]/.test(row.month)
                                      ? row.month
                                      : formatMonthName(row.month),
                                  )}
                                </td>
                                <td style={printCellStyle('year', 'text', 10)}>
                                  {dash(row.year != null && row.year !== '' ? String(row.year).replace(/,/g, '') : '')}
                                </td>
                                <td style={printCellStyle('received', 'money', 9)}>
                                  {printAmount(row.received)}
                                </td>
                              </tr>
                            ))}
                            {(result.rows || []).length === 0 ? (
                              <tr>
                                <td colSpan={10} style={{ textAlign: 'center' }}>
                                  No report rows found.
                                </td>
                              </tr>
                            ) : (
                              <tr className="total-row">
                                <td colSpan={9} style={{ fontWeight: 700, textAlign: 'right' }}>
                                  Total
                                </td>
                                <td style={{ ...printCellStyle('received', 'money', 10), fontWeight: 700 }}>
                                  {printAmount(result.totalAmount)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        <table className="legacy-print-summary">
                          <thead>
                            <tr>
                              {collectionSummary.map((item) => (
                                <th key={item.label}>{item.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {collectionSummary.map((item) => (
                                <td key={`v-${item.label}`}>{printAmount(item.amount)}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <table className="legacy-print-table">
                        <thead>
                          <tr>
                            {(result.columns || []).map((col) => (
                              <th
                                key={col.key}
                                style={printCellStyle(col.key, col.format, result.columns.length)}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(result.rows || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={Math.max(result.columns?.length || 1, 1)}
                                style={{ textAlign: 'center' }}
                              >
                                No report rows found.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {(result.rows || []).map((row, index) => (
                                <tr key={`pg-${index}`}>
                                  {(result.columns || []).map((col) => (
                                    <td
                                      key={col.key}
                                      style={printCellStyle(col.key, col.format, result.columns.length)}
                                    >
                                      {col.format === 'money'
                                        ? printAmount(row[col.key])
                                        : dash(row[col.key])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              {amountColumnKey ? (
                                <tr>
                                  {(result.columns || []).map((col, colIndex) => {
                                    const isLast = col.key === amountColumnKey
                                    const isLabel =
                                      colIndex ===
                                      (result.columns || []).findIndex((c) => c.key === amountColumnKey) - 1
                                    if (isLast) {
                                      return (
                                        <td
                                          key={col.key}
                                          style={printCellStyle(col.key, 'money', result.columns.length)}
                                        >
                                          {printAmount(result.totalAmount)}
                                        </td>
                                      )
                                    }
                                    if (isLabel) {
                                      return (
                                        <td
                                          key={col.key}
                                          style={{
                                            ...printCellStyle(col.key, col.format, result.columns.length),
                                            fontWeight: 700,
                                            textAlign: 'center',
                                          }}
                                        >
                                          Total
                                        </td>
                                      )
                                    }
                                    return (
                                      <td
                                        key={col.key}
                                        style={printCellStyle(col.key, col.format, result.columns.length)}
                                      />
                                    )
                                  })}
                                </tr>
                              ) : null}
                            </>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </CampusShell>
    </div>
  )
}

export default FeeReportsPage

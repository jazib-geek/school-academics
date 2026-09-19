import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Cake,
  ClipboardList,
  Download,
  FileBarChart2,
  Hash,
  IdCard,
  KeyRound,
  LayoutList,
  ListOrdered,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Star,
  UserCircle2,
  Users,
  UserX,
  Wallet,
  X,
} from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { STUDENT_REPORT_PERMISSIONS } from '../../../constants/campusPermissions.js'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getClasses } from '../../../services/classService'
import { sortClassesByCustomOrder } from '../../../services/classSort'
import {
  getSmartStudentCatalog,
  getStudentExecutiveSnapshot,
  runSmartStudentReport,
} from '../../../services/studentReportService'

const FREQUENT_REPORT_IDS = [
  'admission-list-serial',
  'admission-list-class',
  'family-list',
  'phone-list',
  'strength',
  'strength-with-fee',
  'admission-count',
  'deactivated',
  'locality',
  'family-message',
  'family-accounts',
]

const CATEGORIES = [
  { id: 'frequent', label: 'Frequently used', icon: Star },
  { id: 'admission', label: 'Admission', icon: FileBarChart2 },
  { id: 'strength', label: 'Strength & locality', icon: Building2 },
  { id: 'family', label: 'Family & contacts', icon: Users },
  { id: 'demographics', label: 'Demographics', icon: MapPin },
]

const STRENGTH_LAYOUTS = new Set(['strength', 'strength-with-fee'])
const ADMISSION_LAYOUTS = new Set(['admission-list'])
/** Reports whose rows are classes (not student lists). */
const CLASS_LIST_REPORT_IDS = new Set(['admission-count', 'strength', 'strength-with-fee'])

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

const formatLongDate = (value) => {
  if (!value) return '-'
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) return formatPrintDate(value)
  return dateObj.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatLegacyPrintDate = (value) => {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (y && m && d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = months[Number(m) - 1]
    if (monthName) return `${d} ${monthName} ${y}`
  }
  return formatLongDate(value)
}

const formatCell = (value, format, key) => {
  if (value == null || value === '') {
    const keyNorm = String(key || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
    if (keyNorm.endsWith('contact') || keyNorm.includes('phone') || keyNorm.includes('mobile')) {
      return '-'
    }
    return '—'
  }
  const keyNorm = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  if (keyNorm === 'regid' || keyNorm === 'regno') return String(value)
  if (format === 'money') return printAmount(value)
  if (format === 'number') return money(value)
  if (format === 'percent') {
    return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
  }
  return String(value)
}

const PRINT_NARROW_KEYS =
  /^(serial|regid|familyid|classid|localityid|studentid|male|female|total|admissions|withdrawal|netactive|studentcount|activestudents|ac|fee|concession|actualfee|tuitionfee)$/i

const PRINT_MEDIUM_KEYS =
  /^(classname|class|doa|leavedate|dob|gender|age|locality|fathercontact|mothercontact|smscontact|password)$/i

const PRINT_WIDE_KEYS = /^(studentname|name|fathername|mothername|fatheroccupation|field|value|leftreason|contact)$/i

const PRINT_MONEY_KEYS = /amount|fee|concession|actualfee|tuitionfee|ac/

const isPrintMoneyColumn = (key, format) =>
  format === 'money' || PRINT_MONEY_KEYS.test(String(key || '').toLowerCase())

const filterStudentCatalogByPermission = (items) =>
  (items || []).filter((item) => {
    const code = STUDENT_REPORT_PERMISSIONS[item.id]
    if (!code) return false
    return hasCampusPermission(code)
  })

const isPrintNarrowColumn = (key, format) => {
  const k = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
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
  const k = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

  // Deactivated list (12 cols, landscape): keep reason readable and money headers usable.
  if (columnCount >= 10) {
    if (k === 'serial') return '3%'
    if (k === 'regid') return '5%'
    if (k === 'familyid') return '5%'
    if (k === 'studentname' || k === 'name') return '11%'
    if (k === 'classname') return '8%'
    if (k === 'leavedate') return '7%'
    if (k === 'fathername') return '10%'
    if (k === 'contact') return '10%'
    if (k === 'acoutstanding' || k === 'tfoutstanding' || k === 'netbalance') return '6%'
    if (k === 'leftreason') return '23%'
  }

  if (k === 'leftreason') return columnCount >= 8 ? '22%' : '28%'
  if (k === 'contact') return columnCount >= 8 ? '14%' : '16%'

  if (PRINT_WIDE_KEYS.test(k) || (format === 'text' && k.endsWith('name'))) {
    return columnCount <= 4 ? '42%' : columnCount >= 12 ? '14%' : '22%'
  }

  if (isPrintMoneyColumn(key, format)) return columnCount >= 12 ? '7%' : '10%'
  if (isPrintNarrowColumn(key, format)) return columnCount >= 12 ? '5%' : '7%'
  if (PRINT_MEDIUM_KEYS.test(k) || k.includes('class')) return columnCount >= 12 ? '9%' : '12%'
  return undefined
}

const getPrintColumnAlign = (key, format) => {
  const k = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  if (k === 'leftreason' || k === 'contact') return 'left'
  if (isPrintMoneyColumn(key, format) || isPrintNarrowColumn(key, format)) return 'center'
  return 'left'
}

const printCellStyle = (key, format, columnCount, { header = false } = {}) => {
  const width = getPrintColumnWidth(key, format, columnCount)
  const textAlign = getPrintColumnAlign(key, format)
  const k = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
  const isReason = k === 'leftreason'
  return {
    ...(width ? { width } : null),
    textAlign,
    fontWeight: header ? 700 : 400,
    whiteSpace: 'normal',
    // Reason: wrap on spaces first; other cells may break long tokens.
    overflowWrap: isReason ? 'break-word' : 'anywhere',
    wordBreak: isReason ? 'normal' : 'break-word',
  }
}

const isPrintReasonColumn = (key) =>
  String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase() === 'leftreason'

/** Admission list: drop Fee / Concession / Password; expose TuitionFee only. */
const ADMISSION_DROP_KEYS = new Set(['fee', 'concession', 'password'])

function isAdmissionReport(result) {
  if (!result) return false
  if (ADMISSION_LAYOUTS.has(result.layout)) return true
  const id = String(result.reportId || result.ReportId || '').toLowerCase()
  return id === 'admission-list-serial' || id === 'admission-list-class'
}

function normalizeAdmissionResult(result) {
  if (!isAdmissionReport(result)) return result

  const columns = []
  for (const col of result.columns || []) {
    const key = String(col.key || col.Key || '')
    const label = String(col.label || col.Label || '')
    const keyLower = key.toLowerCase()
    const labelLower = label.toLowerCase()
    if (ADMISSION_DROP_KEYS.has(keyLower) || ADMISSION_DROP_KEYS.has(labelLower)) continue
    if (keyLower === 'actualfee' || labelLower === 'actual fee') {
      columns.push({ ...col, key: 'tuitionFee', label: 'TuitionFee', format: 'money' })
      continue
    }
    if (keyLower === 'tuitionfee') {
      columns.push({ ...col, key: 'tuitionFee', label: 'TuitionFee', format: col.format || 'money' })
      continue
    }
    columns.push({ ...col, key })
  }

  const rows = (result.rows || []).map((row) => {
    const next = { ...row }
    if (next.tuitionFee == null && (next.actualFee != null || next.ActualFee != null)) {
      next.tuitionFee = next.actualFee ?? next.ActualFee
    }
    delete next.fee
    delete next.Fee
    delete next.concession
    delete next.Concession
    delete next.password
    delete next.Password
    delete next.actualFee
    delete next.ActualFee
    return next
  })

  return { ...result, layout: result.layout || 'admission-list', columns, rows }
}

/** Deactivated list: Net Balance = AC Balance + TF Balance (frontend). */
function normalizeDeactivatedResult(result) {
  if (!result) return result
  const reportKey = String(result.reportId || result.layout || '').toLowerCase()
  if (reportKey !== 'deactivated') return result

  const sourceColumns = result.columns || []
  const columns = []
  let inserted = false
  for (const col of sourceColumns) {
    const key = String(col.key || '')
    columns.push(col)
    if (key.toLowerCase() === 'tfoutstanding') {
      columns.push({ key: 'netBalance', label: 'Net Balance', format: 'money' })
      inserted = true
    }
  }
  if (!inserted) {
    const reasonIdx = columns.findIndex((c) => String(c.key || '').toLowerCase() === 'leftreason')
    const netCol = { key: 'netBalance', label: 'Net Balance', format: 'money' }
    if (reasonIdx >= 0) columns.splice(reasonIdx, 0, netCol)
    else columns.push(netCol)
  }

  const rows = (result.rows || []).map((row) => {
    const ac = Number(row.acOutstanding ?? row.AcOutstanding ?? 0)
    const tf = Number(row.tfOutstanding ?? row.TfOutstanding ?? 0)
    return { ...row, netBalance: ac + tf }
  })

  return { ...result, columns, rows }
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

const REPORT_NATURE_BADGE = {
  admission: 'bg-sky-500',
  strength: 'bg-emerald-500',
  family: 'bg-purple-500',
  demographics: 'bg-violet-500',
  deactivated: 'bg-rose-500',
}

const REPORT_ICONS = {
  'admission-list-serial': ListOrdered,
  'admission-list-class': LayoutList,
  'admission-count': Hash,
  'family-list': Users,
  'phone-list': Phone,
  deactivated: UserX,
  strength: ClipboardList,
  'strength-with-fee': Wallet,
  'family-accounts': KeyRound,
  locality: MapPin,
  'family-message': MessageSquare,
  'age-list': IdCard,
  'birthday-list': Cake,
  'student-profile': UserCircle2,
}

const getReportNatureKey = (item) => {
  if (item?.id === 'deactivated') return 'deactivated'
  return item?.category && REPORT_NATURE_BADGE[item.category] ? item.category : 'admission'
}

const getReportIcon = (item) => REPORT_ICONS[item?.id] || FileBarChart2

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

function buildStrengthPrintRows(rows, includeFee) {
  // Grade order within each band (stable sort keeps classSort when bandOrder ties).
  const ordered = sortClassesByCustomOrder([...(rows || [])], 'className').sort((a, b) => {
    const ao = Number(a.bandOrder ?? 99)
    const bo = Number(b.bandOrder ?? 99)
    return ao - bo
  })

  const out = []
  let lastBand = ''
  let bandMale = 0
  let bandFemale = 0
  let bandTotal = 0
  let bandFee = 0
  let netMale = 0
  let netFemale = 0
  let netTotal = 0
  let netFee = 0

  const flushBand = () => {
    if (!lastBand) return
    out.push({
      __type: 'total',
      label: 'TOTAL',
      male: bandMale,
      female: bandFemale,
      total: bandTotal,
      tuitionFee: bandFee,
    })
    netMale += bandMale
    netFemale += bandFemale
    netTotal += bandTotal
    netFee += bandFee
    bandMale = 0
    bandFemale = 0
    bandTotal = 0
    bandFee = 0
  }

  for (const row of ordered) {
    const band = row.band || 'Other'
    if (band !== lastBand) {
      flushBand()
      out.push({ __type: 'group', label: band })
      lastBand = band
    }
    out.push({ __type: 'data', ...row })
    bandMale += Number(row.male || 0)
    bandFemale += Number(row.female || 0)
    bandTotal += Number(row.total || 0)
    if (includeFee) bandFee += Number(row.tuitionFee || 0)
  }
  flushBand()

  if (out.length > 0) {
    out.push({
      __type: 'total',
      label: 'NET TOTAL',
      male: netMale,
      female: netFemale,
      total: netTotal,
      tuitionFee: netFee,
    })
  }
  return out
}

export default function CampusStudentReportsPage() {
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
    const reportKey = String(result.reportId || result.layout || '').toLowerCase()

    if (STRENGTH_LAYOUTS.has(result.layout || result.reportId)) {
      return buildStrengthPrintRows(result.rows, result.layout === 'strength-with-fee')
    }

    if (CLASS_LIST_REPORT_IDS.has(reportKey)) {
      const ordered = sortClassesByCustomOrder(result.rows, 'className')
      const rows = ordered.map((row, index) =>
        reportKey === 'admission-count'
          ? { __type: 'data', ...row, serial: index + 1 }
          : { __type: 'data', ...row },
      )
      if (reportKey === 'admission-count') {
        const totalAdmissions = ordered.reduce((sum, row) => sum + Number(row.admissions || 0), 0)
        const totalWithdrawal = ordered.reduce((sum, row) => sum + Number(row.withdrawal || 0), 0)
        const totalNet = ordered.reduce((sum, row) => sum + Number(row.netActive || 0), 0)
        rows.push({
          __type: 'total',
          admissions: totalAdmissions,
          withdrawal: totalWithdrawal,
          netActive: totalNet,
        })
      }
      return rows
    }

    if (reportKey === 'phone-list' && !result.layoutPayload?.classFiltered) {
      const byReg = [...result.rows].sort((a, b) => Number(a.regId || 0) - Number(b.regId || 0))
      const ordered = sortClassesByCustomOrder(byReg, 'className')
      return ordered.map((row, index) => ({ __type: 'data', ...row, serial: index + 1 }))
    }

    if (reportKey === 'deactivated') {
      const rows = result.rows.map((row) => ({ __type: 'data', ...row }))
      const sumKey = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
      rows.push({
        __type: 'total',
        label: 'TOTAL',
        acOutstanding: sumKey('acOutstanding'),
        tfOutstanding: sumKey('tfOutstanding'),
        netBalance: sumKey('netBalance'),
      })
      return rows
    }

    if (!groupKey) return result.rows.map((row) => ({ __type: 'data', ...row }))

    const sorted = [...result.rows].sort((a, b) => {
      const ga = String(a[groupKey] || 'Unassigned').toLowerCase()
      const gb = String(b[groupKey] || 'Unassigned').toLowerCase()
      if (ga < gb) return -1
      if (ga > gb) return 1
      return 0
    })

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

  const strengthPrintRows = useMemo(() => {
    if (!result || !STRENGTH_LAYOUTS.has(result.layout || result.reportId)) return []
    return buildStrengthPrintRows(result.rows, result.layout === 'strength-with-fee')
  }, [result])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setIsBooting(true)
      try {
        const [catalogData, snapshotData, classes] = await Promise.all([
          getSmartStudentCatalog(),
          getStudentExecutiveSnapshot().catch(() => null),
          getClasses().catch(() => []),
        ])
        if (cancelled) return
        const allowedCatalog = filterStudentCatalogByPermission(catalogData)
        setCatalog(allowedCatalog)
        setSnapshot(snapshotData)
        setClassOptions(classes || [])

        const presetFromUrl = searchParams.get('preset')
        const initial =
          allowedCatalog.find((item) => item.id === presetFromUrl) ||
          allowedCatalog.find((item) => item.id === 'admission-list-serial') ||
          allowedCatalog[0]
        if (initial) {
          setReportId(initial.id)
          setParams(buildDefaultParams(initial))
        }
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError?.response?.data?.message || 'Unable to load student reports.')
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
    setSearchParams(report.isPreset ? { preset: report.id } : {})

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
      const data = await runSmartStudentReport(id, cleaned)
      setResult(normalizeDeactivatedResult(normalizeAdmissionResult(data)))
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
    const reportKey = String(result.reportId || result.layout || '').toLowerCase()
    const dataRows = CLASS_LIST_REPORT_IDS.has(reportKey)
      ? sortClassesByCustomOrder(result.rows, 'className').map((row, index) =>
          reportKey === 'admission-count' ? { ...row, serial: index + 1 } : row,
        )
      : result.rows
    const headers = result.columns.map((c) => c.label)
    const lines = [
      headers.join(','),
      ...dataRows.map((row) =>
        result.columns
          .map((col) => {
            const raw = row[col.key] ?? ''
            const text = String(raw).replaceAll('"', '""')
            return `"${text}"`
          })
          .join(','),
      ),
    ]
    if (reportKey === 'admission-count' || reportKey === 'deactivated') {
      const sumKey = (key) => dataRows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
      const totals =
        reportKey === 'admission-count'
          ? {
              admissions: sumKey('admissions'),
              withdrawal: sumKey('withdrawal'),
              netActive: sumKey('netActive'),
            }
          : {
              acOutstanding: sumKey('acOutstanding'),
              tfOutstanding: sumKey('tfOutstanding'),
              netBalance: sumKey('netBalance'),
            }
      lines.push(
        result.columns
          .map((col, index) => {
            if (index === 0) return '"TOTAL"'
            if (col.key in totals) return `"${totals[col.key]}"`
            return '""'
          })
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.reportId || 'student-report'}.csv`
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
          classNamePrefix="student-class-select"
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

  const isStrengthPrint = STRENGTH_LAYOUTS.has(result?.layout || result?.reportId)
  const isAdmissionPrint = isAdmissionReport(result)
  const isAdmissionCountPrint = result?.reportId === 'admission-count'
  const isPhoneListPrint = result?.reportId === 'phone-list' || result?.layout === 'phone-list'
  const isDeactivatedPrint = result?.reportId === 'deactivated' || result?.layout === 'deactivated'
  const pageOrientation = isDeactivatedPrint ? 'landscape' : 'portrait'

  const selectedClassLabel = useMemo(() => {
    if (!params.classCompositeId) return 'All'
    return (
      classSelectOptions.find((opt) => opt.value === String(params.classCompositeId))?.label ||
      params.classCompositeId
    )
  }, [params.classCompositeId, classSelectOptions])

  const phoneListClassLabel =
    (result?.layoutPayload?.classLabel && String(result.layoutPayload.classLabel).trim()) ||
    (params.classCompositeId && selectedClassLabel !== 'All' ? selectedClassLabel : '')

  const printSubtitle = useMemo(() => {
    if (!result) return ''
    const bits = []
    if (result.layoutPayload?.sortLabel) bits.push(result.layoutPayload.sortLabel)
    if (params.dateFrom || params.dateTo) {
      bits.push(`From: ${formatPrintDate(params.dateFrom)}   To: ${formatPrintDate(params.dateTo)}`)
    }
    if (params.classCompositeId) {
      const cls = classSelectOptions.find((opt) => opt.value === String(params.classCompositeId))
      bits.push(`Class : ${cls?.label || params.classCompositeId}`)
    } else if (isStrengthPrint || isAdmissionCountPrint) {
      bits.push('Class : All')
    }
    if (params.familyId) bits.push(`Family ID: ${params.familyId}`)
    if (params.studentId) bits.push(`Reg ID: ${params.studentId}`)
    if (params.classId || params.sectionId) {
      bits.push(`Class ID: ${params.classId || '-'}  Section ID: ${params.sectionId || '-'}`)
    }
    bits.push(`Date: ${formatLongDate(result.generatedAt)}`)
    return bits.join('   ')
  }, [params, result, classSelectOptions, isStrengthPrint, isAdmissionCountPrint])

  const printTitle = useMemo(() => {
    if (result?.reportId === 'admission-list-serial' || result?.reportId === 'admission-list-class') {
      return 'STUDENT ADMISSION LIST'
    }
    if (result?.reportId === 'admission-count') return 'ADMISSION COUNT REPORT'
    if (result?.reportId === 'phone-list') return 'Phone Number List'
    if (result?.reportId === 'deactivated') return 'DEACTIVATED (STRUCK OFF STUDENTS)'
    if (result?.reportId === 'strength-with-fee') return 'STRENGTH REPORT (WITH FEE)'
    if (result?.reportId === 'strength') return 'STRENGTH REPORT'
    return (result?.title || selectedReport?.title || 'Student Report').toUpperCase()
  }, [result, selectedReport])

  const admissionCountRangeLabel = useMemo(() => {
    const fromLabel = formatLegacyPrintDate(params.dateFrom)
    const toLabel = formatLegacyPrintDate(params.dateTo)
    if (fromLabel === '—' && toLabel === '—') return ''
    return `From ${fromLabel} to ${toLabel}`
  }, [params.dateFrom, params.dateTo])

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{`
        @page {
          size: A4 ${pageOrientation};
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
          .student-result-modal { display: none !important; }
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
            font-weight: 400 !important;
          }
          .print-sheet .print-school-name,
          .print-sheet .print-report-title {
            font-size: 16px !important;
            font-weight: 700 !important;
          }
          .print-sheet .print-meta {
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .legacy-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .legacy-print-table th,
          .legacy-print-table td {
            border: 1px solid #000 !important;
            padding: 4px 5px !important;
            vertical-align: middle !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            word-wrap: break-word !important;
            font-size: 12px !important;
            font-weight: 400 !important;
          }
          .legacy-print-table td.print-reason-cell,
          .legacy-print-table th.print-reason-cell {
            overflow-wrap: break-word !important;
            word-break: normal !important;
            word-wrap: break-word !important;
            white-space: normal !important;
            line-height: 1.25 !important;
            vertical-align: middle !important;
          }
          .legacy-print-table thead th {
            background: #d9d9d9 !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .legacy-print-table tr { page-break-inside: avoid !important; }
          .legacy-print-table .band-row td {
            text-align: left !important;
            font-weight: 700 !important;
            background: #ffffff !important;
          }
          .legacy-print-table .total-row td {
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
        }
        .print-only { display: none; }
      `}</style>

      <CampusShell
        headerContext="Student Reports"
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
                <p className="text-sm font-medium">Loading Student Reports…</p>
              </div>
            </div>
          ) : (
            <>
              <section className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                    <FileBarChart2 size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Reports</h1>
                    <p className="text-sm text-slate-500">
                      Enrollment lists, strength, and family contact sheets for campus follow-up.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <SnapshotCard
                    label="Active students"
                    value={snapshot ? money(snapshot.activeStudentCount) : '—'}
                    icon={Users}
                    accent="emerald"
                  />
                  <SnapshotCard
                    label="Struck off this month"
                    value={snapshot ? money(snapshot.struckOffMtd) : '—'}
                    icon={UserX}
                    accent="rose"
                  />
                  <SnapshotCard
                    label="Admissions this month"
                    value={snapshot ? money(snapshot.admissionsMtd) : '—'}
                    icon={FileBarChart2}
                    accent="indigo"
                  />
                  <SnapshotCard
                    label="Active families"
                    value={snapshot ? money(snapshot.activeFamilyCount) : '—'}
                    icon={Users}
                    accent="amber"
                  />
                  <SnapshotCard
                    label="Active classes"
                    value={snapshot ? money(snapshot.activeClassCount) : '—'}
                    icon={Building2}
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
                <div className="student-result-modal no-print fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
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
                          {result?.title || selectedReport?.title || 'Student report'}
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
                                  {kpi.format === 'money' || kpi.format === 'number'
                                    ? money(kpi.value)
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
                                          className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600"
                                        >
                                          {row.label}
                                        </td>
                                      </tr>
                                    ) : row.__type === 'total' ? (
                                      <tr key={`t-${index}`} className="bg-slate-200 font-semibold">
                                        {(result.columns || []).map((col, colIndex) => (
                                          <td
                                            key={col.key}
                                            className={`px-3 py-2 ${
                                              col.format === 'money' || col.format === 'number'
                                                ? 'text-right tabular-nums'
                                                : ''
                                            }`}
                                          >
                                            {colIndex === 0
                                              ? row.label || 'TOTAL'
                                              : col.key === 'className'
                                                ? ''
                                                : formatCell(row[col.key], col.format, col.key)}
                                          </td>
                                        ))}
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
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="print-only print-sheet">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                      gap: 12,
                      fontWeight: 400,
                    }}
                  >
                    <div>
                      <div className="print-school-name" style={{ letterSpacing: 0.2 }}>
                        {schoolName}
                      </div>
                      <div className="print-meta" style={{ marginTop: 1 }}>{campusLabel}</div>
                      <div className="print-meta">Tel: {campusPhone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="print-report-title">{printTitle}</div>
                      {isAdmissionCountPrint ? (
                        <>
                          <div className="print-meta" style={{ marginTop: 3 }}>Class : All</div>
                          {admissionCountRangeLabel ? (
                            <div className="print-meta">{admissionCountRangeLabel}</div>
                          ) : null}
                        </>
                      ) : isPhoneListPrint ? (
                        phoneListClassLabel ? (
                          <div className="print-meta" style={{ marginTop: 3 }}>{phoneListClassLabel}</div>
                        ) : (
                          <div className="print-meta" style={{ marginTop: 3 }}>All Classes</div>
                        )
                      ) : isStrengthPrint ? (
                        <>
                          <div className="print-meta" style={{ marginTop: 3 }}>Class : {selectedClassLabel}</div>
                          <div className="print-meta">Date: {formatLongDate(result.generatedAt)}</div>
                        </>
                      ) : isAdmissionPrint ? (
                        <>
                          <div className="print-meta" style={{ marginTop: 3 }}>
                            {result.layoutPayload?.sortLabel ||
                              (result.reportId === 'admission-list-serial'
                                ? 'By Reg ID'
                                : 'By Class/Section')}
                          </div>
                          <div className="print-meta">
                            As on Date : {formatPrintDate(result.generatedAt)}
                          </div>
                        </>
                      ) : (
                        <div className="print-meta" style={{ marginTop: 3 }}>{printSubtitle}</div>
                      )}
                    </div>
                  </div>

                  {isAdmissionCountPrint ? (
                    <table className="legacy-print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '10%' }}>Sr #</th>
                          <th style={{ width: '36%', textAlign: 'left' }}>Class Name</th>
                          <th style={{ width: '18%' }}>New Admissions</th>
                          <th style={{ width: '18%' }}>Withdrawal</th>
                          <th style={{ width: '18%' }}>Net Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((row, index) => {
                          if (row.__type === 'total') {
                            return (
                              <tr key={`pt-${index}`} className="total-row">
                                <td colSpan={2} style={{ textAlign: 'center' }}>
                                  TOTAL
                                </td>
                                <td style={{ textAlign: 'center' }}>{money(row.admissions)}</td>
                                <td style={{ textAlign: 'center' }}>{money(row.withdrawal)}</td>
                                <td style={{ textAlign: 'center' }}>{money(row.netActive)}</td>
                              </tr>
                            )
                          }
                          return (
                            <tr key={`pr-${index}`}>
                              <td style={{ textAlign: 'center' }}>{dash(row.serial)}</td>
                              <td style={{ textAlign: 'left' }}>{dash(row.className)}</td>
                              <td style={{ textAlign: 'center' }}>{money(row.admissions)}</td>
                              <td style={{ textAlign: 'center' }}>{money(row.withdrawal)}</td>
                              <td style={{ textAlign: 'center' }}>{money(row.netActive)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : isStrengthPrint ? (
                    <table className="legacy-print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '10%' }}>Class ID</th>
                          <th style={{ width: '34%', textAlign: 'left' }}>Class Name</th>
                          <th style={{ width: '14%' }}>Male</th>
                          <th style={{ width: '14%' }}>Female</th>
                          <th style={{ width: '14%' }}>Total</th>
                          {result.layout === 'strength-with-fee' ? (
                            <th style={{ width: '14%' }}>Tution Fee</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {strengthPrintRows.map((row, index) => {
                          if (row.__type === 'group') {
                            const cols = result.layout === 'strength-with-fee' ? 6 : 5
                            return (
                              <tr key={`pg-${index}`} className="band-row">
                                <td colSpan={cols}>{row.label}</td>
                              </tr>
                            )
                          }
                          if (row.__type === 'total') {
                            return (
                              <tr key={`pt-${index}`} className="total-row">
                                <td colSpan={2} style={{ textAlign: 'center' }}>
                                  {row.label || 'TOTAL'}
                                </td>
                                <td style={{ textAlign: 'right' }}>{money(row.male)}</td>
                                <td style={{ textAlign: 'right' }}>{money(row.female)}</td>
                                <td style={{ textAlign: 'right' }}>{money(row.total)}</td>
                                {result.layout === 'strength-with-fee' ? (
                                  <td style={{ textAlign: 'right', fontWeight: 400 }}>
                                    {printAmount(row.tuitionFee)}
                                  </td>
                                ) : null}
                              </tr>
                            )
                          }
                          return (
                            <tr key={`pr-${index}`}>
                              <td style={{ textAlign: 'center' }}>{dash(row.classId)}</td>
                              <td style={{ textAlign: 'left' }}>{dash(row.className)}</td>
                              <td style={{ textAlign: 'right' }}>{money(row.male)}</td>
                              <td style={{ textAlign: 'right' }}>{money(row.female)}</td>
                              <td style={{ textAlign: 'right' }}>{money(row.total)}</td>
                              {result.layout === 'strength-with-fee' ? (
                                <td style={{ textAlign: 'right', fontWeight: 400 }}>
                                  {printAmount(row.tuitionFee)}
                                </td>
                              ) : null}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="legacy-print-table">
                      <thead>
                        <tr>
                          {(result.columns || []).map((col) => (
                            <th
                              key={col.key}
                              className={isPrintReasonColumn(col.key) ? 'print-reason-cell' : undefined}
                              style={printCellStyle(col.key, col.format, result.columns.length, {
                                header: true,
                              })}
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
                              style={{ textAlign: 'center' }}
                            >
                              No rows for this report.
                            </td>
                          </tr>
                        ) : (
                          displayRows.map((row, index) => {
                            if (row.__type === 'group') {
                              return (
                                <tr key={`pg-${index}`} className="band-row">
                                  <td colSpan={result.columns?.length || 1}>{row.label}</td>
                                </tr>
                              )
                            }
                            if (row.__type === 'total') {
                              return (
                                <tr key={`pt-${index}`} className="total-row">
                                  {(result.columns || []).map((col, colIndex) => (
                                    <td
                                      key={col.key}
                                      className={isPrintReasonColumn(col.key) ? 'print-reason-cell' : undefined}
                                      style={printCellStyle(col.key, col.format, result.columns.length)}
                                    >
                                      {colIndex === 0
                                        ? 'TOTAL'
                                        : col.key === 'className'
                                          ? ''
                                          : formatCell(row[col.key], col.format, col.key)}
                                    </td>
                                  ))}
                                </tr>
                              )
                            }
                            return (
                              <tr key={`pr-${index}`}>
                                {(result.columns || []).map((col) => (
                                  <td
                                    key={col.key}
                                    className={isPrintReasonColumn(col.key) ? 'print-reason-cell' : undefined}
                                    style={printCellStyle(col.key, col.format, result.columns.length)}
                                  >
                                    {formatCell(row[col.key], col.format, col.key)}
                                  </td>
                                ))}
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </CampusShell>
    </div>
  )
}

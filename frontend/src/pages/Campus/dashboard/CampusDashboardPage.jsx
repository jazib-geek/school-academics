import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
  X,
  Tags,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getAppCampusOptions, getCampusLabel, isCampusAllowedInApp, showAllCampusesDashboard, sortCampusItems } from '../../../constants/branding'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { sortClassesByCustomOrder } from '../../../services/classSort'
import {
  getAllCampusesAdmissionsByMonth,
  getCampusLeftStudentsByMonth,
  getAllCampusesDashboard,
  getAllCampusesExpensesByInterval,
  getAllCampusesFeeBalanceByMonth,
  getAllCampusesFeeCollectionByDate,
  getCampusAdmissionsVsLeftTrend,
  getCampusFeeBreakdownByMonth,
  getCampusDashboard,
  getCampusExpenseDetails,
} from '../../../services/campusDashboardService'

const ALL_TAB = 'all'
const MONEY_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']
const CAMPUS_COMPARISON_ACCENTS = [
  { ring: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  { ring: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  { ring: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  { ring: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  { ring: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
  { ring: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
]
const isLocalCampus = (value) => String(value || '').trim().toLowerCase() === 'local'
const visibleCampusOptions = getAppCampusOptions()
const filterProductionCampusRows = (rows = [], keySelector = (row) => row?.key ?? row?.campus) =>
  sortCampusItems(
    (rows || []).filter((row) => {
      const key = keySelector(row)
      if (import.meta.env.PROD && isLocalCampus(key)) return false
      return isCampusAllowedInApp(key)
    }),
    keySelector,
  )
const TAB_OPTIONS = showAllCampusesDashboard()
  ? [{ value: ALL_TAB, label: 'All Campuses' }, ...visibleCampusOptions]
  : [...visibleCampusOptions]
const initialDashboardTab = showAllCampusesDashboard()
  ? ALL_TAB
  : visibleCampusOptions[0]?.value || ALL_TAB
const EXPENSE_INTERVAL_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
]
const EXPENSE_DETAIL_SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest date first', icon: CalendarDays },
  { value: 'date-asc', label: 'Oldest date first', icon: CalendarDays },
  { value: 'amount-desc', label: 'Highest amount first', icon: ArrowDownWideNarrow },
  { value: 'amount-asc', label: 'Lowest amount first', icon: ArrowUpWideNarrow },
  { value: 'account', label: 'Account type A-Z', icon: Tags },
]
const CAMPUS_TREND_INTERVAL_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 'custom', label: 'Custom days' },
]
const ALL_CAMPUS_WAITING_STEPS = [
  'Reconciling totals across campuses',
  'Checking receivables and balances',
  'Preparing comparison cards',
  'Finalizing dashboard charts',
  'Almost there...',
]

const compactCampusLabel = (value, label = getCampusLabel(value)) => {
  const campusCode = String(value || '').trim()
  const suppliedLabel = String(label || '').trim()
  const resolvedLabel = !suppliedLabel || suppliedLabel.toLowerCase() === campusCode.toLowerCase()
    ? getCampusLabel(campusCode)
    : suppliedLabel

  if (campusCode.toLowerCase() === 'nc') return resolvedLabel.replace(/\s+/g, ' ').trim()

  return resolvedLabel.replace(/\s+Campus\b/gi, '').replace(/\s+/g, ' ').trim()
}

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

const getPakistanCurrentMonth = () => getPakistanTodayIso().slice(0, 7)

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const formatMoney = (value) => `Rs ${formatAmount(value)}`

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getReceivablePercent = (generated, receivable) => {
  const total = Number(generated || 0)
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((Number(receivable || 0) / total) * 100)))
}

const formatCompactAmount = (value) => {
  const amount = Number(value || 0)
  const abs = Math.abs(amount)
  const compact = (divisor, suffix) => {
    const scaled = amount / divisor
    const digits = Math.abs(scaled) < 10 && scaled % 1 !== 0 ? 1 : 0
    return `${scaled.toFixed(digits).replace(/\.0$/, '')}${suffix}`
  }

  if (abs >= 1_000_000) return compact(1_000_000, 'M')
  if (abs >= 1_000) return compact(1_000, 'k')
  return formatAmount(amount)
}

const formatPrintAmount = (value) => formatAmount(Number(value || 0))

const formatPakistanDateTime = (value = new Date()) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)

const buildPrintTotals = (rows) => rows.reduce(
  (totals, item) => ({
    activeStudentCount: totals.activeStudentCount + Number(item.activeStudentCount || 0),
    tuitionReceived: totals.tuitionReceived + Number(item.tuitionReceived || 0),
    tuitionGenerated: totals.tuitionGenerated + Number(item.tuitionGenerated || 0),
    tuitionReceivable: totals.tuitionReceivable + Number(item.tuitionReceivable || 0),
    averageTuitionFeeWeightedTotal: totals.averageTuitionFeeWeightedTotal + (Number(item.averageTuitionFee || 0) * Number(item.activeStudentCount || 0)),
    fundsReceived: totals.fundsReceived + Number(item.fundsReceived || 0),
    fundsGenerated: totals.fundsGenerated + Number(item.fundsGenerated || 0),
    fundsReceivable: totals.fundsReceivable + Number(item.fundsReceivable || 0),
    feeDefaulterCount: totals.feeDefaulterCount + Number(item.feeDefaulterCount || 0),
    newAdmissionsLast30Days: totals.newAdmissionsLast30Days + Number(item.newAdmissionsLast30Days || 0),
    feeCollectionToday: totals.feeCollectionToday + Number(item.feeCollectionToday || 0),
    feeCollectionLast30Days: totals.feeCollectionLast30Days + Number(item.feeCollectionLast30Days || 0),
    totalReceivable: totals.totalReceivable + Number(item.totalReceivable || 0),
    expenseLast30Days: totals.expenseLast30Days + Number(item.expenseLast30Days || 0),
  }),
  {
    activeStudentCount: 0,
    tuitionReceived: 0,
    tuitionGenerated: 0,
    tuitionReceivable: 0,
    averageTuitionFeeWeightedTotal: 0,
    fundsReceived: 0,
    fundsGenerated: 0,
    fundsReceivable: 0,
    feeDefaulterCount: 0,
    newAdmissionsLast30Days: 0,
    feeCollectionToday: 0,
    feeCollectionLast30Days: 0,
    totalReceivable: 0,
    expenseLast30Days: 0,
  },
)

const printCampusComparisonReport = (campuses, reportDate) => {
  const { logoSrc, schoolName } = getCampusPrintMeta()
  const printedAt = formatPakistanDateTime()
  const totals = buildPrintTotals(campuses)
  const totalAverageTuitionFee = totals.activeStudentCount > 0
    ? totals.averageTuitionFeeWeightedTotal / totals.activeStudentCount
    : 0
  const rowHtml = campuses.map((item) => `
    <tr>
      <th class="campus-col">${escapeHtml(compactCampusLabel(item.campus, item.campusLabel || item.campus))}</th>
      <td>${formatPrintAmount(item.activeStudentCount)}</td>
      <td>${formatPrintAmount(item.averageTuitionFee)}</td>
      <td>${formatPrintAmount(item.tuitionReceivable)}</td>
      <td>${formatPrintAmount(item.fundsReceivable)}</td>
      <td>${formatPrintAmount(item.feeDefaulterCount)}</td>
      <td>${formatPrintAmount(item.newAdmissionsLast30Days)}</td>
      <td>${formatPrintAmount(item.feeCollectionLast30Days)}</td>
      <td>${formatPrintAmount(item.expenseLast30Days)}</td>
      <td>${formatPrintAmount(item.totalReceivable)}</td>
    </tr>
  `).join('')

  const totalHtml = `
    <tr class="total-row">
      <th class="campus-col">Total</th>
      <td>${formatPrintAmount(totals.activeStudentCount)}</td>
      <td>${formatPrintAmount(totalAverageTuitionFee)}</td>
      <td>${formatPrintAmount(totals.tuitionReceivable)}</td>
      <td>${formatPrintAmount(totals.fundsReceivable)}</td>
      <td>${formatPrintAmount(totals.feeDefaulterCount)}</td>
      <td>${formatPrintAmount(totals.newAdmissionsLast30Days)}</td>
      <td>${formatPrintAmount(totals.feeCollectionLast30Days)}</td>
      <td>${formatPrintAmount(totals.expenseLast30Days)}</td>
      <td>${formatPrintAmount(totals.totalReceivable)}</td>
    </tr>
  `

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Campus Comparison Report</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; color: #0f172a; font-family: Arial, sans-serif; }
          body { padding: 8mm; }
          .report-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 9px;
            margin-bottom: 9px;
          }
          .brand { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
          .brand img { height: 42px; width: 42px; object-fit: contain; }
          .eyebrow { margin: 0 0 3px; color: var(--campus-primary); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          h1 { margin: 0 0 2px; font-size: 18px; line-height: 1.1; }
          .meta { margin: 0; color: #475569; font-size: 10px; line-height: 1.35; }
          .printed-at { min-width: 130px; text-align: right; }
          .table-wrap { width: 100%; overflow: hidden; }
          table { width: 100%; table-layout: fixed; border-collapse: collapse; }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 5px;
            font-size: 11px;
            line-height: 1.2;
            text-align: center;
            vertical-align: middle;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          thead th {
            background: #eef2ff;
            color: #0f172a;
            font-weight: 700;
            text-align: center;
          }
          tbody th {
            text-align: left;
            background: #f8fafc;
            font-weight: 700;
          }
          .campus-col { width: 12.5%; }
          .total-row th,
          .total-row td {
            background: #f1f5f9;
            font-weight: 700;
          }
          @media print {
            body { padding: 0; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <header class="report-header">
          <div class="brand">
            <img src="${logoSrc}" alt="" />
            <div>
              <p class="eyebrow">Campus comparison report</p>
              <h1>${escapeHtml(schoolName)}</h1>
              <p class="meta">All campuses snapshot${reportDate ? ` &bull; ${escapeHtml(formatDate(reportDate))}` : ''}</p>
            </div>
          </div>
          <div class="printed-at">
            <p class="meta"><strong>Printed</strong></p>
            <p class="meta">${escapeHtml(printedAt)}</p>
          </div>
        </header>
        <main class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="campus-col">Campus</th>
                <th>Students</th>
                <th>Avg TF</th>
                <th>TF Balance</th>
                <th>Funds Balance</th>
                <th>TF Defaulters</th>
                <th>Admissions<br>(Last 30 days)</th>
                <th>Collection<br>(Last 30 days)</th>
                <th>Expense<br>(Last 30 days)</th>
                <th>Overall Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowHtml || '<tr><td colspan="10">No campus data available.</td></tr>'}
              ${campuses.length ? totalHtml : ''}
            </tbody>
          </table>
        </main>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => {
    printWindow.print()
  }, 250)
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatMonthLabel = (value) => {
  if (!value) return '-'
  const [year, month] = String(value).split('-').map(Number)
  if (!year || !month) return '-'
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ icon: Icon, label, value, detail, accent = 'bg-blue-50 text-blue-700' }) {
  return (
    <article className="min-h-32 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-slate-950 md:text-3xl">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${accent}`} aria-hidden>
          <Icon size={22} />
        </span>
      </div>
      {detail ? (
        typeof detail === 'string' ? (
          <p className="mt-3 text-xs font-medium text-slate-500">{detail}</p>
        ) : (
          <div className="mt-3">{detail}</div>
        )
      ) : null}
    </article>
  )
}

function GenderSplitBar({ rows }) {
  const boys = rows.find((row) => String(row.key || '').toLowerCase() === 'boys')?.count || 0
  const girls = rows.find((row) => String(row.key || '').toLowerCase() === 'girls')?.count || 0
  const total = boys + girls
  const boysPct = total > 0 ? Math.round((boys / total) * 1000) / 10 : 0
  const girlsPct = total > 0 ? Math.round((girls / total) * 1000) / 10 : 0

  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full">
          <div className="bg-blue-400/80" style={{ width: `${boysPct}%` }} />
          <div className="bg-pink-400/80" style={{ width: `${girlsPct}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Boys {boysPct}%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-pink-400" />
          Girls {girlsPct}%
        </span>
      </div>
    </div>
  )
}

function Panel({ title, action, children, className = '', bodyClassName = 'p-4' }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900 md:text-base">{title}</h2>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

function EmptyState({ label = 'No records found.' }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {label}
    </p>
  )
}

function buildDashboardLoadingSteps(activeTab, _availableCampuses) {
  if (activeTab === ALL_TAB) {
    return ['Opening all configured campus ledgers', ...ALL_CAMPUS_WAITING_STEPS]
  }

  const campusName = compactCampusLabel(activeTab, getCampusLabel(activeTab))
  return [
    `Getting active students for ${campusName}`,
    'Reading fee collection history',
    'Calculating receivables and balances',
    'Preparing admissions vs left trend',
    'Sorting class strength',
    'Building expense summaries',
  ]
}

function getLoadingCampusNames(availableCampuses) {
  return (availableCampuses.length ? availableCampuses : visibleCampusOptions.map((item) => ({ campus: item.value })))
    .map((item) => compactCampusLabel(item.campus, item.label || item.campusLabel || item.campus))
    .filter(Boolean)
}

function DashboardLoadingState({ activeTab, availableCampuses, isCompleting = false }) {
  const [tick, setTick] = useState(0)
  const isAllCampuses = activeTab === ALL_TAB
  const campusNames = useMemo(() => getLoadingCampusNames(availableCampuses), [availableCampuses])
  const steps = useMemo(() => buildDashboardLoadingSteps(activeTab, availableCampuses), [activeTab, availableCampuses])
  const waitingTick = Math.max(0, tick - campusNames.length)
  const activeStep = isCompleting
    ? 'Almost there...'
    : isAllCampuses && campusNames.length
      ? tick < campusNames.length
        ? `Getting ${campusNames[tick]} campus data`
        : ALL_CAMPUS_WAITING_STEPS[Math.min(waitingTick, ALL_CAMPUS_WAITING_STEPS.length - 1)]
      : steps[tick % steps.length] || 'Loading dashboard data'
  const completedCampusCount = isCompleting ? campusNames.length : Math.min(campusNames.length, tick)
  const progress = isCompleting
    ? 100
    : isAllCampuses && campusNames.length
      ? Math.min(94, Math.round((completedCampusCount / campusNames.length) * 100))
      : Math.min(94, 14 + tick * 7)

  useEffect(() => {
    setTick(0)
    const timer = window.setInterval(() => {
      setTick((value) => value + 1)
    }, isAllCampuses ? 3000 : 1350)

    return () => window.clearInterval(timer)
  }, [activeTab, isAllCampuses, steps])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-indigo-200/50" />
          <Loader2 size={24} className="relative animate-spin" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">
          {activeTab === ALL_TAB ? 'Preparing all-campus dashboard' : `Preparing ${compactCampusLabel(activeTab, getCampusLabel(activeTab))}`}
        </h2>
        <p className="mt-2 min-h-6 text-sm font-semibold text-indigo-700">{activeStep}</p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Large campus snapshots can take a few seconds while production totals are compiled.
        </p>
      </div>

      {isAllCampuses && campusNames.length ? (
        <div className="mx-auto mt-7 max-w-5xl rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {campusNames.map((name, index) => {
              const done = index < completedCampusCount
              const active = index === completedCampusCount && !isCompleting
              return (
                <div key={`${name}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span className={`hidden h-0.5 w-5 rounded-full sm:block ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  ) : null}
                  <span
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all duration-500 ${
                      done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : active
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <Building2 size={14} className={active ? 'animate-pulse' : ''} />
                    <span>{name}</span>
                    {done ? <Check size={14} /> : null}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-4 h-8 w-32 animate-pulse rounded-md bg-slate-200" />
            <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  )
}

function ChartCanvas({ config, className = 'h-64' }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, config)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [config])

  return (
    <div className={`min-w-0 ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  )
}

function DonutChart({ rows, centerValue, centerLabel, legendValue = 'percentage', showSliceAmounts = false }) {
  const data = rows
    .map((row) => ({
      name: row.label,
      value: Number(row.count ?? row.amount ?? 0),
      percentage: row.percentage || 0,
    }))
    .filter((row) => row.value > 0)
  const total = data.reduce((sum, row) => sum + row.value, 0)
  if (!total) return <EmptyState label="No distribution data." />

  const sliceAmountPlugin = {
    id: `donut-slice-amounts-${showSliceAmounts ? 'on' : 'off'}`,
    afterDatasetsDraw: (chart) => {
      if (!showSliceAmounts) return

      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)

      ctx.save()
      ctx.font = '700 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      data.forEach((row, index) => {
        const arc = meta.data[index]
        if (!arc) return

        const { x, y, startAngle, endAngle, innerRadius, outerRadius } = arc.getProps(
          ['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'],
          true,
        )
        const angle = (startAngle + endAngle) / 2
        const sliceAngle = endAngle - startAngle
        const radius = sliceAngle < 0.34 ? outerRadius + 18 : (innerRadius + outerRadius) / 2
        const labelX = x + Math.cos(angle) * radius
        const labelY = y + Math.sin(angle) * radius
        const label = formatCompactAmount(row.value)

        ctx.lineWidth = 4
        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#0f172a'
        ctx.strokeText(label, labelX, labelY)
        ctx.fillText(label, labelX, labelY)
      })

      ctx.restore()
    },
  }

  const config = {
    type: 'doughnut',
    data: {
      labels: data.map((row) => row.name),
      datasets: [
        {
          data: data.map((row) => row.value),
          backgroundColor: data.map((_, index) => MONEY_COLORS[index % MONEY_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    plugins: [sliceAmountPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatAmount(context.parsed)}`,
          },
        },
      },
    },
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-48 min-w-0 flex-1">
        <ChartCanvas config={config} className="h-48" />
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-bold text-slate-950">{centerValue}</p>
            <p className="text-xs font-medium text-slate-500">{centerLabel}</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((row, index) => (
          <div key={row.name} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: MONEY_COLORS[index % MONEY_COLORS.length] }} />
            <span className="min-w-0 flex-1 break-words font-medium text-slate-700">{row.name}</span>
            <span className="shrink-0 text-slate-500">
              {legendValue === 'amount' ? formatCompactAmount(row.value) : `${row.percentage}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdmissionsVsLeftLineChart({ rows }) {
  const data = rows.map((row) => ({
    label: row.label,
    newAdmissions: Number(row.newAdmissions || 0),
    leftStudents: Number(row.leftStudents || 0),
  }))
  const max = Math.max(...data.flatMap((row) => [row.newAdmissions, row.leftStudents]), 0)
  if (!data.length || max <= 0) return <EmptyState label="No admission or left student activity found." />

  const config = {
    type: 'line',
    data: {
      labels: data.map((row) => row.label),
      datasets: [
        {
          label: 'New',
          data: data.map((row) => row.newAdmissions),
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          tension: 0.22,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Left',
          data: data.map((row) => row.leftStudents),
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          tension: 0.22,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { boxWidth: 10, boxHeight: 10, color: '#334155', font: { size: 11, weight: 600 } },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatAmount(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#eef2f7' },
          ticks: { color: '#475569', maxTicksLimit: 8, font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
        y: {
          beginAtZero: true,
          grace: '12%',
          grid: { color: '#e5e7eb' },
          ticks: { color: '#475569', precision: 0, font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
      },
    },
  }

  return <ChartCanvas config={config} className="h-72" />
}

function MoneyTrendBarChart({ rows }) {
  const data = rows
    .map((row) => ({
      label: row.label,
      value: Number(row.amount || 0),
    }))
    .filter((row) => row.value > 0)

  if (!data.length) return <EmptyState label="No fee collection found for this period." />

  const valueLabelPlugin = {
    id: 'money-trend-bar-labels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const dataset = chart.data.datasets[0]
      const meta = chart.getDatasetMeta(0)
      ctx.save()
      ctx.font = '700 10px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#1e293b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      meta.data.forEach((bar, index) => {
        const value = Number(dataset.data[index] || 0)
        if (value <= 0) return
        ctx.fillText(formatCompactAmount(value), bar.x, Math.max(12, bar.y - 5))
      })
      ctx.restore()
    },
  }

  const config = {
    type: 'bar',
    data: {
      labels: data.map((row) => row.label),
      datasets: [
        {
          data: data.map((row) => row.value),
          backgroundColor: data.map((_, index) => MONEY_COLORS[index % MONEY_COLORS.length]),
          borderRadius: 7,
          barPercentage: 0.82,
          categoryPercentage: 0.74,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatMoney(context.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#334155', maxRotation: 0, maxTicksLimit: 10, font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
        y: {
          beginAtZero: true,
          grace: '14%',
          grid: { color: '#e5e7eb' },
          ticks: { color: '#475569', callback: (value) => formatMoney(value), font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
      },
    },
    plugins: [valueLabelPlugin],
  }

  return <ChartCanvas config={config} className="h-72" />
}

function ClassStrengthTable({ rows }) {
  const data = rows
    .map((row) => ({
      key: row.classKey,
      name: row.className,
      count: Number(row.activeStudentCount || 0),
    }))
    .filter((row) => row.count > 0)
  const sortedData = sortClassesByCustomOrder(data, 'name')

  if (!sortedData.length) return <EmptyState label="No active student strength found." />

  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="py-2 pr-3">Class</th>
            <th className="py-2 text-right">Students</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.key} className="border-t border-slate-100">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.name}</td>
              <td className="py-2.5 text-right font-bold text-slate-950">{formatAmount(row.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarList({ rows, valueKey = 'amount', formatValue = formatMoney, limit = 8 }) {
  const data = rows
    .slice(0, limit)
    .map((row) => ({
      name: row.label || row.headName,
      value: Number(row[valueKey] || 0),
    }))
    .filter((row) => row.value > 0)
  if (!data.length) return <EmptyState label="No breakdown data." />

  const config = {
    type: 'bar',
    data: {
      labels: data.map((row) => row.name),
      datasets: [
        {
          data: data.map((row) => row.value),
          backgroundColor: data.map((_, index) => MONEY_COLORS[index % MONEY_COLORS.length]),
          borderRadius: 8,
          barThickness: 14,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatValue(context.parsed.x),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#e2e8f0' },
          ticks: { display: false },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#334155', font: { size: 11 } },
          border: { display: false },
        },
      },
    },
  }

  return (
    <ChartCanvas config={config} className="h-72" />
  )
}

function ExpenseCampusSummary({ rows, intervalLabel = 'selected period', onOpenCampus }) {
  const data = rows
    .map((row) => ({
      campus: row.key,
      name: compactCampusLabel(row.key, row.label || row.key),
      value: Number(row.amount || 0),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, row) => sum + row.value, 0)
  const topCampus = data[0]

  if (!data.length || total <= 0) return <EmptyState label="No expense data found." />

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(total)}</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Highest Campus</p>
          <p className="mt-1 truncate text-lg font-bold text-slate-950">{topCampus.name}</p>
          <p className="text-sm font-semibold text-rose-700">{formatMoney(topCampus.value)}</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((row, index) => {
          const percentage = total > 0 ? Math.round((row.value / total) * 1000) / 10 : 0
          return (
            <button
              key={row.name}
              type="button"
              onClick={() => onOpenCampus?.(row)}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{row.name}</p>
                <p className="text-xs font-medium text-slate-500">{percentage}% of {intervalLabel.toLowerCase()} expenses</p>
              </div>
              <p className="text-right text-sm font-bold text-slate-950">{formatMoney(row.value)}</p>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                View
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExpenseDetailsModal({ open, campusName, intervalLabel, detail, isLoading, error, onClose }) {
  const [sortMode, setSortMode] = useState('date-desc')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const rows = detail?.items || []
  const selectedSort = EXPENSE_DETAIL_SORT_OPTIONS.find((option) => option.value === sortMode) || EXPENSE_DETAIL_SORT_OPTIONS[0]
  const SelectedSortIcon = selectedSort.icon
  const sortedRows = useMemo(() => {
    const dateValue = (item) => {
      const value = item?.date ? new Date(item.date).getTime() : 0
      return Number.isFinite(value) ? value : 0
    }
    const textValue = (item) => `${item?.accountTitle || 'Unmapped account'} ${item?.accountId || ''}`.trim().toLowerCase()

    return [...rows].sort((a, b) => {
      if (sortMode === 'date-asc') return dateValue(a) - dateValue(b) || Number(a.id || 0) - Number(b.id || 0)
      if (sortMode === 'amount-desc') return Number(b.debit || 0) - Number(a.debit || 0) || dateValue(b) - dateValue(a)
      if (sortMode === 'amount-asc') return Number(a.debit || 0) - Number(b.debit || 0) || dateValue(b) - dateValue(a)
      if (sortMode === 'account') return textValue(a).localeCompare(textValue(b)) || dateValue(b) - dateValue(a)
      return dateValue(b) - dateValue(a) || Number(b.id || 0) - Number(a.id || 0)
    })
  }, [rows, sortMode])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3">
      <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-950">{campusName} expenses</h3>
            <p className="text-xs font-semibold text-slate-500">{intervalLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Close expense details"
          >
            <X size={17} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Total Debit</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatMoney(detail?.totalDebit)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Records</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatAmount(detail?.totalRecords)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Date Range</p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                {formatDate(detail?.from)} - {formatDate(detail?.to)}
              </p>
            </div>
            <div className="relative min-w-64">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Sort</p>
              <button
                type="button"
                onClick={() => setIsSortOpen((value) => !value)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13px] leading-snug font-bold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <SelectedSortIcon size={16} className="shrink-0 text-indigo-700" />
                  <span className="truncate">{selectedSort.label}</span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl transition ${
                  isSortOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                }`}
              >
                {EXPENSE_DETAIL_SORT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const active = option.value === sortMode
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortMode(option.value)
                        setIsSortOpen(false)
                      }}
                      className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] leading-snug font-semibold transition ${
                        active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-72 overflow-auto">
          {isLoading ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/80">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <Loader2 size={18} className="animate-spin text-indigo-700" />
                Loading expense details...
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && !rows.length ? (
            <div className="p-4">
              <EmptyState label="No expense transactions found for this filter." />
            </div>
          ) : null}

          {sortedRows.length ? (
            <table className="min-w-full text-[13px] leading-snug">
              <thead className="sticky top-0 z-0 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Voucher</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">{formatDate(item.date)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                      <p className="font-semibold text-slate-800">{item.voucherNumber || '-'}</p>
                      <p className="text-xs text-slate-500">{item.voucherType || '-'}</p>
                    </td>
                    <td className="min-w-52 px-3 py-1.5">
                      <p className="font-semibold text-slate-900">{item.accountTitle || 'Unmapped account'}</p>
                      <p className="text-xs text-slate-500">{item.accountId || '-'}</p>
                    </td>
                    <td className="min-w-80 px-3 py-1.5 text-slate-700">{item.narration || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-bold text-slate-950">{formatMoney(item.debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function VerticalBarChart({ rows, valueKey = 'amount', formatValue = formatMoney, emptyLabel = 'No fee collection found for this date.' }) {
  const data = rows
    .map((row) => ({
      name: compactCampusLabel(row.key, row.label || row.key),
      value: Number(row[valueKey] || 0),
    }))
    .filter((row) => row.value > 0)

  if (!data.length) return <EmptyState label={emptyLabel} />

  const barValueLabelPlugin = {
    id: 'fee-bar-value-labels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const dataset = chart.data.datasets[0]
      const meta = chart.getDatasetMeta(0)
      ctx.save()
      ctx.font = '700 11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#1e293b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      meta.data.forEach((bar, index) => {
        const value = Number(dataset.data[index] || 0)
        if (value <= 0) return
        ctx.fillText(formatCompactAmount(value), bar.x, Math.max(12, bar.y - 6))
      })
      ctx.restore()
    },
  }

  const config = {
    type: 'bar',
    data: {
      labels: data.map((row) => row.name),
      datasets: [
        {
          data: data.map((row) => row.value),
          backgroundColor: data.map((_, index) => MONEY_COLORS[index % MONEY_COLORS.length]),
          borderRadius: 8,
          barPercentage: 0.65,
          categoryPercentage: 0.72,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatValue(context.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#334155', font: { size: 11 }, maxRotation: 0, autoSkip: false },
          border: { color: '#94a3b8' },
        },
        y: {
          beginAtZero: true,
          grace: '14%',
          grid: { color: '#e5e7eb' },
          ticks: { color: '#475569', callback: (value) => formatValue(value), font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
      },
    },
    plugins: [barValueLabelPlugin],
  }

  return <ChartCanvas config={config} className="h-72" />
}

function HorizontalMoneyChart({ rows, valueKey = 'amount', formatValue = formatMoney, emptyLabel = 'No records found.', className = 'h-72' }) {
  const data = rows
    .map((row) => ({
      name: compactCampusLabel(row.key, row.label || row.key),
      value: Number(row[valueKey] || 0),
    }))
    .filter((row) => row.value > 0)

  if (!data.length) return <EmptyState label={emptyLabel} />

  const valueLabelPlugin = {
    id: 'horizontal-money-value-labels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const dataset = chart.data.datasets[0]
      const meta = chart.getDatasetMeta(0)
      const chartArea = chart.chartArea
      ctx.save()
      ctx.font = '700 11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#1e293b'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      meta.data.forEach((bar, index) => {
        const value = Number(dataset.data[index] || 0)
        if (value <= 0) return
        const label = formatCompactAmount(value)
        const x = Math.min(bar.x + 8, chartArea.right - ctx.measureText(label).width)
        ctx.fillText(label, x, bar.y)
      })
      ctx.restore()
    },
  }

  const config = {
    type: 'bar',
    data: {
      labels: data.map((row) => row.name),
      datasets: [
        {
          data: data.map((row) => row.value),
          backgroundColor: data.map((_, index) => MONEY_COLORS[index % MONEY_COLORS.length]),
          borderRadius: 8,
          barThickness: 30,
          maxBarThickness: 34,
          categoryPercentage: 0.95,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 34 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatValue(context.parsed.x),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: '18%',
          grid: { color: '#e5e7eb' },
          ticks: { color: '#475569', callback: (value) => formatValue(value), font: { size: 11 } },
          border: { color: '#94a3b8' },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#334155', font: { size: 12, weight: 600 } },
          border: { color: '#94a3b8' },
        },
      },
    },
    plugins: [valueLabelPlugin],
  }

  return <ChartCanvas config={config} className={className} />
}

function AdmissionsGroupedBarChart({ rows, onLeftBarClick }) {
  const onLeftBarClickRef = useRef(onLeftBarClick)

  useEffect(() => {
    onLeftBarClickRef.current = onLeftBarClick
  }, [onLeftBarClick])

  const data = useMemo(
    () =>
      rows
        .map((row) => ({
          campus: row.campus,
          name: compactCampusLabel(row.campus, row.campusLabel || row.campus),
          newAdmissions: Number(row.newAdmissions || 0),
          leftStudents: Number(row.leftStudents || 0),
        }))
        .filter((row) => row.newAdmissions > 0 || row.leftStudents > 0),
    [rows],
  )

  const config = useMemo(() => {
    if (!data.length) return null

    const barValueLabelPlugin = {
      id: 'admissions-bar-value-labels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart
        ctx.save()
        ctx.font = '700 11px Inter, system-ui, sans-serif'
        ctx.fillStyle = '#1e293b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex)
          meta.data.forEach((bar, index) => {
            const value = Number(dataset.data[index] || 0)
            if (value <= 0) return
            ctx.fillText(formatAmount(value), bar.x, Math.max(12, bar.y - 5))
          })
        })
        ctx.restore()
      },
    }

    return {
      type: 'bar',
      data: {
        labels: data.map((row) => row.name),
        datasets: [
          {
            label: 'New',
            data: data.map((row) => row.newAdmissions),
            backgroundColor: '#2563eb',
            borderRadius: { topLeft: 7, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            barPercentage: 1,
            categoryPercentage: 0.78,
            inflateAmount: 0.5,
          },
          {
            label: 'Left',
            data: data.map((row) => row.leftStudents),
            backgroundColor: '#ef4444',
            borderRadius: { topLeft: 0, topRight: 7, bottomLeft: 0, bottomRight: 0 },
            barPercentage: 1,
            categoryPercentage: 0.78,
            inflateAmount: 0.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements) => {
          if (!elements?.length || !onLeftBarClickRef.current) return
          const element = elements[0]
          if (element.datasetIndex !== 1) return
          const row = data[element.index]
          if (!row || row.leftStudents <= 0) return
          onLeftBarClickRef.current(row)
        },
        onHover: (event, elements) => {
          const canvas = event?.native?.target
          if (!canvas) return
          const element = elements?.[0]
          canvas.style.cursor =
            element?.datasetIndex === 1 && data[element.index]?.leftStudents > 0 ? 'pointer' : 'default'
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, boxHeight: 10, color: '#334155', font: { size: 11, weight: '600' } },
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatAmount(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { size: 11 }, maxRotation: 0, autoSkip: false },
            border: { color: '#94a3b8' },
          },
          y: {
            beginAtZero: true,
            grace: '12%',
            grid: { color: '#e5e7eb' },
            ticks: { color: '#475569', precision: 0, font: { size: 11 } },
            border: { color: '#94a3b8' },
          },
        },
      },
      plugins: [barValueLabelPlugin],
    }
  }, [data])

  if (!data.length || !config) {
    return <EmptyState label="No admissions or left students found for this month." />
  }

  return <ChartCanvas config={config} className="h-72" />
}

function LeftStudentsModal({ open, campusName, monthLabel, detail, isLoading, error, onClose }) {
  const rows = detail?.items || []
  const [sortKey, setSortKey] = useState('leaveDate-desc')

  useEffect(() => {
    if (!open) {
      setSortKey('leaveDate-desc')
    }
  }, [open])

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    const [field, direction] = sortKey.split('-')
    const asc = direction === 'asc'

    const compareText = (left, right) =>
      String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' })

    copy.sort((a, b) => {
      let result

      switch (field) {
        case 'name':
          result = compareText(a.fullName, b.fullName)
          break
        case 'outstanding':
          result = Number(a.outstandingBalance || 0) - Number(b.outstandingBalance || 0)
          break
        case 'studyDuration':
          result = Number(a.studyDurationDays ?? -1) - Number(b.studyDurationDays ?? -1)
          break
        case 'leaveDate':
        default: {
          const left = a.leaveDate ? new Date(a.leaveDate).getTime() : 0
          const right = b.leaveDate ? new Date(b.leaveDate).getTime() : 0
          result = left - right
          break
        }
      }

      if (result === 0) {
        result = compareText(a.fullName, b.fullName)
      }

      return asc ? result : -result
    })

    return copy
  }, [rows, sortKey])

  const totalOutstanding = Number(detail?.totalOutstandingBalance ?? rows.reduce(
    (sum, item) => sum + Number(item.outstandingBalance || 0),
    0,
  ))

  const sortOptions = [
    { value: 'leaveDate-desc', label: 'Left date (newest)' },
    { value: 'leaveDate-asc', label: 'Left date (oldest)' },
    { value: 'outstanding-desc', label: 'Outstanding (highest)' },
    { value: 'outstanding-asc', label: 'Outstanding (lowest)' },
    { value: 'studyDuration-desc', label: 'Time studied (longest)' },
    { value: 'studyDuration-asc', label: 'Time studied (shortest)' },
    { value: 'name-asc', label: 'Name (A–Z)' },
    { value: 'name-desc', label: 'Name (Z–A)' },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3">
      <section className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-950">
              Left students — {campusName}
            </h3>
            <p className="text-xs font-semibold text-slate-500">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Close left students"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0 text-[13px] text-slate-500">
            <p>
              {rows.length.toLocaleString()} {rows.length === 1 ? 'student' : 'students'}
            </p>
            {rows.length ? (
              <p className="mt-0.5 font-semibold text-rose-700">
                Total outstanding: {formatMoney(totalOutstanding)}
              </p>
            ) : null}
          </div>

          {rows.length ? (
            <label className="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-600">
              <span className="shrink-0">Sort by</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value)}
                className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="relative min-h-72 overflow-auto">
          {isLoading ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/80">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <Loader2 size={18} className="animate-spin text-indigo-700" />
                Loading students...
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && !rows.length ? (
            <div className="p-4">
              <EmptyState label="No left students found for this month." />
            </div>
          ) : null}

          {rows.length ? (
            <table className="min-w-full text-[13px] leading-snug">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Reg ID</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Left on</th>
                  <th className="px-3 py-2">Time studied</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item) => {
                  const outstanding = Number(item.outstandingBalance || 0)
                  return (
                    <tr key={item.regId} className="border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">{item.regId}</td>
                      <td className="min-w-44 px-3 py-1.5 font-semibold text-slate-900">{item.fullName || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{formatDate(item.leaveDate)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{item.studyDurationLabel || '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${outstanding > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        {formatMoney(outstanding)}
                      </td>
                      <td className="min-w-56 px-3 py-1.5 text-slate-700">{item.reason || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function CampusSelector({ activeTab, onChange, availableCampuses }) {
  const [open, setOpen] = useState(false)
  const selectorRef = useRef(null)
  const available = new Set([
    ...(showAllCampusesDashboard() ? [ALL_TAB] : []),
    ...availableCampuses.map((item) => item.campus?.toLowerCase()),
  ])
  const options = TAB_OPTIONS.filter((item) => available.has(item.value.toLowerCase()))
  const selected = options.find((item) => item.value === activeTab) || options[0] || TAB_OPTIONS[0]
  const selectedLabel = selected.value === ALL_TAB ? selected.label : compactCampusLabel(selected.value, selected.label)

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!selectorRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={selectorRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13px] leading-snug font-semibold text-slate-900 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 sm:w-72"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-700">
            <Building2 size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Campus View</span>
            <span className="block truncate">{selectedLabel}</span>
          </span>
        </span>
        <ChevronDown size={17} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute right-0 z-30 mt-2 w-full min-w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl transition duration-150 sm:w-80 ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
        }`}
      >
        <div className="max-h-80 overflow-auto p-2" role="listbox">
          {options.map((tab) => {
          const active = activeTab === tab.value
          const label = tab.value === ALL_TAB ? tab.label : compactCampusLabel(tab.value, tab.label)
          return (
            <button
              key={tab.value}
              type="button"
                onClick={() => {
                  onChange(tab.value)
                  setOpen(false)
                }}
                className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] leading-snug font-semibold leading-tight transition ${
                active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
              }`}
                role="option"
                aria-selected={active}
            >
                <span className="min-w-0 break-words">{label}</span>
                {active ? <Check size={16} className="shrink-0" /> : null}
            </button>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function CampusComparisonPanel({ campuses, onPrintCampusComparison }) {
  const [showAllCampuses, setShowAllCampuses] = useState(false)
  const visibleCampuses = showAllCampuses ? campuses : campuses.slice(0, 4)
  const hiddenCampusCount = Math.max(0, campuses.length - visibleCampuses.length)

  return (
    <Panel
      title={(
        <span className="inline-flex items-center gap-2">
          <BarChart3 size={17} className="text-violet-600" />
          Campus Comparison
        </span>
      )}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {campuses.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAllCampuses((value) => !value)}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              {showAllCampuses ? 'Show fewer' : `Show all campuses${hiddenCampusCount ? ` (${hiddenCampusCount})` : ''}`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrintCampusComparison}
            disabled={!campuses.length}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>
      }
    >
      {campuses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleCampuses.map((item, index) => {
            const accent = CAMPUS_COMPARISON_ACCENTS[index % CAMPUS_COMPARISON_ACCENTS.length]
            const tuitionReceivablePct = getReceivablePercent(item.tuitionGenerated, item.tuitionReceived)
            const fundsReceivablePct = getReceivablePercent(item.fundsGenerated, item.fundsReceived)

            return (
              <article key={item.campus} className={`group min-w-0 overflow-hidden rounded-lg border ${accent.ring} bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
                <div className={`h-1.5 ${accent.bar}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent.bg} ${accent.text}`}>
                        <Building2 size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="min-w-0 break-words text-base font-bold leading-tight text-slate-950">
                          {compactCampusLabel(item.campus)}
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">Campus snapshot</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold leading-none text-slate-950">{formatAmount(item.activeStudentCount)}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">active</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <span className="text-slate-600">Tuition receivable</span>
                        <span className={accent.text}>
                          {formatCompactAmount(item.tuitionReceived)} / {formatCompactAmount(item.tuitionGenerated)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${tuitionReceivablePct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-end text-[10px] font-bold text-slate-500">
                        Balance {formatCompactAmount(item.tuitionReceivable)}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <span className="text-slate-600">Funds receivable</span>
                        <span className="text-slate-600">
                          {formatCompactAmount(item.fundsReceived)} / {formatCompactAmount(item.fundsGenerated)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-400" style={{ width: `${fundsReceivablePct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-end text-[10px] font-bold text-slate-500">
                        Balance {formatCompactAmount(item.fundsReceivable)}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                        <CircleDollarSign size={13} /> Avg TF
                      </dt>
                      <dd className="mt-0.5 break-words font-bold text-slate-950">{formatMoney(item.averageTuitionFee)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                        <GraduationCap size={13} /> Admissions 30d
                      </dt>
                      <dd className="mt-0.5 font-bold text-slate-950">{formatAmount(item.newAdmissionsLast30Days)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                        <Users size={13} /> Defaulters
                      </dt>
                      <dd className="mt-0.5 font-bold text-slate-950">{formatAmount(item.feeDefaulterCount)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                        <Banknote size={13} /> Fee Today
                      </dt>
                      <dd className="mt-0.5 break-words font-bold text-slate-950">{formatMoney(item.feeCollectionToday)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-medium text-slate-500">
                        <BarChart3 size={13} /> Fee 30d
                      </dt>
                      <dd className="mt-0.5 break-words font-bold text-slate-950">{formatMoney(item.feeCollectionLast30Days)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-500">Receivable</p>
                      <p className="mt-0.5 break-words font-bold text-slate-950">{formatMoney(item.totalReceivable)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-500">Expense 30d</p>
                      <p className="mt-0.5 break-words font-bold text-slate-950">{formatMoney(item.expenseLast30Days)}</p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState label="No campus records found." />
      )}
    </Panel>
  )
}

function AllCampusesView({
  data,
  admissionsByMonth,
  admissionsError,
  admissionsMonth,
  expenseByInterval,
  expenseIntervalDays,
  expenseIntervalError,
  feeBalanceByMonth,
  feeBalanceError,
  feeBalanceMonth,
  feeCollectionByDate,
  feeCollectionDate,
  feeCollectionError,
  isAdmissionsLoading,
  isExpenseIntervalLoading,
  isFeeBalanceLoading,
  isFeeCollectionLoading,
  onAdmissionsMonthChange,
  onExpenseIntervalChange,
  onFeeBalanceMonthChange,
  onFeeCollectionDateChange,
}) {
  const campuses = filterProductionCampusRows(data?.campuses || [], (row) => row.campus)
  const selectedExpenseIntervalLabel = EXPENSE_INTERVAL_OPTIONS.find((item) => item.value === Number(expenseIntervalDays))?.label || 'Last 30 days'
  const expenseRows = filterProductionCampusRows(expenseByInterval?.campuses || data?.expenseByCampusLast30Days || [])
  const admissionsRows = filterProductionCampusRows(admissionsByMonth?.campuses || [], (row) => row.campus)
  const feeCollectionRows = filterProductionCampusRows(feeCollectionByDate?.campuses || [])
  const feeBalanceRows = filterProductionCampusRows(feeBalanceByMonth?.campuses || [])
  const onPrintCampusComparison = () => {
    printCampusComparisonReport(campuses, data?.date)
  }
  const [expenseDetailCampus, setExpenseDetailCampus] = useState(null)
  const [expenseDetail, setExpenseDetail] = useState(null)
  const [isExpenseDetailLoading, setIsExpenseDetailLoading] = useState(false)
  const [expenseDetailError, setExpenseDetailError] = useState('')
  const [leftStudentsCampus, setLeftStudentsCampus] = useState(null)
  const [leftStudentsDetail, setLeftStudentsDetail] = useState(null)
  const [isLeftStudentsLoading, setIsLeftStudentsLoading] = useState(false)
  const [leftStudentsError, setLeftStudentsError] = useState('')

  const loadCampusExpenseDetails = useCallback(async (campus) => {
    if (!campus?.campus) return
    setIsExpenseDetailLoading(true)
    setExpenseDetailError('')
    setExpenseDetail(null)
    try {
      const result = await getCampusExpenseDetails({
        campus: campus.campus,
        days: expenseIntervalDays,
      })
      setExpenseDetail(result || null)
    } catch (err) {
      setExpenseDetailError(err?.response?.data?.message || err?.message || 'Unable to load expense details.')
    } finally {
      setIsExpenseDetailLoading(false)
    }
  }, [expenseIntervalDays])

  const onOpenCampusExpenses = (campus) => {
    setExpenseDetailCampus(campus)
    loadCampusExpenseDetails(campus)
  }

  const onCloseCampusExpenses = () => {
    setExpenseDetailCampus(null)
    setExpenseDetail(null)
    setExpenseDetailError('')
    setIsExpenseDetailLoading(false)
  }

  const onOpenLeftStudents = useCallback(async (row) => {
    if (!row?.campus) return
    const [year, month] = String(admissionsMonth || getPakistanCurrentMonth()).split('-').map(Number)
    setLeftStudentsCampus(row)
    setLeftStudentsDetail(null)
    setLeftStudentsError('')
    setIsLeftStudentsLoading(true)
    try {
      const result = await getCampusLeftStudentsByMonth({ campus: row.campus, month, year })
      setLeftStudentsDetail(result || null)
    } catch (err) {
      setLeftStudentsError(err?.response?.data?.message || err?.message || 'Unable to load left students.')
    } finally {
      setIsLeftStudentsLoading(false)
    }
  }, [admissionsMonth])

  const onCloseLeftStudents = () => {
    setLeftStudentsCampus(null)
    setLeftStudentsDetail(null)
    setLeftStudentsError('')
    setIsLeftStudentsLoading(false)
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Active Students"
          value={formatAmount(data?.totalActiveStudentCount)}
          detail={<GenderSplitBar rows={data?.studentGenderDistribution || []} />}
        />
        <StatCard icon={GraduationCap} label="New Active Admissions" value={formatAmount(data?.totalNewAdmissionsLast30Days)} detail={`${formatAmount(data?.totalNewAdmissionsToday)} today`} accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={CircleDollarSign} label="Fee Collection Today" value={formatMoney(data?.totalFeeCollectionToday)} detail={`${formatMoney(data?.totalFeeCollectionLast30Days)} in 30 days`} accent="bg-blue-50 text-blue-700" />
        <StatCard icon={WalletCards} label="Total Receivable" value={formatMoney(data?.totalReceivable)} detail={`${formatAmount(data?.totalFeeDefaulterCount)} students with balance`} accent="bg-amber-50 text-amber-700" />
        <StatCard icon={ReceiptText} label="Expenses Today" value={formatMoney(data?.totalTodayExpense)} detail={`${formatMoney(data?.totalExpenseLast30Days)} in 30 days`} accent="bg-rose-50 text-rose-700" />
      </section>

      <CampusComparisonPanel campuses={campuses} onPrintCampusComparison={onPrintCampusComparison} />

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Admissions Trend"
          action={
            <input
              type="month"
              value={admissionsMonth}
              onChange={(event) => onAdmissionsMonthChange(event.target.value || getPakistanCurrentMonth())}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          }
        >
          {admissionsError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {admissionsError}
            </p>
          ) : null}
          <div className="relative">
            {isAdmissionsLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <AdmissionsGroupedBarChart rows={admissionsRows} onLeftBarClick={onOpenLeftStudents} />
          </div>
        </Panel>
        <Panel
          title={`Fee Collection Trend on ${formatDate(feeCollectionDate)}`}
          action={
            <input
              type="date"
              value={feeCollectionDate}
              onChange={(event) => onFeeCollectionDateChange(event.target.value || getPakistanTodayIso())}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          }
        >
          {feeCollectionError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {feeCollectionError}
            </p>
          ) : null}
          <div className="relative">
            {isFeeCollectionLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <VerticalBarChart rows={feeCollectionRows} />
          </div>
        </Panel>
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-2">
        <Panel
          title={`Expenses by Campus - ${selectedExpenseIntervalLabel}`}
          className="h-full"
          action={
            <select
              value={expenseIntervalDays}
              onChange={(event) => onExpenseIntervalChange(Number(event.target.value))}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {EXPENSE_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          }
        >
          {expenseIntervalError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {expenseIntervalError}
            </p>
          ) : null}
          <div className="relative">
            {isExpenseIntervalLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <ExpenseCampusSummary
              rows={expenseRows}
              intervalLabel={selectedExpenseIntervalLabel}
              onOpenCampus={onOpenCampusExpenses}
            />
          </div>
        </Panel>
        <Panel
          title={`Tuition Fee Balance - ${formatMonthLabel(feeBalanceMonth)}`}
          className="h-full"
          bodyClassName="flex flex-1 p-4"
          action={
            <input
              type="month"
              value={feeBalanceMonth}
              onChange={(event) => onFeeBalanceMonthChange(event.target.value || getPakistanCurrentMonth())}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          }
        >
          {feeBalanceError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {feeBalanceError}
            </p>
          ) : null}
          <div className="relative flex min-h-[640px] flex-1">
            {isFeeBalanceLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <HorizontalMoneyChart rows={feeBalanceRows} emptyLabel="No fee balance found for this month." className="min-h-[640px] flex-1" />
          </div>
        </Panel>
      </section>
      <ExpenseDetailsModal
        open={Boolean(expenseDetailCampus)}
        campusName={expenseDetailCampus?.name || ''}
        intervalLabel={selectedExpenseIntervalLabel}
        detail={expenseDetail}
        isLoading={isExpenseDetailLoading}
        error={expenseDetailError}
        onClose={onCloseCampusExpenses}
      />
      <LeftStudentsModal
        open={Boolean(leftStudentsCampus)}
        campusName={compactCampusLabel(leftStudentsCampus?.campus, leftStudentsCampus?.name)}
        monthLabel={formatMonthLabel(admissionsMonth)}
        detail={leftStudentsDetail}
        isLoading={isLeftStudentsLoading}
        error={leftStudentsError}
        onClose={onCloseLeftStudents}
      />
    </div>
  )
}

function CampusDetailView({
  data,
  feeBreakdownByMonth,
  feeBreakdownError,
  feeBreakdownMonth,
  isFeeBreakdownLoading,
  onFeeBreakdownMonthChange,
}) {
  const [admissionTrendMode, setAdmissionTrendMode] = useState(30)
  const [customTrendDays, setCustomTrendDays] = useState(90)
  const [admissionTrendCache, setAdmissionTrendCache] = useState({})
  const [isAdmissionTrendLoading, setIsAdmissionTrendLoading] = useState(false)
  const [admissionTrendError, setAdmissionTrendError] = useState('')
  const admissionTrendDays = admissionTrendMode === 'custom' ? customTrendDays : Number(admissionTrendMode)
  const admissionTrendCacheKey = `${data?.campus || ''}-${admissionTrendDays}`
  const fetchedAdmissionTrendRows = admissionTrendCache[admissionTrendCacheKey]?.points || []
  const admissionsVsLeftRows = admissionTrendDays <= 30
    ? (data?.admissionsVsLeftTrendLast30Days || []).slice(-admissionTrendDays)
    : fetchedAdmissionTrendRows
  const feeBreakdownRows = feeBreakdownByMonth?.breakdown || data?.feeCollectionBreakdownLast30Days || []
  const feeBreakdownCenter = feeBreakdownRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  useEffect(() => {
    if (!data?.campus || admissionTrendDays <= 30 || admissionTrendCache[admissionTrendCacheKey]) return undefined

    let ignore = false
    setIsAdmissionTrendLoading(true)
    setAdmissionTrendError('')
    getCampusAdmissionsVsLeftTrend({ campus: data.campus, days: admissionTrendDays })
      .then((result) => {
        if (ignore) return
        setAdmissionTrendCache((prev) => ({
          ...prev,
          [admissionTrendCacheKey]: result || null,
        }))
      })
      .catch((err) => {
        if (ignore) return
        setAdmissionTrendError(err?.response?.data?.message || err?.message || 'Unable to load admissions trend.')
      })
      .finally(() => {
        if (!ignore) setIsAdmissionTrendLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [admissionTrendCache, admissionTrendCacheKey, admissionTrendDays, data?.campus])

  const onAdmissionTrendModeChange = (value) => {
    if (value === 'custom') {
      setAdmissionTrendMode('custom')
      return
    }

    setAdmissionTrendMode(Number(value))
  }

  const onCustomTrendDaysChange = (value) => {
    const days = Math.max(1, Math.min(300, Number(value || 1)))
    setCustomTrendDays(days)
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Active Students"
          value={formatAmount(data?.activeStudentCount)}
          detail={<GenderSplitBar rows={data?.studentGenderDistribution || []} />}
        />
        <StatCard icon={GraduationCap} label="New Active Admissions" value={formatAmount(data?.newAdmissionsLast30Days)} detail={`${formatAmount(data?.newAdmissionsToday)} today`} accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={CircleDollarSign} label="Fee Collection Today" value={formatMoney(data?.feeCollectionToday)} detail={`${formatMoney(data?.feeCollectionLast30Days)} in 30 days`} accent="bg-blue-50 text-blue-700" />
        <StatCard icon={WalletCards} label="Total Receivable" value={formatMoney(data?.totalReceivable)} detail={`${formatAmount(data?.feeDefaulterCount)} students with balance`} accent="bg-amber-50 text-amber-700" />
        <StatCard icon={ReceiptText} label="Expenses Today" value={formatMoney(data?.todayExpense)} detail={`${formatMoney(data?.expenseLast30Days)} in 30 days`} accent="bg-rose-50 text-rose-700" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title="Fee Collection Trend (Last 30 Days)">
          <MoneyTrendBarChart rows={data?.feeCollectionTrendLast30Days || []} />
        </Panel>
        <Panel
          title={`Fee Collection Breakdown - ${formatMonthLabel(feeBreakdownMonth)}`}
          action={
            <input
              type="month"
              value={feeBreakdownMonth}
              onChange={(event) => onFeeBreakdownMonthChange(event.target.value || getPakistanCurrentMonth())}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          }
        >
          {feeBreakdownError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {feeBreakdownError}
            </p>
          ) : null}
          <div className="relative">
            {isFeeBreakdownLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <DonutChart
              rows={feeBreakdownRows}
              centerValue={formatMoney(feeBreakdownCenter)}
              centerLabel={formatMonthLabel(feeBreakdownMonth)}
              legendValue="amount"
              showSliceAmounts
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="New Admissions vs Left Trend"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={admissionTrendMode}
                onChange={(event) => onAdmissionTrendModeChange(event.target.value)}
                className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {CAMPUS_TREND_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {admissionTrendMode === 'custom' ? (
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={customTrendDays}
                  onChange={(event) => onCustomTrendDaysChange(event.target.value)}
                  className="min-h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : null}
            </div>
          }
        >
          {admissionTrendError ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {admissionTrendError}
            </p>
          ) : null}
          <div className="relative">
            {isAdmissionTrendLoading ? (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/70">
                <Loader2 size={20} className="animate-spin text-indigo-700" />
              </div>
            ) : null}
            <AdmissionsVsLeftLineChart rows={admissionsVsLeftRows} />
          </div>
        </Panel>
        <Panel title="Strength by Class">
          <ClassStrengthTable rows={data?.classStrength || []} />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
        <Panel title="Expenses Overview (30 Days)">
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Expenses</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{formatMoney(data?.expenseLast30Days)}</p>
            </div>
            <DonutChart rows={(data?.expenseHeadsLast30Days || []).map((item) => ({ ...item, key: item.headCode, label: item.headName }))} centerValue={formatMoney(data?.expenseLast30Days)} centerLabel="30 days" />
          </div>
        </Panel>
        <Panel title="Top Expense Accounts">
          <BarList rows={(data?.expenseHeadsLast30Days || []).map((item) => ({ ...item, key: item.headCode, label: item.headName }))} />
        </Panel>
        <Panel title="Top Level4 Expense Accounts">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Account</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.expenseSubheadsLast30Days || []).map((item) => (
                  <tr key={`${item.headCode}-${item.subheadCode}`} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-slate-800">{item.subheadName}</p>
                      <p className="text-xs text-slate-500">{item.headName}</p>
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-900">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
                {(data?.expenseSubheadsLast30Days || []).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-500">No expense subheads found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  )
}

function CampusDashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(initialDashboardTab)
  const [tabState, setTabState] = useState({})
  const [admissionsMonth, setAdmissionsMonth] = useState(() => getPakistanCurrentMonth())
  const [admissionsByMonth, setAdmissionsByMonth] = useState(null)
  const [isAdmissionsLoading, setIsAdmissionsLoading] = useState(false)
  const [admissionsError, setAdmissionsError] = useState('')
  const [feeCollectionDate, setFeeCollectionDate] = useState(() => getPakistanTodayIso())
  const [feeCollectionByDate, setFeeCollectionByDate] = useState(null)
  const [isFeeCollectionLoading, setIsFeeCollectionLoading] = useState(false)
  const [feeCollectionError, setFeeCollectionError] = useState('')
  const [expenseIntervalDays, setExpenseIntervalDays] = useState(30)
  const [expenseByInterval, setExpenseByInterval] = useState(null)
  const [isExpenseIntervalLoading, setIsExpenseIntervalLoading] = useState(false)
  const [expenseIntervalError, setExpenseIntervalError] = useState('')
  const [feeBalanceMonth, setFeeBalanceMonth] = useState(() => getPakistanCurrentMonth())
  const [feeBalanceByMonth, setFeeBalanceByMonth] = useState(null)
  const [isFeeBalanceLoading, setIsFeeBalanceLoading] = useState(false)
  const [feeBalanceError, setFeeBalanceError] = useState('')
  const [campusFeeBreakdownMonth, setCampusFeeBreakdownMonth] = useState(() => getPakistanCurrentMonth())
  const [campusFeeBreakdownCache, setCampusFeeBreakdownCache] = useState({})
  const [isCampusFeeBreakdownLoading, setIsCampusFeeBreakdownLoading] = useState(false)
  const [campusFeeBreakdownError, setCampusFeeBreakdownError] = useState('')
  const chartsInitializedRef = useRef(false)

  const activeState = tabState[activeTab] || { isLoading: false, data: null, error: '' }
  const isAllCampusDashboardReady = Boolean(
    tabState[ALL_TAB]?.data && !tabState[ALL_TAB]?.isLoading,
  )
  const allCampuses = filterProductionCampusRows(tabState[ALL_TAB]?.data?.campuses || [], (row) => row.campus)

  const loadTab = useCallback(async (tab, force = false) => {
    const existing = tabState[tab]
    if (!force && (existing?.data || existing?.isLoading)) return

    setTabState((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] || {}), isLoading: true, error: '' },
    }))

    try {
      const data = tab === ALL_TAB ? await getAllCampusesDashboard() : await getCampusDashboard(tab)
      if (force || !existing?.data) {
        setTabState((prev) => ({
          ...prev,
          [tab]: {
            ...(prev[tab] || {}),
            isLoading: true,
            isCompleting: true,
            error: '',
          },
        }))
        await wait(tab === ALL_TAB ? 700 : 850)
      }

      setTabState((prev) => ({
        ...prev,
        [tab]: {
          data,
          isLoading: false,
          isCompleting: false,
          error: '',
          loadedAt: new Date().toISOString(),
        },
      }))
    } catch (err) {
      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...(prev[tab] || {}),
          isLoading: false,
          isCompleting: false,
          error: err?.response?.data?.message || err?.message || 'Unable to load dashboard data.',
        },
      }))
    }
  }, [tabState])

  const loadFeeCollectionByDate = useCallback(async (date) => {
    setIsFeeCollectionLoading(true)
    setFeeCollectionError('')
    try {
      const data = await getAllCampusesFeeCollectionByDate(date)
      setFeeCollectionByDate(data || null)
    } catch (err) {
      setFeeCollectionByDate(null)
      setFeeCollectionError(err?.response?.data?.message || err?.message || 'Unable to load fee collection for this date.')
    } finally {
      setIsFeeCollectionLoading(false)
    }
  }, [])

  const loadAdmissionsByMonth = useCallback(async (monthValue) => {
    const [year, month] = String(monthValue || getPakistanCurrentMonth()).split('-').map(Number)
    setIsAdmissionsLoading(true)
    setAdmissionsError('')
    try {
      const data = await getAllCampusesAdmissionsByMonth({ month, year })
      setAdmissionsByMonth(data || null)
    } catch (err) {
      setAdmissionsByMonth(null)
      setAdmissionsError(err?.response?.data?.message || err?.message || 'Unable to load admissions for this month.')
    } finally {
      setIsAdmissionsLoading(false)
    }
  }, [])

  const loadExpensesByInterval = useCallback(async (days) => {
    setIsExpenseIntervalLoading(true)
    setExpenseIntervalError('')
    try {
      const data = await getAllCampusesExpensesByInterval(days)
      setExpenseByInterval(data || null)
    } catch (err) {
      setExpenseByInterval(null)
      setExpenseIntervalError(err?.response?.data?.message || err?.message || 'Unable to load expenses for this interval.')
    } finally {
      setIsExpenseIntervalLoading(false)
    }
  }, [])

  const loadFeeBalanceByMonth = useCallback(async (monthValue) => {
    const [year, month] = String(monthValue || getPakistanCurrentMonth()).split('-').map(Number)
    setIsFeeBalanceLoading(true)
    setFeeBalanceError('')
    try {
      const data = await getAllCampusesFeeBalanceByMonth({ month, year })
      setFeeBalanceByMonth(data || null)
    } catch (err) {
      setFeeBalanceByMonth(null)
      setFeeBalanceError(err?.response?.data?.message || err?.message || 'Unable to load fee balance for this month.')
    } finally {
      setIsFeeBalanceLoading(false)
    }
  }, [])

  const loadCampusFeeBreakdownByMonth = useCallback(async (campus, monthValue) => {
    if (!campus || campus === ALL_TAB) return
    const cacheKey = `${campus}-${monthValue}`
    if (campusFeeBreakdownCache[cacheKey]) {
      setCampusFeeBreakdownError('')
      return
    }

    const [year, month] = String(monthValue || getPakistanCurrentMonth()).split('-').map(Number)
    setIsCampusFeeBreakdownLoading(true)
    setCampusFeeBreakdownError('')
    try {
      const data = await getCampusFeeBreakdownByMonth({ campus, month, year })
      setCampusFeeBreakdownCache((prev) => ({
        ...prev,
        [cacheKey]: data || null,
      }))
    } catch (err) {
      setCampusFeeBreakdownError(err?.response?.data?.message || err?.message || 'Unable to load fee breakdown for this month.')
    } finally {
      setIsCampusFeeBreakdownLoading(false)
    }
  }, [campusFeeBreakdownCache])

  useEffect(() => {
    if (showAllCampusesDashboard()) {
      loadTab(ALL_TAB)
    } else {
      loadTab(initialDashboardTab)
    }
  }, [loadTab])

  // Load chart data one-by-one after the main all-campus dashboard finishes.
  // Firing these in parallel with the main dashboard overwhelms remote campus DB connections.
  useEffect(() => {
    if (!isAllCampusDashboardReady || chartsInitializedRef.current) return undefined

    let cancelled = false

    ;(async () => {
      await loadAdmissionsByMonth(admissionsMonth)
      if (cancelled) return
      await loadFeeCollectionByDate(feeCollectionDate)
      if (cancelled) return
      await loadExpensesByInterval(expenseIntervalDays)
      if (cancelled) return
      await loadFeeBalanceByMonth(feeBalanceMonth)
      if (!cancelled) chartsInitializedRef.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [
    isAllCampusDashboardReady,
    loadAdmissionsByMonth,
    loadFeeCollectionByDate,
    loadExpensesByInterval,
    loadFeeBalanceByMonth,
  ])

  useEffect(() => {
    if (!chartsInitializedRef.current) return
    loadFeeCollectionByDate(feeCollectionDate)
  }, [feeCollectionDate, loadFeeCollectionByDate])

  useEffect(() => {
    if (!chartsInitializedRef.current) return
    loadAdmissionsByMonth(admissionsMonth)
  }, [admissionsMonth, loadAdmissionsByMonth])

  useEffect(() => {
    if (!chartsInitializedRef.current) return
    loadExpensesByInterval(expenseIntervalDays)
  }, [expenseIntervalDays, loadExpensesByInterval])

  useEffect(() => {
    if (!chartsInitializedRef.current) return
    loadFeeBalanceByMonth(feeBalanceMonth)
  }, [feeBalanceMonth, loadFeeBalanceByMonth])

  useEffect(() => {
    if (activeTab !== ALL_TAB) {
      loadCampusFeeBreakdownByMonth(activeTab, campusFeeBreakdownMonth)
    }
  }, [activeTab, campusFeeBreakdownMonth, loadCampusFeeBreakdownByMonth])

  const onTabChange = (tab) => {
    if (import.meta.env.PROD && isLocalCampus(tab)) return
    if (tab === ALL_TAB && !showAllCampusesDashboard()) return
    if (tab !== ALL_TAB && !isCampusAllowedInApp(tab)) return
    setActiveTab(tab)
    loadTab(tab)
  }

  const onFeeCollectionDateChange = (date) => {
    setFeeCollectionDate(date)
  }

  const onAdmissionsMonthChange = (monthValue) => {
    setAdmissionsMonth(monthValue)
  }

  const onExpenseIntervalChange = (days) => {
    setExpenseIntervalDays(days)
  }

  const onFeeBalanceMonthChange = (monthValue) => {
    setFeeBalanceMonth(monthValue)
  }

  const onCampusFeeBreakdownMonthChange = (monthValue) => {
    setCampusFeeBreakdownMonth(monthValue)
  }

  const heading = activeTab === ALL_TAB ? 'Director Dashboard' : `Campus Dashboard - ${getCampusLabel(activeTab)}`
  const loadedAt = activeState.loadedAt || activeState.data?.generatedAt
  const selectedCampusLabel = activeTab === ALL_TAB ? 'All Campuses' : compactCampusLabel(activeTab, getCampusLabel(activeTab))

  const tabsAvailable = useMemo(() => {
    if (allCampuses.length) return allCampuses
    return visibleCampusOptions.map((item) => ({ campus: item.value }))
  }, [allCampuses])

  return (
    <CampusShell hideSidebar campusOverviewActive hideLoggedCampusInHeader headerContext={selectedCampusLabel}>
      <div className="min-h-screen overflow-x-hidden bg-slate-50 px-4 pb-8 pt-[4.25rem] md:px-6 md:pt-[4.5rem] lg:px-7">
        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">{heading}</h1>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {selectedCampusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === ALL_TAB
                  ? `Today: ${formatDate(activeState.data?.date)}`
                  : `Current active-student production snapshot for ${getCampusLabel(activeTab)}`}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">Loaded: {formatDateTime(loadedAt)}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
              <button
                type="button"
                onClick={() => navigate('/campus/dashboard')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <ArrowLeft size={16} />
                Dashboard
              </button>
              <CampusSelector activeTab={activeTab} onChange={onTabChange} availableCampuses={tabsAvailable} />
              <button
                type="button"
                onClick={() => loadTab(activeTab, true)}
                disabled={activeState.isLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {activeState.isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5">
          {activeState.error ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {activeState.error}
            </section>
          ) : null}

          {activeState.isLoading ? (
            <DashboardLoadingState
              activeTab={activeTab}
              availableCampuses={tabsAvailable}
              isCompleting={activeState.isCompleting}
            />
          ) : null}

          {!activeState.isLoading && activeState.data ? (
            activeTab === ALL_TAB ? (
              <AllCampusesView
                data={activeState.data}
                admissionsByMonth={admissionsByMonth}
                admissionsError={admissionsError}
                admissionsMonth={admissionsMonth}
                expenseByInterval={expenseByInterval}
                expenseIntervalDays={expenseIntervalDays}
                expenseIntervalError={expenseIntervalError}
                feeBalanceByMonth={feeBalanceByMonth}
                feeBalanceError={feeBalanceError}
                feeBalanceMonth={feeBalanceMonth}
                feeCollectionByDate={feeCollectionByDate}
                feeCollectionDate={feeCollectionDate}
                feeCollectionError={feeCollectionError}
                isAdmissionsLoading={isAdmissionsLoading}
                isExpenseIntervalLoading={isExpenseIntervalLoading}
                isFeeBalanceLoading={isFeeBalanceLoading}
                isFeeCollectionLoading={isFeeCollectionLoading}
                onAdmissionsMonthChange={onAdmissionsMonthChange}
                onExpenseIntervalChange={onExpenseIntervalChange}
                onFeeBalanceMonthChange={onFeeBalanceMonthChange}
                onFeeCollectionDateChange={onFeeCollectionDateChange}
              />
            ) : (
              <CampusDetailView
                data={activeState.data}
                feeBreakdownByMonth={campusFeeBreakdownCache[`${activeTab}-${campusFeeBreakdownMonth}`] || null}
                feeBreakdownError={campusFeeBreakdownError}
                feeBreakdownMonth={campusFeeBreakdownMonth}
                isFeeBreakdownLoading={isCampusFeeBreakdownLoading}
                onFeeBreakdownMonthChange={onCampusFeeBreakdownMonthChange}
              />
            )
          ) : null}
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusDashboardPage

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import {
  AlarmClock,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Cake,
  CalendarDays,
  ChevronRight,
  Clock3,
  EyeOff,
  FileBarChart,
  Loader2,
  Monitor,
  RefreshCw,
  School,
  Siren,
  UserPlus,
  UserRound,
  Users,
  UserRoundCheck,
  Wallet,
} from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { SCHOOL_NAME } from '../../../constants/branding'
import { getPakistanTodayIso } from '../../../utils/pakistanDate'
import { getCampusDashboard } from '../../../services/campusDashboardService'

const LIST_LIMIT = 5
const ADMISSIONS_LIMIT = 4
const MONEY_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

const EMPTY_TREND = {
  value: 0,
  previousValue: 0,
  changeAbsolute: 0,
  changePercent: 0,
  isUp: true,
  comparisonLabel: '',
  sparkline: [],
}

const EMPTY_ATTENDANCE = {
  totalStudents: 0,
  presentCount: 0,
  absentCount: 0,
  onLeaveCount: 0,
  markedCount: 0,
  presentPercent: 0,
  absentPercent: 0,
  onLeavePercent: 0,
}

const QUICK_ACTIONS = [
  { label: 'Add Student', icon: UserPlus, to: '/campus/students/admit', color: 'text-sky-600', permission: 'add_std' },
  { label: 'Collect Fee', icon: Monitor, to: '/campus/fee/reports', color: 'text-emerald-600', permission: 'rpt_fee' },
  { label: 'Mark Attendance', icon: UserRoundCheck, to: '/campus/live-attendance', color: 'text-indigo-600', permission: 'view_live_emp_attendance' },
  { label: 'New Diary Entry', icon: BookOpen, to: '/campus/daily-diary', color: 'text-amber-600', permission: 'edit_daily_diary' },
  { label: 'Add Employee', icon: Users, to: '/campus/employees', color: 'text-violet-600', permission: 'manage_employees' },
  { label: 'View Reports', icon: FileBarChart, to: '/campus/reports/income', color: 'text-rose-500', permission: 'view_profit_loss' },
]

const AVATAR_TONES = [
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
]

const ALERT_ICON = {
  danger: { Icon: AlertTriangle, wrap: 'bg-rose-50 text-rose-600' },
  warning: { Icon: Bell, wrap: 'bg-amber-50 text-amber-600' },
  info: { Icon: CalendarDays, wrap: 'bg-sky-50 text-sky-600' },
  success: { Icon: UserRoundCheck, wrap: 'bg-emerald-50 text-emerald-600' },
}

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatDateLong(value) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
}

function formatShortDate(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatClock(date) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function pick(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key]
  }
  return undefined
}

function normalizeTrend(raw) {
  if (!raw) return { ...EMPTY_TREND }
  return {
    value: Number(pick(raw, 'value', 'Value') ?? 0),
    previousValue: Number(pick(raw, 'previousValue', 'PreviousValue') ?? 0),
    changeAbsolute: Number(pick(raw, 'changeAbsolute', 'ChangeAbsolute') ?? 0),
    changePercent: Number(pick(raw, 'changePercent', 'ChangePercent') ?? 0),
    isUp: Boolean(pick(raw, 'isUp', 'IsUp')),
    comparisonLabel: pick(raw, 'comparisonLabel', 'ComparisonLabel') || '',
    sparkline: (pick(raw, 'sparkline', 'Sparkline') || []).map((n) => Number(n || 0)),
  }
}

function ChartCanvas({ config, className = 'h-64' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined
    const chart = new Chart(canvasRef.current, config)
    return () => chart.destroy()
  }, [config])

  return (
    <div className={`min-w-0 ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  )
}

function Sparkline({ values, color }) {
  const config = useMemo(
    () => ({
      type: 'line',
      data: {
        labels: (values || []).map((_, i) => i),
        datasets: [
          {
            data: values?.length ? values : [0],
            borderColor: color,
            backgroundColor: `${color}22`,
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    }),
    [values, color],
  )

  return <ChartCanvas config={config} className="h-8 w-16 shrink-0" />
}

function KpiCard({ title, icon: Icon, value, trend, accent, formatValue, absoluteHint, onClick }) {
  const up = trend.isUp
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight
  const trendColor = up ? 'text-emerald-600' : 'text-rose-600'
  const deltaLabel = absoluteHint
    ? `${up ? '+ ' : '- '}${formatAmount(Math.abs(trend.changeAbsolute))} ${trend.comparisonLabel}`
    : `${Math.abs(trend.changePercent)}% ${trend.comparisonLabel}`

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${accent.iconBg}`}>
          <Icon size={15} className={accent.iconText} />
        </div>
        <Sparkline values={trend.sparkline} color={accent.spark} />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{title}</p>
      <div className="relative mt-0.5 min-h-[1.75rem]">
        <p className="text-xl font-bold tracking-tight text-slate-900 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {formatValue(trend.value ?? value)}
        </p>
        <span
          className="pointer-events-none absolute inset-y-0 left-0 hidden items-center text-slate-400 transition-opacity duration-150 md:inline-flex md:group-hover:opacity-0 md:group-focus-within:opacity-0"
          aria-hidden="true"
        >
          <EyeOff size={18} strokeWidth={2} />
        </span>
      </div>
      <p className={`mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold ${trendColor}`}>
        <TrendIcon size={12} />
        {deltaLabel}
      </p>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group rounded-xl bg-white px-3.5 py-3 text-left shadow-sm ring-1 ring-slate-100 transition hover:ring-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {body}
      </button>
    )
  }

  return (
    <article className="group rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100">
      {body}
    </article>
  )
}

function Panel({ title, titleIcon, action, children, className = '' }) {
  return (
    <article className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
          {titleIcon}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </article>
  )
}

function ViewLink({ onClick, children = 'View all' }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline">
      {children}
    </button>
  )
}

function EmptyInline({ label }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-500">
      {label}
    </p>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`kpi-skel-${i}`} className="rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between">
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
              <SkeletonBlock className="h-8 w-16" />
            </div>
            <SkeletonBlock className="mt-3 h-3 w-24" />
            <SkeletonBlock className="mt-2 h-6 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-6 w-20 rounded-md" />
          </div>
          <SkeletonBlock className="h-56 w-full rounded-lg" />
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <SkeletonBlock className="mb-3 h-4 w-36" />
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-36 w-36 shrink-0 rounded-full" />
            <div className="w-full space-y-3">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-48" />
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`list-skel-${i}`} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <SkeletonBlock className="mb-3 h-4 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={`row-skel-${i}-${j}`} className="flex items-center gap-2.5">
                  <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3 w-36" />
                    <SkeletonBlock className="h-2.5 w-24" />
                  </div>
                  <SkeletonBlock className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`bottom-skel-${i}`} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <SkeletonBlock className="mb-3 h-4 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <SkeletonBlock key={`bottom-row-${i}-${j}`} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'Admin'
  const campus = localStorage.getItem('campus') || ''

  const [now, setNow] = useState(() => new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const loadDashboard = useCallback(async () => {
    if (!campus) {
      setError('Campus is not selected. Please sign in again.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const result = await getCampusDashboard(campus)
      setData(result)
    } catch {
      setError('Unable to load dashboard insights right now.')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [campus])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const activeStudentsTrend = useMemo(
    () => normalizeTrend(pick(data, 'activeStudentsTrend', 'ActiveStudentsTrend')),
    [data],
  )
  const feeTodayTrend = useMemo(
    () => normalizeTrend(pick(data, 'feeCollectionTodayTrend', 'FeeCollectionTodayTrend')),
    [data],
  )
  const receivableTrend = useMemo(
    () => normalizeTrend(pick(data, 'outstandingReceivableTrend', 'OutstandingReceivableTrend')),
    [data],
  )
  const attendanceTrend = useMemo(
    () => normalizeTrend(pick(data, 'attendanceTodayTrend', 'AttendanceTodayTrend')),
    [data],
  )

  const attendance = useMemo(() => {
    const raw = pick(data, 'attendanceOverview', 'AttendanceOverview') || EMPTY_ATTENDANCE
    return {
      totalStudents: Number(pick(raw, 'totalStudents', 'TotalStudents') ?? 0),
      presentCount: Number(pick(raw, 'presentCount', 'PresentCount') ?? 0),
      absentCount: Number(pick(raw, 'absentCount', 'AbsentCount') ?? 0),
      onLeaveCount: Number(pick(raw, 'onLeaveCount', 'OnLeaveCount') ?? 0),
      markedCount: Number(pick(raw, 'markedCount', 'MarkedCount') ?? 0),
      presentPercent: Number(pick(raw, 'presentPercent', 'PresentPercent') ?? 0),
      absentPercent: Number(pick(raw, 'absentPercent', 'AbsentPercent') ?? 0),
      onLeavePercent: Number(pick(raw, 'onLeavePercent', 'OnLeavePercent') ?? 0),
    }
  }, [data])

  const feeTrendRows = useMemo(() => {
    const rows = pick(data, 'feeCollectionTrendLast30Days', 'FeeCollectionTrendLast30Days') || []
    return rows.map((row) => ({
      label: pick(row, 'label', 'Label') || '',
      date: pick(row, 'date', 'Date'),
      amount: Number(pick(row, 'amount', 'Amount') ?? 0),
    }))
  }, [data])

  const birthdays = useMemo(() => {
    const rows = pick(data, 'birthdaysToday', 'BirthdaysToday') || []
    return rows.map((row) => ({
      id: pick(row, 'id', 'Id'),
      name: pick(row, 'name', 'Name') || '—',
      role: pick(row, 'role', 'Role') || 'Student',
      classOrDesignation: pick(row, 'classOrDesignation', 'ClassOrDesignation'),
    }))
  }, [data])

  const lateTeachers = useMemo(() => {
    const rows = pick(data, 'teachersCheckedInLate', 'TeachersCheckedInLate') || []
    return rows.map((row) => ({
      employeeId: pick(row, 'employeeId', 'EmployeeId'),
      employeeName: pick(row, 'employeeName', 'EmployeeName') || 'Employee',
      designationName: pick(row, 'designationName', 'DesignationName'),
      checkInTime: pick(row, 'checkInTime', 'CheckInTime'),
      lateMinutes: Number(pick(row, 'lateMinutes', 'LateMinutes') ?? 0),
    }))
  }, [data])

  const alerts = useMemo(() => {
    const rows = pick(data, 'alerts', 'Alerts') || []
    return rows.map((row) => ({
      severity: String(pick(row, 'severity', 'Severity') || 'info').toLowerCase(),
      title: pick(row, 'title', 'Title') || '',
      message: pick(row, 'message', 'Message') || '',
    }))
  }, [data])

  const recentAdmissions = useMemo(() => {
    const rows = pick(data, 'recentAdmissions', 'RecentAdmissions') || []
    return rows
      .map((row) => ({
        studentId: pick(row, 'studentId', 'StudentId'),
        studentName: pick(row, 'studentName', 'StudentName') || 'Student',
        className: pick(row, 'className', 'ClassName'),
        admissionDate: pick(row, 'admissionDate', 'AdmissionDate'),
      }))
      .slice(0, ADMISSIONS_LIMIT)
  }, [data])

  const topDefaulters = useMemo(() => {
    const rows = pick(data, 'topFeeDefaulters', 'TopFeeDefaulters') || []
    return rows
      .map((row) => ({
        studentId: pick(row, 'studentId', 'StudentId'),
        studentName: pick(row, 'studentName', 'StudentName') || 'Student',
        className: pick(row, 'className', 'ClassName'),
        outstandingAmount: Number(pick(row, 'outstandingAmount', 'OutstandingAmount') ?? 0),
      }))
      .slice(0, LIST_LIMIT)
  }, [data])

  const visibleBirthdays = birthdays.slice(0, LIST_LIMIT)
  const visibleLate = lateTeachers.slice(0, LIST_LIMIT)
  const visibleAlerts = alerts.slice(0, LIST_LIMIT)

  const feeBarConfig = useMemo(() => {
    const labels = feeTrendRows.map((row) => {
      if (!row.date) return row.label
      const d = new Date(row.date)
      return Number.isNaN(d.getTime()) ? row.label : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    })
    const values = feeTrendRows.map((row) => row.amount)
    const colors = values.map((_, i) => MONEY_COLORS[i % MONEY_COLORS.length])

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            hoverBackgroundColor: colors,
            borderRadius: 7,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.74,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items?.[0]?.dataIndex
                const row = feeTrendRows[idx]
                if (!row?.date) return items?.[0]?.label || ''
                const d = new Date(row.date)
                return Number.isNaN(d.getTime())
                  ? items?.[0]?.label || ''
                  : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
              },
              label: (item) => `Rs ${formatAmount(item.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: '#334155', font: { size: 11 } },
            border: { color: '#94a3b8' },
          },
          y: {
            beginAtZero: true,
            grace: '8%',
            grid: { color: '#e5e7eb' },
            ticks: {
              color: '#475569',
              font: { size: 11 },
              callback: (value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value),
            },
            border: { color: '#94a3b8' },
          },
        },
      },
    }
  }, [feeTrendRows])

  const openAbsentListReport = useCallback(() => {
    const today = getPakistanTodayIso()
    navigate(
      `/campus/reports/attendance?preset=absent-list&dateFrom=${today}&dateTo=${today}&run=1`,
    )
  }, [navigate])

  const attendanceDonutConfig = useMemo(() => {
    const slices = [
      { label: 'Present', value: attendance.presentCount, color: '#10b981' },
      { label: 'Absent', value: attendance.absentCount, color: '#ef4444' },
      { label: 'On Leave', value: attendance.onLeaveCount, color: '#f59e0b' },
    ]
    const hasData = slices.some((s) => s.value > 0)

    return {
      type: 'doughnut',
      data: {
        labels: slices.map((s) => s.label),
        datasets: [
          {
            data: hasData ? slices.map((s) => s.value) : [1],
            backgroundColor: hasData ? slices.map((s) => s.color) : ['#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: hasData },
        },
        onHover: (event, elements) => {
          const canvas = event?.native?.target
          if (!canvas?.style) return
          if (!hasData || !elements?.length) {
            canvas.style.cursor = 'default'
            return
          }
          const label = slices[elements[0].index]?.label
          canvas.style.cursor = label === 'Absent' ? 'pointer' : 'default'
        },
        onClick: (_event, elements) => {
          if (!hasData || !elements?.length) return
          const label = slices[elements[0].index]?.label
          if (label === 'Absent') openAbsentListReport()
        },
      },
    }
  }, [attendance, openAbsentListReport])

  return (
    <CampusShell>
      <div className="flex min-h-screen flex-col bg-slate-50/80 p-4 pt-[4.25rem] md:p-5 md:pt-[4.5rem] lg:p-6 lg:pt-[4.5rem]">
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-800 md:text-xl">
              {getGreeting(now)}, {username}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">Here&apos;s what&apos;s happening at your school today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CalendarDays size={14} className="text-slate-400" />
                <span>{formatDateLong(now)}</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-800">
                <Clock3 size={14} className="text-indigo-500" />
                {formatClock(now)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              title="Refresh dashboard"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <section className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        <div className="flex-1">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="Active Students"
                  icon={School}
                  value={activeStudentsTrend.value}
                  trend={activeStudentsTrend}
                  absoluteHint
                  formatValue={(v) => Number(v || 0).toLocaleString()}
                  accent={{ iconBg: 'bg-violet-50', iconText: 'text-violet-600', spark: '#8b5cf6' }}
                  onClick={() => navigate('/campus/students')}
                />
                <KpiCard
                  title="Fee Collected Today"
                  icon={Wallet}
                  value={feeTodayTrend.value}
                  trend={feeTodayTrend}
                  formatValue={(v) => `Rs ${formatAmount(v)}`}
                  accent={{ iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', spark: '#10b981' }}
                  onClick={() => {
                    const today = new Date()
                    const yyyy = today.getFullYear()
                    const mm = String(today.getMonth() + 1).padStart(2, '0')
                    const dd = String(today.getDate()).padStart(2, '0')
                    navigate(`/campus/fee/reports?preset=collection-by-date&date=${yyyy}-${mm}-${dd}&run=1`)
                  }}
                />
                <KpiCard
                  title="Outstanding Receivable"
                  icon={AlertTriangle}
                  value={receivableTrend.value}
                  trend={receivableTrend}
                  formatValue={(v) => `Rs ${formatAmount(v)}`}
                  accent={{ iconBg: 'bg-rose-50', iconText: 'text-rose-600', spark: '#ef4444' }}
                />
                <KpiCard
                  title="Attendance Today"
                  icon={UserRoundCheck}
                  value={attendanceTrend.value}
                  trend={attendanceTrend}
                  formatValue={(v) => `${Number(v || 0).toFixed(1)}%`}
                  accent={{ iconBg: 'bg-sky-50', iconText: 'text-sky-600', spark: '#0ea5e9' }}
                />
              </section>

            <section className="mb-4 grid gap-4 xl:grid-cols-3">
              <Panel
                title="Fee Collection"
                className="xl:col-span-2"
                action={
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    Last 30 Days
                  </span>
                }
              >
                {feeTrendRows.length ? (
                  <ChartCanvas config={feeBarConfig} className="h-56" />
                ) : (
                  <EmptyInline label="No fee collection in the last 30 days." />
                )}
              </Panel>

              <Panel title="Attendance Overview">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-36 w-36 shrink-0">
                    <ChartCanvas config={attendanceDonutConfig} className="h-36" />
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{attendance.presentPercent.toFixed(1)}%</p>
                        <p className="text-[10px] font-medium text-slate-500">Present</p>
                      </div>
                    </div>
                  </div>
                  <ul className="w-full flex-1 space-y-2">
                    {[
                      { label: 'Present', color: 'bg-emerald-500', pct: attendance.presentPercent, count: attendance.presentCount },
                      {
                        label: 'Absent',
                        color: 'bg-rose-500',
                        pct: attendance.absentPercent,
                        count: attendance.absentCount,
                        onClick: openAbsentListReport,
                      },
                      { label: 'On Leave', color: 'bg-amber-500', pct: attendance.onLeavePercent, count: attendance.onLeaveCount },
                    ].map((item) => (
                      <li key={item.label}>
                        {item.onClick ? (
                          <button
                            type="button"
                            onClick={item.onClick}
                            className="flex w-full items-center justify-between gap-2 rounded-md text-left text-xs transition hover:bg-rose-50"
                            title="Open absent list"
                          >
                            <span className="inline-flex items-center gap-2 font-medium text-rose-700">
                              <span className={`h-2 w-2 rounded-full ${item.color}`} />
                              {item.label}
                            </span>
                            <span className="tabular-nums text-slate-800">
                              <span className="font-semibold">{item.pct.toFixed(1)}%</span>
                              <span className="ml-1.5 text-slate-400">{item.count.toLocaleString()}</span>
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center gap-2 text-slate-600">
                              <span className={`h-2 w-2 rounded-full ${item.color}`} />
                              {item.label}
                            </span>
                            <span className="tabular-nums text-slate-800">
                              <span className="font-semibold">{item.pct.toFixed(1)}%</span>
                              <span className="ml-1.5 text-slate-400">{item.count.toLocaleString()}</span>
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                    <li className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                      Total Students:{' '}
                      <span className="font-semibold text-slate-800">{attendance.totalStudents.toLocaleString()}</span>
                    </li>
                  </ul>
                </div>
              </Panel>
            </section>

            <section className="mb-4 grid gap-4 lg:grid-cols-3">
              <Panel
                title={`Birthdays Today${birthdays.length ? ` (${birthdays.length})` : ''}`}
                titleIcon={<Cake size={15} className="shrink-0 text-rose-400" />}
                action={<ViewLink onClick={() => navigate('/campus/students')} />}
              >
                <div className="space-y-2.5">
                  {visibleBirthdays.map((person, index) => (
                    <div key={`${person.role}-${person.id}-${person.name}`} className="flex items-center gap-2.5">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                          AVATAR_TONES[index % AVATAR_TONES.length]
                        }`}
                      >
                        {initials(person.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{person.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{person.classOrDesignation || '—'}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          person.role === 'Teacher' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'
                        }`}
                      >
                        {person.role}
                      </span>
                    </div>
                  ))}
                  {birthdays.length === 0 ? <EmptyInline label="No birthdays today." /> : null}
                </div>
              </Panel>

              <Panel
                title="Teachers Checked-in Late"
                titleIcon={<AlarmClock size={15} className="shrink-0 text-rose-500" />}
                action={<ViewLink onClick={() => navigate('/campus/live-attendance')} />}
              >
                <div className="space-y-2.5">
                  {visibleLate.map((row) => (
                    <div key={row.employeeId} className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">
                        {initials(row.employeeName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{row.employeeName}</p>
                        <p className="truncate text-[11px] text-slate-500">{row.designationName || 'Staff'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-slate-600">{row.checkInTime || '—'}</p>
                        <p className="text-[11px] font-bold text-rose-600">+{row.lateMinutes} min</p>
                      </div>
                    </div>
                  ))}
                  {lateTeachers.length === 0 ? <EmptyInline label="No late check-ins today." /> : null}
                </div>
              </Panel>

              <Panel
                title="Alerts"
                titleIcon={<Siren size={15} className="shrink-0 text-rose-500" />}
              >
                <div className="divide-y divide-slate-100">
                  {visibleAlerts.map((alert, index) => {
                    const meta = ALERT_ICON[alert.severity] || ALERT_ICON.info
                    const Icon = meta.Icon
                    return (
                      <div key={`${alert.title}-${index}`} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.wrap}`}>
                          <Icon size={14} />
                        </div>
                        <p className="min-w-0 flex-1 text-xs font-medium text-slate-700">{alert.message || alert.title}</p>
                        <ChevronRight size={14} className="shrink-0 text-slate-300" />
                      </div>
                    )
                  })}
                  {alerts.length === 0 ? <EmptyInline label="No alerts." /> : null}
                </div>
              </Panel>
            </section>

            <section className="mb-4 grid gap-4 lg:grid-cols-3">
              <Panel
                title="Recent Admissions"
                action={<ViewLink onClick={() => navigate('/campus/students')}>View all</ViewLink>}
              >
                <div className="space-y-2.5">
                  {recentAdmissions.map((row) => (
                    <div key={row.studentId} className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600">
                        <UserRound size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{row.studentName}</p>
                        <p className="truncate text-[11px] text-slate-500">{row.className || '—'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-medium text-slate-500">Reg #{row.studentId}</p>
                        <p className="text-[11px] text-slate-400">{formatShortDate(row.admissionDate)}</p>
                      </div>
                    </div>
                  ))}
                  {recentAdmissions.length === 0 ? <EmptyInline label="No recent admissions." /> : null}
                </div>
              </Panel>

              <Panel
                title="Top Fee Defaulters"
                action={
                  <ViewLink onClick={() => navigate('/campus/fee/reports?preset=top-defaulters')}>Open Report</ViewLink>
                }
              >
                {topDefaulters.length ? (
                  <div className="overflow-x-auto">
                    <table className="dashboard-plain-table min-w-full border-collapse text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                          <th className="pb-2 font-medium text-slate-400">Student</th>
                          <th className="pb-2 font-medium text-slate-400">Class</th>
                          <th className="pb-2 text-right font-medium text-slate-400">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topDefaulters.map((row) => (
                          <tr key={row.studentId} className="border-t border-slate-100">
                            <td className="py-2 pr-2 font-semibold text-slate-800">{row.studentName}</td>
                            <td className="py-2 pr-2 text-slate-500">{row.className || '-'}</td>
                            <td className="py-2 text-right font-semibold text-slate-800">
                              Rs {formatAmount(row.outstandingAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyInline label="No students with outstanding balance." />
                )}
              </Panel>

              <Panel title="Quick Actions">
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon
                    return (
                      <PermissionControl key={action.label} permission={action.permission} className="block w-full">
                      <button
                        type="button"
                        onClick={() => navigate(action.to)}
                        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-3 text-center transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Icon size={18} className={action.color} />
                        <span className="text-[10px] font-semibold leading-tight text-slate-700">{action.label}</span>
                      </button>
                      </PermissionControl>
                    )
                  })}
                </div>
              </Panel>
            </section>
            </>
          )}
        </div>

        <footer className="mt-auto pt-4 pb-2 text-center text-xs text-slate-400">
          © {now.getFullYear()} {SCHOOL_NAME}. All rights reserved.
        </footer>
      </div>
    </CampusShell>
  )
}

export default DashboardPage

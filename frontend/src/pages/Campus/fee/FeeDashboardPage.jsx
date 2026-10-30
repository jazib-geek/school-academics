import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Chart from 'chart.js/auto'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  Printer,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import { getFeeDashboard } from '../../../services/feeReportService'
import { hasCampusPermission } from '../../../services/authService'
import { sortClassesByCustomOrder } from '../../../services/classSort'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintDate,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'

const PERIOD_OPTIONS = [6, 12, 24]

const COLORS = {
  primary: '#405189',
  income: '#10b981',
  expense: '#f43f5e',
  billed: '#94a3b8',
  aging: ['#22c55e', '#facc15', '#f97316', '#dc2626', '#38bdf8', '#6366f1'],
}

const money = (value) => formatReportPrintMoney(value)
const rs = (value) => `Rs ${money(value)}`
const pct = (value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`

const compactMoney = (value) => {
  const n = Number(value || 0)
  const abs = Math.abs(n)
  if (abs >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
  if (abs >= 100000) return `${(n / 100000).toFixed(1)} Lac`
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}k`
  return money(n)
}

function buildInsights(data) {
  if (!data) return []
  const { kpis, trend = [], aging = [], classes = [], forecast } = data
  const items = []

  if (kpis.collectedLastMonthSamePeriod > 0) {
    const change = ((kpis.collectedMtd - kpis.collectedLastMonthSamePeriod) / kpis.collectedLastMonthSamePeriod) * 100
    const ahead = change >= 0
    items.push({
      tone: ahead ? 'good' : change <= -10 ? 'bad' : 'warn',
      text: `Collection is ${pct(Math.abs(change))} ${ahead ? 'ahead of' : 'behind'} last month at this date (${rs(kpis.collectedMtd)} vs ${rs(kpis.collectedLastMonthSamePeriod)}).`,
    })
  }

  if (kpis.currentMonthTuitionBilled > 0) {
    const rate = kpis.currentMonthCollectionRate
    items.push({
      tone: rate >= 80 ? 'good' : rate >= 50 ? 'warn' : 'bad',
      text: `${pct(rate)} of this month's tuition is collected. ${rs(forecast.currentMonthRemainingDue)} is still pending.`,
    })
  }

  const totalPending = aging.reduce((sum, b) => sum + b.amount, 0)
  const oldPending = aging
    .filter((b) => b.key === '3-5' || b.key === '6+')
    .reduce((sum, b) => sum + b.amount, 0)
  if (oldPending > 0 && totalPending > 0) {
    const share = (oldPending / totalPending) * 100
    items.push({
      tone: share >= 30 ? 'bad' : 'warn',
      text: `${rs(oldPending)} (${pct(share)} of pending tuition and funds) is more than 3 months old. Older dues are harder to recover.`,
    })
  }

  if (kpis.totalOutstanding > 0 && classes.length >= 3) {
    const top = [...classes].sort((a, b) => b.outstanding - a.outstanding).slice(0, 3)
    const share = (top.reduce((sum, c) => sum + c.outstanding, 0) / kpis.totalOutstanding) * 100
    if (share >= 35) {
      items.push({
        tone: 'info',
        text: `${top.map((c) => c.className).join(', ')} hold ${pct(share)} of all outstanding fee. Focus follow-ups there first.`,
      })
    }
  }

  const completed = trend.slice(0, -1).slice(-6)
  const lossMonths = completed.filter((t) => t.expenses > t.received)
  if (completed.length > 0) {
    items.push({
      tone: lossMonths.length === 0 ? 'good' : lossMonths.length >= 3 ? 'bad' : 'warn',
      text:
        lossMonths.length === 0
          ? `Fee collection covered expenses in each of the last ${completed.length} months.`
          : `Expenses were higher than fee collection in ${lossMonths.length} of the last ${completed.length} months (${lossMonths.map((t) => t.label).join(', ')}).`,
    })
  }

  if (forecast.avgMonthlyExpensesLast3 > 0) {
    const covered = forecast.projectedMonthEndCollection >= forecast.avgMonthlyExpensesLast3
    items.push({
      tone: covered ? 'good' : 'warn',
      text: `At the current pace this month should close near ${rs(forecast.projectedMonthEndCollection)}, against average monthly expenses of ${rs(forecast.avgMonthlyExpensesLast3)}.`,
    })
  }

  if (kpis.discountMtd > 0 && kpis.collectedMtd > 0) {
    items.push({
      tone: 'info',
      text: `Discounts given this month: ${rs(kpis.discountMtd)} (${pct((kpis.discountMtd / (kpis.collectedMtd + kpis.discountMtd)) * 100)} of fee settled).`,
    })
  }

  return items
}

function ChartCanvas({ config, className = 'h-64' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined
    const chart = new Chart(canvasRef.current, config)
    return () => chart.destroy()
  }, [config])

  return (
    <div className={`relative min-w-0 ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  )
}

function collectionBarClass(rate) {
  if (rate >= 80) return 'bg-emerald-500'
  if (rate >= 50) return 'bg-amber-400'
  return 'bg-rose-500'
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'default', iconClass = 'text-[var(--campus-primary)] bg-indigo-50', progress }) {
  const subClass =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-500'
  const rate = Math.max(0, Math.min(100, Number(progress) || 0))
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
      {progress != null ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${collectionBarClass(rate)}`} style={{ width: `${rate}%` }} />
        </div>
      ) : null}
      {sub ? <p className={`mt-1 text-xs ${subClass}`}>{sub}</p> : null}
    </div>
  )
}

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function DrillLink({ to, children }) {
  return (
    <Link to={to} className="text-xs font-medium text-[var(--campus-primary)] hover:underline">
      {children}
    </Link>
  )
}

const INSIGHT_DOT = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-400',
  bad: 'bg-rose-500',
  info: 'bg-sky-500',
}

function tuitionMonthColor(amount, max) {
  const share = max > 0 ? Number(amount) / Number(max) : 0
  if (share >= 0.85) return '#e11d48'
  if (share >= 0.45) return '#f97316'
  if (share >= 0.15) return '#eab308'
  return '#22c55e'
}

function FeeDashboardPage() {
  const [months, setMonths] = useState(6)
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const canOpenReports = hasCampusPermission('rpt_fee')
  const canOpenProfitLoss = hasCampusPermission('view_profit_loss')
  const reportLink = (preset) => `/campus/fee/reports?preset=${preset}&run=1`

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await getFeeDashboard(months))
    } catch {
      setError('Unable to load the fee dashboard right now. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [months])

  useEffect(() => {
    load()
  }, [load])

  const kpis = data?.kpis
  const forecast = data?.forecast
  const trend = useMemo(() => data?.trend || [], [data])
  const insights = useMemo(() => buildInsights(data), [data])
  const classes = useMemo(() => sortClassesByCustomOrder(data?.classes || []), [data])
  const maxClassOutstanding = useMemo(
    () => Math.max(1, ...classes.map((c) => c.outstanding)),
    [classes],
  )

  const momChange =
    kpis && kpis.collectedLastMonthSamePeriod > 0
      ? ((kpis.collectedMtd - kpis.collectedLastMonthSamePeriod) / kpis.collectedLastMonthSamePeriod) * 100
      : null

  const profitChartConfig = useMemo(
    () => ({
      type: 'bar',
      data: {
        labels: trend.map((t) => t.label),
        datasets: [
          {
            type: 'line',
            label: 'Net profit',
            data: trend.map((t) => t.netProfit),
            borderColor: COLORS.primary,
            backgroundColor: COLORS.primary,
            tension: 0.3,
            pointRadius: 3,
            order: 0,
          },
          { label: 'Fee collected', data: trend.map((t) => t.received), backgroundColor: COLORS.income, borderRadius: 4, order: 1 },
          { label: 'Expenses', data: trend.map((t) => t.expenses), backgroundColor: COLORS.expense, borderRadius: 4, order: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${rs(ctx.parsed.y)}` } },
        },
        scales: { y: { ticks: { callback: (v) => compactMoney(v) } } },
      },
    }),
    [trend],
  )

  const recoveryChartConfig = useMemo(
    () => ({
      type: 'bar',
      data: {
        labels: trend.map((t) => t.label),
        datasets: [
          { label: 'Tuition billed', data: trend.map((t) => t.tuitionBilled), backgroundColor: COLORS.billed, borderRadius: 4 },
          { label: 'Tuition collected', data: trend.map((t) => t.tuitionRecovered), backgroundColor: COLORS.income, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${rs(ctx.parsed.y)}`,
              footer: (items) => {
                const point = trend[items[0]?.dataIndex]
                if (!point || point.tuitionBilled <= 0) return ''
                return `Collected: ${pct((point.tuitionRecovered / point.tuitionBilled) * 100)}`
              },
            },
          },
        },
        scales: { y: { ticks: { callback: (v) => compactMoney(v) } } },
      },
    }),
    [trend],
  )

  const agingChartConfig = useMemo(() => {
    const buckets = (data?.aging || []).filter((b) => b.amount > 0)
    return {
      type: 'doughnut',
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [
          {
            data: buckets.map((b) => b.amount),
            backgroundColor: buckets.map((b) => COLORS.aging[(data?.aging || []).indexOf(b) % COLORS.aging.length]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${rs(ctx.parsed)}` } },
        },
      },
    }
  }, [data])

  const tuitionOutstanding = useMemo(() => {
    const rows = [...trend]
      .map((point) => ({
        key: `${point.year}-${point.month}`,
        label: point.label,
        amount: Math.max(0, point.tuitionBilled - point.tuitionRecovered),
      }))
      .filter((row) => row.amount > 0)
      .reverse()
    const max = Math.max(1, ...rows.map((row) => row.amount))
    return { rows, max }
  }, [trend])

  const sessionRecovery =
    forecast && forecast.sessionTuitionBilled > 0
      ? (forecast.sessionTuitionRecovered / forecast.sessionTuitionBilled) * 100
      : 0

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <div className="no-print space-y-4">
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <LayoutDashboard size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Fee Dashboard</h1>
                  <p className="text-sm text-slate-500">
                    Collections, outstanding dues and profit for {data?.monthLabel || 'this month'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMonths(opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        months === opt ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt} months
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={load}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!data}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>
            </section>

            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{error}</div>
            ) : null}

            {!data && isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-20 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading dashboard...
              </div>
            ) : null}

            {data ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <KpiCard
                    icon={Wallet}
                    label="Collected this month"
                    value={rs(kpis.collectedMtd)}
                    sub={
                      momChange == null
                        ? `Today: ${rs(kpis.collectedToday)}`
                        : `${momChange >= 0 ? '+' : ''}${pct(momChange)} vs last month · Today ${rs(kpis.collectedToday)}`
                    }
                    tone={momChange == null ? 'default' : momChange >= 0 ? 'good' : 'bad'}
                    iconClass="text-emerald-600 bg-emerald-50"
                  />
                  <KpiCard
                    icon={AlertTriangle}
                    label="Total outstanding"
                    value={rs(kpis.totalOutstanding)}
                    sub={`Overall recovery ${pct(kpis.overallRecoveryPercent)}`}
                    tone={kpis.overallRecoveryPercent >= 90 ? 'good' : 'warn'}
                    iconClass="text-rose-600 bg-rose-50"
                  />
                  <KpiCard
                    icon={CheckCircle2}
                    label="This month's tuition"
                    value={pct(kpis.currentMonthCollectionRate)}
                    progress={kpis.currentMonthCollectionRate}
                    sub={`${money(kpis.currentMonthTuitionRecovered)}/${money(kpis.currentMonthTuitionBilled)}`}
                    tone={kpis.currentMonthCollectionRate >= 80 ? 'good' : kpis.currentMonthCollectionRate >= 50 ? 'warn' : 'bad'}
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Net profit this month"
                    value={canOpenProfitLoss ? rs(kpis.netProfitMtd) : '—'}
                    sub={`Expenses ${rs(kpis.expensesMtd)}`}
                    tone={canOpenProfitLoss ? (kpis.netProfitMtd >= 0 ? 'good' : 'bad') : 'default'}
                    iconClass={canOpenProfitLoss
                      ? (kpis.netProfitMtd >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50')
                      : 'text-slate-500 bg-slate-100'}
                  />
                  <KpiCard
                    icon={Users}
                    label="Defaulters"
                    value={`${kpis.defaulterStudents.toLocaleString()} students`}
                    sub={`${kpis.defaulterFamilies.toLocaleString()} families · ${kpis.activeStudents.toLocaleString()} active students`}
                    iconClass="text-amber-600 bg-amber-50"
                  />
                  <KpiCard
                    icon={CalendarClock}
                    label="Projected month end"
                    value={rs(forecast.projectedMonthEndCollection)}
                    sub={`Day ${forecast.daysElapsed} of ${forecast.daysInMonth} at the current pace`}
                    iconClass="text-sky-600 bg-sky-50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <Panel
                    className="xl:col-span-2"
                    title="Fee collected vs expenses"
                    subtitle="Monthly profit and loss trend"
                    action={canOpenProfitLoss ? <DrillLink to="/campus/reports/income">Profit Loss Statement</DrillLink> : null}
                  >
                    <ChartCanvas config={profitChartConfig} className="h-72" />
                  </Panel>
                  <Panel
                    title="Tuition outstanding by month"
                    subtitle="Unpaid tuition only"
                    action={canOpenReports ? <DrillLink to={reportLink('tuition-month-matrix')}>Month view</DrillLink> : null}
                  >
                    <div className="h-72 space-y-2 overflow-y-auto pr-1">
                      {tuitionOutstanding.rows.map((row) => (
                        <div key={row.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-[13px]">
                          <span className="truncate text-slate-600">{row.label}</span>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, (row.amount / tuitionOutstanding.max) * 100)}%`,
                                backgroundColor: tuitionMonthColor(row.amount, tuitionOutstanding.max),
                              }}
                            />
                          </div>
                          <span className="text-right font-medium text-slate-800">{money(row.amount)}</span>
                        </div>
                      ))}
                      {tuitionOutstanding.rows.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">No unpaid tuition in this period.</p>
                      ) : null}
                    </div>
                  </Panel>
                </div>

                {insights.length > 0 ? (
                  <Panel title="Key insights">
                    <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                      {insights.map((item) => (
                        <li key={item.text} className="flex items-start gap-2.5 border-b border-slate-100 py-2 text-[13px] leading-snug text-slate-700 last:border-0">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${INSIGHT_DOT[item.tone] || INSIGHT_DOT.info}`} />
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                ) : null}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <Panel
                    title="Tuition billed vs collected"
                    subtitle="By fee month"
                    action={canOpenReports ? <DrillLink to={reportLink('recovery-rate')}>Recovery report</DrillLink> : null}
                  >
                    <ChartCanvas config={recoveryChartConfig} className="h-64" />
                  </Panel>
                  <Panel
                    title="How old are the dues"
                    subtitle={`${rs((data.aging || []).reduce((s, b) => s + b.amount, 0))} pending`}
                    action={canOpenReports ? <DrillLink to={reportLink('aging-receivable')}>Aging report</DrillLink> : null}
                  >
                    <ChartCanvas config={agingChartConfig} className="h-64" />
                  </Panel>
                  <Panel title="Forecast and session" subtitle={forecast.sessionLabel ? `Session ${forecast.sessionLabel}` : 'Planning figures'}>
                    <dl className="h-64 space-y-2 overflow-y-auto text-[13px]">
                      {[
                        ['Still due for this month', rs(forecast.currentMonthRemainingDue)],
                        ['Monthly tuition (active students)', rs(forecast.monthlyRosterTuition)],
                        ['Average collection (last 3 months)', rs(forecast.avgMonthlyCollectionLast3)],
                        ['Average expenses (last 3 months)', rs(forecast.avgMonthlyExpensesLast3)],
                        ['Collected this session', rs(kpis.collectedSession)],
                        ['Session tuition collected', `${pct(sessionRecovery)} of ${rs(forecast.sessionTuitionBilled)}`],
                        [
                          'Expected billing for rest of session',
                          `${rs(forecast.expectedRemainingSessionBilling)} (${forecast.sessionMonthsRemaining} months)`,
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="text-right font-semibold text-slate-800">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Panel>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Panel
                    title="Class-wise outstanding"
                    subtitle="Active students only"
                    action={canOpenReports ? <DrillLink to={reportLink('class-wise-receivable')}>Class report</DrillLink> : null}
                  >
                    <div className="max-h-[26rem] overflow-auto">
                      <table className="w-full text-[13px] leading-snug">
                        <thead className="sticky top-0 bg-[var(--campus-primary)] text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Class</th>
                            <th className="px-3 py-2 text-right">Students</th>
                            <th className="px-3 py-2 text-right">Defaulters</th>
                            <th className="px-3 py-2 text-left">Outstanding</th>
                            <th className="px-3 py-2 text-right">Recovery</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classes.map((c) => (
                            <tr key={c.className} className="border-b border-slate-100">
                              <td className="px-3 py-1.5 font-medium text-slate-800">{c.className}</td>
                              <td className="px-3 py-1.5 text-right">{c.activeStudents}</td>
                              <td className="px-3 py-1.5 text-right">{c.defaulterStudents}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-rose-400"
                                      style={{ width: `${(c.outstanding / maxClassOutstanding) * 100}%` }}
                                    />
                                  </div>
                                  <span>{money(c.outstanding)}</span>
                                </div>
                              </td>
                              <td
                                className={`px-3 py-1.5 text-right font-medium ${
                                  c.recoveryPercent >= 90 ? 'text-emerald-600' : c.recoveryPercent >= 75 ? 'text-amber-600' : 'text-rose-600'
                                }`}
                              >
                                {pct(c.recoveryPercent)}
                              </td>
                            </tr>
                          ))}
                          {classes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-slate-400">No outstanding fee.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </Panel>

                  <Panel
                    title="Top defaulter families"
                    subtitle="Highest outstanding balances"
                    action={
                      canOpenReports ? (
                        <div className="flex gap-3">
                          <DrillLink to={reportLink('family-receivable')}>All families</DrillLink>
                          <DrillLink to={reportLink('chronic-defaulters')}>Chronic defaulters</DrillLink>
                        </div>
                      ) : null
                    }
                  >
                    <div className="max-h-[26rem] overflow-auto">
                      <table className="w-full text-[13px] leading-snug">
                        <thead className="sticky top-0 bg-[var(--campus-primary)] text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Family</th>
                            <th className="px-3 py-2 text-right">Outstanding</th>
                            <th className="px-3 py-2 text-right">Months</th>
                            <th className="px-3 py-2 text-right">Last paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.topFamilies || []).map((f) => (
                            <tr key={f.familyCode} className="border-b border-slate-100 align-top">
                              <td className="px-3 py-1.5">
                                <p className="font-medium text-slate-800">
                                  {f.fatherName || `Family ${f.familyCode}`}
                                  <span className="ml-1 text-xs font-normal text-slate-400">#{f.familyCode}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                  {f.students}
                                  {f.fatherMobile ? ` · ${f.fatherMobile}` : ''}
                                </p>
                              </td>
                              <td className="px-3 py-1.5 text-right font-semibold text-rose-600">{money(f.outstanding)}</td>
                              <td className="px-3 py-1.5 text-right">{f.tuitionMonthsPending}</td>
                              <td className="px-3 py-1.5 text-right text-slate-500">
                                {f.lastReceiptDate ? formatReportPrintDate(f.lastReceiptDate) : 'Never'}
                              </td>
                            </tr>
                          ))}
                          {(data.topFamilies || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-slate-400">No defaulter families.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </div>

                <div className={`grid grid-cols-1 gap-4 ${canOpenProfitLoss ? 'xl:grid-cols-2' : ''}`}>
                  <Panel
                    title="Expenses: this month vs last month"
                    action={canOpenProfitLoss ? <DrillLink to="/campus/reports/income">Profit Loss Statement</DrillLink> : null}
                  >
                    <div className="max-h-[22rem] overflow-auto">
                      <table className="w-full text-[13px] leading-snug">
                        <thead className="sticky top-0 bg-[var(--campus-primary)] text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Expense head</th>
                            <th className="px-3 py-2 text-right">This month</th>
                            <th className="px-3 py-2 text-right">Last month</th>
                            <th className="px-3 py-2 text-right">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.expenseHeads || []).map((h) => {
                            const diff = h.currentMonth - h.previousMonth
                            return (
                              <tr key={h.headName} className="border-b border-slate-100">
                                <td className="px-3 py-1.5 font-medium text-slate-800">{h.headName}</td>
                                <td className="px-3 py-1.5 text-right">{money(h.currentMonth)}</td>
                                <td className="px-3 py-1.5 text-right text-slate-500">{money(h.previousMonth)}</td>
                                <td className={`px-3 py-1.5 text-right ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  <span className="inline-flex items-center gap-0.5">
                                    {diff > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : diff < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                                    {money(Math.abs(diff))}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                          {(data.expenseHeads || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-slate-400">No expenses recorded.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </Panel>

                  {canOpenProfitLoss ? (
                  <Panel
                    title="Monthly summary"
                    action={canOpenReports ? <DrillLink to={reportLink('collection-trend')}>Collection trend</DrillLink> : null}
                  >
                    <div className="max-h-[22rem] overflow-auto">
                      <table className="w-full text-[13px] leading-snug">
                        <thead className="sticky top-0 bg-[var(--campus-primary)] text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Month</th>
                            <th className="px-3 py-2 text-right">Collected</th>
                            <th className="px-3 py-2 text-right">Expenses</th>
                            <th className="px-3 py-2 text-right">Profit</th>
                            <th className="px-3 py-2 text-right">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...trend].reverse().map((t) => (
                            <tr key={`${t.year}-${t.month}`} className="border-b border-slate-100">
                              <td className="px-3 py-1.5 font-medium text-slate-800">{t.label}</td>
                              <td className="px-3 py-1.5 text-right">{money(t.received)}</td>
                              <td className="px-3 py-1.5 text-right">{money(t.expenses)}</td>
                              <td className={`px-3 py-1.5 text-right font-medium ${t.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {money(t.netProfit)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-slate-500">{pct(t.marginPercent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {data ? (
            <div className="print-only print-sheet">
              <CampusReportPrintHeader title="FEE DASHBOARD" subtitle={data.monthLabel} />
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Collected today', rs(kpis.collectedToday)],
                    ['Collected this month', rs(kpis.collectedMtd)],
                    ['Collected last month (same date)', rs(kpis.collectedLastMonthSamePeriod)],
                    ['Collected this session', rs(kpis.collectedSession)],
                    ['Total outstanding', rs(kpis.totalOutstanding)],
                    ['Overall recovery', pct(kpis.overallRecoveryPercent)],
                    ["This month's tuition collected", `${pct(kpis.currentMonthCollectionRate)} (${rs(kpis.currentMonthTuitionRecovered)} of ${rs(kpis.currentMonthTuitionBilled)})`],
                    ['Defaulters', `${kpis.defaulterStudents} students / ${kpis.defaulterFamilies} families`],
                    ['Expenses this month', rs(kpis.expensesMtd)],
                    ['Net profit this month', canOpenProfitLoss ? rs(kpis.netProfitMtd) : '—'],
                    ['Projected month-end collection', rs(forecast.projectedMonthEndCollection)],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td style={{ textAlign: 'right' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {canOpenProfitLoss ? (
              <table className="legacy-print-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Tuition billed</th>
                    <th>Tuition collected</th>
                    <th>Fee collected</th>
                    <th>Expenses</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((t) => (
                    <tr key={`${t.year}-${t.month}`}>
                      <td>{t.label}</td>
                      <td style={{ textAlign: 'right' }}>{money(t.tuitionBilled)}</td>
                      <td style={{ textAlign: 'right' }}>{money(t.tuitionRecovered)}</td>
                      <td style={{ textAlign: 'right' }}>{money(t.received)}</td>
                      <td style={{ textAlign: 'right' }}>{money(t.expenses)}</td>
                      <td style={{ textAlign: 'right' }}>{money(t.netProfit)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>{money(trend.reduce((s, t) => s + t.tuitionBilled, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{money(trend.reduce((s, t) => s + t.tuitionRecovered, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{money(trend.reduce((s, t) => s + t.received, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{money(trend.reduce((s, t) => s + t.expenses, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{money(trend.reduce((s, t) => s + t.netProfit, 0))}</td>
                  </tr>
                </tbody>
              </table>
              ) : null}

              <table className="legacy-print-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Students</th>
                    <th>Defaulters</th>
                    <th>Outstanding</th>
                    <th>Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.className}>
                      <td>{c.className}</td>
                      <td style={{ textAlign: 'right' }}>{c.activeStudents}</td>
                      <td style={{ textAlign: 'right' }}>{c.defaulterStudents}</td>
                      <td style={{ textAlign: 'right' }}>{money(c.outstanding)}</td>
                      <td style={{ textAlign: 'right' }}>{pct(c.recoveryPercent)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>{classes.reduce((s, c) => s + c.activeStudents, 0)}</td>
                    <td style={{ textAlign: 'right' }}>{classes.reduce((s, c) => s + c.defaulterStudents, 0)}</td>
                    <td style={{ textAlign: 'right' }}>{money(classes.reduce((s, c) => s + c.outstanding, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{pct(kpis.overallRecoveryPercent)}</td>
                  </tr>
                </tbody>
              </table>

              <table className="legacy-print-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Family</th>
                    <th>Children</th>
                    <th>Outstanding</th>
                    <th>Months pending</th>
                    <th>Last paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topFamilies || []).map((f) => (
                    <tr key={f.familyCode}>
                      <td>
                        {f.fatherName || `Family ${f.familyCode}`} (#{f.familyCode}) — {f.students}
                      </td>
                      <td style={{ textAlign: 'right' }}>{f.children}</td>
                      <td style={{ textAlign: 'right' }}>{money(f.outstanding)}</td>
                      <td style={{ textAlign: 'right' }}>{f.tuitionMonthsPending}</td>
                      <td>{f.lastReceiptDate ? formatReportPrintDate(f.lastReceiptDate) : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="legacy-print-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Expense head</th>
                    <th>This month</th>
                    <th>Last month</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.expenseHeads || []).map((h) => (
                    <tr key={h.headName}>
                      <td>{h.headName}</td>
                      <td style={{ textAlign: 'right' }}>{money(h.currentMonth)}</td>
                      <td style={{ textAlign: 'right' }}>{money(h.previousMonth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </CampusShell>
    </div>
  )
}

export default FeeDashboardPage

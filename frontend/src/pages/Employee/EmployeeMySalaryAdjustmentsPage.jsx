import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gift,
  HandCoins,
  Loader2,
  MinusCircle,
  RefreshCw,
  Shield,
} from 'lucide-react'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import {
  BALANCE_KPI_SALARY_COMPONENT_TYPES,
  EDITABLE_SALARY_COMPONENT_TYPES,
  getPakistanYearMonth,
  isSalaryComponentPeriodSettled,
  KPI_SALARY_COMPONENT_TYPES,
  MONTH_OPTIONS,
  SALARY_COMPONENT_TYPES,
} from '../../constants/salaryComponents'
import {
  getMyEmployeeSalaryComponents,
  getMyEmployeeSalaryPeriodStatus,
} from '../../services/employeeSalaryComponentService'

const TYPE_META = {
  [SALARY_COMPONENT_TYPES.Loan]: {
    label: 'Loan',
    icon: HandCoins,
    iconWrap: 'bg-sky-600 text-white',
    card: 'border-sky-200/80 bg-white',
  },
  [SALARY_COMPONENT_TYPES.SecurityCharges]: {
    label: 'Security',
    icon: Shield,
    iconWrap: 'bg-violet-600 text-white',
    card: 'border-violet-200/80 bg-white',
  },
  [SALARY_COMPONENT_TYPES.Bonus]: {
    label: 'Bonus',
    icon: Gift,
    iconWrap: 'bg-emerald-600 text-white',
    card: 'border-emerald-200/80 bg-white',
    barTrack: 'bg-emerald-100',
    bar: 'bg-emerald-500',
  },
}

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

const shiftMonth = (year, month, delta) => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

const completenessTone = (paidPct) => {
  if (paidPct >= 75) {
    return {
      bar: 'bg-emerald-500',
      track: 'bg-emerald-100',
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    }
  }
  if (paidPct >= 50) {
    return {
      bar: 'bg-amber-400',
      track: 'bg-amber-100',
      pill: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    }
  }
  if (paidPct >= 25) {
    return {
      bar: 'bg-orange-500',
      track: 'bg-orange-100',
      pill: 'bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200',
    }
  }
  return {
    bar: 'bg-rose-500',
    track: 'bg-rose-100',
    pill: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  }
}

const entryStatusMeta = (componentType, month, year) => {
  if (componentType === SALARY_COMPONENT_TYPES.Bonus) {
    return {
      label: 'Awarded',
      Icon: Award,
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    }
  }

  if (isSalaryComponentPeriodSettled(month, year)) {
    return {
      label: 'Deducted',
      Icon: MinusCircle,
      className: 'bg-purple-50 text-purple-700 ring-purple-200',
    }
  }

  return {
    label: 'To be paid',
    Icon: Clock3,
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  }
}

function EmployeeMySalaryAdjustmentsPage() {
  const current = useMemo(() => getPakistanYearMonth(), [])
  const employeeName = localStorage.getItem('employeeName') || 'You'
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [rows, setRows] = useState([])
  const [periodStatus, setPeriodStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const canGoNext = year < current.year || (year === current.year && month < current.month)

  const periodLabel = useMemo(
    () => `${MONTH_OPTIONS.find((m) => m.value === month)?.label || month} ${year}`,
    [month, year],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [components, status] = await Promise.all([
        getMyEmployeeSalaryComponents(),
        getMyEmployeeSalaryPeriodStatus({ month, year }),
      ])
      setRows(Array.isArray(components) ? components : [])
      setPeriodStatus(status || null)
    } catch (err) {
      setRows([])
      setPeriodStatus(null)
      setError(err?.response?.data?.message || 'Unable to load your security and loan details.')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  const periodRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          Number(row.month) === Number(month) &&
          Number(row.year) === Number(year) &&
          EDITABLE_SALARY_COMPONENT_TYPES.includes(row.componentType) &&
          Number(row.amount) !== 0,
      ),
    [rows, month, year],
  )

  const kpiStats = useMemo(() => {
    const stats = Object.fromEntries(
      KPI_SALARY_COMPONENT_TYPES.map((type) => [type, { total: 0, remaining: 0, paid: 0 }]),
    )

    for (const row of rows) {
      const type = row.componentType
      if (!stats[type]) continue
      const amount = Number(row.amount) || 0
      stats[type].total += amount

      if (!BALANCE_KPI_SALARY_COMPONENT_TYPES.includes(type)) continue

      if (isSalaryComponentPeriodSettled(row.month, row.year)) {
        stats[type].paid += amount
      } else {
        stats[type].remaining += amount
      }
    }

    return stats
  }, [rows])

  const goPrev = () => {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }

  const goNext = () => {
    if (!canGoNext) return
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }

  const basicSalary = periodStatus?.basicSalary

  return (
    <EmployeeLayout
      title="Security and Loan"
      subtitle="Balances and this month’s entries"
      showProfileCard={false}
      compactContentTop
    >
      <div className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <EmployeeBackButton />
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="emp-cta-btn emp-cta-btn-tonal shrink-0"
            aria-label="Refresh security and loan"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <section className="emp-surface rounded-2xl p-4">
          <p className="text-sm font-semibold text-[var(--emp-text)]">
            {employeeName}
            {String(employeeName).toLowerCase().endsWith('s') ? "'" : "'s"} adjustments
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="emp-icon-btn"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold text-[var(--emp-text)]">{periodLabel}</p>
              <p className="text-[11px] text-[var(--emp-text-muted)]">
                {periodStatus?.isCurrentMonth
                  ? 'Current month'
                  : periodStatus?.isFutureMonth
                    ? 'Upcoming month'
                    : 'Past month'}
              </p>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="emp-icon-btn disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {error && !isLoading ? (
          <p className="emp-surface rounded-2xl px-4 py-3 text-sm text-[var(--emp-danger)]">{error}</p>
        ) : null}

        {isLoading ? (
          <div className="grid gap-2.5" aria-busy="true" aria-label="Loading balances">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="overflow-hidden rounded-2xl border border-[var(--emp-border)] bg-[var(--emp-surface)]"
              >
                <div className="flex items-center gap-3 px-3.5 py-4">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-[var(--emp-radius-btn)] bg-[var(--emp-bg)]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-[var(--emp-bg)]" />
                    <div className="h-7 w-32 animate-pulse rounded bg-[var(--emp-bg)]" />
                    <div className="h-3 w-40 animate-pulse rounded bg-[var(--emp-bg)]" />
                  </div>
                </div>
                <div className="h-2 w-full animate-pulse bg-[var(--emp-bg)]" />
              </div>
            ))}
          </div>
        ) : (
        <div className="grid gap-2.5">
          {KPI_SALARY_COMPONENT_TYPES.map((type) => {
            const meta = TYPE_META[type]
            const Icon = meta.icon
            const { total, remaining, paid } = kpiStats[type]
            if (
              (type === SALARY_COMPONENT_TYPES.Bonus || type === SALARY_COMPONENT_TYPES.Loan) &&
              total === 0
            ) {
              return null
            }
            const isBalance = BALANCE_KPI_SALARY_COMPONENT_TYPES.includes(type)
            const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const tone = completenessTone(paidPct)

            return (
              <div key={type} className={`overflow-hidden rounded-2xl border shadow-sm ${meta.card}`}>
                <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-3">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-md ${meta.iconWrap}`}
                  >
                    <Icon size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-700">{meta.label}</p>
                      {isBalance && total > 0 ? (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone.pill}`}
                        >
                          {paidPct}% cleared
                        </span>
                      ) : null}
                    </div>

                    {isBalance ? (
                      <>
                        <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">
                          {formatAmount(remaining)}
                          <span className="ml-1 text-[12px] font-semibold text-slate-500">left</span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-slate-600">
                          <span>
                            <span className="font-semibold text-emerald-700">{formatAmount(paid)}</span>
                            <span className="text-slate-400"> paid</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            <span className="font-semibold text-slate-800">{formatAmount(total)}</span>
                            <span className="text-slate-400"> total</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">
                          {formatAmount(total)}
                        </p>
                        <p className="mt-1.5 text-[12px] text-slate-500">All-time bonus given</p>
                      </>
                    )}
                  </div>
                </div>
                <div className={`h-2 w-full ${isBalance ? tone.track : meta.barTrack || 'bg-slate-100'}`}>
                  {isBalance ? (
                    <div
                      className={`h-full ${tone.bar} transition-[width] duration-300`}
                      style={{ width: `${total > 0 ? paidPct : 0}%` }}
                    />
                  ) : (
                    <div
                      className={`h-full ${meta.bar || 'bg-emerald-500'}`}
                      style={{ width: total > 0 ? '100%' : '0%' }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}

        <section className="emp-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[var(--emp-text)]">
              {periodStatus?.isCurrentMonth ? 'Current basic salary' : 'Month basic salary'}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--emp-text-muted)]">{periodLabel}</p>
          </div>
          {isLoading ? (
            <span className="inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-[var(--emp-radius-btn)] bg-[var(--emp-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--emp-text-muted)]">
              <Loader2 size={14} className="animate-spin text-[var(--emp-primary)]" />
              …
            </span>
          ) : (
            <span className="inline-flex rounded-[var(--emp-radius-btn)] bg-emerald-600 px-3 py-1 text-sm font-semibold tabular-nums text-white">
              {basicSalary != null && basicSalary !== '' ? formatAmount(basicSalary) : '—'}
            </span>
          )}
        </section>

        <section className="emp-surface overflow-hidden rounded-2xl" aria-busy={isLoading}>
          <div className="border-b border-[var(--emp-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--emp-text)]">This month&apos;s entries</h2>
            <p className="text-[11px] text-[var(--emp-text-muted)]">
              {isLoading
                ? `${periodLabel} · Loading…`
                : `${periodLabel} · ${periodRows.length} of ${EDITABLE_SALARY_COMPONENT_TYPES.length} types`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center gap-2 px-4 py-10 text-sm text-[var(--emp-text-muted)]">
              <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" />
              Loading entries…
            </div>
          ) : periodRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--emp-text-muted)]">
              No loan, security, or other adjustments for {periodLabel}.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--emp-border)]">
              {periodRows.map((row) => {
                const meta = TYPE_META[row.componentType] || {
                  label: row.componentType,
                  icon: HandCoins,
                  iconWrap: 'bg-slate-500 text-white',
                }
                const Icon = meta.icon
                const status = entryStatusMeta(row.componentType, row.month, row.year)
                const StatusIcon = status.Icon

                return (
                  <li key={row.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.iconWrap}`}
                    >
                      <Icon size={18} strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--emp-text)]">{meta.label}</p>
                          {row.description ? (
                            <p className="mt-0.5 truncate text-xs text-[var(--emp-text-muted)]">
                              {row.description}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-[var(--emp-text)]">
                          {formatAmount(row.amount)}
                        </p>
                      </div>
                      <span
                        className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.className}`}
                      >
                        <StatusIcon size={12} strokeWidth={2.5} />
                        {status.label}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeMySalaryAdjustmentsPage

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarRange,
  Handshake,
  History,
  Layers,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  Scale,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import {
  closeRoyaltyShareMonth,
  getRoyaltyShareHistory,
  getRoyaltyShareMeta,
  getRoyaltyShareMonth,
} from '../../../services/royaltyShareService'
import { hasCampusPermission, isCampusSuperAdmin } from '../../../services/authService'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function parseTodayParts() {
  const iso = getPakistanTodayIso()
  const [y, m] = iso.split('-').map(Number)
  return { year: y, month: m }
}

function buildYearOptions(historyRows) {
  const current = parseTodayParts().year
  const { feeYears } = getCampusPrintMeta()
  const years = new Set([current, current - 1, current + 1])

  if (Array.isArray(feeYears)) {
    feeYears.forEach((y) => {
      const n = Number(y)
      if (Number.isFinite(n)) years.add(n)
    })
  }

  ;(historyRows || []).forEach((row) => {
    const y = Number(row.calendarYear)
    if (Number.isFinite(y)) years.add(y)
  })

  return [...years]
    .filter((y) => y >= 2000 && y <= 2100)
    .sort((a, b) => b - a)
}

function monthLabel(year, month) {
  if (!year || !month) return '—'
  const name = MONTH_NAMES[month - 1]
  return name ? `${name} ${year}` : `${month}/${year}`
}

function formatClosedAt(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapMonthDto(raw) {
  if (!raw) return null
  return {
    calendarYear: raw.calendarYear ?? raw.CalendarYear,
    calendarMonth: raw.calendarMonth ?? raw.CalendarMonth,
    isClosed: Boolean(raw.isClosed ?? raw.IsClosed),
    totalFeeCollected: Number(raw.totalFeeCollected ?? raw.TotalFeeCollected ?? 0),
    royaltySharePercent: Number(raw.royaltySharePercent ?? raw.RoyaltySharePercent ?? 0),
    royaltyAmount: Number(raw.royaltyAmount ?? raw.RoyaltyAmount ?? 0),
    voucherNo: raw.voucherNo ?? raw.VoucherNo ?? null,
    closedByUserName: raw.closedByUserName ?? raw.ClosedByUserName ?? null,
    closedAtPkt: raw.closedAtPkt ?? raw.ClosedAtPkt ?? null,
    campusLabel: raw.campusLabel ?? raw.CampusLabel ?? null,
    schoolName: raw.schoolName ?? raw.SchoolName ?? null,
    fundBreakdown: mapFundBreakdown(raw.fundBreakdown ?? raw.FundBreakdown),
  }
}

function mapFundBreakdown(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((line) => ({
    fundTypeId: line.fundTypeId ?? line.FundTypeId ?? 0,
    fundTypeName: line.fundTypeName ?? line.FundTypeName ?? 'Fee',
    collected: Number(line.collected ?? line.Collected ?? 0),
    royaltyShare: Number(line.royaltyShare ?? line.RoyaltyShare ?? 0),
  }))
}

function mapHistoryItem(raw) {
  return {
    id: raw.id ?? raw.Id,
    calendarYear: raw.calendarYear ?? raw.CalendarYear,
    calendarMonth: raw.calendarMonth ?? raw.CalendarMonth,
    totalFeeCollected: Number(raw.totalFeeCollected ?? raw.TotalFeeCollected ?? 0),
    royaltySharePercent: Number(raw.royaltySharePercent ?? raw.RoyaltySharePercent ?? 0),
    royaltyAmount: Number(raw.royaltyAmount ?? raw.RoyaltyAmount ?? 0),
    voucherNo: raw.voucherNo ?? raw.VoucherNo ?? null,
    closedByUserName: raw.closedByUserName ?? raw.ClosedByUserName ?? null,
    closedAtPkt: raw.closedAtPkt ?? raw.ClosedAtPkt ?? null,
  }
}

export default function CampusRoyaltyShareReportPage() {
  const navigate = useNavigate()
  const canView = hasCampusPermission('rpt_fee')
  const isSuperAdmin = isCampusSuperAdmin()

  const initial = parseTodayParts()
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [bootStatus, setBootStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')

  const yearOptions = useMemo(() => buildYearOptions(history), [history])

  useEffect(() => {
    if (yearOptions.length === 0) return
    if (!yearOptions.includes(year)) setYear(yearOptions[0])
  }, [year, yearOptions])

  useEffect(() => {
    if (!canView) {
      setBootStatus('denied')
      return
    }

    let cancelled = false
    setBootStatus('loading')
    getRoyaltyShareMeta()
      .then((meta) => {
        if (cancelled) return
        setBootStatus(meta?.isFranchise ? 'ready' : 'denied')
      })
      .catch(() => {
        if (!cancelled) setBootStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [canView])

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [monthData, historyData] = await Promise.all([
        getRoyaltyShareMonth(year, month),
        getRoyaltyShareHistory(24),
      ])
      setReport(mapMonthDto(monthData))
      setHistory((historyData || []).map(mapHistoryItem))
    } catch (error) {
      const message = error?.response?.data?.message || 'Could not load royalty share report.'
      setLoadError(message)
      toast.error(message)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    if (bootStatus === 'ready') load()
  }, [bootStatus, load])

  const isBeforeMonthEnd = useMemo(() => {
    const today = parseTodayParts()
    if (year > today.year) return true
    if (year === today.year && month > today.month) return true
    if (year === today.year && month === today.month) {
      const lastDay = new Date(year, month, 0).getDate()
      const todayIso = getPakistanTodayIso()
      const day = Number(todayIso.split('-')[2])
      return day < lastDay
    }
    return false
  }, [year, month])

  const handlePrint = () => {
    if (!report) return
    window.print()
  }

  const subtitle = monthLabel(year, month)
  const printSubtitle = report?.isClosed
    ? subtitle
    : `${subtitle} — draft (month not closed)`

  const confirmClose = async () => {
    setIsClosing(true)
    const toastId = 'royalty-close'
    toast.loading('Closing month...', { id: toastId })
    try {
      const result = await closeRoyaltyShareMonth(year, month)
      setReport(mapMonthDto(result))
      setIsConfirmOpen(false)
      toast.success('Month closed and voucher posted.', { id: toastId })
      const historyData = await getRoyaltyShareHistory(24)
      setHistory((historyData || []).map(mapHistoryItem))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not close month.', { id: toastId })
    } finally {
      setIsClosing(false)
    }
  }

  const percentLabel =
    report?.royaltySharePercent != null ? `${report.royaltySharePercent}%` : '—'
  const royaltyColumnLabel = percentLabel === '—' ? 'Royalty' : `Royalty (${percentLabel})`

  const bootMessage =
    bootStatus === 'denied'
      ? 'Royalty share reporting is not enabled for this campus.'
      : bootStatus === 'error'
        ? 'Could not load royalty share settings. Check that the API is running and try again.'
        : ''

  return (
    <>
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        headerContext="Accounts"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          {bootStatus === 'loading' ? (
            <div className="no-print flex min-h-[40vh] items-center justify-center">
              <Loader2 className="animate-spin text-[var(--campus-primary)]" size={32} />
            </div>
          ) : bootMessage ? (
            <div className="no-print mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-slate-600">{bootMessage}</p>
              {!canView ? (
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-[var(--campus-primary)]"
                  onClick={() => navigate('/campus/dashboard')}
                >
                  Back to dashboard
                </button>
              ) : null}
            </div>
          ) : (
          <div className="no-print mx-auto max-w-5xl space-y-4">
            {loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {loadError}
              </div>
            ) : null}
            <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                    <Handshake size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Royalty Share</h1>
                    <p className="text-sm text-slate-500">
                      Revenue-share royalty on fee collections for the calendar month, at the agreed
                      percentage.
                    </p>
                  </div>
                </div>
                {report?.isClosed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Lock size={12} /> Closed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    <RefreshCw size={12} /> Open
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <label className="block md:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Month</span>
                  <select
                    className={inputClass}
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Year</span>
                  <select
                    className={inputClass}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end gap-2 md:col-span-5">
                  <button
                    type="button"
                    className="btn-campus-primary inline-flex h-10 items-center gap-2 px-4 text-sm"
                    onClick={() => load()}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                  </button>
                  {report ? (
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={handlePrint}
                      disabled={isLoading}
                    >
                      <Printer size={16} />
                      Print for signatures
                    </button>
                  ) : null}
                </div>
              </div>

              {isBeforeMonthEnd && !report?.isClosed ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This month is still in progress. You can review totals anytime; closing is usually done at month end.
                </p>
              ) : null}
            </section>

            {isLoading ? (
              <div className="flex justify-center py-12 text-slate-500">
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : report ? (
              <>
                <section className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <CalendarRange size={14} />
                      Total fee collected
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">
                      {formatReportPrintMoney(report.totalFeeCollected)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Scale size={14} />
                      Royalty rate
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{percentLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Royalty amount
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-900">
                      {formatReportPrintMoney(report.royaltyAmount)}
                    </p>
                  </div>
                </section>

                {report.fundBreakdown?.length > 0 ? (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Layers size={16} className="text-[var(--campus-primary)]" />
                        Collection by fund type
                      </div>
                      <p className="text-xs text-slate-500">
                        Receipts in {subtitle} · {royaltyColumnLabel}
                      </p>
                    </div>
                    <table className="w-full text-[13px] leading-snug">
                      <thead>
                        <tr className="bg-[#405189] text-left text-white">
                          <th className="px-3 py-2 font-semibold">Fund type</th>
                          <th className="px-3 py-2 text-right font-semibold">Collected</th>
                          <th className="px-3 py-2 text-right font-semibold">{royaltyColumnLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.fundBreakdown.map((line) => (
                          <tr key={line.fundTypeId} className="border-b border-slate-100">
                            <td className="px-3 py-1.5 text-slate-800">{line.fundTypeName}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                              {formatReportPrintMoney(line.collected)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums font-medium text-indigo-900">
                              {formatReportPrintMoney(line.royaltyShare)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-semibold text-slate-800">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatReportPrintMoney(report.totalFeeCollected)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-indigo-900">
                            {formatReportPrintMoney(report.royaltyAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                ) : null}
              </>
            ) : null}

            {report?.isClosed ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                <p>
                  <span className="font-medium text-slate-800">Voucher:</span>{' '}
                  {report.voucherNo || '—'}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-800">Closed by:</span>{' '}
                  {report.closedByUserName || '—'} · {formatClosedAt(report.closedAtPkt)}
                </p>
              </section>
            ) : null}

            {!report?.isClosed && isSuperAdmin && report ? (
              <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                      <Lock size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Month-end closing</p>
                      <p className="mt-0.5 max-w-xl text-sm text-slate-600">
                        Locks {subtitle}, posts the royalty share expense voucher, and records the
                        accrual. Print the statement for authorized signatures if required.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={isClosing || report.royaltyAmount <= 0}
                  >
                    <Lock size={16} />
                    Close {subtitle}
                  </button>
                </div>
              </section>
            ) : null}

            {history.length > 0 ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <History size={16} />
                  Closed months
                </div>
                <table className="w-full text-[13px] leading-snug">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-3 py-2 font-semibold">Period</th>
                      <th className="px-3 py-2 font-semibold">Fee collected</th>
                      <th className="px-3 py-2 font-semibold">Royalty</th>
                      <th className="px-3 py-2 font-semibold">Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-3 py-1.5">{monthLabel(row.calendarYear, row.calendarMonth)}</td>
                        <td className="px-3 py-1.5">{formatReportPrintMoney(row.totalFeeCollected)}</td>
                        <td className="px-3 py-1.5">{formatReportPrintMoney(row.royaltyAmount)}</td>
                        <td className="px-3 py-1.5">{row.voucherNo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
          </div>
          )}

          <div className="print-only print-sheet">
            <CampusReportPrintHeader
              title="ROYALTY SHARE STATEMENT"
              subtitle={printSubtitle}
              showSession={false}
            />
            {!report?.isClosed ? (
              <p style={{ fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
                Draft — month not yet closed. Figures reflect receipts recorded to date.
              </p>
            ) : null}
            <table className="legacy-print-table">
              <thead>
                <tr>
                  <th>Fund type</th>
                  <th style={{ textAlign: 'right' }}>Collected (PKR)</th>
                  <th style={{ textAlign: 'right' }}>{royaltyColumnLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(report?.fundBreakdown ?? []).map((line) => (
                  <tr key={`print-${line.fundTypeId}`}>
                    <td>{line.fundTypeName}</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.collected)}</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.royaltyShare)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatReportPrintMoney(report?.totalFeeCollected ?? 0)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatReportPrintMoney(report?.royaltyAmount ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="legacy-print-table" style={{ marginTop: 10 }}>
              <tbody>
                {report?.voucherNo ? (
                  <tr>
                    <td>Payment voucher (after close)</td>
                    <td style={{ textAlign: 'right' }}>{report.voucherNo}</td>
                  </tr>
                ) : null}
                {report?.closedByUserName ? (
                  <tr>
                    <td>Closed by</td>
                    <td style={{ textAlign: 'right' }}>
                      {report.closedByUserName} · {formatClosedAt(report.closedAtPkt)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <table className="legacy-print-table" style={{ marginTop: 24 }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', height: 72, verticalAlign: 'bottom' }}>
                    Campus — authorized signatory
                    <div style={{ borderTop: '1px solid #000', marginTop: 40, paddingTop: 4 }}>
                      Signature &amp; date
                    </div>
                  </td>
                  <td style={{ width: '50%', height: 72, verticalAlign: 'bottom' }}>
                    Managing company — authorized signatory
                    <div style={{ borderTop: '1px solid #000', marginTop: 40, paddingTop: 4 }}>
                      Signature &amp; date
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CampusShell>

      {isConfirmOpen && bootStatus === 'ready' ? (
        <div className="no-print fixed inset-0 z-[200] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="royalty-close-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 id="royalty-close-title" className="text-lg font-bold text-slate-900">
                    Close {subtitle}?
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Review amounts before you continue.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isClosing}
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Fee collected
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formatReportPrintMoney(report?.totalFeeCollected ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                    {royaltyColumnLabel}
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-indigo-950">
                    {formatReportPrintMoney(report?.royaltyAmount ?? 0)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
                <p className="font-semibold">This cannot be undone.</p>
                <p className="mt-1 text-amber-800/90">
                  A cash payment voucher will be posted to the royalty share expense account. This
                  month will be locked on this screen.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isClosing}
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClosing}
                onClick={() => void confirmClose()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isClosing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Confirm &amp; close month
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

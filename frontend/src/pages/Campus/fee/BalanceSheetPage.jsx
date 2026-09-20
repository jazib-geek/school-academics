import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Printer } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusFundTypes } from '../../../services/authService'
import { getBalanceSheet } from '../../../services/feeReportService'
import { formatMonthYear, getCampusPrintMeta } from '../../../utils/campusProfile'

const PRINT_STYLES = `
  @page { size: A4 landscape; margin: 6mm; }
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
    }
    .legacy-print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 8px !important;
    }
    .legacy-print-table th,
    .legacy-print-table td {
      border: 1px solid #000 !important;
      padding: 2px 2px !important;
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
  }
  .print-only { display: none; }
`

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function resolveFundLabel(fundTypes, id, fallback) {
  const match = fundTypes.find((item) => Number(item.id) === Number(id))
  const name = String(match?.name || '').trim()
  return name || fallback
}

function BalanceSheetPage() {
  const { campusLabel, schoolName, logoSrc } = getCampusPrintMeta()
  const fundTypes = useMemo(() => getCampusFundTypes(), [])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getBalanceSheet()
      setReport(data)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        'Unable to load the balance sheet for this campus.'
      setError(message)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const prevLabel = resolveFundLabel(
    fundTypes,
    report?.prevFundTypeId ?? 4,
    'Prev',
  )
  const miscLabel = resolveFundLabel(
    fundTypes,
    report?.miscFundTypeId ?? 3,
    'Misc',
  )

  const months = report?.months || []
  const rows = report?.rows || []
  const totals = report?.totals || null
  const sessionLabel = report?.sessionLabel || ''
  const sessionRange = formatMonthYear(
    report?.sessionStartMonth,
    report?.sessionStartYear,
  )
  const sessionRangeEnd = formatMonthYear(
    report?.sessionEndMonth,
    report?.sessionEndYear,
  )

  const generatedDate = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const renderTable = (compact = false) => (
    <div className={compact ? '' : 'overflow-x-auto'}>
      <table
        className={
          compact
            ? 'legacy-print-table'
            : 'min-w-full border-collapse text-[13px] leading-snug'
        }
      >
        <thead>
          <tr className={compact ? undefined : 'bg-[#1e3a5f] text-white'}>
            <th className={compact ? undefined : 'px-3 py-2 text-left font-semibold'}>ID</th>
            <th className={compact ? undefined : 'px-3 py-2 text-left font-semibold'}>Student</th>
            <th className={compact ? undefined : 'px-3 py-2 text-left font-semibold'}>Class</th>
            <th className={compact ? undefined : 'px-3 py-2 text-center font-semibold'}>TF</th>
            {months.map((m) => (
              <th
                key={m.key || `${m.month}_${m.year}`}
                className={compact ? undefined : 'px-2 py-2 text-center font-semibold'}
                title={`${m.label} ${m.year}`}
              >
                {m.label}
              </th>
            ))}
            <th className={compact ? undefined : 'px-2 py-2 text-center font-semibold'}>{prevLabel}</th>
            <th className={compact ? undefined : 'px-2 py-2 text-center font-semibold'}>{miscLabel}</th>
            <th className={compact ? undefined : 'px-3 py-2 text-center font-semibold'}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.studentId}
              className={
                compact
                  ? undefined
                  : idx % 2 === 0
                    ? 'bg-white'
                    : 'bg-slate-50'
              }
            >
              <td className={compact ? undefined : 'px-3 py-1.5 text-center tabular-nums'}>
                {row.studentId}
              </td>
              <td className={compact ? undefined : 'px-3 py-1.5 uppercase'}>
                {row.studentName}
              </td>
              <td className={compact ? undefined : 'px-3 py-1.5'}>{row.className || '—'}</td>
              <td className={compact ? 'text-center' : 'px-2 py-1.5 text-center tabular-nums'}>
                {money(row.tuitionFee)}
              </td>
              {(row.monthBalances || []).map((bal, i) => (
                <td
                  key={`${row.studentId}-m-${i}`}
                  className={compact ? 'text-center' : 'px-2 py-1.5 text-center tabular-nums'}
                >
                  {money(bal)}
                </td>
              ))}
              <td className={compact ? 'text-center' : 'px-2 py-1.5 text-center tabular-nums'}>
                {money(row.prevBalance)}
              </td>
              <td className={compact ? 'text-center' : 'px-2 py-1.5 text-center tabular-nums'}>
                {money(row.miscBalance)}
              </td>
              <td
                className={
                  compact
                    ? 'text-center font-semibold'
                    : 'px-3 py-1.5 text-center font-semibold tabular-nums'
                }
              >
                {money(row.total)}
              </td>
            </tr>
          ))}
          {totals ? (
            <tr className={compact ? 'total-row' : 'bg-slate-200 font-bold'}>
              <td
                colSpan={3}
                className={compact ? 'text-center' : 'px-3 py-2 text-center'}
              >
                Total
              </td>
              <td className={compact ? 'text-center' : 'px-2 py-2 text-center tabular-nums'}>
                {money(totals.tuitionFee)}
              </td>
              {(totals.monthBalances || []).map((bal, i) => (
                <td
                  key={`tot-m-${i}`}
                  className={compact ? 'text-center' : 'px-2 py-2 text-center tabular-nums'}
                >
                  {money(bal)}
                </td>
              ))}
              <td className={compact ? 'text-center' : 'px-2 py-2 text-center tabular-nums'}>
                {money(totals.prevBalance)}
              </td>
              <td className={compact ? 'text-center' : 'px-2 py-2 text-center tabular-nums'}>
                {money(totals.miscBalance)}
              </td>
              <td className={compact ? 'text-center' : 'px-3 py-2 text-center tabular-nums'}>
                {money(totals.total)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{PRINT_STYLES}</style>
      <CampusShell
        headerContext="Balance sheet"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          {error ? (
            <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}{' '}
              <Link
                to="/campus/settings/profile"
                className="font-semibold underline underline-offset-2"
              >
                Institute Settings
              </Link>
            </div>
          ) : null}

          <section className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">
                  Balance Sheet
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Campus: <span className="font-medium text-slate-700">{campusLabel}</span>
                  {sessionLabel ? (
                    <>
                      {' · '}
                      Session {sessionLabel}
                      {sessionRange && sessionRangeEnd ? (
                        <>
                          {' · '}
                          {sessionRange} – {sessionRangeEnd}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={isLoading || !rows.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>

            {isLoading ? (
              <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading balance sheet…</span>
              </div>
            ) : !error && rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No outstanding balances for this session.
              </div>
            ) : rows.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {renderTable(false)}
              </div>
            ) : null}
          </section>

          {!isLoading && rows.length > 0 ? (
            <div className="print-only print-sheet">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 8,
                  borderBottom: '1px solid #000',
                  paddingBottom: 6,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <img
                    src={logoSrc}
                    alt=""
                    style={{ height: 40, width: 40, objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{schoolName}</div>
                    <div style={{ fontSize: 11 }}>{campusLabel}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>BALANCE SHEET</div>
                  <div>Session {sessionLabel}</div>
                  {sessionRange && sessionRangeEnd ? (
                    <div>
                      {sessionRange} – {sessionRangeEnd}
                    </div>
                  ) : null}
                  <div>Generated: {generatedDate}</div>
                </div>
              </div>
              {renderTable(true)}
            </div>
          ) : null}
        </div>
      </CampusShell>
    </div>
  )
}

export default BalanceSheetPage

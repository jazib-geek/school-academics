import { useCallback, useState } from 'react'
import { FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import { getAccountSummary } from '../../../services/accountService'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintDate,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function monthStartInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CampusAccountSummaryPage() {
  const [from, setFrom] = useState(monthStartInput())
  const [to, setTo] = useState(todayInput())
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const search = useCallback(
    async (event) => {
      event?.preventDefault?.()
      setIsLoading(true)
      try {
        setResult(await getAccountSummary({ from, to }))
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Could not load account summary.')
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    },
    [from, to],
  )

  const reset = () => {
    setFrom(monthStartInput())
    setTo(todayInput())
    setResult(null)
  }

  const printSubtitle = result
    ? `${formatReportPrintDate(result.from)} – ${formatReportPrintDate(result.to)}`
    : ''

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        headerContext="Accounts"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <form onSubmit={search} className="no-print space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Accounts Summary</h1>
                  <p className="text-sm text-slate-500">Account-wise received and payment totals.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!result}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-12">
              <input
                type="date"
                className={`${inputClass} md:col-span-3`}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className={`${inputClass} md:col-span-3`}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <div className="flex gap-2 md:col-span-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isLoading ? 'Loading...' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>

          <div className="no-print rounded-2xl bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                <span className="text-sm font-medium">Fetching summary...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px] leading-snug">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Account Code</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right">Payment</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!result || result.rows?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                          {result ? 'No activity in this period.' : 'Choose dates and apply.'}
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row, index) => (
                        <tr
                          key={`${row.accountId}-${row.account}-${index}`}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-3 py-1.5 tabular-nums">{row.accountId || '—'}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{row.account}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatReportPrintMoney(row.received)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatReportPrintMoney(row.payment)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {row.isFeeOverlay ? '—' : formatReportPrintMoney(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {result && result.rows?.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                        <td className="px-3 py-2" colSpan={2}>
                          Closing
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.totalReceived)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.totalPayment)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            )}
          </div>

          {result ? (
            <div className="print-only print-sheet print-area">
              <CampusReportPrintHeader title="ACCOUNT SUMMARY" subtitle={printSubtitle} />
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Account Code</th>
                    <th style={{ width: '34%', textAlign: 'left' }}>Account</th>
                    <th style={{ width: '16%' }}>Received</th>
                    <th style={{ width: '16%' }}>Payment</th>
                    <th style={{ width: '16%' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No activity in this period.
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row, index) => (
                      <tr key={`p-${row.accountId}-${row.account}-${index}`}>
                        <td style={{ textAlign: 'center' }}>{row.accountId || '—'}</td>
                        <td style={{ textAlign: 'left' }}>{row.account}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.received)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.payment)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {row.isFeeOverlay ? '—' : formatReportPrintMoney(row.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="total-row">
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      CLOSING
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.totalReceived)}</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.totalPayment)}</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.closingBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </CampusShell>
    </div>
  )
}

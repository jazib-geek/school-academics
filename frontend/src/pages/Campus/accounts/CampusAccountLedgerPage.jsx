import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { BookOpen, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import { getAccountLedger, getPostableAccounts } from '../../../services/accountService'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintDate,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '40px',
    borderRadius: '0.5rem',
  }),
  menu: (base) => ({ ...base, zIndex: 60 }),
}

function monthStartInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CampusAccountLedgerPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState(null)
  const [from, setFrom] = useState(monthStartInput())
  const [to, setTo] = useState(todayInput())
  const [result, setResult] = useState(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const options = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.accountId,
        label: `${a.accountTitle} (${a.accountId})`,
      })),
    [accounts],
  )

  useEffect(() => {
    ;(async () => {
      setIsLoadingAccounts(true)
      try {
        setAccounts(await getPostableAccounts(false))
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Could not load accounts.')
      } finally {
        setIsLoadingAccounts(false)
      }
    })()
  }, [])

  const search = useCallback(
    async (event) => {
      event?.preventDefault?.()
      if (!accountId) {
        toast.error('Select an account.')
        return
      }
      setIsLoading(true)
      try {
        setResult(await getAccountLedger({ accountId, from, to }))
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Could not load ledger.')
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    },
    [accountId, from, to],
  )

  const reset = () => {
    setAccountId(null)
    setFrom(monthStartInput())
    setTo(todayInput())
    setResult(null)
  }

  const printSubtitle = result
    ? `${result.accountTitle} (${result.accountId})  |  ${formatReportPrintDate(result.from)} – ${formatReportPrintDate(result.to)}`
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
                  <BookOpen size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Ledger Statement</h1>
                  <p className="text-sm text-slate-500">View account transactions for a date range.</p>
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
              <div className="md:col-span-5">
                <Select
                  options={options}
                  isLoading={isLoadingAccounts}
                  value={options.find((o) => o.value === accountId) || null}
                  onChange={(opt) => setAccountId(opt?.value || null)}
                  placeholder="Search account"
                  isClearable
                  styles={selectStyles}
                  className="text-sm"
                />
              </div>
              <input
                type="date"
                className={`${inputClass} md:col-span-2`}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className={`${inputClass} md:col-span-2`}
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
                <span className="text-sm font-medium">Fetching ledger...</span>
              </div>
            ) : (
              <>
                {result ? (
                  <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{result.accountTitle}</span>
                    <span className="ml-2 text-slate-500">({result.accountId})</span>
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Narration</th>
                        <th className="px-3 py-2 text-right">Received</th>
                        <th className="px-3 py-2 text-right">Payment</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!result || result.lines?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                            {result ? 'No transactions in this period.' : 'Choose filters and apply.'}
                          </td>
                        </tr>
                      ) : (
                        result.lines.map((line) => (
                          <tr key={line.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1.5 whitespace-nowrap">{formatReportPrintDate(line.date)}</td>
                            <td className="px-3 py-1.5">{line.narration || '—'}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(line.received)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(line.payment)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                              {formatReportPrintMoney(line.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {result && result.lines?.length > 0 ? (
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                          <td className="px-3 py-2" colSpan={2}>
                            Total
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
              </>
            )}
          </div>

          {result ? (
            <div className="print-only print-sheet print-area">
              <CampusReportPrintHeader title="ACCOUNT LEDGER" subtitle={printSubtitle} />
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '14%' }}>Date</th>
                    <th style={{ width: '38%', textAlign: 'left' }}>Narration</th>
                    <th style={{ width: '16%' }}>Received</th>
                    <th style={{ width: '16%' }}>Payment</th>
                    <th style={{ width: '16%' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.lines || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No transactions in this period.
                      </td>
                    </tr>
                  ) : (
                    result.lines.map((line) => (
                      <tr key={`p-${line.id}`}>
                        <td style={{ textAlign: 'center' }}>{formatReportPrintDate(line.date)}</td>
                        <td style={{ textAlign: 'left' }}>{line.narration || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.received)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.payment)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.balance)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="total-row">
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      TOTAL
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

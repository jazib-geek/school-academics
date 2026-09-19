import { useCallback, useState } from 'react'
import { FileBarChart, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint.js'
import { getStationeryExpenseReport } from '../../../services/stationeryService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthStartInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatQty(value) {
  const n = Number(value || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function CampusStationeryReportsPage() {
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!from || !to) {
      toast.error('Choose a start and end date.')
      return
    }
    setIsLoading(true)
    try {
      setReport(await getStationeryExpenseReport(from, to))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load report.')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [from, to])

  const printSubtitle = report
    ? `${formatDate(report.from)} to ${formatDate(report.to)}`
    : `${from} to ${to}`

  return (
    <CampusShell
      headerContext="Stationery report"
      rowClassName="print-main-wrap flex min-h-screen w-full"
      asideClassName="no-print"
      headerClassName="no-print"
    >
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <div className="print-content-wrap min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="no-print rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <FileBarChart size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Expense & lasting report</h1>
                  <p className="text-sm text-slate-500">What was bought, spend totals, and how long stock lasted.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  From
                  <input type="date" className={`${inputClass} mt-1 w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  To
                  <input type="date" className={`${inputClass} mt-1 w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Load report
                </button>
                <button
                  type="button"
                  disabled={!report}
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>
          </section>

          {report ? (
            <>
              <section className="no-print rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">
                  Period total spent:{' '}
                  <span className="text-lg font-bold text-slate-900">{formatReportPrintMoney(report.periodTotalSpent)}</span>
                </p>
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Purchases in period</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Items</th>
                      <th className="px-3 py-2 font-medium">Accounts ref.</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.purchases || []).map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(row.purchaseDate)}</td>
                        <td className="px-3 py-1.5">
                          {(row.lines || []).map((l) => (
                            <div key={l.id}>{l.itemName} · {formatQty(l.quantity)} × {formatReportPrintMoney(l.unitPrice)}</div>
                          ))}
                        </td>
                        <td className="px-3 py-1.5">{row.voucherNo || '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatReportPrintMoney(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.purchases || []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No purchases in this period.</p>
                ) : null}
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Spend by item</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Bought</th>
                      <th className="px-3 py-2 text-right font-medium">Spent</th>
                      <th className="px-3 py-2 text-right font-medium">Handed over</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.spendByItem || []).map((row) => (
                      <tr key={row.itemId} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-semibold">{row.itemName}</td>
                        <td className="px-3 py-1.5">{row.category}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(row.qtyBought)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(row.amountSpent)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(row.qtyHandedOver)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Stock lasting</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">On hand</th>
                      <th className="px-3 py-2 font-medium">Last bought</th>
                      <th className="px-3 py-2 text-right font-medium">Days since</th>
                      <th className="px-3 py-2 text-right font-medium">Last cycle (days)</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.stockLasting || []).map((row) => (
                      <tr key={row.itemId} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-semibold">{row.itemName}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${Number(row.onHandQty) <= 0 ? 'text-amber-700 font-semibold' : ''}`}>
                          {formatQty(row.onHandQty)}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.lastPurchaseDate
                            ? `${formatDate(row.lastPurchaseDate)} · ${formatQty(row.lastPurchaseQty)} · ${formatReportPrintMoney(row.lastPurchaseAmount)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.daysSinceLastPurchase ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.previousCycleDays ?? '—'}</td>
                        <td className="px-3 py-1.5 text-slate-600">{row.stockNote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <div className="print-only print-sheet">
                <CampusReportPrintHeader title="STATIONERY EXPENSE REPORT" subtitle={printSubtitle} />
                <p style={{ margin: '0 0 8px', fontSize: 11 }}>
                  Period total spent: <strong>{formatReportPrintMoney(report.periodTotalSpent)}</strong>
                </p>

                <h3 style={{ margin: '10px 0 4px', fontSize: 12 }}>Purchases</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Accounts ref.</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.purchases || []).map((row) => (
                      <tr key={`p-${row.id}`}>
                        <td>{formatDate(row.purchaseDate)}</td>
                        <td>
                          {(row.lines || []).map((l) => (
                            <div key={l.id}>{l.itemName} · {formatQty(l.quantity)} × {formatReportPrintMoney(l.unitPrice)}</div>
                          ))}
                        </td>
                        <td>{row.voucherNo || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.totalAmount)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>Total</td>
                      <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(report.periodTotalSpent)}</td>
                    </tr>
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>Spend by item</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Bought</th>
                      <th>Spent</th>
                      <th>Handed over</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.spendByItem || []).map((row) => (
                      <tr key={`s-${row.itemId}`}>
                        <td>{row.itemName}</td>
                        <td>{row.category}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.qtyBought)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.amountSpent)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.qtyHandedOver)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>Stock lasting</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>On hand</th>
                      <th>Last bought</th>
                      <th>Days since</th>
                      <th>Last cycle (days)</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.stockLasting || []).map((row) => (
                      <tr key={`l-${row.itemId}`}>
                        <td>{row.itemName}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.onHandQty)}</td>
                        <td>
                          {row.lastPurchaseDate
                            ? `${formatDate(row.lastPurchaseDate)} · ${formatQty(row.lastPurchaseQty)} · ${formatReportPrintMoney(row.lastPurchaseAmount)}`
                            : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>{row.daysSinceLastPurchase ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.previousCycleDays ?? '—'}</td>
                        <td>{row.stockNote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="no-print px-2 py-8 text-center text-sm text-slate-500">
              Choose dates and load the report.
            </p>
          )}
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusStationeryReportsPage

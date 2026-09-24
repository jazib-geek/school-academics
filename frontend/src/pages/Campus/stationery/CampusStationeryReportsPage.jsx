import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, FileBarChart, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint.js'
import { getStationeryExpenseReport } from '../../../services/stationeryService'

const STATIONERY_CONSUMPTION_PRINT_STYLES = `
  @media print {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    .stationery-consumption-item-table th,
    .stationery-consumption-item-table td {
      font-size: 9px !important;
      padding: 2px 4px !important;
      line-height: 1.25 !important;
    }
    .stationery-consumption-item-table thead th {
      font-size: 8px !important;
    }
    .stationery-consumption-item-table .stationery-print-num {
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
      text-align: right !important;
    }
    .stationery-consumption-item-table .stationery-print-text {
      text-align: left !important;
    }
    .stationery-consumption-category-table col.col-cat { width: 28%; }
    .stationery-consumption-category-table col.col-num { width: 14%; }
  }
`

function ItemTableColgroup({ withAction }) {
  return (
    <colgroup>
      <col style={{ width: withAction ? '20%' : '24%' }} />
      <col style={{ width: withAction ? '9%' : '10%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '6%' }} />
      {withAction ? <col style={{ width: '5%' }} /> : null}
    </colgroup>
  )
}

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

function percentOf(part, total) {
  const t = Number(total || 0)
  if (t <= 0) return '—'
  return `${((Number(part || 0) / t) * 100).toFixed(1)}%`
}

function CampusStationeryReportsPage() {
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPurchases, setShowPurchases] = useState(false)
  const [showStockLasting, setShowStockLasting] = useState(false)
  const [sortBy, setSortBy] = useState('spent')

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

  const itemRows = useMemo(() => {
    const rows = [...(report?.spendByItem || [])]
    if (sortBy === 'spent') {
      rows.sort((a, b) => Number(b.amountSpent) - Number(a.amountSpent))
    } else if (sortBy === 'consumed') {
      rows.sort((a, b) => Number(b.qtyHandedOver) - Number(a.qtyHandedOver))
    } else if (sortBy === 'name') {
      rows.sort((a, b) => String(a.itemName).localeCompare(String(b.itemName)))
    }
    return rows
  }, [report, sortBy])

  const categoryRows = useMemo(() => {
    const map = new Map()
    for (const row of report?.spendByItem || []) {
      const key = row.category || 'Uncategorized'
      const prev = map.get(key) || {
        category: key,
        amountSpent: 0,
        qtyHandedOver: 0,
        estimatedConsumptionValue: 0,
        itemCount: 0,
      }
      prev.amountSpent += Number(row.amountSpent || 0)
      prev.qtyHandedOver += Number(row.qtyHandedOver || 0)
      prev.estimatedConsumptionValue += Number(row.estimatedConsumptionValue || 0)
      prev.itemCount += 1
      map.set(key, prev)
    }
    return [...map.values()].sort((a, b) => b.amountSpent - a.amountSpent)
  }, [report])

  const printSubtitle = report
    ? `${formatDate(report.from)} to ${formatDate(report.to)}`
    : `${from} to ${to}`

  const totalSpent = Number(report?.periodTotalSpent || 0)

  return (
    <CampusShell
      headerContext="Stationery consumption report"
      rowClassName="print-main-wrap flex min-h-screen w-full"
      asideClassName="no-print"
      headerClassName="no-print"
    >
      <style>{`${CAMPUS_REPORT_PRINT_STYLES}${STATIONERY_CONSUMPTION_PRINT_STYLES}`}</style>
      <div className="print-content-wrap min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="no-print rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <FileBarChart size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Item consumption & spend</h1>
                  <p className="text-sm text-slate-500">
                    What you bought, what it cost, what was given out, and what is still on hand — all items in one view.
                  </p>
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
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white"
                >
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
              <section className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Spent in period', value: formatReportPrintMoney(report.periodTotalSpent) },
                  {
                    label: 'Given out in period',
                    value: formatQty(report.periodTotalHandedOverQty),
                    hint: 'Total units handed to staff',
                  },
                  {
                    label: 'Est. value of use',
                    value: formatReportPrintMoney(report.periodEstimatedConsumptionValue),
                    hint: 'Based on average unit cost',
                  },
                  {
                    label: 'Items in report',
                    value: String((report.spendByItem || []).length),
                    hint: 'With purchases or handovers',
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{card.value}</p>
                    {card.hint ? <p className="mt-1 text-xs text-slate-500">{card.hint}</p> : null}
                  </div>
                ))}
              </section>

              <section className="no-print overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">By item</h2>
                    <p className="text-xs text-slate-500">Spend, consumption, and stock for each item in the date range.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    Sort by
                    <select
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="spent">Highest spend</option>
                      <option value="consumed">Most given out</option>
                      <option value="name">Item name</option>
                    </select>
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-[13px] leading-snug">
                    <ItemTableColgroup withAction />
                    <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                      <tr>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Bought</th>
                        <th className="px-3 py-2 text-right font-medium">Avg price</th>
                        <th className="px-3 py-2 text-right font-medium">Spent</th>
                        <th className="px-3 py-2 text-right font-medium">% of spend</th>
                        <th className="px-3 py-2 text-right font-medium">Given out</th>
                        <th className="px-3 py-2 text-right font-medium">Est. use value</th>
                        <th className="px-3 py-2 text-right font-medium">On hand</th>
                        <th className="px-3 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row) => (
                        <tr key={row.itemId} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-semibold text-slate-800">
                            {row.itemName}
                            {row.unit ? <span className="ml-1 font-normal text-slate-500">({row.unit})</span> : null}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">{row.category || '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{formatQty(row.qtyBought)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                            {row.avgUnitPrice != null ? formatReportPrintMoney(row.avgUnitPrice) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap">
                            {formatReportPrintMoney(row.amountSpent)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap">
                            {percentOf(row.amountSpent, totalSpent)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{formatQty(row.qtyHandedOver)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                            {row.estimatedConsumptionValue > 0
                              ? formatReportPrintMoney(row.estimatedConsumptionValue)
                              : '—'}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right tabular-nums ${
                              Number(row.onHandQty) <= 0 ? 'font-semibold text-amber-700' : ''
                            }`}
                          >
                            {formatQty(row.onHandQty)}
                          </td>
                          <td className="px-3 py-1.5">
                            <Link
                              to={`/campus/stationery/history?itemId=${row.itemId}&from=${from}&to=${to}`}
                              className="text-xs font-medium text-[var(--campus-primary)] hover:underline"
                            >
                              History
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {itemRows.length > 0 ? (
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                        <tr>
                          <td className="px-3 py-2" colSpan={4}>Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatReportPrintMoney(totalSpent)}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatQty(report.periodTotalHandedOverQty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatReportPrintMoney(report.periodEstimatedConsumptionValue)}
                          </td>
                          <td className="px-3 py-2" colSpan={2} />
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                {itemRows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No purchases or handovers in this period.</p>
                ) : null}
              </section>

              <section className="no-print overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">By category</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Items</th>
                      <th className="px-3 py-2 text-right font-medium">Spent</th>
                      <th className="px-3 py-2 text-right font-medium">% of spend</th>
                      <th className="px-3 py-2 text-right font-medium">Given out</th>
                      <th className="px-3 py-2 text-right font-medium">Est. use value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((row) => (
                      <tr key={row.category} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-semibold">{row.category}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.itemCount}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(row.amountSpent)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{percentOf(row.amountSpent, totalSpent)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(row.qtyHandedOver)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatReportPrintMoney(row.estimatedConsumptionValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {categoryRows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No category breakdown for this period.</p>
                ) : null}
              </section>

              <section className="no-print rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-800"
                  onClick={() => setShowPurchases((v) => !v)}
                >
                  Purchase vouchers in period
                  {showPurchases ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showPurchases ? (
                  <table className="w-full border-t border-slate-100 text-left text-[13px] leading-snug">
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
                              <div key={l.id}>
                                {l.itemName} · {formatQty(l.quantity)} × {formatReportPrintMoney(l.unitPrice)}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-1.5">{row.voucherNo || '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                            {formatReportPrintMoney(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </section>

              <section className="no-print rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-800"
                  onClick={() => setShowStockLasting((v) => !v)}
                >
                  Restock timing (how long stock lasted)
                  {showStockLasting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showStockLasting ? (
                  <table className="w-full border-t border-slate-100 text-left text-[13px] leading-snug">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-700">
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
                          <td
                            className={`px-3 py-1.5 text-right tabular-nums ${
                              Number(row.onHandQty) <= 0 ? 'font-semibold text-amber-700' : ''
                            }`}
                          >
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
                ) : null}
              </section>

              <div className="print-only print-sheet">
                <CampusReportPrintHeader title="ITEM CONSUMPTION & SPEND" subtitle={printSubtitle} />
                <p style={{ margin: '0 0 8px', fontSize: 11 }}>
                  Spent: <strong>{formatReportPrintMoney(report.periodTotalSpent)}</strong>
                  {' · '}
                  Given out: <strong>{formatQty(report.periodTotalHandedOverQty)}</strong>
                  {' · '}
                  Est. value of use: <strong>{formatReportPrintMoney(report.periodEstimatedConsumptionValue)}</strong>
                </p>

                <h3 style={{ margin: '10px 0 4px', fontSize: 12 }}>By item</h3>
                <table className="legacy-print-table stationery-consumption-item-table">
                  <ItemTableColgroup withAction={false} />
                  <thead>
                    <tr>
                      <th className="stationery-print-text">Item</th>
                      <th className="stationery-print-text">Category</th>
                      <th className="stationery-print-num">Bought</th>
                      <th className="stationery-print-num">Avg price</th>
                      <th className="stationery-print-num">Spent</th>
                      <th className="stationery-print-num">%</th>
                      <th className="stationery-print-num">Out</th>
                      <th className="stationery-print-num">Est. use</th>
                      <th className="stationery-print-num">On hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((row) => (
                      <tr key={`s-${row.itemId}`}>
                        <td className="stationery-print-text">{row.itemName}</td>
                        <td className="stationery-print-text">{row.category}</td>
                        <td className="stationery-print-num">{formatQty(row.qtyBought)}</td>
                        <td className="stationery-print-num">
                          {row.avgUnitPrice != null ? formatReportPrintMoney(row.avgUnitPrice) : '—'}
                        </td>
                        <td className="stationery-print-num">{formatReportPrintMoney(row.amountSpent)}</td>
                        <td className="stationery-print-num">{percentOf(row.amountSpent, totalSpent)}</td>
                        <td className="stationery-print-num">{formatQty(row.qtyHandedOver)}</td>
                        <td className="stationery-print-num">
                          {row.estimatedConsumptionValue > 0
                            ? formatReportPrintMoney(row.estimatedConsumptionValue)
                            : '—'}
                        </td>
                        <td className="stationery-print-num">{formatQty(row.onHandQty)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4} className="stationery-print-text">Total</td>
                      <td className="stationery-print-num">{formatReportPrintMoney(totalSpent)}</td>
                      <td className="stationery-print-num">100%</td>
                      <td className="stationery-print-num">{formatQty(report.periodTotalHandedOverQty)}</td>
                      <td className="stationery-print-num">{formatReportPrintMoney(report.periodEstimatedConsumptionValue)}</td>
                      <td className="stationery-print-num" />
                    </tr>
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>By category</h3>
                <table className="legacy-print-table stationery-consumption-category-table">
                  <colgroup>
                    <col className="col-cat" />
                    <col className="col-num" />
                    <col className="col-num" />
                    <col className="col-num" />
                    <col className="col-num" />
                    <col className="col-num" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="stationery-print-text">Category</th>
                      <th className="stationery-print-num">Items</th>
                      <th className="stationery-print-num">Spent</th>
                      <th className="stationery-print-num">%</th>
                      <th className="stationery-print-num">Out</th>
                      <th className="stationery-print-num">Est. use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((row) => (
                      <tr key={`c-${row.category}`}>
                        <td className="stationery-print-text">{row.category}</td>
                        <td className="stationery-print-num">{row.itemCount}</td>
                        <td className="stationery-print-num">{formatReportPrintMoney(row.amountSpent)}</td>
                        <td className="stationery-print-num">{percentOf(row.amountSpent, totalSpent)}</td>
                        <td className="stationery-print-num">{formatQty(row.qtyHandedOver)}</td>
                        <td className="stationery-print-num">{formatReportPrintMoney(row.estimatedConsumptionValue)}</td>
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

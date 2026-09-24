import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Select from 'react-select'
import { FileSearch, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint.js'
import {
  getStationeryItemReport,
  getStationeryItems,
} from '../../../services/stationeryService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#cbd5e1', minWidth: '260px' }),
  menu: (base) => ({ ...base, zIndex: 100 }),
  menuPortal: (base) => ({ ...base, zIndex: 100 }),
}

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

function CampusStationeryItemReportPage() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [itemId, setItemId] = useState(() => {
    const id = Number(searchParams.get('itemId'))
    return Number.isFinite(id) && id > 0 ? id : null
  })
  const [from, setFrom] = useState(() => searchParams.get('from') || monthStartInputValue())
  const [to, setTo] = useState(() => searchParams.get('to') || todayInputValue())
  const [report, setReport] = useState(null)
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const itemOptions = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const cat = String(a.category || '').localeCompare(String(b.category || ''))
          if (cat !== 0) return cat
          return String(a.name || '').localeCompare(String(b.name || ''))
        })
        .map((i) => ({
          value: i.id,
          label: `${i.name} (${i.category})`,
        })),
    [items],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoadingItems(true)
      try {
        const rows = await getStationeryItems()
        if (!cancelled) setItems(rows)
      } catch (error) {
        if (!cancelled) toast.error(error?.response?.data?.message || 'Could not load items.')
      } finally {
        if (!cancelled) setIsLoadingItems(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    if (!itemId) {
      toast.error('Choose an item.')
      return
    }
    if (!from || !to) {
      toast.error('Choose a start and end date.')
      return
    }
    setIsLoading(true)
    try {
      setReport(await getStationeryItemReport(itemId, from, to))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load item report.')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [itemId, from, to])

  const printSubtitle = report
    ? `${report.item?.name || ''} · ${formatDate(report.from)} to ${formatDate(report.to)}`
    : ''

  return (
    <CampusShell
      headerContext="Stationery item report"
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
                  <FileSearch size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Item history</h1>
                  <p className="text-sm text-slate-500">Purchases, handovers, stock movement, and consumption for one item.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Item
                  <div className="mt-1 min-w-[260px]">
                    <Select
                      styles={selectStyles}
                      options={itemOptions}
                      value={itemOptions.find((o) => o.value === itemId) || null}
                      onChange={(opt) => setItemId(opt?.value ?? null)}
                      placeholder={isLoadingItems ? 'Loading…' : 'Select item'}
                      isClearable
                      isDisabled={isLoadingItems}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                    />
                  </div>
                </label>
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
              <section className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'On hand now', value: formatQty(report.currentOnHandQty) },
                  { label: 'Opening (period)', value: formatQty(report.openingOnHandQty) },
                  { label: 'Bought in period', value: formatQty(report.periodPurchasedQty) },
                  { label: 'Given out in period', value: formatQty(report.periodHandedOverQty) },
                  { label: 'Closing (period)', value: formatQty(report.closingOnHandQty) },
                  { label: 'Spent in period', value: formatReportPrintMoney(report.periodSpent) },
                  { label: 'Lifetime spent', value: formatReportPrintMoney(report.lifetimeSpent) },
                  {
                    label: 'Last cycle (days)',
                    value: report.previousCycleDays ?? '—',
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{card.value}</p>
                  </div>
                ))}
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Movement ledger</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Detail</th>
                      <th className="px-3 py-2 text-right font-medium">In</th>
                      <th className="px-3 py-2 text-right font-medium">Out</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">On hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td className="px-3 py-1.5" colSpan={6}>Opening balance</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatQty(report.openingOnHandQty)}</td>
                    </tr>
                    {(report.movements || []).map((row, index) => (
                      <tr key={`${row.movementType}-${row.referenceId}-${index}`} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-3 py-1.5">{row.movementType}</td>
                        <td className="px-3 py-1.5 text-slate-700">{row.description}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.qtyIn ? formatQty(row.qtyIn) : '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.qtyOut ? formatQty(row.qtyOut) : '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.amount != null ? formatReportPrintMoney(row.amount) : '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatQty(row.runningOnHand)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.movements || []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No movement in this period.</p>
                ) : null}
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Purchase history</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit price</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Accounts ref.</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.purchases || []).map((row) => (
                      <tr key={row.purchaseId} className="border-t border-slate-100">
                        <td className="px-3 py-1.5">{formatDate(row.purchaseDate)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(row.quantity)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(row.unitPrice)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatReportPrintMoney(row.lineTotal)}</td>
                        <td className="px-3 py-1.5">{row.voucherNo || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-600">{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.purchases || []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No purchases in this period.</p>
                ) : null}
              </section>

              <section className="no-print overflow-hidden bg-white shadow-sm">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Consumption by staff</div>
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Staff</th>
                      <th className="px-3 py-2 text-right font-medium">Qty given</th>
                      <th className="px-3 py-2 text-right font-medium">Handovers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.consumptionByEmployee || []).map((row) => (
                      <tr key={row.employeeId} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-semibold">{row.employeeName}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatQty(row.quantity)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.handoverCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.consumptionByEmployee || []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No handovers in this period.</p>
                ) : null}
              </section>

              <div className="print-only print-sheet">
                <CampusReportPrintHeader title="STATIONERY ITEM HISTORY" subtitle={printSubtitle} />
                <p style={{ margin: '0 0 8px', fontSize: 11 }}>
                  Category: {report.item?.category || '—'} · Unit: {report.item?.unit || '—'} · On hand now: <strong>{formatQty(report.currentOnHandQty)}</strong>
                  {' · '}Lifetime spent: <strong>{formatReportPrintMoney(report.lifetimeSpent)}</strong>
                  {report.lastPurchaseDate
                    ? ` · Last bought: ${formatDate(report.lastPurchaseDate)} (${formatQty(report.lastPurchaseQty)})`
                    : ''}
                  {report.previousCycleDays != null ? ` · Last cycle: ${report.previousCycleDays} days` : ''}
                </p>

                <h3 style={{ margin: '10px 0 4px', fontSize: 12 }}>Period summary</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Opening</th>
                      <th>Bought</th>
                      <th>Given out</th>
                      <th>Closing</th>
                      <th>Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'right' }}>{formatQty(report.openingOnHandQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatQty(report.periodPurchasedQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatQty(report.periodHandedOverQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatQty(report.closingOnHandQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(report.periodSpent)}</td>
                    </tr>
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>Movement ledger</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Detail</th>
                      <th>In</th>
                      <th>Out</th>
                      <th>Amount</th>
                      <th>On hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="band-row">
                      <td colSpan={6}>Opening balance</td>
                      <td style={{ textAlign: 'right' }}>{formatQty(report.openingOnHandQty)}</td>
                    </tr>
                    {(report.movements || []).map((row, index) => (
                      <tr key={`m-${index}`}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.movementType}</td>
                        <td>{row.description}</td>
                        <td style={{ textAlign: 'right' }}>{row.qtyIn ? formatQty(row.qtyIn) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.qtyOut ? formatQty(row.qtyOut) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{row.amount != null ? formatReportPrintMoney(row.amount) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.runningOnHand)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>Purchase history</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Amount</th>
                      <th>Accounts ref.</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.purchases || []).map((row) => (
                      <tr key={`p-${row.purchaseId}`}>
                        <td>{formatDate(row.purchaseDate)}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.quantity)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.unitPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(row.lineTotal)}</td>
                        <td>{row.voucherNo || '—'}</td>
                        <td>{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ margin: '12px 0 4px', fontSize: 12 }}>Consumption by staff</h3>
                <table className="legacy-print-table">
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Qty given</th>
                      <th>Handovers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.consumptionByEmployee || []).map((row) => (
                      <tr key={`c-${row.employeeId}`}>
                        <td>{row.employeeName}</td>
                        <td style={{ textAlign: 'right' }}>{formatQty(row.quantity)}</td>
                        <td style={{ textAlign: 'right' }}>{row.handoverCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="no-print px-2 py-8 text-center text-sm text-slate-500">
              Choose an item and dates, then load the report.
            </p>
          )}
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusStationeryItemReportPage

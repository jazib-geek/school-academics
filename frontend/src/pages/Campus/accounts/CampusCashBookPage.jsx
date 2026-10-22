import { useCallback, useState } from 'react'
import { BookMarked, ChevronDown, ChevronRight, Loader2, Pencil, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import { deleteVoucherLine, getCashBook, updateVoucherLine } from '../../../services/accountService'
import { hasCampusPermission } from '../../../services/authService'
import { INTEGER_INPUT_ATTRS, readIntegerInput } from '../../../utils/numericInput.js'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintDate,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'
import { getPakistanMonthStartIso, getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function monthStartInput() {
  return getPakistanMonthStartIso()
}

function todayInput() {
  return getPakistanTodayIso()
}

function lineDateInput(line) {
  if (!line?.date) return ''
  return String(line.date).slice(0, 10)
}

function lineAmountValue(line) {
  const payment = Number(line?.payment || 0)
  const received = Number(line?.received || 0)
  if (payment > 0) return payment
  if (received > 0) return received
  return ''
}

export default function CampusCashBookPage() {
  const canEditVoucher = hasCampusPermission('edit_voucher')
  const canDeleteVoucher = hasCampusPermission('delete_voucher')
  const showActions = canEditVoucher || canDeleteVoucher

  const [from, setFrom] = useState(monthStartInput())
  const [to, setTo] = useState(todayInput())
  const [result, setResult] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [editLine, setEditLine] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNarration, setEditNarration] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deleteLine, setDeleteLine] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadCashBook = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCashBook({ from, to })
      setResult(data)
      const next = {}
      ;(data?.days || []).forEach((day) => {
        next[day.date] = false
      })
      setCollapsed(next)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load cash book.')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [from, to])

  const search = useCallback(
    async (event) => {
      event?.preventDefault?.()
      await loadCashBook()
    },
    [loadCashBook],
  )

  const openEdit = (line) => {
    setEditLine(line)
    setEditDate(lineDateInput(line))
    setEditAmount(String(lineAmountValue(line) ?? ''))
    setEditNarration(line.narration || '')
  }

  const closeEdit = () => {
    if (editSaving) return
    setEditLine(null)
  }

  const saveEdit = async (event) => {
    event?.preventDefault?.()
    if (!editLine) return
    const amount = Number.parseInt(String(editAmount).replace(/\D/g, ''), 10)
    if (!editDate) {
      toast.error('Choose a date.')
      return
    }
    if (!amount || amount <= 0) {
      toast.error('Enter an amount greater than zero.')
      return
    }
    setEditSaving(true)
    try {
      await updateVoucherLine(editLine.id, {
        date: editDate,
        amount,
        narration: editNarration.trim() || null,
      })
      toast.success('Entry updated.')
      setEditLine(null)
      await loadCashBook()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update this entry.')
    } finally {
      setEditSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteLine) return
    setDeleteBusy(true)
    try {
      await deleteVoucherLine(deleteLine.id)
      toast.success('Entry removed.')
      setDeleteLine(null)
      await loadCashBook()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not remove this entry.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const reset = () => {
    setFrom(monthStartInput())
    setTo(todayInput())
    setResult(null)
    setCollapsed({})
  }

  const toggleDay = (date) => {
    setCollapsed((prev) => ({ ...prev, [date]: !prev[date] }))
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
                  <BookMarked size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Cash Book</h1>
                  <p className="text-sm text-slate-500">Daily cash movements with fee collections overlay.</p>
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
                <span className="text-sm font-medium">Fetching cash book...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px] leading-snug">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Voucher No</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Narration</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right">Payment</th>
                      {showActions ? <th className="no-print px-3 py-2 text-right">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {!result || result.days?.length === 0 ? (
                      <tr>
                        <td colSpan={showActions ? 6 : 5} className="px-3 py-8 text-center text-sm text-slate-500">
                          {result ? 'No cash book entries in this period.' : 'Choose dates and apply.'}
                        </td>
                      </tr>
                    ) : (
                      result.days.map((day) => {
                        const isCollapsed = collapsed[day.date]
                        return (
                          <FragmentDay
                            key={day.date}
                            day={day}
                            isCollapsed={isCollapsed}
                            onToggle={() => toggleDay(day.date)}
                            showActions={showActions}
                            canEditVoucher={canEditVoucher}
                            canDeleteVoucher={canDeleteVoucher}
                            onEdit={openEdit}
                            onDelete={setDeleteLine}
                          />
                        )
                      })
                    )}
                  </tbody>
                  {result && result.days?.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                        <td className="px-3 py-2" colSpan={3}>
                          Daily Expenses Total
                        </td>
                        <td className="px-3 py-2 text-right">0</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.dailyExpensesTotal)}
                        </td>
                      </tr>
                      {[
                        ['Tuition Fee', result.tuitionFee],
                        ['Admission Fee', result.admissionFee],
                        ['Misc Charges', result.miscCharges],
                        ['Prev Balance', result.prevBalance],
                        ['Fine', result.fine],
                      ].map(([label, amount]) => (
                        <tr key={label} className="border-t border-slate-100">
                          <td className="px-3 py-1.5" colSpan={3}>
                            {label}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(amount)}</td>
                          <td className="px-3 py-1.5 text-right">0</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-100 font-semibold">
                        <td className="px-3 py-2 text-right" colSpan={3}>
                          Grand Total
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.totalReceived)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatReportPrintMoney(result.totalPayment)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2 text-right" colSpan={3}>
                          Closing Balance
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums" colSpan={2}>
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
              <CampusReportPrintHeader title="CASH BOOK" subtitle={printSubtitle} />
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Voucher No</th>
                    <th style={{ width: '24%', textAlign: 'left' }}>Account</th>
                    <th style={{ width: '28%', textAlign: 'left' }}>Narration</th>
                    <th style={{ width: '16%' }}>Received</th>
                    <th style={{ width: '16%' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.days || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No cash book entries in this period.
                      </td>
                    </tr>
                  ) : (
                    result.days.flatMap((day) => [
                        <tr key={`band-${day.date}`} className="band-row">
                          <td colSpan={5}>{formatReportPrintDate(day.date, 'long')}</td>
                        </tr>,
                        ...(day.lines || []).map((line) => (
                          <tr key={`p-${line.id}`}>
                            <td style={{ textAlign: 'center' }}>{line.voucherNo}</td>
                            <td style={{ textAlign: 'left' }}>{line.accountTitle}</td>
                            <td style={{ textAlign: 'left' }}>{line.narration || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.received)}</td>
                            <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(line.payment)}</td>
                          </tr>
                        )),
                      ])
                  )}
                  <tr className="total-row">
                    <td colSpan={3} style={{ textAlign: 'left' }}>
                      Daily Expenses Total
                    </td>
                    <td style={{ textAlign: 'right' }}>0</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.dailyExpensesTotal)}</td>
                  </tr>
                  {[
                    ['Tuition Fee', result.tuitionFee],
                    ['Admission Fee', result.admissionFee],
                    ['Misc Charges', result.miscCharges],
                    ['Prev Balance', result.prevBalance],
                    ['Fine', result.fine],
                  ].map(([label, amount]) => (
                    <tr key={`fee-${label}`}>
                      <td colSpan={3} style={{ textAlign: 'left' }}>
                        {label}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(amount)}</td>
                      <td style={{ textAlign: 'right' }}>0</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3} style={{ textAlign: 'right' }}>
                      GRAND TOTAL
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.totalReceived)}</td>
                    <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(result.totalPayment)}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan={3} style={{ textAlign: 'right' }}>
                      CLOSING BALANCE
                    </td>
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      {formatReportPrintMoney(result.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          <ConfirmDialog
            open={Boolean(deleteLine)}
            title="Remove entry?"
            description={
              deleteLine
                ? `Remove voucher ${deleteLine.voucherNo || ''} (${deleteLine.accountTitle || 'account'}) from the cash book? This cannot be undone.`
                : ''
            }
            confirmLabel="Remove"
            cancelLabel="Cancel"
            confirmClass="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            busy={deleteBusy}
            onCancel={() => {
              if (!deleteBusy) setDeleteLine(null)
            }}
            onConfirm={confirmDelete}
          />

          {editLine ? (
            <div
              role="presentation"
              className="no-print fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
              onClick={closeEdit}
            >
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="cash-book-edit-title"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
                onClick={(event) => event.stopPropagation()}
                onSubmit={saveEdit}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 id="cash-book-edit-title" className="text-base font-semibold text-slate-900">
                    Edit entry
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Voucher {editLine.voucherNo} · {editLine.accountTitle}
                  </p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <label className="block text-[13px] font-medium text-slate-700">
                    Date
                    <input
                      type="date"
                      className={inputClass}
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      disabled={editSaving}
                      required
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-slate-700">
                    Amount
                    <input
                      {...INTEGER_INPUT_ATTRS}
                      className={inputClass}
                      value={editAmount}
                      onChange={(e) => setEditAmount(readIntegerInput(e))}
                      disabled={editSaving}
                      required
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-slate-700">
                    Narration
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100"
                      value={editNarration}
                      onChange={(e) => setEditNarration(e.target.value)}
                      disabled={editSaving}
                      rows={3}
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={closeEdit}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                  >
                    {editSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    Save
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </CampusShell>
    </div>
  )
}

function FragmentDay({
  day,
  isCollapsed,
  onToggle,
  showActions,
  canEditVoucher,
  canDeleteVoucher,
  onEdit,
  onDelete,
}) {
  const colSpan = showActions ? 6 : 5
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50">
        <td colSpan={colSpan} className="px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--campus-primary)]"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {formatReportPrintDate(day.date, 'long')}
          </button>
        </td>
      </tr>
      {!isCollapsed &&
        (day.lines || []).map((line) => {
          const editable = line.canEdit
          const showRowActions = showActions && editable
          return (
            <tr key={line.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{line.voucherNo}</td>
              <td className="px-3 py-1.5 font-semibold text-slate-900">{line.accountTitle}</td>
              <td className="px-3 py-1.5 text-slate-600">{line.narration || '—'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(line.received)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatReportPrintMoney(line.payment)}</td>
              {showActions ? (
                <td className="no-print px-3 py-1.5">
                  {showRowActions ? (
                    <div className="flex justify-end gap-1">
                      {canEditVoucher ? (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => onEdit(line)}
                          className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--campus-primary)] hover:bg-indigo-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDeleteVoucher ? (
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => onDelete(line)}
                          className="btn-icon-soft btn-table-action inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="block text-right text-slate-300">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          )
        })}
    </>
  )
}

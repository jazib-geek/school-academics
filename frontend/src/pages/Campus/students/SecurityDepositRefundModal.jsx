import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Printer, Shield, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getStudentSecurityDepositSummary,
  refundStudentSecurityDeposit,
} from '../../../services/studentService'
import { clampToPakistanToday, getPakistanTodayIso } from '../../../utils/pakistanDate.js'
import {
  getSecurityDepositActionLabel,
  getSecurityDepositProfileInfo,
  isSecurityDepositRecordView,
} from '../../../utils/studentSecurityDepositDisplay.js'
import {
  printSecurityDepositLog,
  securityDepositEventLabel,
} from '../../../utils/securityDepositLogPrint.js'
import { INTEGER_INPUT_ATTRS, readIntegerInput } from '../../../utils/numericInput.js'

function formatMoney(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatEventDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SecurityDepositEventLog({ events, compact = false }) {
  const rows = useMemo(() => {
    const list = Array.isArray(events) ? [...events] : []
    return list.sort((a, b) => {
      const da = new Date(a.eventDate || 0).getTime()
      const db = new Date(b.eventDate || 0).getTime()
      if (da !== db) return db - da
      return (b.id || 0) - (a.id || 0)
    })
  }, [events])

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
        No transactions on record yet.
      </p>
    )
  }

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${
        compact ? 'max-h-40' : 'max-h-[min(50vh,320px)]'
      } overflow-y-auto`}
    >
      <table className="min-w-full text-left text-[12px] leading-snug">
        <thead className="sticky top-0 z-[1] bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-2.5 py-2">Date</th>
            <th className="px-2.5 py-2">Type</th>
            <th className="px-2.5 py-2 text-right">Amount</th>
            {!compact ? (
              <>
                <th className="px-2.5 py-2">Receipt</th>
                <th className="px-2.5 py-2">Voucher</th>
                <th className="px-2.5 py-2">By</th>
                <th className="px-2.5 py-2">Notes</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-2.5 py-2 text-slate-700">{formatEventDate(row.eventDate)}</td>
              <td className="px-2.5 py-2 font-medium text-slate-800">
                {securityDepositEventLabel(row.eventType)}
              </td>
              <td className="px-2.5 py-2 text-right font-semibold tabular-nums text-slate-900">
                {formatMoney(row.amount)}
              </td>
              {!compact ? (
                <>
                  <td className="px-2.5 py-2 text-slate-600">{row.receiptId ?? '—'}</td>
                  <td className="px-2.5 py-2 text-slate-600">{row.voucherNo ?? '—'}</td>
                  <td className="px-2.5 py-2 text-slate-600">{row.entryUser ?? '—'}</td>
                  <td className="max-w-[140px] px-2.5 py-2 text-slate-600">{row.notes ?? '—'}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SecurityDepositRefundModal({ student, onClose, onRefunded }) {
  const studentId = student?.reg_Id ?? student?.Reg_Id
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [refundDate, setRefundDate] = useState(() => getPakistanTodayIso())
  const [postToAccounts, setPostToAccounts] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [postRefundAck, setPostRefundAck] = useState(false)
  /** @type {'none' | 'no_deposit' | 'load_error'} */
  const [blockingMessage, setBlockingMessage] = useState('none')

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setBlockingMessage('none')
    try {
      const data = await getStudentSecurityDepositSummary(studentId)
      setSummary(data)

      const held = Number(data?.heldAmount ?? data?.HeldAmount ?? 0)
      const hasRefund = Boolean(data?.hasRefundHistory ?? data?.HasRefundHistory)
      const netDeposited = Number(data?.netDeposited ?? data?.NetDeposited ?? 0)

      if (held <= 0 && !hasRefund && netDeposited <= 0) {
        setBlockingMessage('no_deposit')
      }
    } catch {
      setSummary(null)
      setBlockingMessage('load_error')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  const held = Number(summary?.heldAmount ?? summary?.HeldAmount ?? 0)
  const totalRefunded = Number(summary?.totalRefunded ?? summary?.TotalRefunded ?? 0)
  const netDeposited = Number(summary?.netDeposited ?? summary?.NetDeposited ?? 0)
  const recordView = isSecurityDepositRecordView(summary)
  const showDepositRecord = recordView || postRefundAck

  const securityInfo = getSecurityDepositProfileInfo(summary, null)

  const handlePrint = () => {
    printSecurityDepositLog({ student, summary })
  }

  const submit = async () => {
    const value = Math.floor(Number(amount))
    if (!value || value <= 0) {
      toast.error('Enter a refund amount.')
      return
    }
    if (value > held) {
      toast.error('Amount cannot exceed the held deposit.')
      return
    }

    setSubmitting(true)
    const toastId = 'security-refund'
    toast.loading('Processing refund…', { id: toastId })
    try {
      const result = await refundStudentSecurityDeposit(studentId, {
        amount: value,
        date: refundDate,
        postToAccounts,
        notes: notes.trim() || null,
      })
      toast.success(
        result?.voucherNo
          ? `Refund recorded. Voucher ${result.voucherNo}.`
          : 'Refund recorded.',
        { id: toastId },
      )

      let updatedSummary = summary
      try {
        updatedSummary = await getStudentSecurityDepositSummary(studentId)
        setSummary(updatedSummary)
      } catch {
        /* keep previous summary for print */
      }

      setPostRefundAck(true)
      setAmount('')
      setNotes('')
      printSecurityDepositLog({ student, summary: updatedSummary })
      onRefunded?.()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not process refund.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  if (!studentId) return null

  const name = student?.fullName ?? student?.FullName ?? `Student ${studentId}`
  const noDeposit = blockingMessage === 'no_deposit'
  const loadFailed = blockingMessage === 'load_error'
  const modalTitle =
    showDepositRecord && !loading
      ? getSecurityDepositActionLabel(summary, false)
      : getSecurityDepositActionLabel(summary, loading)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          showDepositRecord ? 'w-full max-w-3xl' : 'w-full max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{modalTitle}</h2>
            <p className="text-xs text-slate-500">#{studentId} — {name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-snug">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : noDeposit ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-rose-900">No security deposit to refund</p>
              <p className="mt-2 text-[13px] leading-snug text-rose-800/90">
                This student has no recorded security deposit. Collect the deposit from Receive Fee
                before you can refund it.
              </p>
            </div>
          ) : loadFailed ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-rose-900">Could not load deposit details</p>
              <p className="mt-2 text-[13px] text-rose-800/90">Try again in a moment.</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-50"
              >
                Retry
              </button>
            </div>
          ) : showDepositRecord ? (
            <div className="space-y-4">
              {postRefundAck ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">Refund saved</p>
                  <p className="mt-1 text-[13px] text-emerald-800">
                    A printable record was opened for the parent or guardian. You can print again below
                    if needed.
                  </p>
                </div>
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{securityInfo.statusLabel}</p>
                <p className="mt-1 text-[13px] text-slate-600">{securityInfo.statusDetail}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Net received</p>
                    <p className="text-base font-bold text-slate-900">Rs {formatMoney(netDeposited)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Refunded</p>
                    <p className="text-base font-bold text-slate-900">Rs {formatMoney(totalRefunded)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Currently held</p>
                    <p className="text-base font-bold text-slate-900">Rs {formatMoney(held)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Transaction log
                </p>
                <SecurityDepositEventLog events={summary?.events} />
              </div>

              {!postRefundAck ? (
                <p className="text-[11px] text-slate-500">
                  Print this record for the parent or guardian when the deposit has been settled.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Held deposit</p>
                <p className="text-xl font-bold text-emerald-900">Rs {formatMoney(held)}</p>
              </div>

              {summary?.events?.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recent activity
                  </p>
                  <SecurityDepositEventLog events={summary.events} compact />
                </div>
              ) : null}

              <label className="block text-xs font-semibold text-slate-600">
                Refund amount (Rs)
                <input
                  {...INTEGER_INPUT_ATTRS}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(readIntegerInput(e))}
                />
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                Refund date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={refundDate}
                  max={getPakistanTodayIso()}
                  onChange={(e) => setRefundDate(clampToPakistanToday(e.target.value))}
                />
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--campus-primary)]"
                  checked={postToAccounts}
                  onChange={(e) => setPostToAccounts(e.target.checked)}
                />
                Record cash paid out in accounts
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                Notes (optional)
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or reference"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          {showDepositRecord ? (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Printer size={16} />
                Print record
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                disabled={submitting}
              >
                {noDeposit || loadFailed ? 'Close' : 'Cancel'}
              </button>
              {!noDeposit && !loadFailed ? (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading || submitting || held <= 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  Refund
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

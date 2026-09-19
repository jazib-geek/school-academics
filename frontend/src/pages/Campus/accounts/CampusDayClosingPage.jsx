import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CalendarCheck2,
  CircleDollarSign,
  FileText,
  GraduationCap,
  HandCoins,
  History,
  Info,
  Loader2,
  Lock,
  Receipt,
  RefreshCw,
  Save,
  Scale,
  Search,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { closeDay, getDayClosingPreview } from '../../../services/accountService'
import { formatReportPrintMoney } from '../../../utils/campusReportPrint'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(value) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CampusDayClosingPage() {
  const [date, setDate] = useState(todayInput())
  const [preview, setPreview] = useState(null)
  const [remainingCash, setRemainingCash] = useState('')
  const [narration, setNarration] = useState('Day closing – cash to owner')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const load = useCallback(async (selectedDate = date) => {
    setIsLoading(true)
    try {
      const data = await getDayClosingPreview(selectedDate)
      setPreview(data)
      if (data?.closing) {
        setRemainingCash(String(Math.round(Number(data.closing.remainingCash || 0))))
        setNarration(data.closing.narration || 'Day closing – cash to owner')
      } else {
        setRemainingCash(String(Math.round(Number(data?.suggestedRemainingCash || 0))))
        setNarration('Day closing – cash to owner')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load day closing.')
      setPreview(null)
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    load(date)
  }, [date, load])

  const openConfirm = (event) => {
    event.preventDefault()
    if (!preview?.canClose) {
      toast.error('Only today can be closed, and only once.')
      return
    }

    const amount = Number(remainingCash)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid remaining cash amount.')
      return
    }

    setIsConfirmOpen(true)
  }

  const confirmCloseDay = async () => {
    const amount = Number(remainingCash)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid remaining cash amount.')
      return
    }

    const suggested = Math.round(Number(preview?.suggestedRemainingCash || 0))
    if (amount > suggested) {
      toast.message('Amount is higher than suggested remaining cash for today.')
    }

    setIsSaving(true)
    const toastId = 'day-close'
    toast.loading('Closing day...', { id: toastId })
    try {
      await closeDay({
        closingDate: date,
        remainingCash: Math.round(amount),
        narration: narration.trim() || null,
      })
      setIsConfirmOpen(false)
      toast.success('Day closed. Cash to owner recorded.', { id: toastId })
      await load(date)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not close day.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const readOnly = !preview?.canClose
  const confirmAmount = formatReportPrintMoney(remainingCash)

  return (
    <CampusShell headerContext="Accounts">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <CalendarCheck2 size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Day Closing</h1>
                  <p className="text-sm text-slate-500">
                    Record cash handed to owner for the day. This does not affect income or expenses.
                  </p>
                </div>
              </div>
              {preview?.isClosed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Lock size={12} /> Closed
                </span>
              ) : preview && !preview.isToday ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Lock size={12} /> Past date
                </span>
              ) : preview?.isToday ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  <RefreshCw size={12} /> Open for today
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-12">
              <label className="relative block md:col-span-3">
                <span className="sr-only">Date</span>
                <CalendarCheck2
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  className={`${inputClass} pl-9`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => load(date)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white md:col-span-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {isLoading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            {isLoading || !preview ? (
              <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                <span className="text-sm font-medium">Preparing day totals...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryTile
                    label="Total cash collected"
                    value={preview.totalCashCollected}
                    icon={Banknote}
                    tone="emerald"
                  />
                  <SummaryTile
                    label="Total expenses"
                    value={preview.totalExpenses}
                    icon={Receipt}
                    tone="rose"
                  />
                  <SummaryTile
                    label="Suggested remaining"
                    value={preview.suggestedRemainingCash}
                    icon={HandCoins}
                    tone="indigo"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Scale size={13} className="text-slate-400" />
                    Day breakdown
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailRow icon={GraduationCap} label="Tuition fee" value={preview.tuitionFee} tone="sky" />
                    <DetailRow icon={UserRound} label="Admission fee" value={preview.admissionFee} tone="sky" />
                    <DetailRow icon={CircleDollarSign} label="Misc charges" value={preview.miscCharges} tone="violet" />
                    <DetailRow icon={Wallet} label="Prev balance" value={preview.prevBalance} tone="slate" />
                    <DetailRow icon={AlertTriangle} label="Fine" value={preview.fine} tone="amber" />
                    <DetailRow icon={Banknote} label="Other receipts (ledger)" value={preview.glCredits} tone="emerald" />
                    <DetailRow icon={Receipt} label="Ledger payments" value={preview.glDebits} tone="rose" />
                  </div>
                </div>

                <form
                  onSubmit={openConfirm}
                  className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--campus-primary)]">
                    <HandCoins size={14} />
                    Cash handover
                  </div>

                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-4">
                      Remaining cash to owner (Rs)
                      <div className="relative mt-1">
                        <Wallet
                          size={15}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className={`${inputClass} pl-9`}
                          value={remainingCash}
                          onChange={(e) => setRemainingCash(e.target.value)}
                          disabled={readOnly}
                          required
                        />
                      </div>
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-8">
                      Narration
                      <div className="relative mt-1">
                        <FileText
                          size={15}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className={`${inputClass} pl-9`}
                          value={narration}
                          onChange={(e) => setNarration(e.target.value)}
                          disabled={readOnly}
                          maxLength={500}
                        />
                      </div>
                    </label>
                  </div>

                  {preview.closing ? (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                      <Lock size={15} className="mt-0.5 shrink-0" />
                      <p>
                        Closed on {formatDateLabel(preview.closing.closingDate)}
                        {preview.closing.entryUser ? ` by ${preview.closing.entryUser}` : ''}. Handed over:{' '}
                        <strong>Rs {formatReportPrintMoney(preview.closing.remainingCash)}</strong>
                      </p>
                    </div>
                  ) : null}

                  {!preview.isToday ? (
                    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-600">
                      <Info size={15} className="mt-0.5 shrink-0 text-slate-400" />
                      <p>Past dates are locked. Only today can be closed.</p>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={readOnly || isSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Save size={16} />
                      Close day
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <History size={14} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Recent closings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px] leading-snug">
                <thead>
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Collected</th>
                    <th className="px-3 py-2 text-right">Expenses</th>
                    <th className="px-3 py-2 text-right">To owner</th>
                    <th className="px-3 py-2">By</th>
                    <th className="px-3 py-2">Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview?.recentClosings || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                        No day closings recorded yet.
                      </td>
                    </tr>
                  ) : (
                    preview.recentClosings.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-semibold text-slate-900">
                          {formatDateLabel(row.closingDate)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">
                          {formatReportPrintMoney(row.totalCashCollected)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-rose-700">
                          {formatReportPrintMoney(row.totalExpenses)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--campus-primary)]">
                          {formatReportPrintMoney(row.remainingCash)}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <UserRound size={12} className="text-slate-400" />
                            {row.entryUser || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">{row.narration || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-close-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 id="day-close-confirm-title" className="text-lg font-bold text-slate-900">
                    Confirm day closing
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Please review before you continue.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving}
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{formatDateLabel(date)}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">To owner</p>
                  <p className="mt-0.5 font-semibold text-indigo-950">Rs {confirmAmount}</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
                <p className="font-semibold">This cannot be undone.</p>
                <p className="mt-1 text-amber-800/90">
                  After closing, this day is locked and the amounts cannot be changed from this screen.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void confirmCloseDay()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirm & close day
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

const TILE_TONES = {
  emerald: {
    wrap: 'border-emerald-100 bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-700',
    label: 'text-emerald-700',
    value: 'text-emerald-950',
  },
  rose: {
    wrap: 'border-rose-100 bg-rose-50',
    icon: 'bg-rose-100 text-rose-700',
    label: 'text-rose-700',
    value: 'text-rose-950',
  },
  indigo: {
    wrap: 'border-indigo-100 bg-indigo-50',
    icon: 'bg-indigo-100 text-indigo-700',
    label: 'text-indigo-700',
    value: 'text-indigo-950',
  },
}

function SummaryTile({ label, value, icon: Icon, tone = 'indigo' }) {
  const colors = TILE_TONES[tone] || TILE_TONES.indigo
  return (
    <div className={`rounded-xl border p-3 ${colors.wrap}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${colors.label}`}>{label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${colors.icon}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${colors.value}`}>
        {formatReportPrintMoney(value)}
      </p>
    </div>
  )
}

const DETAIL_TONES = {
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
}

function DetailRow({ icon: Icon, label, value, tone = 'slate' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${DETAIL_TONES[tone] || DETAIL_TONES.slate}`}>
          <Icon size={13} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold tabular-nums text-slate-800">{formatReportPrintMoney(value)}</span>
    </div>
  )
}

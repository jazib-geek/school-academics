import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  getPostableAccounts,
  saveCashPaymentVoucher,
  saveCashReceiptVoucher,
} from '../../../services/accountService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '40px',
    borderRadius: '0.5rem',
    borderColor: '#cbd5e1',
  }),
  menu: (base) => ({ ...base, zIndex: 60 }),
}

function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * @param {{ mode: 'payment' | 'receipt' }} props
 */
export default function CampusVoucherPage({ mode }) {
  const isPayment = mode === 'payment'
  const title = isPayment ? 'Cash Payment Voucher' : 'Cash Receipt Voucher'
  const subtitle = isPayment
    ? 'Record cash paid out against ledger accounts.'
    : 'Record cash received into ledger accounts.'
  const voucherCode = isPayment ? 'CPV' : 'CRV'
  const accountLabel = isPayment ? 'Debit account' : 'Credit account'
  const amountColumn = isPayment ? 'Debit' : 'Credit'
  const Icon = isPayment ? ArrowUpRight : ArrowDownLeft
  const accent = isPayment
    ? { badge: 'bg-rose-50 text-rose-700 ring-rose-200', icon: 'bg-rose-600' }
    : { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'bg-emerald-600' }

  const [accounts, setAccounts] = useState([])
  const [date, setDate] = useState(todayInputValue())
  const [accountId, setAccountId] = useState(null)
  const [narration, setNarration] = useState('')
  const [amount, setAmount] = useState('')
  const [lines, setLines] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.accountId,
        label: `${a.accountTitle} (${a.accountId})`,
        title: a.accountTitle,
        code: a.accountId,
      })),
    [accounts],
  )

  const selectedAccount = accountOptions.find((o) => o.value === accountId) || null

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    [lines],
  )

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      setAccounts(await getPostableAccounts())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const addLine = () => {
    if (!selectedAccount) {
      toast.error('Select an account.')
      return
    }
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount.')
      return
    }

    setLines((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        accountId: selectedAccount.code,
        accountTitle: selectedAccount.title,
        narration: narration.trim(),
        amount: value,
      },
    ])
    setNarration('')
    setAmount('')
  }

  const removeLine = (key) => {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  const reset = () => {
    setLines([])
    setAccountId(null)
    setNarration('')
    setAmount('')
    setDate(todayInputValue())
  }

  const save = async () => {
    if (lines.length === 0) {
      toast.error('Add at least one line before saving.')
      return
    }
    setIsSaving(true)
    const toastId = 'voucher-save'
    toast.loading('Saving voucher...', { id: toastId })
    try {
      const payload = {
        date,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          narration: line.narration || null,
          amount: line.amount,
        })),
      }
      const result = isPayment
        ? await saveCashPaymentVoucher(payload)
        : await saveCashReceiptVoucher(payload)
      toast.success(`Voucher ${result?.voucherNo || ''} saved.`, { id: toastId })
      reset()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save voucher.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Accounts">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl text-white ${accent.icon}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${accent.badge}`}
                    >
                      {voucherCode}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Banknote className="h-4 w-4 text-[var(--campus-primary)]" />
                <span>
                  Total:{' '}
                  <strong className="tabular-nums text-slate-900">{formatMoney(totalAmount)}</strong>
                </span>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-12">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-3">
                Voucher date
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-9">
                {accountLabel}
                <div className="mt-1">
                  <Select
                    classNamePrefix="account-select"
                    options={accountOptions}
                    value={selectedAccount}
                    onChange={(opt) => setAccountId(opt?.value || null)}
                    isLoading={isLoading}
                    placeholder="Search account by name or code..."
                    isClearable
                    styles={selectStyles}
                  />
                </div>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-7">
                Narration
                <input
                  className={`${inputClass} mt-1`}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="What is this for?"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addLine()
                    }
                  }}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-3">
                Amount (Rs)
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${inputClass} mt-1`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addLine()
                    }
                  }}
                />
              </label>
              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-3 text-sm font-medium text-white hover:bg-[#364574]"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Voucher lines</h2>
              <p className="text-xs text-slate-500">
                {lines.length} line{lines.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px] leading-snug">
                <thead>
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Narration</th>
                    <th className="px-3 py-2 text-right">{amountColumn}</th>
                    <th className="px-3 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                        No lines yet. Choose an account, enter an amount, then add it.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={line.key} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-500">{index + 1}</td>
                        <td className="px-3 py-1.5 font-medium tabular-nums text-slate-700">{line.accountId}</td>
                        <td className="px-3 py-1.5 font-semibold text-slate-900">{line.accountTitle}</td>
                        <td className="px-3 py-1.5 text-slate-600">{line.narration || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                          {formatMoney(line.amount)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="btn-table-action text-rose-600 hover:bg-rose-50"
                            title="Remove line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {lines.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-3 py-2" colSpan={4}>
                        Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totalAmount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X size={16} />
                Clear
              </button>
              <button
                type="button"
                disabled={isSaving || lines.length === 0}
                onClick={save}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                Save voucher
              </button>
            </div>
          </section>
        </div>
      </div>
    </CampusShell>
  )
}

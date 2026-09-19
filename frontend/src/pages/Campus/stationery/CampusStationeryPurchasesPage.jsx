import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { Loader2, Plus, RefreshCw, Save, ShoppingCart, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getPostableAccounts } from '../../../services/accountService'
import {
  createStationeryPurchase,
  getStationeryItems,
  getStationeryPurchases,
} from '../../../services/stationeryService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#cbd5e1' }),
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

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatQty(value) {
  const n = Number(value || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function CampusStationeryPurchasesPage() {
  const canManage = hasCampusPermission('manage_stationery')
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [purchases, setPurchases] = useState([])
  const [items, setItems] = useState([])
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [purchaseDate, setPurchaseDate] = useState(todayInputValue())
  const [notes, setNotes] = useState('')
  const [postToAccounts, setPostToAccounts] = useState(false)
  const [expenseAccountId, setExpenseAccountId] = useState(null)
  const [lines, setLines] = useState([{ itemId: null, quantity: '', unitPrice: '' }])

  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.isActive)
        .map((i) => ({
          value: i.id,
          label: `${i.name} (${i.category})`,
          unit: i.unit,
        })),
    [items],
  )

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.accountId,
        label: `${a.accountTitle} (${a.accountId})`,
      })),
    [accounts],
  )

  const liveTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity)
        const price = Number(line.unitPrice)
        if (!(qty > 0) || !(price > 0)) return sum
        return sum + qty * price
      }, 0),
    [lines],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [purchaseRows, itemRows] = await Promise.all([
        getStationeryPurchases({ from, to }),
        getStationeryItems(),
      ])
      setPurchases(purchaseRows)
      setItems(itemRows)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load purchases.')
    } finally {
      setIsLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const openEditor = async () => {
    setPurchaseDate(todayInputValue())
    setNotes('')
    setPostToAccounts(false)
    setExpenseAccountId(null)
    setLines([{ itemId: null, quantity: '', unitPrice: '' }])
    setIsEditorOpen(true)
    try {
      if (accounts.length === 0) {
        setAccounts(await getPostableAccounts(true))
      }
    } catch {
      toast.error('Could not load expense accounts.')
    }
  }

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const submit = async (event) => {
    event.preventDefault()
    const payloadLines = lines
      .filter((l) => l.itemId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0)
      .map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      }))

    if (payloadLines.length === 0) {
      toast.error('Add at least one item with quantity and price.')
      return
    }
    if (postToAccounts && !expenseAccountId) {
      toast.error('Choose an expense account to record this payment in Accounts.')
      return
    }

    setIsSaving(true)
    const toastId = 'stationery-purchase-save'
    toast.loading('Saving purchase...', { id: toastId })
    try {
      await createStationeryPurchase({
        purchaseDate,
        notes: notes.trim() || null,
        lines: payloadLines,
        postToAccounts,
        expenseAccountId: postToAccounts ? expenseAccountId : null,
      })
      toast.success('Purchase saved.', { id: toastId })
      setIsEditorOpen(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save purchase.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Stationery purchases">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
                  <p className="text-sm text-slate-500">Record stationery bought and optional Accounts payment.</p>
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
                <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <PermissionControl allowed={canManage}>
                  <button type="button" onClick={() => void openEditor()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white">
                    <Plus size={18} /> New purchase
                  </button>
                </PermissionControl>
              </div>
            </div>
          </section>

          <section className="overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-[13px] leading-snug">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Items</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                  <th className="px-3 py-2 font-medium">Accounts</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-3 py-1.5 whitespace-nowrap text-slate-800">{String(row.purchaseDate).slice(0, 10)}</td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {(row.lines || []).map((l) => (
                        <div key={l.id}>{l.itemName} · {formatQty(l.quantity)} × {formatMoney(l.unitPrice)}</div>
                      ))}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{row.notes || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {row.postedToAccounts ? (row.voucherNo || 'Recorded') : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900">{formatMoney(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && purchases.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No purchases in this period.</p>
            ) : null}
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="flex max-h-[92vh] min-h-[70vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">New purchase</h2>
              <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Purchase date
                  <input type="date" className={`${inputClass} mt-1`} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Notes
                  <input className={`${inputClass} mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-500">Items</p>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, { itemId: null, quantity: '', unitPrice: '' }])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--campus-primary)]"
                  >
                    <Plus size={14} /> Add line
                  </button>
                </div>
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_6rem_7rem_2rem]">
                    <Select
                      styles={selectStyles}
                      options={itemOptions}
                      value={itemOptions.find((o) => o.value === line.itemId) || null}
                      onChange={(opt) => updateLine(index, { itemId: opt?.value ?? null })}
                      placeholder="Select item"
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      className={inputClass}
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      className={inputClass}
                      placeholder="Unit price"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="inline-flex h-10 w-8 items-center justify-center text-rose-600 disabled:opacity-40"
                      aria-label="Remove line"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={postToAccounts}
                    onChange={(e) => setPostToAccounts(e.target.checked)}
                    className="h-4 w-4 accent-[var(--campus-primary)]"
                  />
                  Also record this payment in Accounts
                </label>
                <p className="text-sm font-semibold text-slate-900">Total: {formatMoney(liveTotal)}</p>
              </div>

              {postToAccounts ? (
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Expense account
                  <div className="mt-1">
                    <Select
                      styles={selectStyles}
                      options={accountOptions}
                      value={accountOptions.find((o) => o.value === expenseAccountId) || null}
                      onChange={(opt) => setExpenseAccountId(opt?.value ?? null)}
                      placeholder="Select account"
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                    />
                  </div>
                </label>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save purchase
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStationeryPurchasesPage

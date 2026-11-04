import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Select from 'react-select'
import { Loader2, Pencil, Plus, RefreshCw, Save, Trash2, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createStationeryBudget,
  getStationeryBudget,
  getStationeryBudgets,
  getStationeryItems,
  updateStationeryBudget,
} from '../../../services/stationeryService'
import { DECIMAL_INPUT_ATTRS, readDecimalInput } from '../../../utils/numericInput.js'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const PERIODS = [
  { value: 'Month', label: 'Full month' },
  { value: 'FirstHalf', label: '1–15' },
  { value: 'SecondHalf', label: '16–end' },
]

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#cbd5e1' }),
  menu: (base) => ({ ...base, zIndex: 100 }),
  menuPortal: (base) => ({ ...base, zIndex: 100 }),
}

function currentMonthValue() {
  return getPakistanTodayIso().slice(0, 7)
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

function formatSigned(value) {
  const n = Number(value || 0)
  const text = formatMoney(Math.abs(n))
  return n < 0 ? `-${text}` : text
}

function emptyLine() {
  return { itemId: null, quantity: '', unitPrice: '' }
}

function CampusStationeryBudgetPage() {
  const canManage = hasCampusPermission('manage_stationery')
  const [rows, setRows] = useState([])
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const detailRequest = useRef(0)

  const [monthValue, setMonthValue] = useState(currentMonthValue())
  const [period, setPeriod] = useState('Month')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([emptyLine()])

  const itemOptions = useMemo(
    () =>
      items
        .filter((item) => item.isActive)
        .map((item) => ({
          value: item.id,
          label: `${item.name} (${item.category})`,
          unitPrice: item.unitPrice,
        })),
    [items],
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
      const [budgetRows, itemRows] = await Promise.all([getStationeryBudgets(), getStationeryItems()])
      setRows(budgetRows)
      setItems(itemRows)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load budgets.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setMonthValue(currentMonthValue())
    setPeriod('Month')
    setNotes('')
    setLines([emptyLine()])
    setIsEditorOpen(true)
  }

  const openEdit = (budget) => {
    const budgetLines = (budget.lines || []).filter((line) => line.onBudget)
    setEditingId(budget.id)
    setMonthValue(`${budget.year}-${String(budget.month).padStart(2, '0')}`)
    setPeriod(budget.period || 'Month')
    setNotes(budget.notes || '')
    setLines(
      budgetLines.length
        ? budgetLines.map((line) => ({
            itemId: line.itemId,
            quantity: String(line.estimatedQty),
            unitPrice: String(line.unitPrice),
          }))
        : [emptyLine()],
    )
    setDetail(null)
    setIsEditorOpen(true)
  }

  const closeDetail = () => {
    detailRequest.current += 1
    setDetail(null)
    setIsDetailLoading(false)
  }

  const openDetail = async (id) => {
    const requestId = ++detailRequest.current
    setIsDetailLoading(true)
    setDetail(null)
    try {
      const row = await getStationeryBudget(id)
      if (detailRequest.current !== requestId) return
      setDetail(row)
    } catch (error) {
      if (detailRequest.current !== requestId) return
      toast.error(error?.response?.data?.message || 'Could not open this budget.')
    } finally {
      if (detailRequest.current === requestId) setIsDetailLoading(false)
    }
  }

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const submit = async (event) => {
    event.preventDefault()
    const [yearText, monthText] = String(monthValue || '').split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const payloadLines = lines
      .filter((line) => line.itemId && Number(line.quantity) > 0 && Number(line.unitPrice) > 0)
      .map((line) => ({
        itemId: line.itemId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }))

    if (!year || !month) {
      toast.error('Choose a month.')
      return
    }
    if (payloadLines.length === 0) {
      toast.error('Add at least one item with quantity and price.')
      return
    }
    if (new Set(payloadLines.map((line) => line.itemId)).size !== payloadLines.length) {
      toast.error('Each item can only be added once.')
      return
    }

    setIsSaving(true)
    const toastId = 'stationery-budget-save'
    toast.loading('Saving budget...', { id: toastId })
    try {
      const payload = {
        year,
        month,
        period,
        notes: notes.trim() || null,
        lines: payloadLines,
      }
      if (editingId) await updateStationeryBudget(editingId, payload)
      else await createStationeryBudget(payload)
      toast.success('Budget saved.', { id: toastId })
      setIsEditorOpen(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save budget.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Store budget">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Wallet size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Budget</h1>
                  <p className="text-sm text-slate-500">Estimate for a full month or 15 days, compared with purchases.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <PermissionControl allowed={canManage}>
                  <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white">
                    <Plus size={18} /> New budget
                  </button>
                </PermissionControl>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-[13px] leading-snug">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Period</th>
                    <th className="px-3 py-2 text-right font-medium">Estimate</th>
                    <th className="px-3 py-2 text-right font-medium">Spent</th>
                    <th className="px-3 py-2 text-right font-medium">Difference</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/70">
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => void openDetail(row.id)} className="font-medium text-[var(--campus-primary)]">
                          {row.periodLabel}
                        </button>
                        {row.notes ? <p className="text-xs text-slate-500">{row.notes}</p> : null}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-700">{formatMoney(row.estimatedTotal)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-700">{formatMoney(row.actualTotal)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${Number(row.difference) < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatSigned(row.difference)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button type="button" onClick={() => void openDetail(row.id)} className="text-sm font-medium text-[var(--campus-primary)]">
                          Compare
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No budgets yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="flex max-h-[92vh] min-h-[70vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit budget' : 'New budget'}</h2>
              <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Month
                  <input type="month" className={`${inputClass} mt-1`} value={monthValue} onChange={(e) => setMonthValue(e.target.value)} required />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Period
                  <select className={`${inputClass} mt-1`} value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIODS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Notes
                  <input className={`${inputClass} mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-500">Items</p>
                  <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--campus-primary)]">
                    <Plus size={14} /> Add line
                  </button>
                </div>
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_6rem_7rem_2rem]">
                    <Select
                      styles={selectStyles}
                      options={itemOptions}
                      value={itemOptions.find((option) => option.value === line.itemId) || null}
                      onChange={(option) =>
                        updateLine(index, {
                          itemId: option?.value ?? null,
                          unitPrice: option && Number(option.unitPrice) > 0 ? String(option.unitPrice) : line.unitPrice,
                        })
                      }
                      placeholder="Select item"
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                    />
                    <input
                      {...DECIMAL_INPUT_ATTRS}
                      className={inputClass}
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: readDecimalInput(e) })}
                    />
                    <input
                      {...DECIMAL_INPUT_ATTRS}
                      className={inputClass}
                      placeholder="Unit price"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, { unitPrice: readDecimalInput(e) })}
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
              <p className="text-right text-sm font-semibold text-slate-900">Estimate: {formatMoney(liveTotal)}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save budget
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {detail || isDetailLoading ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detail?.periodLabel || 'Budget'}</h2>
                {detail ? (
                  <p className="text-sm text-slate-500">
                    Estimate {formatMoney(detail.estimatedTotal)} · Spent {formatMoney(detail.actualTotal)} · Difference {formatSigned(detail.difference)}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={closeDetail} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {isDetailLoading ? (
                <div className="grid place-items-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-slate-50/80 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Est. qty</th>
                      <th className="px-3 py-2 text-right font-medium">Est. amount</th>
                      <th className="px-3 py-2 text-right font-medium">Bought qty</th>
                      <th className="px-3 py-2 text-right font-medium">Bought amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.lines || []).map((line) => (
                      <tr key={`${line.itemId}-${line.onBudget}`} className="border-t border-slate-50">
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-slate-800">{line.itemName}</span>
                          <span className="ml-2 text-xs text-slate-400">{line.onBudget ? line.category : 'Extra purchase'}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-700">{line.onBudget ? formatQty(line.estimatedQty) : '—'}</td>
                        <td className="px-3 py-1.5 text-right text-slate-700">{line.onBudget ? formatMoney(line.estimatedAmount) : '—'}</td>
                        <td className="px-3 py-1.5 text-right text-slate-700">{formatQty(line.purchasedQty)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-700">{formatMoney(line.purchasedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" onClick={closeDetail} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Close</button>
              {detail && canManage ? (
                <button type="button" onClick={() => openEdit(detail)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                  <Pencil size={16} /> Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStationeryBudgetPage

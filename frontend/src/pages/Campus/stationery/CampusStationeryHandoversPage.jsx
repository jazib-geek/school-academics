import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { HandHelping, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getAllActiveEmployees } from '../../../services/employeeService'
import {
  createStationeryHandover,
  getStationeryHandovers,
  getStationeryItems,
  getStationeryStock,
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

function formatQty(value) {
  const n = Number(value || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function CampusStationeryHandoversPage() {
  const canManage = hasCampusPermission('manage_stationery')
  const [from, setFrom] = useState(monthStartInputValue())
  const [to, setTo] = useState(todayInputValue())
  const [handovers, setHandovers] = useState([])
  const [items, setItems] = useState([])
  const [stockByItem, setStockByItem] = useState({})
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [handoverDate, setHandoverDate] = useState(todayInputValue())
  const [employeeId, setEmployeeId] = useState(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ itemId: null, quantity: '' }])

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id ?? e.iD ?? e.ID,
        label: e.employeeName || e.name || `Employee #${e.id ?? e.iD ?? e.ID}`,
      })),
    [employees],
  )

  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.isActive)
        .map((i) => {
          const onHand = stockByItem[i.id]
          const stockLabel = onHand == null ? '' : ` · on hand ${formatQty(onHand)}`
          return {
            value: i.id,
            label: `${i.name} (${i.category})${stockLabel}`,
            onHand,
          }
        }),
    [items, stockByItem],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [handoverRows, itemRows, stockRows] = await Promise.all([
        getStationeryHandovers({ from, to }),
        getStationeryItems(),
        getStationeryStock(),
      ])
      setHandovers(handoverRows)
      setItems(itemRows)
      const map = {}
      for (const row of stockRows) map[row.itemId] = row.onHandQty
      setStockByItem(map)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load handovers.')
    } finally {
      setIsLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const openEditor = async () => {
    setHandoverDate(todayInputValue())
    setEmployeeId(null)
    setNotes('')
    setLines([{ itemId: null, quantity: '' }])
    setIsEditorOpen(true)
    try {
      if (employees.length === 0) {
        setEmployees(await getAllActiveEmployees())
      }
      const stockRows = await getStationeryStock()
      const map = {}
      for (const row of stockRows) map[row.itemId] = row.onHandQty
      setStockByItem(map)
    } catch {
      toast.error('Could not load employees or stock.')
    }
  }

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!employeeId) {
      toast.error('Choose who receives the materials.')
      return
    }
    const payloadLines = lines
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
      }))

    if (payloadLines.length === 0) {
      toast.error('Add at least one item with quantity.')
      return
    }

    setIsSaving(true)
    const toastId = 'stationery-handover-save'
    toast.loading('Saving handover...', { id: toastId })
    try {
      await createStationeryHandover({
        handoverDate,
        employeeId,
        notes: notes.trim() || null,
        lines: payloadLines,
      })
      toast.success('Handover saved.', { id: toastId })
      setIsEditorOpen(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save handover.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Stationery handovers">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <HandHelping size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Handovers</h1>
                  <p className="text-sm text-slate-500">Materials given to staff. Stock is shown for guidance only.</p>
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
                    <Plus size={18} /> New handover
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
                  <th className="px-3 py-2 font-medium">Given to</th>
                  <th className="px-3 py-2 font-medium">Items</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-3 py-1.5 whitespace-nowrap text-slate-800">{String(row.handoverDate).slice(0, 10)}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-900">{row.employeeName}</td>
                    <td className="px-3 py-1.5 text-slate-700">
                      {(row.lines || []).map((l) => (
                        <div key={l.id}>{l.itemName} · {formatQty(l.quantity)}</div>
                      ))}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && handovers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No handovers in this period.</p>
            ) : null}
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="flex max-h-[92vh] min-h-[70vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">New handover</h2>
              <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Date
                  <input type="date" className={`${inputClass} mt-1`} value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} required />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Given to
                  <div className="mt-1">
                    <Select
                      styles={selectStyles}
                      options={employeeOptions}
                      value={employeeOptions.find((o) => o.value === employeeId) || null}
                      onChange={(opt) => setEmployeeId(opt?.value ?? null)}
                      placeholder="Select staff"
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                    />
                  </div>
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Notes
                <input className={`${inputClass} mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-500">Items</p>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, { itemId: null, quantity: '' }])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--campus-primary)]"
                  >
                    <Plus size={14} /> Add line
                  </button>
                </div>
                {lines.map((line, index) => {
                  const selected = itemOptions.find((o) => o.value === line.itemId)
                  const onHand = selected?.onHand
                  const lowStock = onHand != null && Number(onHand) < Number(line.quantity || 0)
                  return (
                    <div key={index} className="space-y-1 rounded-lg border border-slate-200 p-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_2rem]">
                        <Select
                          styles={selectStyles}
                          options={itemOptions}
                          value={selected || null}
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
                      {selected && onHand != null ? (
                        <p className={`text-xs ${lowStock ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                          On hand: {formatQty(onHand)}
                          {lowStock ? ' — more than current stock (still allowed)' : ''}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save handover
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStationeryHandoversPage

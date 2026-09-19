import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Loader2, Package, Pencil, Plus, Power, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createStationeryItem,
  getStationeryItems,
  setStationeryItemStatus,
  updateStationeryItem,
} from '../../../services/stationeryService'

const CATEGORIES = ['Paper', 'Adhesive', 'Writing', 'Craft', 'Tools', 'Misc']
const emptyForm = { name: '', category: 'Misc', unit: 'pcs', isActive: true }
const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function CampusStationeryItemsPage() {
  const canManage = hasCampusPermission('manage_stationery')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActive, setShowActive] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const sortedRows = useMemo(
    () =>
      [...rows]
        .filter((row) => Boolean(row.isActive) === showActive)
        .filter((row) => categoryFilter === 'all' || row.category === categoryFilter)
        .sort((a, b) => {
          const cat = String(a.category || '').localeCompare(String(b.category || ''))
          if (cat !== 0) return cat
          return String(a.name || '').localeCompare(String(b.name || ''))
        }),
    [rows, showActive, categoryFilter],
  )

  const groupedRows = useMemo(() => {
    const byCategory = new Map()
    for (const row of sortedRows) {
      const key = row.category || 'Misc'
      if (!byCategory.has(key)) byCategory.set(key, [])
      byCategory.get(key).push(row)
    }
    const known = CATEGORIES.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      items: byCategory.get(c),
    }))
    const extras = [...byCategory.keys()]
      .filter((c) => !CATEGORIES.includes(c))
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ category: c, items: byCategory.get(c) }))
    return [...known, ...extras]
  }, [sortedRows])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await getStationeryItems())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load items.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(false)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(true)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      category: row.category || 'Misc',
      unit: row.unit || 'pcs',
      isActive: row.isActive ?? true,
    })
    setIsEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = 'stationery-item-save'
    toast.loading(editingId ? 'Updating item...' : 'Creating item...', { id: toastId })
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim() || 'pcs',
        isActive: Boolean(form.isActive),
      }
      if (editingId) await updateStationeryItem(editingId, payload)
      else await createStationeryItem(payload)
      toast.success(editingId ? 'Item updated.' : 'Item created.', { id: toastId })
      resetForm()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save item.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    try {
      await setStationeryItemStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'Item activated.' : 'Item deactivated.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update item status.')
    }
  }

  return (
    <CampusShell headerContext="Store items">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Package size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Store items</h1>
                  <p className="text-sm text-slate-500">Materials list used for purchases and handovers.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="inline-flex h-10 overflow-hidden rounded-lg border border-slate-300 bg-white p-0.5">
                  <button type="button" onClick={() => setShowActive(true)} className={`rounded-md px-3 text-sm font-medium ${showActive ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600'}`}>Active</button>
                  <button type="button" onClick={() => setShowActive(false)} className={`rounded-md px-3 text-sm font-medium ${!showActive ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600'}`}>Inactive</button>
                </div>
                <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <PermissionControl allowed={canManage}>
                  <button type="button" onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white">
                    <Plus size={18} /> Add item
                  </button>
                </PermissionControl>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-[13px] leading-snug">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) => (
                    <Fragment key={group.category}>
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="px-3 py-2.5 text-base font-bold tracking-wide text-[var(--campus-primary)]">
                          {group.category}
                          <span className="ml-2 text-sm font-medium text-slate-400">
                            {group.items.length}
                          </span>
                        </td>
                      </tr>
                      {group.items.map((row) => (
                        <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/70">
                          <td className="px-3 py-1.5 pl-6 font-medium text-slate-800">{row.name}</td>
                          <td className="px-3 py-1.5 text-slate-600">{row.unit}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {row.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex justify-end gap-1">
                              <PermissionControl allowed={canManage}>
                                <button type="button" onClick={() => startEdit(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 text-[var(--campus-primary)] hover:bg-white" aria-label={`Edit ${row.name}`}>
                                  <Pencil size={16} />
                                </button>
                              </PermissionControl>
                              <PermissionControl allowed={canManage}>
                                <button type="button" onClick={() => void toggleStatus(row)} className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 ${row.isActive ? 'text-rose-500' : 'text-emerald-600'} hover:bg-white`} aria-label="Toggle status">
                                  <Power size={16} />
                                </button>
                              </PermissionControl>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!isLoading && sortedRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No items to show.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit item' : 'Add item'}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Name
                <input className={`${inputClass} mt-1`} value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} maxLength={120} required />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Category
                <select className={`${inputClass} mt-1`} value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Unit
                <input className={`${inputClass} mt-1`} value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} maxLength={20} />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} className="h-4 w-4 accent-[var(--campus-primary)]" />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStationeryItemsPage

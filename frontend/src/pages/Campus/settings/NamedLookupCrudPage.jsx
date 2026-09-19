import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Power, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

/**
 * Shared Active/Inactive named-lookup CRUD used by General Settings pages.
 */
export default function NamedLookupCrudPage({
  title,
  subtitle,
  headerContext,
  icon: Icon,
  nameLabel = 'Name',
  loadRows,
  createRow,
  updateRow,
  setStatus,
  deleteRow,
  extraColumns,
  renderExtraFields,
  mapFormFromRow,
  buildPayload,
  emptyForm = { name: '', isActive: true },
  /** When set, create/edit/status/delete require this permission. */
  managePermission,
}) {
  const canManage = managePermission ? hasCampusPermission(managePermission) : true
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActive, setShowActive] = useState(true)

  const sortedRows = useMemo(
    () =>
      [...rows]
        .filter((row) => Boolean(row.isActive) === showActive)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [rows, showActive],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await loadRows())
    } catch (error) {
      toast.error(error?.response?.data?.message || `Could not load ${title.toLowerCase()}.`)
    } finally {
      setIsLoading(false)
    }
  }, [loadRows, title])

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
    setForm(mapFormFromRow ? mapFormFromRow(row) : { name: row.name || '', isActive: row.isActive ?? true })
    setIsEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = `${title}-save`
    toast.loading(editingId ? 'Saving...' : 'Creating...', { id: toastId })
    try {
      const payload = buildPayload
        ? buildPayload(form)
        : { name: form.name.trim(), isActive: Boolean(form.isActive) }
      if (editingId) await updateRow(editingId, payload)
      else await createRow(payload)
      toast.success(editingId ? 'Updated.' : 'Created.', { id: toastId })
      resetForm()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    try {
      await setStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'Activated.' : 'Deactivated.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update status.')
    }
  }

  const onDelete = async (row) => {
    if (!deleteRow) return
    if (!window.confirm(`Delete "${row.name}"?`)) return
    try {
      await deleteRow(row.id)
      toast.success('Deleted.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete.')
    }
  }

  return (
    <CampusShell headerContext={headerContext || title}>
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-4xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Icon size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  <Plus size={18} /> Add
                </button>
                </PermissionControl>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-[13px] leading-snug">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">{nameLabel}</th>
                  {extraColumns?.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium">{col.label}</th>
                  ))}
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-900">{row.name}</td>
                    {extraColumns?.map((col) => (
                      <td key={col.key} className="px-3 py-1.5 text-slate-700">{col.render(row)}</td>
                    ))}
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex justify-end gap-1">
                        <PermissionControl allowed={canManage}>
                        <button type="button" onClick={() => startEdit(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-[var(--campus-primary)]" aria-label="Edit">
                          <Pencil size={15} />
                        </button>
                        </PermissionControl>
                        <PermissionControl allowed={canManage}>
                        <button type="button" onClick={() => void toggleStatus(row)} className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 ${row.isActive ? 'text-rose-600' : 'text-emerald-600'}`} aria-label="Toggle status">
                          <Power size={15} />
                        </button>
                        </PermissionControl>
                        {deleteRow ? (
                          <PermissionControl allowed={canManage}>
                          <button type="button" onClick={() => void onDelete(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-rose-600" aria-label="Delete">
                            <Trash2 size={15} />
                          </button>
                          </PermissionControl>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && sortedRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">{showActive ? 'No active records.' : 'No inactive records.'}</p>
            ) : null}
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? `Edit ${title.slice(0, -1) || title}` : `Add ${title.slice(0, -1) || title}`}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                {nameLabel}
                <input className={`${inputClass} mt-1`} value={form.name || ''} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
              </label>
              {renderExtraFields ? renderExtraFields(form, setForm, inputClass) : null}
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

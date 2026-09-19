import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Clock, Loader2, Pencil, Plus, Power, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createDesignation,
  deleteDesignation,
  getDesignations,
  setDesignationStatus,
  updateDesignation,
} from '../../../services/designationService'
import { getStoredCampusProfile, isZkTecoAttendance } from '../../../utils/campusProfile'

const emptyForm = {
  name: '',
  mustCheckinMinutesDifference: '',
  mustCheckinTime: '',
  leavingTime: '',
  isActive: true,
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const normalizeForm = (row) => ({
  name: row?.name || '',
  mustCheckinMinutesDifference: row?.mustCheckinMinutesDifference ?? '',
  mustCheckinTime: row?.mustCheckinTime || '',
  leavingTime: row?.leavingTime || '',
  isActive: row?.isActive ?? true,
})

const buildPayload = (form) => ({
  name: form.name.trim(),
  mustCheckinMinutesDifference:
    form.mustCheckinMinutesDifference === '' || form.mustCheckinMinutesDifference == null
      ? null
      : Number(form.mustCheckinMinutesDifference),
  mustCheckinTime: form.mustCheckinTime || null,
  leavingTime: form.leavingTime || null,
  isActive: Boolean(form.isActive),
})

const formatTime = (value) => {
  if (!value) return '-'
  const [hStr, mStr = '00'] = value.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function CampusDesignationsPage() {
  const canManage = hasCampusPermission('manage_designations')
  const hideDutyTimes = isZkTecoAttendance(getStoredCampusProfile())
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [rows],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await getDesignations())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load designations.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }))

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
    setForm(normalizeForm(row))
    setIsEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = 'designation-save'
    toast.loading(editingId ? 'Updating designation...' : 'Creating designation...', { id: toastId })
    try {
      const payload = buildPayload(form)
      if (editingId) await updateDesignation(editingId, payload)
      else await createDesignation(payload)
      toast.success(editingId ? 'Designation updated.' : 'Designation created.', { id: toastId })
      resetForm()
      load()
    } catch (error) {
      const validation = error?.response?.data?.errors
      const firstValidation = validation ? Object.values(validation).flat()[0] : ''
      toast.error(firstValidation || error?.response?.data?.message || 'Could not save designation.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    try {
      await setDesignationStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'Designation activated.' : 'Designation deactivated.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update designation status.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteRow) return
    setIsDeleting(true)
    try {
      await deleteDesignation(deleteRow.id)
      toast.success('Designation deleted.')
      setDeleteRow(null)
      if (editingId === deleteRow.id) resetForm()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete designation.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <CampusShell headerContext="Designations">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <BriefcaseBusiness size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Designations</h1>
                  <p className="text-sm text-slate-500">Manage check-in and checkout timings used for LC calculations.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <PermissionControl allowed={canManage}>
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white"
                >
                  <Plus size={18} /> Add designation
                </button>
                </PermissionControl>
              </div>
            </div>
          </section>

          <section className="overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className={`w-full text-left text-[13px] leading-snug ${hideDutyTimes ? 'min-w-[520px]' : 'min-w-[760px]'}`}>
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Designation</th>
                      {hideDutyTimes ? null : (
                        <>
                          <th className="px-3 py-2 font-medium">Check-in</th>
                          <th className="px-3 py-2 font-medium">Checkout</th>
                        </>
                      )}
                      <th className="px-3 py-2 font-medium">Grace</th>
                      <th className="px-3 py-2 font-medium">Employees</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-[var(--campus-primary)]">
                              <BriefcaseBusiness size={16} />
                            </div>
                            <span className="font-semibold text-slate-900">{row.name || '-'}</span>
                          </div>
                        </td>
                        {hideDutyTimes ? null : (
                          <>
                            <td className="px-3 py-1.5 font-mono text-xs text-slate-700">{formatTime(row.mustCheckinTime)}</td>
                            <td className="px-3 py-1.5 font-mono text-xs text-slate-700">{formatTime(row.leavingTime)}</td>
                          </>
                        )}
                        <td className="px-3 py-1.5">{row.mustCheckinMinutesDifference ?? '-'}</td>
                        <td className="px-3 py-1.5">{row.employeeCount || 0}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex justify-end gap-1">
                            <PermissionControl allowed={canManage}>
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-[var(--campus-primary)] hover:bg-indigo-50"
                              aria-label={`Edit ${row.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            </PermissionControl>
                            <PermissionControl allowed={canManage}>
                            <button
                              type="button"
                              onClick={() => void toggleStatus(row)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 ${
                                row.isActive ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                              aria-label={row.isActive ? `Deactivate ${row.name}` : `Activate ${row.name}`}
                            >
                              <Power size={16} />
                            </button>
                            </PermissionControl>
                            <PermissionControl allowed={canManage}>
                            <button
                              type="button"
                              onClick={() => setDeleteRow(row)}
                              disabled={(row.employeeCount || 0) > 0}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={`Delete ${row.name}`}
                              title={(row.employeeCount || 0) > 0 ? 'Assigned designations cannot be deleted' : 'Delete designation'}
                            >
                              <Trash2 size={16} />
                            </button>
                            </PermissionControl>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
                  Loading designations...
                </div>
              ) : null}

              {!isLoading && sortedRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No designations found.</p>
              ) : null}
            </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId ? 'Edit designation' : 'Add designation'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {hideDutyTimes
                      ? 'Duty times come from Institute Settings when importing attendance.'
                      : 'Set time-only values for attendance rules.'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Designation
                <input
                  className={`${inputClass} mt-1`}
                  value={form.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  maxLength={250}
                  required
                />
              </label>

              {hideDutyTimes ? null : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Check-in
                  <div className="relative mt-1">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      className={`${inputClass} pl-9`}
                      value={form.mustCheckinTime}
                      onChange={(event) => setValue('mustCheckinTime', event.target.value)}
                    />
                  </div>
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Checkout
                  <div className="relative mt-1">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      className={`${inputClass} pl-9`}
                      value={form.leavingTime}
                      onChange={(event) => setValue('leavingTime', event.target.value)}
                    />
                  </div>
                </label>
              </div>
              )}

              <label className="block text-xs font-semibold uppercase text-slate-500">
                Grace minutes
                <input
                  type="number"
                  min="0"
                  max="1440"
                  className={`${inputClass} mt-1`}
                  value={form.mustCheckinMinutesDifference}
                  onChange={(event) => setValue('mustCheckinMinutesDifference', event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(event) => setValue('isActive', event.target.checked)}
                  className="h-4 w-4 accent-[var(--campus-primary)]"
                />
                Active designation
              </label>
            </div>

            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344574] disabled:opacity-60">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? 'Save changes' : 'Create designation'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteRow ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Delete designation?</h2>
                <p className="mt-1 text-sm text-slate-600">{deleteRow.name} will be removed permanently.</p>
              </div>
              <button type="button" onClick={() => setDeleteRow(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isDeleting} onClick={() => setDeleteRow(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="button" disabled={isDeleting} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusDesignationsPage

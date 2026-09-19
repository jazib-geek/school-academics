import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Layers3, Loader2, Pencil, Plus, Power, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createSettingSection,
  getSectionColors,
  getSettingClasses,
  getSettingSections,
  setSettingSectionStatus,
  updateSettingSection,
} from '../../../services/campusSettingsService'

const BRANCHES = ['Junior', 'Primary', 'High Girls', 'High Boys']
const GENDERS = ['Male', 'Female', 'Mix']

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const emptyForm = {
  classId: '',
  colorId: '',
  branch: '',
  gender: '',
  fee: '0',
  isHifz: false,
  isActive: true,
}

export default function CampusSectionsPage() {
  const canManage = hasCampusPermission('param_class')
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [colors, setColors] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActive, setShowActive] = useState(true)

  const filtered = useMemo(
    () => rows.filter((row) => Boolean(row.isActive) === showActive),
    [rows, showActive],
  )

  const grouped = useMemo(() => {
    const map = new Map()
    for (const row of filtered) {
      const key = row.branch || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(row)
    }
    return [...map.entries()]
  }, [filtered])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [sectionRows, classRows, colorRows] = await Promise.all([
        getSettingSections(),
        getSettingClasses(),
        getSectionColors(),
      ])
      setRows(sectionRows || [])
      setClasses((classRows || []).filter((x) => x.isActive))
      setColors((colorRows || []).filter((x) => x.isActive))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load sections.')
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
      classId: row.classId ?? '',
      colorId: row.colorId ?? '',
      branch: row.branch || '',
      gender: row.gender || '',
      fee: String(row.fee ?? 0),
      isHifz: Boolean(row.isHifz),
      isActive: row.isActive ?? true,
    })
    setIsEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = 'section-save'
    toast.loading(editingId ? 'Updating section...' : 'Creating section...', { id: toastId })
    try {
      const payload = {
        classId: Number(form.classId),
        colorId: Number(form.colorId),
        branch: form.branch || null,
        gender: form.gender || null,
        fee: Number(form.fee) || 0,
        isHifz: Boolean(form.isHifz),
        isActive: Boolean(form.isActive),
      }
      if (editingId) await updateSettingSection(editingId, payload)
      else await createSettingSection(payload)
      toast.success(editingId ? 'Section updated.' : 'Section created.', { id: toastId })
      resetForm()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save section.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    try {
      await setSettingSectionStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'Section activated.' : 'Section deactivated.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update status.')
    }
  }

  let serial = 0

  return (
    <CampusShell headerContext="Sections">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Layers3 size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Sections by class</h1>
                  <p className="text-sm text-slate-500">Class + color combinations with fee and branch.</p>
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
                  <Plus size={18} /> Add section
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
                  <th className="px-3 py-2 font-medium">Class</th>
                  <th className="px-3 py-2 font-medium">Fee</th>
                  <th className="px-3 py-2 font-medium">Active students</th>
                  <th className="px-3 py-2 font-medium">Gender</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([branch, items]) => (
                  <Fragment key={`branch-${branch}`}>
                    <tr className="bg-sky-50">
                      <td colSpan={6} className="px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-sky-800">{branch}</td>
                    </tr>
                    {items.map((row) => {
                      serial += 1
                      return (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-slate-500">{serial}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{row.displayName || '—'}</td>
                          <td className="px-3 py-1.5">{row.fee?.toLocaleString?.() ?? row.fee}</td>
                          <td className="px-3 py-1.5 font-semibold">{row.activeStudentCount ?? 0}</td>
                          <td className="px-3 py-1.5">{row.gender || '—'}</td>
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
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!isLoading && filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No sections found.</p>
            ) : null}
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={submit} role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit section' : 'Add new section'}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Class name
                <select className={`${inputClass} mt-1`} value={form.classId} onChange={(e) => setForm((c) => ({ ...c, classId: e.target.value }))} required>
                  <option value="">--- select class ---</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Color
                <select className={`${inputClass} mt-1`} value={form.colorId} onChange={(e) => setForm((c) => ({ ...c, colorId: e.target.value }))} required>
                  <option value="">--- select color ---</option>
                  {colors.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Gender
                <select className={`${inputClass} mt-1`} value={form.gender} onChange={(e) => setForm((c) => ({ ...c, gender: e.target.value }))}>
                  <option value="">-- Section gender --</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Branch
                <select className={`${inputClass} mt-1`} value={form.branch} onChange={(e) => setForm((c) => ({ ...c, branch: e.target.value }))}>
                  <option value="">-- Section Branch --</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Fee
                <input type="number" min="0" className={`${inputClass} mt-1`} value={form.fee} onChange={(e) => setForm((c) => ({ ...c, fee: e.target.value }))} required />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(form.isHifz)} onChange={(e) => setForm((c) => ({ ...c, isHifz: e.target.checked }))} className="h-4 w-4 accent-[var(--campus-primary)]" />
                Is Hifz
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

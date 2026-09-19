import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Megaphone, Pencil, Plus, Power, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import RichTextEditor from '../../../components/campus/RichTextEditor.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createAnnouncement,
  getAnnouncementsManageList,
  setAnnouncementStatus,
  updateAnnouncement,
} from '../../../services/newsAndEventsService'

const emptyForm = {
  title: '',
  type: 'Announcement',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  imagePath: '',
  isActive: true,
  showOnHome: true,
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim()
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CampusAnnouncementsPage() {
  const canManage = hasCampusPermission('manage_family_announcements')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActive, setShowActive] = useState(true)
  const [query, setQuery] = useState('')

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((row) => Boolean(row.isActive) === showActive)
      .filter((row) => {
        if (!q) return true
        return (
          String(row.title || '').toLowerCase().includes(q) ||
          String(row.type || '').toLowerCase().includes(q) ||
          stripHtml(row.description).toLowerCase().includes(q)
        )
      })
  }, [rows, showActive, query])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await getAnnouncementsManageList())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load announcements.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(false)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setIsEditorOpen(true)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      title: row.title || '',
      type: row.type || 'Announcement',
      date: row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: row.description || '',
      imagePath: row.imagePath || '',
      isActive: row.isActive ?? true,
      showOnHome: row.showOnHome ?? false,
    })
    setIsEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    setIsSaving(true)
    const toastId = 'announcement-save'
    toast.loading(editingId ? 'Updating announcement…' : 'Saving announcement…', { id: toastId })
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type.trim() || 'Announcement',
        date: form.date || null,
        description: form.description || '',
        imagePath: form.imagePath.trim() || null,
        isActive: Boolean(form.isActive),
        showOnHome: Boolean(form.showOnHome),
      }
      if (editingId) await updateAnnouncement(editingId, payload)
      else await createAnnouncement(payload)
      toast.success(editingId ? 'Announcement updated.' : 'Announcement saved.', { id: toastId })
      resetForm()
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save announcement.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    try {
      await setAnnouncementStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'Announcement activated.' : 'Announcement deactivated.')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update status.')
    }
  }

  return (
    <CampusShell headerContext="Announcements">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
                  <p className="text-sm text-slate-500">News and events shown in the Family Portal app.</p>
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
                    <Plus className="h-4 w-4" />
                    New
                  </button>
                </PermissionControl>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or details…"
                className={inputClass}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-[13px] leading-snug">
                <thead className="bg-[var(--campus-primary)] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Home</th>
                    <th className="px-3 py-2 text-left font-medium">Preview</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No announcements found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{formatDate(row.date)}</td>
                        <td className="px-3 py-1.5 font-medium text-slate-800">{row.title}</td>
                        <td className="px-3 py-1.5 text-slate-600">{row.type || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-600">{row.showOnHome ? 'Yes' : 'No'}</td>
                        <td className="max-w-md px-3 py-1.5 text-slate-600">
                          {row.description ? (
                            <div
                              className="line-clamp-3 break-words [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:m-0 [&_li]:my-0"
                              dangerouslySetInnerHTML={{ __html: row.description }}
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex justify-end gap-1">
                            <PermissionControl allowed={canManage}>
                              <button type="button" title="Edit" onClick={() => startEdit(row)} className="btn-icon-soft btn-table-action">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </PermissionControl>
                            <PermissionControl allowed={canManage}>
                              <button type="button" title={row.isActive ? 'Deactivate' : 'Activate'} onClick={() => void toggleStatus(row)} className="btn-icon-soft btn-table-action">
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            </PermissionControl>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {isEditorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) resetForm()
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit announcement' : 'New announcement'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Title</span>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    autoFocus
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Type</span>
                  <select
                    className={inputClass}
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="Announcement">Announcement</option>
                    <option value="Event">Event</option>
                    <option value="News">News</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Image path (optional)</span>
                  <input
                    className={inputClass}
                    value={form.imagePath}
                    onChange={(e) => setForm((f) => ({ ...f, imagePath: e.target.value }))}
                    placeholder="/uploads/…"
                  />
                </label>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">Details</span>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                  disabled={isSaving}
                  placeholder="Write the full announcement…"
                />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.showOnHome}
                    onChange={(e) => setForm((f) => ({ ...f, showOnHome: e.target.checked }))}
                  />
                  Show on home
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

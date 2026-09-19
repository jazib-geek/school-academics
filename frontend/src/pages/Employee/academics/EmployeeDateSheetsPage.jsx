import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2, X, Eye } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import { getClassLevels } from '../../../services/classService'
import {
  createDateSheet,
  deleteDateSheet,
  getDateSheets,
} from '../../../services/campusDateSheetService'
import {
  MAX_NON_SUNDAY_DAYS,
  countNonSundayDays,
  formatClassLevelLabel,
  formatDateRangeLabel,
  getId,
  getText,
} from '../../Campus/datesheets/dateSheetHelpers'

const emptyCreate = () => ({
  name: '',
  displayTitle: '',
  subtitle: '',
  startDate: '',
  endDate: '',
  classIDs: [],
})

function CreateSheet({ open, onClose, onCreated, classLevels }) {
  const [form, setForm] = useState(emptyCreate)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyCreate())
      setSearch('')
    }
  }, [open])

  if (!open) return null

  const examDayCount = countNonSundayDays(form.startDate, form.endDate)
  const filtered = classLevels.filter((item) =>
    formatClassLevelLabel(item).toLowerCase().includes(search.trim().toLowerCase()),
  )

  const toggle = (id) => {
    setForm((c) => ({
      ...c,
      classIDs: c.classIDs.includes(id) ? c.classIDs.filter((x) => x !== id) : [...c.classIDs, id],
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('Datesheet name is required.')
      return
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Choose a start and end date.')
      return
    }
    if (form.endDate < form.startDate) {
      toast.error('End date must be on or after the start date.')
      return
    }
    if (form.classIDs.length === 0) {
      toast.error('Select at least one class.')
      return
    }
    if (examDayCount === 0) {
      toast.error('The selected range has no exam days (Sundays are not used).')
      return
    }
    if (examDayCount > MAX_NON_SUNDAY_DAYS) {
      toast.error(`Choose a shorter date range (up to ${MAX_NON_SUNDAY_DAYS} exam days).`)
      return
    }

    setSaving(true)
    const toastId = 'emp-ds-create'
    toast.loading('Creating datesheet…', { id: toastId })
    try {
      const name = form.name.trim()
      const created = await createDateSheet({
        name,
        displayTitle: form.displayTitle.trim() || name,
        subtitle: form.subtitle.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        classes: form.classIDs.map((classID) => ({ classID })),
      })
      toast.success('Datesheet created.', { id: toastId })
      onCreated(created)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not create datesheet.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-base font-bold text-slate-900">New datesheet</p>
          <p className="text-xs text-slate-500">Name, dates, and classes</p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <label className="block text-sm font-medium text-slate-700">
            Datesheet name
            <input
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Print heading (optional)
            <input
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              value={form.displayTitle}
              onChange={(e) => setForm((c) => ({ ...c, displayTitle: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-medium text-slate-700">
              From
              <input
                type="date"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={form.startDate}
                onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              To
              <input
                type="date"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={form.endDate}
                onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                required
              />
            </label>
          </div>
          {form.startDate && form.endDate ? (
            <p className="text-xs text-slate-500">{examDayCount} exam day{examDayCount === 1 ? '' : 's'}</p>
          ) : null}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Classes</p>
              <span className="text-xs text-slate-500">{form.classIDs.length} selected</span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class…"
              className="mb-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
            />
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
              {filtered.map((item) => {
                const id = getId(item, 'id', 'ID')
                const checked = form.classIDs.includes(id)
                return (
                  <label
                    key={id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      checked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                    <span className="truncate font-medium">{formatClassLevelLabel(item)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button type="button" onClick={onClose} disabled={saving} className="emp-cta-btn h-12 flex-1 border-slate-200 text-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="emp-cta-btn emp-cta-btn-success h-12 flex-[1.4]">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

function EmployeeDateSheetsPage() {
  const navigate = useNavigate()
  const canEdit = hasEmployeeAppAccess('canEditDatesheet')
  const [rows, setRows] = useState([])
  const [classLevels, setClassLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, levels] = await Promise.all([getDateSheets(), getClassLevels()])
      setRows(list)
      setClassLevels(levels)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load datesheets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleteRow) return
    setDeleting(true)
    try {
      await deleteDateSheet(getId(deleteRow, 'id', 'ID'))
      toast.success('Datesheet deleted.')
      setDeleteRow(null)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete datesheet.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <EmployeeLayout
      title="Datesheets"
      subtitle="Exam date sheets by class"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <button
          type="button"
          onClick={() => canEdit && setCreateOpen(true)}
          disabled={!canEdit}
          className="emp-cta-btn emp-cta-btn-primary flex h-12 w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} /> New datesheet
        </button>

        {loading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center text-sm text-slate-500">
            No datesheets yet.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const id = getId(row, 'id', 'ID')
              const dayCount = getId(row, 'dayCount', 'DayCount')
              const classCount = getId(row, 'classCount', 'ClassCount')
              const entryCount = getId(row, 'entryCount', 'EntryCount')
              const subtitle = getText(row, 'subtitle', 'Subtitle')
              return (
                <div key={id} className="emp-surface rounded-2xl px-4 py-3">
                  <p className="font-semibold text-slate-900">{getText(row, 'name', 'Name')}</p>
                  {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
                  <p className="mt-1 text-xs text-slate-600">
                    {formatDateRangeLabel(
                      getText(row, 'startDate', 'StartDate'),
                      getText(row, 'endDate', 'EndDate'),
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {dayCount} days · {classCount} classes · {entryCount} filled
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/employee/academics/datesheets/${id}`)}
                      className="emp-cta-btn emp-cta-btn-primary h-10 flex-1"
                    >
                      {canEdit ? <Pencil size={15} /> : <Eye size={15} />}
                      {canEdit ? 'Edit' : 'View'}
                    </button>
                    <button
                      type="button"
                      onClick={() => canEdit && setDeleteRow(row)}
                      disabled={!canEdit}
                      className="emp-cta-btn emp-cta-btn-danger h-10 px-3 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false)
          const id = getId(created, 'id', 'ID')
          if (id) navigate(`/employee/academics/datesheets/${id}`)
          else load()
        }}
        classLevels={classLevels}
      />

      {deleteRow ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete datesheet?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes <span className="font-medium">{getText(deleteRow, 'name', 'Name')}</span>.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeleteRow(null)} disabled={deleting} className="emp-cta-btn h-11 flex-1 border-slate-200 text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="emp-cta-btn emp-cta-btn-danger h-11 flex-1">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeDateSheetsPage

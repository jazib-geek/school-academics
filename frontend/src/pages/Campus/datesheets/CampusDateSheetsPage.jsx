import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, Loader2, Pencil, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell'
import { getCampusLabel } from '../../../constants/branding'
import { getClassLevels } from '../../../services/classService'
import {
  createDateSheet,
  deleteDateSheet,
  getDateSheetPrint,
  getDateSheets,
} from '../../../services/campusDateSheetService'
import {
  MAX_NON_SUNDAY_DAYS,
  countNonSundayDays,
  formatClassLevelLabel,
  formatDateRangeLabel,
  getId,
  getText,
} from './dateSheetHelpers'
import { openDateSheetPrint } from './dateSheetPrint'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const emptyCreate = () => ({
  name: '',
  displayTitle: '',
  subtitle: '',
  startDate: '',
  endDate: '',
  classIDs: [],
})

function MultiCheckList({ items, selected, onChange, getLabel, searchPlaceholder }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => getLabel(item).toLowerCase().includes(needle))
  }, [getLabel, items, search])

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[var(--campus-primary)]"
        />
        <span className="shrink-0 text-xs font-medium text-slate-500">{selected.length} selected</span>
      </div>
      <div className="max-h-52 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-slate-400">No matches.</p>
        ) : (
          filtered.map((item) => {
            const id = getId(item, 'id', 'ID')
            const checked = selected.includes(id)
            return (
              <label
                key={id}
                className={`mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  checked ? 'bg-indigo-50 text-[var(--campus-primary)]' : 'hover:bg-slate-50'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="rounded border-slate-300" />
                <span className="truncate">{getLabel(item)}</span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}

function CreateDateSheetModal({ open, onClose, onCreated, classLevels }) {
  const [form, setForm] = useState(emptyCreate)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(emptyCreate())
  }, [open])

  const examDayCount = useMemo(
    () => countNonSundayDays(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  )

  if (!open) return null

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
      toast.error('The selected range has no exam days after Sundays are skipped.')
      return
    }
    if (examDayCount > MAX_NON_SUNDAY_DAYS) {
      toast.error(`Choose a shorter date range (up to ${MAX_NON_SUNDAY_DAYS} exam days).`)
      return
    }

    setSaving(true)
    const toastId = 'ds-create'
    toast.loading('Creating datesheet...', { id: toastId })
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-8 sm:pt-12">
      <form
        onSubmit={submit}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New datesheet</h2>
            <p className="text-sm text-slate-500">Name, date range, and classes. Sundays are skipped.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Datesheet name</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. Revised Date Sheet"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Print heading</span>
              <input
                className={inputClass}
                value={form.displayTitle}
                onChange={(e) => setForm((c) => ({ ...c, displayTitle: e.target.value }))}
                placeholder="Defaults to name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Subtitle</span>
              <input
                className={inputClass}
                value={form.subtitle}
                onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
                placeholder="e.g. ANNUAL TERM EXAM 2025-26"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">From</span>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">To</span>
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                required
              />
            </label>
          </div>
          {form.startDate && form.endDate ? (
            <p className="text-xs text-slate-500">
              {examDayCount} exam day{examDayCount === 1 ? '' : 's'} (Sundays skipped)
              {examDayCount > MAX_NON_SUNDAY_DAYS ? ` — max ${MAX_NON_SUNDAY_DAYS}` : ''}
            </p>
          ) : null}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Classes</h3>
            <MultiCheckList
              items={classLevels}
              selected={form.classIDs}
              onChange={(classIDs) => setForm((c) => ({ ...c, classIDs }))}
              getLabel={formatClassLevelLabel}
              searchPlaceholder="Search classes"
            />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CampusDateSheetsPage() {
  const navigate = useNavigate()
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

  const printRow = async (row) => {
    const id = getId(row, 'id', 'ID')
    try {
      const detail = await getDateSheetPrint(id)
      const campusLabel = getCampusLabel(localStorage.getItem('campus') || '')
      if (!openDateSheetPrint(detail, { campusLabel })) {
        toast.error('Allow pop-ups to print.')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load print data.')
    }
  }

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
    <CampusShell headerContext="Datesheets">
      <div className="px-4 pb-10 pt-[4.25rem] sm:px-6 md:pt-[4.5rem] lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-[var(--campus-primary)]">
                  <CalendarRange size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Datesheets</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Build exam date sheets by class and date, then print for notice boards.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574]"
                >
                  <Plus size={16} />
                  New datesheet
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-slate-600">No datesheets yet.</p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Create first datesheet
                </button>
              </div>
            ) : (
              <table className="min-w-full text-[13px] leading-snug">
                <thead className="border-b border-slate-200 bg-white text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Date range</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const id = getId(row, 'id', 'ID')
                    const dayCount = getId(row, 'dayCount', 'DayCount')
                    const classCount = getId(row, 'classCount', 'ClassCount')
                    const entryCount = getId(row, 'entryCount', 'EntryCount')
                    const subtitle = getText(row, 'subtitle', 'Subtitle')
                    return (
                      <tr key={id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-3 py-1.5">
                          <div className="font-semibold text-slate-900">{getText(row, 'name', 'Name')}</div>
                          {subtitle ? <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div> : null}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {formatDateRangeLabel(
                            getText(row, 'startDate', 'StartDate'),
                            getText(row, 'endDate', 'EndDate'),
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {dayCount} days · {classCount} classes · {entryCount} filled
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => navigate(`/campus/datesheets/${id}`)}
                              className="btn-icon-soft"
                            >
                              <Pencil size={15} />
                            </button>
                            <button type="button" title="Print" onClick={() => printRow(row)} className="btn-icon-soft">
                              <Printer size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteRow(row)}
                              className="btn-icon-soft btn-icon-soft--danger"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <CreateDateSheetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classLevels={classLevels}
        onCreated={(created) => {
          setCreateOpen(false)
          const id = getId(created, 'id', 'ID')
          if (id) navigate(`/campus/datesheets/${id}`)
          else load()
        }}
      />

      {deleteRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete datesheet?</h3>
            <p className="mt-2 text-sm text-slate-600">
              “{getText(deleteRow, 'name', 'Name')}” will be removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

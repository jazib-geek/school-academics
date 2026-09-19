import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Star, Trash2, X, Eye } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import { getClasses } from '../../../services/classService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  clearTimetableDefault,
  createTimetable,
  deleteTimetable,
  getTimetables,
  setTimetableDefault,
} from '../../../services/campusTimeTableService'
import {
  TT_FORMAT,
  TT_FORMAT_META,
  buildDefaultPeriods,
  formatClassLabel,
  formatTimetableSubline,
  formatTimetableSummary,
  getId,
  getText,
} from '../../Campus/timetables/timetableHelpers'
import TimetablePopupLoader from '../../Campus/timetables/TimetablePopupLoader'
import { useTimetableUiFeedback } from '../../Campus/timetables/timetableUiFeedback'

const emptyCreate = () => ({
  name: '',
  formatType: TT_FORMAT.CLASS_WISE,
  displayTitle: '',
  subtitle: '',
  isDefault: false,
  seedFromAllocation: true,
  sectionIDs: [],
  employeeIDs: [],
  periods: buildDefaultPeriods(8),
})

function CreateSheet({ open, onClose, onCreated, classes, employees }) {
  const [form, setForm] = useState(emptyCreate)
  const [memberSearch, setMemberSearch] = useState('')
  const { loaderOpen, loaderText, showError, runAsync } = useTimetableUiFeedback()
  const meta = TT_FORMAT_META[form.formatType]

  useEffect(() => {
    if (open) {
      setForm(emptyCreate())
      setMemberSearch('')
    }
  }, [open])

  if (!open) return null

  const memberItems = meta.needsClasses
    ? classes.map((item) => ({
        id: getId(item, 'id', 'ID'),
        label: formatClassLabel(item),
      }))
    : employees.map((item) => ({
        id: getId(item, 'id', 'ID'),
        label: getText(item, 'employeeName', 'EmployeeName') || 'Teacher',
      }))

  const selected = meta.needsClasses ? form.sectionIDs : form.employeeIDs
  const setSelected = (ids) =>
    setForm((c) =>
      meta.needsClasses ? { ...c, sectionIDs: ids } : { ...c, employeeIDs: ids },
    )

  const filteredMembers = memberItems.filter((item) =>
    item.label.toLowerCase().includes(memberSearch.trim().toLowerCase()),
  )
  const filteredIds = filteredMembers.map((item) => item.id)
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id))

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id))
    else setSelected([...selected, id])
  }

  const toggleSelectAllVisible = () => {
    if (filteredIds.length === 0) return
    if (allVisibleSelected) {
      const hide = new Set(filteredIds)
      setSelected(selected.filter((id) => !hide.has(id)))
      return
    }
    const next = new Set(selected)
    filteredIds.forEach((id) => next.add(id))
    setSelected([...next])
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      showError('Name is required.', 'Missing name')
      return
    }
    if (meta.needsClasses && form.sectionIDs.length === 0) {
      showError('Select at least one class.', 'Missing classes')
      return
    }
    if (meta.needsTeachers && form.employeeIDs.length === 0) {
      showError('Select at least one teacher.', 'Missing teachers')
      return
    }

    try {
      const created = await runAsync('Creating timetable…', () =>
        createTimetable({
          name: form.name.trim(),
          formatType: form.formatType,
          displayTitle: form.displayTitle.trim() || null,
          subtitle: form.subtitle.trim() || null,
          isDefault: form.isDefault,
          seedFromAllocation: form.seedFromAllocation,
          sectionIDs: form.sectionIDs,
          employeeIDs: form.employeeIDs,
          periods: form.periods,
        }),
      )
      onCreated(created)
    } catch {
      /* feedback shown */
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-base font-bold text-slate-900">New timetable</p>
          <p className="text-xs text-slate-500">Choose format and members</p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {Object.values(TT_FORMAT_META).map((item) => {
              const active = form.formatType === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      formatType: item.id,
                      periods: buildDefaultPeriods(item.defaultPeriodCount),
                      sectionIDs: item.needsClasses ? c.sectionIDs : [],
                      employeeIDs: item.needsTeachers ? c.employeeIDs : [],
                    }))
                  }
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    active ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                </button>
              )
            })}
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. High Boys 2026"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Print title (optional)
            <input
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              value={form.displayTitle}
              onChange={(e) => setForm((c) => ({ ...c, displayTitle: e.target.value }))}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                {meta.needsClasses ? 'Classes' : 'Teachers'}
              </p>
              <span className="text-xs text-slate-500">{selected.length} selected</span>
            </div>
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search…"
              className="mb-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              disabled={filteredIds.length === 0}
              onClick={toggleSelectAllVisible}
              className="mb-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-indigo-700 disabled:text-slate-300"
            >
              {allVisibleSelected ? 'Clear' : 'Select all'}
            </button>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
              {filteredMembers.map((item) => {
                const checked = selected.includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      checked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} />
                    <span className="truncate font-medium">{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.seedFromAllocation}
              onChange={(e) => setForm((c) => ({ ...c, seedFromAllocation: e.target.checked }))}
            />
            Import slots from subject allocation
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((c) => ({ ...c, isDefault: e.target.checked }))}
            />
            Set as default for this format
          </label>
        </div>
        <div className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button type="button" onClick={onClose} disabled={loaderOpen} className="emp-cta-btn h-12 flex-1 border-slate-200 text-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={loaderOpen} className="emp-cta-btn emp-cta-btn-success h-12 flex-[1.4]">
            <Plus size={16} />
            Create
          </button>
        </div>
      </form>
      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </div>
  )
}

function EmployeeTimetablesPage() {
  const navigate = useNavigate()
  const canEdit = hasEmployeeAppAccess('canEditTimetable')
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const {
    loaderOpen,
    loaderText,
    showLoader,
    hideLoader,
    showError,
    runAsync,
  } = useTimetableUiFeedback()

  const load = useCallback(async () => {
    setLoading(true)
    showLoader('Loading timetables…')
    try {
      const [list, classRows, employeeRows] = await Promise.all([
        getTimetables(),
        getClasses(),
        getTeacherAssignmentEmployees(),
      ])
      setRows(list)
      setClasses(classRows)
      setEmployees(employeeRows)
    } catch (error) {
      showError(error?.response?.data?.message || 'Could not load timetables.', 'Could not load')
    } finally {
      hideLoader()
      setLoading(false)
    }
  }, [hideLoader, showError, showLoader])

  useEffect(() => {
    load()
  }, [load])

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aDefault = a.isDefault || a.IsDefault ? 1 : 0
        const bDefault = b.isDefault || b.IsDefault ? 1 : 0
        if (aDefault !== bDefault) return bDefault - aDefault
        return String(getText(a, 'name', 'Name')).localeCompare(String(getText(b, 'name', 'Name')))
      }),
    [rows],
  )

  const toggleDefault = async (row) => {
    const id = getId(row, 'id', 'ID')
    const isDefault = Boolean(row.isDefault || row.IsDefault)
    try {
      await runAsync(
        isDefault ? 'Removing default…' : 'Setting default…',
        () => (isDefault ? clearTimetableDefault(id) : setTimetableDefault(id)),
        {
          successMessage: isDefault ? 'Default removed.' : 'Default timetable updated.',
        },
      )
      load()
    } catch {
      /* feedback shown */
    }
  }

  const confirmDelete = async () => {
    if (!deleteRow) return
    try {
      await runAsync('Deleting timetable…', () => deleteTimetable(getId(deleteRow, 'id', 'ID')), {
        successMessage: 'Timetable deleted.',
      })
      setDeleteRow(null)
      load()
    } catch {
      /* feedback shown */
    }
  }

  return (
    <EmployeeLayout
      title="Timetables"
      subtitle="Class and teacher schedules"
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
          <Plus size={18} /> New timetable
        </button>

        {loading && !sortedRows.length ? (
          <div className="emp-surface rounded-2xl py-16" aria-hidden />
        ) : sortedRows.length === 0 ? (
          <div className="emp-surface rounded-2xl px-4 py-12 text-center text-sm text-slate-500">
            No timetables yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedRows.map((row) => {
              const id = getId(row, 'id', 'ID')
              const formatType = getId(row, 'formatType', 'FormatType')
              const isDefault = Boolean(row.isDefault || row.IsDefault)
              const subline = formatTimetableSubline(row)
              return (
                <div key={id} className="emp-surface rounded-2xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{getText(row, 'name', 'Name')}</p>
                        {isDefault ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-indigo-700">
                        {TT_FORMAT_META[formatType]?.label || 'Timetable'}
                      </p>
                      {subline ? <p className="mt-0.5 text-xs text-slate-500">{subline}</p> : null}
                      <p className="mt-1 text-xs text-slate-500">{formatTimetableSummary(row)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/employee/academics/timetables/${id}`)}
                      className="emp-cta-btn emp-cta-btn-primary h-10 flex-1"
                    >
                      {canEdit ? <Pencil size={15} /> : <Eye size={15} />}
                      {canEdit ? 'Edit' : 'View'}
                    </button>
                    <button
                      type="button"
                      onClick={() => canEdit && toggleDefault(row)}
                      disabled={!canEdit || loaderOpen}
                      className="emp-cta-btn emp-cta-btn-warning h-10 px-3 disabled:opacity-50"
                      aria-label={isDefault ? 'Clear default' : 'Set default'}
                    >
                      <Star size={15} />
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
          if (id) navigate(`/employee/academics/timetables/${id}`)
          else load()
        }}
        classes={classes}
        employees={employees}
      />

      {deleteRow ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete timetable?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes <span className="font-medium">{getText(deleteRow, 'name', 'Name')}</span>.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeleteRow(null)} disabled={loaderOpen} className="emp-cta-btn h-11 flex-1 border-slate-200 text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={loaderOpen} className="emp-cta-btn emp-cta-btn-danger h-11 flex-1">
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </EmployeeLayout>
  )
}

export default EmployeeTimetablesPage

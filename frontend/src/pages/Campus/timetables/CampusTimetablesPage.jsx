import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell'
import { getCampusLabel } from '../../../constants/branding'
import { getClasses } from '../../../services/classService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  clearTimetableDefault,
  createTimetable,
  deleteTimetable,
  getTimetablePrint,
  getTimetables,
  setTimetableDefault,
} from '../../../services/campusTimeTableService'
import {
  TT_FORMAT,
  TT_FORMAT_META,
  applyBreakToTeachingPeriods,
  buildDefaultPeriods,
  displayPeriodToBaseNumber,
  formatClassLabel,
  formatTimetableSubline,
  formatTimetableSummary,
  getId,
  getText,
  isBreakPeriod,
  periodsToPayload,
} from './timetableHelpers'
import { openTimetablePrint } from './timetablePrint'
import TimetablePopupLoader from './TimetablePopupLoader'
import { useTimetableUiFeedback } from './timetableUiFeedback'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const FORMAT_ORDER = [TT_FORMAT.CLASS_WISE, TT_FORMAT.TEACHER_WISE_FREE, TT_FORMAT.TEACHER_WISE_FULL]

const emptyCreate = () => ({
  name: '',
  formatType: TT_FORMAT.CLASS_WISE,
  displayTitle: '',
  subtitle: '',
  isDefault: false,
  seedFromAllocation: true,
  sectionIDs: [],
  employeeIDs: [],
  basePeriods: buildDefaultPeriods(8),
  breakEnabled: false,
  breakAfterPeriod: 3,
  breakMinutes: 30,
})

function MultiCheckList({ items, selected, onChange, getLabel, searchPlaceholder }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => getLabel(item).toLowerCase().includes(needle))
  }, [getLabel, items, search])

  const filteredIds = useMemo(
    () => filtered.map((item) => getId(item, 'id', 'ID')).filter(Boolean),
    [filtered],
  )
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id))

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  const toggleSelectAllVisible = () => {
    if (filteredIds.length === 0) return
    if (allVisibleSelected) {
      const hide = new Set(filteredIds)
      onChange(selected.filter((id) => !hide.has(id)))
      return
    }
    const next = new Set(selected)
    filteredIds.forEach((id) => next.add(id))
    onChange([...next])
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
        <button
          type="button"
          disabled={filteredIds.length === 0}
          onClick={toggleSelectAllVisible}
          className="shrink-0 text-xs font-semibold text-[var(--campus-primary)] hover:underline disabled:text-slate-300 disabled:no-underline"
        >
          {allVisibleSelected ? 'Clear' : 'Select all'}
        </button>
        <span className="shrink-0 text-xs font-medium text-slate-500">{selected.length} selected</span>
      </div>
      <div className="max-h-44 overflow-y-auto p-2">
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

function CreateTimetableModal({ open, onClose, onCreated, classes, employees }) {
  const [form, setForm] = useState(emptyCreate)
  const { loaderOpen, loaderText, showError, runAsync } = useTimetableUiFeedback()
  const meta = TT_FORMAT_META[form.formatType]

  const displayPeriods = useMemo(() => {
    const base = form.basePeriods || []
    if (!form.breakEnabled) return base
    return applyBreakToTeachingPeriods(base, form.breakAfterPeriod, form.breakMinutes)
  }, [form.basePeriods, form.breakAfterPeriod, form.breakEnabled, form.breakMinutes])

  const maxBreakAfter = Math.max(1, (form.basePeriods?.length || 1) - 1)

  useEffect(() => {
    if (open) setForm(emptyCreate())
  }, [open])

  if (!open) return null

  const setFormat = (formatType) => {
    const nextMeta = TT_FORMAT_META[formatType]
    setForm((current) => ({
      ...current,
      formatType,
      basePeriods: buildDefaultPeriods(nextMeta.defaultPeriodCount),
      breakEnabled: false,
      breakAfterPeriod: Math.min(3, nextMeta.defaultPeriodCount - 1),
      breakMinutes: 30,
      sectionIDs: nextMeta.needsClasses ? current.sectionIDs : [],
      employeeIDs: nextMeta.needsTeachers ? current.employeeIDs : [],
    }))
  }

  const updatePeriod = (displayIndex, field, value) => {
    const row = displayPeriods[displayIndex]
    if (!row || isBreakPeriod(row)) return
    const basePn = displayPeriodToBaseNumber(
      row.periodNumber,
      form.breakAfterPeriod,
      form.breakEnabled,
    )
    setForm((current) => ({
      ...current,
      basePeriods: current.basePeriods.map((period) =>
        period.periodNumber === basePn ? { ...period, [field]: value } : period,
      ),
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      showError('Name is required.')
      return
    }
    if (meta.needsClasses && form.sectionIDs.length === 0) {
      showError('Select at least one class.')
      return
    }
    if (meta.needsTeachers && form.employeeIDs.length === 0) {
      showError('Select at least one teacher.')
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
          periods: periodsToPayload(displayPeriods),
        }),
      )
      onCreated(created)
    } catch {
      /* feedback shown */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-8 sm:pt-12">
      <form
        onSubmit={submit}
        className="flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New timetable</h2>
            <p className="text-sm text-slate-500">Choose a print format, then set periods and members.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.values(TT_FORMAT_META).map((item) => {
              const active = form.formatType === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[var(--campus-primary)] bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Name</span>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. High Boys 2026"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Print title</span>
              <input
                className={inputClass}
                value={form.displayTitle}
                onChange={(e) => setForm((c) => ({ ...c, displayTitle: e.target.value }))}
                placeholder="e.g. High Boys / Boys Branch"
              />
            </label>
            {form.formatType === TT_FORMAT.TEACHER_WISE_FREE && (
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Subtitle (class group)</span>
                <input
                  className={inputClass}
                  value={form.subtitle}
                  onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
                  placeholder="e.g. 6th 7th"
                />
              </label>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Periods</h3>
                <span className="text-xs text-slate-500">
                  {displayPeriods.length} slots
                  {form.breakEnabled ? ' (incl. break)' : ''}
                </span>
              </div>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <label className="inline-flex items-center gap-2 font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.breakEnabled}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        breakEnabled: e.target.checked,
                        breakAfterPeriod: Math.min(c.breakAfterPeriod, maxBreakAfter),
                      }))
                    }
                  />
                  Include break (one per timetable)
                </label>
                {form.breakEnabled ? (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="block text-xs text-slate-600">
                      <span className="mb-1 block font-medium">After period</span>
                      <select
                        className="h-9 min-w-[5.5rem] rounded-md border border-slate-200 bg-white px-2"
                        value={Math.min(form.breakAfterPeriod, maxBreakAfter)}
                        onChange={(e) =>
                          setForm((c) => ({ ...c, breakAfterPeriod: Number(e.target.value) }))
                        }
                      >
                        {Array.from({ length: maxBreakAfter }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-slate-600">
                      <span className="mb-1 block font-medium">Duration (minutes)</span>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        step={5}
                        className="h-9 w-24 rounded-md border border-slate-200 bg-white px-2"
                        value={form.breakMinutes}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            breakMinutes: Math.max(5, Number(e.target.value) || 30),
                          }))
                        }
                      />
                    </label>
                    <p className="pb-1 text-xs text-slate-500">
                      Later periods shift forward automatically.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full text-[13px] leading-snug">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPeriods.map((period, index) => {
                      const isBreak = isBreakPeriod(period)
                      return (
                        <tr
                          key={`${period.periodNumber}-${index}`}
                          className={`border-t border-slate-100 ${isBreak ? 'bg-slate-100/90' : ''}`}
                        >
                          <td className="px-3 py-1.5 font-medium text-slate-700">{period.periodNumber}</td>
                          <td className="px-3 py-1.5">
                            <input
                              className="h-9 w-full rounded-md border border-slate-200 px-2 disabled:bg-slate-50 disabled:text-slate-600"
                              value={period.label}
                              disabled={isBreak}
                              onChange={(e) => updatePeriod(index, 'label', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="time"
                              className="h-9 w-full rounded-md border border-slate-200 px-2 disabled:bg-slate-50"
                              value={period.startTime}
                              disabled={isBreak}
                              onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="time"
                              className="h-9 w-full rounded-md border border-slate-200 px-2 disabled:bg-slate-50"
                              value={period.endTime}
                              disabled={isBreak}
                              onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              {meta.needsClasses && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Classes</h3>
                  <MultiCheckList
                    items={classes}
                    selected={form.sectionIDs}
                    onChange={(sectionIDs) => setForm((c) => ({ ...c, sectionIDs }))}
                    getLabel={formatClassLabel}
                    searchPlaceholder="Search classes"
                  />
                </div>
              )}

              {meta.needsTeachers && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Teachers</h3>
                  <MultiCheckList
                    items={employees}
                    selected={form.employeeIDs}
                    onChange={(employeeIDs) => setForm((c) => ({ ...c, employeeIDs }))}
                    getLabel={(item) => getText(item, 'employeeName', 'EmployeeName') || `Teacher ${getId(item, 'id', 'ID')}`}
                    searchPlaceholder="Search teachers"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.seedFromAllocation}
                    onChange={(e) => setForm((c) => ({ ...c, seedFromAllocation: e.target.checked }))}
                  />
                  Import slots from subject allocation
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((c) => ({ ...c, isDefault: e.target.checked }))}
                  />
                    Set as default for this format
                  </label>
              </div>
            </div>
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
            disabled={loaderOpen}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
          >
            <Plus size={16} />
            Create
          </button>
        </div>
      </form>
      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </div>
  )
}

export default function CampusTimetablesPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [defaultPrompt, setDefaultPrompt] = useState(null)
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
      showError(error?.response?.data?.message || 'Could not load timetables.')
    } finally {
      hideLoader()
      setLoading(false)
    }
  }, [hideLoader, showError, showLoader])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const byFormat = new Map(FORMAT_ORDER.map((id) => [id, []]))
    rows.forEach((row) => {
      const formatType = getId(row, 'formatType', 'FormatType')
      if (!byFormat.has(formatType)) byFormat.set(formatType, [])
      byFormat.get(formatType).push(row)
    })
    byFormat.forEach((list) => {
      list.sort((a, b) => {
        const aDefault = a.isDefault || a.IsDefault ? 1 : 0
        const bDefault = b.isDefault || b.IsDefault ? 1 : 0
        if (aDefault !== bDefault) return bDefault - aDefault
        return String(getText(a, 'name', 'Name')).localeCompare(String(getText(b, 'name', 'Name')))
      })
    })
    return FORMAT_ORDER.map((formatType) => ({
      formatType,
      meta: TT_FORMAT_META[formatType],
      rows: byFormat.get(formatType) || [],
    })).filter((group) => group.rows.length > 0)
  }, [rows])

  const confirmDefaultAction = async () => {
    if (!defaultPrompt) return
    const id = getId(defaultPrompt.row, 'id', 'ID')
    const loadingText =
      defaultPrompt.action === 'clear' ? 'Removing default…' : 'Setting default timetable…'
    try {
      await runAsync(loadingText, async () => {
        if (defaultPrompt.action === 'clear') {
          await clearTimetableDefault(id)
        } else {
          await setTimetableDefault(id)
        }
      }, {
        successMessage:
          defaultPrompt.action === 'clear'
            ? 'Default removed.'
            : 'Default timetable updated.',
      })
      setDefaultPrompt(null)
      load()
    } catch {
      /* feedback shown */
    }
  }

  const printRow = async (row) => {
    const id = getId(row, 'id', 'ID')
    try {
      const detail = await runAsync('Preparing print…', () => getTimetablePrint(id))
      const campusLabel = getCampusLabel(localStorage.getItem('campus') || '')
      if (!openTimetablePrint(detail, { campusLabel })) {
        showError('Allow pop-ups to print.')
      }
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
    <CampusShell headerContext="Timetables">
      <div className="px-4 pb-10 pt-[4.5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-[var(--campus-primary)]">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Timetables</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Create class-wise or teacher-wise schedules. One default per format.
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
                  New timetable
                </button>
              </div>
            </div>

            {loading && !rows.length ? (
              <div className="py-16" aria-hidden />
            ) : rows.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-slate-600">No timetables yet.</p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Create first timetable
                </button>
              </div>
            ) : (
              <table className="min-w-full text-[13px] leading-snug">
                <thead className="border-b border-slate-200 bg-white text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <Fragment key={group.formatType}>
                      <tr>
                        <td
                          colSpan={3}
                          className="border-t border-indigo-100/80 bg-[#eef2ff] px-5 py-2"
                        >
                          <span className="text-xs font-bold uppercase tracking-wide text-[var(--campus-primary)]">
                            {group.meta?.label}
                          </span>
                          {group.meta?.shortLabel ? (
                            <span className="ml-2 text-xs font-normal normal-case tracking-normal text-indigo-400">
                              {group.meta.shortLabel}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                      {group.rows.map((row) => {
                        const id = getId(row, 'id', 'ID')
                        const isDefault = Boolean(row.isDefault ?? row.IsDefault)
                        const subline = formatTimetableSubline(row)
                        return (
                          <tr key={id} className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{getText(row, 'name', 'Name')}</span>
                                {isDefault ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                    <Star size={10} fill="currentColor" />
                                    Default
                                  </span>
                                ) : null}
                              </div>
                              {subline ? (
                                <div className="mt-0.5 text-xs text-slate-500">{subline}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">{formatTimetableSummary(row)}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() => navigate(`/campus/timetables/${id}`)}
                                  className="btn-icon-soft"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  title={isDefault ? 'Remove default' : 'Set default'}
                                  onClick={() =>
                                    setDefaultPrompt({
                                      row,
                                      action: isDefault ? 'clear' : 'set',
                                    })
                                  }
                                  className={`btn-icon-soft ${isDefault ? 'btn-icon-soft--amber' : ''}`}
                                >
                                  <Star size={15} fill={isDefault ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  type="button"
                                  title="Print"
                                  onClick={() => printRow(row)}
                                  className="btn-icon-soft"
                                >
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
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <CreateTimetableModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        classes={classes}
        employees={employees}
        onCreated={(created) => {
          setCreateOpen(false)
          const id = getId(created, 'id', 'ID')
          navigate(`/campus/timetables/${id}`)
        }}
      />

      {defaultPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {defaultPrompt.action === 'clear' ? 'Remove default?' : 'Set as default?'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {defaultPrompt.action === 'clear'
                ? `“${getText(defaultPrompt.row, 'name', 'Name')}” will no longer be the default for this format.`
                : `“${getText(defaultPrompt.row, 'name', 'Name')}” will become the default for its format. Any other default of the same format will be cleared.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDefaultPrompt(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loaderOpen}
                onClick={confirmDefaultAction}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Check size={15} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete timetable?</h3>
            <p className="mt-2 text-sm text-slate-600">
              “{getText(deleteRow, 'name', 'Name')}” and all of its slots will be removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loaderOpen}
                onClick={confirmDelete}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Check size={15} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </CampusShell>
  )
}

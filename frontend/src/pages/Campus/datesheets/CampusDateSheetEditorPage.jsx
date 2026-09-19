import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Loader2, Printer, Save, Settings2, X } from 'lucide-react'
import Select from 'react-select'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell'
import { getCampusLabel } from '../../../constants/branding'
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard'
import { getClassLevels } from '../../../services/classService'
import { getSubjects } from '../../../services/subjectService'
import { sortSubjectsByCustomOrder } from '../../../services/subjectSort'
import {
  getDateSheet,
  getDateSheetPrint,
  replaceDateSheetClasses,
  replaceDateSheetDays,
  replaceDateSheetEntries,
  updateDateSheet,
} from '../../../services/campusDateSheetService'
import {
  DS_ENTRY,
  MAX_NON_SUNDAY_DAYS,
  buildDisplayColumns,
  buildEntryMap,
  entriesToPayload,
  entryKey,
  examDateKey,
  findSubjectAlreadyUsedInClass,
  formatExamDate,
  getId,
  getText,
  getUsedSubjectIdsForClasses,
  isHolidayEntry,
  isRegularEntry,
  nextMergeGroupKey,
  printTitle,
  resolveCellLabel,
} from './dateSheetHelpers'
import { openDateSheetPrint } from './dateSheetPrint'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 8,
    borderColor: state.isFocused ? 'var(--campus-primary)' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(64, 81, 137, 0.15)' : 'none',
    '&:hover': { borderColor: 'var(--campus-primary)' },
  }),
  menu: (base) => ({ ...base, zIndex: 60 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
}

function CellEditorModal({ open, onClose, onSave, onClear, context, subjects, usedSubjectIds }) {
  const [entryType, setEntryType] = useState(DS_ENTRY.SUBJECT)
  const [subjectID, setSubjectID] = useState('')
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    if (!open || !context) return
    const entry = context.entry
    if (entry) {
      setEntryType(getId(entry, 'entryType', 'EntryType') || DS_ENTRY.SUBJECT)
      setSubjectID(getId(entry, 'subjectID', 'SubjectID') ? String(getId(entry, 'subjectID', 'SubjectID')) : '')
      setDisplayText(getText(entry, 'displayText', 'DisplayText') || '')
    } else {
      setEntryType(DS_ENTRY.SUBJECT)
      setSubjectID('')
      setDisplayText('')
    }
  }, [context, open])

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => {
        const value = String(getId(subject, 'id', 'ID'))
        const shortName = getText(subject, 'shortName', 'ShortName')
        const fullName = getText(subject, 'subjectName', 'SubjectName')
        const usedElsewhere = usedSubjectIds?.has(Number(value))
        return {
          value,
          label:
            shortName && fullName && shortName !== fullName
              ? `${shortName} — ${fullName}`
              : shortName || fullName || `Subject ${value}`,
          shortName,
          fullName,
          isDisabled: usedElsewhere,
        }
      }),
    [subjects, usedSubjectIds],
  )

  const selectedSubject = subjectOptions.find((o) => o.value === String(subjectID)) || null

  if (!open || !context) return null

  const submit = (event) => {
    event.preventDefault()
    if (entryType === DS_ENTRY.SUBJECT && !subjectID && !displayText.trim()) {
      toast.error('Choose a subject or enter display text.')
      return
    }
    if (entryType === DS_ENTRY.SUBJECT && subjectID && usedSubjectIds?.has(Number(subjectID))) {
      const name = selectedSubject?.shortName || selectedSubject?.fullName || 'This subject'
      toast.error(`${name} is already scheduled for ${context.columnLabel} on another date.`)
      return
    }
    onSave({
      entryType,
      subjectID: entryType === DS_ENTRY.SUBJECT && subjectID ? Number(subjectID) : null,
      displayText: displayText.trim() || null,
      subjectShortName: selectedSubject?.shortName || null,
      subjectName: selectedSubject?.fullName || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">{context.columnLabel}</h3>
            <p className="text-sm text-slate-500">
              {formatExamDate(context.examDate)} · {context.dayName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: DS_ENTRY.SUBJECT, label: 'Subject' },
              { id: DS_ENTRY.HOLIDAY, label: 'Holiday' },
              { id: DS_ENTRY.REGULAR, label: 'Regular class' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEntryType(opt.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  entryType === opt.id
                    ? 'border-[var(--campus-primary)] bg-indigo-50 text-[var(--campus-primary)]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {entryType === DS_ENTRY.SUBJECT ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Subject</span>
              <Select
                options={subjectOptions}
                value={selectedSubject}
                onChange={(option) => setSubjectID(option?.value || '')}
                placeholder="Search subject…"
                isClearable
                isSearchable
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              {entryType === DS_ENTRY.SUBJECT ? 'Extra text (optional)' : 'Display text'}
            </span>
            <input
              className={inputClass}
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder={
                entryType === DS_ENTRY.HOLIDAY
                  ? '--Holiday--'
                  : entryType === DS_ENTRY.REGULAR
                    ? '--Regular Class--'
                    : 'e.g. practical → Mathematics practical'
              }
            />
            {entryType === DS_ENTRY.SUBJECT ? (
              <p className="mt-1 text-xs text-slate-500">
                Shown after the subject name (e.g. Mathematics + practical → Mathematics practical). Leave blank for
                subject name only.
              </p>
            ) : null}
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Clear cell
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574]"
            >
              Apply
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ManageClassesModal({ open, onClose, onSaved, detail, classLevels }) {
  const [selected, setSelected] = useState([])
  const [order, setOrder] = useState([])
  const [mergeMap, setMergeMap] = useState({})
  const [pick, setPick] = useState([])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || !detail) return
    const classes = detail.classes || detail.Classes || []
    const ids = classes.map((c) => getId(c, 'classID', 'ClassID'))
    setSelected(ids)
    setOrder(ids)
    const map = {}
    classes.forEach((c) => {
      const id = getId(c, 'classID', 'ClassID')
      const key = c.mergeGroupKey ?? c.MergeGroupKey
      if (key != null && Number(key) > 0) map[id] = Number(key)
    })
    setMergeMap(map)
    setPick([])
    setSearch('')
  }, [detail, open])

  const levelById = useMemo(() => {
    const map = new Map()
    classLevels.forEach((c) => map.set(getId(c, 'id', 'ID'), c))
    return map
  }, [classLevels])

  const available = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return classLevels.filter((c) => {
      const id = getId(c, 'id', 'ID')
      if (selected.includes(id)) return false
      if (!needle) return true
      return (getText(c, 'className', 'ClassName') || '').toLowerCase().includes(needle)
    })
  }, [classLevels, search, selected])

  if (!open) return null

  const addClass = (id) => {
    if (selected.includes(id)) return
    setSelected((s) => [...s, id])
    setOrder((o) => [...o, id])
  }

  const removeClass = (id) => {
    setSelected((s) => s.filter((x) => x !== id))
    setOrder((o) => o.filter((x) => x !== id))
    setMergeMap((m) => {
      const next = { ...m }
      delete next[id]
      return next
    })
    setPick((p) => p.filter((x) => x !== id))
  }

  const togglePick = (id) => {
    setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const mergeSelected = () => {
    if (pick.length < 2) {
      toast.error('Select at least two classes to merge.')
      return
    }
    const key = nextMergeGroupKey(
      order.map((id) => ({ mergeGroupKey: mergeMap[id] })),
    )
    setMergeMap((m) => {
      const next = { ...m }
      pick.forEach((id) => {
        next[id] = key
      })
      return next
    })
    setPick([])
    toast.success('Classes merged into one column.')
  }

  const unmerge = (key) => {
    setMergeMap((m) => {
      const next = { ...m }
      Object.keys(next).forEach((id) => {
        if (Number(next[id]) === Number(key)) delete next[id]
      })
      return next
    })
  }

  const columnsPreview = buildDisplayColumns(
    order.map((id, index) => ({
      classID: id,
      className: getText(levelById.get(id), 'className', 'ClassName') || `Class ${id}`,
      sortOrder: index,
      mergeGroupKey: mergeMap[id] || null,
    })),
  )

  const save = async () => {
    if (order.length === 0) {
      toast.error('Select at least one class.')
      return
    }
    setSaving(true)
    const toastId = 'ds-classes'
    toast.loading('Updating classes...', { id: toastId })
    try {
      const payload = order.map((classID) => ({
        classID,
        mergeGroupKey: mergeMap[classID] || null,
      }))
      const updated = await replaceDateSheetClasses(getId(detail, 'id', 'ID'), payload)
      toast.success('Classes updated.', { id: toastId })
      onSaved(updated)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update classes.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-8 sm:pt-12">
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Manage classes</h2>
            <p className="text-sm text-slate-500">Add or remove classes, or merge columns that share a schedule.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Available</h3>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classes"
                className="mb-2 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[var(--campus-primary)]"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {available.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-slate-400">No classes left.</p>
                ) : (
                  available.map((c) => {
                    const id = getId(c, 'id', 'ID')
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => addClass(id)}
                        className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-indigo-50"
                      >
                        {getText(c, 'className', 'ClassName')}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">On datesheet</h3>
                <button
                  type="button"
                  onClick={mergeSelected}
                  disabled={pick.length < 2}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-[var(--campus-primary)] hover:bg-indigo-50 disabled:opacity-40"
                >
                  Merge selected
                </button>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {order.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-slate-400">No classes.</p>
                ) : (
                  order.map((id) => {
                    const label = getText(levelById.get(id), 'className', 'ClassName') || `Class ${id}`
                    const checked = pick.includes(id)
                    const mergeKey = mergeMap[id]
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                          checked ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePick(id)}
                          className="rounded border-slate-300"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                          {label}
                          {mergeKey ? (
                            <span className="ml-1 text-xs font-normal text-indigo-500">· group {mergeKey}</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeClass(id)}
                          className="text-xs font-medium text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Column preview</h3>
            <div className="flex flex-wrap gap-2">
              {columnsPreview.map((col) => (
                <div
                  key={col.key}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-slate-800">{col.label}</span>
                  {col.mergeGroupKey ? (
                    <button
                      type="button"
                      onClick={() => unmerge(col.mergeGroupKey)}
                      className="text-xs font-semibold text-[var(--campus-primary)] hover:underline"
                    >
                      Unmerge
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save classes
          </button>
        </div>
      </div>
    </div>
  )
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function toDateKey(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function DisabledAwareDatePicker({ value, takenDates, onChange }) {
  const takenSet = useMemo(() => new Set(takenDates || []), [takenDates])
  const initial = value ? new Date(`${value}T00:00:00`) : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  useEffect(() => {
    if (!value) return
    const d = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(d.getTime())) {
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const items = []
    for (let i = 0; i < startPad; i += 1) items.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateKey(viewYear, viewMonth, day)
      const weekday = new Date(viewYear, viewMonth, day).getDay()
      const taken = takenSet.has(key)
      const sunday = weekday === 0
      items.push({
        day,
        key,
        disabled: taken || sunday,
        reason: sunday ? 'Sunday' : taken ? 'Already added' : '',
      })
    }
    return items
  }, [takenSet, viewMonth, viewYear])

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          ‹
        </button>
        <div className="text-sm font-semibold text-slate-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAY_SHORT.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`pad-${index}`} />
          const selected = value === cell.key
          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.disabled}
              title={cell.reason || undefined}
              onClick={() => onChange(cell.key)}
              className={`h-8 rounded-md text-xs transition ${
                cell.disabled
                  ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                  : selected
                    ? 'bg-[var(--campus-primary)] font-semibold text-white'
                    : 'text-slate-700 hover:bg-indigo-50'
              }`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Gray days are Sundays or already on this datesheet.
      </p>
    </div>
  )
}

function ManageDatesModal({ open, onClose, onSaved, detail }) {
  const [dates, setDates] = useState([])
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !detail) return
    const days = detail.days || detail.Days || []
    setDates(
      days
        .map((d) => examDateKey(getText(d, 'examDate', 'ExamDate')))
        .filter(Boolean)
        .sort(),
    )
    setNewDate('')
  }, [detail, open])

  if (!open) return null

  const addDate = () => {
    if (!newDate) {
      toast.error('Choose a date to add.')
      return
    }
    const key = examDateKey(newDate)
    const weekday = new Date(`${key}T00:00:00`).getDay()
    if (weekday === 0) {
      toast.error('Sundays cannot be exam dates.')
      return
    }
    if (dates.includes(key)) {
      toast.error('That date is already on the datesheet.')
      return
    }
    if (dates.length + 1 > MAX_NON_SUNDAY_DAYS) {
      toast.error(`A datesheet can have up to ${MAX_NON_SUNDAY_DAYS} exam days.`)
      return
    }
    setDates((current) => [...current, key].sort())
    setNewDate('')
  }

  const removeDate = (key) => {
    if (dates.length <= 1) {
      toast.error('Keep at least one exam date.')
      return
    }
    setDates((current) => current.filter((d) => d !== key))
  }

  const save = async () => {
    if (dates.length === 0) {
      toast.error('Keep at least one exam date.')
      return
    }
    setSaving(true)
    const toastId = 'ds-days'
    toast.loading('Updating dates...', { id: toastId })
    try {
      const updated = await replaceDateSheetDays(getId(detail, 'id', 'ID'), dates)
      toast.success('Dates updated.', { id: toastId })
      onSaved(updated)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update dates.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-8 sm:pt-12">
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Manage dates</h2>
            <p className="text-sm text-slate-500">Add or remove exam days. Sundays are not allowed.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Add date</span>
            <DisabledAwareDatePicker value={newDate} takenDates={dates} onChange={setNewDate} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {newDate ? `Selected: ${formatExamDate(newDate)}` : 'Pick an available day'}
              </span>
              <button
                type="button"
                onClick={addDate}
                disabled={!newDate}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[var(--campus-primary)] hover:bg-indigo-50 disabled:opacity-40"
              >
                <CalendarPlus size={15} />
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Exam days</h3>
              <span className="text-xs text-slate-500">{dates.length} days</span>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {dates.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-slate-400">No dates.</p>
              ) : (
                dates.map((key) => {
                  const weekday = DAY_NAMES[new Date(`${key}T00:00:00`).getDay()] || ''
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1 font-medium text-slate-800">
                        {formatExamDate(key)}
                        <span className="ml-2 text-xs font-normal text-slate-500">{weekday}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDate(key)}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save dates
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CampusDateSheetEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dateSheetId = Number(id)

  const [detail, setDetail] = useState(null)
  const [entries, setEntries] = useState([])
  const [meta, setMeta] = useState({ name: '', displayTitle: '', subtitle: '', isActive: true })
  const [subjects, setSubjects] = useState([])
  const [classLevels, setClassLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editor, setEditor] = useState(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [datesOpen, setDatesOpen] = useState(false)
  const [leavePath, setLeavePath] = useState('')

  const { proceedRouteNavigation } = useUnsavedChangesGuard({
    enabled: dirty && !leavePath && !structureOpen && !datesOpen && !editor,
    onNavigationBlocked: (path) => setLeavePath(path),
  })

  const applyDetail = useCallback((data) => {
    setDetail(data)
    setEntries(data.entries || data.Entries || [])
    setMeta({
      name: getText(data, 'name', 'Name') || '',
      displayTitle: getText(data, 'displayTitle', 'DisplayTitle') || '',
      subtitle: getText(data, 'subtitle', 'Subtitle') || '',
      isActive: Boolean(data.isActive ?? data.IsActive ?? true),
    })
    setDirty(false)
  }, [])

  const load = useCallback(async () => {
    if (!dateSheetId) return
    setLoading(true)
    try {
      const [sheet, subjectRows, levels] = await Promise.all([
        getDateSheet(dateSheetId),
        getSubjects(),
        getClassLevels(),
      ])
      applyDetail(sheet)
      setSubjects(sortSubjectsByCustomOrder(subjectRows || []))
      setClassLevels(levels || [])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load datesheet.')
      navigate('/campus/datesheets')
    } finally {
      setLoading(false)
    }
  }, [applyDetail, dateSheetId, navigate])

  useEffect(() => {
    load()
  }, [load])

  const days = detail?.days || detail?.Days || []
  const classes = detail?.classes || detail?.Classes || []
  const columns = useMemo(() => buildDisplayColumns(classes), [classes])
  const entryMap = useMemo(() => buildEntryMap(entries), [entries])

  const openCell = (column, day) => {
    const examDate = examDateKey(getText(day, 'examDate', 'ExamDate'))
    const primaryClassId = column.classIds[0]
    const entry = entryMap.get(entryKey(primaryClassId, examDate)) || null
    setEditor({
      column,
      examDate,
      dayName: getText(day, 'dayName', 'DayName'),
      columnLabel: column.label,
      entry,
    })
  }

  const upsertEntriesForColumn = (column, examDate, nextEntryOrNull) => {
    const dateKey = examDateKey(examDate)
    if (
      nextEntryOrNull &&
      Number(nextEntryOrNull.entryType) === DS_ENTRY.SUBJECT &&
      Number(nextEntryOrNull.subjectID) > 0
    ) {
      const conflict = findSubjectAlreadyUsedInClass(
        entries,
        column.classIds,
        nextEntryOrNull.subjectID,
        dateKey,
      )
      if (conflict) {
        const subjectLabel =
          nextEntryOrNull.subjectShortName ||
          nextEntryOrNull.subjectName ||
          getText(conflict, 'subjectShortName', 'SubjectShortName') ||
          getText(conflict, 'subjectName', 'SubjectName') ||
          'This subject'
        toast.error(
          `${subjectLabel} is already scheduled for ${column.label} on ${formatExamDate(
            getText(conflict, 'examDate', 'ExamDate'),
          )}.`,
        )
        return
      }
    }
    setEntries((current) => {
      let next = current.filter((e) => {
        const eDate = examDateKey(getText(e, 'examDate', 'ExamDate'))
        const eClass = getId(e, 'classID', 'ClassID')
        return !(eDate === dateKey && column.classIds.includes(eClass))
      })
      if (nextEntryOrNull) {
        column.classIds.forEach((classID) => {
          const existing = current.find(
            (e) =>
              examDateKey(getText(e, 'examDate', 'ExamDate')) === dateKey &&
              getId(e, 'classID', 'ClassID') === classID,
          )
          next.push({
            id: existing ? getId(existing, 'id', 'ID') : undefined,
            classID,
            examDate: dateKey,
            entryType: nextEntryOrNull.entryType,
            subjectID: nextEntryOrNull.subjectID,
            displayText: nextEntryOrNull.displayText,
            subjectShortName: nextEntryOrNull.subjectShortName,
            subjectName: nextEntryOrNull.subjectName,
            cellLabel: resolveCellLabel({
              entryType: nextEntryOrNull.entryType,
              displayText: nextEntryOrNull.displayText,
              subjectShortName: nextEntryOrNull.subjectShortName,
              subjectName: nextEntryOrNull.subjectName,
            }),
          })
        })
      }
      return next
    })
    setDirty(true)
    setEditor(null)
  }

  const saveAll = async () => {
    if (!meta.name.trim()) {
      toast.error('Datesheet name is required.')
      return
    }

    const seenSubjectKeys = new Set()
    for (const entry of entries) {
      if (getId(entry, 'entryType', 'EntryType') !== DS_ENTRY.SUBJECT) continue
      const subjectId = getId(entry, 'subjectID', 'SubjectID')
      if (!subjectId) continue
      const classId = getId(entry, 'classID', 'ClassID')
      const key = `${classId}:${subjectId}`
      if (seenSubjectKeys.has(key)) {
        const label =
          getText(entry, 'subjectShortName', 'SubjectShortName') ||
          getText(entry, 'subjectName', 'SubjectName') ||
          'A subject'
        toast.error(`${label} is scheduled more than once for the same class. Fix the grid before saving.`)
        return
      }
      seenSubjectKeys.add(key)
    }

    setSaving(true)
    const toastId = 'ds-save'
    toast.loading('Saving datesheet...', { id: toastId })
    try {
      await updateDateSheet(dateSheetId, {
        name: meta.name.trim(),
        displayTitle: meta.displayTitle.trim() || meta.name.trim(),
        subtitle: meta.subtitle.trim() || null,
        isActive: meta.isActive,
      })
      const updated = await replaceDateSheetEntries(dateSheetId, entriesToPayload(entries))
      applyDetail(updated)
      toast.success('Datesheet saved.', { id: toastId })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save datesheet.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const printSheet = async () => {
    if (dirty) {
      toast.error('Save changes before printing.')
      return
    }
    try {
      const printDetail = await getDateSheetPrint(dateSheetId)
      const campusLabel = getCampusLabel(localStorage.getItem('campus') || '')
      if (!openDateSheetPrint(printDetail, { campusLabel })) {
        toast.error('Allow pop-ups to print.')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load print data.')
    }
  }

  if (loading || !detail) {
    return (
      <CampusShell headerContext="Datesheet editor">
        <div className="flex items-center justify-center gap-2 px-4 pb-10 pt-[4.25rem] text-slate-500 md:pt-[4.5rem]">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Datesheet editor">
      <div className="px-4 pb-10 pt-[4.25rem] sm:px-6 md:pt-[4.5rem] lg:px-8">
        <div className="mx-auto max-w-[1400px] space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Link
                to="/campus/datesheets"
                className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Back"
              >
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{printTitle(detail)}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-[var(--campus-primary)]">
                    {formatExamDate(getText(detail, 'startDate', 'StartDate'))} to{' '}
                    {formatExamDate(getText(detail, 'endDate', 'EndDate'))}
                  </span>
                  {dirty ? <span className="font-medium text-amber-600">Unsaved changes</span> : null}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (dirty && !window.confirm('You have unsaved cell changes. Continue and discard them?')) return
                  setDatesOpen(true)
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <CalendarPlus size={15} />
                Dates
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dirty && !window.confirm('You have unsaved cell changes. Continue and discard them?')) return
                  setStructureOpen(true)
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Settings2 size={15} />
                Classes
              </button>
              <button
                type="button"
                onClick={printSheet}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Printer size={15} />
                Print
              </button>
              <button
                type="button"
                disabled={saving || !dirty}
                onClick={saveAll}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Name</span>
              <input
                className={inputClass}
                value={meta.name}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, name: e.target.value }))
                  setDirty(true)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Print heading</span>
              <input
                className={inputClass}
                value={meta.displayTitle}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, displayTitle: e.target.value }))
                  setDirty(true)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Subtitle</span>
              <input
                className={inputClass}
                value={meta.subtitle}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, subtitle: e.target.value }))
                  setDirty(true)
                }}
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[11px] leading-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <thead>
                  <tr className="bg-[var(--campus-primary)] text-white">
                    <th className="sticky left-0 z-20 whitespace-nowrap border border-[#405189]/40 bg-[var(--campus-primary)] px-2 py-1.5 text-left text-[11px] font-bold">
                      Date
                    </th>
                    <th className="sticky left-[88px] z-20 whitespace-nowrap border border-[#405189]/40 bg-[var(--campus-primary)] px-2 py-1.5 text-left text-[11px] font-bold">
                      Day
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="min-w-[88px] border border-[#405189]/40 px-1.5 py-1.5 text-center text-[11px] font-bold"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const examDate = examDateKey(getText(day, 'examDate', 'ExamDate'))
                    const dayName = getText(day, 'dayName', 'DayName')
                    return (
                      <tr key={examDate} className="odd:bg-white even:bg-[#eef1f8]/">
                        <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-200 bg-inherit px-2 py-1 font-normal text-slate-800">
                          {formatExamDate(examDate)}
                        </td>
                        <td className="sticky left-[88px] z-10 whitespace-nowrap border border-slate-200 bg-inherit px-2 py-1 font-normal text-slate-700">
                          {dayName}
                        </td>
                        {columns.map((col) => {
                          const entry = entryMap.get(entryKey(col.classIds[0], examDate))
                          const label = resolveCellLabel(entry)
                          const holiday = isHolidayEntry(entry)
                          const regular = isRegularEntry(entry)
                          return (
                            <td key={`${col.key}-${examDate}`} className="border border-slate-200 p-0">
                              <button
                                type="button"
                                onClick={() => openCell(col, day)}
                                className={`flex min-h-10 w-full items-center justify-center px-1 py-1 text-center text-[11px] font-normal leading-tight transition hover:bg-indigo-50 ${
                                  holiday
                                    ? 'bg-[#f8b4b4] text-rose-900 hover:bg-[#f29b9b]'
                                    : regular
                                      ? 'bg-[#2ecc71] text-slate-900 hover:bg-[#27ae60]'
                                      : label
                                        ? 'text-slate-900'
                                        : 'text-slate-300'
                                }`}
                              >
                                {label || '+'}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CellEditorModal
        open={Boolean(editor)}
        context={editor}
        subjects={subjects}
        usedSubjectIds={
          editor
            ? getUsedSubjectIdsForClasses(entries, editor.column?.classIds, editor.examDate)
            : undefined
        }
        onClose={() => setEditor(null)}
        onClear={() => upsertEntriesForColumn(editor.column, editor.examDate, null)}
        onSave={(payload) => upsertEntriesForColumn(editor.column, editor.examDate, payload)}
      />

      <ManageClassesModal
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        detail={detail}
        classLevels={classLevels}
        onSaved={(updated) => {
          applyDetail(updated)
          setStructureOpen(false)
        }}
      />

      <ManageDatesModal
        open={datesOpen}
        onClose={() => setDatesOpen(false)}
        detail={detail}
        onSaved={(updated) => {
          applyDetail(updated)
          setDatesOpen(false)
        }}
      />

      {leavePath ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Leave without saving?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You have unsaved changes on this datesheet. If you leave now, those changes will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeavePath('')}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  const path = leavePath
                  setLeavePath('')
                  proceedRouteNavigation(path)
                }}
                className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

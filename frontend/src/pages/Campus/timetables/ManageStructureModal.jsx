import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import {
  TT_FORMAT_META,
  DEFAULT_PERIOD_TIMES,
  formatClassLabel,
  getId,
  getText,
  applyBreakToTeachingPeriods,
  displayPeriodToBaseNumber,
  isBreakPeriod,
  periodsToPayload,
  splitPeriodsForBreakEdit,
} from './timetableHelpers'
import { replaceTimetableMembers, replaceTimetablePeriods } from '../../../services/campusTimeTableService'
import TimetablePopupLoader from './TimetablePopupLoader'
import { useTimetableUiFeedback } from './timetableUiFeedback'

const timeToMinutes = (value) => {
  if (!value || !String(value).includes(':')) return null
  const [h, m] = String(value).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/** Inclusive-exclusive style: [start, end) overlaps if start < otherEnd && otherStart < end */
const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd

const findPeriodTimeError = (periods, index) => {
  const period = periods[index]
  if (!period || period.isBreak) return null
  const start = timeToMinutes(period.startTime)
  const end = timeToMinutes(period.endTime)
  if (start == null && end == null) return null
  if (start == null || end == null) return null
  if (end <= start) {
    return `Period ${period.periodNumber}: end time must be after start time.`
  }

  for (let i = 0; i < periods.length; i += 1) {
    if (i === index) continue
    const other = periods[i]
    if (other.isBreak) continue
    const oStart = timeToMinutes(other.startTime)
    const oEnd = timeToMinutes(other.endTime)
    if (oStart == null || oEnd == null || oEnd <= oStart) continue
    if (rangesOverlap(start, end, oStart, oEnd)) {
      return `Period ${period.periodNumber} (${period.startTime}–${period.endTime}) overlaps Period ${other.periodNumber} (${other.startTime}–${other.endTime}).`
    }
  }
  return null
}

const findAnyPeriodTimeError = (periods) => {
  for (let i = 0; i < periods.length; i += 1) {
    const err = findPeriodTimeError(periods, i)
    if (err) return err
  }
  return null
}

function DualPanePicker({ items, selectedIds, onChange, getLabel, availableTitle, selectedTitle }) {
  const [leftSearch, setLeftSearch] = useState('')
  const [rightSearch, setRightSearch] = useState('')
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const byId = useMemo(() => {
    const map = new Map()
    items.forEach((item) => map.set(getId(item, 'id', 'ID'), item))
    return map
  }, [items])

  const available = useMemo(() => {
    const needle = leftSearch.trim().toLowerCase()
    return items
      .filter((item) => !selectedSet.has(getId(item, 'id', 'ID')))
      .filter((item) => !needle || getLabel(item).toLowerCase().includes(needle))
  }, [getLabel, items, leftSearch, selectedSet])

  const selected = useMemo(() => {
    const needle = rightSearch.trim().toLowerCase()
    return selectedIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((item) => !needle || getLabel(item).toLowerCase().includes(needle))
  }, [byId, getLabel, rightSearch, selectedIds])

  const add = (id) => {
    if (selectedSet.has(id)) return
    onChange([...selectedIds, id])
  }

  const remove = (id) => onChange(selectedIds.filter((x) => x !== id))

  const addAllVisible = () => {
    const ids = available.map((item) => getId(item, 'id', 'ID'))
    if (!ids.length) return
    onChange([...selectedIds, ...ids.filter((id) => !selectedSet.has(id))])
  }

  const removeAllVisible = () => {
    const removeSet = new Set(selected.map((item) => getId(item, 'id', 'ID')))
    onChange(selectedIds.filter((id) => !removeSet.has(id)))
  }

  const pane = (title, search, setSearch, rows, emptyText, onRowClick, actionLabel, onBulk) => (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</div>
          <div className="text-[11px] text-slate-400">{rows.length} shown</div>
        </div>
        <button
          type="button"
          onClick={onBulk}
          className="text-xs font-semibold text-[var(--campus-primary)] hover:underline"
        >
          {actionLabel}
        </button>
      </div>
      <div className="border-b border-slate-200 px-2 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[var(--campus-primary)]"
        />
      </div>
      <div className="max-h-64 min-h-[12rem] flex-1 overflow-y-auto p-1.5">
        {rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          rows.map((item) => {
            const id = getId(item, 'id', 'ID')
            return (
              <button
                key={id}
                type="button"
                onClick={() => onRowClick(id)}
                className="mb-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] leading-snug text-slate-800 hover:bg-indigo-50"
              >
                <span className="truncate">{getLabel(item)}</span>
                <span className="shrink-0 text-slate-400">
                  {title.toLowerCase().includes('selected') ? (
                    <ChevronLeft size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {pane(
        availableTitle,
        leftSearch,
        setLeftSearch,
        available,
        'Nothing left to add.',
        add,
        'Add all',
        addAllVisible,
      )}
      {pane(
        selectedTitle,
        rightSearch,
        setRightSearch,
        selected,
        'None selected yet.',
        remove,
        'Remove all',
        removeAllVisible,
      )}
    </div>
  )
}

/**
 * Edit periods + class/teacher membership for an existing timetable.
 * Subjects stay cell-level (full catalog in Edit period).
 */
export default function ManageStructureModal({
  open,
  onClose,
  onSaved,
  detail,
  allClasses,
  allTeachers,
}) {
  const formatType = getId(detail, 'formatType', 'FormatType')
  const meta = TT_FORMAT_META[formatType]
  const [tab, setTab] = useState('periods')
  const [basePeriods, setBasePeriods] = useState([])
  const [breakEnabled, setBreakEnabled] = useState(false)
  const [breakAfterPeriod, setBreakAfterPeriod] = useState(3)
  const [breakMinutes, setBreakMinutes] = useState(30)
  const [sectionIDs, setSectionIDs] = useState([])
  const [employeeIDs, setEmployeeIDs] = useState([])
  const timeFocusRef = useRef({})
  const {
    loaderOpen,
    loaderText,
    showError,
    runAsync,
  } = useTimetableUiFeedback()

  const displayPeriods = useMemo(() => {
    if (!breakEnabled) return basePeriods
    return applyBreakToTeachingPeriods(basePeriods, breakAfterPeriod, breakMinutes)
  }, [basePeriods, breakAfterPeriod, breakEnabled, breakMinutes])

  const maxBreakAfter = Math.max(1, (basePeriods?.length || 1) - 1)

  const tabs = useMemo(() => {
    const list = [{ id: 'periods', label: 'Periods' }]
    if (meta?.needsClasses) list.push({ id: 'classes', label: 'Classes' })
    if (meta?.needsTeachers) list.push({ id: 'teachers', label: 'Teachers' })
    return list
  }, [meta])

  useEffect(() => {
    if (!open || !detail) return
    setTab('periods')
    const split = splitPeriodsForBreakEdit(detail.periods || [])
    setBasePeriods(split.basePeriods)
    setBreakEnabled(split.breakEnabled)
    setBreakAfterPeriod(Math.min(split.breakAfterPeriod, Math.max(1, split.basePeriods.length - 1)))
    setBreakMinutes(split.breakMinutes)
    setSectionIDs((detail.classes || []).map((c) => getId(c, 'sectionID', 'SectionID')).filter(Boolean))
    setEmployeeIDs((detail.teachers || []).map((t) => getId(t, 'employeeID', 'EmployeeID')).filter(Boolean))
    timeFocusRef.current = {}
  }, [open, detail])

  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab('periods')
  }, [tab, tabs])

  if (!open || !detail) return null

  const timetableId = getId(detail, 'id', 'ID')

  const updatePeriod = (displayIndex, field, value) => {
    const row = displayPeriods[displayIndex]
    if (!row || isBreakPeriod(row)) return
    const basePn = displayPeriodToBaseNumber(row.periodNumber, breakAfterPeriod, breakEnabled)
    setBasePeriods((current) =>
      current.map((period) => (period.periodNumber === basePn ? { ...period, [field]: value } : period)),
    )
  }

  const rememberTimeFocus = (index) => {
    const period = displayPeriods[index]
    if (!period) return
    timeFocusRef.current[index] = {
      startTime: period.startTime,
      endTime: period.endTime,
    }
  }

  const revertTimeIfInvalid = (index) => {
    const error = findPeriodTimeError(displayPeriods, index)
    if (!error) return
    showError(error, 'Invalid time')
    const snapshot = timeFocusRef.current[index]
    if (!snapshot) return
    const row = displayPeriods[index]
    if (!row || isBreakPeriod(row)) return
    const basePn = displayPeriodToBaseNumber(row.periodNumber, breakAfterPeriod, breakEnabled)
    setBasePeriods((current) =>
      current.map((period) =>
        period.periodNumber === basePn
          ? { ...period, startTime: snapshot.startTime, endTime: snapshot.endTime }
          : period,
      ),
    )
  }

  const addPeriod = () => {
    setBasePeriods((current) => {
      const nextNumber = current.reduce((max, p) => Math.max(max, p.periodNumber), 0) + 1
      const preset = DEFAULT_PERIOD_TIMES.find((p) => p.periodNumber === nextNumber)
      const next = [
        ...current,
        {
          periodNumber: nextNumber,
          label: `Period ${nextNumber}`,
          startTime: preset?.startTime || '',
          endTime: preset?.endTime || '',
          sortOrder: nextNumber,
          isBreak: false,
        },
      ]
      const error = findPeriodTimeError(next, next.length - 1)
      if (error && preset) {
        // Still allow add with empty times if preset would overlap.
        next[next.length - 1] = {
          ...next[next.length - 1],
          startTime: '',
          endTime: '',
        }
        showError(
          `Period ${nextNumber} was added without times because the preset would overlap another period.`,
          'Times needed',
        )
      }
      return next
    })
  }

  const removePeriod = (displayIndex) => {
    const row = displayPeriods[displayIndex]
    if (!row || isBreakPeriod(row)) return
    const basePn = displayPeriodToBaseNumber(row.periodNumber, breakAfterPeriod, breakEnabled)
    setBasePeriods((current) => {
      if (current.length <= 1) {
        showError('Keep at least one period.', 'Cannot remove')
        return current
      }
      const next = current
        .filter((p) => p.periodNumber !== basePn)
        .map((p, i) => ({ ...p, periodNumber: i + 1, sortOrder: i + 1 }))
      if (breakEnabled) {
        const maxAfter = Math.max(1, next.length - 1)
        setBreakAfterPeriod((after) => Math.min(after, maxAfter))
      }
      return next
    })
  }

  const save = async () => {
    if (displayPeriods.length === 0) {
      showError('At least one period is required.', 'Missing periods')
      return
    }
    const timeError = findAnyPeriodTimeError(displayPeriods)
    if (timeError) {
      showError(timeError, 'Invalid times')
      setTab('periods')
      return
    }
    if (meta?.needsClasses && sectionIDs.length === 0) {
      showError('Select at least one class.', 'Missing classes')
      setTab('classes')
      return
    }
    if (meta?.needsTeachers && employeeIDs.length === 0) {
      showError('Select at least one teacher.', 'Missing teachers')
      setTab('teachers')
      return
    }

    try {
      await runAsync(
        'Saving structure…',
        async () => {
          await replaceTimetablePeriods(timetableId, periodsToPayload(displayPeriods))
          await replaceTimetableMembers(timetableId, {
            sectionIDs: meta?.needsClasses ? sectionIDs : [],
            employeeIDs: meta?.needsTeachers ? employeeIDs : [],
          })
        },
        { successMessage: 'Structure updated. Slots on removed rows or periods were cleared.' },
      )
      onSaved?.()
      onClose()
    } catch {
      /* feedback shown */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10 sm:pt-14">
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Manage structure</h2>
            <p className="text-sm text-slate-500">
              {meta?.label}: add or remove periods and rows. Subjects are chosen when editing a cell.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-slate-200 px-5 pt-3">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                tab === item.id
                  ? 'border border-b-white border-slate-200 bg-white text-[var(--campus-primary)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'periods' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Period times cannot overlap. Invalid times are reverted when you leave the field.
                </p>
                <button
                  type="button"
                  onClick={addPeriod}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-[var(--campus-primary)] hover:bg-indigo-50"
                >
                  <Plus size={14} />
                  Add period
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <label className="inline-flex items-center gap-2 font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={breakEnabled}
                    onChange={(e) => {
                      setBreakEnabled(e.target.checked)
                      if (e.target.checked) {
                        setBreakAfterPeriod((after) => Math.min(after, maxBreakAfter))
                      }
                    }}
                  />
                  Include break (one per timetable)
                </label>
                {breakEnabled ? (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="block text-xs text-slate-600">
                      <span className="mb-1 block font-medium">After period</span>
                      <select
                        className="h-9 min-w-[5.5rem] rounded-md border border-slate-200 bg-white px-2"
                        value={Math.min(breakAfterPeriod, maxBreakAfter)}
                        onChange={(e) => setBreakAfterPeriod(Number(e.target.value))}
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
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(Math.max(5, Number(e.target.value) || 30))}
                      />
                    </label>
                    <p className="pb-1 text-xs text-slate-500">
                      Later periods shift when you save. Assignments in the break column are cleared.
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
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {displayPeriods.map((period, index) => {
                      const rowError = findPeriodTimeError(displayPeriods, index)
                      const isBreak = isBreakPeriod(period)
                      return (
                        <tr
                          key={`${period.periodNumber}-${index}`}
                          className={`border-t border-slate-100 ${rowError ? 'bg-rose-50/60' : ''} ${isBreak ? 'bg-slate-100/90' : ''}`}
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
                              className={`h-9 w-full rounded-md border px-2 disabled:bg-slate-50 ${rowError ? 'border-rose-300' : 'border-slate-200'}`}
                              value={period.startTime}
                              disabled={isBreak}
                              onFocus={() => rememberTimeFocus(index)}
                              onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                              onBlur={() => revertTimeIfInvalid(index)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="time"
                              className={`h-9 w-full rounded-md border px-2 disabled:bg-slate-50 ${rowError ? 'border-rose-300' : 'border-slate-200'}`}
                              value={period.endTime}
                              disabled={isBreak}
                              onFocus={() => rememberTimeFocus(index)}
                              onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                              onBlur={() => revertTimeIfInvalid(index)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {!isBreak ? (
                              <button
                                type="button"
                                title="Remove period"
                                onClick={() => removePeriod(index)}
                                className="btn-icon-soft btn-icon-soft--danger"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'classes' && meta?.needsClasses && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Move classes to the right to include them as rows. Removing a class clears its assignments.
              </p>
              <DualPanePicker
                items={allClasses}
                selectedIds={sectionIDs}
                onChange={setSectionIDs}
                getLabel={formatClassLabel}
                availableTitle="Available classes"
                selectedTitle="Selected classes"
              />
            </div>
          )}

          {tab === 'teachers' && meta?.needsTeachers && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Move teachers to the right to include them as rows. Removing a teacher clears their assignments.
              </p>
              <DualPanePicker
                items={allTeachers}
                selectedIds={employeeIDs}
                onChange={setEmployeeIDs}
                getLabel={(item) => getText(item, 'employeeName', 'EmployeeName') || `Teacher ${getId(item, 'id', 'ID')}`}
                availableTitle="Available teachers"
                selectedTitle="Selected teachers"
              />
            </div>
          )}
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
            type="button"
            disabled={loaderOpen}
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
          >
            Save structure
          </button>
        </div>
      </div>
      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </div>
  )
}

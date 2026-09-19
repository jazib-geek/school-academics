import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import { getSubjects } from '../../../services/subjectService'
import { sortSubjectsByCustomOrder } from '../../../services/subjectSort'
import {
  getDateSheet,
  replaceDateSheetEntries,
  updateDateSheet,
} from '../../../services/campusDateSheetService'
import {
  DS_ENTRY,
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
  resolveCellLabel,
} from '../../Campus/datesheets/dateSheetHelpers'

function CellSheet({ open, onClose, onSave, onClear, context, subjects, usedSubjectIds }) {
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

  if (!open || !context) return null

  const selectedSubject = subjects.find((s) => String(getId(s, 'id', 'ID')) === String(subjectID))

  const submit = (event) => {
    event.preventDefault()
    if (entryType === DS_ENTRY.SUBJECT && !subjectID && !displayText.trim()) {
      toast.error('Choose a subject or enter display text.')
      return
    }
    if (entryType === DS_ENTRY.SUBJECT && subjectID && usedSubjectIds?.has(Number(subjectID))) {
      const name =
        getText(selectedSubject, 'shortName', 'ShortName') ||
        getText(selectedSubject, 'subjectName', 'SubjectName') ||
        'This subject'
      toast.error(`${name} is already scheduled for ${context.columnLabel} on another date.`)
      return
    }
    onSave({
      entryType,
      subjectID: entryType === DS_ENTRY.SUBJECT && subjectID ? Number(subjectID) : null,
      displayText: displayText.trim() || null,
      subjectShortName: selectedSubject
        ? getText(selectedSubject, 'shortName', 'ShortName') || null
        : null,
      subjectName: selectedSubject
        ? getText(selectedSubject, 'subjectName', 'SubjectName') || null
        : null,
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{context.columnLabel}</p>
          <p className="text-xs text-slate-500">
            {formatExamDate(context.examDate)} · {context.dayName}
          </p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
                  entryType === opt.id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {entryType === DS_ENTRY.SUBJECT ? (
            <label className="block text-sm font-medium text-slate-700">
              Subject
              <select
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={subjectID}
                onChange={(e) => setSubjectID(e.target.value)}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => {
                  const value = getId(subject, 'id', 'ID')
                  const shortName = getText(subject, 'shortName', 'ShortName')
                  const fullName = getText(subject, 'subjectName', 'SubjectName')
                  const usedElsewhere = usedSubjectIds?.has(Number(value))
                  return (
                    <option key={value} value={value} disabled={usedElsewhere}>
                      {shortName || fullName || 'Subject'}
                      {usedElsewhere ? ' (already scheduled)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}

          <label className="block text-sm font-medium text-slate-700">
            {entryType === DS_ENTRY.SUBJECT ? 'Extra text (optional)' : 'Display text'}
            <input
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder={
                entryType === DS_ENTRY.HOLIDAY
                  ? 'Holiday'
                  : entryType === DS_ENTRY.REGULAR
                    ? 'Regular class'
                    : 'e.g. practical'
              }
            />
          </label>
        </div>
        <div className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button type="button" onClick={onClear} className="emp-cta-btn emp-cta-btn-danger h-12 flex-1">
            Clear
          </button>
          <button type="submit" className="emp-cta-btn emp-cta-btn-success h-12 flex-[1.4]">
            Apply
          </button>
        </div>
      </form>
    </div>
  )
}

function EmployeeDateSheetEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dateSheetId = Number(id)
  const canEdit = hasEmployeeAppAccess('canEditDatesheet')

  const [detail, setDetail] = useState(null)
  const [entries, setEntries] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editor, setEditor] = useState(null)

  const applyDetail = useCallback((data) => {
    setDetail(data)
    setEntries(data.entries || data.Entries || [])
    setDirty(false)
  }, [])

  const load = useCallback(async () => {
    if (!dateSheetId) return
    setLoading(true)
    try {
      const [sheet, subjectRows] = await Promise.all([getDateSheet(dateSheetId), getSubjects()])
      applyDetail(sheet)
      setSubjects(sortSubjectsByCustomOrder(subjectRows || []))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load datesheet.')
      navigate('/employee/academics/datesheets')
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
    if (!canEdit) return
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
    const toastId = 'emp-ds-save'
    toast.loading('Saving datesheet…', { id: toastId })
    try {
      await updateDateSheet(dateSheetId, {
        name: getText(detail, 'name', 'Name'),
        displayTitle: getText(detail, 'displayTitle', 'DisplayTitle') || getText(detail, 'name', 'Name'),
        subtitle: getText(detail, 'subtitle', 'Subtitle') || null,
        isActive: Boolean(detail?.isActive ?? detail?.IsActive ?? true),
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

  return (
    <EmployeeLayout
      title={getText(detail, 'name', 'Name') || 'Datesheet'}
      subtitle={canEdit ? 'Tap a cell to edit' : 'View only'}
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <div className="flex gap-2">
          <EmployeeBackButton
            fullWidth={false}
            label="Datesheets"
            to="/employee/academics/datesheets"
          />
          <button
            type="button"
            onClick={saveAll}
            disabled={!canEdit || saving || loading || !dirty}
            className="emp-cta-btn emp-cta-btn-success h-11 flex-[1.4] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>

        {loading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading…
          </div>
        ) : (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border border-indigo-200 bg-indigo-600 px-3 py-2 text-left text-xs font-bold text-white">
                      Date
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="min-w-28 border border-indigo-200 bg-indigo-600 px-2 py-2 text-center text-xs font-bold text-white"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const examDate = examDateKey(getText(day, 'examDate', 'ExamDate'))
                    const dayName = getText(day, 'dayName', 'DayName')
                    return (
                      <tr key={examDate}>
                        <th className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-left">
                          <div className="font-semibold text-slate-800">{formatExamDate(examDate)}</div>
                          <div className="text-[11px] font-medium text-slate-500">{dayName}</div>
                        </th>
                        {columns.map((column) => {
                          const entry = entryMap.get(entryKey(column.classIds[0], examDate))
                          const label = resolveCellLabel(entry)
                          return (
                            <td key={`${column.key}-${examDate}`} className="border border-slate-200 p-0">
                              <button
                                type="button"
                                onClick={() => openCell(column, day)}
                                className="flex min-h-14 min-w-28 w-full items-center justify-center px-2 py-2 text-center text-xs font-semibold text-slate-800 active:bg-indigo-50"
                              >
                                {label || <span className="text-slate-300">+</span>}
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
        )}
      </div>

      <CellSheet
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        onSave={(payload) => upsertEntriesForColumn(editor.column, editor.examDate, payload)}
        onClear={() => upsertEntriesForColumn(editor.column, editor.examDate, null)}
        context={editor}
        subjects={subjects}
        usedSubjectIds={
          editor
            ? getUsedSubjectIdsForClasses(entries, editor.column?.classIds, editor.examDate)
            : undefined
        }
      />
    </EmployeeLayout>
  )
}

export default EmployeeDateSheetEditorPage

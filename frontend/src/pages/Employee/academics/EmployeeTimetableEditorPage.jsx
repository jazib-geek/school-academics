import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import { getClasses } from '../../../services/classService'
import { getSubjects } from '../../../services/subjectService'
import { sortSubjectsByCustomOrder } from '../../../services/subjectSort'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  getTimetable,
  getTimetableAllocationCandidates,
  replaceTimetableSlots,
  updateTimetable,
} from '../../../services/campusTimeTableService'
import {
  TT_FORMAT,
  TT_FORMAT_META,
  buildSlotMaps,
  formatClassLabel,
  formatSplitCellLines,
  getClassCellSlots,
  normalizeLineIndex,
  slotSubjectLabel,
  subjectShortLabelFromMaster,
  sortCellSlots,
  formatTimeRange,
  getId,
  getText,
  slotsToPayload,
  teacherDisplayName,
  teacherSlotKey,
  isBreakPeriod,
  sortPeriods,
} from '../../Campus/timetables/timetableHelpers'
import TimetableBreakCell from '../../Campus/timetables/TimetableBreakCell'
import TimetablePopupLoader from '../../Campus/timetables/TimetablePopupLoader'
import { useTimetableUiFeedback } from '../../Campus/timetables/timetableUiFeedback'

function CellSheet({ open, onClose, onSave, onClear, context, candidates, subjects, formatType, onValidationError }) {
  const isClassWise = formatType === TT_FORMAT.CLASS_WISE
  const [sectionID, setSectionID] = useState('')
  const [subjectID, setSubjectID] = useState('')
  const [employeeID, setEmployeeID] = useState('')
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [subjectID2, setSubjectID2] = useState('')
  const [employeeID2, setEmployeeID2] = useState('')

  useEffect(() => {
    if (!open || !context) return
    const cellSlots = sortCellSlots(context.cellSlots || [])
    const line0 = cellSlots.find((s) => normalizeLineIndex(s) === 0) || cellSlots[0]
    const line1 = cellSlots.find((s) => normalizeLineIndex(s) === 1)
    setSectionID(String(context.sectionID || getId(line0, 'sectionID', 'SectionID') || ''))
    setSubjectID(line0 ? String(getId(line0, 'subjectID', 'SubjectID')) : '')
    setEmployeeID(
      line0
        ? String(getId(line0, 'employeeID', 'EmployeeID'))
        : context.rowEmployeeID
          ? String(context.rowEmployeeID)
          : '',
    )
    setSplitEnabled(Boolean(line1))
    setSubjectID2(line1 ? String(getId(line1, 'subjectID', 'SubjectID')) : '')
    setEmployeeID2(line1 ? String(getId(line1, 'employeeID', 'EmployeeID')) : '')
  }, [context, open])

  const filteredCandidates = useMemo(() => {
    if (!context) return []
    if (isClassWise) {
      return candidates.filter((c) => getId(c, 'sectionID', 'SectionID') === context.rowSectionID)
    }
    return candidates.filter((c) => getId(c, 'employeeID', 'EmployeeID') === context.rowEmployeeID)
  }, [candidates, context, isClassWise])

  const partnerLine = useMemo(() => {
    if (!context?.cellSlots?.length) return null
    const cellSlots = sortCellSlots(context.cellSlots)
    const editingLine = context.editingLineIndex ?? 0
    return cellSlots.find((s) => normalizeLineIndex(s) !== editingLine) || null
  }, [context])

  if (!open || !context) return null

  const applyCandidate = (candidate) => {
    setSectionID(String(getId(candidate, 'sectionID', 'SectionID')))
    setSubjectID(String(getId(candidate, 'subjectID', 'SubjectID')))
    setEmployeeID(String(getId(candidate, 'employeeID', 'EmployeeID')))
  }

  const submit = (event) => {
    event.preventDefault()
    const resolvedSectionID = Number(sectionID)
    const line0Employee = Number(employeeID) || Number(context.rowEmployeeID)
    const lines = [
      {
        lineIndex: 0,
        subjectID: Number(subjectID),
        employeeID: line0Employee,
        id: context.slotId0 || undefined,
      },
    ]
    if (!resolvedSectionID || !lines[0].subjectID || !lines[0].employeeID) {
      onValidationError?.('Class, subject, and teacher are required.', 'Missing details')
      return
    }
    if (splitEnabled) {
      const line1 = {
        lineIndex: 1,
        subjectID: Number(subjectID2),
        employeeID: Number(employeeID2),
        id: context.slotId1 || undefined,
      }
      if (!line1.subjectID || !line1.employeeID) {
        onValidationError?.('Second group needs a subject and teacher.', 'Missing details')
        return
      }
      if (line1.subjectID === lines[0].subjectID || line1.employeeID === lines[0].employeeID) {
        onValidationError?.('Each group needs a different subject and teacher.', 'Check groups')
        return
      }
      lines.push(line1)
    }
    onSave({
      sectionID: resolvedSectionID,
      periodNumber: context.periodNumber,
      dayOfWeek: 0,
      lines,
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Period {context.periodNumber}</p>
          <p className="truncate text-xs text-slate-500">{context.rowLabel}</p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {filteredCandidates.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                From subject allocation
              </p>
              <div className="space-y-1">
                {filteredCandidates.map((candidate) => {
                  const key = `${getId(candidate, 'employeeID', 'EmployeeID')}-${getId(candidate, 'sectionID', 'SectionID')}-${getId(candidate, 'subjectID', 'SubjectID')}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyCandidate(candidate)}
                      className="emp-surface flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
                    >
                      <span className="font-medium text-slate-800">
                        {getText(candidate, 'subjectName', 'SubjectName')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {isClassWise
                          ? getText(candidate, 'employeeName', 'EmployeeName')
                          : getText(candidate, 'className', 'ClassName')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {!isClassWise ? (
            <label className="block text-sm font-medium text-slate-700">
              Class
              <select
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={sectionID}
                onChange={(e) => setSectionID(e.target.value)}
                required
              >
                <option value="">Select class</option>
                {(context.classOptions || []).map((cls) => {
                  const value = getId(cls, 'sectionID', 'SectionID') || getId(cls, 'id', 'ID')
                  return (
                    <option key={value} value={value}>
                      {getText(cls, 'className', 'ClassName')}
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}

          <label className="block text-sm font-medium text-slate-700">
            Subject
            <select
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={subjectID}
              onChange={(e) => setSubjectID(e.target.value)}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => {
                const value = getId(subject, 'id', 'ID')
                const fullName = getText(subject, 'subjectName', 'SubjectName')
                return (
                  <option key={value} value={value}>
                    {fullName || 'Subject'}
                  </option>
                )
              })}
            </select>
          </label>

          {isClassWise ? (
            <label className="block text-sm font-medium text-slate-700">
              Teacher
              <select
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={employeeID}
                onChange={(e) => setEmployeeID(e.target.value)}
                required
              >
                <option value="">Select teacher</option>
                {(context.teacherOptions || []).map((teacher) => {
                  const value = getId(teacher, 'employeeID', 'EmployeeID') || getId(teacher, 'id', 'ID')
                  return (
                    <option key={value} value={value}>
                      {getText(teacher, 'employeeName', 'EmployeeName')}
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}

          {partnerLine && !splitEnabled ? (
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              Also this period: {slotSubjectLabel(partnerLine)} with{' '}
              {getText(partnerLine, 'employeeName', 'EmployeeName') || 'another teacher'}.
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={splitEnabled}
              onChange={(e) => setSplitEnabled(e.target.checked)}
            />
            Split period (second group)
          </label>

          {splitEnabled ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Second group</p>
              <label className="block text-sm font-medium text-slate-700">
                Subject
                <select
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={subjectID2}
                  onChange={(e) => setSubjectID2(e.target.value)}
                  required={splitEnabled}
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => {
                    const value = getId(subject, 'id', 'ID')
                    const fullName = getText(subject, 'subjectName', 'SubjectName')
                    return (
                      <option key={value} value={value}>
                        {fullName || 'Subject'}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Teacher
                <select
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={employeeID2}
                  onChange={(e) => setEmployeeID2(e.target.value)}
                  required={splitEnabled}
                >
                  <option value="">Select teacher</option>
                  {(context.teacherOptions || []).map((teacher) => {
                    const value = getId(teacher, 'employeeID', 'EmployeeID') || getId(teacher, 'id', 'ID')
                    return (
                      <option key={value} value={value}>
                        {getText(teacher, 'employeeName', 'EmployeeName')}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          ) : null}
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

function EmployeeTimetableEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const timetableId = Number(id)
  const canEdit = hasEmployeeAppAccess('canEditTimetable')

  const [detail, setDetail] = useState(null)
  const [slots, setSlots] = useState([])
  const [candidates, setCandidates] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [allTeachers, setAllTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [editor, setEditor] = useState(null)
  const {
    loaderOpen,
    loaderText,
    showLoader,
    hideLoader,
    showError,
    runAsync,
  } = useTimetableUiFeedback()

  const load = useCallback(async () => {
    if (!timetableId) return
    setLoading(true)
    showLoader('Loading timetable…')
    try {
      const lookupsPromise = Promise.all([
        getTimetableAllocationCandidates(timetableId),
        getSubjects(),
        getClasses(),
        getTeacherAssignmentEmployees(),
      ])

      const tt = await getTimetable(timetableId)
      setDetail(tt)
      setSlots(tt.slots || [])
      setDirty(false)
      setLoading(false)

      try {
        const [allocation, subjectRows, classRows, employeeRows] = await lookupsPromise
        setCandidates(allocation)
        setSubjects(sortSubjectsByCustomOrder(subjectRows))
        setAllClasses(classRows)
        setAllTeachers(employeeRows)
      } catch {
        showError('Could not load class and teacher lists.', 'Could not load')
      }
    } catch (error) {
      showError(error?.response?.data?.message || 'Could not load timetable.', 'Could not load')
      navigate('/employee/academics/timetables')
    } finally {
      hideLoader()
      setLoading(false)
    }
  }, [hideLoader, navigate, showError, showLoader, timetableId])

  useEffect(() => {
    load()
  }, [load])

  const formatType = getId(detail, 'formatType', 'FormatType')
  const meta = TT_FORMAT_META[formatType]
  const periods = sortPeriods(detail?.periods || [])
  const classRowCount = (detail?.classes || []).length
  const teacherRowCount = (detail?.teachers || []).length
  const classes = detail?.classes || []
  const teachers = detail?.teachers || []
  const { byClass, byTeacher } = useMemo(() => buildSlotMaps(slots), [slots])

  const teacherOptions = useMemo(
    () =>
      allTeachers.map((t) => ({
        employeeID: getId(t, 'id', 'ID'),
        employeeName: getText(t, 'employeeName', 'EmployeeName'),
        gender: getText(t, 'gender', 'Gender'),
      })),
    [allTeachers],
  )

  const classOptions = useMemo(
    () =>
      allClasses.map((c) => ({
        sectionID: getId(c, 'id', 'ID'),
        className: formatClassLabel(c),
      })),
    [allClasses],
  )

  const enrichSlot = (input) => {
    const subject = subjects.find((s) => getId(s, 'id', 'ID') === input.subjectID)
    const teacher = teacherOptions.find(
      (t) => (getId(t, 'employeeID', 'EmployeeID') || getId(t, 'id', 'ID')) === input.employeeID,
    )
    const cls = classOptions.find(
      (c) => (getId(c, 'sectionID', 'SectionID') || getId(c, 'id', 'ID')) === input.sectionID,
    )
    const fromCandidate = candidates.find(
      (c) =>
        getId(c, 'sectionID', 'SectionID') === input.sectionID &&
        getId(c, 'subjectID', 'SubjectID') === input.subjectID &&
        getId(c, 'employeeID', 'EmployeeID') === input.employeeID,
    )

    return {
      ...input,
      dayOfWeek: input.dayOfWeek || 0,
      lineIndex: input.lineIndex ?? 0,
      className:
        getText(cls, 'className', 'ClassName') ||
        getText(fromCandidate, 'className', 'ClassName') ||
        'Class',
      subjectName:
        getText(subject, 'subjectName', 'SubjectName') ||
        getText(fromCandidate, 'subjectName', 'SubjectName') ||
        'Subject',
      subjectShortName:
        subjectShortLabelFromMaster(subject) ||
        getText(fromCandidate, 'subjectShortName', 'SubjectShortName'),
      employeeName:
        getText(teacher, 'employeeName', 'EmployeeName') ||
        getText(fromCandidate, 'employeeName', 'EmployeeName') ||
        'Teacher',
      gender: getText(teacher, 'gender', 'Gender') || getText(fromCandidate, 'gender', 'Gender'),
    }
  }

  const openCell = ({ sectionId, employeeId, periodNumber, slot, cellSlots, rowLabel }) => {
    if (!canEdit) return
    const isClassWise = formatType === TT_FORMAT.CLASS_WISE
    const slotsForCell = sortCellSlots(cellSlots || (slot ? [slot] : []))
    const line0 = slotsForCell.find((s) => normalizeLineIndex(s) === 0) || slotsForCell[0]
    const line1 = slotsForCell.find((s) => normalizeLineIndex(s) === 1)
    const activeSlot = slot || line0
    const editingLineIndex = activeSlot ? normalizeLineIndex(activeSlot) : 0
    setEditor({
      periodNumber,
      rowLabel,
      rowSectionID: isClassWise ? sectionId : getId(activeSlot, 'sectionID', 'SectionID'),
      rowEmployeeID: isClassWise ? getId(activeSlot, 'employeeID', 'EmployeeID') : employeeId,
      sectionID: isClassWise ? sectionId : getId(activeSlot, 'sectionID', 'SectionID'),
      employeeID: isClassWise ? getId(activeSlot, 'employeeID', 'EmployeeID') : employeeId,
      subjectID: getId(activeSlot, 'subjectID', 'SubjectID'),
      slotId0: getId(line0, 'id', 'ID') || undefined,
      slotId1: getId(line1, 'id', 'ID') || undefined,
      editingLineIndex,
      cellSlots: slotsForCell,
      classOptions,
      teacherOptions,
    })
  }

  const applyEditorSlot = (payload) => {
    const { sectionID, periodNumber, dayOfWeek = 0, lines: rawLines } = payload

    let lines = rawLines.map((line) => ({ ...line, lineIndex: line.lineIndex ?? 0 }))
    if (lines.length === 1) {
      const existingLine = slots.find(
        (slot) =>
          getId(slot, 'sectionID', 'SectionID') === sectionID &&
          getId(slot, 'periodNumber', 'PeriodNumber') === periodNumber &&
          (getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) === dayOfWeek,
      )
      if (
        existingLine &&
        normalizeLineIndex(existingLine) === 0 &&
        getId(existingLine, 'employeeID', 'EmployeeID') !== lines[0].employeeID
      ) {
        lines = [
          {
            lineIndex: 0,
            subjectID: getId(existingLine, 'subjectID', 'SubjectID'),
            employeeID: getId(existingLine, 'employeeID', 'EmployeeID'),
            id: getId(existingLine, 'id', 'ID') || undefined,
          },
          { ...lines[0], lineIndex: 1 },
        ]
      }
    }

    const isSameClassCell = (slot) => {
      if (getId(slot, 'periodNumber', 'PeriodNumber') !== periodNumber) return false
      if ((getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) !== dayOfWeek) return false
      return getId(slot, 'sectionID', 'SectionID') === sectionID
    }

    for (const line of lines) {
      const next = { sectionID, periodNumber, dayOfWeek, ...line }
      const teacherClash = slots.find(
        (slot) =>
          !isSameClassCell(slot) &&
          getId(slot, 'employeeID', 'EmployeeID') === next.employeeID &&
          getId(slot, 'periodNumber', 'PeriodNumber') === next.periodNumber &&
          (getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) === dayOfWeek,
      )
      if (teacherClash) {
        showError(
          `${getText(teacherClash, 'employeeName', 'EmployeeName') || 'Teacher'} is already booked in period ${next.periodNumber}.`,
          'Teacher clash',
        )
        return
      }
    }

    setSlots((current) => [
      ...current.filter((slot) => !isSameClassCell(slot)),
      ...lines.map((line) => enrichSlot({ sectionID, periodNumber, dayOfWeek, ...line })),
    ])
    setDirty(true)
    setEditor(null)
  }

  const clearEditorSlot = () => {
    if (!editor) return
    setSlots((current) =>
      current.filter((slot) => {
        const periodNumber = getId(slot, 'periodNumber', 'PeriodNumber')
        const dayOfWeek = getId(slot, 'dayOfWeek', 'DayOfWeek') || 0
        if (periodNumber !== editor.periodNumber || dayOfWeek !== 0) return true
        return getId(slot, 'sectionID', 'SectionID') !== editor.sectionID
      }),
    )
    setDirty(true)
    setEditor(null)
  }

  const saveSlots = async () => {
    try {
      const saved = await runAsync(
        'Saving timetable…',
        async () => {
          await updateTimetable(timetableId, {
            name: getText(detail, 'name', 'Name'),
            displayTitle: getText(detail, 'displayTitle', 'DisplayTitle') || null,
            subtitle: getText(detail, 'subtitle', 'Subtitle') || null,
            isActive: true,
          })
          return replaceTimetableSlots(timetableId, slotsToPayload(slots))
        },
        { successMessage: 'Timetable saved.' },
      )
      setDetail(saved)
      setSlots(saved.slots || [])
      setDirty(false)
    } catch {
      /* feedback shown */
    }
  }

  const isClassWise = formatType === TT_FORMAT.CLASS_WISE

  return (
    <EmployeeLayout
      title={getText(detail, 'name', 'Name') || 'Timetable'}
      subtitle={canEdit ? meta?.label || 'Edit schedule' : 'View only'}
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <div className="flex gap-2">
          <EmployeeBackButton
            fullWidth={false}
            label="Timetables"
            to="/employee/academics/timetables"
          />
          <button
            type="button"
            onClick={saveSlots}
            disabled={!canEdit || loaderOpen || loading || !dirty}
            className="emp-cta-btn emp-cta-btn-success h-11 flex-[1.4] disabled:opacity-50"
          >
            <Save size={16} />
            Save
          </button>
        </div>

        {loading || !detail ? (
          <div className="emp-surface rounded-2xl py-16" aria-hidden />
        ) : (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border border-indigo-200 bg-indigo-600 px-3 py-2 text-left text-xs font-bold text-white">
                      {isClassWise ? 'Class' : 'Teacher'}
                    </th>
                    {periods.map((period) => {
                      const periodNumber = getId(period, 'periodNumber', 'PeriodNumber')
                      return (
                        <th
                          key={periodNumber}
                          className="border border-indigo-200 bg-indigo-600 px-2 py-2 text-center text-xs font-bold text-white"
                        >
                          <div>{getText(period, 'label', 'Label') || `P${periodNumber}`}</div>
                          {meta?.showTimes ? (
                            <div className="mt-0.5 font-medium text-indigo-100">
                              {formatTimeRange(
                                getText(period, 'startTime', 'StartTime'),
                                getText(period, 'endTime', 'EndTime'),
                              )}
                            </div>
                          ) : null}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {isClassWise
                    ? classes.map((cls, rowIndex) => {
                        const sectionId = getId(cls, 'sectionID', 'SectionID')
                        const rowLabel = getText(cls, 'className', 'ClassName')
                        return (
                          <tr key={sectionId}>
                            <th className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800">
                              {rowLabel}
                            </th>
                            {periods.map((period) => {
                              const periodNumber = getId(period, 'periodNumber', 'PeriodNumber')
                              if (isBreakPeriod(period)) {
                                if (rowIndex > 0) return null
                                return (
                                  <TimetableBreakCell
                                    key={`break-${periodNumber}`}
                                    period={period}
                                    rowSpan={classRowCount || 1}
                                    className="border-slate-200"
                                  />
                                )
                              }
                              const cellSlots = getClassCellSlots(byClass, sectionId, periodNumber, 0)
                              const { subjectLine, teacherLine } = formatSplitCellLines(cellSlots)
                              return (
                                <td key={`${sectionId}-${periodNumber}`} className="border border-slate-200 p-0">
                                  <button
                                    type="button"
                                    onClick={() => openCell({ sectionId, periodNumber, cellSlots, rowLabel })}
                                    className="flex min-h-14 min-w-24 w-full flex-col items-center justify-center px-1.5 py-2 text-center active:bg-indigo-50"
                                  >
                                    {cellSlots.length > 0 ? (
                                      <>
                                        <span className="text-xs font-bold text-slate-800">{subjectLine}</span>
                                        <span className="mt-0.5 text-[10px] text-slate-500">{teacherLine}</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-slate-300">+</span>
                                    )}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    : teachers.map((teacher, rowIndex) => {
                        const employeeId = getId(teacher, 'employeeID', 'EmployeeID')
                        const rowLabel = getText(teacher, 'employeeName', 'EmployeeName')
                        return (
                          <tr key={employeeId}>
                            <th className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800">
                              {rowLabel}
                            </th>
                            {periods.map((period) => {
                              const periodNumber = getId(period, 'periodNumber', 'PeriodNumber')
                              if (isBreakPeriod(period)) {
                                if (rowIndex > 0) return null
                                return (
                                  <TimetableBreakCell
                                    key={`break-${periodNumber}`}
                                    period={period}
                                    rowSpan={teacherRowCount || 1}
                                    className="border-slate-200"
                                  />
                                )
                              }
                              const slot = byTeacher.get(teacherSlotKey(employeeId, periodNumber, 0))
                              const slotSectionId = getId(slot, 'sectionID', 'SectionID')
                              const cellSlots = slotSectionId
                                ? getClassCellSlots(byClass, slotSectionId, periodNumber, 0)
                                : []
                              return (
                                <td key={`${employeeId}-${periodNumber}`} className="border border-slate-200 p-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCell({ employeeId, periodNumber, slot, cellSlots, rowLabel })
                                    }
                                    className="flex min-h-14 min-w-24 w-full flex-col items-center justify-center px-1.5 py-2 text-center active:bg-indigo-50"
                                  >
                                    {slot ? (
                                      <>
                                        <span className="text-xs font-bold text-slate-800">
                                          {getText(slot, 'className', 'ClassName')}
                                        </span>
                                        <span className="mt-0.5 text-[10px] text-slate-500">
                                          {getText(slot, 'subjectShortName', 'SubjectShortName') ||
                                            getText(slot, 'subjectName', 'SubjectName')}
                                        </span>
                                      </>
                                    ) : meta?.showFreeInEmptyCells ? (
                                      <span className="text-xs font-semibold text-slate-400">Free</span>
                                    ) : (
                                      <span className="text-xs text-slate-300">+</span>
                                    )}
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
        onSave={applyEditorSlot}
        onClear={clearEditorSlot}
        context={editor}
        candidates={candidates}
        subjects={subjects}
        formatType={formatType}
        onValidationError={showError}
      />

      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </EmployeeLayout>
  )
}

export default EmployeeTimetableEditorPage

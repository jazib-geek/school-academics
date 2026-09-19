import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  Save,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell'
import { getCampusLabel } from '../../../constants/branding'
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard'
import { getClasses } from '../../../services/classService'
import { getSubjects } from '../../../services/subjectService'
import { sortSubjectsByCustomOrder } from '../../../services/subjectSort'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import {
  getTimetable,
  getTimetableAllocationCandidates,
  getTimetablePrint,
  replaceTimetableSlots,
  seedTimetableFromAllocation,
  updateTimetable,
} from '../../../services/campusTimeTableService'
import {
  TT_FORMAT,
  TT_FORMAT_META,
  buildSlotMaps,
  classSlotKey,
  formatClassLabel,
  formatTimeRange,
  getId,
  getText,
  printTitle,
  slotsToPayload,
  teacherDisplayName,
  teacherSlotKey,
  isBreakPeriod,
  sortPeriods,
} from './timetableHelpers'
import { openTimetablePrint } from './timetablePrint'
import ManageStructureModal from './ManageStructureModal'
import TimetableBreakCell from './TimetableBreakCell'
import TimetablePopupLoader from './TimetablePopupLoader'
import { useTimetableUiFeedback } from './timetableUiFeedback'

const selectClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

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

function SlotEditorModal({
  open,
  onClose,
  onSave,
  onClear,
  context,
  candidates,
  subjects,
  formatType,
  onValidationError,
}) {
  const isClassWise = formatType === TT_FORMAT.CLASS_WISE
  const [sectionID, setSectionID] = useState('')
  const [subjectID, setSubjectID] = useState('')
  const [employeeID, setEmployeeID] = useState('')

  useEffect(() => {
    if (!open || !context) return
    setSectionID(context.sectionID ? String(context.sectionID) : '')
    setSubjectID(context.subjectID ? String(context.subjectID) : '')
    setEmployeeID(context.employeeID ? String(context.employeeID) : '')
  }, [context, open])

  const filteredCandidates = useMemo(() => {
    if (!context) return []
    if (isClassWise) {
      return candidates.filter((c) => getId(c, 'sectionID', 'SectionID') === context.rowSectionID)
    }
    return candidates.filter((c) => getId(c, 'employeeID', 'EmployeeID') === context.rowEmployeeID)
  }, [candidates, context, isClassWise])

  const classSelectOptions = useMemo(
    () =>
      (context?.classOptions || []).map((cls) => {
        const value = String(getId(cls, 'sectionID', 'SectionID') || getId(cls, 'id', 'ID'))
        return { value, label: getText(cls, 'className', 'ClassName') || `Class ${value}` }
      }),
    [context],
  )

  const subjectSelectOptions = useMemo(
    () =>
      subjects.map((subject) => {
        const value = String(getId(subject, 'id', 'ID'))
        const shortName = getText(subject, 'shortName', 'ShortName')
        const fullName = getText(subject, 'subjectName', 'SubjectName')
        return {
          value,
          label: shortName && fullName && shortName !== fullName ? `${shortName} — ${fullName}` : shortName || fullName || `Subject ${value}`,
        }
      }),
    [subjects],
  )

  const selectedClass = classSelectOptions.find((o) => o.value === String(sectionID)) || null
  const selectedSubject = subjectSelectOptions.find((o) => o.value === String(subjectID)) || null

  if (!open || !context) return null

  const applyCandidate = (candidate) => {
    setSectionID(String(getId(candidate, 'sectionID', 'SectionID')))
    setSubjectID(String(getId(candidate, 'subjectID', 'SubjectID')))
    setEmployeeID(String(getId(candidate, 'employeeID', 'EmployeeID')))
  }

  const submit = (event) => {
    event.preventDefault()
    const next = {
      sectionID: Number(sectionID),
      subjectID: Number(subjectID),
      employeeID: Number(employeeID),
      periodNumber: context.periodNumber,
      dayOfWeek: 0,
      id: context.slotId || undefined,
    }
    if (!next.sectionID || !next.subjectID || !next.employeeID) {
      onValidationError?.('Class, subject, and teacher are required.', 'Missing details')
      return
    }
    onSave(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Edit period {context.periodNumber}</h3>
            <p className="text-sm text-slate-500">{context.rowLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-soft" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {filteredCandidates.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                From Subject Allocation
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {filteredCandidates.map((candidate) => {
                  const key = `${getId(candidate, 'employeeID', 'EmployeeID')}-${getId(candidate, 'sectionID', 'SectionID')}-${getId(candidate, 'subjectID', 'SubjectID')}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyCandidate(candidate)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-indigo-50"
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
          )}

          {!isClassWise && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Class</span>
              <Select
                options={classSelectOptions}
                value={selectedClass}
                onChange={(option) => setSectionID(option?.value || '')}
                placeholder="Search class…"
                isClearable
                isSearchable
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Subject</span>
            <Select
              options={subjectSelectOptions}
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

          {isClassWise && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Teacher</span>
              <select className={selectClass} value={employeeID} onChange={(e) => setEmployeeID(e.target.value)} required>
                <option value="">Select teacher</option>
                {(context.teacherOptions || []).map((teacher) => (
                  <option key={getId(teacher, 'employeeID', 'EmployeeID') || getId(teacher, 'id', 'ID')} value={getId(teacher, 'employeeID', 'EmployeeID') || getId(teacher, 'id', 'ID')}>
                    {getText(teacher, 'employeeName', 'EmployeeName')}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Clear cell
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
              Cancel
            </button>
            <button type="submit" className="h-10 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white">
              Apply
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const CLASH_CELL_CLASS =
  'relative z-[1] flex min-h-14 w-full flex-col items-center justify-center bg-rose-50 px-1.5 py-2 text-center ring-2 ring-inset ring-rose-500 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
const NORMAL_CELL_CLASS =
  'flex min-h-14 w-full flex-col items-center justify-center px-1.5 py-2 text-center hover:bg-indigo-50'

function isClashCell(clashCells, { sectionId, employeeId, periodNumber }) {
  if (!clashCells?.length) return false
  return clashCells.some((cell) => {
    if (cell.periodNumber !== periodNumber) return false
    if (cell.employeeId != null && employeeId != null) return cell.employeeId === employeeId
    if (cell.sectionId != null && sectionId != null) return cell.sectionId === sectionId
    return false
  })
}

function ClassWiseGrid({ detail, slots, onCellClick, clashCells }) {
  const periods = sortPeriods(detail.periods || [])
  const classes = detail.classes || []
  const rowCount = classes.length
  const { byClass } = buildSlotMaps(slots)
  const head = 'border border-[#405189]/40 bg-[var(--campus-primary)] px-2 py-2 text-center text-xs font-bold text-white'
  const stub = 'sticky left-0 z-10 border border-[#405189]/40 bg-[var(--campus-primary)] px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-white'

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={stub}>Periods →</th>
            {periods.map((period) => (
              <th
                key={getId(period, 'id', 'ID') || getId(period, 'periodNumber', 'PeriodNumber')}
                className={head}
              >
                {getText(period, 'label', 'Label') || `Period ${getId(period, 'periodNumber', 'PeriodNumber')}`}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 border border-slate-300 bg-[#eef1f8] px-3 py-2 text-left text-xs font-bold uppercase text-[var(--campus-primary)]">
              Classes ↓
            </th>
            {periods.map((period) => (
              <th
                key={`t-${getId(period, 'periodNumber', 'PeriodNumber')}`}
                className="border border-slate-300 bg-[#eef1f8] px-2 py-1.5 text-center text-[11px] font-semibold text-[var(--campus-primary)]"
              >
                {formatTimeRange(getText(period, 'startTime', 'StartTime'), getText(period, 'endTime', 'EndTime'))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, rowIndex) => {
            const sectionId = getId(cls, 'sectionID', 'SectionID')
            return (
              <tr key={sectionId} className={rowIndex % 2 === 1 ? 'bg-slate-100/80' : 'bg-white'}>
                <th className="sticky left-0 z-10 border border-slate-300 bg-inherit px-3 py-2 text-left font-semibold text-slate-800">
                  {getText(cls, 'className', 'ClassName')}
                </th>
                {periods.map((period) => {
                  const periodNumber = getId(period, 'periodNumber', 'PeriodNumber')
                  if (isBreakPeriod(period)) {
                    if (rowIndex > 0) return null
                    return (
                      <TimetableBreakCell
                        key={`break-${periodNumber}`}
                        period={period}
                        rowSpan={rowCount || 1}
                      />
                    )
                  }
                  const slot = byClass.get(classSlotKey(sectionId, periodNumber, 0))
                  const clash = isClashCell(clashCells, { sectionId, periodNumber })
                  return (
                    <td key={`${sectionId}-${periodNumber}`} className="border border-slate-300 p-0">
                      <button
                        type="button"
                        data-clash-cell={clash ? '1' : undefined}
                        onClick={() => onCellClick({ sectionId, periodNumber, slot, rowLabel: getText(cls, 'className', 'ClassName') })}
                        className={clash ? CLASH_CELL_CLASS : NORMAL_CELL_CLASS}
                      >
                        {slot ? (
                          <>
                            <span className={`text-xs font-bold ${clash ? 'text-rose-800' : 'text-slate-800'}`}>
                              {getText(slot, 'subjectShortName', 'SubjectShortName') ||
                                getText(slot, 'subjectName', 'SubjectName')}
                            </span>
                            <span className={`mt-0.5 text-[10px] ${clash ? 'text-rose-600' : 'text-slate-500'}`}>
                              {teacherDisplayName(
                                getText(slot, 'employeeName', 'EmployeeName'),
                                getText(slot, 'gender', 'Gender'),
                              )}
                            </span>
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
          })}
        </tbody>
      </table>
    </div>
  )
}

function TeacherWiseGrid({ detail, slots, onCellClick, withFree, withSerial, clashCells }) {
  const periods = sortPeriods(detail.periods || [])
  const teachers = detail.teachers || []
  const rowCount = teachers.length
  const { byTeacher } = buildSlotMaps(slots)
  const head = 'border border-[#405189]/40 bg-[var(--campus-primary)] px-2 py-2 text-center text-xs font-bold text-white'
  const stub = 'sticky left-0 z-10 border border-[#405189]/40 bg-[var(--campus-primary)] px-3 py-2 text-left text-xs font-bold text-white'

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            {withSerial && (
              <th className={head}>SERIAL NO.</th>
            )}
            <th className={stub}>
              TEACHER NAME
            </th>
            {periods.map((period) => (
              <th
                key={getId(period, 'periodNumber', 'PeriodNumber')}
                className={head}
              >
                {getText(period, 'label', 'Label') || `Period ${getId(period, 'periodNumber', 'PeriodNumber')}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher, index) => {
            const employeeId = getId(teacher, 'employeeID', 'EmployeeID')
            const name = getText(teacher, 'employeeName', 'EmployeeName')
            return (
              <tr key={employeeId}>
                {withSerial && (
                  <td className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700">
                    {index + 1}
                  </td>
                )}
                <th className="sticky left-0 z-10 border border-slate-300 bg-white px-3 py-2 text-left font-semibold text-slate-800">
                  {name}
                </th>
                {periods.map((period) => {
                  const periodNumber = getId(period, 'periodNumber', 'PeriodNumber')
                  if (isBreakPeriod(period)) {
                    if (index > 0) return null
                    return (
                      <TimetableBreakCell
                        key={`break-${periodNumber}`}
                        period={period}
                        rowSpan={rowCount || 1}
                      />
                    )
                  }
                  const slot = byTeacher.get(teacherSlotKey(employeeId, periodNumber, 0))
                  const clash = isClashCell(clashCells, { employeeId, periodNumber })
                  return (
                    <td key={`${employeeId}-${periodNumber}`} className="border border-slate-300 p-0">
                      <button
                        type="button"
                        data-clash-cell={clash ? '1' : undefined}
                        onClick={() =>
                          onCellClick({
                            employeeId,
                            periodNumber,
                            slot,
                            rowLabel: name,
                          })
                        }
                        className={clash ? CLASH_CELL_CLASS : NORMAL_CELL_CLASS}
                      >
                        {slot ? (
                          <>
                            <span className={`text-xs font-bold ${clash ? 'text-rose-800' : 'text-slate-800'}`}>
                              {getText(slot, 'className', 'ClassName')}
                            </span>
                            <span className={`mt-0.5 text-[10px] ${clash ? 'text-rose-600' : 'text-slate-500'}`}>
                              {getText(slot, 'subjectShortName', 'SubjectShortName') ||
                                getText(slot, 'subjectName', 'SubjectName')}
                            </span>
                          </>
                        ) : withFree ? (
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
  )
}

export default function CampusTimetableEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const timetableId = Number(id)

  const [detail, setDetail] = useState(null)
  const [slots, setSlots] = useState([])
  const [candidates, setCandidates] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [allTeachers, setAllTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const {
    loaderOpen,
    loaderText,
    showLoader,
    hideLoader,
    showError,
    runAsync,
  } = useTimetableUiFeedback()
  const [metaForm, setMetaForm] = useState({ name: '', displayTitle: '', subtitle: '' })
  const [editor, setEditor] = useState(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [leavePath, setLeavePath] = useState(null)
  const [clashCells, setClashCells] = useState([])

  const onNavigationBlocked = useCallback((path) => {
    setLeavePath(path)
  }, [])

  const { proceedRouteNavigation } = useUnsavedChangesGuard({
    enabled: dirty && !leavePath && !structureOpen && !editor,
    onNavigationBlocked,
  })

  const confirmLeave = () => {
    const path = leavePath
    setLeavePath(null)
    setDirty(false)
    proceedRouteNavigation(path)
  }

  const showClash = useCallback((cells) => {
    setClashCells(cells)
    setEditor(null)
  }, [])

  useEffect(() => {
    if (!clashCells.length) return undefined
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('[data-clash-cell="1"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    })
    const timer = window.setTimeout(() => setClashCells([]), 7000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [clashCells])

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
      setMetaForm({
        name: getText(tt, 'name', 'Name'),
        displayTitle: getText(tt, 'displayTitle', 'DisplayTitle'),
        subtitle: getText(tt, 'subtitle', 'Subtitle'),
      })
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
      navigate('/campus/timetables')
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
      id: input.id,
      sectionID: input.sectionID,
      subjectID: input.subjectID,
      employeeID: input.employeeID,
      periodNumber: input.periodNumber,
      dayOfWeek: input.dayOfWeek || 0,
      className:
        getText(cls, 'className', 'ClassName') ||
        getText(fromCandidate, 'className', 'ClassName') ||
        `Class ${input.sectionID}`,
      subjectName:
        getText(subject, 'subjectName', 'SubjectName') ||
        getText(fromCandidate, 'subjectName', 'SubjectName') ||
        `Subject ${input.subjectID}`,
      subjectShortName:
        getText(subject, 'shortName', 'ShortName') || getText(fromCandidate, 'subjectShortName', 'SubjectShortName'),
      employeeName:
        getText(teacher, 'employeeName', 'EmployeeName') ||
        getText(fromCandidate, 'employeeName', 'EmployeeName') ||
        `Teacher ${input.employeeID}`,
      gender: getText(teacher, 'gender', 'Gender') || getText(fromCandidate, 'gender', 'Gender'),
    }
  }

  const openCell = ({ sectionId, employeeId, periodNumber, slot, rowLabel }) => {
    const isClassWise = formatType === TT_FORMAT.CLASS_WISE
    setClashCells([])
    setEditor({
      periodNumber,
      rowLabel,
      rowSectionID: isClassWise ? sectionId : getId(slot, 'sectionID', 'SectionID'),
      rowEmployeeID: isClassWise ? getId(slot, 'employeeID', 'EmployeeID') : employeeId,
      sectionID: isClassWise ? sectionId : getId(slot, 'sectionID', 'SectionID'),
      employeeID: isClassWise ? getId(slot, 'employeeID', 'EmployeeID') : employeeId,
      subjectID: getId(slot, 'subjectID', 'SubjectID'),
      slotId: getId(slot, 'id', 'ID') || undefined,
      classOptions,
      teacherOptions,
    })
  }

  const periodLabel = (periodNumber) => {
    const period = (detail?.periods || []).find(
      (p) => getId(p, 'periodNumber', 'PeriodNumber') === periodNumber,
    )
    return getText(period, 'label', 'Label') || `Period ${periodNumber}`
  }

  const clashTargetFromSlot = (slot) => ({
    sectionId: getId(slot, 'sectionID', 'SectionID') || undefined,
    employeeId: getId(slot, 'employeeID', 'EmployeeID') || undefined,
    periodNumber: getId(slot, 'periodNumber', 'PeriodNumber'),
  })

  const applyEditorSlot = (next) => {
    const isClassWise = formatType === TT_FORMAT.CLASS_WISE
    const isSameCell = (slot) => {
      const periodNumber = getId(slot, 'periodNumber', 'PeriodNumber')
      const dayOfWeek = getId(slot, 'dayOfWeek', 'DayOfWeek') || 0
      if (periodNumber !== next.periodNumber || dayOfWeek !== 0) return false
      if (isClassWise) return getId(slot, 'sectionID', 'SectionID') === next.sectionID
      return getId(slot, 'employeeID', 'EmployeeID') === next.employeeID
    }

    const teacherClash = slots.find(
      (slot) =>
        !isSameCell(slot) &&
        getId(slot, 'employeeID', 'EmployeeID') === next.employeeID &&
        getId(slot, 'periodNumber', 'PeriodNumber') === next.periodNumber &&
        (getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) === 0,
    )
    if (teacherClash) {
      showError(
        `Teacher "${getText(teacherClash, 'employeeName', 'EmployeeName') || next.employeeID}" is already booked in ${periodLabel(next.periodNumber)} for "${getText(teacherClash, 'className', 'ClassName')}".`,
        'Teacher clash',
      )
      showClash([clashTargetFromSlot(teacherClash)])
      return
    }

    const classClash = slots.find(
      (slot) =>
        !isSameCell(slot) &&
        getId(slot, 'sectionID', 'SectionID') === next.sectionID &&
        getId(slot, 'periodNumber', 'PeriodNumber') === next.periodNumber &&
        (getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) === 0,
    )
    if (classClash) {
      const className = getText(classClash, 'className', 'ClassName') || `Class ${next.sectionID}`
      const clashTeacher = getText(classClash, 'employeeName', 'EmployeeName') || 'another teacher'
      const clashSubject =
        getText(classClash, 'subjectShortName', 'SubjectShortName') ||
        getText(classClash, 'subjectName', 'SubjectName') ||
        'another subject'
      showError(
        `Class "${className}" is already with ${clashTeacher} (${clashSubject}) in ${periodLabel(next.periodNumber)}. A class can only have one lesson at a time.`,
        'Class clash',
      )
      showClash([clashTargetFromSlot(classClash)])
      return
    }

    // Same class + subject cannot be taught by two different teachers (any period).
    const subjectOwnerClash = slots.find(
      (slot) =>
        !isSameCell(slot) &&
        getId(slot, 'sectionID', 'SectionID') === next.sectionID &&
        getId(slot, 'subjectID', 'SubjectID') === next.subjectID &&
        (getId(slot, 'dayOfWeek', 'DayOfWeek') || 0) === (next.dayOfWeek || 0) &&
        getId(slot, 'employeeID', 'EmployeeID') !== next.employeeID,
    )
    if (subjectOwnerClash) {
      const className = getText(subjectOwnerClash, 'className', 'ClassName') || `Class ${next.sectionID}`
      const subjectName =
        getText(subjectOwnerClash, 'subjectShortName', 'SubjectShortName') ||
        getText(subjectOwnerClash, 'subjectName', 'SubjectName') ||
        `Subject ${next.subjectID}`
      const ownerName = getText(subjectOwnerClash, 'employeeName', 'EmployeeName') || 'another teacher'
      showError(
        `"${subjectName}" for "${className}" is already assigned to ${ownerName} (${periodLabel(getId(subjectOwnerClash, 'periodNumber', 'PeriodNumber'))}). ` +
          'A class subject can only have one teacher on this timetable.',
        'Subject clash',
      )
      showClash([clashTargetFromSlot(subjectOwnerClash)])
      return
    }

    setClashCells([])
    setSlots((current) => [...current.filter((slot) => !isSameCell(slot)), enrichSlot(next)])
    setDirty(true)
    setEditor(null)
  }

  const clearEditorSlot = () => {
    if (!editor) return
    const isClassWise = formatType === TT_FORMAT.CLASS_WISE
    setSlots((current) =>
      current.filter((slot) => {
        const periodNumber = getId(slot, 'periodNumber', 'PeriodNumber')
        const dayOfWeek = getId(slot, 'dayOfWeek', 'DayOfWeek') || 0
        if (periodNumber !== editor.periodNumber || dayOfWeek !== 0) return true
        if (isClassWise) return getId(slot, 'sectionID', 'SectionID') !== editor.sectionID
        return getId(slot, 'employeeID', 'EmployeeID') !== editor.employeeID
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
            name: metaForm.name.trim(),
            displayTitle: metaForm.displayTitle.trim() || null,
            subtitle: metaForm.subtitle.trim() || null,
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

  const importFromAllocation = async () => {
    if (dirty && !window.confirm('Importing will reload from the server and discard unsaved cell edits. Continue?')) {
      return
    }
    try {
      const saved = await runAsync(
        'Importing from subject allocation…',
        () => seedTimetableFromAllocation(timetableId),
        { successMessage: 'Slots imported. Review the grid and save if needed.' },
      )
      setDetail(saved)
      setSlots(saved.slots || [])
      setCandidates(await getTimetableAllocationCandidates(timetableId))
      setDirty(false)
    } catch {
      /* feedback shown */
    }
  }

  const print = async () => {
    if (dirty) {
      showError('Save your changes before printing.', 'Unsaved changes')
      return
    }
    try {
      const printData = await runAsync('Preparing print…', () => getTimetablePrint(timetableId))
      if (!openTimetablePrint(printData, { campusLabel: getCampusLabel(localStorage.getItem('campus') || '') })) {
        showError('Allow pop-ups to print.', 'Print blocked')
      }
    } catch {
      /* feedback shown */
    }
  }

  if (loading || !detail) {
    return (
      <CampusShell headerContext="Timetable">
        <TimetablePopupLoader open={loaderOpen} text={loaderText} />
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Timetable editor">
      <div className="px-4 pb-10 pt-[4.5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <Link
                  to="/campus/timetables"
                  className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[var(--campus-primary)]"
                >
                  <ArrowLeft size={14} />
                  All timetables
                </Link>
                <h1 className="truncate text-xl font-semibold text-slate-900">{printTitle(detail)}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {meta?.label} · click any cell to assign · {dirty ? 'Unsaved changes' : 'Saved'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (dirty && !window.confirm('You have unsaved cell edits. Opening structure will reload after save and discard unsaved cells unless you Save first. Continue?')) {
                      return
                    }
                    setStructureOpen(true)
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Settings2 size={15} />
                  Structure
                </button>
                <button
                  type="button"
                  onClick={importFromAllocation}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Sparkles size={15} />
                  Import from allocation
                </button>
                <button
                  type="button"
                  onClick={print}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-100 px-3 text-sm font-semibold text-[var(--campus-primary)] hover:bg-indigo-50"
                >
                  <Printer size={15} />
                  Print
                </button>
                <button
                  type="button"
                  disabled={loaderOpen}
                  onClick={saveSlots}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                >
                  <Save size={15} />
                  Save
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Name</span>
                <input
                  className={selectClass}
                  value={metaForm.name}
                  onChange={(e) => {
                    setMetaForm((c) => ({ ...c, name: e.target.value }))
                    setDirty(true)
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Print title</span>
                <input
                  className={selectClass}
                  value={metaForm.displayTitle}
                  onChange={(e) => {
                    setMetaForm((c) => ({ ...c, displayTitle: e.target.value }))
                    setDirty(true)
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Subtitle</span>
                <input
                  className={selectClass}
                  value={metaForm.subtitle}
                  onChange={(e) => {
                    setMetaForm((c) => ({ ...c, subtitle: e.target.value }))
                    setDirty(true)
                  }}
                />
              </label>
            </div>

            <div className="p-4">
              {formatType === TT_FORMAT.CLASS_WISE ? (
                <ClassWiseGrid detail={detail} slots={slots} onCellClick={openCell} clashCells={clashCells} />
              ) : (
                <TeacherWiseGrid
                  detail={detail}
                  slots={slots}
                  onCellClick={openCell}
                  clashCells={clashCells}
                  withFree={formatType === TT_FORMAT.TEACHER_WISE_FREE}
                  withSerial={formatType === TT_FORMAT.TEACHER_WISE_FULL}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <SlotEditorModal
        open={Boolean(editor)}
        context={editor}
        candidates={candidates}
        subjects={subjects}
        formatType={formatType}
        onClose={() => setEditor(null)}
        onSave={applyEditorSlot}
        onClear={clearEditorSlot}
        onValidationError={showError}
      />

      <ManageStructureModal
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        detail={detail}
        allClasses={allClasses}
        allTeachers={allTeachers}
        onSaved={load}
      />

      {leavePath && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Unsaved changes</h3>
            <p className="mt-2 text-sm text-slate-600">
              You have unsaved timetable edits. Leave this page and discard them?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeavePath(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      <TimetablePopupLoader open={loaderOpen} text={loaderText} />
    </CampusShell>
  )
}

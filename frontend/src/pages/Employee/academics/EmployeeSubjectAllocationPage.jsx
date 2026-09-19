import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BookOpenCheck,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import { getClasses } from '../../../services/classService'
import { sortClassesByCustomOrder } from '../../../services/classSort'
import { getSubjects } from '../../../services/subjectService'
import { sortSubjectsByCustomOrder } from '../../../services/subjectSort'
import {
  createTeacherClassSubjectAssignment,
  deleteTeacherClassSubjectAssignment,
  getTeacherAssignmentEmployees,
  getTeacherClassSubjectAssignments,
} from '../../../services/teacherClassSubjectAssignmentService'
import { getId, getText } from './employeeAcademicsUtils'

const assignmentKey = (row) => `${Number(row.classID)}:${Number(row.subjectID)}`
const classAssignmentKey = (row) => `${Number(row.employeeID)}:${Number(row.subjectID)}`

const getSubjectShortName = (item) =>
  getText(item, 'subjectShortName', 'SubjectShortName') ||
  getText(item, 'shortName', 'ShortName') ||
  getText(item, 'subjectName', 'SubjectName')

const getTeacherReportName = (assignment, teacherId) => {
  const employeeName = getText(assignment, 'employeeName', 'EmployeeName') || `Teacher ${teacherId}`
  const firstName = employeeName.trim().split(/\s+/)[0] || employeeName
  const gender = `${getText(assignment, 'gender', 'Gender')}`.trim().toLowerCase()
  const prefix = gender.startsWith('f') ? 'Miss' : gender.startsWith('m') ? 'Mr' : ''
  return prefix ? `${prefix} ${firstName}` : firstName
}

function ManageClassOverlay({
  classItem,
  assignments,
  allAssignments,
  employees,
  subjects,
  saving,
  onClose,
  onSave,
}) {
  const [step, setStep] = useState(1)
  const [rows, setRows] = useState([])
  const [activeEmployeeId, setActiveEmployeeId] = useState(null)
  const [teacherSearch, setTeacherSearch] = useState('')

  const teacherItems = useMemo(
    () =>
      employees.map((item) => ({
        id: getId(item, 'id', 'ID'),
        name: getText(item, 'employeeName', 'EmployeeName'),
      })),
    [employees],
  )

  const subjectItems = useMemo(
    () =>
      subjects.map((item) => ({
        id: getId(item, 'id', 'ID'),
        name: getSubjectShortName(item),
        fullName: getText(item, 'subjectName', 'SubjectName'),
      })),
    [subjects],
  )

  const filteredTeachers = useMemo(() => {
    const needle = teacherSearch.trim().toLowerCase()
    if (!needle) return teacherItems
    return teacherItems.filter((item) => (item.name || '').toLowerCase().includes(needle))
  }, [teacherItems, teacherSearch])

  useEffect(() => {
    if (!classItem) return
    const nextRows = assignments.map((item) => ({
      id: getId(item, 'id', 'ID'),
      employeeID: getId(item, 'employeeID', 'EmployeeID'),
      subjectID: getId(item, 'subjectID', 'SubjectID'),
    }))
    setRows(nextRows)
    setActiveEmployeeId(null)
    setStep(1)
    setTeacherSearch('')
  }, [assignments, classItem])

  if (!classItem) return null

  const classId = getId(classItem, 'id', 'ID')
  const className = getText(classItem, 'className', 'ClassName') || 'Class'
  const activeTeacher = teacherItems.find((item) => item.id === Number(activeEmployeeId)) || null
  const activeSubjectIds = new Set(
    rows
      .filter((row) => Number(row.employeeID) === Number(activeTeacher?.id))
      .map((row) => Number(row.subjectID)),
  )
  const selectedTeacherIds = new Set(rows.map((row) => Number(row.employeeID)))

  const toggleSubject = (subjectId) => {
    if (!activeTeacher?.id) return
    const conflictingDraft = rows.find(
      (row) =>
        Number(row.subjectID) === Number(subjectId) &&
        Number(row.employeeID) !== Number(activeTeacher.id),
    )
    if (conflictingDraft) {
      const other = teacherItems.find((item) => Number(item.id) === Number(conflictingDraft.employeeID))
      toast.error(
        `Subject is already assigned to ${other?.name || 'another teacher'} for this class.`,
      )
      return
    }
    const conflicting = allAssignments.find(
      (assignment) =>
        getId(assignment, 'classID', 'ClassID') === classId &&
        getId(assignment, 'subjectID', 'SubjectID') === Number(subjectId) &&
        getId(assignment, 'employeeID', 'EmployeeID') !== Number(activeTeacher.id),
    )
    if (conflicting) {
      toast.error(
        `${getText(conflicting, 'subjectName', 'SubjectName') || 'Subject'} is already assigned to ${
          getText(conflicting, 'employeeName', 'EmployeeName') || 'another teacher'
        } for this class.`,
      )
      return
    }

    setRows((current) => {
      const exists = current.some(
        (row) =>
          Number(row.employeeID) === Number(activeTeacher.id) &&
          Number(row.subjectID) === Number(subjectId),
      )
      if (exists) {
        return current.filter(
          (row) =>
            !(
              Number(row.employeeID) === Number(activeTeacher.id) &&
              Number(row.subjectID) === Number(subjectId)
            ),
        )
      }
      return [...current, { employeeID: Number(activeTeacher.id), subjectID: Number(subjectId) }]
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{className}</p>
          <p className="text-xs text-slate-500">
            {step === 1 ? 'Step 1 · Pick teacher' : `Step 2 · Subjects for ${activeTeacher?.name || 'teacher'}`}
          </p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 1 ? (
          <>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-2">
              {filteredTeachers.map((item) => {
                const count = rows.filter((row) => Number(row.employeeID) === Number(item.id)).length
                const hasSubjects = selectedTeacherIds.has(Number(item.id))
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveEmployeeId(item.id)
                      setStep(2)
                    }}
                    className={`emp-surface flex min-h-14 w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
                      hasSubjects ? 'ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    <span className="font-semibold text-slate-800">{item.name || 'Teacher'}</span>
                    <span className={`text-xs font-semibold ${hasSubjects ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {count} subject{count === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
              {filteredTeachers.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No teachers found.</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjectItems.map((subject) => {
              const selected = activeSubjectIds.has(Number(subject.id))
              const conflictingRow = rows.find(
                (row) =>
                  Number(row.subjectID) === Number(subject.id) &&
                  Number(row.employeeID) !== Number(activeTeacher?.id),
              )
              const disabled = Boolean(conflictingRow)
              return (
                <button
                  key={subject.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSubject(subject.id)}
                  className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                      : disabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {subject.name || 'Subject'}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
        {step === 2 ? (
          <EmployeeBackButton
            fullWidth={false}
            label="Back"
            onClick={() => setStep(1)}
            disabled={saving}
            className="h-12"
          />
        ) : (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="emp-cta-btn emp-cta-btn-tonal h-12 flex-1"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(classItem, rows)}
          className="emp-cta-btn emp-cta-btn-success h-12 flex-[1.4]"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  )
}

function ManageTeacherOverlay({
  employee,
  assignments,
  allAssignments,
  classes,
  subjects,
  saving,
  onClose,
  onSave,
}) {
  const [step, setStep] = useState(1)
  const [rows, setRows] = useState([])
  const [activeClassId, setActiveClassId] = useState(null)
  const [classSearch, setClassSearch] = useState('')

  const classItems = useMemo(
    () =>
      classes.map((item) => ({
        id: getId(item, 'id', 'ID'),
        name: getText(item, 'className', 'ClassName'),
      })),
    [classes],
  )

  const subjectItems = useMemo(
    () =>
      subjects.map((item) => ({
        id: getId(item, 'id', 'ID'),
        name: getSubjectShortName(item),
      })),
    [subjects],
  )

  const filteredClasses = useMemo(() => {
    const needle = classSearch.trim().toLowerCase()
    if (!needle) return classItems
    return classItems.filter((item) => (item.name || '').toLowerCase().includes(needle))
  }, [classItems, classSearch])

  useEffect(() => {
    if (!employee) return
    const nextRows = assignments.map((item) => ({
      id: getId(item, 'id', 'ID'),
      classID: getId(item, 'classID', 'ClassID'),
      subjectID: getId(item, 'subjectID', 'SubjectID'),
    }))
    setRows(nextRows)
    setActiveClassId(null)
    setStep(1)
    setClassSearch('')
  }, [assignments, employee])

  if (!employee) return null

  const employeeId = getId(employee, 'id', 'ID')
  const employeeName = getText(employee, 'employeeName', 'EmployeeName') || 'Teacher'
  const activeClass = classItems.find((item) => item.id === Number(activeClassId)) || null
  const activeSubjectIds = new Set(
    rows.filter((row) => Number(row.classID) === Number(activeClass?.id)).map((row) => Number(row.subjectID)),
  )
  const selectedClassIds = new Set(rows.map((row) => Number(row.classID)))

  const toggleSubject = (subjectId) => {
    if (!activeClass?.id) return
    const conflicting = allAssignments.find(
      (assignment) =>
        getId(assignment, 'classID', 'ClassID') === Number(activeClass.id) &&
        getId(assignment, 'subjectID', 'SubjectID') === Number(subjectId) &&
        getId(assignment, 'employeeID', 'EmployeeID') !== employeeId,
    )
    if (conflicting) {
      toast.error(
        `${getText(conflicting, 'subjectName', 'SubjectName') || 'Subject'} is already assigned to ${
          getText(conflicting, 'employeeName', 'EmployeeName') || 'another teacher'
        } for this class.`,
      )
      return
    }

    setRows((current) => {
      const exists = current.some(
        (row) => Number(row.classID) === Number(activeClass.id) && Number(row.subjectID) === Number(subjectId),
      )
      if (exists) {
        return current.filter(
          (row) => !(Number(row.classID) === Number(activeClass.id) && Number(row.subjectID) === Number(subjectId)),
        )
      }
      return [...current, { classID: Number(activeClass.id), subjectID: Number(subjectId) }]
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{employeeName}</p>
          <p className="text-xs text-slate-500">
            {step === 1 ? 'Step 1 · Pick class' : `Step 2 · Subjects for ${activeClass?.name || 'class'}`}
          </p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 1 ? (
          <>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Search class"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-2">
              {filteredClasses.map((item) => {
                const count = rows.filter((row) => Number(row.classID) === Number(item.id)).length
                const hasSubjects = selectedClassIds.has(Number(item.id))
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveClassId(item.id)
                      setStep(2)
                    }}
                    className={`emp-surface flex min-h-14 w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
                      hasSubjects ? 'ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    <span className="font-semibold text-slate-800">{item.name || 'Class'}</span>
                    <span className={`text-xs font-semibold ${hasSubjects ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {count} subject{count === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
              {filteredClasses.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No classes found.</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjectItems.map((subject) => {
              const selected = activeSubjectIds.has(Number(subject.id))
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {subject.name || 'Subject'}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
        {step === 2 ? (
          <EmployeeBackButton
            fullWidth={false}
            label="Back"
            onClick={() => setStep(1)}
            disabled={saving}
            className="h-12"
          />
        ) : (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="emp-cta-btn emp-cta-btn-tonal h-12 flex-1"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(employee, rows)}
          className="emp-cta-btn emp-cta-btn-success h-12 flex-[1.4]"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  )
}

function ReportOverlay({ open, matrix, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-base font-bold text-slate-900">Allocation report</p>
          <p className="text-xs text-slate-500">Swipe sideways to see all subjects</p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {matrix.classes.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No assignments yet.</p>
        ) : (
          <table className="min-w-max border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-indigo-50 px-3 py-2 text-left font-semibold text-slate-700">
                  Class
                </th>
                {matrix.subjects.map((subject) => (
                  <th
                    key={subject.subjectID}
                    className="border border-slate-200 bg-indigo-50 px-3 py-2 text-left font-semibold text-slate-700"
                  >
                    {subject.subjectName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.classes.map((classRow) => (
                <tr key={classRow.classID}>
                  <th className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800">
                    {classRow.className}
                  </th>
                  {matrix.subjects.map((subject) => {
                    const teachers = classRow.cells.get(subject.subjectID) || []
                    return (
                      <td key={`${classRow.classID}-${subject.subjectID}`} className="border border-slate-200 px-3 py-2 align-top text-slate-700">
                        {teachers.map((name) => (
                          <div key={name}>{name}</div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EmployeeSubjectAllocationPage() {
  const canEdit = hasEmployeeAppAccess('canEditSubjectAllocation')
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('class')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    const settled = await Promise.allSettled([
      getTeacherClassSubjectAssignments(),
      getTeacherAssignmentEmployees(),
      getClasses(),
      getSubjects(),
    ])

    const [assignmentResult, employeeResult, classResult, subjectResult] = settled
    const valueOr = (result, fallback) => (result.status === 'fulfilled' ? result.value : fallback)

    setAssignments(valueOr(assignmentResult, []))
    setEmployees(valueOr(employeeResult, []))
    setClasses(valueOr(classResult, []))
    setSubjects(valueOr(subjectResult, []))

    const failed = settled.find((result) => result.status === 'rejected')
    if (failed?.status === 'rejected') {
      const error = failed.reason
      toast.error(error?.response?.data?.message || 'Could not load subject allocation.')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const assignmentsByEmployee = useMemo(() => {
    const grouped = new Map()
    assignments.forEach((assignment) => {
      const employeeId = getId(assignment, 'employeeID', 'EmployeeID')
      if (!grouped.has(employeeId)) grouped.set(employeeId, [])
      grouped.get(employeeId).push(assignment)
    })
    return grouped
  }, [assignments])

  const assignmentsByClass = useMemo(() => {
    const grouped = new Map()
    assignments.forEach((assignment) => {
      const classId = getId(assignment, 'classID', 'ClassID')
      if (!grouped.has(classId)) grouped.set(classId, [])
      grouped.get(classId).push(assignment)
    })
    return grouped
  }, [assignments])

  const employeeRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return employees
      .map((employee) => {
        const employeeId = getId(employee, 'id', 'ID')
        return { employee, employeeId, assignments: assignmentsByEmployee.get(employeeId) || [] }
      })
      .filter(({ employee, assignments: rows }) => {
        if (!needle) return true
        const name = getText(employee, 'employeeName', 'EmployeeName')
        const text = rows
          .map((item) => `${getText(item, 'className', 'ClassName')} ${getText(item, 'subjectName', 'SubjectName')}`)
          .join(' ')
        return `${name} ${text}`.toLowerCase().includes(needle)
      })
  }, [assignmentsByEmployee, employees, search])

  const classRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return classes
      .map((classItem) => {
        const classId = getId(classItem, 'id', 'ID')
        return { classItem, classId, assignments: assignmentsByClass.get(classId) || [] }
      })
      .filter(({ classItem, assignments: rows }) => {
        if (!needle) return true
        const name = getText(classItem, 'className', 'ClassName')
        const text = rows
          .map((item) => `${getText(item, 'employeeName', 'EmployeeName')} ${getText(item, 'subjectName', 'SubjectName')}`)
          .join(' ')
        return `${name} ${text}`.toLowerCase().includes(needle)
      })
  }, [assignmentsByClass, classes, search])

  const reportMatrix = useMemo(() => {
    const subjectMap = new Map()
    const classMap = new Map()
    const subjectLookup = new Map(
      subjects.map((subject) => [
        getId(subject, 'id', 'ID'),
        {
          shortName: getSubjectShortName(subject),
          fullName: getText(subject, 'subjectName', 'SubjectName'),
        },
      ]),
    )

    assignments.forEach((assignment) => {
      const classID = getId(assignment, 'classID', 'ClassID')
      const subjectID = getId(assignment, 'subjectID', 'SubjectID')
      const teacherID = getId(assignment, 'employeeID', 'EmployeeID')
      if (!classID || !subjectID || !teacherID) return

      if (!subjectMap.has(subjectID)) {
        const lookup = subjectLookup.get(subjectID)
        subjectMap.set(subjectID, {
          subjectID,
          subjectName:
            lookup?.shortName || getText(assignment, 'subjectName', 'SubjectName') || 'Subject',
          subjectFullName: lookup?.fullName || getText(assignment, 'subjectName', 'SubjectName'),
        })
      }

      if (!classMap.has(classID)) {
        classMap.set(classID, {
          classID,
          className: getText(assignment, 'className', 'ClassName') || 'Class',
          cells: new Map(),
        })
      }

      const classRow = classMap.get(classID)
      if (!classRow.cells.has(subjectID)) classRow.cells.set(subjectID, [])
      const teacherName = getTeacherReportName(assignment, teacherID)
      if (!classRow.cells.get(subjectID).includes(teacherName)) {
        classRow.cells.get(subjectID).push(teacherName)
      }
    })

    const matrixClassRows = Array.from(classMap.values()).map((classRow) => {
      classRow.cells.forEach((teachers, subjectID) => {
        classRow.cells.set(subjectID, [...teachers].sort((a, b) => a.localeCompare(b)))
      })
      return classRow
    })

    return {
      classes: sortClassesByCustomOrder(matrixClassRows, 'className'),
      subjects: sortSubjectsByCustomOrder(Array.from(subjectMap.values()), 'subjectName'),
    }
  }, [assignments, subjects])

  const saveEmployeeAssignments = async (employee, nextRows) => {
    const employeeId = getId(employee, 'id', 'ID')
    const currentRows = assignmentsByEmployee.get(employeeId) || []
    const currentKeys = new Set(currentRows.map(assignmentKey))
    const nextKeys = new Set(nextRows.map(assignmentKey))
    const deleteRows = currentRows.filter((row) => !nextKeys.has(assignmentKey(row)))
    const createRows = nextRows.filter((row) => !currentKeys.has(assignmentKey(row)))
    const toastId = `emp-teacher-assignments-${employeeId}`

    setIsSaving(true)
    toast.loading('Saving changes…', { id: toastId })
    try {
      for (const row of deleteRows) {
        await deleteTeacherClassSubjectAssignment(getId(row, 'id', 'ID'))
      }
      for (const row of createRows) {
        await createTeacherClassSubjectAssignment({
          employeeID: employeeId,
          classID: Number(row.classID),
          subjectID: Number(row.subjectID),
        })
      }
      await loadData()
      setSelectedEmployee(null)
      toast.success('Assignments updated.', { id: toastId })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update assignments.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const saveClassAssignments = async (classItem, nextRows) => {
    const classId = getId(classItem, 'id', 'ID')
    const currentRows = assignmentsByClass.get(classId) || []
    const currentKeys = new Set(
      currentRows.map((row) => `${getId(row, 'employeeID', 'EmployeeID')}:${getId(row, 'subjectID', 'SubjectID')}`),
    )
    const nextKeys = new Set(nextRows.map(classAssignmentKey))
    const deleteRows = currentRows.filter(
      (row) => !nextKeys.has(`${getId(row, 'employeeID', 'EmployeeID')}:${getId(row, 'subjectID', 'SubjectID')}`),
    )
    const createRows = nextRows.filter((row) => !currentKeys.has(classAssignmentKey(row)))
    const toastId = `emp-class-assignments-${classId}`

    setIsSaving(true)
    toast.loading('Saving changes…', { id: toastId })
    try {
      for (const row of deleteRows) {
        await deleteTeacherClassSubjectAssignment(getId(row, 'id', 'ID'))
      }
      for (const row of createRows) {
        await createTeacherClassSubjectAssignment({
          employeeID: Number(row.employeeID),
          classID: classId,
          subjectID: Number(row.subjectID),
        })
      }
      await loadData()
      setSelectedClass(null)
      toast.success('Assignments updated.', { id: toastId })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update assignments.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EmployeeLayout
      title="Subject allocation"
      subtitle="Assign teachers to class subjects"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="emp-surface rounded-2xl p-3">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('class')}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                activeTab === 'class'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <GraduationCap size={16} /> Class wise
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                activeTab === 'teacher'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <UserRound size={16} /> Teacher wise
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'class' ? 'Search class or teacher' : 'Search teacher or class'}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="emp-cta-btn emp-cta-btn-primary h-11 px-3"
              aria-label="Report"
            >
              <FileText size={16} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" />
            Loading…
          </div>
        ) : activeTab === 'class' ? (
          <div className="space-y-2">
            {classRows.length === 0 ? (
              <div className="emp-surface rounded-2xl px-4 py-12 text-center text-sm text-slate-500">
                No classes found.
              </div>
            ) : (
              classRows.map(({ classItem, classId, assignments: rows }) => {
                const teacherCount = new Set(rows.map((r) => getId(r, 'employeeID', 'EmployeeID'))).size
                return (
                  <div key={classId} className="emp-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {getText(classItem, 'className', 'ClassName') || 'Class'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {teacherCount} teacher{teacherCount === 1 ? '' : 's'} · {rows.length} subject
                        {rows.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => canEdit && setSelectedClass(classItem)}
                      disabled={!canEdit}
                      className="emp-cta-btn emp-cta-btn-primary h-10 shrink-0 px-4 disabled:opacity-50"
                    >
                      <BookOpenCheck size={15} /> Manage
                    </button>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {employeeRows.length === 0 ? (
              <div className="emp-surface rounded-2xl px-4 py-12 text-center text-sm text-slate-500">
                No teachers found.
              </div>
            ) : (
              employeeRows.map(({ employee, employeeId, assignments: rows }) => {
                const classCount = new Set(rows.map((r) => getId(r, 'classID', 'ClassID'))).size
                return (
                  <div key={employeeId} className="emp-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {getText(employee, 'employeeName', 'EmployeeName') || 'Teacher'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {classCount} class{classCount === 1 ? '' : 'es'} · {rows.length} subject
                        {rows.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => canEdit && setSelectedEmployee(employee)}
                      disabled={!canEdit}
                      className="emp-cta-btn emp-cta-btn-primary h-10 shrink-0 px-4 disabled:opacity-50"
                    >
                      <BookOpenCheck size={15} /> Manage
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {selectedClass ? (
        <ManageClassOverlay
          classItem={selectedClass}
          assignments={assignmentsByClass.get(getId(selectedClass, 'id', 'ID')) || []}
          allAssignments={assignments}
          employees={employees}
          subjects={subjects}
          saving={isSaving}
          onClose={() => setSelectedClass(null)}
          onSave={saveClassAssignments}
        />
      ) : null}

      {selectedEmployee ? (
        <ManageTeacherOverlay
          employee={selectedEmployee}
          assignments={assignmentsByEmployee.get(getId(selectedEmployee, 'id', 'ID')) || []}
          allAssignments={assignments}
          classes={classes}
          subjects={subjects}
          saving={isSaving}
          onClose={() => setSelectedEmployee(null)}
          onSave={saveEmployeeAssignments}
        />
      ) : null}

      <ReportOverlay open={isReportOpen} matrix={reportMatrix} onClose={() => setIsReportOpen(false)} />
    </EmployeeLayout>
  )
}

export default EmployeeSubjectAllocationPage

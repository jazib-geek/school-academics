import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BookOpenCheck, FileText, GraduationCap, Loader2, Pencil, Printer, Search, UserRound, X } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell'
import { getCampusLabel } from '../../../constants/branding'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
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
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const getId = (item, lower, upper) => Number(item?.[lower] ?? item?.[upper] ?? 0)
const getText = (item, lower, upper) => item?.[lower] ?? item?.[upper] ?? ''
const assignmentKey = (row) => `${Number(row.classID)}:${Number(row.subjectID)}`
const classAssignmentKey = (row) => `${Number(row.employeeID)}:${Number(row.subjectID)}`

const getSubjectShortName = (item) =>
  getText(item, 'subjectShortName', 'SubjectShortName') ||
  getText(item, 'shortName', 'ShortName') ||
  getText(item, 'subjectName', 'SubjectName')

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getTeacherReportName = (assignment, teacherId) => {
  const employeeName = getText(assignment, 'employeeName', 'EmployeeName') || `Teacher ${teacherId}`
  const firstName = employeeName.trim().split(/\s+/)[0] || employeeName
  const gender = `${getText(assignment, 'gender', 'Gender')}`.trim().toLowerCase()
  const prefix = gender.startsWith('f') ? 'Miss' : gender.startsWith('m') ? 'Mr' : ''

  return prefix ? `${prefix} ${firstName}` : firstName
}

function ManageAssignmentsModal({ employee, assignments, allAssignments, classes, subjects, saving, onClose, onSave }) {
  const [rows, setRows] = useState([])
  const [activeClassId, setActiveClassId] = useState(null)
  const [classSearch, setClassSearch] = useState('')

  const classItems = useMemo(
    () => classes.map((item) => ({
      id: getId(item, 'id', 'ID'),
      name: getText(item, 'className', 'ClassName'),
    })),
    [classes],
  )

  const subjectItems = useMemo(
    () => subjects.map((item) => ({
      id: getId(item, 'id', 'ID'),
      name: getSubjectShortName(item),
      fullName: getText(item, 'subjectName', 'SubjectName'),
    })),
    [subjects],
  )

  const filteredClassItems = useMemo(() => {
    const needle = classSearch.trim().toLowerCase()
    if (!needle) return classItems
    return classItems.filter((item) => (item.name || `Class ${item.id}`).toLowerCase().includes(needle))
  }, [classItems, classSearch])

  useEffect(() => {
    if (!employee) return

    const nextRows = assignments.map((item) => ({
      id: getId(item, 'id', 'ID'),
      classID: getId(item, 'classID', 'ClassID'),
      subjectID: getId(item, 'subjectID', 'SubjectID'),
    }))

    setRows(nextRows)
    setActiveClassId(nextRows[0]?.classID || classItems[0]?.id || null)
  }, [assignments, classItems, employee])

  if (!employee) return null

  const employeeName = getText(employee, 'employeeName', 'EmployeeName') || `ID ${getId(employee, 'id', 'ID')}`
  const employeeId = getId(employee, 'id', 'ID')
  const activeClass = classItems.find((item) => item.id === Number(activeClassId)) || classItems[0] || null
  const activeSubjectIds = new Set(
    rows.filter((row) => Number(row.classID) === Number(activeClass?.id)).map((row) => Number(row.subjectID)),
  )
  const selectedClassIds = new Set(rows.map((row) => Number(row.classID)))

  const toggleSubject = (subjectId) => {
    if (!activeClass?.id) return
    const conflictingAssignment = allAssignments.find(
      (assignment) =>
        getId(assignment, 'classID', 'ClassID') === Number(activeClass.id) &&
        getId(assignment, 'subjectID', 'SubjectID') === Number(subjectId) &&
        getId(assignment, 'employeeID', 'EmployeeID') !== employeeId,
    )
    if (conflictingAssignment) {
      toast.error(
        `${getText(conflictingAssignment, 'subjectName', 'SubjectName') || 'Subject'} is already assigned to ${
          getText(conflictingAssignment, 'employeeName', 'EmployeeName') || 'another teacher'
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

  const submit = (event) => {
    event.preventDefault()
    const keys = rows.map(assignmentKey)
    if (new Set(keys).size !== keys.length) {
      toast.error('Duplicate selections are not allowed.')
      return
    }

    onSave(employee, rows)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{employeeName}</h2>
            <p className="mt-1 text-sm text-slate-500">{filledCount(rows)} assignment{filledCount(rows) === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
            <div className="min-h-0 border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <p className="text-sm font-semibold text-slate-900">Classes</p>
                <div className="relative w-56 max-w-[60%]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={classSearch}
                    onChange={(event) => setClassSearch(event.target.value)}
                    placeholder="Search class"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none transition focus:border-[var(--campus-primary)] focus:ring-4 focus:ring-[#405189]/10"
                  />
                </div>
              </div>
              <div className="grid max-h-[56vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
                {filteredClassItems.map((item) => {
                  const active = Number(activeClass?.id) === Number(item.id)
                  const hasSubjects = selectedClassIds.has(Number(item.id))
                  const count = rows.filter((row) => Number(row.classID) === Number(item.id)).length

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveClassId(item.id)}
                      className={`min-h-14 rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? 'border-[var(--campus-primary)] bg-indigo-50 ring-2 ring-[#405189]/15'
                          : hasSubjects
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${hasSubjects ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {item.name || `Class ${item.id}`}
                      </span>
                      <span className={`mt-1 block text-xs ${hasSubjects ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {count} subject{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}
                {filteredClassItems.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No classes found.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-h-0">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {activeClass ? activeClass.name || `Class ${activeClass.id}` : 'Subjects'}
                </p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {activeSubjectIds.size} selected
                </span>
              </div>

              <div className="max-h-[56vh] overflow-y-auto p-4">
                {activeClass ? (
                  <div className="flex flex-wrap gap-2">
                    {subjectItems.map((subject) => {
                      const selected = activeSubjectIds.has(Number(subject.id))
                      const conflictingAssignment = allAssignments.find(
                        (assignment) =>
                          getId(assignment, 'classID', 'ClassID') === Number(activeClass.id) &&
                          getId(assignment, 'subjectID', 'SubjectID') === Number(subject.id) &&
                          getId(assignment, 'employeeID', 'EmployeeID') !== employeeId,
                      )
                      const disabled = Boolean(conflictingAssignment)

                      return (
                        <button
                          key={subject.id}
                          type="button"
                          title={
                            disabled
                              ? `Assigned to ${getText(conflictingAssignment, 'employeeName', 'EmployeeName') || 'another teacher'}`
                              : subject.fullName || subject.name
                          }
                          disabled={disabled}
                          onClick={() => toggleSubject(subject.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm'
                              : disabled
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          {subject.name || `Subject ${subject.id}`}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No classes available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344476] disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function filledCount(rows) {
  return rows.filter((row) => row.classID && row.subjectID).length
}

function ManageClassAssignmentsModal({ classItem, assignments, employees, subjects, saving, onClose, onSave }) {
  const [rows, setRows] = useState([])
  const [activeEmployeeId, setActiveEmployeeId] = useState(null)
  const [teacherSearch, setTeacherSearch] = useState('')

  const teacherItems = useMemo(
    () => employees.map((item) => ({
      id: getId(item, 'id', 'ID'),
      name: getText(item, 'employeeName', 'EmployeeName'),
    })),
    [employees],
  )

  const subjectItems = useMemo(
    () => subjects.map((item) => ({
      id: getId(item, 'id', 'ID'),
      name: getSubjectShortName(item),
      fullName: getText(item, 'subjectName', 'SubjectName'),
    })),
    [subjects],
  )

  const filteredTeacherItems = useMemo(() => {
    const needle = teacherSearch.trim().toLowerCase()
    if (!needle) return teacherItems
    return teacherItems.filter((item) => (item.name || `Teacher ${item.id}`).toLowerCase().includes(needle))
  }, [teacherItems, teacherSearch])

  useEffect(() => {
    if (!classItem) return

    const nextRows = assignments.map((item) => ({
      id: getId(item, 'id', 'ID'),
      employeeID: getId(item, 'employeeID', 'EmployeeID'),
      subjectID: getId(item, 'subjectID', 'SubjectID'),
    }))

    setRows(nextRows)
    setActiveEmployeeId(nextRows[0]?.employeeID || teacherItems[0]?.id || null)
  }, [assignments, classItem, teacherItems])

  if (!classItem) return null

  const classId = getId(classItem, 'id', 'ID')
  const className = getText(classItem, 'className', 'ClassName') || `Class ${classId}`
  const activeTeacher = teacherItems.find((item) => item.id === Number(activeEmployeeId)) || teacherItems[0] || null
  const activeSubjectIds = new Set(
    rows.filter((row) => Number(row.employeeID) === Number(activeTeacher?.id)).map((row) => Number(row.subjectID)),
  )
  const selectedTeacherIds = new Set(rows.map((row) => Number(row.employeeID)))

  const toggleSubject = (subjectId) => {
    if (!activeTeacher?.id) return
    const conflictingRow = rows.find(
      (row) => Number(row.subjectID) === Number(subjectId) && Number(row.employeeID) !== Number(activeTeacher.id),
    )
    if (conflictingRow) {
      const teacher = teacherItems.find((item) => Number(item.id) === Number(conflictingRow.employeeID))
      toast.error(`This subject is already assigned to ${teacher?.name || 'another teacher'} for this class.`)
      return
    }

    setRows((current) => {
      const exists = current.some(
        (row) => Number(row.employeeID) === Number(activeTeacher.id) && Number(row.subjectID) === Number(subjectId),
      )

      if (exists) {
        return current.filter(
          (row) => !(Number(row.employeeID) === Number(activeTeacher.id) && Number(row.subjectID) === Number(subjectId)),
        )
      }

      return [...current, { employeeID: Number(activeTeacher.id), subjectID: Number(subjectId) }]
    })
  }

  const submit = (event) => {
    event.preventDefault()
    const keys = rows.map(classAssignmentKey)
    if (new Set(keys).size !== keys.length) {
      toast.error('Duplicate selections are not allowed.')
      return
    }

    onSave(classItem, rows)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{className}</h2>
            <p className="mt-1 text-sm text-slate-500">{rows.length} assignment{rows.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
            <div className="min-h-0 border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <p className="text-sm font-semibold text-slate-900">Teachers</p>
                <div className="relative w-56 max-w-[60%]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={teacherSearch}
                    onChange={(event) => setTeacherSearch(event.target.value)}
                    placeholder="Search teacher"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none transition focus:border-[var(--campus-primary)] focus:ring-4 focus:ring-[#405189]/10"
                  />
                </div>
              </div>
              <div className="grid max-h-[56vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
                {filteredTeacherItems.map((item) => {
                  const active = Number(activeTeacher?.id) === Number(item.id)
                  const hasSubjects = selectedTeacherIds.has(Number(item.id))
                  const count = rows.filter((row) => Number(row.employeeID) === Number(item.id)).length

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveEmployeeId(item.id)}
                      className={`min-h-14 rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? 'border-[var(--campus-primary)] bg-indigo-50 ring-2 ring-[#405189]/15'
                          : hasSubjects
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${hasSubjects ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {item.name || `Teacher ${item.id}`}
                      </span>
                      <span className={`mt-1 block text-xs ${hasSubjects ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {count} subject{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}
                {filteredTeacherItems.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No teachers found.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-h-0">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {activeTeacher ? activeTeacher.name || `Teacher ${activeTeacher.id}` : 'Subjects'}
                </p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {activeSubjectIds.size} selected
                </span>
              </div>

              <div className="max-h-[56vh] overflow-y-auto p-4">
                {activeTeacher ? (
                  <div className="flex flex-wrap gap-2">
                    {subjectItems.map((subject) => {
                      const selected = activeSubjectIds.has(Number(subject.id))
                      const conflictingRow = rows.find(
                        (row) => Number(row.subjectID) === Number(subject.id) && Number(row.employeeID) !== Number(activeTeacher.id),
                      )
                      const conflictingTeacher = teacherItems.find((item) => Number(item.id) === Number(conflictingRow?.employeeID))
                      const disabled = Boolean(conflictingRow)

                      return (
                        <button
                          key={subject.id}
                          type="button"
                          title={disabled ? `Assigned to ${conflictingTeacher?.name || 'another teacher'}` : subject.fullName || subject.name}
                          disabled={disabled}
                          onClick={() => toggleSubject(subject.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm'
                              : disabled
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          {subject.name || `Subject ${subject.id}`}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No teachers available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344476] disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReportModal({ open, matrix, campusLabel, onClose }) {
  if (!open) return null

  const printedAt = new Date().toLocaleString()

  const printReport = () => {
    const { logoSrc, schoolName } = getCampusPrintMeta()
    const tableHtml = matrix.classes.length
      ? `
        <table>
          <thead>
            <tr>
              <th class="class-col"></th>
              ${matrix.subjects.map((subject) => `<th>${escapeHtml(subject.subjectName)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${matrix.classes
              .map(
                (classRow) => `
                  <tr>
                    <th class="class-col">${escapeHtml(classRow.className)}</th>
                    ${matrix.subjects
                      .map((subject) => {
                        const teachers = classRow.cells.get(subject.subjectID) || []
                        return `<td>${teachers.map((name) => `<div>${escapeHtml(name)}</div>`).join('')}</td>`
                      })
                      .join('')}
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      `
      : '<p>No assignments available.</p>'

    const printWindow = window.open('', '_blank', 'width=1100,height=800')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Teacher Class Subject Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            .report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
            .brand { display: flex; align-items: flex-start; gap: 12px; }
            .brand img { height: 42px; width: 42px; object-fit: contain; }
            .eyebrow { margin: 0 0 4px; color: var(--campus-primary); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
            h1 { font-size: 20px; margin: 0 0 2px; }
            .campus { margin: 0; color: #475569; font-size: 12px; }
            .printed-at { margin: 0; color: #64748b; font-size: 10px; text-align: right; white-space: nowrap; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: A4 landscape; margin: 8mm; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 5px 6px;
              text-align: left;
              vertical-align: top;
              font-size: 8.5px;
              line-height: 1.25;
              overflow-wrap: anywhere;
              word-break: break-word;
              white-space: normal;
            }
            th { background: #f1f5f9; font-weight: 700; }
            table { table-layout: fixed; width: 100%; }
            .class-col { width: 12%; }
            @media print {
              html, body { width: 100%; }
              body { margin: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <header class="report-header">
            <div class="brand">
              <img src="${logoSrc}" alt="" />
              <div>
                <p class="eyebrow">Teacher class subject report</p>
                <h1>${escapeHtml(schoolName)}</h1>
                <p class="campus">${escapeHtml(campusLabel)}</p>
              </div>
            </div>
            <p class="printed-at">${escapeHtml(printedAt)}</p>
          </header>
          ${tableHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">Teacher class subject report</h2>
            <p className="mt-1 text-sm text-slate-500">
              {matrix.classes.length} classes · {matrix.subjects.length} subjects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344476]"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {matrix.classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No assignments available.
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 w-[12%] border border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold text-slate-700"></th>
                  {matrix.subjects.map((subject) => (
                    <th
                      key={subject.subjectID}
                      title={subject.subjectFullName || subject.subjectName}
                      className="sticky top-0 z-10 border border-slate-200 bg-slate-100 px-2 py-2 text-left font-semibold text-slate-700 [overflow-wrap:anywhere]"
                    >
                      {subject.subjectName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.classes.map((classRow) => (
                  <tr key={classRow.classID}>
                    <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-900 [overflow-wrap:anywhere]">
                      {classRow.className}
                    </th>
                    {matrix.subjects.map((subject) => {
                      const teachers = classRow.cells.get(subject.subjectID) || []

                      return (
                        <td key={`${classRow.classID}-${subject.subjectID}`} className="border border-slate-200 px-2 py-2 align-top">
                          <div className="space-y-1">
                            {teachers.map((teacher) => (
                              <div key={teacher} className="text-[10px] font-medium leading-4 text-slate-700 [overflow-wrap:anywhere]">
                                {teacher}
                              </div>
                            ))}
                          </div>
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
    </div>
  )
}

function TeacherAssignmentsPage() {
  const campusCode = localStorage.getItem('campus') || ''
  const campusLabel = getCampusLabel(campusCode)

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
      toast.error(error?.response?.data?.message || 'Could not load teacher assignments.')
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
        const employeeAssignments = assignmentsByEmployee.get(employeeId) || []
        return { employee, employeeId, assignments: employeeAssignments }
      })
      .filter(({ employee, assignments: employeeAssignments }) => {
        if (!needle) return true
        const employeeName = getText(employee, 'employeeName', 'EmployeeName')
        const assignmentText = employeeAssignments
          .map((item) => `${getText(item, 'className', 'ClassName')} ${getText(item, 'subjectName', 'SubjectName')}`)
          .join(' ')
        return `${employeeName} ${assignmentText}`.toLowerCase().includes(needle)
      })
  }, [assignmentsByEmployee, employees, search])

  const classRows = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return classes
      .map((classItem) => {
        const classId = getId(classItem, 'id', 'ID')
        const classAssignments = assignmentsByClass.get(classId) || []
        return { classItem, classId, assignments: classAssignments }
      })
      .filter(({ classItem, assignments: classAssignments }) => {
        if (!needle) return true
        const className = getText(classItem, 'className', 'ClassName')
        const assignmentText = classAssignments
          .map((item) => `${getText(item, 'employeeName', 'EmployeeName')} ${getText(item, 'subjectName', 'SubjectName')}`)
          .join(' ')
        return `${className} ${assignmentText}`.toLowerCase().includes(needle)
      })
  }, [assignmentsByClass, classes, search])

  const totalAssignments = assignments.length
  const assignedTeacherCount = Array.from(assignmentsByEmployee.values()).filter((rows) => rows.length > 0).length

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
        const subjectFromLookup = subjectLookup.get(subjectID)
        subjectMap.set(subjectID, {
          subjectID,
          subjectName:
            subjectFromLookup?.shortName ||
            getText(assignment, 'subjectName', 'SubjectName') ||
            `Subject ${subjectID}`,
          subjectFullName: subjectFromLookup?.fullName || getText(assignment, 'subjectName', 'SubjectName'),
        })
      }

      if (!classMap.has(classID)) {
        classMap.set(classID, {
          classID,
          className: getText(assignment, 'className', 'ClassName') || `Class ${classID}`,
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

    const matrixClassRows = Array.from(classMap.values())
      .map((classRow) => {
        classRow.cells.forEach((teachers, subjectID) => {
          classRow.cells.set(subjectID, [...teachers].sort((a, b) => a.localeCompare(b)))
        })
        return classRow
      })
    const classes = sortClassesByCustomOrder(matrixClassRows, 'className')

    return {
      classes,
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

    const toastId = `teacher-assignments-save-${employeeId}`
    setIsSaving(true)
    toast.loading('Saving changes...', { id: toastId })

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
    const currentKeys = new Set(currentRows.map((row) => `${getId(row, 'employeeID', 'EmployeeID')}:${getId(row, 'subjectID', 'SubjectID')}`))
    const nextKeys = new Set(nextRows.map(classAssignmentKey))

    const deleteRows = currentRows.filter(
      (row) => !nextKeys.has(`${getId(row, 'employeeID', 'EmployeeID')}:${getId(row, 'subjectID', 'SubjectID')}`),
    )
    const createRows = nextRows.filter((row) => !currentKeys.has(classAssignmentKey(row)))

    const toastId = `class-assignments-save-${classId}`
    setIsSaving(true)
    toast.loading('Saving changes...', { id: toastId })

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
    <CampusShell headerContext="Teacher assignments">
      <div className="px-4 pb-10 pt-[4.5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[var(--campus-primary)]">
                  <BookOpenCheck size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Teacher class subjects</h1>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{employees.length} teachers</span>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[var(--campus-primary)]">{assignedTeacherCount} assigned</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{totalAssignments} class subjects</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="filterTeacherAssignmentSearch"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={activeTab === 'teacher' ? 'Search teacher, class, subject' : 'Search class, teacher, subject'}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--campus-primary)] focus:ring-4 focus:ring-[#405189]/10 sm:w-80 lg:w-96"
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-indigo-100 px-4 text-sm font-semibold text-[var(--campus-primary)] transition hover:bg-indigo-50"
              >
                <FileText size={16} />
                Report
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-white">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('class')}
                  className={`min-w-40 border-r border-slate-200 border-t-4 px-5 py-3 text-sm font-semibold transition ${
                    activeTab === 'class'
                      ? 'border-t-[#2f3d6d] bg-white text-[#2f3d6d]'
                      : 'border-t-transparent bg-slate-50/45 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <GraduationCap size={16} />
                    Class wise
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('teacher')}
                  className={`min-w-40 border-r border-slate-200 border-t-4 px-5 py-3 text-sm font-semibold transition ${
                    activeTab === 'teacher'
                      ? 'border-t-[#2f3d6d] bg-white text-[#2f3d6d]'
                      : 'border-t-transparent bg-slate-50/45 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <UserRound size={16} />
                    Teacher wise
                  </span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {activeTab === 'teacher' ? (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-[#2f3d6d] text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-3 py-2">Teacher</th>
                      <th className="px-3 py-2">Classes</th>
                      <th className="px-3 py-2">Subjects</th>
                      <th className="w-32 px-3 py-2 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
                            Loading teachers...
                          </span>
                        </td>
                      </tr>
                    ) : employeeRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No teachers found.
                        </td>
                      </tr>
                    ) : (
                      employeeRows.map(({ employee, employeeId, assignments: employeeAssignments }) => {
                        const employeeName = getText(employee, 'employeeName', 'EmployeeName') || `ID ${employeeId}`
                        const classCount = new Set(employeeAssignments.map((item) => getId(item, 'classID', 'ClassID'))).size
                        const subjectCount = new Set(employeeAssignments.map((item) => getId(item, 'subjectID', 'SubjectID'))).size

                        return (
                          <tr key={employeeId} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-slate-900">{employeeName}</div>
                              <div className="text-xs text-slate-500">ID {employeeId}</div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {classCount}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-[var(--campus-primary)]">
                                {subjectCount}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedEmployee(employee)}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-xs font-semibold text-[var(--campus-primary)] transition hover:bg-indigo-50"
                              >
                                <Pencil size={14} />
                                Manage
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-[#2f3d6d] text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Teachers</th>
                      <th className="px-3 py-2">Subjects</th>
                      <th className="w-32 px-3 py-2 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
                            Loading classes...
                          </span>
                        </td>
                      </tr>
                    ) : classRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No classes found.
                        </td>
                      </tr>
                    ) : (
                      classRows.map(({ classItem, classId, assignments: classAssignments }) => {
                        const className = getText(classItem, 'className', 'ClassName') || `ID ${classId}`
                        const teacherCount = new Set(classAssignments.map((item) => getId(item, 'employeeID', 'EmployeeID'))).size
                        const subjectCount = new Set(classAssignments.map((item) => getId(item, 'subjectID', 'SubjectID'))).size

                        return (
                          <tr key={classId} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-slate-900">{className}</div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {teacherCount}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-[var(--campus-primary)]">
                                {subjectCount}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedClass(classItem)}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-xs font-semibold text-[var(--campus-primary)] transition hover:bg-indigo-50"
                              >
                                <Pencil size={14} />
                                Manage
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <ManageAssignmentsModal
        employee={selectedEmployee}
        assignments={selectedEmployee ? assignmentsByEmployee.get(getId(selectedEmployee, 'id', 'ID')) || [] : []}
        allAssignments={assignments}
        classes={classes}
        subjects={subjects}
        saving={isSaving}
        onClose={() => setSelectedEmployee(null)}
        onSave={saveEmployeeAssignments}
      />
      <ManageClassAssignmentsModal
        classItem={selectedClass}
        assignments={selectedClass ? assignmentsByClass.get(getId(selectedClass, 'id', 'ID')) || [] : []}
        employees={employees}
        subjects={subjects}
        saving={isSaving}
        onClose={() => setSelectedClass(null)}
        onSave={saveClassAssignments}
      />
      <ReportModal open={isReportOpen} matrix={reportMatrix} campusLabel={campusLabel} onClose={() => setIsReportOpen(false)} />
    </CampusShell>
  )
}

export default TeacherAssignmentsPage

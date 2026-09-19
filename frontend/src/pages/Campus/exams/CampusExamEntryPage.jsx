import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, FileBarChart2, Loader2, Plus, Search, TableProperties, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Select from 'react-select'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getClasses } from '../../../services/classService'
import { hasCampusPermission } from '../../../services/authService'
import {
  addExamEntrySubject,
  addMissingExamEntryStudents,
  deleteExamEntrySubject,
  getAvailableExamEntrySubjects,
  getExamTypes,
  loadExamEntryMatrix,
  updateExamEntryAttendance,
  updateExamEntryCell,
  updateExamEntrySubjectMarks,
} from '../../../services/examService'
import CampusExamMarkSheetPage from './CampusExamMarkSheetPage.jsx'
import CampusStudentResultPage from './CampusStudentResultPage.jsx'

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderColor: state.isFocused ? 'var(--campus-primary)' : '#dbe3ef',
    boxShadow: state.isFocused ? '0 0 0 1px var(--campus-primary)' : 'none',
    '&:hover': { borderColor: 'var(--campus-primary)' },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
}

const toOption = (item) => ({
  value: String(item.id ?? item.ID),
  label: item.className ?? item.ClassName ?? item.name ?? `#${item.id ?? item.ID}`,
})

function cellKey(regId, subjectId) {
  return `${regId}:${subjectId}`
}

function displayMark(value) {
  if (value === -1) return 'A'
  return value ?? 0
}

function parseMarkInput(value) {
  const clean = String(value || '').trim().toUpperCase()
  if (clean === 'A') return -1
  if (clean === '') return 0
  if (!/^\d+$/.test(clean)) return null
  return Number(clean)
}

function formatAttendance(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function subjectReady(subject) {
  return Number(subject?.totalMarks || 0) > 0 && Number(subject?.passingMarks || 0) > 0
}

function totalForRow(row) {
  return (row.cells || []).reduce((sum, cell) => {
    const mark = Number(cell.obtainedMarks || 0)
    return mark > 0 ? sum + mark : sum
  }, 0)
}

function scoreTotal(subjects) {
  return (subjects || []).reduce((sum, subject) => sum + Number(subject.totalMarks || 0), 0)
}

function subjectLabel(subject) {
  return subject.subjectName || subject.name || subject.subjectCode || `Subject #${subject.subjectId}`
}

function ignoreForSubjectAverage(subject) {
  return /\b(man|manner|manners)\b/i.test(subjectLabel(subject))
}

function selectInputText(event) {
  event.currentTarget.select()
}

function SubjectModal({ mode, open, loading, saving, subjects, pendingSubject, form, onFormChange, onPick, onCancelPick, onConfirm, onClose }) {
  if (!open) return null

  const isAdd = mode === 'add'

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
        <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isAdd ? 'Add subject' : 'Remove subject'}</h2>
              <p className="text-sm text-slate-500">
                {isAdd ? 'Pick a subject, then confirm marks in the popup.' : 'Pick a subject, then confirm removal in the popup.'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {isAdd ? 'No available subjects found.' : 'No subjects are currently attached to this exam.'}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.subjectId}
                    type="button"
                    onClick={() => onPick(subject)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--campus-primary)] hover:shadow-md"
                  >
                    <span className="block text-sm font-semibold text-slate-900">{subject.shortName || subject.subjectName}</span>
                    <span className="mt-1 block text-xs text-slate-500">{subject.subjectName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingSubject ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isAdd ? 'Confirm subject marks' : 'Confirm subject removal'}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{pendingSubject.shortName || pendingSubject.subjectName}</h3>
              <p className="text-sm text-slate-500">
                {isAdd ? 'These marks will be applied to this subject for every student in the exam.' : 'This removes the subject and all saved marks for this exam.'}
              </p>
            </div>

            {isAdd ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Total marks
                  <input
                    value={form.totalMarks}
                    autoFocus
                    onChange={(event) => onFormChange({ ...form, totalMarks: event.target.value.replace(/\D/g, '') })}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-[#405189]/15"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Passing marks
                  <input
                    value={form.passingMarks}
                    onChange={(event) => onFormChange({ ...form, passingMarks: event.target.value.replace(/\D/g, '') })}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-[#405189]/15"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelPick}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${isAdd ? 'bg-[#0ab39c] hover:bg-[#099885]' : 'bg-[#f06548] hover:bg-[#d94f35]'}`}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? (isAdd ? 'Adding...' : 'Removing...') : isAdd ? 'Add subject' : 'Remove subject'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function MarkSheetOptionsModal({ open, options, onChange, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mark sheet options</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Load mark sheet</h2>
          <p className="text-sm text-slate-500">Choose sorting and grading display before opening the sheet.</p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Sort
            <select
              value={options.sortBy}
              onChange={(event) => onChange({ ...options, sortBy: event.target.value })}
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-[#405189]/15"
            >
              <option value="position">By marks (position wise)</option>
              <option value="regId">By registration no.</option>
            </select>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={options.markDrawingAsGrade}
                onChange={(event) => onChange({ ...options, markDrawingAsGrade: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[var(--campus-primary)] focus:ring-[var(--campus-primary)]"
              />
              Mark Drawing as grade
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={options.markStempAsGrade}
                onChange={(event) => onChange({ ...options, markStempAsGrade: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[var(--campus-primary)] focus:ring-[var(--campus-primary)]"
              />
              Mark Stemp as grade
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344477]">
            Load mark sheet
          </button>
        </div>
      </div>
    </div>
  )
}

function MissingStudentsModal({ open, students, saving, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Missing students</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Add these students to the exam?</h2>
          <p className="text-sm text-slate-500">
            Exam rows will be created for every current subject with zero marks and empty attendance.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Reg No.</th>
                  <th className="px-3 py-2">Student</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.regId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{student.regId}</td>
                    <td className="px-3 py-2 text-slate-700">{student.studentName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f7b84b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e2a238] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Adding...' : `Add ${students.length} student${students.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoMissingStudentsAlert({ open, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">No missing students</h2>
        <p className="mt-2 text-sm text-slate-500">All active students are already in this exam.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-lg bg-[var(--campus-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[#344477]"
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default function CampusExamEntryPage() {
  const [searchParams] = useSearchParams()
  const canChangeExamMarks = hasCampusPermission('change_exam_marks')
  const [sectionId, setSectionId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [activeSubjectId, setActiveSubjectId] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [subjectModal, setSubjectModal] = useState(null)
  const [modalSubjects, setModalSubjects] = useState([])
  const [isSubjectLoading, setIsSubjectLoading] = useState(false)
  const [isSubjectSaving, setIsSubjectSaving] = useState(false)
  const [pendingSubject, setPendingSubject] = useState(null)
  const [addForm, setAddForm] = useState({ totalMarks: '', passingMarks: '' })
  const [draftMarks, setDraftMarks] = useState({})
  const [saveFeedback, setSaveFeedback] = useState({})
  const [isMarkSheetOpen, setIsMarkSheetOpen] = useState(false)
  const [isMarkSheetOptionsOpen, setIsMarkSheetOptionsOpen] = useState(false)
  const [isMissingStudentsModalOpen, setIsMissingStudentsModalOpen] = useState(false)
  const [isNoMissingStudentsAlertOpen, setIsNoMissingStudentsAlertOpen] = useState(false)
  const [isAddingMissingStudents, setIsAddingMissingStudents] = useState(false)
  const [markSheetOptions, setMarkSheetOptions] = useState({
    sortBy: 'position',
    markDrawingAsGrade: true,
    markStempAsGrade: true,
  })
  const [resultStudent, setResultStudent] = useState(null)
  const inputRefs = useRef({})
  const autoLoadFromParamsRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const [classRows, types] = await Promise.all([getClasses(), getExamTypes()])
        if (!cancelled) {
          setClasses(Array.isArray(classRows) ? classRows : [])
          setExamTypes(Array.isArray(types) ? types : [])
        }
      } catch {
        toast.error('Unable to load classes or exam types.')
      } finally {
        if (!cancelled) setIsMetaLoading(false)
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  const classOptions = useMemo(() => classes.map(toOption), [classes])
  const examTypeOptions = useMemo(
    () => examTypes.map((item) => ({ value: String(item.id), label: item.name || `Exam #${item.id}` })),
    [examTypes],
  )
  const selectedClass = classOptions.find((option) => option.value === sectionId) || null
  const selectedExamType = examTypeOptions.find((option) => option.value === examTypeId) || null

  const parsedSectionId = Number(sectionId)
  const parsedExamTypeId = Number(examTypeId)

  const matrixSummary = useMemo(() => {
    if (!matrix) return null
  console.log(matrix.students?.name)
    const totalMarks = scoreTotal(matrix.subjects)
    const scoredStudents = matrix.students
      .map((student) => ({
        name: student.studentName,
        studentId: student.regId,
        student,
        score: Number(student.totalObtained || 0),
      }))
      .filter((student) => student.score > 0)
      .sort((first, second) => second.score - first.score)
    const subjectAverages = matrix.subjects
      .filter((subject) => !ignoreForSubjectAverage(subject))
      .map((subject) => {
        const totalMarks = Number(subject.totalMarks || 0)
        if (totalMarks <= 0) return null

        const marks = matrix.students
          .map((student) => student.cells?.find((cell) => cell.subjectId === subject.subjectId)?.obtainedMarks)
          .filter((mark) => mark != null && Number(mark) !== -1)
          .map((mark) => Number(mark || 0))

        if (!marks.length) return null

        const averageObtained = marks.reduce((sum, mark) => sum + mark, 0) / marks.length
        return {
          name: subjectLabel(subject),
          percentage: Math.round((averageObtained / totalMarks) * 100),
        }
      })
      .filter(Boolean)
      .sort((first, second) => second.percentage - first.percentage)

    return {
      students: matrix.students.length,
      totalMarks,
      bestSubjectAverage: subjectAverages[0] || null,
      lowestSubjectAverage: subjectAverages.length ? subjectAverages[subjectAverages.length - 1] : null,
      highestScore: scoredStudents[0] || null,
      lowestScore: scoredStudents.length ? scoredStudents[scoredStudents.length - 1] : null,
      missingStudents: matrix.missingStudentCount || 0,
    }
  }, [matrix])

  const replaceMatrix = useCallback((nextMatrix) => {
    setMatrix(nextMatrix)
    setDraftMarks({})
    setSaveFeedback({})
    setActiveSubjectId((current) => {
      if (!current) return null
      return nextMatrix?.subjects?.some((subject) => subject.subjectId === current) ? current : null
    })
  }, [])

  const flashSaveFeedback = useCallback((key, status) => {
    setSaveFeedback((current) => ({ ...current, [key]: status }))
    window.setTimeout(() => {
      setSaveFeedback((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }, 900)
  }, [])

  const feedbackClass = useCallback((key) => {
    if (saveFeedback[key] === 'success') return 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50'
    if (saveFeedback[key] === 'error') return 'ring-2 ring-rose-400 border-rose-400 bg-rose-50'
    return ''
  }, [saveFeedback])

  const loadMatrix = useCallback(async ({
    nextSectionId = parsedSectionId,
    nextExamTypeId = parsedExamTypeId,
  } = {}) => {
    if (!nextSectionId || !nextExamTypeId) {
      toast.error('Select class and exam type.')
      return
    }

    setIsLoading(true)
    try {
      const data = await loadExamEntryMatrix({ sectionId: Number(nextSectionId), examTypeId: Number(nextExamTypeId) })
      replaceMatrix(data)
      toast.success(data?.wasInitialized ? 'Exam matrix prepared.' : 'Exam matrix loaded.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load exam matrix.')
      setMatrix(null)
    } finally {
      setIsLoading(false)
    }
  }, [parsedExamTypeId, parsedSectionId, replaceMatrix])

  useEffect(() => {
    if (autoLoadFromParamsRef.current || isMetaLoading) return

    const nextSectionId = searchParams.get('sectionId')
    const nextExamTypeId = searchParams.get('examTypeId')
    const shouldLoad = searchParams.get('load') === '1'
    if (!shouldLoad || !nextSectionId || !nextExamTypeId) return

    const hasClass = classOptions.some((option) => option.value === String(nextSectionId))
    const hasExamType = examTypeOptions.some((option) => option.value === String(nextExamTypeId))
    if (!hasClass || !hasExamType) return

    autoLoadFromParamsRef.current = true
    const timeoutId = window.setTimeout(() => {
      setSectionId(String(nextSectionId))
      setExamTypeId(String(nextExamTypeId))
      void loadMatrix({ nextSectionId: Number(nextSectionId), nextExamTypeId: Number(nextExamTypeId) })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [classOptions, examTypeOptions, isMetaLoading, loadMatrix, searchParams])

  const updateLocalCell = (regId, subjectId, obtainedMarks) => {
    setMatrix((current) => ({
      ...current,
      students: current.students.map((student) => {
        if (student.regId !== regId) return student
        const cells = student.cells.map((cell) => (cell.subjectId === subjectId ? { ...cell, obtainedMarks, displayValue: displayMark(obtainedMarks) } : cell))
        return { ...student, cells, totalObtained: totalForRow({ ...student, cells }) }
      }),
    }))
  }

  const saveSubjectMarks = async (subject, field, rawValue) => {
    if (!canChangeExamMarks) {
      toast.error("You don't have access to change exam marks.")
      return
    }
    const value = Number(rawValue || 0)
    const totalMarks = field === 'totalMarks' ? value : undefined
    const passingMarks = field === 'passingMarks' ? value : undefined
    const nextTotal = field === 'totalMarks' ? value : Number(subject.totalMarks || 0)
    const nextPassing = field === 'passingMarks' ? value : Number(subject.passingMarks || 0)

    if (nextTotal > 0 && nextPassing > nextTotal) {
      toast.error('Passing marks cannot exceed total marks.')
      return
    }

    try {
      const data = await updateExamEntrySubjectMarks({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: subject.subjectId,
        totalMarks,
        passingMarks,
      })
      replaceMatrix(data)
      const subjectIds = data.subjects.map((item) => item.subjectId)
      const nextIndex = subjectIds.indexOf(subject.subjectId) + 1
      const nextSubjectId = subjectIds[nextIndex]
      if (nextSubjectId) inputRefs.current[`${field}-${nextSubjectId}`]?.focus()
      flashSaveFeedback(`${field}-${subject.subjectId}`, 'success')
    } catch (error) {
      flashSaveFeedback(`${field}-${subject.subjectId}`, 'error')
      toast.error(error?.response?.data?.message || 'Unable to save marks.')
    }
  }

  const saveObtainedMark = async (studentIndex, subject, cell, rawValue) => {
    const parsed = parseMarkInput(rawValue)
    if (parsed == null) {
      toast.error('Only numbers or A are allowed.')
      return
    }
    if (parsed > Number(subject.totalMarks || 0)) {
      toast.error('Obtained marks cannot exceed total marks.')
      return
    }
    if (!cell.examId) {
      toast.error('This cell is not available for saving.')
      return
    }

    try {
      const saved = await updateExamEntryCell({ examId: cell.examId, obtainedMarks: parsed })
      updateLocalCell(matrix.students[studentIndex].regId, subject.subjectId, saved.obtainedMarks)
      setDraftMarks((current) => {
        const next = { ...current }
        delete next[cellKey(matrix.students[studentIndex].regId, subject.subjectId)]
        return next
      })
      const nextStudent = matrix.students[studentIndex + 1]
      if (nextStudent) inputRefs.current[`cell-${nextStudent.regId}-${subject.subjectId}`]?.focus()
      flashSaveFeedback(cellKey(matrix.students[studentIndex].regId, subject.subjectId), 'success')
    } catch (error) {
      flashSaveFeedback(cellKey(matrix.students[studentIndex].regId, subject.subjectId), 'error')
      toast.error(error?.response?.data?.message || 'Unable to save obtained marks.')
    }
  }

  const saveAttendance = async (studentIndex, student, value) => {
    if (!canChangeExamMarks) {
      toast.error("You don't have access to change exam marks.")
      return
    }
    if (!/^\d{2}\/\d{2}$/.test(value)) {
      toast.error('Attendance must look like 09/22.')
      return
    }

    try {
      const data = await updateExamEntryAttendance({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        studentId: student.regId,
        attendanceRatio: value,
      })
      replaceMatrix(data)
      const nextStudent = data.students[studentIndex + 1]
      if (nextStudent) inputRefs.current[`attendance-${nextStudent.regId}`]?.focus()
      flashSaveFeedback(`attendance-${student.regId}`, 'success')
    } catch (error) {
      flashSaveFeedback(`attendance-${student.regId}`, 'error')
      toast.error(error?.response?.data?.message || 'Unable to save attendance.')
    }
  }

  const openSubjectModal = async (mode) => {
    if (!matrix) {
      toast.error('Load an exam first.')
      return
    }

    setSubjectModal(mode)
    setPendingSubject(null)
    setAddForm({ totalMarks: '', passingMarks: '' })
    setIsSubjectLoading(true)

    try {
      if (mode === 'add') {
        const rows = await getAvailableExamEntrySubjects({ sectionId: parsedSectionId, examTypeId: parsedExamTypeId })
        setModalSubjects(rows)
      } else {
        setModalSubjects(matrix.subjects)
      }
    } catch {
      toast.error('Unable to load subjects.')
      setModalSubjects([])
    } finally {
      setIsSubjectLoading(false)
    }
  }

  const confirmAddSubject = async () => {
    const totalMarks = Number(addForm.totalMarks || 0)
    const passingMarks = Number(addForm.passingMarks || 0)
    if (!pendingSubject || totalMarks <= 0 || passingMarks <= 0 || passingMarks > totalMarks) {
      toast.error('Enter valid total and passing marks.')
      return
    }

    try {
      setIsSubjectSaving(true)
      const data = await addExamEntrySubject({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: pendingSubject.subjectId,
        totalMarks,
        passingMarks,
      })
      replaceMatrix(data)
      setSubjectModal(null)
      toast.success('Subject added.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add subject.')
    } finally {
      setIsSubjectSaving(false)
    }
  }

  const confirmDeleteSubject = async () => {
    if (!pendingSubject) return
    try {
      setIsSubjectSaving(true)
      const data = await deleteExamEntrySubject({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: pendingSubject.subjectId,
      })
      replaceMatrix(data)
      setSubjectModal(null)
      toast.success('Subject removed.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to remove subject.')
    } finally {
      setIsSubjectSaving(false)
    }
  }

  const openMissingStudentsModal = () => {
    const students = matrix?.missingStudents || []
    if (students.length === 0) {
      setIsNoMissingStudentsAlertOpen(true)
      return
    }

    setIsMissingStudentsModalOpen(true)
  }

  const confirmAddMissingStudents = async () => {
    const missingCount = matrix?.missingStudents?.length || 0
    try {
      setIsAddingMissingStudents(true)
      const data = await addMissingExamEntryStudents({ sectionId: parsedSectionId, examTypeId: parsedExamTypeId })
      replaceMatrix(data)
      setIsMissingStudentsModalOpen(false)
      toast.success(`${missingCount} missing student${missingCount === 1 ? '' : 's'} added.`)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add missing students.')
    } finally {
      setIsAddingMissingStudents(false)
    }
  }

  return (
    <CampusShell headerContext="Exam entry">
      <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="rounded-2xl bg-white shadow-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              loadMatrix()
            }}
            className="space-y-4 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <FileBarChart2 size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Exam Entry</h1>
                  <p className="text-sm text-slate-500">Prepare and enter class exam marks by subject.</p>
                </div>
              </div>

              {matrix ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button type="button" onClick={openMissingStudentsModal} className="rounded-lg bg-[#f7b84b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e2a238]">
                  Missing Students{matrix.missingStudents?.length > 0 ? ` (${matrix.missingStudents.length})` : ''}
                </button>
                <button type="button" onClick={() => openSubjectModal('add')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ab39c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#099885]">
                  <Plus size={14} />
                  Add Subject
                </button>
                <button type="button" onClick={() => openSubjectModal('delete')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f06548] px-3 py-2 text-xs font-semibold text-white hover:bg-[#d94f35]">
                  <Trash2 size={14} />
                  Remove Subject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!parsedSectionId || !parsedExamTypeId) {
                      toast.error('Select class and exam type first.')
                      return
                    }
                    setIsMarkSheetOptionsOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[#344477]"
                >
                  <TableProperties size={14} />
                  Mark Sheet
                </button>
              </div>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-12">
              <label className="md:col-span-3">
                <span className="mb-1 block text-sm font-medium text-slate-700">Class</span>
                <Select
                  isLoading={isMetaLoading}
                  options={classOptions}
                  value={selectedClass}
                  onChange={(option) => setSectionId(option?.value || '')}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </label>
              <label className="md:col-span-3">
                <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
                <Select
                  isLoading={isMetaLoading}
                  options={examTypeOptions}
                  value={selectedExamType}
                  onChange={(option) => setExamTypeId(option?.value || '')}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#344477] disabled:opacity-60 md:col-span-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                Load Exam
              </button>
            </div>

           { console.log('Summary:', matrixSummary)}

            {matrixSummary ? (
              <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 cursor-pointer"
                 onClick={() => setResultStudent(matrixSummary.highestScore?.student)}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Highest marks
                  </p>
                  <p className="truncate text-sm font-bold text-emerald-950" title={matrixSummary.highestScore?.name || ''}>
                    {matrixSummary.highestScore?.name || '-'}
                  </p>
                  <p className="text-xs font-semibold text-emerald-800">
                    {matrixSummary.highestScore ? `${matrixSummary.highestScore.score}/${matrixSummary.totalMarks}` : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 cursor-pointer"
                 onClick={() => setResultStudent(matrixSummary.lowestScore?.student)}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                    Lowest marks
                  </p>
                  <p className="truncate text-sm font-bold text-rose-950" title={matrixSummary.lowestScore?.name || ''}>
                    {matrixSummary.lowestScore?.name || '-'}
                  </p>
                  <p className="text-xs font-semibold text-rose-800">
                    {matrixSummary.lowestScore ? `${matrixSummary.lowestScore.score}/${matrixSummary.totalMarks}` : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Lowest subject avg</p>
                  <p className="truncate text-sm font-bold text-amber-950" title={matrixSummary.lowestSubjectAverage?.name || ''}>
                    {matrixSummary.lowestSubjectAverage?.name || '-'}
                  </p>
                  <p className="text-xs font-semibold text-amber-800">
                    {matrixSummary.lowestSubjectAverage ? `${matrixSummary.lowestSubjectAverage.percentage}%` : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Highest subject avg</p>
                  <p className="truncate text-sm font-bold text-sky-950" title={matrixSummary.bestSubjectAverage?.name || ''}>
                    {matrixSummary.bestSubjectAverage?.name || '-'}
                  </p>
                  <p className="text-xs font-semibold text-sky-800">
                    {matrixSummary.bestSubjectAverage ? `${matrixSummary.bestSubjectAverage.percentage}%` : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#405189]/15 bg-[#405189]/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--campus-primary)]">Missing students</p>
                  <p className="text-base font-bold text-[var(--campus-primary-dark)]">{matrixSummary.missingStudents}</p>
                </div>
              </div>
            ) : null}
          </form>

          {matrix ? (
          <div key={`${matrix.sectionId}-${matrix.examTypeId}`} className="border-t border-slate-200">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#34477d] text-left text-white">
                  <th className="sticky left-0 top-0 z-40 w-8 min-w-8 border border-slate-200 bg-[#34477d] px-1 py-1.5">#</th>
                  <th className="sticky left-8 top-0 z-40 w-12 min-w-12 border border-slate-200 bg-[#34477d] px-1 py-1.5">Reg No.</th>
                  <th className="sticky left-20 top-0 z-40 w-48 min-w-48 border border-slate-200 bg-[#34477d] px-1.5 py-1.5">Student Name</th>
                  {matrix.subjects.map((subject) => (
                    <th
                      key={subject.subjectId}
                      onClick={() => {
                        if (!subjectReady(subject)) {
                          toast.error('Set total and passing marks first.')
                          return
                        }
                        setActiveSubjectId((current) => (current === subject.subjectId ? null : subject.subjectId))
                      }}
                      className={`sticky top-0 z-30 w-[72px] min-w-[72px] cursor-pointer border border-slate-200 bg-[#34477d] px-1 py-1.5 transition ${
                        activeSubjectId === subject.subjectId ? 'bg-[#263866] ring-2 ring-inset ring-[var(--campus-primary)]' : 'hover:bg-[var(--campus-primary)]'
                      }`}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        className="pointer-events-none h-full w-full text-left font-semibold text-white"
                      >
                        {subject.shortName || subject.subjectName}
                      </button>
                    </th>
                  ))}
                  <th className="sticky top-0 z-30 w-20 min-w-20 border border-slate-200 bg-[#34477d] px-1 py-1.5">Attendance</th>
                  <th className="sticky top-0 z-30 w-12 min-w-12 border border-slate-200 bg-[#34477d] px-1 py-1.5">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-100 font-semibold">
                  <td className="sticky left-0 top-[29px] z-30 border border-slate-200 bg-slate-100 px-1 py-1" />
                  <td className="sticky left-8 top-[29px] z-30 border border-slate-200 bg-slate-100 px-1 py-1" />
                  <td className="sticky left-20 top-[29px] z-30 border border-slate-200 bg-slate-100 px-1.5 py-1">Total Marks</td>
                  {matrix.subjects.map((subject) => (
                    <td
                      key={subject.subjectId}
                      className={`sticky top-[29px] z-20 border border-slate-200 p-1 ${activeSubjectId === subject.subjectId ? 'bg-[#405189]/10' : 'bg-slate-100'}`}
                    >
                      <input
                        ref={(node) => {
                          inputRefs.current[`totalMarks-${subject.subjectId}`] = node
                        }}
                        defaultValue={subject.totalMarks || ''}
                        disabled={!canChangeExamMarks}
                        title={canChangeExamMarks ? undefined : "You don't have access to change exam marks."}
                        onFocus={selectInputText}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveSubjectMarks(subject, 'totalMarks', event.currentTarget.value)
                          }
                        }}
                        className={`h-7 w-full rounded-md border px-1.5 font-semibold outline-none transition focus:border-[var(--campus-primary)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:opacity-70 ${feedbackClass(`totalMarks-${subject.subjectId}`)} ${
                          activeSubjectId === subject.subjectId ? 'border-[var(--campus-primary)] bg-white shadow-[0_0_0_2px_rgba(64,81,137,0.18)]' : 'border-slate-300'
                        }`}
                      />
                    </td>
                  ))}
                  <td className="sticky top-[29px] z-20 border border-slate-200 bg-slate-100" />
                  <td className="sticky top-[29px] z-20 border border-slate-200 bg-slate-100 px-1 font-bold">{matrix.grandTotalMarks}</td>
                </tr>
                <tr className="bg-slate-100 font-semibold">
                  <td className="sticky left-0 top-[61px] z-30 border border-slate-200 bg-slate-100 px-1 py-1" />
                  <td className="sticky left-8 top-[61px] z-30 border border-slate-200 bg-slate-100 px-1 py-1" />
                  <td className="sticky left-20 top-[61px] z-30 border border-slate-200 bg-slate-100 px-1.5 py-1">Passing Marks</td>
                  {matrix.subjects.map((subject) => (
                    <td
                      key={subject.subjectId}
                      className={`sticky top-[61px] z-20 border border-slate-200 p-1 ${activeSubjectId === subject.subjectId ? 'bg-[#405189]/10' : 'bg-slate-100'}`}
                    >
                      <input
                        ref={(node) => {
                          inputRefs.current[`passingMarks-${subject.subjectId}`] = node
                        }}
                        defaultValue={subject.passingMarks || ''}
                        disabled={!canChangeExamMarks}
                        title={canChangeExamMarks ? undefined : "You don't have access to change exam marks."}
                        onFocus={selectInputText}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveSubjectMarks(subject, 'passingMarks', event.currentTarget.value)
                          }
                        }}
                        className={`h-7 w-full rounded-md border px-1.5 font-semibold outline-none transition focus:border-[var(--campus-primary)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:opacity-70 ${feedbackClass(`passingMarks-${subject.subjectId}`)} ${
                          activeSubjectId === subject.subjectId ? 'border-[var(--campus-primary)] bg-white shadow-[0_0_0_2px_rgba(64,81,137,0.18)]' : 'border-slate-300'
                        }`}
                      />
                    </td>
                  ))}
                  <td className="sticky top-[61px] z-20 border border-slate-200 bg-slate-100" />
                  <td className="sticky top-[61px] z-20 border border-slate-200 bg-slate-100" />
                </tr>
                {matrix.students.map((student, studentIndex) => (
                  <tr key={student.regId} className="odd:bg-white even:bg-slate-50">
                    <td className="sticky left-0 z-10 border border-slate-200 bg-inherit px-1 py-1">{student.serial}</td>
                    <td className="sticky left-8 z-10 border border-slate-200 bg-inherit px-1 py-1">{student.regId}</td>
                    <td className="sticky left-20 z-10 max-w-48 truncate border border-slate-200 bg-inherit px-1.5 py-1 font-medium text-[#294a91] shadow-[6px_0_10px_-10px_rgba(15,23,42,0.8)]" title={student.studentName}>
                      <button
                        type="button"
                        onClick={() => setResultStudent(student)}
                        className="max-w-full truncate text-left font-semibold text-[#294a91] hover:text-[var(--campus-primary)] hover:underline"
                      >
                        {student.studentName}
                      </button>
                    </td>
                    {matrix.subjects.map((subject) => {
                      const cell = student.cells.find((item) => item.subjectId === subject.subjectId) || {}
                      const enabled =
                        canChangeExamMarks && subjectReady(subject) && activeSubjectId === subject.subjectId
                      const key = cellKey(student.regId, subject.subjectId)
                      const displayValue = Object.prototype.hasOwnProperty.call(draftMarks, key)
                        ? draftMarks[key]
                        : displayMark(cell.obtainedMarks)
                      const isAbsent = String(displayValue).toUpperCase() === 'A'
                      return (
                        <td key={key} className={`border border-slate-200 p-[2px] transition ${enabled ? 'bg-[#405189]/10' : ''}`}>
                          <input
                            ref={(node) => {
                              inputRefs.current[`cell-${student.regId}-${subject.subjectId}`] = node
                            }}
                            value={displayValue}
                            disabled={!enabled}
                            title={
                              canChangeExamMarks
                                ? undefined
                                : "You don't have access to change exam marks."
                            }
                            onFocus={selectInputText}
                            onChange={(event) => {
                              const raw = event.target.value.toUpperCase()
                              if (!/^A?$|^\d*$/.test(raw)) return
                              const parsed = parseMarkInput(raw)
                              if (parsed != null && parsed > Number(subject.totalMarks || 0)) {
                                toast.error('Obtained marks cannot exceed total marks.')
                                return
                              }
                              setDraftMarks((current) => ({ ...current, [key]: raw }))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                saveObtainedMark(studentIndex, subject, cell, event.currentTarget.value)
                              }
                            }}
                            className={`h-7 w-full rounded-md border px-1.5 font-semibold outline-none transition enabled:focus:border-[var(--campus-primary)] ${feedbackClass(key)} ${
                              enabled
                                ? `border-[var(--campus-primary)] bg-white shadow-[0_0_0_2px_rgba(64,81,137,0.18)] ${isAbsent ? 'text-red-600' : 'text-slate-900'}`
                                : `border-slate-300 bg-slate-100 ${isAbsent ? 'text-red-600' : 'text-slate-400'}`
                            }`}
                          />
                        </td>
                      )
                    })}
                    <td className="border border-slate-200 p-[2px]">
                      <input
                        ref={(node) => {
                          inputRefs.current[`attendance-${student.regId}`] = node
                        }}
                        defaultValue={student.attendanceRatio && student.attendanceRatio !== '-/-' ? student.attendanceRatio : ''}
                        disabled={!canChangeExamMarks}
                        title={canChangeExamMarks ? undefined : "You don't have access to change exam marks."}
                        onFocus={selectInputText}
                        onChange={(event) => {
                          if (!canChangeExamMarks) return
                          event.target.value = formatAttendance(event.target.value)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveAttendance(studentIndex, student, event.currentTarget.value)
                          }
                        }}
                        placeholder="09/22"
                        className={`h-7 w-full rounded-md border border-slate-300 px-1.5 outline-none transition focus:border-[var(--campus-primary)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:opacity-70 ${feedbackClass(`attendance-${student.regId}`)}`}
                      />
                    </td>
                    <td className="border border-slate-200 px-1 py-1 font-bold text-slate-900">{student.totalObtained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Select a class and exam type, then load the exam matrix.
            </div>
          </div>
          )}
        </div>
      </div>

      <SubjectModal
        mode={subjectModal}
        open={Boolean(subjectModal)}
        loading={isSubjectLoading}
        saving={isSubjectSaving}
        subjects={modalSubjects}
        pendingSubject={pendingSubject}
        form={addForm}
        onFormChange={setAddForm}
        onPick={setPendingSubject}
        onCancelPick={() => setPendingSubject(null)}
        onConfirm={subjectModal === 'add' ? confirmAddSubject : confirmDeleteSubject}
        onClose={() => setSubjectModal(null)}
      />

      <MarkSheetOptionsModal
        open={isMarkSheetOptionsOpen}
        options={markSheetOptions}
        onChange={setMarkSheetOptions}
        onCancel={() => setIsMarkSheetOptionsOpen(false)}
        onConfirm={() => {
          setIsMarkSheetOptionsOpen(false)
          setIsMarkSheetOpen(true)
        }}
      />

      <MissingStudentsModal
        open={isMissingStudentsModalOpen}
        students={matrix?.missingStudents || []}
        saving={isAddingMissingStudents}
        onCancel={() => setIsMissingStudentsModalOpen(false)}
        onConfirm={confirmAddMissingStudents}
      />

      <NoMissingStudentsAlert
        open={isNoMissingStudentsAlertOpen}
        onClose={() => setIsNoMissingStudentsAlertOpen(false)}
      />

      {isMarkSheetOpen ? (
        <div className="fixed inset-0 z-[75] bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="h-full w-full overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl">
            <CampusExamMarkSheetPage
              embedded
              autoLoad
              hideControls
              initialSectionId={parsedSectionId}
              initialExamTypeId={parsedExamTypeId}
              initialSortBy={markSheetOptions.sortBy}
              initialMarkDrawingAsGrade={markSheetOptions.markDrawingAsGrade}
              initialMarkStempAsGrade={markSheetOptions.markStempAsGrade}
              onClose={() => setIsMarkSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {resultStudent ? (
        <div className="fixed inset-0 z-[75] bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="h-full w-full overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl">
            <CampusStudentResultPage
              embedded
              autoLoad
              initialStudentId={resultStudent.regId}
              initialStudentName={resultStudent.studentName}
              initialExamTypeId={parsedExamTypeId}
              onClose={() => setResultStudent(null)}
            />
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

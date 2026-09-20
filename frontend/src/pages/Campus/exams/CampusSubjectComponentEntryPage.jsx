import { useMemo, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, HelpCircle, Loader2, Plus, Printer, Save, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Select from 'react-select'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusLabel } from '../../../constants/branding.js'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getClasses } from '../../../services/classService'
import {
  addSubjectComponentHeader,
  deleteSubjectComponentHeader,
  getExamTypes,
  loadExamEntryMatrix,
  loadSubjectComponentEntry,
  saveSubjectComponentMarks,
} from '../../../services/examService'

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

const toClassOption = (item) => ({
  value: String(item.id ?? item.ID),
  label: item.className ?? item.ClassName ?? item.name ?? `#${item.id ?? item.ID}`,
})

const toExamTypeOption = (item) => ({ value: String(item.id), label: item.name || `Exam #${item.id}` })

const toSubjectOption = (subject) => ({
  value: String(subject.subjectId),
  label: subject.shortName || subject.subjectName || `Subject #${subject.subjectId}`,
})

const cellKey = (examId, headerId) => `${examId}:${headerId}`

const normalizeDecimalInput = (value) => {
  const clean = String(value || '').replace(/[^\d.]/g, '')
  const [whole, ...rest] = clean.split('.')
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
}

const parseDecimal = (value) => {
  const clean = String(value ?? '').trim()
  if (clean === '') return 0
  const parsed = Number(clean)
  return Number.isFinite(parsed) ? parsed : null
}

const formatMarks = (value) => {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function CampusSubjectComponentEntryPage() {
  const campus = localStorage.getItem('campus') || 'N/A'
  const campusLabel = getCampusLabel(campus)
  const { schoolName } = getCampusPrintMeta()
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [subjects, setSubjects] = useState([])
  const [entry, setEntry] = useState(null)
  const [draftMarks, setDraftMarks] = useState({})
  const [headerName, setHeaderName] = useState('')
  const [headerMaxMarks, setHeaderMaxMarks] = useState('')
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isHeaderSaving, setIsHeaderSaving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTotalMarksModal, setShowTotalMarksModal] = useState(false)
  const [enterMoveDirection, setEnterMoveDirection] = useState('down')

  const classOptions = useMemo(() => classes.map(toClassOption), [classes])
  const examTypeOptions = useMemo(() => examTypes.map(toExamTypeOption), [examTypes])
  const subjectOptions = useMemo(() => subjects.map(toSubjectOption), [subjects])
  const selectedClass = classOptions.find((option) => option.value === sectionId) || null
  const selectedExamType = examTypeOptions.find((option) => option.value === examTypeId) || null
  const selectedSubject = subjectOptions.find((option) => option.value === subjectId) || null

  const parsedSectionId = Number(sectionId)
  const parsedExamTypeId = Number(examTypeId)
  const parsedSubjectId = Number(subjectId)
  const headerMaxTotal = useMemo(
    () => (entry?.headers || []).reduce((sum, header) => sum + Number(header.maxMarks || 0), 0),
    [entry?.headers],
  )
  const needsTotalMarks = Boolean(entry) && Number(entry.totalMarks || 0) <= 0
  const headerRemainingMarks = Number(entry?.totalMarks || 0) - headerMaxTotal
  const headersMatchTotal = Boolean(entry) && !needsTotalMarks && entry.headers.length > 0 && headerMaxTotal === Number(entry.totalMarks || 0)
  const saveHelpText = needsTotalMarks
    ? 'Enter total marks for this subject on Exam Entry before using detailed subject entry.'
    : `Header max marks must total exactly ${entry?.totalMarks ?? 0}. Current total is ${formatMarks(headerMaxTotal)}.`
  const examEntryTotalMarksLink = `/campus/exams/entry?sectionId=${encodeURIComponent(sectionId)}&examTypeId=${encodeURIComponent(examTypeId)}&load=1`

  const loadMeta = async () => {
    if (classes.length && examTypes.length) return
    setIsMetaLoading(true)
    try {
      const [classRows, typeRows] = await Promise.all([getClasses(), getExamTypes()])
      setClasses(Array.isArray(classRows) ? classRows : [])
      setExamTypes(Array.isArray(typeRows) ? typeRows : [])
    } catch {
      toast.error('Unable to load classes or exam types.')
    } finally {
      setIsMetaLoading(false)
    }
  }

  const applyEntry = (data) => {
    setEntry(data)
    const nextDraft = {}
    for (const student of data?.students || []) {
      for (const cell of student.cells || []) {
        nextDraft[cellKey(student.examId, cell.headerId)] = formatMarks(cell.marks)
      }
    }
    setDraftMarks(nextDraft)
  }

  const clearTotalMarksModal = () => {
    setShowTotalMarksModal(false)
    setEntry(null)
    setDraftMarks({})
    setHeaderName('')
    setHeaderMaxMarks('')
  }

  const loadSubjectMatrix = async ({
    nextSectionId = parsedSectionId,
    nextExamTypeId = parsedExamTypeId,
    nextSubjectId = parsedSubjectId,
  } = {}) => {
    if (!nextSectionId || !nextExamTypeId || !nextSubjectId) {
      toast.error('Select class, exam type, and subject.')
      return
    }

    setIsLoading(true)
    try {
      const data = await loadSubjectComponentEntry({
        sectionId: Number(nextSectionId),
        examTypeId: Number(nextExamTypeId),
        subjectId: Number(nextSubjectId),
      })
      applyEntry(data)
      if (Number(data?.totalMarks || 0) <= 0) {
        setShowTotalMarksModal(true)
      } else {
        setShowTotalMarksModal(false)
        toast.success('Detailed subject entry loaded.')
      }
    } catch (error) {
      setEntry(null)
      toast.error(error?.response?.data?.message || 'Unable to load detailed subject entry.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExamSubjects = async ({
    nextSectionId = parsedSectionId,
    nextExamTypeId = parsedExamTypeId,
  } = {}) => {
    if (!nextSectionId || !nextExamTypeId) {
      toast.error('Select class and exam type.')
      return
    }

    setIsLoading(true)
    try {
      const matrix = await loadExamEntryMatrix({ sectionId: Number(nextSectionId), examTypeId: Number(nextExamTypeId) })
      const nextSubjects = matrix?.subjects || []
      setSubjects(nextSubjects)
      setSubjectId('')
      setEntry(null)
      setDraftMarks({})
      setShowTotalMarksModal(false)
      if (nextSubjects.length === 0) {
        toast.error('No subjects found for this class and exam.')
        return
      }

      toast.success('Exam subjects loaded. Select a subject.')
    } catch (error) {
      setSubjects([])
      setSubjectId('')
      setEntry(null)
      toast.error(error?.response?.data?.message || 'Unable to prepare exam subjects.')
    } finally {
      setIsLoading(false)
    }
  }

  const addHeader = async () => {
    if (!entry) {
      toast.error('Load a subject first.')
      return
    }
    if (needsTotalMarks) {
      setShowTotalMarksModal(true)
      return
    }

    const maxMarks = headerMaxMarks.trim() ? Number(headerMaxMarks) : null
    if (!headerName.trim()) {
      toast.error('Enter a header name.')
      return
    }
    if (maxMarks == null || !Number.isFinite(maxMarks) || maxMarks <= 0) {
      toast.error('Enter max marks greater than zero.')
      return
    }
    if (headerMaxTotal + maxMarks > Number(entry.totalMarks || 0)) {
      toast.error(`Header max total cannot exceed subject total marks (${entry.totalMarks}).`)
      return
    }

    setIsHeaderSaving(true)
    try {
      const data = await addSubjectComponentHeader({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: parsedSubjectId,
        headerName,
        maxMarks,
      })
      setHeaderName('')
      setHeaderMaxMarks('')
      applyEntry(data)
      toast.success('Header added.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add header.')
    } finally {
      setIsHeaderSaving(false)
    }
  }

  const removeHeader = async (header) => {
    if (!window.confirm(`Remove "${header.headerName}" from this subject entry?`)) return
    try {
      const data = await deleteSubjectComponentHeader({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: parsedSubjectId,
        headerId: header.headerId,
      })
      applyEntry(data)
      toast.success('Header removed.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to remove header.')
    }
  }

  const rowTotal = (student) =>
    (entry?.headers || []).reduce((sum, header) => {
      const value = parseDecimal(draftMarks[cellKey(student.examId, header.headerId)])
      return sum + Number(value || 0)
    }, 0)

  const focusMatrixCell = (rowIndex, headerIndex) => {
    const nextInput = document.querySelector(
      `[data-component-cell="true"][data-row-index="${rowIndex}"][data-header-index="${headerIndex}"]`,
    )
    if (!nextInput) return

    nextInput.focus()
    nextInput.select()
  }

  const moveFromMatrixCell = (event, rowIndex, headerIndex) => {
    if (event.key !== 'Enter') return
    event.preventDefault()

    const rowCount = entry?.students?.length || 0
    const headerCount = entry?.headers?.length || 0
    if (!rowCount || !headerCount) return

    let nextRowIndex = rowIndex
    let nextHeaderIndex = headerIndex

    if (enterMoveDirection === 'right') {
      nextHeaderIndex += 1
      if (nextHeaderIndex >= headerCount) {
        nextHeaderIndex = 0
        nextRowIndex += 1
      }
    } else {
      nextRowIndex += 1
      if (nextRowIndex >= rowCount) {
        nextRowIndex = 0
        nextHeaderIndex += 1
      }
    }

    if (nextRowIndex >= rowCount || nextHeaderIndex >= headerCount) return
    window.requestAnimationFrame(() => focusMatrixCell(nextRowIndex, nextHeaderIndex))
  }

  const saveMarks = async () => {
    if (!entry) return
    if (needsTotalMarks) {
      setShowTotalMarksModal(true)
      return
    }
    if (entry.headers.length === 0) {
      toast.error('Add at least one header first.')
      return
    }
    if (!headersMatchTotal) {
      toast.error(`Header max total must equal subject total marks (${entry.totalMarks}) before saving.`)
      return
    }

    for (const student of entry.students) {
      const total = rowTotal(student)
      if (total > Number(entry.totalMarks || 0)) {
        toast.error(`${student.studentName || student.regId} total exceeds subject total marks.`)
        return
      }
      if (!Number.isInteger(total)) {
        toast.error(`${student.studentName || student.regId} total must be a whole number to save in obtained marks.`)
        return
      }
    }

    const students = entry.students.map((student) => ({
      examId: student.examId,
      studentId: student.regId,
      cells: entry.headers.map((header) => ({
        headerId: header.headerId,
        marks: parseDecimal(draftMarks[cellKey(student.examId, header.headerId)]) || 0,
      })),
    }))

    setIsSaving(true)
    try {
      const data = await saveSubjectComponentMarks({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        subjectId: parsedSubjectId,
        students,
      })
      applyEntry(data)
      toast.success('Component marks saved and obtained marks updated.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to save component marks.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Detailed subject entry">
      <style>{`
        .detail-print-header { display: none; }
        @page {
          size: A4 landscape;
          margin: 4mm;
        }
        @media print {
          * {
            font-family: Arial, Helvetica, sans-serif !important;
          }
          html, body, #root {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside,
          header,
          .no-print {
            display: none !important;
          }
          main,
          .print-content,
          .print-sheet {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .detail-print-header {
            display: block !important;
            color: #000000 !important;
            margin: 0 0 6px !important;
          }
          .detail-print-title-row {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 24px !important;
            margin: 0 0 14px !important;
          }
          .detail-print-school,
          .detail-print-name {
            margin: 0 !important;
            font-size: 25px !important;
            line-height: 1 !important;
            font-weight: 700 !important;
            letter-spacing: 0 !important;
          }
          .detail-print-meta {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            border: 1px solid #333333 !important;
            border-bottom: 0 !important;
            font-size: 14px !important;
            color: #000000 !important;
          }
          .detail-print-meta div {
            border-right: 1px solid #333333 !important;
            padding: 5px 6px !important;
          }
          .detail-print-meta div:last-child {
            border-right: 0 !important;
          }
          .detail-table-wrap {
            overflow: visible !important;
            border-top: 0 !important;
          }
          .detail-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            color: #000000 !important;
            font-size: 12px !important;
          }
          .detail-print-table th,
          .detail-print-table td {
            position: static !important;
            border: 1px solid #333333 !important;
            padding: 4px 5px !important;
            background: #ffffff !important;
            color: #000000 !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
            vertical-align: middle !important;
          }
          .detail-print-table thead th {
            background: #dddddd !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .detail-print-table input {
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            height: auto !important;
            padding: 0 !important;
            font: inherit !important;
            color: #000000 !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
      <div className="print-content space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <section className="no-print rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Detailed Subject Entry</h1>
                <p className="text-sm text-slate-500">Break a subject mark into custom headers and save the sum as obtained marks.</p>
              </div>
            </div>
            {entry ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Printer size={16} />
                  Print
                </button>
                <div className="relative flex items-center gap-1">
                <button
                type="button"
                onClick={saveMarks}
                disabled={isSaving || needsTotalMarks || !headersMatchTotal}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Marks
              </button>
                  {!headersMatchTotal ? (
                    <div className="group relative">
                      <button
                        type="button"
                        disabled
                        className="grid h-9 w-9 place-items-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
                      >
                        <HelpCircle size={18} />
                      </button>
                      <div className="pointer-events-none absolute right-0 top-11 z-50 hidden w-72 rounded-lg border border-rose-200 bg-white p-3 text-xs font-medium text-rose-700 shadow-xl group-hover:block">
                        {saveHelpText}
                      </div>
                    </div>
                  ) : null}
                </div>
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
                onMenuOpen={loadMeta}
                onChange={(option) => {
                  const nextSectionId = option?.value || ''
                  setSectionId(nextSectionId)
                  setSubjects([])
                  setSubjectId('')
                  setEntry(null)
                  setShowTotalMarksModal(false)
                  if (nextSectionId && examTypeId) {
                    void loadExamSubjects({ nextSectionId: Number(nextSectionId), nextExamTypeId: parsedExamTypeId })
                  }
                }}
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </label>
            <label className="md:col-span-3">
              <span className="mb-1 block text-sm font-medium text-slate-700">Exam Type</span>
              <Select
                isLoading={isMetaLoading}
                options={examTypeOptions}
                value={selectedExamType}
                onMenuOpen={loadMeta}
                onChange={(option) => {
                  const nextExamTypeId = option?.value || ''
                  setExamTypeId(nextExamTypeId)
                  setSubjects([])
                  setSubjectId('')
                  setEntry(null)
                  setShowTotalMarksModal(false)
                  if (sectionId && nextExamTypeId) {
                    void loadExamSubjects({ nextSectionId: parsedSectionId, nextExamTypeId: Number(nextExamTypeId) })
                  }
                }}
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </label>
            <label className="md:col-span-3">
              <span className="mb-1 block text-sm font-medium text-slate-700">Subject</span>
              <Select
                options={subjectOptions}
                value={selectedSubject}
                onChange={(option) => {
                  const nextSubjectId = option?.value || ''
                  setSubjectId(nextSubjectId)
                  setEntry(null)
                  setShowTotalMarksModal(false)
                  if (nextSubjectId) {
                    void loadSubjectMatrix({ nextSubjectId: Number(nextSubjectId) })
                  }
                }}
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                placeholder="Select subject"
                isDisabled={!subjectOptions.length}
              />
            </label>
            <button
              type="button"
              onClick={subjectId ? () => loadSubjectMatrix() : () => loadExamSubjects()}
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#344477] disabled:opacity-60 md:col-span-3"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              {subjectId ? 'Load Subject' : 'Load Exam'}
            </button>
          </div>
        </section>

        {entry ? (
          <section className="print-sheet rounded-2xl bg-white p-4 shadow-sm">
            <div className="detail-print-header">
              <div className="detail-print-title-row">
                <h2 className="detail-print-school">{schoolName}</h2>
                <h2 className="detail-print-name">Detailed Subject Entry</h2>
              </div>
              <div className="detail-print-meta">
                <div><strong>Campus:</strong> {campusLabel}</div>
                <div><strong>Class:</strong> {entry.className || selectedClass?.label || '-'}</div>
                <div><strong>Exam:</strong> {entry.examTypeName || selectedExamType?.label || '-'}</div>
                <div><strong>Subject:</strong> {entry.subjectShortName || entry.subjectName || '-'}</div>
              </div>
            </div>
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-2 sm:grid-cols-5">
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs text-indigo-600">Subject</p>
                  <p className="text-sm font-bold text-indigo-950">{entry.subjectShortName || entry.subjectName}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-xs text-emerald-600">Total marks</p>
                  <p className="text-sm font-bold text-emerald-950">{entry.totalMarks}</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-600">Passing marks</p>
                  <p className="text-sm font-bold text-amber-950">{entry.passingMarks}</p>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <p className="text-xs text-slate-500">Students</p>
                  <p className="text-sm font-bold text-slate-900">{entry.students.length}</p>
                </div>
                <div className={`rounded-xl px-3 py-2 ${headersMatchTotal ? 'bg-emerald-50' : needsTotalMarks ? 'bg-amber-50' : 'bg-rose-50'}`}>
                  <p className={`text-xs ${headersMatchTotal ? 'text-emerald-600' : needsTotalMarks ? 'text-amber-600' : 'text-rose-600'}`}>Header max total</p>
                  <p className={`text-sm font-bold ${headersMatchTotal ? 'text-emerald-950' : needsTotalMarks ? 'text-amber-950' : 'text-rose-950'}`}>
                    {formatMarks(headerMaxTotal)} / {entry.totalMarks}
                  </p>
                </div>
              </div>

              <div className="no-print flex flex-wrap items-end gap-2">
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Enter moves</span>
                  <div className="grid h-10 grid-cols-2 overflow-hidden rounded-lg border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setEnterMoveDirection('down')}
                      className={`px-3 text-sm font-semibold ${enterMoveDirection === 'down' ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnterMoveDirection('right')}
                      className={`border-l border-slate-300 px-3 text-sm font-semibold ${enterMoveDirection === 'right' ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Right
                    </button>
                  </div>
                </div>
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Header</span>
                  <input
                    value={headerName}
                    onChange={(event) => setHeaderName(event.target.value)}
                    className="h-10 w-44 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[var(--campus-primary)]"
                    placeholder="Vocabulary"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Max</span>
                  <input
                    value={headerMaxMarks}
                    onChange={(event) => setHeaderMaxMarks(normalizeDecimalInput(event.target.value))}
                    className="h-10 w-24 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[var(--campus-primary)]"
                    placeholder="30"
                  />
                </label>
                <button
                  type="button"
                  onClick={addHeader}
                  disabled={isHeaderSaving || needsTotalMarks || headerRemainingMarks <= 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0ab39c] px-3 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
                >
                  {isHeaderSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Header
                </button>
              </div>
            </div>

            {needsTotalMarks ? (
              <div className="no-print mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm shadow-amber-100">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
                <div>
                  <p className="font-bold">Total marks are required before detailed entry.</p>
                  <p>Open Exam Entry and enter total marks for {entry.subjectShortName || entry.subjectName} first.</p>
                </div>
              </div>
            ) : !headersMatchTotal ? (
              <div className="no-print mb-4 flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm shadow-rose-100">
                <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={20} />
                <div>
                  <p className="font-bold">Header max marks must total exactly {entry.totalMarks}.</p>
                  <p>
                    Current total is {formatMarks(headerMaxTotal)}.
                    {headerRemainingMarks > 0 ? ` Add ${formatMarks(headerRemainingMarks)} more mark${headerRemainingMarks === 1 ? '' : 's'} in headers.` : ' Reduce header max marks to match the subject total.'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="detail-table-wrap overflow-x-auto border-t border-slate-200">
              <table className="detail-print-table min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#34477d] text-left text-white">
                    <th className="sticky left-0 z-30 w-10 min-w-10 border border-slate-200 bg-[#34477d] px-1 py-1.5">#</th>
                    <th className="sticky left-10 z-30 w-16 min-w-16 border border-slate-200 bg-[#34477d] px-1 py-1.5">Reg No.</th>
                    <th className="sticky left-[104px] z-30 w-52 min-w-52 border border-slate-200 bg-[#34477d] px-1.5 py-1.5">Student Name</th>
                    {entry.headers.map((header) => (
                      <th key={header.headerId} className="w-28 min-w-28 border border-slate-200 bg-[#34477d] px-1 py-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate" title={header.headerName}>{header.headerName}</span>
                          <button
                            type="button"
                            onClick={() => removeHeader(header)}
                            className="print-hide rounded p-0.5 text-white/80 hover:bg-white/10 hover:text-white"
                            aria-label={`Remove ${header.headerName}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="print-hide mt-0.5 text-[10px] font-medium text-indigo-100">
                          Max {header.maxMarks == null ? '-' : formatMarks(header.maxMarks)}
                        </div>
                      </th>
                    ))}
                    <th className="w-16 min-w-16 border border-slate-200 bg-[#34477d] px-1 py-1.5">Sum</th>
                    <th className="w-20 min-w-20 border border-slate-200 bg-[#34477d] px-1 py-1.5">Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.headers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                        Add headers to start detailed entry for this subject.
                      </td>
                    </tr>
                  ) : null}
                  {entry.students.map((student, rowIndex) => {
                    const total = rowTotal(student)
                    const exceeds = total > Number(entry.totalMarks || 0)
                    const fractional = !Number.isInteger(total)
                    return (
                      <tr key={student.examId} className="odd:bg-white even:bg-slate-50">
                        <td className="sticky left-0 z-10 border border-slate-200 bg-inherit px-1 py-1">{student.serial}</td>
                        <td className="sticky left-10 z-10 border border-slate-200 bg-inherit px-1 py-1">{student.regId}</td>
                        <td className="sticky left-[104px] z-10 max-w-52 truncate border border-slate-200 bg-inherit px-1.5 py-1 font-semibold text-[#294a91]" title={student.studentName}>
                          {student.studentName}
                        </td>
                        {entry.headers.map((header, headerIndex) => {
                          const key = cellKey(student.examId, header.headerId)
                          return (
                            <td key={key} className="border border-slate-200 p-[2px]">
                              <input
                                data-component-cell="true"
                                data-row-index={rowIndex}
                                data-header-index={headerIndex}
                                value={draftMarks[key] ?? ''}
                                onKeyDown={(event) => moveFromMatrixCell(event, rowIndex, headerIndex)}
                                onChange={(event) => {
                                  const next = normalizeDecimalInput(event.target.value)
                                  const parsed = parseDecimal(next)
                                  if (header.maxMarks != null && parsed != null && parsed > Number(header.maxMarks)) {
                                    toast.error(`${header.headerName} cannot exceed ${formatMarks(header.maxMarks)}.`)
                                    return
                                  }
                                  setDraftMarks((current) => ({ ...current, [key]: next }))
                                }}
                                className="h-7 w-full rounded-md border border-slate-300 px-1.5 font-semibold outline-none transition focus:border-[var(--campus-primary)]"
                              />
                            </td>
                          )
                        })}
                        <td className={`border border-slate-200 px-1 py-1 font-bold ${exceeds || fractional ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatMarks(total)}
                        </td>
                        <td className="border border-slate-200 px-1 py-1 font-bold text-slate-500">{student.existingObtainedMarks}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Select class and exam type, load exam subjects, then choose one subject for detailed entry.
          </section>
        )}
      </div>
      {showTotalMarksModal ? (
        <div
          className="no-print fixed inset-0 z-[10000] grid place-items-center bg-slate-900/35 px-4 backdrop-blur-sm"
          onClick={clearTotalMarksModal}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enter total marks first</h2>
                <p className="mt-1 text-sm text-slate-600">
                  This subject has total marks set to 0. Please go to Exam Entry and enter total marks for {entry?.subjectShortName || entry?.subjectName || 'this subject'} before adding detailed headers.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={clearTotalMarksModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Link
                to={examEntryTotalMarksLink}
                state={{ sectionId, examTypeId, autoLoad: true }}
                className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344477]"
              >
                Open Exam Entry
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

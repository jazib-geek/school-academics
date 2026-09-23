import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Printer, Search, TableProperties, X } from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getClasses } from '../../../services/classService'
import { getExamMarkSheet, getExamTypes } from '../../../services/examService'

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
    '&:hover': { borderColor: '#6366f1' },
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
}

const sortOptions = [
  { value: 'position', label: 'By marks (position wise)' },
  { value: 'regId', label: 'By registration no.' },
]

const PRINT_STYLES = `
  .exam-sheet-pct-sign {
    font-size: 0.72em;
    font-weight: inherit;
  }
  @page { size: A4 landscape; margin: 5mm; }
  @media print {
    * {
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body, #root { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .print-page-root, .print-main-wrap, .print-content-wrap { background: #fff !important; }
    .no-print { display: none !important; }
    .print-main-wrap { min-height: auto !important; }
    .print-content-wrap { padding: 0 !important; margin: 0 !important; max-width: none !important; }
    body.printing-exam-mark-sheet .exam-entry-screen,
    body.printing-exam-mark-sheet .print-main-wrap > aside {
      display: none !important;
    }
    body.printing-exam-mark-sheet .exam-mark-sheet-modal {
      position: static !important;
      inset: auto !important;
      z-index: auto !important;
      padding: 0 !important;
      background: #fff !important;
      backdrop-filter: none !important;
    }
    body.printing-exam-mark-sheet .exam-mark-sheet-modal > div {
      height: auto !important;
      overflow: visible !important;
      border-radius: 0 !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    body.printing-exam-mark-sheet .exam-mark-sheet-print-root {
      position: static !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #fff !important;
    }
    .print-area {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .exam-sheet-header {
      border: none !important;
      padding: 0 0 8px !important;
      page-break-after: avoid !important;
      break-after: avoid-page !important;
    }
    .exam-sheet-header-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr 1fr !important;
      align-items: start !important;
      gap: 0 !important;
    }
    .exam-mark-sheet-logo-wrap { display: none !important; }
    .exam-sheet-session-line { display: none !important; }
    .exam-sheet-header-left,
    .exam-sheet-header-right,
    .exam-sheet-printed-at {
      font-size: 12px !important;
      font-weight: 400 !important;
      color: #000 !important;
    }
    .exam-sheet-header-left { text-align: left !important; }
    .exam-sheet-title {
      font-size: 12px !important;
      font-weight: 400 !important;
      color: #000 !important;
      letter-spacing: normal !important;
      text-transform: none !important;
    }
    .exam-sheet-header-center { text-align: center !important; }
    .exam-sheet-school-name {
      font-size: 20px !important;
      font-weight: 700 !important;
      color: #000 !important;
      text-transform: uppercase !important;
    }
    .exam-sheet-campus-name {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #000 !important;
    }
    .exam-sheet-header-right { text-align: center !important; font-size: 14px !important; }
    .print-sheet-table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      table-layout: fixed !important;
      font-size: 10px !important;
      color: #000 !important;
      page-break-inside: auto !important;
    }
    .print-sheet-table thead {
      display: table-header-group !important;
    }
    .print-sheet-table tbody {
      display: table-row-group !important;
    }
    .print-sheet-table .overflow-x-auto,
    .print-area .overflow-x-auto {
      overflow: visible !important;
    }
    .print-sheet-table th,
    .print-sheet-table td {
      border: 1px solid #000 !important;
      padding: 2px 1px !important;
      line-height: 1.15 !important;
      color: #000 !important;
      background: #fff !important;
      min-width: 0 !important;
      overflow: hidden !important;
      word-wrap: break-word !important;
    }
    .print-sheet-table .exam-sheet-pct-sign {
      font-size: 8px !important;
    }
    .print-sheet-table .exam-sheet-remarks-col {
      font-size: 9px !important;
      padding-left: 5px !important;
      padding-right: 2px !important;
      text-align: left !important;
    }
    .print-sheet-table col.exam-sheet-col-serial { width: 2.2%; }
    .print-sheet-table col.exam-sheet-col-reg { width: 4%; }
    .print-sheet-table col.exam-sheet-col-name { width: 18%; }
    .print-sheet-table col.exam-sheet-col-subject { width: 3.2%; }
    .print-sheet-table col.exam-sheet-col-attendance { width: 5%; }
    .print-sheet-table col.exam-sheet-col-total { width: 3.5%; }
    .print-sheet-table col.exam-sheet-col-position { width: 4%; }
    .print-sheet-table col.exam-sheet-col-pct { width: 4.5%; }
    .print-sheet-table col.exam-sheet-col-grade { width: 3.5%; }
    .print-sheet-table col.exam-sheet-col-remarks { width: 8%; }
    .print-sheet-table .exam-sheet-student-name-col {
      text-align: left !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
      hyphens: none !important;
      padding-left: 3px !important;
      padding-right: 3px !important;
    }
    .print-sheet-table thead th.exam-sheet-student-name-col {
      white-space: nowrap !important;
      font-size: 9px !important;
    }
    .print-sheet-table thead th {
      font-weight: 400 !important;
      text-align: center !important;
    }
    .print-sheet-table thead th.reg-no-head { font-size: 10px !important; }
    .print-sheet-table thead th.exam-sheet-student-name-col,
    .print-sheet-table tbody td.exam-sheet-student-name-col { text-align: left !important; }
    .print-sheet-table tbody td:nth-child(2) { text-align: center !important; }
    .print-sheet-table .config-row td,
    .print-sheet-table .avg-row td { font-weight: 400 !important; }
    .print-sheet-table .config-row td[colspan="3"],
    .print-sheet-table .avg-row td[colspan="3"] {
      font-weight: 700 !important;
      text-align: left !important;
    }
    .print-sheet-table tbody tr td {
      color: #000 !important;
      font-weight: 400 !important;
    }
    .print-sheet-table tbody tr td.font-semibold:not(.exam-sheet-total-col) {
      font-weight: 400 !important;
    }
    .print-sheet-table .exam-sheet-total-col {
      background: rgba(128, 128, 128, 0.07) !important;
      font-weight: 700 !important;
    }
    .print-sheet-table .sticky { position: static !important; }
    .print-sheet-table tbody tr { page-break-inside: avoid !important; break-inside: avoid-page !important; }
  }
`

function configCellValue(subject, field) {
  if (subject.usesGradeDisplay) return '—'
  return subject[field] ?? '—'
}

function cellBySubject(cells, subjectId) {
  return cells?.find((cell) => cell.subjectId === subjectId) || null
}

function formatPercentValue(value) {
  if (value == null || value === '') return '—'
  return (
    <>
      {value}
      <span className="exam-sheet-pct-sign">%</span>
    </>
  )
}

/** Pass-rate per subject: passers ÷ present students (excludes absent / -1), rounded. */
function computeTargetPercentBySubject(sheet) {
  const map = new Map()
  if (!sheet?.students?.length || !sheet.subjects?.length) return map

  for (const subject of sheet.subjects) {
    if (subject.usesGradeDisplay) {
      map.set(subject.subjectId, null)
      continue
    }

    const passing = Number(subject.passingMarks) || 0
    let abovePassing = 0
    let countedStudents = 0

    for (const student of sheet.students) {
      const cell = cellBySubject(student.subjectCells, subject.subjectId)
      if (!cell || cell.usesGradeDisplay) continue

      const obtained = cell.obtainedMarks
      if (obtained == null || obtained === -1) continue

      countedStudents += 1
      if (Number(obtained) >= passing) abovePassing += 1
    }

    if (countedStudents === 0) {
      map.set(subject.subjectId, null)
      continue
    }

    map.set(subject.subjectId, Math.round((abovePassing / countedStudents) * 100))
  }

  return map
}

export default function CampusExamMarkSheetPage({
  embedded = false,
  initialSectionId = '',
  initialExamTypeId = '',
  initialSortBy = 'position',
  initialMarkDrawingAsGrade = true,
  initialMarkStempAsGrade = true,
  autoLoad = false,
  hideControls = false,
  onClose,
} = {}) {
  const { campusLabel, schoolName, sessionLabel, logoSrc } = getCampusPrintMeta()

  const [sectionId, setSectionId] = useState(initialSectionId ? String(initialSectionId) : '')
  const [examTypeId, setExamTypeId] = useState(initialExamTypeId ? String(initialExamTypeId) : '')
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [markDrawingAsGrade, setMarkDrawingAsGrade] = useState(initialMarkDrawingAsGrade)
  const [markStempAsGrade, setMarkStempAsGrade] = useState(initialMarkStempAsGrade)
  const [classOptions, setClassOptions] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [sheet, setSheet] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const [classes, types] = await Promise.all([getClasses(), getExamTypes()])
        if (!cancelled) {
          setClassOptions(Array.isArray(classes) ? classes : [])
          setExamTypes(Array.isArray(types) ? types : [])
        }
      } catch {
        if (!cancelled) setError('Unable to load classes or exam types.')
      } finally {
        if (!cancelled) setIsMetaLoading(false)
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  const classSelectOptions = useMemo(
    () =>
      classOptions.map((item) => ({
        value: String(item.id ?? item.ID),
        label: item.className ?? item.ClassName ?? `Class #${item.id ?? item.ID}`,
      })),
    [classOptions],
  )

  const examTypeSelectOptions = useMemo(
    () =>
      examTypes.map((item) => ({
        value: String(item.id),
        label: item.name || `Exam #${item.id}`,
      })),
    [examTypes],
  )

  const selectedClass = useMemo(
    () => classSelectOptions.find((option) => option.value === sectionId) || null,
    [classSelectOptions, sectionId],
  )

  const selectedExamType = useMemo(
    () => examTypeSelectOptions.find((option) => option.value === examTypeId) || null,
    [examTypeSelectOptions, examTypeId],
  )

  const selectedSort = useMemo(
    () => sortOptions.find((option) => option.value === sortBy) || sortOptions[0],
    [sortBy],
  )

  const loadSheet = useCallback(async () => {
    const parsedSectionId = Number(sectionId)
    const parsedExamTypeId = Number(examTypeId)

    if (!parsedSectionId || !parsedExamTypeId) {
      setError('Select a class and exam type.')
      setSheet(null)
      return
    }

    setIsLoading(true)
    setError('')
    setHasLoaded(true)

    try {
      const data = await getExamMarkSheet({
        sectionId: parsedSectionId,
        examTypeId: parsedExamTypeId,
        sortBy,
        includeDrawing: !markDrawingAsGrade,
        includeStemp: !markStempAsGrade,
      })
      setSheet(data)
    } catch (requestError) {
      setSheet(null)
      if (requestError?.response?.status === 404) {
        setError('No mark sheet found for this class and exam type.')
      } else {
        setError('Unable to load mark sheet. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [examTypeId, markDrawingAsGrade, markStempAsGrade, sectionId, sortBy])

  useEffect(() => {
    if (!embedded) return
    setSectionId(initialSectionId ? String(initialSectionId) : '')
    setExamTypeId(initialExamTypeId ? String(initialExamTypeId) : '')
    setSortBy(initialSortBy)
    setMarkDrawingAsGrade(initialMarkDrawingAsGrade)
    setMarkStempAsGrade(initialMarkStempAsGrade)
  }, [embedded, initialExamTypeId, initialMarkDrawingAsGrade, initialMarkStempAsGrade, initialSectionId, initialSortBy])

  useEffect(() => {
    if (!autoLoad || !sectionId || !examTypeId) return
    loadSheet()
  }, [autoLoad, examTypeId, loadSheet, sectionId])

  useEffect(() => {
    if (!sheet) return undefined

    const onBeforePrint = () => {
      document.body.classList.add('printing-exam-mark-sheet')
    }
    const onAfterPrint = () => {
      document.body.classList.remove('printing-exam-mark-sheet')
    }

    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
      document.body.classList.remove('printing-exam-mark-sheet')
    }
  }, [sheet])

  const onSubmit = (event) => {
    event.preventDefault()
    loadSheet()
  }

  const onPrint = () => {
    window.print()
  }

  const printedAt = new Date().toLocaleString()
  const sortLabel = sortBy === 'regId' ? 'Roll No. wise' : 'Position wise'

  const targetPercentBySubject = useMemo(
    () => (sheet ? computeTargetPercentBySubject(sheet) : new Map()),
    [sheet],
  )

  const content = (
    <>
      <style>{PRINT_STYLES}</style>

      <div
        className={`print-content-wrap mx-auto w-full max-w-[1600px] px-4 pb-10 lg:px-6 ${embedded ? 'print-page-root pt-4' : 'pt-[4.25rem]'}`}
      >
        <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--campus-primary)] text-white shadow-md">
              <TableProperties size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Exam mark sheet</h1>
              <p className="text-sm text-slate-500">
                Class result grid with positions, grades, and subject averages.
              </p>
            </div>
          </div>
          {sheet ? (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Printer size={16} />
              Print
            </button>
          ) : null}
          {embedded ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <X size={16} />
              Close
            </button>
          ) : null}
        </div>

        {!hideControls ? (
        <form
          onSubmit={onSubmit}
          className="no-print mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className={`grid gap-4 lg:items-end ${embedded ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
            {!embedded ? (
              <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Class</span>
              <Select
                inputId="mark-sheet-class"
                isLoading={isMetaLoading}
                isClearable
                options={classSelectOptions}
                value={selectedClass}
                onChange={(option) => setSectionId(option?.value || '')}
                placeholder="Select class…"
                styles={selectStyles}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Exam type</span>
              <Select
                inputId="mark-sheet-exam-type"
                isLoading={isMetaLoading}
                isClearable
                options={examTypeSelectOptions}
                value={selectedExamType}
                onChange={(option) => setExamTypeId(option?.value || '')}
                placeholder="Select exam type…"
                styles={selectStyles}
              />
            </label>
              </>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Sort</span>
              <Select
                inputId="mark-sheet-sort"
                options={sortOptions}
                value={selectedSort}
                onChange={(option) => setSortBy(option?.value || 'position')}
                styles={selectStyles}
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={markDrawingAsGrade}
                  onChange={(event) => setMarkDrawingAsGrade(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Mark Drawing as grade
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={markStempAsGrade}
                  onChange={(event) => setMarkStempAsGrade(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Mark Stemp as grade
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || isMetaLoading}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#344574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Load sheet
            </button>
          </div>
        </form>
        ) : null}

        {error ? (
          <div className="no-print mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              Loading mark sheet…
            </div>
          </div>
        ) : null}

        {!isLoading && sheet ? (
          <div className="exam-mark-sheet-print-root">
          <div className="print-area overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="exam-sheet-header border-b border-slate-200 px-5 py-4">
              <div className="exam-sheet-header-grid flex flex-wrap items-start justify-between gap-4">
                <div className="exam-sheet-header-left flex min-w-[200px] items-start gap-3">
                  <div className="exam-mark-sheet-logo-wrap shrink-0">
                    <img src={logoSrc} alt="" className="h-10 w-10 object-contain" />
                  </div>
                  <div>
                    <p className="exam-sheet-title text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      EXAM RESULT SHEET : {(sheet.examTypeName || '').toUpperCase()} ({sortLabel})
                    </p>
                    <p className="exam-sheet-printed-at mt-1 text-xs text-slate-500">{printedAt}</p>
                  </div>
                </div>
                <div className="exam-sheet-header-center text-center">
                  <h2 className="exam-sheet-school-name text-lg font-bold text-slate-900">{schoolName}</h2>
                  <p className="exam-sheet-campus-name text-sm font-bold text-slate-600">{campusLabel}</p>
                  {sessionLabel ? (
                    <p className="exam-sheet-session-line text-sm text-slate-600">Session: {sessionLabel}</p>
                  ) : null}
                </div>
                <div className="exam-sheet-header-right text-right text-sm text-slate-600">
                  <p>
                    Class : <span className="font-semibold text-slate-800">{sheet.className}</span>
                  </p>
                  <p className="mt-1">
                    Strength&nbsp;&nbsp;:&nbsp;&nbsp;
                    <span className="font-semibold text-slate-800">{sheet.strength}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="print-sheet-table min-w-full text-xs sm:text-sm">
                <colgroup>
                  <col className="exam-sheet-col-serial" />
                  <col className="exam-sheet-col-reg" />
                  <col className="exam-sheet-col-name" />
                  {sheet.subjects.map((subject) => (
                    <col key={`col-subj-${subject.subjectId}`} className="exam-sheet-col-subject" />
                  ))}
                  <col className="exam-sheet-col-attendance" />
                  <col className="exam-sheet-col-total" />
                  <col className="exam-sheet-col-position" />
                  <col className="exam-sheet-col-pct" />
                  <col className="exam-sheet-col-grade" />
                  <col className="exam-sheet-col-remarks" />
                </colgroup>
                <thead>
                  <tr className="bg-indigo-50 text-slate-700">
                    <th className="sticky left-0 z-10 bg-indigo-50 px-3 py-2 text-left font-semibold">#</th>
                    <th className="reg-no-head px-3 py-2 text-left font-semibold whitespace-nowrap">Reg no.</th>
                    <th className="exam-sheet-student-name-col min-w-[11rem] px-3 py-2 text-left font-semibold whitespace-nowrap">
                      Student Name
                    </th>
                    {sheet.subjects.map((subject) => (
                      <th
                        key={subject.subjectId}
                        className="px-2 py-2 text-center font-semibold whitespace-nowrap"
                        title={subject.subjectName}
                      >
                        {subject.shortName || subject.subjectName}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Attendance</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Total</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Position</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Percentage</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Grade</th>
                    <th className="exam-sheet-remarks-col min-w-[120px] px-3 py-2 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="config-row bg-slate-50 text-slate-700">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold">
                      Total Marks
                    </td>
                    {sheet.subjects.map((subject) => (
                      <td key={`total-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                        {configCellValue(subject, 'totalMarks')}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center">—</td>
                    <td className="exam-sheet-total-col px-2 py-2 text-center font-semibold">
                      {sheet.grandTotalMarks}
                    </td>
                    <td colSpan={4} />
                  </tr>
                  <tr className="config-row bg-slate-50 text-slate-700">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold">
                      Passing Marks
                    </td>
                    {sheet.subjects.map((subject) => (
                      <td key={`pass-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                        {configCellValue(subject, 'passingMarks')}
                      </td>
                    ))}
                    <td colSpan={5} />
                  </tr>
                  <tr className="config-row bg-slate-50 text-slate-700">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold">
                      Max Marks
                    </td>
                    {sheet.subjects.map((subject) => (
                      <td key={`max-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                        {configCellValue(subject, 'maxMarks')}
                      </td>
                    ))}
                    <td colSpan={5} />
                  </tr>

                  {sheet.students.map((student) => (
                    <tr key={student.regId} className="hover:bg-slate-50/70">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 text-slate-600">{student.serial}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{student.regId}</td>
                      <td className="exam-sheet-student-name-col px-3 py-2 font-medium text-slate-900">
                        {student.studentName}
                      </td>
                      {sheet.subjects.map((subject) => {
                        const cell = cellBySubject(student.subjectCells, subject.subjectId)
                        const isAbsent = cell?.displayValue === 'A'
                        const isGrade = cell?.usesGradeDisplay

                        return (
                          <td
                            key={`${student.regId}-${subject.subjectId}`}
                            className={`px-2 py-2 text-center ${
                              isAbsent
                                ? 'font-semibold text-amber-700'
                                : isGrade
                                  ? 'font-semibold text-indigo-700'
                                  : 'text-slate-800'
                            }`}
                          >
                            {cell?.displayValue ?? '—'}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center whitespace-nowrap text-slate-700">
                        {student.attendanceRatio || '—'}
                      </td>
                      <td className="exam-sheet-total-col px-2 py-2 text-center font-semibold text-slate-900">
                        {student.totalObtained}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">
                        {student.positionDisplay || '—'}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-700">{formatPercentValue(student.percentage)}</td>
                      <td className="px-2 py-2 text-center font-semibold text-indigo-700">
                        {student.grade || '—'}
                      </td>
                      <td className="exam-sheet-remarks-col px-3 py-2 text-slate-700">{student.remarks || '—'}</td>
                    </tr>
                  ))}

                  <tr className="avg-row bg-slate-100 text-slate-800">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-100 px-3 py-2 font-semibold">
                      Percentage
                    </td>
                    {sheet.subjects.map((subject) => {
                      const avg = sheet.subjectAverages?.find((item) => item.subjectId === subject.subjectId)
                      return (
                        <td key={`avg-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                          {avg ? formatPercentValue(avg.percentage) : '—'}
                        </td>
                      )
                    })}
                    <td colSpan={5} />
                  </tr>
                  <tr className="avg-row bg-slate-100 text-slate-800">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-100 px-3 py-2 font-semibold">
                      Target percentage
                    </td>
                    {sheet.subjects.map((subject) => {
                      const target = targetPercentBySubject.get(subject.subjectId)
                      return (
                        <td key={`target-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                          {target == null ? '—' : formatPercentValue(target)}
                        </td>
                      )
                    })}
                    <td colSpan={5} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
        ) : null}

        {!isLoading && hasLoaded && !sheet && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No mark sheet to display.
          </div>
        ) : null}
      </div>
    </>
  )

  if (embedded) return content

  return (
    <CampusShell
      headerContext="Exam mark sheet"
      rootClassName="print-page-root"
      rowClassName="print-main-wrap flex min-h-screen w-full"
      asideClassName="no-print"
      headerClassName="no-print"
    >
      {content}
    </CampusShell>
  )
}

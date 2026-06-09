import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Printer, Search, TableProperties } from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../../constants/branding'
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
  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body, #root { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .print-page-root, .print-main-wrap, .print-content-wrap { background: #fff !important; }
    .no-print { display: none !important; }
    .print-main-wrap { min-height: auto !important; }
    .print-content-wrap { padding: 0 !important; margin: 0 !important; }
    .print-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; }
    .print-sheet-table { width: 100% !important; border-collapse: collapse !important; font-size: 9px !important; }
    .print-sheet-table th, .print-sheet-table td { border: 1px solid #cbd5e1 !important; padding: 3px 4px !important; }
    .print-sheet-table thead th { background: #eef2ff !important; color: #0f172a !important; }
    .print-sheet-table .config-row td { background: #f8fafc !important; font-weight: 600 !important; }
    .print-sheet-table .avg-row td { background: #f1f5f9 !important; font-weight: 600 !important; }
    .print-sheet-table tr { page-break-inside: avoid !important; }
  }
`

function configCellValue(subject, field) {
  if (subject.usesGradeDisplay) return '—'
  return subject[field] ?? '—'
}

function cellBySubject(cells, subjectId) {
  return cells?.find((cell) => cell.subjectId === subjectId) || null
}

export default function CampusExamMarkSheetPage() {
  const campusCode = localStorage.getItem('campus') || ''
  const campusLabel = getCampusLabel(campusCode)

  const [sectionId, setSectionId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [sortBy, setSortBy] = useState('position')
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
  }, [examTypeId, sectionId, sortBy])

  const onSubmit = (event) => {
    event.preventDefault()
    loadSheet()
  }

  const onPrint = () => {
    window.print()
  }

  const printedAt = new Date().toLocaleString()
  const sortLabel = sortBy === 'regId' ? 'Registration no.' : 'Position wise'

  return (
    <CampusShell
      headerContext="Exam mark sheet"
      rootClassName="print-page-root"
      rowClassName="print-main-wrap flex min-h-screen w-full"
    >
      <style>{PRINT_STYLES}</style>

      <div className="print-content-wrap mx-auto w-full max-w-[1600px] px-4 pb-10 pt-20 lg:px-6">
        <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#405189] text-white shadow-md">
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
        </div>

        <form
          onSubmit={onSubmit}
          className="no-print mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
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

            <button
              type="submit"
              disabled={isLoading || isMetaLoading}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#405189] px-5 text-sm font-semibold text-white transition hover:bg-[#344574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Load sheet
            </button>
          </div>
        </form>

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
          <div className="print-area overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <img src={SCHOOL_LOGO_PATH} alt="" className="h-10 w-10 object-contain" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      Exam result sheet : {sheet.examTypeName} ({sortLabel})
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">{SCHOOL_NAME}</h2>
                    <p className="text-sm text-slate-600">{campusLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Class: <span className="font-semibold text-slate-800">{sheet.className}</span>
                      {' · '}
                      Strength: <span className="font-semibold text-slate-800">{sheet.strength}</span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{printedAt}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="print-sheet-table min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-indigo-50 text-slate-700">
                    <th className="sticky left-0 z-10 bg-indigo-50 px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Reg no.</th>
                    <th className="min-w-[140px] px-3 py-2 text-left font-semibold">Student name</th>
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
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">%</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Grade</th>
                    <th className="min-w-[120px] px-3 py-2 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="config-row bg-slate-50 text-slate-700">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold">
                      Total marks
                    </td>
                    {sheet.subjects.map((subject) => (
                      <td key={`total-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                        {configCellValue(subject, 'totalMarks')}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center">—</td>
                    <td className="px-2 py-2 text-center font-semibold">{sheet.grandTotalMarks}</td>
                    <td colSpan={4} />
                  </tr>
                  <tr className="config-row bg-slate-50 text-slate-700">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold">
                      Passing marks
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
                      Max marks
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
                      <td className="px-3 py-2 font-medium text-slate-900">{student.studentName}</td>
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
                      <td className="px-2 py-2 text-center font-semibold text-slate-900">
                        {student.totalObtained}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">
                        {student.positionDisplay || '—'}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-700">{student.percentage}%</td>
                      <td className="px-2 py-2 text-center font-semibold text-indigo-700">
                        {student.grade || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{student.remarks || '—'}</td>
                    </tr>
                  ))}

                  <tr className="avg-row bg-slate-100 text-slate-800">
                    <td colSpan={3} className="sticky left-0 z-10 bg-slate-100 px-3 py-2 font-semibold">
                      Subject percentage
                    </td>
                    {sheet.subjects.map((subject) => {
                      const avg = sheet.subjectAverages?.find((item) => item.subjectId === subject.subjectId)
                      return (
                        <td key={`avg-${subject.subjectId}`} className="px-2 py-2 text-center font-semibold">
                          {avg ? `${avg.percentage}%` : '—'}
                        </td>
                      )
                    })}
                    <td colSpan={5} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!isLoading && hasLoaded && !sheet && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No mark sheet to display.
          </div>
        ) : null}
      </div>
    </CampusShell>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { FileBarChart2, Loader2, Printer, Search, UserRound } from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusPrintMeta } from '../../../utils/campusProfile'
import { getClasses } from '../../../services/classService'
import { getExamTypes, getTeacherExamAnalysis } from '../../../services/examService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'

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

const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body, #root {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, sans-serif !important;
      color: #000 !important;
    }
    .no-print { display: none !important; }
    .print-root, .print-main, .print-content { background: #fff !important; }
    .print-content { max-width: none !important; padding: 0 !important; margin: 0 !important; }
    .print-card {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    .print-card * {
      color: #000 !important;
      font-family: Arial, sans-serif !important;
    }
    .print-chip {
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      display: inline !important;
    }
    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 12px !important;
    }
    .print-table th, .print-table td {
      border: 1px solid #000 !important;
      padding: 6px 8px !important;
      vertical-align: top !important;
    }
    .print-table thead th { background: #fff !important; }
    .print-student-sub {
      display: block !important;
      font-size: 10px !important;
      margin-top: 2px !important;
    }
    .print-header-meta {
      display: block !important;
      text-align: left !important;
    }
    .print-header-summary {
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin-top: 6px !important;
    }
    .print-header-shell {
      border-bottom: 1px solid #000 !important;
      background: #fff !important;
    }
  }
`

function getScoreTone(value) {
  if (value >= 80) return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (value >= 60) return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-rose-50 text-rose-800 ring-rose-200'
}

function ScoreChip({ value, suffix = '', center = false }) {
  const tone = getScoreTone(value)
  return (
    <span
      className={`print-chip inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${tone} ${
        center ? 'justify-center' : ''
      }`}
    >
      {value}
      {suffix}
    </span>
  )
}

function ExtremumCell({ item }) {
  if (!item) return <span className="text-slate-400">-</span>

  return (
    <div className="inline-flex flex-col">
      <ScoreChip value={item.obtainedMarks} />
      <sub className="print-student-sub mt-1 text-xs leading-4 text-slate-500 not-italic">
        {item.studentName || `ID ${item.studentId}`}
      </sub>
    </div>
  )
}

export default function CampusTeacherExamAnalysisPage() {
  const { campusLabel, schoolName, sessionLabel, logoSrc } = getCampusPrintMeta()
  const [sectionId, setSectionId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [classOptions, setClassOptions] = useState([])
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [report, setReport] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const [classes, employees, types] = await Promise.all([
          getClasses(),
          getTeacherAssignmentEmployees(),
          getExamTypes(),
        ])

        if (!cancelled) {
          setClassOptions(Array.isArray(classes) ? classes : [])
          setEmployeeOptions(Array.isArray(employees) ? employees : [])
          setExamTypes(Array.isArray(types) ? types : [])
        }
      } catch {
        if (!cancelled) setError('Unable to load classes, teachers, or exam types.')
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

  const employeeSelectOptions = useMemo(
    () =>
      employeeOptions.map((item) => ({
        value: String(item.id ?? item.ID),
        label: item.employeeName ?? item.EmployeeName ?? `Teacher #${item.id ?? item.ID}`,
      })),
    [employeeOptions],
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

  const selectedTeacher = useMemo(
    () => employeeSelectOptions.find((option) => option.value === employeeId) || null,
    [employeeId, employeeSelectOptions],
  )

  const selectedExamType = useMemo(
    () => examTypeSelectOptions.find((option) => option.value === examTypeId) || null,
    [examTypeId, examTypeSelectOptions],
  )

  const loadReport = async () => {
    const parsedSectionId = Number(sectionId)
    const parsedEmployeeId = Number(employeeId)
    const parsedExamTypeId = Number(examTypeId)

    if (!parsedSectionId || !parsedEmployeeId || !parsedExamTypeId) {
      setError('Select a class, teacher, and exam type.')
      setReport(null)
      return
    }

    setIsLoading(true)
    setError('')
    setHasLoaded(true)

    try {
      const data = await getTeacherExamAnalysis({
        sectionId: parsedSectionId,
        employeeId: parsedEmployeeId,
        examTypeId: parsedExamTypeId,
      })
      setReport(data)
    } catch (requestError) {
      setReport(null)
      if (requestError?.response?.status === 404) {
        setError('No report found for this class, teacher, and exam type.')
      } else {
        setError('Unable to load analysis report. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    loadReport()
  }

  const onPrint = () => {
    window.print()
  }

  const printedAt = new Date().toLocaleString()

  return (
    <CampusShell
      headerContext="Exam analysis"
      rootClassName="print-root"
      rowClassName="print-main flex min-h-screen w-full"
      asideClassName="no-print"
      headerClassName="no-print"
    >
      <style>{PRINT_STYLES}</style>
      <div className="print-content mx-auto w-full max-w-6xl px-4 pb-10 pt-[4.25rem] lg:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={onSubmit} className="no-print p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--campus-primary)] text-white shadow-md">
                <FileBarChart2 size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Teacher exam analysis</h1>
                <p className="text-sm text-slate-500">
                  Subject-wise percentages with top and low scores for the selected class teacher load.
                </p>
              </div>
            </div>
            {report ? (
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

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Class</span>
              <Select
                inputId="teacher-analysis-class"
                isLoading={isMetaLoading}
                isClearable
                options={classSelectOptions}
                value={selectedClass}
                onChange={(option) => setSectionId(option?.value || '')}
                placeholder="Select class..."
                styles={selectStyles}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <UserRound size={15} className="text-indigo-600" />
                Teacher
              </span>
              <Select
                inputId="teacher-analysis-teacher"
                isLoading={isMetaLoading}
                isClearable
                options={employeeSelectOptions}
                value={selectedTeacher}
                onChange={(option) => setEmployeeId(option?.value || '')}
                placeholder="Select teacher..."
                styles={selectStyles}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Exam type</span>
              <Select
                inputId="teacher-analysis-exam-type"
                isLoading={isMetaLoading}
                isClearable
                options={examTypeSelectOptions}
                value={selectedExamType}
                onChange={(option) => setExamTypeId(option?.value || '')}
                placeholder="Select exam type..."
                styles={selectStyles}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading || isMetaLoading}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#344574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Load report
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              Loading analysis...
            </div>
          </div>
        ) : null}

        {!isLoading && report ? (
          <div className="print-card overflow-hidden border-t border-slate-200 bg-white">
            <div className="print-header-shell hidden border-b border-slate-200 bg-slate-50 px-5 py-4 print:block">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-start gap-3">
                    <img src={logoSrc} alt="" className="h-10 w-10 object-contain" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{schoolName}</h2>
                      <p className="text-sm text-slate-600">{campusLabel}</p>
                      {sessionLabel ? (
                        <p className="text-sm text-slate-600">Session: {sessionLabel}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="print-header-meta text-right">
                  <p className="mb-3 text-xs text-slate-500">{printedAt}</p>
                  <div className="print-header-summary rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-900">TEACHER EXAM ANALYSIS</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-900">
                        {report.employeeName || 'Teacher'} | {report.className}
                      </span>
                    </div>
                    <div className="text-slate-900">
                      {report.examTypeName || 'Exam analysis'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="print-table min-w-full text-[13px] leading-snug">
                <thead>
                  <tr className="bg-indigo-50 text-left text-slate-700">
                    <th className="px-3 py-2 font-semibold">Subject</th>
                    <th className="px-3 py-2 text-center font-semibold">Percentage</th>
                    <th className="px-3 py-2 font-semibold">Max</th>
                    <th className="px-3 py-2 font-semibold">Min</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report.subjects || []).map((subject) => (
                    <tr key={subject.subjectId} className="hover:bg-slate-50/70">
                      <td className="px-3 py-1.5 text-slate-900">
                        {subject.subjectName}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <ScoreChip value={subject.percentage} suffix="%" center />
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">
                        <ExtremumCell item={subject.max} />
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">
                        <ExtremumCell item={subject.min} />
                      </td>
                    </tr>
                  ))}
                  {report.subjects?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        No assigned subjects found for this teacher in the selected class.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!isLoading && hasLoaded && !report && !error ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No report to display.
          </div>
        ) : null}
        </div>
      </div>
    </CampusShell>
  )
}

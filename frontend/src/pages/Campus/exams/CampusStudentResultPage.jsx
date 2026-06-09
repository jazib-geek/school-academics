import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Loader2,
  Medal,
  Percent,
  Search,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import AsyncSelect from 'react-select/async'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getExamTypes, getStudentExamResult } from '../../../services/examService'
import { mapStudentToSelectOption, searchStudents } from '../../../services/studentService'

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

function debouncePromise(fn, waitMs) {
  let timeoutId
  return (...args) =>
    new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fn(...args).then(resolve).catch(() => resolve([]))
      }, waitMs)
    })
}

function gradeTone(grade) {
  if (!grade || grade === '-') return 'bg-slate-100 text-slate-600 ring-slate-200'
  if (grade.startsWith('A')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (grade === 'B') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (grade === 'C') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (grade === 'D') return 'bg-orange-50 text-orange-700 ring-orange-200'
  return 'bg-rose-50 text-rose-700 ring-rose-200'
}

function formatObtainedMarks(value) {
  if (value === -1) return 'Absent'
  return String(value ?? 0)
}

function obtainedCellClass(value, passing, total) {
  if (value === -1) return 'text-amber-700 font-medium'
  if (total > 0 && value < passing) return 'text-rose-700 font-semibold'
  return 'text-slate-800'
}

function SummaryCard({ icon: Icon, label, value, hint, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-indigo-100 bg-indigo-50/70 text-indigo-700',
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-700',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.indigo}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
        <Icon size={15} />
        {label}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  )
}

export default function CampusStudentResultPage() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [examTypeId, setExamTypeId] = useState('')
  const [examTypes, setExamTypes] = useState([])
  const [result, setResult] = useState(null)
  const [isTypesLoading, setIsTypesLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []

      const items = await searchStudents(term, 20)
      return items.map(mapStudentToSelectOption)
    }, 300),
  ).current

  useEffect(() => {
    let cancelled = false

    const loadTypes = async () => {
      setIsTypesLoading(true)
      try {
        const data = await getExamTypes()
        if (!cancelled) {
          setExamTypes(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load exam types.')
        }
      } finally {
        if (!cancelled) setIsTypesLoading(false)
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [])

  const examTypeOptions = useMemo(
    () =>
      examTypes.map((item) => ({
        value: String(item.id),
        label: item.name || `Exam #${item.id}`,
      })),
    [examTypes],
  )

  const selectedExamType = useMemo(
    () => examTypeOptions.find((option) => option.value === examTypeId) || null,
    [examTypeOptions, examTypeId],
  )

  const loadResult = useCallback(async () => {
    const parsedStudentId = Number(selectedStudent?.value)
    const parsedExamTypeId = Number(examTypeId)

    if (!parsedStudentId || !parsedExamTypeId) {
      setError('Select a student and exam type.')
      setResult(null)
      return
    }

    setIsLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const data = await getStudentExamResult(parsedStudentId, parsedExamTypeId)
      setResult(data)
    } catch (requestError) {
      setResult(null)
      const status = requestError?.response?.status
      if (status === 404) {
        setError('No result found for this student and exam type.')
      } else {
        setError('Unable to load exam result. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [examTypeId, selectedStudent])

  const onSubmit = (event) => {
    event.preventDefault()
    loadResult()
  }

  return (
    <CampusShell headerContext="Exam result">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-20 lg:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#405189] text-white shadow-md">
              <BookOpenCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Student result card</h1>
              <p className="text-sm text-slate-500">
                Look up marks, grade, and class position for a single exam.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <UserRound size={15} className="text-indigo-600" />
                Student
              </span>
              <AsyncSelect
                inputId="exam-result-student"
                cacheOptions
                defaultOptions={false}
                loadOptions={loadStudentOptions}
                value={selectedStudent}
                onChange={(option) => setSelectedStudent(option)}
                placeholder="Search by name or reg no…"
                noOptionsMessage={({ inputValue }) =>
                  inputValue.trim().length < 2
                    ? 'Type at least 2 characters'
                    : 'No students found'
                }
                loadingMessage={() => 'Searching…'}
                isClearable
                styles={selectStyles}
                classNamePrefix="exam-student"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <GraduationCap size={15} className="text-indigo-600" />
                Exam type
              </span>
              <Select
                inputId="exam-type-select"
                isLoading={isTypesLoading}
                isClearable
                options={examTypeOptions}
                value={selectedExamType}
                onChange={(option) => setExamTypeId(option?.value || '')}
                placeholder="Select exam type…"
                styles={selectStyles}
                classNamePrefix="exam-type"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading || isTypesLoading}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#405189] px-5 text-sm font-semibold text-white transition hover:bg-[#344574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              View result
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              Loading result…
            </div>
          </div>
        ) : null}

        {!isLoading && result ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {result.examTypeName || 'Exam result'}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {result.studentName || 'Student'}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound size={14} className="text-slate-400" />
                        Reg #{result.studentId}
                      </span>
                      {result.fatherName ? (
                        <span>Father: {result.fatherName}</span>
                      ) : null}
                      {result.className ? (
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap size={14} className="text-slate-400" />
                          {result.className}
                        </span>
                      ) : null}
                      {result.attendanceRatio ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-slate-400" />
                          Attendance {result.attendanceRatio}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset ${gradeTone(result.grade)}`}
                    >
                      <Award size={15} />
                      {result.grade || '-'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                      <Trophy size={15} />
                      {result.positionDisplay || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon={Medal}
                  label="Total obtained"
                  value={`${result.totalObtained ?? 0} / ${result.totalMarks ?? 0}`}
                  hint="Excludes Drawing & Stemp from total"
                  tone="indigo"
                />
                <SummaryCard
                  icon={Percent}
                  label="Percentage"
                  value={`${result.percentage ?? 0}%`}
                  tone="emerald"
                />
                <SummaryCard
                  icon={Sparkles}
                  label="Remarks"
                  value={result.remarks || '-'}
                  tone="amber"
                />
                <SummaryCard
                  icon={Trophy}
                  label="Class position"
                  value={result.positionDisplay || '-'}
                  hint={result.position > 0 ? `Rank ${result.position} in class` : 'Not ranked'}
                  tone="violet"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Subject marks</h3>
                <p className="text-sm text-slate-500">
                  Numeric marks per subject. Drawing and Stemp show letter grades and are excluded from the overall total.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 text-center font-semibold">Obtained</th>
                      <th className="px-4 py-3 text-center font-semibold">Total</th>
                      <th className="px-4 py-3 text-center font-semibold">Passing</th>
                      <th className="px-4 py-3 text-center font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(result.subjects || []).map((row) => {
                      const isGradeRow = row.usesGradeDisplay

                      return (
                        <tr key={row.subjectId} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3 font-medium text-slate-800">{row.subjectName}</td>
                          <td className="px-4 py-3 text-center">
                            {isGradeRow ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${gradeTone(row.subjectGrade)}`}
                              >
                                {row.subjectGrade || '-'}
                              </span>
                            ) : (
                              <span
                                className={obtainedCellClass(
                                  row.obtainedMarks,
                                  row.passingMarks,
                                  row.totalMarks,
                                )}
                              >
                                {formatObtainedMarks(row.obtainedMarks)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700">
                            {isGradeRow ? '—' : row.totalMarks}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {isGradeRow ? '—' : row.passingMarks}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {isGradeRow || row.obtainedMarks === -1
                              ? '—'
                              : `${row.percentage ?? 0}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/60 font-semibold text-slate-900">
                      <td className="px-5 py-3">Overall</td>
                      <td className="px-4 py-3 text-center">{result.totalObtained}</td>
                      <td className="px-4 py-3 text-center">{result.totalMarks}</td>
                      <td className="px-4 py-3 text-center">—</td>
                      <td className="px-4 py-3 text-center">{result.percentage}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {!isLoading && hasSearched && !result && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No result to display.
          </div>
        ) : null}
      </div>
    </CampusShell>
  )
}

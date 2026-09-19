import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Loader2, Printer, Search, UserRound, X } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getCampusLabel, SCHOOL_LOGO_PATH, SCHOOL_NAME } from '../../../constants/branding'
import { getTeacherPerformanceGrid } from '../../../services/examService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const PRINT_STYLES = `
  @page { size: A4 landscape; margin: 10mm; }
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
      font-weight: 400 !important;
    }
    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
    }
    .print-table th, .print-table td {
      border: 1px solid #000 !important;
      padding: 6px 8px !important;
      vertical-align: middle !important;
    }
    .print-table thead th, .print-table tbody th {
      background: #fff !important;
      font-weight: 700 !important;
    }
    .print-header-shell {
      display: flex !important;
      border-bottom: 1px solid #000 !important;
      background: #fff !important;
    }
    .print-sticky {
      position: static !important;
    }
  }
`

const getId = (item) => Number(item?.id ?? item?.ID ?? 0)
const getEmployeeName = (item) => item?.employeeName ?? item?.EmployeeName ?? ''

function getScoreTone(value) {
  if (value == null) return 'bg-slate-50 text-slate-400 ring-slate-200'
  if (value >= 80) return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (value >= 60) return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-rose-50 text-rose-800 ring-rose-200'
}

function PercentageCell({ value }) {
  if (value == null) return <span className="text-slate-300">-</span>

  return (
    <span className={`print-chip inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${getScoreTone(value)}`}>
      {value}%
    </span>
  )
}

function TeacherPickerModal({ open, employees, selectedEmployeeId, isLoading, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filteredEmployees = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return employees

    return employees.filter((employee) => {
      const id = getId(employee)
      const name = getEmployeeName(employee)
      return `${id} ${name}`.toLowerCase().includes(needle)
    })
  }, [employees, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select teacher</h2>
            <p className="text-sm text-slate-500">Choose a teacher to load the performance grid.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close teacher picker"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="filterTeacherPerformanceSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teacher by name or ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[var(--campus-primary)] focus:ring-4 focus:ring-[#405189]/10"
              autoFocus
              {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
              Loading teachers...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No teachers found.</div>
          ) : (
            <table className="min-w-full text-[13px] leading-snug">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Teacher</th>
                  <th className="w-28 px-3 py-2 text-right font-semibold">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => {
                  const id = getId(employee)
                  const name = getEmployeeName(employee) || `Teacher #${id}`
                  const selected = Number(selectedEmployeeId) === id

                  return (
                    <tr
                      key={id}
                      className={`cursor-pointer transition ${
                        selected ? 'bg-indigo-50 text-[var(--campus-primary)]' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => onSelect(employee)}
                    >
                      <td className="px-3 py-1.5">
                        <button type="button" className="text-left font-semibold">
                          {name}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{id}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CampusTeacherPerformanceGridPage() {
  const campusCode = localStorage.getItem('campus') || ''
  const campusLabel = getCampusLabel(campusCode)
  const [employeeId, setEmployeeId] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [grid, setGrid] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const employees = await getTeacherAssignmentEmployees()
        if (!cancelled) {
          setEmployeeOptions(Array.isArray(employees) ? employees : [])
        }
      } catch {
        if (!cancelled) setError('Unable to load teachers.')
      } finally {
        if (!cancelled) setIsMetaLoading(false)
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedTeacher = useMemo(
    () => employeeOptions.find((item) => getId(item) === Number(employeeId)) || null,
    [employeeId, employeeOptions],
  )

  const loadGrid = async (nextEmployeeId = employeeId) => {
    const parsedEmployeeId = Number(nextEmployeeId)

    if (!parsedEmployeeId) {
      setError('Select a teacher.')
      setGrid(null)
      return
    }

    setIsLoading(true)
    setError('')
    setHasLoaded(true)

    try {
      const data = await getTeacherPerformanceGrid({ employeeId: parsedEmployeeId })
      setGrid(data)
    } catch (requestError) {
      setGrid(null)
      if (requestError?.response?.status === 404) {
        setError('No performance grid found for this teacher.')
      } else {
        setError('Unable to load performance grid. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onTeacherSelect = (employee) => {
    const nextEmployeeId = getId(employee)
    setEmployeeId(String(nextEmployeeId))
    setIsTeacherPickerOpen(false)
    loadGrid(nextEmployeeId)
  }

  const onPrint = () => {
    window.print()
  }

  const printedAt = new Date().toLocaleString()

  const cellLookupByExamType = useMemo(() => {
    const lookup = new Map()

    ;(grid?.rows || []).forEach((row) => {
      lookup.set(
        row.examTypeId,
        new Map((row.cells || []).map((cell) => [cell.columnKey, cell.percentage])),
      )
    })

    return lookup
  }, [grid])

  const visibleExamRows = useMemo(
    () =>
      (grid?.rows || []).filter((row) =>
        (row.cells || []).some((cell) => cell.percentage != null),
      ),
    [grid],
  )

  const visibleColumns = useMemo(
    () =>
      (grid?.columns || []).filter((column) =>
        (grid?.rows || []).some((row) =>
          (row.cells || []).some((cell) => cell.columnKey === column.key && cell.percentage != null),
        ),
      ),
    [grid],
  )

  return (
    <CampusShell
      headerContext="Teacher performance grid"
      rootClassName="print-root"
      rowClassName="print-main flex min-h-screen w-full"
      asideClassName="no-print"
      headerClassName="no-print"
    >
      <style>{PRINT_STYLES}</style>
      <div className="print-content mx-auto w-full max-w-7xl px-4 pb-10 pt-[4.25rem] lg:px-6">
        <div className="print-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="no-print border-b border-slate-200 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--campus-primary)] text-white shadow-md">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Teacher performance grid</h1>
                  <p className="text-sm text-slate-500">
                    Exam-wise subject percentages across every assigned class and subject.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {grid ? (
                  <button
                    type="button"
                    onClick={onPrint}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsTeacherPickerOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[#344574]"
                >
                  <UserRound size={16} />
                  {selectedTeacher ? 'Switch teacher' : 'Select teacher'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Teacher:</span>{' '}
              <span className="font-semibold text-slate-900">
                {selectedTeacher ? getEmployeeName(selectedTeacher) : 'No teacher selected'}
              </span>
            </div>
          </div>

          {grid ? (
            <div className="print-header-shell hidden items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 print:flex">
              <div className="flex items-start gap-3">
                <img src={SCHOOL_LOGO_PATH} alt="" className="h-10 w-10 object-contain" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{SCHOOL_NAME}</h2>
                  <p className="text-sm text-slate-600">{campusLabel}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="mb-3 text-xs text-slate-500">{printedAt}</p>
                <p className="font-semibold text-slate-900">TEACHER PERFORMANCE </p>
                <p className="text-slate-900">{grid.employeeName || getEmployeeName(selectedTeacher)}</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
                Loading performance grid...
              </div>
            </div>
          ) : null}

          {!isLoading && grid ? (
            <div className="overflow-x-auto">
              <table className="print-table min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-indigo-50 text-slate-700">
                    <th className="print-sticky sticky left-0 z-20 min-w-36 border-b border-r border-slate-200 bg-indigo-50 px-3 py-2 text-left font-semibold">
                      Subject
                    </th>
                    {visibleExamRows.map((row) => (
                      <th
                        key={row.examTypeId}
                        className="min-w-32 border-b border-r border-slate-200 px-4 py-3 text-center font-semibold"
                      >
                        {row.examTypeName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleColumns.map((column) => (
                    <tr key={column.key} className="hover:bg-slate-50/70">
                      <th className="print-sticky sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-4 text-left font-semibold text-slate-900">
                        <span className="block">{column.subjectName}</span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">{column.className}</span>
                      </th>
                      {visibleExamRows.map((row) => {
                        const rowLookup = cellLookupByExamType.get(row.examTypeId) || new Map()

                        return (
                          <td
                            key={`${column.key}-${row.examTypeId}`}
                            className="border-b border-r border-slate-100 px-4 py-4 text-center"
                          >
                            <PercentageCell value={rowLookup.get(column.key)} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {visibleExamRows.length === 0 || visibleColumns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleExamRows.length + 1}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No scored subjects or exam types found for this teacher.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {!isLoading && hasLoaded && !grid && !error ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
            No grid to display.
          </div>
        ) : null}
        </div>
      </div>
      <TeacherPickerModal
        open={isTeacherPickerOpen}
        employees={employeeOptions}
        selectedEmployeeId={employeeId}
        isLoading={isMetaLoading}
        onSelect={onTeacherSelect}
        onClose={() => setIsTeacherPickerOpen(false)}
      />
    </CampusShell>
  )
}

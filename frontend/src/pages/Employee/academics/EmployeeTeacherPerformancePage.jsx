import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search, UserRound, X } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { getTeacherPerformanceGrid } from '../../../services/examService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import { getId, getText } from './employeeAcademicsUtils'

function scoreTone(value) {
  if (value == null) return 'bg-slate-50 text-slate-400'
  if (value >= 80) return 'bg-emerald-50 text-emerald-800'
  if (value >= 60) return 'bg-amber-50 text-amber-800'
  return 'bg-rose-50 text-rose-800'
}

function TeacherPicker({ open, employees, selectedEmployeeId, isLoading, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return employees
    return employees.filter((employee) =>
      getText(employee, 'employeeName', 'EmployeeName').toLowerCase().includes(needle),
    )
  }, [employees, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-base font-bold text-slate-900">Select teacher</p>
          <p className="text-xs text-slate-500">Choose who to load</p>
        </div>
        <button type="button" onClick={onClose} className="emp-icon-btn" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="border-b border-slate-100 bg-white p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            autoFocus
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No teachers found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((employee) => {
              const id = getId(employee, 'id', 'ID')
              const name = getText(employee, 'employeeName', 'EmployeeName') || 'Teacher'
              const selected = Number(selectedEmployeeId) === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(employee)}
                  className={`emp-surface flex min-h-14 w-full items-center rounded-2xl px-4 py-3 text-left font-semibold ${
                    selected ? 'text-indigo-800 ring-2 ring-indigo-200' : 'text-slate-800'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeeTeacherPerformancePage() {
  const [employeeId, setEmployeeId] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [grid, setGrid] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const employees = await getTeacherAssignmentEmployees()
        if (!cancelled) setEmployeeOptions(Array.isArray(employees) ? employees : [])
      } catch {
        if (!cancelled) toast.error('Unable to load teachers.')
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
    () => employeeOptions.find((item) => getId(item, 'id', 'ID') === Number(employeeId)) || null,
    [employeeId, employeeOptions],
  )

  const loadGrid = async (nextEmployeeId = employeeId) => {
    const parsed = Number(nextEmployeeId)
    if (!parsed) {
      toast.error('Select a teacher.')
      return
    }
    setIsLoading(true)
    try {
      setGrid(await getTeacherPerformanceGrid({ employeeId: parsed }))
    } catch (error) {
      setGrid(null)
      if (error?.response?.status === 404) {
        toast.error('No performance data for this teacher.')
      } else {
        toast.error('Unable to load performance grid.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onTeacherSelect = (employee) => {
    const nextId = getId(employee, 'id', 'ID')
    setEmployeeId(String(nextId))
    setPickerOpen(false)
    loadGrid(nextId)
  }

  const cellLookupByExamType = useMemo(() => {
    const lookup = new Map()
    ;(grid?.rows || []).forEach((row) => {
      lookup.set(row.examTypeId, new Map((row.cells || []).map((cell) => [cell.columnKey, cell.percentage])))
    })
    return lookup
  }, [grid])

  const visibleExamRows = useMemo(
    () => (grid?.rows || []).filter((row) => (row.cells || []).some((cell) => cell.percentage != null)),
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
    <EmployeeLayout
      title="Teacher performance"
      subtitle="Exam percentages across classes"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="emp-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Teacher</p>
            <p className="truncate font-semibold text-slate-900">
              {selectedTeacher
                ? getText(selectedTeacher, 'employeeName', 'EmployeeName')
                : 'No teacher selected'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="emp-cta-btn emp-cta-btn-primary h-11 shrink-0 px-4"
          >
            <UserRound size={16} />
            {selectedTeacher ? 'Switch' : 'Select'}
          </button>
        </div>

        {isLoading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading…
          </div>
        ) : null}

        {!isLoading && grid ? (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-max border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr className="bg-indigo-50 text-slate-700">
                    <th className="sticky left-0 z-20 min-w-32 border-b border-r border-slate-200 bg-indigo-50 px-3 py-2 text-left font-semibold">
                      Subject
                    </th>
                    {visibleExamRows.map((row) => (
                      <th
                        key={row.examTypeId}
                        className="min-w-28 border-b border-r border-slate-200 px-3 py-2 text-center font-semibold"
                      >
                        {row.examTypeName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleColumns.map((column) => (
                    <tr key={column.key}>
                      <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-3 text-left font-semibold text-slate-900">
                        <span className="block">{column.subjectName}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                          {column.className}
                        </span>
                      </th>
                      {visibleExamRows.map((row) => {
                        const value = (cellLookupByExamType.get(row.examTypeId) || new Map()).get(column.key)
                        return (
                          <td
                            key={`${column.key}-${row.examTypeId}`}
                            className="border-b border-r border-slate-100 px-3 py-3 text-center"
                          >
                            {value == null ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(value)}`}>
                                {value}%
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {visibleExamRows.length === 0 || visibleColumns.length === 0 ? (
                    <tr>
                      <td colSpan={visibleExamRows.length + 1} className="px-4 py-12 text-center text-slate-500">
                        No scored subjects found for this teacher.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <TeacherPicker
        open={pickerOpen}
        employees={employeeOptions}
        selectedEmployeeId={employeeId}
        isLoading={isMetaLoading}
        onSelect={onTeacherSelect}
        onClose={() => setPickerOpen(false)}
      />
    </EmployeeLayout>
  )
}

export default EmployeeTeacherPerformancePage

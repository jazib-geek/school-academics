import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getClasses } from '../../services/classService'
import { getAttendanceReport } from '../../services/attendanceService'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'P', label: 'Present (P)' },
  { value: 'A', label: 'Absent (A)' },
  { value: 'H', label: 'Holiday (H)' },
]

const normalizeClassName = (className) => {
  const parts = (className || '')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    parts.splice(1, 1)
  }

  return parts.join(' - ') || '-'
}

const getPakistanToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function EmployeeAttendanceReportPage() {
  const today = getPakistanToday()
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [classId, setClassId] = useState('')
  const [status, setStatus] = useState('')
  const [classes, setClasses] = useState([])
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadClasses = async () => {
      setIsLoadingClasses(true)
      try {
        const result = await getClasses()
        setClasses(result)
      } catch {
        setClasses([])
      } finally {
        setIsLoadingClasses(false)
      }
    }

    loadClasses()
  }, [])

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: String(item.id), label: item.className })),
    [classes],
  )

  const selectedClass = useMemo(
    () => classOptions.find((option) => option.value === classId) || null,
    [classId, classOptions],
  )

  const selectedStatus = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0],
    [status],
  )

  const loadReport = async () => {
    if (!dateFrom || !dateTo) return

    setIsLoading(true)
    setError('')
    try {
      const data = await getAttendanceReport({
        dateFrom,
        dateTo,
        classSectionCompositeId: classId ? Number(classId) : undefined,
        status,
      })
      setReport(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load attendance report.')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  return (
    <EmployeeLayout
      title="Attendance Report"
      subtitle="Filter and review attendance records"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <section className="emp-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Date From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            Date To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            Class
            <div className="mt-1">
              <Select
                isClearable
                isSearchable
                isLoading={isLoadingClasses}
                options={classOptions}
                value={selectedClass}
                placeholder="All classes"
                onChange={(option) => setClassId(option?.value || '')}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderRadius: '0.75rem',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                  }),
                  menu: (base) => ({ ...base, zIndex: 70 }),
                }}
              />
            </div>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Status
            <div className="mt-1">
              <Select
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(option) => setStatus(option?.value || '')}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderRadius: '0.75rem',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                  }),
                  menu: (base) => ({ ...base, zIndex: 70 }),
                }}
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button type="button" onClick={loadReport} disabled={isLoading} className="emp-cta-btn emp-cta-btn-primary">
            {isLoading ? <span className="emp-loader emp-loader-sm" /> : null}
            Apply Filters
          </button>
        </div>
      </section>

      {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</section> : null}

      {report ? (
        <section className="emp-surface rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-xs text-indigo-600">Total Records</p>
              <p className="font-semibold text-indigo-900">{report.totalRecords}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-600">Present</p>
              <p className="font-semibold text-emerald-900">{report.presentCount}</p>
            </div>
            <div className="rounded-xl bg-rose-50 px-3 py-2">
              <p className="text-xs text-rose-600">Absent</p>
              <p className="font-semibold text-rose-900">{report.absentCount}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">Holiday</p>
              <p className="font-semibold text-amber-900">{report.holidayCount}</p>
            </div>
            <div className="rounded-xl bg-cyan-50 px-3 py-2">
              <p className="text-xs text-cyan-700">Classes</p>
              <p className="font-semibold text-cyan-900">{report.classCount}</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2">
              <p className="text-xs text-violet-700">Students</p>
              <p className="font-semibold text-violet-900">{report.studentCount}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="emp-attendance-table w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="emp-attendance-header text-xs uppercase tracking-wide">
                  <th className="rounded-l-xl px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Class</th>
                  <th className="rounded-r-xl px-3 py-2.5">Student</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, index) => (
                  <tr key={`${item.studentId}-${item.date}-${index}`} className="emp-table-row">
                    <td className="px-3 py-2.5 text-slate-700">{item.date?.slice(0, 10)}</td>
                    <td className="px-3 py-2.5 text-slate-900">{normalizeClassName(item.className)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-slate-900 ${
                          item.status === 'P'
                            ? 'bg-emerald-50'
                            : item.status === 'A'
                              ? 'bg-rose-50'
                              : 'bg-amber-50'
                        }`}
                      >
                        {item.studentName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeAttendanceReportPage

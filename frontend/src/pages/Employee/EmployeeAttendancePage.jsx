import { useEffect, useMemo, useState } from 'react'
import { EmployeeSelect as Select } from '../../components/employee/EmployeeSelect'
import { toast } from 'sonner'
import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getClasses } from '../../services/classService'
import {
  getClassAttendanceSheet,
  getSchoolAttendanceSheet,
  setClassAttendanceStatusForAll,
  setSchoolAttendancePresentForAll,
  setStudentAttendanceStatus,
} from '../../services/attendanceService'

const ROW_STATUS_OPTIONS = ['P', 'A', 'Lt', 'Lv', 'H']
const BULK_STATUS_OPTIONS = ['P', 'A', 'H']

/** Select value for whole-school attendance sheet (not a real section id). */
const ALL_CLASSES_VALUE = '__all__'

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

function EmployeeAttendancePage() {
  const [date, setDate] = useState(getPakistanToday)
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [sheet, setSheet] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState('')
  const [schoolPresentSaving, setSchoolPresentSaving] = useState(false)
  const [confirmBulkStatus, setConfirmBulkStatus] = useState('')
  const [confirmSchoolPresent, setConfirmSchoolPresent] = useState(false)
  const [studentUpdatingId, setStudentUpdatingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true)
      try {
        const result = await getClasses()
        setClasses(result)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load classes.')
      } finally {
        setLoadingClasses(false)
      }
    }

    loadClasses()
  }, [])

  useEffect(() => {
    if (!date || !classId) {
      setSheet(null)
      return
    }

    const loadSheet = async () => {
      setLoadingSheet(true)
      setError('')
      try {
        const result =
          classId === ALL_CLASSES_VALUE
            ? await getSchoolAttendanceSheet({ date })
            : await getClassAttendanceSheet({
                date,
                classSectionCompositeId: Number(classId),
              })
        setSheet(result)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load attendance sheet.')
      } finally {
        setLoadingSheet(false)
      }
    }

    loadSheet()
  }, [date, classId])

  const isWholeSchoolSheet = Boolean(sheet && Number(sheet.classSectionCompositeId) === 0)

  const filteredStudents = useMemo(() => {
    const students = sheet?.students || []
    if (!searchText.trim()) {
      return students
    }

    const keyword = searchText.trim().toLowerCase()
    return students.filter((student) => {
      const name = (student.studentName || '').toLowerCase()
      const cls = (student.classNameForStudent || '').toLowerCase()
      return name.includes(keyword) || cls.includes(keyword)
    })
  }, [sheet, searchText])

  const classOptions = useMemo(() => {
    const fromApi = classes.map((item) => ({ value: String(item.id), label: item.className }))
    return [{ value: ALL_CLASSES_VALUE, label: 'All classes (whole school)' }, ...fromApi]
  }, [classes])

  const selectedClassOption = useMemo(
    () => classOptions.find((option) => option.value === classId) || null,
    [classId, classOptions],
  )

  const resolveClassCompositeIdForStudent = (student) => {
    if (isWholeSchoolSheet) {
      const v = student.classSectionCompositeIdForStudent
      return typeof v === 'number' ? v : Number(v)
    }
    return Number(classId)
  }

  const runSetAll = async (status) => {
    if (!date || !classId || classId === ALL_CLASSES_VALUE) return

    const toastId = `emp-att-bulk-${status}`
    toast.loading(`Marking all as ${status}…`, { id: toastId })
    setBulkUpdatingStatus(status)
    setError('')
    try {
      const updated = await setClassAttendanceStatusForAll({
        date,
        classSectionCompositeId: Number(classId),
        status,
      })
      setSheet(updated)
      toast.success('Attendance saved for the whole class.', { id: toastId })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to update attendance.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setBulkUpdatingStatus('')
    }
  }

  const runSchoolPresentAll = async () => {
    if (!date || classId !== ALL_CLASSES_VALUE) return

    const toastId = 'emp-att-school-present'
    toast.loading('Marking whole school present…', { id: toastId })
    setSchoolPresentSaving(true)
    setError('')
    try {
      const updated = await setSchoolAttendancePresentForAll({ date })
      setSheet(updated)
      toast.success('Whole school marked present for this date.', { id: toastId })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to update attendance.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setSchoolPresentSaving(false)
      setConfirmSchoolPresent(false)
    }
  }

  const onSetAll = (status) => {
    if (!date || !classId || classId === ALL_CLASSES_VALUE) return
    setConfirmBulkStatus(status)
  }

  const onConfirmSetAll = async () => {
    if (!confirmBulkStatus) return
    const status = confirmBulkStatus
    setConfirmBulkStatus('')
    await runSetAll(status)
  }

  const getStatusLabel = (status) => {
    if (status === 'P') return 'Present (P)'
    if (status === 'A') return 'Absent (A)'
    if (status === 'Lt') return 'Late (Lt)'
    if (status === 'Lv') return 'Leave (Lv)'
    return 'Holiday (H)'
  }

  const getSheetTitle = () => {
    if (isWholeSchoolSheet) {
      return (sheet?.className || 'All classes').trim() || 'All classes'
    }
    const rawClassName = (sheet?.className || '').trim()
    if (!rawClassName) return '-'

    const segments = rawClassName.split(' - ').map((segment) => segment.trim()).filter(Boolean)
    if (segments.length >= 2 && segments[0].toLowerCase() === segments[1].toLowerCase()) {
      segments.splice(1, 1)
    }

    return segments.join(' - ')
  }

  const onSetStudentStatus = async (student, status) => {
    if (!date || !classId) return

    const classSectionCompositeId = resolveClassCompositeIdForStudent(student)
    if (!classSectionCompositeId || Number.isNaN(classSectionCompositeId)) {
      toast.error('Missing class for this student; cannot save.')
      return
    }

    const sid = student.studentId
    const toastId = `emp-att-student-${sid}`
    toast.loading('Saving attendance…', { id: toastId })
    setStudentUpdatingId(String(sid))
    setError('')
    try {
      if (classId === ALL_CLASSES_VALUE) {
        await setStudentAttendanceStatus({
          date,
          classSectionCompositeId,
          studentId: sid,
          status,
        })
        setSheet(await getSchoolAttendanceSheet({ date }))
      } else {
        const updated = await setStudentAttendanceStatus({
          date,
          classSectionCompositeId,
          studentId: sid,
          status,
        })
        setSheet(updated)
      }
      toast.success('Attendance saved.', { id: toastId })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to update student attendance.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setStudentUpdatingId('')
    }
  }

  const savingBusy = Boolean(studentUpdatingId) || Boolean(bulkUpdatingStatus) || schoolPresentSaving

  return (
    <EmployeeLayout
      title="Mark Student Attendance"
      subtitle="Take register for your classes"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <EmployeeBackButton />

      <section className="emp-surface rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-900">Select class and date</h2>
        <p className="mt-1 text-xs text-slate-500">
          Pick <span className="font-medium text-slate-700">All classes (whole school)</span> to view every
          active student, or choose one class for class-only tools.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            Class
            <div className="relative mt-1 text-sm">
              <Select
                isClearable
                isSearchable
                isLoading={loadingClasses}
                options={classOptions}
                value={selectedClassOption}
                placeholder="Search class…"
                onChange={(option) => setClassId(option?.value || '')}
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderRadius: '0.75rem',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 70,
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                  }),
                }}
              />
              {loadingClasses ? <span className="emp-loader absolute right-3 top-1/2 -translate-y-1/2" /> : null}
            </div>
          </label>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      {sheet ? (
        <section className="emp-surface rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {getSheetTitle()} – {sheet.date?.slice(0, 10)}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {isWholeSchoolSheet ? (
                <button
                  type="button"
                  onClick={() => setConfirmSchoolPresent(true)}
                  disabled={savingBusy || loadingSheet}
                  className="emp-cta-btn emp-cta-btn-success"
                >
                  Mark whole school present
                </button>
              ) : (
                BULK_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onSetAll(status)}
                    disabled={savingBusy || loadingSheet}
                    className={`emp-cta-btn ${
                      status === 'P'
                        ? 'emp-cta-btn-success'
                        : status === 'A'
                          ? 'emp-cta-btn-danger'
                          : 'emp-cta-btn-warning'
                    }`}
                  >
                    {bulkUpdatingStatus === status ? <span className="emp-loader emp-loader-sm" /> : null}
                    Mark all {status}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-3">
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={
                isWholeSchoolSheet ? 'Search by student or class name' : 'Search by student name'
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="mt-4">
            <table className="emp-attendance-table w-full text-left text-sm">
              <thead>
                <tr className="emp-attendance-header text-xs uppercase tracking-wide">
                  <th className="rounded-l-xl px-2 py-2.5 sm:px-3">Reg Id</th>
                  {isWholeSchoolSheet ? <th className="px-2 py-2.5 sm:px-3">Class</th> : null}
                  <th className="px-2 py-2.5 sm:px-3">Student Name</th>
                  <th className="emp-attendance-status-cell rounded-r-xl px-2 py-2.5 sm:px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={`${student.studentId}-${student.classSectionCompositeIdForStudent ?? classId}`} className="emp-table-row align-middle">
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-700 sm:px-3">{student.studentId}</td>
                    {isWholeSchoolSheet ? (
                      <td className="emp-attendance-name-cell px-2 py-2.5 text-slate-600 sm:px-3">
                        {student.classNameForStudent || '—'}
                      </td>
                    ) : null}
                    <td className="emp-attendance-name-cell px-2 py-2.5 text-slate-900 sm:px-3">
                      {student.studentName}
                    </td>
                    <td className="emp-attendance-status-cell px-2 py-2.5 sm:px-3">
                      <div className="emp-status-pills">
                        {ROW_STATUS_OPTIONS.map((status) => {
                          const isActive = student.status === status
                          const pillClass =
                            status === 'P'
                              ? 'emp-status-pill-p'
                              : status === 'A'
                                ? 'emp-status-pill-a'
                                : status === 'Lt'
                                  ? 'emp-status-pill-lt'
                                  : status === 'Lv'
                                    ? 'emp-status-pill-lv'
                                    : 'emp-status-pill-h'
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => onSetStudentStatus(student, status)}
                              disabled={savingBusy || loadingSheet}
                              className={`emp-status-pill ${pillClass} ${isActive ? '' : 'emp-status-pill-muted'}`}
                            >
                              {status}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {loadingSheet ? (
        <section className="emp-surface rounded-2xl p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="emp-loader emp-loader-lg" />
            <span>Loading attendance sheet...</span>
          </div>
        </section>
      ) : null}

      {confirmBulkStatus ? (
        <div className="emp-modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="emp-modal-card w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-900">Confirm bulk update</p>
            <p className="mt-2 text-sm text-slate-600">
              Mark all students as <span className="font-semibold">{getStatusLabel(confirmBulkStatus)}</span> for
              this selected date and class?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBulkStatus('')}
                className="emp-cta-btn border border-slate-300 bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmSetAll}
                className={`emp-cta-btn ${
                  confirmBulkStatus === 'P'
                    ? 'emp-cta-btn-success'
                    : confirmBulkStatus === 'A'
                      ? 'emp-cta-btn-danger'
                      : 'emp-cta-btn-warning'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSchoolPresent ? (
        <div className="emp-modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="emp-modal-card w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-900">Mark whole school present</p>
            <p className="mt-2 text-sm text-slate-600">
              Mark <span className="font-semibold">every active student</span> as present (
              <span className="font-semibold">P</span>) for <span className="font-semibold">{date}</span> across all
              classes? This replaces the status for each student&apos;s class row for that date.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSchoolPresent(false)}
                className="emp-cta-btn border border-slate-300 bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runSchoolPresentAll()}
                disabled={schoolPresentSaving}
                className="emp-cta-btn emp-cta-btn-success"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeAttendancePage

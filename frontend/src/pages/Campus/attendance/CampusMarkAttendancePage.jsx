import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react'
import Select from 'react-select'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getClasses } from '../../../services/classService'
import {
  getClassAttendanceSheet,
  setClassAttendanceStatusForAll,
  setSchoolAttendancePresentForAll,
  setStudentAttendanceStatus,
} from '../../../services/attendanceService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const ROW_STATUS_OPTIONS = ['P', 'A', 'Lt', 'Lv', 'H']
const BULK_STATUS_OPTIONS = ['P', 'A', 'H']

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

const statusButtonClass = (status, isActive) => {
  const base =
    'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  if (!isActive) {
    return `${base} border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600`
  }
  if (status === 'P') return `${base} border border-emerald-600 bg-emerald-600 text-white`
  if (status === 'A') return `${base} border border-rose-600 bg-rose-600 text-white`
  if (status === 'Lt') return `${base} border border-sky-600 bg-sky-600 text-white`
  if (status === 'Lv') return `${base} border border-violet-600 bg-violet-600 text-white`
  return `${base} border border-amber-500 bg-amber-500 text-white`
}

const bulkButtonClass = (status) => {
  const base =
    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50'
  if (status === 'P') return `${base} bg-emerald-600 hover:bg-emerald-700`
  if (status === 'A') return `${base} bg-rose-600 hover:bg-rose-700`
  return `${base} bg-amber-500 hover:bg-amber-600`
}

function ConfirmDialog({ open, title, description, confirmLabel, confirmClass, busy, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={confirmClass}>
            {busy ? <Loader2 size={14} className="mr-1.5 inline animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CampusMarkAttendancePage() {
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
        setClasses(result || [])
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
        const result = await getClassAttendanceSheet({
          date,
          classSectionCompositeId: Number(classId),
        })
        setSheet(result)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load attendance sheet.')
        setSheet(null)
      } finally {
        setLoadingSheet(false)
      }
    }

    loadSheet()
  }, [date, classId])

  useEffect(() => {
    if (!confirmSchoolPresent) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !schoolPresentSaving) {
        setConfirmSchoolPresent(false)
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [confirmSchoolPresent, schoolPresentSaving])

  const filteredStudents = useMemo(() => {
    const students = sheet?.students || []
    if (!searchText.trim()) return students

    const keyword = searchText.trim().toLowerCase()
    return students.filter((student) => {
      const name = (student.studentName || '').toLowerCase()
      const reg = String(student.studentId || '')
      return name.includes(keyword) || reg.includes(keyword)
    })
  }, [sheet, searchText])

  const statusCounts = useMemo(() => {
    const students = sheet?.students || []
    let present = 0
    let absent = 0
    let late = 0
    let leave = 0
    let holiday = 0
    for (const student of students) {
      const status = String(student.status || '').toUpperCase()
      if (status === 'P') present += 1
      else if (status === 'A') absent += 1
      else if (status === 'LT') late += 1
      else if (status === 'LV') leave += 1
      else if (status === 'H') holiday += 1
      else absent += 1
    }
    return { present, absent, late, leave, holiday, total: students.length }
  }, [sheet])

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: String(item.id), label: item.className })),
    [classes],
  )

  const selectedClassOption = useMemo(
    () => classOptions.find((option) => option.value === classId) || null,
    [classId, classOptions],
  )

  const getStatusLabel = (status) => {
    if (status === 'P') return 'Present (P)'
    if (status === 'A') return 'Absent (A)'
    if (status === 'Lt') return 'Late (Lt)'
    if (status === 'Lv') return 'Leave (Lv)'
    return 'Holiday (H)'
  }

  const getSheetTitle = () => {
    const rawClassName = (sheet?.className || '').trim()
    if (!rawClassName) return '—'

    const segments = rawClassName.split(' - ').map((segment) => segment.trim()).filter(Boolean)
    if (segments.length >= 2 && segments[0].toLowerCase() === segments[1].toLowerCase()) {
      segments.splice(1, 1)
    }

    return segments.join(' - ')
  }

  const reloadCurrentClassSheet = async () => {
    if (!date || !classId) return null
    const result = await getClassAttendanceSheet({
      date,
      classSectionCompositeId: Number(classId),
    })
    setSheet(result)
    return result
  }

  const runSetAll = async (status) => {
    if (!date || !classId) return

    const toastId = `campus-att-bulk-${status}`
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
    if (!date) return

    const toastId = 'campus-att-school-present'
    toast.loading('Marking whole school present…', { id: toastId })
    setSchoolPresentSaving(true)
    setError('')
    try {
      await setSchoolAttendancePresentForAll({ date })
      if (classId) {
        await reloadCurrentClassSheet()
      }
      toast.success('Whole school marked present for this date.', { id: toastId })
      setConfirmSchoolPresent(false)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to update attendance.'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setSchoolPresentSaving(false)
    }
  }

  const onConfirmSetAll = async () => {
    if (!confirmBulkStatus) return
    const status = confirmBulkStatus
    setConfirmBulkStatus('')
    await runSetAll(status)
  }

  const onSetStudentStatus = async (student, status) => {
    if (!date || !classId) return

    const classSectionCompositeId = Number(classId)
    if (!classSectionCompositeId || Number.isNaN(classSectionCompositeId)) {
      toast.error('This student has no class assigned.')
      return
    }

    const sid = student.studentId
    const toastId = `campus-att-student-${sid}`
    toast.loading('Saving attendance…', { id: toastId })
    setStudentUpdatingId(String(sid))
    setError('')
    try {
      const updated = await setStudentAttendanceStatus({
        date,
        classSectionCompositeId,
        studentId: sid,
        status,
      })
      setSheet(updated)
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
    <CampusShell headerContext="Student Attendance">
      <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Mark Attendance</h1>
                <p className="text-sm text-slate-500">
                  Open one class at a time to mark students. Use Mark whole school present when every
                  active student should be present for the date.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmSchoolPresent(true)}
              disabled={!date || savingBusy || loadingSheet}
              className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark whole school present
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[13px] font-medium text-slate-600">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="text-[13px] font-medium text-slate-600 sm:col-span-1 lg:col-span-2">
              Class
              <div className="mt-1">
                <Select
                  isClearable
                  isSearchable
                  isLoading={loadingClasses}
                  options={classOptions}
                  value={selectedClassOption}
                  placeholder="Search class…"
                  onChange={(option) => setClassId(option?.value || '')}
                  className="text-sm"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '40px',
                      borderRadius: '0.5rem',
                      borderColor: '#cbd5e1',
                      boxShadow: 'none',
                    }),
                    menu: (base) => ({ ...base, zIndex: 70 }),
                    menuPortal: (base) => ({ ...base, zIndex: 90 }),
                  }}
                />
              </div>
            </label>

            <label className="text-[13px] font-medium text-slate-600">
              Search
              <input
                type="text"
                name="filterAttendanceStudent"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                disabled={!sheet}
                placeholder="Name or reg id"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100"
                {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
              />
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {sheet ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {getSheetTitle()}{' '}
                  <span className="font-normal text-slate-500">· {sheet.date?.slice(0, 10)}</span>
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                    Total {statusCounts.total}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                    Present {statusCounts.present}
                  </span>
                  <span className="rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700">
                    Absent {statusCounts.absent}
                  </span>
                  <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">
                    Late {statusCounts.late}
                  </span>
                  <span className="rounded-md bg-violet-50 px-2 py-1 font-medium text-violet-700">
                    Leave {statusCounts.leave}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                    Holiday {statusCounts.holiday}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {BULK_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setConfirmBulkStatus(status)}
                    disabled={savingBusy || loadingSheet}
                    className={bulkButtonClass(status)}
                  >
                    {bulkUpdatingStatus === status ? <Loader2 size={14} className="animate-spin" /> : null}
                    Mark all {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-[13px] leading-snug">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Reg Id</th>
                    <th className="px-3 py-2 font-semibold">Student Name</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSheet ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-[var(--campus-primary)]" />
                          Loading attendance sheet…
                        </span>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        No students match this search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr
                        key={student.studentId}
                        className="border-t border-slate-100 hover:bg-slate-50/70"
                      >
                        <td className="px-3 py-1.5 tabular-nums text-slate-700">{student.studentId}</td>
                        <td className="px-3 py-1.5 font-medium text-slate-800">{student.studentName}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {ROW_STATUS_OPTIONS.map((status) => {
                              const isActive = student.status === status
                              const isSaving = String(studentUpdatingId) === String(student.studentId)
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => onSetStudentStatus(student, status)}
                                  disabled={savingBusy || loadingSheet}
                                  className={statusButtonClass(status, isActive)}
                                  title={getStatusLabel(status)}
                                >
                                  {isSaving && isActive ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    status
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : loadingSheet ? (
          <section className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
              Loading attendance sheet…
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
            Select a class to open that class attendance sheet.
          </section>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmBulkStatus)}
        title="Confirm class update"
        description={
          <>
            Mark all students as <span className="font-semibold">{getStatusLabel(confirmBulkStatus)}</span> for
            this date and class?
          </>
        }
        confirmLabel="Confirm"
        confirmClass={bulkButtonClass(confirmBulkStatus || 'P')}
        busy={Boolean(bulkUpdatingStatus)}
        onCancel={() => setConfirmBulkStatus('')}
        onConfirm={onConfirmSetAll}
      />

      {confirmSchoolPresent ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-present-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={21} />
              </div>
              <button
                type="button"
                onClick={() => setConfirmSchoolPresent(false)}
                disabled={schoolPresentSaving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <h2 id="school-present-confirm-title" className="text-lg font-bold text-slate-900">
                Mark whole school present?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Every active student will be marked present (<span className="font-semibold">P</span>) for{' '}
                <span className="font-semibold">{date}</span>.
              </p>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={schoolPresentSaving}
                onClick={() => setConfirmSchoolPresent(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={schoolPresentSaving}
                onClick={() => void runSchoolPresentAll()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {schoolPresentSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

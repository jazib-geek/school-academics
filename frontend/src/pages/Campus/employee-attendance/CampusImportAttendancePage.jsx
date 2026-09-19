import { useEffect, useMemo, useState } from 'react'
import {
  CheckSquare,
  FileSpreadsheet,
  Loader2,
  Square,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { CampusAccessDenied } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusProfile } from '../../../services/campusProfileService'
import {
  importEmployeeAttendance,
  previewEmployeeAttendanceImport,
} from '../../../services/employeeAttendanceService'
import {
  getStoredCampusProfile,
  isKioskAttendance,
  normalizeCampusProfile,
  persistCampusProfile,
} from '../../../utils/campusProfile'

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const toDateKey = (value) => {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime12Hour = (value) => {
  if (!value || typeof value !== 'string') return '—'
  const short = value.length >= 5 ? value.slice(0, 5) : value
  const [hStr, mStr = '00'] = short.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const isFriday = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).getDay() === 5
}

const formatDateLabel = (value) => {
  const key = toDateKey(value)
  if (!key) return value
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const checkoutForDate = (date, weekdayCheckOut, fridayOffTime) =>
  isFriday(date) && fridayOffTime ? fridayOffTime : weekdayCheckOut

export default function CampusImportAttendancePage() {
  const canEdit = hasCampusPermission('edit_emp_attendance')
  const storedProfile = normalizeCampusProfile(getStoredCampusProfile() || {})
  const [file, setFile] = useState(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [punchCount, setPunchCount] = useState(0)
  const [teacherCheckIn, setTeacherCheckIn] = useState(storedProfile.teacherCheckInTime || '07:15')
  const [teacherCheckOut, setTeacherCheckOut] = useState(storedProfile.teacherCheckOutTime || '13:30')
  const [fridayCheckOut, setFridayCheckOut] = useState(storedProfile.fridayCheckOutTime || '12:30')
  const [adminMinutesBefore, setAdminMinutesBefore] = useState(storedProfile.adminEarlyMinutes)
  const [coordinatorMinutesBefore, setCoordinatorMinutesBefore] = useState(
    storedProfile.coordinatorEarlyMinutes,
  )
  const [dateRows, setDateRows] = useState([])
  const [unknownCodes, setUnknownCodes] = useState([])

  const checkedRows = useMemo(() => dateRows.filter((row) => row.checked), [dateRows])
  const readyRows = useMemo(
    () => checkedRows.filter((row) => row.checkIn && row.checkOut),
    [checkedRows],
  )

  useEffect(() => {
    let cancelled = false
    const loadDefaults = async () => {
      try {
        const profileDto = await getCampusProfile().catch(() => getStoredCampusProfile())
        if (cancelled) return
        const profile = normalizeCampusProfile(profileDto || {})
        persistCampusProfile(profile)
        setTeacherCheckIn(profile.teacherCheckInTime || '07:15')
        setTeacherCheckOut(profile.teacherCheckOutTime || '13:30')
        setFridayCheckOut(profile.fridayCheckOutTime || '12:30')
        setAdminMinutesBefore(profile.adminEarlyMinutes)
        setCoordinatorMinutesBefore(profile.coordinatorEarlyMinutes)
      } catch {
        // Keep stored defaults; staff can still type times.
      }
    }
    void loadDefaults()
    return () => {
      cancelled = true
    }
  }, [])

  const resetFile = () => {
    setFile(null)
    setPunchCount(0)
    setDateRows([])
  }

  const onFileChange = async (event) => {
    const next = event.target.files?.[0]
    event.target.value = ''
    if (!next) return

    const name = next.name.toLowerCase()
    if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      toast.error('Use an Excel file (.xls or .xlsx) from the device.')
      return
    }

    setIsPreviewing(true)
    try {
      const preview = await previewEmployeeAttendanceImport(next)
      const dates = (preview?.dates || []).map(toDateKey).filter(Boolean)
      if (dates.length === 0) {
        toast.error('No dates were found in this file.')
        return
      }

      setFile(next)
      setPunchCount(Number(preview?.punchCount || 0))
      setDateRows(
        dates.map((date) => ({
          date,
          checked: true,
          checkIn: teacherCheckIn,
          checkOut: checkoutForDate(date, teacherCheckOut, fridayCheckOut),
        })),
      )
    } catch (err) {
      resetFile()
      toast.error(err?.response?.data?.message || 'Could not read this Excel file.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const applyTimesToChecked = () => {
    if (!teacherCheckIn || !teacherCheckOut) {
      toast.error('Enter teacher check-in and checkout times first.')
      return
    }

    setDateRows((current) =>
      current.map((row) =>
        row.checked
          ? {
              ...row,
              checkIn: teacherCheckIn,
              checkOut: checkoutForDate(row.date, teacherCheckOut, fridayCheckOut),
            }
          : row,
      ),
    )
  }

  const toggleRow = (date) => {
    setDateRows((current) =>
      current.map((row) => (row.date === date ? { ...row, checked: !row.checked } : row)),
    )
  }

  const toggleAll = (checked) => {
    setDateRows((current) => current.map((row) => ({ ...row, checked })))
  }

  const submitImport = async (event) => {
    event.preventDefault()
    if (!canEdit || !file || isImporting) return
    if (readyRows.length === 0) {
      toast.error('Apply teacher times to the dates you want to import.')
      return
    }

    setIsImporting(true)
    setUnknownCodes([])
    try {
      const result = await importEmployeeAttendance(file, {
        dates: readyRows.map((row) => ({
          date: row.date,
          teacherCheckIn: row.checkIn,
          teacherCheckOut: row.checkOut,
        })),
        adminMinutesBefore: Number(adminMinutesBefore) || 0,
        coordinatorMinutesBefore: Number(coordinatorMinutesBefore) || 0,
        fridayCheckOut: fridayCheckOut || null,
      })
      const unknown = result?.data?.unknownEmployeeCodes || []
      toast.success(result?.message || 'Attendance imported.')
      if (unknown.length > 0) {
        setUnknownCodes(unknown)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not import attendance.')
    } finally {
      setIsImporting(false)
    }
  }

  if (!canEdit) {
    return <CampusAccessDenied />
  }

  if (isKioskAttendance(getStoredCampusProfile())) {
    return (
      <CampusAccessDenied
        title="Import is not used here"
        message="This campus records attendance on the fingerprint kiosk. Open Live Attendance instead."
      />
    )
  }

  return (
    <CampusShell headerContext="Import attendance">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-4xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Import attendance</h1>
                <p className="text-sm text-slate-500">
                  Upload the monthly Excel sheet from the wall-mounted device. Late minutes are
                  calculated here from the teacher times you enter.
                </p>
              </div>
            </div>

            <label className="block text-xs font-semibold uppercase text-slate-500">
              Excel file
              <input
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className={`${inputClass} mt-1 cursor-pointer py-1.5 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium`}
                onChange={(event) => void onFileChange(event)}
                disabled={isPreviewing || isImporting}
              />
            </label>

            {isPreviewing ? (
              <p className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking the file…
              </p>
            ) : null}

            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">
                  {file.name}
                  <span className="ml-2 font-normal text-slate-500">
                    {punchCount} {punchCount === 1 ? 'entry' : 'entries'} · {dateRows.length} date
                    {dateRows.length === 1 ? '' : 's'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={resetFile}
                  disabled={isImporting}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-600 hover:bg-white"
                >
                  <X size={14} />
                  Remove
                </button>
              </div>
            ) : null}
          </section>

          {dateRows.length > 0 ? (
            <form onSubmit={submitImport} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Teacher duty times</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Teacher times come from the Teacher designation. Admin and Co-ordinator start
                  earlier by the minutes you enter. Friday checkout is used only on Fridays. If
                  times changed mid-month, uncheck the earlier dates, enter the new times, and apply
                  again.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Check-in
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={teacherCheckIn}
                    onChange={(event) => setTeacherCheckIn(event.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Checkout
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={teacherCheckOut}
                    onChange={(event) => setTeacherCheckOut(event.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Friday checkout
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={fridayCheckOut}
                    onChange={(event) => setFridayCheckOut(event.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Admin earlier (minutes)
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    className={`${inputClass} mt-1`}
                    value={adminMinutesBefore}
                    onChange={(event) => setAdminMinutesBefore(event.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Co-ordinator earlier (minutes)
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    className={`${inputClass} mt-1`}
                    value={coordinatorMinutesBefore}
                    onChange={(event) => setCoordinatorMinutesBefore(event.target.value)}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={applyTimesToChecked}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white"
                  >
                    Apply to checked dates
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-[13px] leading-snug">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleAll(checkedRows.length !== dateRows.length)}
                          className="inline-flex items-center gap-2 text-slate-600"
                        >
                          {checkedRows.length === dateRows.length ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                          Date
                        </button>
                      </th>
                      <th className="px-3 py-2 font-medium">Check-in</th>
                      <th className="px-3 py-2 font-medium">Checkout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateRows.map((row) => (
                      <tr key={row.date} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-1.5">
                          <label className="inline-flex items-center gap-2 font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              onChange={() => toggleRow(row.date)}
                              className="h-4 w-4 accent-[var(--campus-primary)]"
                            />
                            {formatDateLabel(row.date)}
                          </label>
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">{formatTime12Hour(row.checkIn)}</td>
                        <td className="px-3 py-1.5 text-slate-700">{formatTime12Hour(row.checkOut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isImporting || readyRows.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={16} />}
                  Import {readyRows.length} date{readyRows.length === 1 ? '' : 's'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {isImporting ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-progress-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white px-6 py-8 text-center shadow-2xl"
          >
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--campus-primary)]" />
            <h2 id="import-progress-title" className="mt-4 text-lg font-bold text-slate-900">
              Importing attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">Please wait while records are saved.</p>
          </div>
        </div>
      ) : null}

      {unknownCodes.length > 0 ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unknown-codes-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="unknown-codes-title" className="text-lg font-bold text-slate-900">
                  Staff not found
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  These names from the sheet are not on this campus. Their attendance was not
                  imported.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnknownCodes([])}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto px-5 py-3 text-[13px] leading-snug">
              {unknownCodes.map((code) => (
                <li key={code} className="border-t border-slate-100 py-1.5 font-medium text-slate-800 first:border-t-0">
                  {code}
                </li>
              ))}
            </ul>
            <div className="flex justify-end bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setUnknownCodes([])}
                className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

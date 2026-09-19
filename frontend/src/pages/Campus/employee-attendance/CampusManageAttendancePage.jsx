import { useCallback, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Clock,
  Fingerprint,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  CampusAccessDenied,
  PermissionControl,
} from '../../../components/campus/CampusPermissionUi.jsx'
import { hasAnyCampusPermission, hasCampusPermission } from '../../../services/authService'
import {
  backfillEmployeeAttendance,
  deleteEmployeeAttendance,
  editEmployeeAttendance,
  getBackfillExistingAttendance,
  getEmployeeAttendanceActivity,
  getEmployeeAttendanceManageDay,
  markEmployeeHoliday,
  markEmployeePresent,
  recalculateEmployeeDutyTimes,
} from '../../../services/employeeAttendanceService'
import { getAllActiveEmployees } from '../../../services/employeeService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const VIEW_MANAGE_ATTENDANCE_ANY_OF = [
  'edit_emp_attendance',
  'view_live_emp_attendance',
  'view_emp_monthly_attendance',
]

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '36px',
    borderRadius: '0.5rem',
    borderColor: '#cbd5e1',
    boxShadow: 'none',
    fontSize: '13px',
  }),
  menu: (base) => ({ ...base, zIndex: 60 }),
  menuPortal: (base) => ({ ...base, zIndex: 80 }),
}

const ACTIVITY_LABELS = {
  EmployeeAttendanceEdit: 'Attendance edited',
  EmployeeAttendanceMarkPresent: 'Marked present',
  EmployeeAttendanceMarkHoliday: 'Marked holiday',
  EmployeeAttendanceDelete: 'Attendance deleted',
  EmployeeAttendanceBackfill: 'Attendance backfilled',
  EmployeeAttendanceRecalculateDutyTimes: 'Duty times recalculated',
}

const getPakistanDateValue = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const toTimeInputValue = (value) => {
  if (!value || typeof value !== 'string') return ''
  const short = value.length >= 5 ? value.slice(0, 5) : value
  return /^\d{2}:\d{2}$/.test(short) ? short : ''
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

const statusClass = (status) => {
  if (status === 'Late' || status === 'Late, left early')
    return 'rounded-full border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'Left early') return 'rounded-full border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'On time') return 'rounded border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'Holiday') return 'rounded border-amber-200 bg-amber-50 text-amber-900'
  return 'rounded border-slate-200 bg-slate-50 text-slate-700'
}

const lateMinutesClass = (lateMinutes) =>
  (lateMinutes || 0) > 0
    ? 'bg-rose-50 text-rose-800 ring-rose-200'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-200'

const formatPktDateTime = (value) => {
  if (!value) return '—'
  const raw = String(value)
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const formatLc = (value) => (value == null || value === '' ? '—' : String(value))

const formatLocalDateValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDateValue = (value) => {
  if (!value || typeof value !== 'string') return null
  const [y, m, d] = value.split('-').map((part) => Number.parseInt(part, 10))
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const enumerateDateRange = (fromValue, toValue, { skipSundays }) => {
  const from = parseLocalDateValue(fromValue)
  const to = parseLocalDateValue(toValue)
  if (!from || !to || from > to) return []
  const dates = []
  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    if (skipSundays && cursor.getDay() === 0) continue
    dates.push(formatLocalDateValue(cursor))
  }
  return dates
}

const formatDisplayDate = (value) => {
  const date = parseLocalDateValue(value)
  if (!date) return value || '—'
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const normalizeBackfillTime = (value) => toTimeInputValue(value || '') || ''

const isBackfillRowChanged = (row) => {
  if (!row?.hasExisting) return true
  return (
    normalizeBackfillTime(row.checkIn) !== normalizeBackfillTime(row.originalCheckIn) ||
    normalizeBackfillTime(row.checkOut) !== normalizeBackfillTime(row.originalCheckOut)
  )
}

const parseActivityComparison = (detailsJson) => {
  if (!detailsJson) return []
  try {
    const parsed = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson
    const before = parsed?.before || {}
    const after = parsed?.after || {}
    const rows = [
      {
        label: 'Check-in',
        before: formatTime12Hour(before.time ?? before.Time),
        after: formatTime12Hour(after.time ?? after.Time),
      },
      {
        label: 'Check-out',
        before: formatTime12Hour(before.checkOutTime ?? before.CheckOutTime),
        after: formatTime12Hour(after.checkOutTime ?? after.CheckOutTime),
      },
      {
        label: 'LC',
        before: formatLc(before.lateComings ?? before.LateComings),
        after: formatLc(after.lateComings ?? after.LateComings),
      },
    ]
    return rows.filter((row) => row.before !== row.after)
  } catch {
    return []
  }
}

function CampusManageAttendancePage() {
  const canView = hasAnyCampusPermission(...VIEW_MANAGE_ATTENDANCE_ANY_OF)
  const canEdit = hasCampusPermission('edit_emp_attendance')
  const [dateValue, setDateValue] = useState(getPakistanDateValue)
  const [entries, setEntries] = useState([])
  const [missingEmployees, setMissingEmployees] = useState([])
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [editRow, setEditRow] = useState(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deleteRow, setDeleteRow] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [markOpen, setMarkOpen] = useState(false)
  const [markSelectedIds, setMarkSelectedIds] = useState(() => new Set())
  const [markRowTimes, setMarkRowTimes] = useState({})
  const [markGridSearch, setMarkGridSearch] = useState('')
  const [markCheckIn, setMarkCheckIn] = useState('07:00')
  const [markCheckOut, setMarkCheckOut] = useState('')
  const [isSavingMark, setIsSavingMark] = useState(false)

  const [backfillOpen, setBackfillOpen] = useState(false)
  const [backfillEmployeeId, setBackfillEmployeeId] = useState('')
  const [backfillEmployeeOptions, setBackfillEmployeeOptions] = useState([])
  const [isLoadingBackfillEmployees, setIsLoadingBackfillEmployees] = useState(false)
  const [backfillFrom, setBackfillFrom] = useState('')
  const [backfillTo, setBackfillTo] = useState('')
  const [backfillSkipSundays, setBackfillSkipSundays] = useState(true)
  const [backfillCheckIn, setBackfillCheckIn] = useState('07:00')
  const [backfillCheckOut, setBackfillCheckOut] = useState('')
  const [backfillRows, setBackfillRows] = useState([])
  const [backfillExtraDate, setBackfillExtraDate] = useState('')
  const [isLoadingBackfillDates, setIsLoadingBackfillDates] = useState(false)
  const [isSavingBackfill, setIsSavingBackfill] = useState(false)

  const [holidayModalOpen, setHolidayModalOpen] = useState(false)
  const [isSavingHoliday, setIsSavingHoliday] = useState(false)

  const [designationTimes, setDesignationTimes] = useState([])
  const [hasDutyTimeAdjustment, setHasDutyTimeAdjustment] = useState(false)
  const [dutyModalOpen, setDutyModalOpen] = useState(false)
  const [dutyRows, setDutyRows] = useState([])
  const [isSavingDutyTimes, setIsSavingDutyTimes] = useState(false)

  const [activityRow, setActivityRow] = useState(null)
  const [activityItems, setActivityItems] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)

  const loadDay = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getEmployeeAttendanceManageDay({ date: dateValue })
      setEntries(data?.entries || [])
      setMissingEmployees(data?.missingEmployees || [])
      setDesignationTimes(data?.designationTimes || [])
      setHasDutyTimeAdjustment(Boolean(data?.hasDutyTimeAdjustment))
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load attendance for this date.')
      setEntries([])
      setMissingEmployees([])
      setDesignationTimes([])
      setHasDutyTimeAdjustment(false)
    } finally {
      setIsLoading(false)
    }
  }, [dateValue])

  useEffect(() => {
    if (canView) void loadDay()
  }, [canView, loadDay])

  const markGridEmployees = useMemo(() => {
    const keyword = markGridSearch.trim().toLowerCase()
    if (!keyword) return missingEmployees
    return missingEmployees.filter((emp) => {
      const name = (emp.employeeName || '').toLowerCase()
      const id = String(emp.employeeId || '')
      return name.includes(keyword) || id.includes(keyword)
    })
  }, [missingEmployees, markGridSearch])

  const markVisibleIds = useMemo(
    () => markGridEmployees.map((emp) => emp.employeeId),
    [markGridEmployees],
  )

  const markAllVisibleSelected =
    markVisibleIds.length > 0 && markVisibleIds.every((id) => markSelectedIds.has(id))

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return entries
    return entries.filter((entry) => {
      const name = (entry.employeeName || '').toLowerCase()
      const id = String(entry.employeeId || '')
      const status = (entry.status || '').toLowerCase()
      return name.includes(keyword) || id.includes(keyword) || status.includes(keyword)
    })
  }, [entries, searchText])

  const openEdit = (row) => {
    if (!canEdit) return
    setEditRow(row)
    setEditCheckIn(toTimeInputValue(row.checkInTime))
    setEditCheckOut(toTimeInputValue(row.checkOutTime))
  }

  const closeEdit = () => {
    if (isSavingEdit) return
    setEditRow(null)
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    if (!canEdit || !editRow) return
    if (!editCheckIn) {
      toast.error('Check-in time is required.')
      return
    }
    setIsSavingEdit(true)
    try {
      await editEmployeeAttendance(editRow.attendanceId, {
        checkInTime: editCheckIn,
        checkOutTime: editCheckOut || null,
      })
      toast.success('Attendance updated.')
      setEditRow(null)
      await loadDay()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update attendance.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const openDelete = (row) => {
    if (!canEdit) return
    setDeleteRow(row)
  }

  const closeDelete = () => {
    if (isDeleting) return
    setDeleteRow(null)
  }

  const confirmDelete = async () => {
    if (!canEdit || !deleteRow) return
    setIsDeleting(true)
    try {
      await deleteEmployeeAttendance(deleteRow.attendanceId)
      toast.success('Attendance deleted. Employee is now absent for this date.')
      setDeleteRow(null)
      await loadDay()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete attendance.')
    } finally {
      setIsDeleting(false)
    }
  }

  const openMarkPresent = () => {
    if (!canEdit) return
    setMarkSelectedIds(new Set())
    setMarkRowTimes({})
    setMarkGridSearch('')
    setMarkCheckIn('07:00')
    setMarkCheckOut('')
    setMarkOpen(true)
  }

  const closeMarkPresent = () => {
    if (isSavingMark) return
    setMarkOpen(false)
  }

  const applyMarkTimesToIds = (ids, checkIn, checkOut) => {
    setMarkRowTimes((current) => {
      const next = { ...current }
      ids.forEach((id) => {
        next[id] = {
          checkIn: checkIn ?? next[id]?.checkIn ?? '07:00',
          checkOut: checkOut ?? next[id]?.checkOut ?? '',
        }
      })
      return next
    })
  }

  const setMarkBulkCheckIn = (value) => {
    setMarkCheckIn(value)
    if (markSelectedIds.size === 0) return
    setMarkRowTimes((current) => {
      const next = { ...current }
      markSelectedIds.forEach((id) => {
        next[id] = {
          checkIn: value,
          checkOut: next[id]?.checkOut ?? markCheckOut,
        }
      })
      return next
    })
  }

  const setMarkBulkCheckOut = (value) => {
    setMarkCheckOut(value)
    if (markSelectedIds.size === 0) return
    setMarkRowTimes((current) => {
      const next = { ...current }
      markSelectedIds.forEach((id) => {
        next[id] = {
          checkIn: next[id]?.checkIn ?? markCheckIn,
          checkOut: value,
        }
      })
      return next
    })
  }

  const updateMarkRowTime = (employeeId, field, value) => {
    setMarkRowTimes((current) => ({
      ...current,
      [employeeId]: {
        checkIn: field === 'checkIn' ? value : (current[employeeId]?.checkIn ?? markCheckIn),
        checkOut: field === 'checkOut' ? value : (current[employeeId]?.checkOut ?? markCheckOut),
      },
    }))
  }

  const toggleMarkEmployee = (employeeId) => {
    const isSelected = markSelectedIds.has(employeeId)
    setMarkSelectedIds((current) => {
      const next = new Set(current)
      if (isSelected) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
    setMarkRowTimes((times) => {
      if (isSelected) {
        const updated = { ...times }
        delete updated[employeeId]
        return updated
      }
      return {
        ...times,
        [employeeId]: {
          checkIn: markCheckIn || '07:00',
          checkOut: markCheckOut,
        },
      }
    })
  }

  const toggleMarkAllVisible = () => {
    if (markAllVisibleSelected) {
      setMarkSelectedIds((current) => {
        const next = new Set(current)
        markVisibleIds.forEach((id) => next.delete(id))
        return next
      })
      setMarkRowTimes((current) => {
        const next = { ...current }
        markVisibleIds.forEach((id) => delete next[id])
        return next
      })
      return
    }

    const newlyAdded = markVisibleIds.filter((id) => !markSelectedIds.has(id))
    setMarkSelectedIds((current) => {
      const next = new Set(current)
      markVisibleIds.forEach((id) => next.add(id))
      return next
    })
    if (newlyAdded.length > 0) {
      applyMarkTimesToIds(newlyAdded, markCheckIn || '07:00', markCheckOut)
    }
  }

  const submitMarkPresent = async (event) => {
    event.preventDefault()
    if (!canEdit) return
    const selectedIds = [...markSelectedIds]
    if (selectedIds.length === 0) {
      toast.error('Select at least one employee.')
      return
    }
    const missingCheckIn = selectedIds.some((id) => !(markRowTimes[id]?.checkIn || '').trim())
    if (missingCheckIn) {
      toast.error('Enter a check-in time for each selected employee.')
      return
    }
    setIsSavingMark(true)
    try {
      const results = await Promise.allSettled(
        selectedIds.map((employeeId) => {
          const times = markRowTimes[employeeId] || {}
          return markEmployeePresent({
            employeeId,
            date: dateValue,
            checkInTime: times.checkIn,
            checkOutTime: times.checkOut || null,
          })
        }),
      )
      const markedCount = results.filter((result) => result.status === 'fulfilled').length
      const failedCount = results.length - markedCount
      if (markedCount === 0) {
        const firstError = results.find((result) => result.status === 'rejected')?.reason
        toast.error(firstError?.response?.data?.message || 'Could not mark present.')
      } else if (failedCount > 0) {
        toast.success(
          `Marked present for ${markedCount} staff. ${failedCount} could not be saved.`,
        )
        setMarkOpen(false)
        await loadDay()
      } else {
        toast.success(
          markedCount === 1 ? 'Marked present.' : `Marked present for ${markedCount} staff.`,
        )
        setMarkOpen(false)
        await loadDay()
      }
    } finally {
      setIsSavingMark(false)
    }
  }

  const openBackfill = async () => {
    if (!canEdit) return
    setBackfillEmployeeId('')
    setBackfillFrom(dateValue)
    setBackfillTo(dateValue)
    setBackfillSkipSundays(true)
    setBackfillCheckIn('07:00')
    setBackfillCheckOut('')
    setBackfillRows([])
    setBackfillExtraDate('')
    setBackfillOpen(true)
    if (backfillEmployeeOptions.length > 0) return
    setIsLoadingBackfillEmployees(true)
    try {
      const employees = await getAllActiveEmployees()
      setBackfillEmployeeOptions(
        (employees || []).map((emp) => {
          const id = emp.id ?? emp.ID
          return {
            value: String(id),
            label: emp.employeeName || emp.EmployeeName || `Employee ${id}`,
          }
        }),
      )
    } catch {
      toast.error('Could not load employees.')
    } finally {
      setIsLoadingBackfillEmployees(false)
    }
  }

  const closeBackfill = () => {
    if (isSavingBackfill) return
    setBackfillOpen(false)
  }

  const setBackfillBulkCheckIn = (value) => {
    setBackfillCheckIn(value)
    setBackfillRows((current) => current.map((row) => ({ ...row, checkIn: value })))
  }

  const setBackfillBulkCheckOut = (value) => {
    setBackfillCheckOut(value)
    setBackfillRows((current) => current.map((row) => ({ ...row, checkOut: value })))
  }

  const buildExistingByDate = (existingDays) => {
    const map = new Map()
    for (const day of existingDays || []) {
      const rawDate = day.date || day.Date
      const dateValue =
        typeof rawDate === 'string' && rawDate.length >= 10
          ? rawDate.slice(0, 10)
          : formatLocalDateValue(new Date(rawDate))
      if (!dateValue) continue
      map.set(dateValue, {
        checkIn: toTimeInputValue(day.checkInTime || day.CheckInTime || ''),
        checkOut: toTimeInputValue(day.checkOutTime || day.CheckOutTime || ''),
        hasExisting: Boolean(day.hasCheckIn ?? day.HasCheckIn ?? day.checkInTime ?? day.CheckInTime),
      })
    }
    return map
  }

  const loadBackfillDateRange = async () => {
    if (!backfillEmployeeId) {
      toast.error('Select an employee first.')
      return
    }
    if (!backfillFrom || !backfillTo) {
      toast.error('Choose a from and to date.')
      return
    }
    if (backfillFrom > backfillTo) {
      toast.error('From date must be on or before to date.')
      return
    }
    const dates = enumerateDateRange(backfillFrom, backfillTo, {
      skipSundays: backfillSkipSundays,
    })
    if (dates.length === 0) {
      toast.error('No dates in this range.')
      return
    }
    if (dates.length > 62) {
      toast.error('Choose a shorter range (62 dates max).')
      return
    }

    setIsLoadingBackfillDates(true)
    try {
      const existing = await getBackfillExistingAttendance({
        employeeId: Number(backfillEmployeeId),
        from: backfillFrom,
        to: backfillTo,
      })
      const existingByDate = buildExistingByDate(existing?.days || existing?.Days || [])
      setBackfillRows(
        dates.map((date) => {
          const saved = existingByDate.get(date)
          if (saved?.hasExisting) {
            const checkIn = saved.checkIn || ''
            const checkOut = saved.checkOut || ''
            return {
              date,
              checkIn,
              checkOut,
              originalCheckIn: checkIn,
              originalCheckOut: checkOut,
              hasExisting: true,
            }
          }
          return {
            date,
            checkIn: backfillCheckIn || '07:00',
            checkOut: backfillCheckOut,
            originalCheckIn: '',
            originalCheckOut: '',
            hasExisting: false,
          }
        }),
      )
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load saved attendance for this range.')
    } finally {
      setIsLoadingBackfillDates(false)
    }
  }

  const addBackfillDate = async () => {
    if (!backfillExtraDate) {
      toast.error('Choose a date to add.')
      return
    }
    if (backfillRows.some((row) => row.date === backfillExtraDate)) {
      toast.info('That date is already in the list.')
      return
    }
    if (backfillRows.length >= 62) {
      toast.error('You can backfill at most 62 dates at once.')
      return
    }

    let saved = null
    if (backfillEmployeeId) {
      try {
        const existing = await getBackfillExistingAttendance({
          employeeId: Number(backfillEmployeeId),
          from: backfillExtraDate,
          to: backfillExtraDate,
        })
        saved = buildExistingByDate(existing?.days || existing?.Days || []).get(backfillExtraDate)
      } catch {
        // Keep defaults if lookup fails.
      }
    }

    setBackfillRows((current) => {
      const next = [
        ...current,
        saved?.hasExisting
          ? {
              date: backfillExtraDate,
              checkIn: saved.checkIn || '',
              checkOut: saved.checkOut || '',
              originalCheckIn: saved.checkIn || '',
              originalCheckOut: saved.checkOut || '',
              hasExisting: true,
            }
          : {
              date: backfillExtraDate,
              checkIn: backfillCheckIn || '07:00',
              checkOut: backfillCheckOut,
              originalCheckIn: '',
              originalCheckOut: '',
              hasExisting: false,
            },
      ]
      next.sort((a, b) => a.date.localeCompare(b.date))
      return next
    })
  }

  const updateBackfillRow = (date, field, value) => {
    setBackfillRows((current) =>
      current.map((row) => (row.date === date ? { ...row, [field]: value } : row)),
    )
  }

  const removeBackfillRow = (date) => {
    setBackfillRows((current) => current.filter((row) => row.date !== date))
  }

  const changedBackfillRows = useMemo(
    () => backfillRows.filter((row) => isBackfillRowChanged(row)),
    [backfillRows],
  )

  const submitBackfill = async (event) => {
    event.preventDefault()
    if (!canEdit) return
    if (!backfillEmployeeId) {
      toast.error('Select an employee.')
      return
    }
    if (backfillRows.length === 0) {
      toast.error('Add at least one date.')
      return
    }
    if (changedBackfillRows.length === 0) {
      toast.info('No changes to save.')
      return
    }
    if (changedBackfillRows.some((row) => !(row.checkIn || '').trim())) {
      toast.error('Enter a check-in time for each changed date.')
      return
    }
    setIsSavingBackfill(true)
    try {
      const result = await backfillEmployeeAttendance({
        employeeId: Number(backfillEmployeeId),
        days: changedBackfillRows.map((row) => ({
          date: row.date,
          checkInTime: row.checkIn,
          checkOutTime: row.checkOut || null,
        })),
      })
      const marked = result?.markedCount ?? 0
      if (marked === 0) {
        toast.info('No changes were saved.')
      } else {
        toast.success(
          marked === 1 ? 'Attendance saved for 1 day.' : `Attendance saved for ${marked} days.`,
        )
        setBackfillOpen(false)
        await loadDay()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not backfill attendance.')
    } finally {
      setIsSavingBackfill(false)
    }
  }

  const openHolidayModal = () => {
    if (!canEdit || isSavingHoliday) return
    setHolidayModalOpen(true)
  }

  const closeHolidayModal = () => {
    if (isSavingHoliday) return
    setHolidayModalOpen(false)
  }

  const submitMarkHoliday = async (overwriteExisting) => {
    if (!canEdit || isSavingHoliday) return
    setIsSavingHoliday(true)
    try {
      const result = await markEmployeeHoliday({
        date: dateValue,
        overwriteExisting,
      })
      const marked = result?.markedCount ?? 0
      const skipped = result?.skippedCount ?? 0
      if (marked === 0 && skipped > 0) {
        toast.info('No changes made. Existing attendance was kept.')
      } else if (overwriteExisting) {
        toast.success(`Holiday marked for ${marked} staff.`)
      } else {
        toast.success(`Holiday marked for ${marked} staff. ${skipped} existing record${skipped === 1 ? '' : 's'} kept.`)
      }
      setHolidayModalOpen(false)
      await loadDay()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not mark holiday.')
    } finally {
      setIsSavingHoliday(false)
    }
  }

  const openDutyModal = () => {
    if (!canEdit || isSavingDutyTimes) return
    if (designationTimes.length === 0) {
      toast.error('No designations are available for this date.')
      return
    }
    setDutyRows(
      designationTimes.map((row) => ({
        designationId: row.designationId,
        designationName: row.designationName,
        checkInTime: toTimeInputValue(row.checkInTime),
        checkOutTime: toTimeInputValue(row.checkOutTime),
        punchCount: row.punchCount || 0,
      })),
    )
    setDutyModalOpen(true)
  }

  const closeDutyModal = () => {
    if (isSavingDutyTimes) return
    setDutyModalOpen(false)
  }

  const updateDutyRow = (designationId, field, value) => {
    setDutyRows((current) =>
      current.map((row) =>
        row.designationId === designationId ? { ...row, [field]: value } : row,
      ),
    )
  }

  const submitDutyTimes = async (event) => {
    event.preventDefault()
    if (!canEdit || isSavingDutyTimes) return
    if (dutyRows.some((row) => !row.checkInTime)) {
      toast.error('Enter a check-in time for each designation.')
      return
    }
    setIsSavingDutyTimes(true)
    try {
      const result = await recalculateEmployeeDutyTimes({
        date: dateValue,
        designations: dutyRows.map((row) => ({
          designationId: row.designationId,
          checkInTime: row.checkInTime,
          checkOutTime: row.checkOutTime || null,
        })),
      })
      const recalculated = result?.recalculatedCount ?? 0
      if (recalculated === 0) {
        toast.info('No attendance records were updated for this date.')
      } else {
        toast.success(`Late minutes updated for ${recalculated} staff.`)
      }
      setDutyModalOpen(false)
      await loadDay()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update late minutes.')
    } finally {
      setIsSavingDutyTimes(false)
    }
  }

  const openActivity = async (row) => {
    setActivityRow(row)
    setActivityItems([])
    setIsLoadingActivity(true)
    try {
      const items = await getEmployeeAttendanceActivity(row.attendanceId)
      setActivityItems(items || [])
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load activity.')
      setActivityRow(null)
    } finally {
      setIsLoadingActivity(false)
    }
  }

  if (!canView) {
    return <CampusAccessDenied />
  }

  return (
    <CampusShell headerContext="Manage attendance">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Manage Attendance</h1>
                  <p className="text-sm text-slate-500">
                    Search by date to edit times, mark present, backfill dates, mark holiday, adjust duty times, or review changes.
                  </p>
                </div>
              </div>
              <PermissionControl permission="edit_emp_attendance">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openDutyModal}
                    disabled={isLoading || isSavingHoliday || isSavingDutyTimes || designationTimes.length === 0}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-medium text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {isSavingDutyTimes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    Adjust duty times
                  </button>
                  <button
                    type="button"
                    onClick={openHolidayModal}
                    disabled={isLoading || isSavingHoliday}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {isSavingHoliday ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4" />}
                    Mark holiday
                  </button>
                  <button
                    type="button"
                    onClick={openMarkPresent}
                    disabled={missingEmployees.length === 0 || isSavingHoliday || isSavingBackfill}
                    title={
                      missingEmployees.length === 0
                        ? 'Everyone already has a check-in for this date.'
                        : undefined
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    Mark present
                  </button>
                  <button
                    type="button"
                    onClick={() => void openBackfill()}
                    disabled={isSavingHoliday || isSavingBackfill}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Backfill dates
                  </button>
                </div>
              </PermissionControl>
            </div>

            <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
              <label className="text-xs font-medium text-slate-600">
                Date
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="filterManageAttendanceSearch"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search employee, ID, or status"
                  className="h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </div>

              <button
                type="button"
                onClick={() => void loadDay()}
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#344574] disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Entries</p>
                <p className="text-lg font-semibold text-slate-900">{entries.length}</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-700">Manual changes</p>
                <p className="text-lg font-semibold text-amber-900">
                  {entries.filter((e) => e.isManuallyAdjusted).length}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-1 col-span-2">
                <p className="text-xs text-slate-500">Still missing check-in</p>
                <p className="text-lg font-semibold text-slate-900">{missingEmployees.length}</p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {hasDutyTimeAdjustment ? (
              <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                Late minutes on this date were recalculated from duty times you entered. Recorded IN and OUT were not
                changed. Open Adjust duty times and save the usual times to restore them.
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Employee</th>
                      <th className="px-3 py-2 font-medium">IN</th>
                      <th className="px-3 py-2 font-medium">OUT</th>
                      <th className="px-3 py-2 font-medium">Late min</th>
                      <th className="px-3 py-2 font-medium">LC</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr
                        key={entry.attendanceId}
                        className="border-t border-slate-100 bg-white hover:bg-slate-50"
                      >
                        <td className="px-3 py-1.5">
                          <p className="font-semibold text-slate-900">{entry.employeeName || '—'}</p>
                          <p className="text-[11px] text-slate-500">#{entry.employeeId}</p>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-800">
                          {formatTime12Hour(entry.checkInTime)}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-800">
                          {formatTime12Hour(entry.checkOutTime)}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lateMinutesClass(entry.lateMinutes)}`}
                          >
                            {entry.lateMinutes || 0}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex min-w-10 justify-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                            {entry.lateComings || 0}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${statusClass(entry.status)}`}
                          >
                            {entry.status || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {entry.status === 'Holiday' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              <Sun size={12} strokeWidth={2.25} />
                              Holiday
                            </span>
                          ) : entry.isManuallyAdjusted ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Manual
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <Fingerprint size={12} strokeWidth={2.25} />
                              Verified
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            <PermissionControl permission="edit_emp_attendance">
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => openEdit(entry)}
                                className="btn-icon-soft"
                              >
                                <Pencil size={14} />
                              </button>
                            </PermissionControl>
                            <PermissionControl permission="edit_emp_attendance">
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => openDelete(entry)}
                                className="btn-icon-soft btn-icon-soft--danger"
                              >
                                <Trash2 size={14} />
                              </button>
                            </PermissionControl>
                            <button
                              type="button"
                              title="View activity"
                              onClick={() => void openActivity(entry)}
                              className="btn-icon-soft"
                            >
                              <History size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isLoading && entries.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
                  Loading attendance...
                </div>
              ) : null}

              {!isLoading && filteredEntries.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No attendance entries for this date.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {editRow ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitEdit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-attendance-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="edit-attendance-title" className="text-lg font-bold text-slate-900">
                  Edit attendance
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{editRow.employeeName}</p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Check-in
                <input
                  type="time"
                  required
                  className={`${inputClass} mt-1`}
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Check-out
                <input
                  type="time"
                  className={`${inputClass} mt-1`}
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                />
              </label>
              <p className="text-xs text-slate-500">
                Late minutes and LC are recalculated when you save.
              </p>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={closeEdit}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteRow ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-attendance-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="delete-attendance-title" className="text-lg font-bold text-slate-900">
                  Delete attendance
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{deleteRow.employeeName}</p>
              </div>
              <button
                type="button"
                onClick={closeDelete}
                disabled={isDeleting}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 px-5 py-5 text-sm text-slate-600">
              <p>
                This attendance record will be deleted. The employee will be marked absent for{' '}
                <span className="font-semibold text-slate-900">{dateValue}</span>.
              </p>
              <p>This cannot be undone from here. You can mark them present again later if needed.</p>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={closeDelete}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {markOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitMarkPresent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-present-title"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="mark-present-title" className="text-lg font-bold text-slate-900">
                  Mark present
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">For {dateValue}</p>
              </div>
              <button
                type="button"
                onClick={closeMarkPresent}
                disabled={isSavingMark}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[200px_1fr]">
              <div className="space-y-3 border-b border-slate-100 px-5 py-5 md:border-b-0 md:border-r">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Check-in
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={markCheckIn}
                    onChange={(e) => setMarkBulkCheckIn(e.target.value)}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Check-out (optional)
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={markCheckOut}
                    onChange={(e) => setMarkBulkCheckOut(e.target.value)}
                  />
                </label>
                <p className="text-xs text-slate-500">
                  {markSelectedIds.size === 0
                    ? 'Choose staff on the right.'
                    : `Applies to ${markSelectedIds.size} selected`}
                </p>
              </div>

              <div className="flex min-h-0 flex-col px-5 py-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Still missing ({missingEmployees.length})
                  </p>
                  <button
                    type="button"
                    onClick={toggleMarkAllVisible}
                    disabled={markVisibleIds.length === 0 || isSavingMark}
                    className="text-xs font-semibold text-[var(--campus-primary)] hover:underline disabled:opacity-50"
                  >
                    {markAllVisibleSelected ? 'Clear selection' : 'Select all'}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={markGridSearch}
                    onChange={(e) => setMarkGridSearch(e.target.value)}
                    placeholder="Search name or ID"
                    className="h-8 w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2.5 text-[13px] outline-none focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100"
                    {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
                  <div className="max-h-[min(420px,50vh)] overflow-y-auto">
                    <table className="w-full min-w-[640px] text-left text-[13px] leading-snug">
                      <thead className="sticky top-0 bg-[var(--campus-primary)] text-xs uppercase text-white">
                        <tr>
                          <th className="w-10 px-3 py-2 font-medium">
                            <input
                              type="checkbox"
                              checked={markAllVisibleSelected}
                              onChange={toggleMarkAllVisible}
                              disabled={markVisibleIds.length === 0 || isSavingMark}
                              aria-label="Select all visible"
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                          </th>
                          <th className="px-3 py-2 font-medium">Employee</th>
                          <th className="w-[120px] px-3 py-2 font-medium">CI</th>
                          <th className="w-[120px] px-3 py-2 font-medium">CO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {markGridEmployees.map((emp) => {
                          const selected = markSelectedIds.has(emp.employeeId)
                          const times = markRowTimes[emp.employeeId]
                          return (
                            <tr
                              key={emp.employeeId}
                              className={`border-t border-slate-100 ${
                                selected ? 'bg-emerald-50' : 'cursor-pointer bg-white hover:bg-slate-50'
                              }`}
                              onClick={() =>
                                !selected && !isSavingMark && toggleMarkEmployee(emp.employeeId)
                              }
                            >
                              <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={isSavingMark}
                                  onChange={() => toggleMarkEmployee(emp.employeeId)}
                                  aria-label={`Select ${emp.employeeName || emp.employeeId}`}
                                  className="h-3.5 w-3.5 rounded border-slate-300"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <p className="font-semibold text-slate-900">
                                  {emp.employeeName || '—'}
                                </p>
                                <p className="text-[11px] text-slate-500">#{emp.employeeId}</p>
                              </td>
                              <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                {selected ? (
                                  <input
                                    type="time"
                                    required
                                    disabled={isSavingMark}
                                    className={inputClass}
                                    value={times?.checkIn || ''}
                                    onChange={(e) =>
                                      updateMarkRowTime(emp.employeeId, 'checkIn', e.target.value)
                                    }
                                    aria-label={`Check-in for ${emp.employeeName || emp.employeeId}`}
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                {selected ? (
                                  <input
                                    type="time"
                                    disabled={isSavingMark}
                                    className={inputClass}
                                    value={times?.checkOut || ''}
                                    onChange={(e) =>
                                      updateMarkRowTime(emp.employeeId, 'checkOut', e.target.value)
                                    }
                                    aria-label={`Check-out for ${emp.employeeName || emp.employeeId}`}
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {markGridEmployees.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-500">
                        No matching staff.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSavingMark}
                onClick={closeMarkPresent}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingMark || markSelectedIds.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingMark ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                {markSelectedIds.size > 1
                  ? `Save (${markSelectedIds.size})`
                  : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {backfillOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitBackfill}
            role="dialog"
            aria-modal="true"
            aria-labelledby="backfill-attendance-title"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="backfill-attendance-title" className="text-lg font-bold text-slate-900">
                  Backfill dates
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Mark one employee present across multiple dates
                </p>
              </div>
              <button
                type="button"
                onClick={closeBackfill}
                disabled={isSavingBackfill}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[260px_1fr]">
              <div className="space-y-3 overflow-y-auto border-b border-slate-100 px-5 py-5 md:border-b-0 md:border-r">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Employee
                  <div className="mt-1">
                    <Select
                      styles={selectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      options={backfillEmployeeOptions}
                      value={
                        backfillEmployeeOptions.find((o) => o.value === String(backfillEmployeeId)) ||
                        null
                      }
                      onChange={(opt) => {
                        setBackfillEmployeeId(opt?.value || '')
                        setBackfillRows([])
                      }}
                      placeholder={isLoadingBackfillEmployees ? 'Loading…' : 'Select employee'}
                      isLoading={isLoadingBackfillEmployees}
                      isClearable
                    />
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    From
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={backfillFrom}
                      onChange={(e) => setBackfillFrom(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    To
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={backfillTo}
                      onChange={(e) => setBackfillTo(e.target.value)}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={backfillSkipSundays}
                    onChange={(e) => setBackfillSkipSundays(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Skip Sundays
                </label>

                <button
                  type="button"
                  onClick={() => void loadBackfillDateRange()}
                  disabled={isSavingBackfill || isLoadingBackfillDates}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {isLoadingBackfillDates ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CalendarPlus size={15} />
                  )}
                  Load dates
                </button>

                <div className="flex gap-2">
                  <input
                    type="date"
                    className={inputClass}
                    value={backfillExtraDate}
                    onChange={(e) => setBackfillExtraDate(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void addBackfillDate()}
                    disabled={isSavingBackfill || isLoadingBackfillDates}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Check-in
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={backfillCheckIn}
                    onChange={(e) => setBackfillBulkCheckIn(e.target.value)}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Check-out (optional)
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={backfillCheckOut}
                    onChange={(e) => setBackfillBulkCheckOut(e.target.value)}
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Load fills saved CI/CO where attendance already exists. Only dates you change are
                  sent when you save.
                </p>
              </div>

              <div className="flex min-h-0 flex-col px-5 py-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Dates ({backfillRows.length}
                    {backfillRows.some((row) => row.hasExisting)
                      ? ` · ${backfillRows.filter((row) => row.hasExisting).length} saved`
                      : ''}
                    )
                  </p>
                  {backfillRows.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setBackfillRows([])}
                      disabled={isSavingBackfill}
                      className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                    >
                      Clear list
                    </button>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
                  <div className="max-h-[min(420px,50vh)] overflow-y-auto">
                    <table className="w-full min-w-[560px] text-left text-[13px] leading-snug">
                      <thead className="sticky top-0 bg-[var(--campus-primary)] text-xs uppercase text-white">
                        <tr>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="w-[120px] px-3 py-2 font-medium">CI</th>
                          <th className="w-[120px] px-3 py-2 font-medium">CO</th>
                          <th className="w-10 px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {backfillRows.map((row) => (
                          <tr
                            key={row.date}
                            className={`border-t border-slate-100 ${
                              row.hasExisting ? 'bg-slate-50' : 'bg-white'
                            }`}
                          >
                            <td className="px-3 py-1.5">
                              <p className="font-semibold text-slate-900">{formatDisplayDate(row.date)}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <p className="text-[11px] text-slate-500">{row.date}</p>
                                {row.hasExisting ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    Saved
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="time"
                                required
                                disabled={isSavingBackfill}
                                className={inputClass}
                                value={row.checkIn || ''}
                                onChange={(e) => updateBackfillRow(row.date, 'checkIn', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="time"
                                disabled={isSavingBackfill}
                                className={inputClass}
                                value={row.checkOut || ''}
                                onChange={(e) => updateBackfillRow(row.date, 'checkOut', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <button
                                type="button"
                                title="Remove date"
                                disabled={isSavingBackfill}
                                onClick={() => removeBackfillRow(row.date)}
                                className="btn-icon-soft btn-icon-soft--danger"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {backfillRows.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-500">
                        Load a date range or add dates one by one.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSavingBackfill}
                onClick={closeBackfill}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSavingBackfill ||
                  isLoadingBackfillDates ||
                  changedBackfillRows.length === 0 ||
                  !backfillEmployeeId
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingBackfill ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CalendarPlus size={16} />
                )}
                {changedBackfillRows.length > 1
                  ? `Save (${changedBackfillRows.length})`
                  : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {dutyModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitDutyTimes}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duty-times-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="duty-times-title" className="text-lg font-bold text-slate-900">
                  Duty times for this date
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{dateValue}</p>
              </div>
              <button
                type="button"
                onClick={closeDutyModal}
                disabled={isSavingDutyTimes}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              <p className="text-sm text-slate-600">
                Recorded IN and OUT stay as they are. Late minutes and LC are recalculated from the times you enter.
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-xs uppercase text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Designation</th>
                      <th className="px-3 py-2 font-medium">Check-in</th>
                      <th className="px-3 py-2 font-medium">Check-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dutyRows.map((row) => (
                      <tr key={row.designationId} className="border-t border-slate-100 bg-white">
                        <td className="px-3 py-1.5">
                          <p className="font-semibold text-slate-900">{row.designationName}</p>
                          <p className="text-[11px] text-slate-500">
                            {row.punchCount} {row.punchCount === 1 ? 'check-in' : 'check-ins'}
                          </p>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="time"
                            required
                            className={inputClass}
                            value={row.checkInTime}
                            onChange={(event) =>
                              updateDutyRow(row.designationId, 'checkInTime', event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="time"
                            className={inputClass}
                            value={row.checkOutTime}
                            onChange={(event) =>
                              updateDutyRow(row.designationId, 'checkOutTime', event.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSavingDutyTimes}
                onClick={closeDutyModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDutyTimes}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingDutyTimes ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                Recalculate late minutes
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {holidayModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-holiday-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="mark-holiday-title" className="text-lg font-bold text-slate-900">
                  Mark holiday
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">For {dateValue}</p>
              </div>
              <button
                type="button"
                onClick={closeHolidayModal}
                disabled={isSavingHoliday}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5 text-sm text-slate-600">
              {entries.length > 0 ? (
                <>
                  <p>
                    <span className="font-semibold text-slate-900">{entries.length}</span> staff already have
                    attendance for this date.
                  </p>
                  <p>Choose how to apply holiday for all active staff:</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-600">
                    <li>
                      <span className="font-medium text-slate-800">Overwrite as holiday</span> — replace existing
                      records with holiday (full day salary, LC 0).
                    </li>
                    <li>
                      <span className="font-medium text-slate-800">Keep original</span> — only mark staff with no
                      record yet ({missingEmployees.length} staff).
                    </li>
                  </ul>
                </>
              ) : (
                <p>
                  Mark all active staff as holiday for this date? Each employee receives full day salary with LC 0.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSavingHoliday}
                onClick={closeHolidayModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              {entries.length > 0 ? (
                <>
                  <button
                    type="button"
                    disabled={isSavingHoliday || missingEmployees.length === 0}
                    onClick={() => void submitMarkHoliday(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {isSavingHoliday ? <Loader2 size={16} className="animate-spin" /> : null}
                    Keep original
                  </button>
                  <button
                    type="button"
                    disabled={isSavingHoliday}
                    onClick={() => void submitMarkHoliday(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {isSavingHoliday ? <Loader2 size={16} className="animate-spin" /> : <Sun size={16} />}
                    Overwrite as holiday
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isSavingHoliday}
                  onClick={() => void submitMarkHoliday(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {isSavingHoliday ? <Loader2 size={16} className="animate-spin" /> : <Sun size={16} />}
                  Mark all as holiday
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activityRow ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-activity-title"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="attendance-activity-title" className="text-lg font-bold text-slate-900">
                  Activity log
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{activityRow.employeeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivityRow(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
                  Loading...
                </div>
              ) : activityItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No changes recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityItems.map((item) => {
                    const changes = parseActivityComparison(item.detailsJson)
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {ACTIVITY_LABELS[item.activityType] || item.activityType}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatPktDateTime(item.occurredAtPkt)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {item.userName || 'Unknown user'}
                        </p>
                        {changes.length > 0 ? (
                          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              <div className="bg-slate-50 px-2 py-1.5">Field</div>
                              <div className="bg-slate-50 px-2 py-1.5">Before</div>
                              <div className="bg-slate-50 px-2 py-1.5">After</div>
                            </div>
                            {changes.map((row) => (
                              <div
                                key={row.label}
                                className="grid grid-cols-[1fr_1fr_1fr] gap-px border-t border-slate-100 bg-slate-100 text-[12px]"
                              >
                                <div className="bg-white px-2 py-1.5 font-medium text-slate-600">
                                  {row.label}
                                </div>
                                <div className="bg-white px-2 py-1.5 text-slate-700">{row.before}</div>
                                <div className="bg-white px-2 py-1.5 font-semibold text-slate-900">
                                  {row.after}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[12px] text-slate-500">No field changes recorded.</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusManageAttendancePage

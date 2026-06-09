import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Select from 'react-select'
import { toast } from 'sonner'
import {
  Bell,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sunrise,
  Trash2,
  UserX,
} from 'lucide-react'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getCampusLabel } from '../../constants/branding'
import {
  getCoordinatorHeadOfficeBundle,
  getCoordinatorStaffForPick,
  postCoordinatorAbsentTeachers,
  postCoordinatorArrival,
  postCoordinatorAssembly,
  postCoordinatorModDuties,
  postCoordinatorWorkingReportLines,
} from '../../services/coordinatorDailyReportService'

const DUTY_SCOPES = [
  { value: 'Assembly', label: 'Assembly' },
  { value: 'Break', label: 'Break' },
  { value: 'OffTime', label: 'Off time' },
  { value: 'Other', label: 'Other' },
]

const getPakistanTodayIso = () => {
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

/** Previous calendar day in Pakistan (no DST); pairs with {@link getPakistanTodayIso}. */
const getPakistanYesterdayIso = () => {
  const today = getPakistanTodayIso()
  const [y, m, d] = today.split('-').map(Number)
  const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  ref.setUTCDate(ref.getUTCDate() - 1)
  const y2 = ref.getUTCFullYear()
  const m2 = String(ref.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(ref.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

const clampReportDateToPakistanWindow = (iso) => {
  const min = getPakistanYesterdayIso()
  const max = getPakistanTodayIso()
  if (!iso) return max
  if (iso < min) return min
  if (iso > max) return max
  return iso
}

/** Match native `<select class="h-10 …">` (40px) incl. border; keeps MOD row Scope / On duty aligned. */
const STAFF_SELECT_CONTROL_PX = 40

const staffSearchSelectStyles = {
  control: (base) => ({
    ...base,
    boxSizing: 'border-box',
    minHeight: STAFF_SELECT_CONTROL_PX,
    height: STAFF_SELECT_CONTROL_PX,
    borderRadius: '0.75rem',
    borderColor: '#cbd5e1',
    boxShadow: 'none',
    alignItems: 'center',
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 12,
    paddingRight: 6,
    paddingTop: 0,
    paddingBottom: 0,
    height: STAFF_SELECT_CONTROL_PX,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: STAFF_SELECT_CONTROL_PX,
    alignItems: 'center',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: 4,
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: 4,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  singleValue: (base) => ({
    ...base,
    marginLeft: 0,
    marginRight: 0,
    lineHeight: '1.25rem',
  }),
  menu: (base) => ({
    ...base,
    zIndex: 70,
    borderRadius: '0.75rem',
    overflow: 'hidden',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 10060,
  }),
  option: (base, state) => ({
    ...base,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: '0.875rem',
    ...(state.isFocused ? { backgroundColor: '#e0e7ff' } : {}),
    ...(state.isSelected ? { backgroundColor: '#c7d2fe', color: '#1e1b4b' } : {}),
  }),
}

/** Same footprint as react-select control ({@link STAFF_SELECT_CONTROL_PX}px), rounded-xl, slate-300 border. */
const nativeSelectMatchControlClass =
  'mt-1 box-border h-10 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-0 text-sm leading-none text-slate-900 shadow-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const CLASS_ATTENDANCE_PREVIEW_ROWS = 10
const COORD_DAILY_INITIAL_TOAST_ID = 'coordinator-daily-report-initial-load'

const saveCtaBtnClass = 'emp-cta-btn emp-cta-btn-success inline-flex items-center justify-center gap-2'

function SaveCtaContents({ busy, idleLabel }) {
  if (busy) {
    return (
      <>
        <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
        Saving…
      </>
    )
  }
  return idleLabel
}

/** Collapsible report block; starts collapsed. Pass `expanded` + `onExpandedChange` for parent-controlled open state (e.g. collapse after save). */
function CoordinatorReportAccordion({ title, subtitle, icon: Icon, children, expanded, onExpandedChange }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const panelId = useId()
  const controlled = expanded !== undefined && typeof onExpandedChange === 'function'
  const open = controlled ? expanded : internalOpen
  const setOpen = (next) => {
    if (controlled) onExpandedChange(next)
    else setInternalOpen(next)
  }

  return (
    <section className="emp-surface overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[3.25rem] items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50/80 active:bg-slate-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-inner"
          aria-hidden
        >
          <Icon size={22} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-slate-900">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-xs font-normal leading-snug text-slate-500">{subtitle}</span>
          ) : null}
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-label={title}
            className={`border-t border-slate-100 px-4 pb-4 pt-3 motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out ${
              open ? 'translate-y-0 opacity-100 motion-safe:scale-100' : 'pointer-events-none -translate-y-1.5 opacity-0 motion-safe:scale-[0.99]'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

function StaffEmployeeSelect({ valueId, onChangeId, options, isLoading, instanceId }) {
  const selected = options.find((o) => o.value === valueId) ?? null

  return (
    <Select
      instanceId={instanceId}
      inputId={instanceId}
      isLoading={isLoading}
      isClearable
      isSearchable
      closeMenuOnSelect
      blurInputOnSelect
      menuPosition="fixed"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuShouldBlockScroll
      placeholder="Search staff…"
      options={options}
      value={valueId > 0 ? selected : null}
      onChange={(opt) => onChangeId(opt?.value ?? 0)}
      styles={staffSearchSelectStyles}
      className="text-sm"
    />
  )
}

const formatPakistanWeekdayLong = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(utcNoon)
}

const timeDtoToInput = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value.length >= 5 ? value.slice(0, 5) : value
}

const inputTimeToDto = (value) => {
  if (!value || !value.trim()) return null
  return value.length === 5 ? `${value}:00` : value
}

const boolToTri = (v) => {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return ''
}

const triToBool = (v) => {
  if (v === 'yes') return true
  if (v === 'no') return false
  return null
}

const applyReportToForm = (report, staffList) => {
  const firstStaffId = staffList[0]?.id ?? 0
  return {
    arrivalTime: timeDtoToInput(report?.arrivalTime),
    assemblyTri: boolToTri(report?.assemblyConductedPerPolicy),
    moralLessonTopic: report?.moralLessonTopic ?? '',
    uniformCheckNotes: report?.uniformCheckNotes ?? '',
    campusCleanlinessNotes: report?.campusCleanlinessNotes ?? '',
    teachersInClassesNotes: report?.teachersInClassesNotes ?? '',
    modRows:
      report?.modDuties?.length > 0
        ? report.modDuties.map((m) => ({
            dutyScope: m.dutyScope || 'Assembly',
            dutyScopeOtherLabel: m.dutyScopeOtherLabel ?? '',
            onDutyEmployeeId: m.onDutyEmployeeId,
            notes: m.notes ?? '',
          }))
        : [{ dutyScope: 'Assembly', dutyScopeOtherLabel: '', onDutyEmployeeId: firstStaffId, notes: '' }],
    absentRows:
      report?.absentTeachers?.length > 0
        ? report.absentTeachers.map((a) => ({
            employeeId: a.employeeId,
            notes: a.notes ?? '',
          }))
        : [],
    workingLines:
      report?.workingReportLines?.length > 0
        ? [...report.workingReportLines]
            .sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0))
            .map((l) => l.activityDescription ?? '')
        : [''],
  }
}

function CoordinatorDailyReportPage() {
  const campusLabel = getCampusLabel(localStorage.getItem('employeeCampus') || '')
  const employeeName = localStorage.getItem('employeeName') || 'Coordinator'

  const [reportDate, setReportDate] = useState(getPakistanTodayIso)
  const [staff, setStaff] = useState([])
  const [classAttendanceSummaries, setClassAttendanceSummaries] = useState([])
  const [report, setReport] = useState(null)

  const [arrivalTime, setArrivalTime] = useState('')
  const [assemblyTri, setAssemblyTri] = useState('')
  const [moralLessonTopic, setMoralLessonTopic] = useState('')
  const [uniformCheckNotes, setUniformCheckNotes] = useState('')
  const [campusCleanlinessNotes, setCampusCleanlinessNotes] = useState('')
  const [teachersInClassesNotes, setTeachersInClassesNotes] = useState('')
  const [modRows, setModRows] = useState([])
  const [absentRows, setAbsentRows] = useState([])
  const [workingLines, setWorkingLines] = useState([''])

  const [loadError, setLoadError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState('ok')
  const [isLoadingBundle, setIsLoadingBundle] = useState(false)
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  const [savingKey, setSavingKey] = useState('')
  const [classAttendanceExpanded, setClassAttendanceExpanded] = useState(false)

  const [arrivalAccordionOpen, setArrivalAccordionOpen] = useState(false)
  const [modAccordionOpen, setModAccordionOpen] = useState(false)
  const [absentAccordionOpen, setAbsentAccordionOpen] = useState(false)
  const [assemblyAccordionOpen, setAssemblyAccordionOpen] = useState(false)
  const [workingAccordionOpen, setWorkingAccordionOpen] = useState(false)

  const isLoadingStaffRef = useRef(false)
  const initialLoadToastDismissedRef = useRef(false)

  useEffect(() => {
    isLoadingStaffRef.current = isLoadingStaff
  }, [isLoadingStaff])

  useEffect(() => {
    return () => {
      toast.dismiss(COORD_DAILY_INITIAL_TOAST_ID)
    }
  }, [])

  const staffSelectOptions = useMemo(
    () =>
      staff.map((s) => ({
        value: s.id,
        label: (s.employeeName || `ID ${s.id}`).trim() || `ID ${s.id}`,
      })),
    [staff],
  )

  const showStatus = (message, tone = 'ok') => {
    setStatusTone(tone)
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(''), 5000)
  }

  const loadStaff = useCallback(async () => {
    setIsLoadingStaff(true)
    try {
      const list = await getCoordinatorStaffForPick()
      setStaff(Array.isArray(list) ? list : [])
    } catch (err) {
      setStaff([])
      setLoadError(err?.response?.data?.message || 'Unable to load staff list.')
    } finally {
      setIsLoadingStaff(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const applyServerReportToForm = useCallback((nextReport, staffList) => {
    const form = applyReportToForm(nextReport, staffList)
    setArrivalTime(form.arrivalTime)
    setAssemblyTri(form.assemblyTri)
    setMoralLessonTopic(form.moralLessonTopic)
    setUniformCheckNotes(form.uniformCheckNotes)
    setCampusCleanlinessNotes(form.campusCleanlinessNotes)
    setTeachersInClassesNotes(form.teachersInClassesNotes)
    setModRows(form.modRows)
    setAbsentRows(form.absentRows)
    setWorkingLines(form.workingLines)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!initialLoadToastDismissedRef.current) {
      toast.loading('Loading coordinator report…', { id: COORD_DAILY_INITIAL_TOAST_ID })
    }
    const run = async () => {
      setIsLoadingBundle(true)
      setLoadError('')
      try {
        const bundle = await getCoordinatorHeadOfficeBundle({ reportDate })
        if (cancelled) return
        setClassAttendanceSummaries(bundle?.classAttendanceSummaries ?? [])
        const nextReport = bundle?.report ?? null
        setReport(nextReport)
        applyServerReportToForm(nextReport, staff)
      } catch (err) {
        if (cancelled) return
        const msg = err?.response?.data?.message || err?.message || 'Unable to load report.'
        setLoadError(msg)
        setClassAttendanceSummaries([])
        setReport(null)
      } finally {
        if (!cancelled) {
          setIsLoadingBundle(false)
          if (!initialLoadToastDismissedRef.current && !isLoadingStaffRef.current) {
            toast.dismiss(COORD_DAILY_INITIAL_TOAST_ID)
            initialLoadToastDismissedRef.current = true
          }
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [reportDate, staff, applyServerReportToForm])

  const loadBundle = useCallback(async () => {
    setIsLoadingBundle(true)
    setLoadError('')
    try {
      const bundle = await getCoordinatorHeadOfficeBundle({ reportDate })
      setClassAttendanceSummaries(bundle?.classAttendanceSummaries ?? [])
      const nextReport = bundle?.report ?? null
      setReport(nextReport)
      applyServerReportToForm(nextReport, staff)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to load report.'
      setLoadError(msg)
      setClassAttendanceSummaries([])
      setReport(null)
    } finally {
      setIsLoadingBundle(false)
    }
  }, [reportDate, staff, applyServerReportToForm])

  const attendanceTotals = useMemo(() => {
    let total = 0
    let present = 0
    for (const row of classAttendanceSummaries) {
      total += row.totalCount ?? 0
      present += row.presentCount ?? 0
    }
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
    return { total, present, pct }
  }, [classAttendanceSummaries])

  const classAttendanceVisibleRows = useMemo(() => {
    if (classAttendanceExpanded) return classAttendanceSummaries
    return classAttendanceSummaries.slice(0, CLASS_ATTENDANCE_PREVIEW_ROWS)
  }, [classAttendanceSummaries, classAttendanceExpanded])

  const classAttendanceHiddenCount = Math.max(
    0,
    classAttendanceSummaries.length - CLASS_ATTENDANCE_PREVIEW_ROWS,
  )

  useEffect(() => {
    setClassAttendanceExpanded(false)
  }, [reportDate])

  const mergeSavedReport = (dto) => {
    if (!dto) return
    setReport(dto)
    applyServerReportToForm(dto, staff)
  }

  const saveArrival = async () => {
    setSavingKey('arrival')
    try {
      const dto = await postCoordinatorArrival({
        reportDate,
        arrivalTime: inputTimeToDto(arrivalTime),
      })
      mergeSavedReport(dto)
      toast.success('Arrival saved.')
      setArrivalAccordionOpen(false)
    } catch (err) {
      showStatus(err?.response?.data?.message || 'Could not save arrival.', 'err')
    } finally {
      setSavingKey('')
    }
  }

  const saveAssembly = async () => {
    setSavingKey('assembly')
    try {
      const dto = await postCoordinatorAssembly({
        reportDate,
        assemblyConductedPerPolicy: triToBool(assemblyTri),
        moralLessonTopic: moralLessonTopic.trim() || null,
        uniformCheckNotes: uniformCheckNotes.trim() || null,
        campusCleanlinessNotes: campusCleanlinessNotes.trim() || null,
        teachersInClassesNotes: teachersInClassesNotes.trim() || null,
      })
      mergeSavedReport(dto)
      toast.success('Morning / assembly details saved.')
      setAssemblyAccordionOpen(false)
    } catch (err) {
      showStatus(err?.response?.data?.message || 'Could not save assembly details.', 'err')
    } finally {
      setSavingKey('')
    }
  }

  const saveModDuties = async () => {
    const duties = modRows
      .filter((r) => r.onDutyEmployeeId > 0)
      .map((r) => ({
        dutyScope: r.dutyScope,
        dutyScopeOtherLabel: r.dutyScope === 'Other' ? r.dutyScopeOtherLabel?.trim() || null : null,
        onDutyEmployeeId: r.onDutyEmployeeId,
        notes: r.notes?.trim() || null,
      }))
    setSavingKey('mod')
    try {
      const dto = await postCoordinatorModDuties({ reportDate, duties })
      mergeSavedReport(dto)
      toast.success('MOD duties saved.')
      setModAccordionOpen(false)
    } catch (err) {
      showStatus(err?.response?.data?.message || 'Could not save MOD duties.', 'err')
    } finally {
      setSavingKey('')
    }
  }

  const saveAbsentTeachers = async () => {
    const absentTeachers = absentRows
      .filter((r) => r.employeeId > 0)
      .map((r) => ({
        employeeId: r.employeeId,
        notes: r.notes?.trim() || null,
      }))
    setSavingKey('absent')
    try {
      const dto = await postCoordinatorAbsentTeachers({ reportDate, absentTeachers })
      mergeSavedReport(dto)
      toast.success('Absent teachers saved.')
      setAbsentAccordionOpen(false)
    } catch (err) {
      showStatus(err?.response?.data?.message || 'Could not save absent teachers.', 'err')
    } finally {
      setSavingKey('')
    }
  }

  const saveWorkingLines = async () => {
    const lines = workingLines
      .map((t) => t.trim())
      .filter(Boolean)
      .map((activityDescription, index) => ({
        lineOrder: index + 1,
        activityDescription,
      }))
    setSavingKey('working')
    try {
      const dto = await postCoordinatorWorkingReportLines({ reportDate, lines })
      mergeSavedReport(dto)
      toast.success('Daily working report saved.')
      setWorkingAccordionOpen(false)
    } catch (err) {
      showStatus(err?.response?.data?.message || 'Could not save working report.', 'err')
    } finally {
      setSavingKey('')
    }
  }

  const addModRow = () => {
    const firstId = staff[0]?.id ?? 0
    setModRows((rows) => [...rows, { dutyScope: 'Assembly', dutyScopeOtherLabel: '', onDutyEmployeeId: firstId, notes: '' }])
  }

  const removeModRow = (index) => {
    setModRows((rows) => rows.filter((_, i) => i !== index))
  }

  const addAbsentRow = () => {
    const firstId = staff[0]?.id ?? 0
    setAbsentRows((rows) => [...rows, { employeeId: firstId, notes: '' }])
  }

  const removeAbsentRow = (index) => {
    setAbsentRows((rows) => rows.filter((_, i) => i !== index))
  }

  const addWorkingLine = () => {
    setWorkingLines((lines) => [...lines, ''])
  }

  const removeWorkingLine = (index) => {
    setWorkingLines((lines) => (lines.length <= 1 ? [''] : lines.filter((_, i) => i !== index)))
  }

  const updatedLabel = report?.updatedAtUtc
    ? new Date(report.updatedAtUtc).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : null

  return (
    <EmployeeLayout
      title="Daily coordinator report"
      subtitle={`${campusLabel} · ${formatPakistanWeekdayLong(reportDate)}`}
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
    >
      <section className="emp-surface rounded-2xl p-4">
        <div className="min-w-0">
          <label className="text-sm font-medium text-slate-700" htmlFor="coord-daily-report-date">
            Report date
          </label>
          <div className="mt-1 flex min-w-0 flex-wrap items-stretch gap-2 sm:flex-nowrap">
            <input
              id="coord-daily-report-date"
              type="date"
              min={getPakistanYesterdayIso()}
              max={getPakistanTodayIso()}
              className="min-h-[42px] min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 sm:min-w-[11rem]"
              value={reportDate}
              onChange={(e) => {
                const v = e.target.value
                setReportDate(clampReportDateToPakistanWindow(v || getPakistanTodayIso()))
              }}
            />
            <button
              type="button"
              className="emp-cta-btn emp-cta-btn-primary inline-flex shrink-0 items-center justify-center gap-2 self-stretch px-4 sm:self-auto sm:px-4"
              onClick={loadBundle}
              disabled={isLoadingBundle}
            >
              <RefreshCw size={14} className={isLoadingBundle ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Coordinator: <span className="font-semibold text-slate-700">{employeeName}</span>
          {updatedLabel ? (
            <>
              {' '}
              · Last saved: {updatedLabel}
            </>
          ) : null}
        </p>
        {isLoadingStaff ? <p className="mt-2 text-xs text-slate-500">Loading staff…</p> : null}
        {loadError ? <p className="mt-2 text-sm text-rose-600">{loadError}</p> : null}
        {statusMessage ? (
          <p
            className={`mt-2 text-sm font-medium ${
              statusTone === 'err' ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </section>

      <CoordinatorReportAccordion
        title="Arrival"
        subtitle="Record your arrival time for this date."
        icon={Clock}
        expanded={arrivalAccordionOpen}
        onExpandedChange={setArrivalAccordionOpen}
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Arrival time
            <input
              type="time"
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={saveCtaBtnClass}
            onClick={saveArrival}
            disabled={savingKey === 'arrival'}
          >
            <SaveCtaContents busy={savingKey === 'arrival'} idleLabel="Save arrival" />
          </button>
        </div>
      </CoordinatorReportAccordion>

      <CoordinatorReportAccordion
        title="Students Attendance"
        subtitle="Totals for the selected date (campus attendance)."
        icon={Bell}
      >
        {isLoadingBundle ? (
          <p className="text-sm text-slate-500">Loading attendance…</p>
        ) : classAttendanceSummaries.length === 0 ? (
          <p className="text-sm text-slate-500">No class rows returned for this date.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2 text-right">Present</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {classAttendanceVisibleRows.map((row) => (
                    <tr key={row.classSectionCompositeId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{row.className}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.presentCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.totalCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-indigo-50/60 text-sm font-semibold text-slate-800">
                  <tr>
                    <td className="px-3 py-2">Overall</td>
                    <td className="px-3 py-2 text-right tabular-nums">{attendanceTotals.present}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{attendanceTotals.total}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs font-normal text-slate-600">
                      Attendance: {attendanceTotals.pct}% present ({attendanceTotals.present} / {attendanceTotals.total})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {classAttendanceHiddenCount > 0 ? (
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm active:bg-slate-50"
                onClick={() => setClassAttendanceExpanded((v) => !v)}
                aria-expanded={classAttendanceExpanded}
              >
                {classAttendanceExpanded ? (
                  <>
                    <ChevronUp size={18} aria-hidden />
                    Show fewer classes
                  </>
                ) : (
                  <>
                    <ChevronDown size={18} aria-hidden />
                    Show {classAttendanceHiddenCount} more{' '}
                    {classAttendanceHiddenCount === 1 ? 'class' : 'classes'}
                  </>
                )}
              </button>
            ) : null}
          </>
        )}
      </CoordinatorReportAccordion>

      <CoordinatorReportAccordion
        title="MOD on duty"
        subtitle="One row per duty window (Assembly, Break, etc.)."
        icon={ClipboardList}
        expanded={modAccordionOpen}
        onExpandedChange={setModAccordionOpen}
      >
        <div className="space-y-3">
          {modRows.map((row, index) => (
            <div key={`mod-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <div className="grid items-end gap-2 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-600">
                  Scope
                  <div className="relative mt-1 text-sm">
                    <select
                      className={nativeSelectMatchControlClass}
                      value={row.dutyScope}
                      onChange={(e) => {
                        const v = e.target.value
                        setModRows((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, dutyScope: v } : r)),
                        )
                      }}
                    >
                      {DUTY_SCOPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  On duty
                  <div className="relative mt-1 text-sm">
                    <StaffEmployeeSelect
                      instanceId={`coord-mod-duty-${index}`}
                      valueId={row.onDutyEmployeeId}
                      onChangeId={(id) =>
                        setModRows((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, onDutyEmployeeId: id } : r)),
                        )
                      }
                      options={staffSelectOptions}
                      isLoading={isLoadingStaff}
                    />
                  </div>
                </label>
              </div>
              {row.dutyScope === 'Other' ? (
                <label className="mt-2 block text-xs font-medium text-slate-600">
                  Other label
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    value={row.dutyScopeOtherLabel}
                    onChange={(e) => {
                      const v = e.target.value
                      setModRows((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, dutyScopeOtherLabel: v } : r)),
                      )
                    }}
                    placeholder="Describe duty"
                  />
                </label>
              ) : null}
              <label className="mt-2 block text-xs font-medium text-slate-600">
                Notes
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  value={row.notes}
                  onChange={(e) => {
                    const v = e.target.value
                    setModRows((rows) => rows.map((r, i) => (i === index ? { ...r, notes: v } : r)))
                  }}
                />
              </label>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                onClick={() => removeModRow(index)}
              >
                <Trash2 size={14} />
                Remove row
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="emp-cta-btn emp-cta-btn-primary inline-flex items-center gap-1" onClick={addModRow}>
            <Plus size={14} />
            Add duty
          </button>
          <button
            type="button"
            className={saveCtaBtnClass}
            onClick={saveModDuties}
            disabled={savingKey === 'mod'}
          >
            <SaveCtaContents busy={savingKey === 'mod'} idleLabel="Save MOD duties" />
          </button>
        </div>
      </CoordinatorReportAccordion>

      <CoordinatorReportAccordion
        title="Absent teachers"
        subtitle="Who was absent and any notes for this date."
        icon={UserX}
        expanded={absentAccordionOpen}
        onExpandedChange={setAbsentAccordionOpen}
      >
        <div className="space-y-3">
          {absentRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-center text-xs text-slate-500">
              No absences listed. Tap <span className="font-semibold text-slate-600">Add absent</span> to add a row.
            </p>
          ) : null}
          {absentRows.map((row, index) => (
            <div key={`abs-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <label className="text-xs font-medium text-slate-600">
                Employee
                <div className="relative mt-1 text-sm">
                  <StaffEmployeeSelect
                    instanceId={`coord-absent-${index}`}
                    valueId={row.employeeId}
                    onChangeId={(id) =>
                      setAbsentRows((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, employeeId: id } : r)),
                      )
                    }
                    options={staffSelectOptions}
                    isLoading={isLoadingStaff}
                  />
                </div>
              </label>
              <label className="mt-2 block text-xs font-medium text-slate-600">
                Notes
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  value={row.notes}
                  onChange={(e) => {
                    const v = e.target.value
                    setAbsentRows((rows) => rows.map((r, i) => (i === index ? { ...r, notes: v } : r)))
                  }}
                />
              </label>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                onClick={() => removeAbsentRow(index)}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="emp-cta-btn emp-cta-btn-primary inline-flex items-center gap-1" onClick={addAbsentRow}>
            <Plus size={14} />
            Add absent
          </button>
          <button
            type="button"
            className={saveCtaBtnClass}
            onClick={saveAbsentTeachers}
            disabled={savingKey === 'absent'}
          >
            <SaveCtaContents busy={savingKey === 'absent'} idleLabel="Save absent teachers" />
          </button>
        </div>
      </CoordinatorReportAccordion>

      <CoordinatorReportAccordion
        title="Assembly and morning checks"
        subtitle="Assembly policy, uniform, cleanliness, and class coverage."
        icon={Sunrise}
        expanded={assemblyAccordionOpen}
        onExpandedChange={setAssemblyAccordionOpen}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Assembly as per policy
            <select
              className={nativeSelectMatchControlClass}
              value={assemblyTri}
              onChange={(e) => setAssemblyTri(e.target.value)}
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Moral lesson topic
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              value={moralLessonTopic}
              onChange={(e) => setMoralLessonTopic(e.target.value)}
              placeholder="Topic delivered in assembly"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Uniform check
            <textarea
              className="mt-1 min-h-[4rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              value={uniformCheckNotes}
              onChange={(e) => setUniformCheckNotes(e.target.value)}
              placeholder="Uniform / grooming observations"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Campus cleanliness
            <textarea
              className="mt-1 min-h-[4rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              value={campusCleanlinessNotes}
              onChange={(e) => setCampusCleanlinessNotes(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Teachers in classes
            <textarea
              className="mt-1 min-h-[4rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              value={teachersInClassesNotes}
              onChange={(e) => setTeachersInClassesNotes(e.target.value)}
              placeholder="Placement / coverage notes"
            />
          </label>
        </div>
        <button
          type="button"
          className={`${saveCtaBtnClass} mt-4`}
          onClick={saveAssembly}
          disabled={savingKey === 'assembly'}
        >
          <SaveCtaContents busy={savingKey === 'assembly'} idleLabel="Save assembly & checks" />
        </button>
      </CoordinatorReportAccordion>

      <CoordinatorReportAccordion
        title="Daily working report"
        subtitle="Add points as they happen during the day; saving replaces the list for this date."
        icon={FileText}
        expanded={workingAccordionOpen}
        onExpandedChange={setWorkingAccordionOpen}
      >
        <div className="space-y-3">
          {workingLines.map((line, index) => (
            <div key={`line-${index}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Point {index + 1}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600"
                  onClick={() => removeWorkingLine(index)}
                >
                  Remove
                </button>
              </div>
              <textarea
                className="min-h-[5rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={line}
                onChange={(e) => {
                  const v = e.target.value
                  setWorkingLines((lines) => lines.map((l, i) => (i === index ? v : l)))
                }}
                placeholder="Activity, meeting, observation, follow-up…"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="emp-cta-btn emp-cta-btn-primary inline-flex items-center gap-1" onClick={addWorkingLine}>
            <Plus size={14} />
            Add point
          </button>
          <button
            type="button"
            className={saveCtaBtnClass}
            onClick={saveWorkingLines}
            disabled={savingKey === 'working'}
          >
            <SaveCtaContents busy={savingKey === 'working'} idleLabel="Save working report" />
          </button>
        </div>
      </CoordinatorReportAccordion>
    </EmployeeLayout>
  )
}

export default CoordinatorDailyReportPage

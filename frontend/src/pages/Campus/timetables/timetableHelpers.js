/** Campus timetable formats — matches backend CampusTimeTableFormat. */
export const TT_FORMAT = {
  CLASS_WISE: 1,
  TEACHER_WISE_FREE: 2,
  TEACHER_WISE_FULL: 3,
}

export const TT_FORMAT_META = {
  [TT_FORMAT.CLASS_WISE]: {
    id: TT_FORMAT.CLASS_WISE,
    label: 'Class-wise',
    shortLabel: 'Classes × Periods',
    description: 'Rows are classes. Columns are periods with start–end times.',
    needsClasses: true,
    needsTeachers: false,
    showTimes: true,
    showFreeColumn: false,
    showSerial: false,
    defaultPeriodCount: 8,
  },
  [TT_FORMAT.TEACHER_WISE_FREE]: {
    id: TT_FORMAT.TEACHER_WISE_FREE,
    label: 'Teacher-wise (with Free)',
    shortLabel: 'Teachers × Periods (Free in empty cells)',
    description: 'Rows are teachers. Empty period cells show Free until assigned.',
    needsClasses: false,
    needsTeachers: true,
    showTimes: false,
    showFreeColumn: false,
    showFreeInEmptyCells: true,
    showSerial: false,
    defaultPeriodCount: 6,
  },
  [TT_FORMAT.TEACHER_WISE_FULL]: {
    id: TT_FORMAT.TEACHER_WISE_FULL,
    label: 'Teacher-wise (full)',
    shortLabel: 'Serial + Teachers × Periods',
    description: 'Rows are teachers with serial numbers across all periods.',
    needsClasses: false,
    needsTeachers: true,
    showTimes: false,
    showFreeColumn: false,
    showSerial: true,
    defaultPeriodCount: 8,
  },
}

/** Default High Boys-style day (matches paper sample). */
export const DEFAULT_PERIOD_TIMES = [
  { periodNumber: 1, startTime: '07:45', endTime: '08:25' },
  { periodNumber: 2, startTime: '08:25', endTime: '09:05' },
  { periodNumber: 3, startTime: '09:05', endTime: '09:45' },
  { periodNumber: 4, startTime: '09:45', endTime: '10:25' },
  { periodNumber: 5, startTime: '10:25', endTime: '11:05' },
  { periodNumber: 6, startTime: '11:05', endTime: '11:45' },
  { periodNumber: 7, startTime: '12:10', endTime: '12:50' },
  { periodNumber: 8, startTime: '12:50', endTime: '13:30' },
]

export const buildDefaultPeriods = (count = 8) =>
  DEFAULT_PERIOD_TIMES.slice(0, count).map((p, index) => ({
    periodNumber: p.periodNumber,
    label: `Period ${p.periodNumber}`,
    startTime: p.startTime,
    endTime: p.endTime,
    sortOrder: index + 1,
    isBreak: false,
  }))

export const timeToMinutes = (value) => {
  if (!value || !String(value).includes(':')) return null
  const [h, m] = String(value).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export const minutesToTime = (totalMinutes) => {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const addMinutesToTime = (timeStr, deltaMinutes) => {
  const start = timeToMinutes(timeStr)
  if (start == null || !Number.isFinite(deltaMinutes)) return timeStr || ''
  return minutesToTime(start + deltaMinutes)
}

const isTeachingPeriodRow = (period) => !(period?.isBreak ?? period?.IsBreak)

/**
 * Insert one break after teaching period `afterPeriodNumber` (1-based).
 * Shifts later teaching periods forward by `breakMinutes`; renumbers period numbers.
 */
export const applyBreakToTeachingPeriods = (teachingPeriods, afterPeriodNumber, breakMinutes) => {
  const base = (teachingPeriods || []).filter(isTeachingPeriodRow)
  const after = Number(afterPeriodNumber)
  const mins = Number(breakMinutes)
  if (!base.length || !after || after < 1 || after >= base.length || !mins || mins <= 0) {
    return base.map((p, index) => ({ ...p, sortOrder: index + 1, isBreak: false }))
  }

  const afterIndex = base.findIndex((p) => p.periodNumber === after)
  const sliceIndex = afterIndex >= 0 ? afterIndex : after - 1
  if (sliceIndex < 0 || sliceIndex >= base.length - 1) {
    return base.map((p, index) => ({ ...p, sortOrder: index + 1, isBreak: false }))
  }

  const anchor = base[sliceIndex]
  const breakStart = anchor.endTime
  if (!breakStart) {
    return base.map((p, index) => ({ ...p, sortOrder: index + 1, isBreak: false }))
  }
  const breakEnd = addMinutesToTime(breakStart, mins)

  const before = base.slice(0, sliceIndex + 1).map((p) => ({ ...p, isBreak: false }))
  const afterRows = base.slice(sliceIndex + 1).map((p) => ({
    ...p,
    isBreak: false,
    startTime: addMinutesToTime(p.startTime, mins),
    endTime: addMinutesToTime(p.endTime, mins),
  }))

  const breakRow = {
    periodNumber: after + 1,
    label: 'Break',
    startTime: breakStart,
    endTime: breakEnd,
    sortOrder: sliceIndex + 2,
    isBreak: true,
  }

  const merged = [...before, breakRow, ...afterRows]
  return merged.map((p, index) => ({
    ...p,
    periodNumber: index + 1,
    sortOrder: index + 1,
  }))
}

/** Map display period number (with break inserted) back to base teaching period number. */
export const displayPeriodToBaseNumber = (displayPeriodNumber, breakAfterPeriod, breakEnabled) => {
  const n = Number(displayPeriodNumber)
  if (!breakEnabled) return n
  const after = Number(breakAfterPeriod)
  if (n <= after) return n
  return n - 1
}

const toTeachingDraft = (period, index) => ({
  periodNumber: getId(period, 'periodNumber', 'PeriodNumber') || index + 1,
  label: getText(period, 'label', 'Label') || `Period ${getId(period, 'periodNumber', 'PeriodNumber') || index + 1}`,
  startTime: getText(period, 'startTime', 'StartTime') || '',
  endTime: getText(period, 'endTime', 'EndTime') || '',
  sortOrder: getId(period, 'sortOrder', 'SortOrder') || index + 1,
  isBreak: false,
})

/** Load structure editor state from saved periods (strips break into base times + break settings). */
export const splitPeriodsForBreakEdit = (periods = []) => {
  const sorted = sortPeriods(periods)
  const breakIndex = sorted.findIndex((p) => isBreakPeriod(p))
  if (breakIndex < 0) {
    const base = sorted.map(toTeachingDraft)
    return {
      basePeriods: base.map((p, i) => ({ ...p, periodNumber: i + 1, sortOrder: i + 1 })),
      breakEnabled: false,
      breakAfterPeriod: Math.min(3, Math.max(1, base.length - 1)),
      breakMinutes: 30,
    }
  }

  const breakRow = sorted[breakIndex]
  const startM = timeToMinutes(getText(breakRow, 'startTime', 'StartTime'))
  const endM = timeToMinutes(getText(breakRow, 'endTime', 'EndTime'))
  const breakMinutes = startM != null && endM != null && endM > startM ? endM - startM : 30
  const afterPeriod = breakIndex

  const before = sorted.slice(0, breakIndex).map(toTeachingDraft)
  const after = sorted.slice(breakIndex + 1).map((p, i) => {
    const draft = toTeachingDraft(p, i)
    return {
      ...draft,
      startTime: addMinutesToTime(draft.startTime, -breakMinutes),
      endTime: addMinutesToTime(draft.endTime, -breakMinutes),
    }
  })

  const base = [...before, ...after].map((p, i) => ({
    ...p,
    periodNumber: i + 1,
    sortOrder: i + 1,
  }))

  return {
    basePeriods: base,
    breakEnabled: true,
    breakAfterPeriod: Math.max(1, afterPeriod),
    breakMinutes,
  }
}

export const getId = (item, lower, upper) => Number(item?.[lower] ?? item?.[upper] ?? 0)

export const getText = (item, lower, upper) => item?.[lower] ?? item?.[upper] ?? ''

export const formatClassLabel = (item) => {
  const className = getText(item, 'className', 'ClassName')
  const sectionName = getText(item, 'sectionName', 'SectionName')
  if (!sectionName || className === sectionName) return className || `Class ${getId(item, 'id', 'ID')}`
  if (!className) return sectionName
  return `${className} - ${sectionName}`
}

export const formatTimeRange = (start, end) => {
  if (!start && !end) return ''
  if (start && end) return `${start}-${end}`
  return start || end || ''
}

export const sortPeriods = (periods = []) =>
  [...periods].sort(
    (a, b) =>
      getId(a, 'sortOrder', 'SortOrder') - getId(b, 'sortOrder', 'SortOrder') ||
      getId(a, 'periodNumber', 'PeriodNumber') - getId(b, 'periodNumber', 'PeriodNumber'),
  )

export const isBreakPeriod = (period) => Boolean(period?.isBreak ?? period?.IsBreak)

export const breakLabel = (period) => {
  const label = String(getText(period, 'label', 'Label') || '').trim()
  return label || 'Break'
}

export const periodsToPayload = (periods = []) =>
  periods.map((period, index) => ({
    periodNumber: period.periodNumber,
    label: period.label,
    startTime: period.startTime || null,
    endTime: period.endTime || null,
    sortOrder: period.sortOrder > 0 ? period.sortOrder : index + 1,
    isBreak: Boolean(period.isBreak),
  }))

export const teacherDisplayName = (name, gender) => {
  const full = String(name || '').trim()
  if (!full) return 'Teacher'
  const first = full.split(/\s+/)[0] || full
  const g = String(gender || '').trim().toLowerCase()
  if (g.startsWith('f')) return `Miss ${first}`
  if (g.startsWith('m')) return `Mr ${first}`
  return first
}

export const slotKey = (periodNumber, dayOfWeek = 0) => `${Number(dayOfWeek)}:${Number(periodNumber)}`

export const classSlotKey = (sectionId, periodNumber, dayOfWeek = 0) =>
  `${Number(sectionId)}:${slotKey(periodNumber, dayOfWeek)}`

export const teacherSlotKey = (employeeId, periodNumber, dayOfWeek = 0) =>
  `${Number(employeeId)}:${slotKey(periodNumber, dayOfWeek)}`

export const buildSlotMaps = (slots = []) => {
  const byClass = new Map()
  const byTeacher = new Map()
  slots.forEach((slot) => {
    const sectionId = getId(slot, 'sectionID', 'SectionID')
    const employeeId = getId(slot, 'employeeID', 'EmployeeID')
    const periodNumber = getId(slot, 'periodNumber', 'PeriodNumber')
    const dayOfWeek = getId(slot, 'dayOfWeek', 'DayOfWeek')
    byClass.set(classSlotKey(sectionId, periodNumber, dayOfWeek), slot)
    byTeacher.set(teacherSlotKey(employeeId, periodNumber, dayOfWeek), slot)
  })
  return { byClass, byTeacher }
}

export const slotsToPayload = (slots) =>
  slots.map((slot) => ({
    id: getId(slot, 'id', 'ID') || undefined,
    sectionID: getId(slot, 'sectionID', 'SectionID'),
    subjectID: getId(slot, 'subjectID', 'SubjectID'),
    employeeID: getId(slot, 'employeeID', 'EmployeeID'),
    periodNumber: getId(slot, 'periodNumber', 'PeriodNumber'),
    dayOfWeek: getId(slot, 'dayOfWeek', 'DayOfWeek') || 0,
  }))

export const printTitle = (detail) => {
  const formatType = getId(detail, 'formatType', 'FormatType')
  const title = getText(detail, 'displayTitle', 'DisplayTitle') || getText(detail, 'name', 'Name')
  const subtitle = getText(detail, 'subtitle', 'Subtitle')

  if (formatType === TT_FORMAT.TEACHER_WISE_FULL) {
    return `Teacher Wise TIME TABLE${title ? ` (${title})` : ''}`
  }
  if (formatType === TT_FORMAT.TEACHER_WISE_FREE) {
    const head = `TIME TABLE${title ? ` (${title})` : ''}`
    return subtitle ? `${head} Class: ${subtitle}` : head
  }
  return `TIME TABLE${title ? ` (${title})` : ''}`
}

const plural = (count, singular, pluralLabel = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralLabel}`

/** Readable member/slot summary for listing rows. */
export const formatTimetableSummary = (row) => {
  const periods = getId(row, 'periodCount', 'PeriodCount')
  const classes = getId(row, 'classCount', 'ClassCount')
  const teachers = getId(row, 'teacherCount', 'TeacherCount')
  const slots = getId(row, 'slotCount', 'SlotCount')
  const formatType = getId(row, 'formatType', 'FormatType')

  const parts = []
  if (periods > 0) parts.push(plural(periods, 'period'))
  if (formatType === TT_FORMAT.CLASS_WISE) {
    if (classes > 0) parts.push(plural(classes, 'class', 'classes'))
  } else if (teachers > 0) {
    parts.push(plural(teachers, 'teacher'))
  } else if (classes > 0) {
    parts.push(plural(classes, 'class', 'classes'))
  }
  parts.push(plural(slots, 'slot'))
  return parts.join(' · ')
}

/** Secondary line under name — omit print title when it matches name. */
export const formatTimetableSubline = (row) => {
  const name = String(getText(row, 'name', 'Name') || '').trim()
  const displayTitle = String(getText(row, 'displayTitle', 'DisplayTitle') || '').trim()
  const subtitle = String(getText(row, 'subtitle', 'Subtitle') || '').trim()
  const bits = []
  if (displayTitle && displayTitle.toLowerCase() !== name.toLowerCase()) bits.push(displayTitle)
  if (subtitle) bits.push(subtitle)
  return bits.join(' · ')
}

/** Matches backend CampusDateSheetEntryType. */
export const DS_ENTRY = {
  SUBJECT: 1,
  HOLIDAY: 2,
  REGULAR: 3,
}

export const MAX_NON_SUNDAY_DAYS = 45

export const getId = (item, lower, upper) => Number(item?.[lower] ?? item?.[upper] ?? 0)

export const getText = (item, lower, upper) => item?.[lower] ?? item?.[upper] ?? ''

export const formatClassLevelLabel = (item) =>
  getText(item, 'className', 'ClassName') || `Class ${getId(item, 'id', 'ID')}`

/** Format ISO / DateOnly string as DD-MM-YYYY. */
export const formatExamDate = (value) => {
  if (!value) return ''
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return raw
  return `${d}-${m}-${y}`
}

export const examDateKey = (value) => String(value || '').slice(0, 10)

export const entryKey = (classId, examDate) => `${Number(classId)}:${examDateKey(examDate)}`

/**
 * Same subject must not appear twice for the same class across different dates in one datesheet.
 * Returns the conflicting entry, or null if the subject is free (or the only match is the cell being edited).
 */
export const findSubjectAlreadyUsedInClass = (entries, classIds, subjectId, excludeExamDate) => {
  const sid = Number(subjectId)
  if (!sid) return null
  const excludeDate = examDateKey(excludeExamDate)
  const classSet = new Set((classIds || []).map((id) => Number(id)).filter(Boolean))
  if (classSet.size === 0) return null

  for (const entry of entries || []) {
    const entryType = getId(entry, 'entryType', 'EntryType')
    if (entryType !== DS_ENTRY.SUBJECT) continue
    if (getId(entry, 'subjectID', 'SubjectID') !== sid) continue
    if (!classSet.has(getId(entry, 'classID', 'ClassID'))) continue
    if (examDateKey(getText(entry, 'examDate', 'ExamDate')) === excludeDate) continue
    return entry
  }
  return null
}

/** Subject IDs already scheduled for these classes on other dates (for disabling pickers). */
export const getUsedSubjectIdsForClasses = (entries, classIds, excludeExamDate) => {
  const excludeDate = examDateKey(excludeExamDate)
  const classSet = new Set((classIds || []).map((id) => Number(id)).filter(Boolean))
  const used = new Set()
  for (const entry of entries || []) {
    if (getId(entry, 'entryType', 'EntryType') !== DS_ENTRY.SUBJECT) continue
    const sid = getId(entry, 'subjectID', 'SubjectID')
    if (!sid) continue
    if (!classSet.has(getId(entry, 'classID', 'ClassID'))) continue
    if (examDateKey(getText(entry, 'examDate', 'ExamDate')) === excludeDate) continue
    used.add(sid)
  }
  return used
}

export const countNonSundayDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  let count = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count += 1
  }
  return count
}

export const buildEntryMap = (entries) => {
  const map = new Map()
  ;(entries || []).forEach((entry) => {
    const key = entryKey(getId(entry, 'classID', 'ClassID'), getText(entry, 'examDate', 'ExamDate'))
    map.set(key, entry)
  })
  return map
}

/**
 * Build display columns, merging classes that share MergeGroupKey.
 * Each column: { key, label, classIds[], mergeGroupKey }
 */
export const buildDisplayColumns = (classes) => {
  const ordered = [...(classes || [])].sort(
    (a, b) => getId(a, 'sortOrder', 'SortOrder') - getId(b, 'sortOrder', 'SortOrder'),
  )
  const columns = []
  const seenMerge = new Set()

  ordered.forEach((cls) => {
    const classId = getId(cls, 'classID', 'ClassID')
    const mergeKey = cls.mergeGroupKey ?? cls.MergeGroupKey
    const mergeNum = mergeKey == null || mergeKey === '' ? null : Number(mergeKey)

    if (mergeNum != null && mergeNum > 0) {
      if (seenMerge.has(mergeNum)) return
      seenMerge.add(mergeNum)
      const group = ordered.filter((c) => Number(c.mergeGroupKey ?? c.MergeGroupKey) === mergeNum)
      columns.push({
        key: `merge-${mergeNum}`,
        label: group.map((c) => getText(c, 'className', 'ClassName') || `Class ${getId(c, 'classID', 'ClassID')}`).join(' & '),
        classIds: group.map((c) => getId(c, 'classID', 'ClassID')),
        mergeGroupKey: mergeNum,
      })
      return
    }

    columns.push({
      key: `class-${classId}`,
      label: getText(cls, 'className', 'ClassName') || `Class ${classId}`,
      classIds: [classId],
      mergeGroupKey: null,
    })
  })

  return columns
}

export const resolveCellLabel = (entry) => {
  if (!entry) return ''
  const type = getId(entry, 'entryType', 'EntryType')
  const display = String(getText(entry, 'displayText', 'DisplayText') || '').trim()

  if (type === DS_ENTRY.HOLIDAY) return display || '--Holiday--'
  if (type === DS_ENTRY.REGULAR) return display || '--Regular Class--'

  const subjectLabel =
    String(getText(entry, 'subjectName', 'SubjectName') || '').trim() ||
    String(getText(entry, 'subjectShortName', 'SubjectShortName') || '').trim()

  // Subject + optional extra text → "Mathematics practical"
  if (subjectLabel && display) return `${subjectLabel} ${display}`
  if (display) return display
  if (subjectLabel) return subjectLabel
  return String(getText(entry, 'cellLabel', 'CellLabel') || '').trim()
}

export const isHolidayEntry = (entry) => getId(entry, 'entryType', 'EntryType') === DS_ENTRY.HOLIDAY
export const isRegularEntry = (entry) => getId(entry, 'entryType', 'EntryType') === DS_ENTRY.REGULAR

export const entriesToPayload = (entries) =>
  (entries || []).map((entry) => ({
    id: getId(entry, 'id', 'ID') || undefined,
    classID: getId(entry, 'classID', 'ClassID'),
    examDate: examDateKey(getText(entry, 'examDate', 'ExamDate')),
    entryType: getId(entry, 'entryType', 'EntryType'),
    subjectID: getId(entry, 'subjectID', 'SubjectID') || null,
    displayText: getText(entry, 'displayText', 'DisplayText') || null,
  }))

export const printTitle = (detail) =>
  getText(detail, 'displayTitle', 'DisplayTitle') || getText(detail, 'name', 'Name') || 'Date Sheet'

export const formatDateRangeLabel = (start, end) => {
  const a = formatExamDate(start)
  const b = formatExamDate(end)
  if (a && b) return `${a} – ${b}`
  return a || b || ''
}

export const nextMergeGroupKey = (classes) => {
  let max = 0
  ;(classes || []).forEach((c) => {
    const key = Number(c.mergeGroupKey ?? c.MergeGroupKey ?? 0)
    if (key > max) max = key
  })
  return max + 1
}

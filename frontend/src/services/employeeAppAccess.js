/** Employee portal app-access helpers (coordinators bypass all checks). */

const EMPTY_ACCESS = Object.freeze({
  canMarkStudentAttendance: false,
  canViewStudentAttendance: false,
  canViewSubjectAllocation: false,
  canEditSubjectAllocation: false,
  canViewTimetable: false,
  canEditTimetable: false,
  canViewDatesheet: false,
  canEditDatesheet: false,
  canViewDiary: false,
  canEditDiary: false,
  canAccessLessonPlan: false,
  canViewStudentExamDetail: false,
  canRecordStudentConduct: false,
  canViewStudentConduct: false,
})

const FULL_ACCESS = Object.freeze(
  Object.fromEntries(Object.keys(EMPTY_ACCESS).map((key) => [key, true])),
)

const normalizeAccess = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ACCESS }
  return {
    canMarkStudentAttendance: Boolean(raw.canMarkStudentAttendance),
    canViewStudentAttendance: Boolean(raw.canViewStudentAttendance),
    canViewSubjectAllocation: Boolean(raw.canViewSubjectAllocation),
    canEditSubjectAllocation: Boolean(raw.canEditSubjectAllocation),
    canViewTimetable: Boolean(raw.canViewTimetable),
    canEditTimetable: Boolean(raw.canEditTimetable),
    canViewDatesheet: Boolean(raw.canViewDatesheet),
    canEditDatesheet: Boolean(raw.canEditDatesheet),
    canViewDiary: Boolean(raw.canViewDiary),
    canEditDiary: Boolean(raw.canEditDiary),
    canAccessLessonPlan: Boolean(raw.canAccessLessonPlan),
    canViewStudentExamDetail: Boolean(raw.canViewStudentExamDetail),
    canRecordStudentConduct: Boolean(raw.canRecordStudentConduct),
    canViewStudentConduct: Boolean(raw.canViewStudentConduct),
  }
}

export const readEmployeeUser = () => {
  try {
    const raw = localStorage.getItem('employeeUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const isEmployeeCoordinator = () => Boolean(readEmployeeUser()?.isCoordinator)

const designationName = () => String(readEmployeeUser()?.designation || '').trim().toLowerCase()

export const isEmployeeTeacher = () => {
  const name = designationName()
  return name === 'teacher' || name === 'teachers'
}

export const isEmployeeAdmin = () => {
  const name = designationName()
  return name === 'admin' || name === 'administrator' || name === 'admins'
}

/** Teachers and admins get the personal Home shortcuts, plus any extra modules granted on their profile. */
export const usesPersonalTeachingNav = () =>
  !isEmployeeCoordinator() && (isEmployeeTeacher() || isEmployeeAdmin())

export const getEmployeeAppAccess = () => {
  if (isEmployeeCoordinator()) return { ...FULL_ACCESS }
  return normalizeAccess(readEmployeeUser()?.appAccess)
}

export const hasEmployeeAppAccess = (flag) => {
  if (isEmployeeCoordinator()) return true
  if (!flag) return false
  return Boolean(getEmployeeAppAccess()[flag])
}

export const hasAnyEmployeeAppAccess = (...flags) => {
  if (isEmployeeCoordinator()) return true
  const access = getEmployeeAppAccess()
  return flags.some((flag) => Boolean(access[flag]))
}

export { EMPTY_ACCESS, FULL_ACCESS, normalizeAccess }

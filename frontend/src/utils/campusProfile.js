import { getCampusLabel } from '../constants/branding'
import {
  getCampusSchoolNameDisplay,
  resolveCampusLogoSrc,
} from './campusBranding'

const CAMPUS_PROFILE_KEY = 'campusProfile'

export const getStoredCampusProfile = () => {
  try {
    const raw = localStorage.getItem(CAMPUS_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export const CAMPUS_PROFILE_CHANGED_EVENT = 'campus-profile-changed'

export const BIOMETRIC_ATTENDANCE_TYPES = {
  Kiosk: 'Kiosk',
  ZkTeco: 'ZkTeco',
}

export const normalizeBiometricAttendanceType = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  return raw === 'kiosk' ? BIOMETRIC_ATTENDANCE_TYPES.Kiosk : BIOMETRIC_ATTENDANCE_TYPES.ZkTeco
}

export const isKioskAttendance = (profile) =>
  normalizeBiometricAttendanceType(profile?.biometricAttendanceType) === BIOMETRIC_ATTENDANCE_TYPES.Kiosk

export const isZkTecoAttendance = (profile) => !isKioskAttendance(profile)

const notifyCampusProfileChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CAMPUS_PROFILE_CHANGED_EVENT))
}

export const persistCampusProfile = (profile) => {
  if (profile && typeof profile === 'object') {
    localStorage.setItem(CAMPUS_PROFILE_KEY, JSON.stringify(normalizeCampusProfile(profile)))
  } else {
    localStorage.removeItem(CAMPUS_PROFILE_KEY)
  }
  notifyCampusProfileChanged()
}

export const clearCampusProfile = () => {
  localStorage.removeItem(CAMPUS_PROFILE_KEY)
  notifyCampusProfileChanged()
}

const trimStr = (value) => {
  if (value == null) return ''
  return String(value).trim()
}

const toOptionalYear = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return null
  return Math.trunc(n)
}

const toOptionalMonth = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 12) return null
  return Math.trunc(n)
}

const toTimeInputValue = (value) => {
  if (value == null) return ''
  const text = String(value).trim()
  if (!text) return ''
  const short = text.length >= 5 ? text.slice(0, 5) : text
  return /^\d{2}:\d{2}$/.test(short) ? short : ''
}

const toMinutes = (value, fallback) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const minutes = Math.trunc(n)
  if (minutes < 0) return 0
  return minutes > 1440 ? 1440 : minutes
}

/**
 * Parse institute Session label as YYYY-YYYY (end year >= start year).
 * @returns {{ startYear: number, endYear: number, label: string } | null}
 */
export function parseSessionLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/)
  if (!match) return null
  const startYear = toOptionalYear(match[1])
  const endYear = toOptionalYear(match[2])
  if (startYear == null || endYear == null) return null
  if (endYear < startYear) return null
  return {
    startYear,
    endYear,
    label: `${startYear}-${endYear}`,
  }
}

export function buildSessionLabel(startYear, endYear) {
  const start = toOptionalYear(startYear)
  const end = toOptionalYear(endYear)
  if (start == null || end == null || end < start) return ''
  return `${start}-${end}`
}

/**
 * Resolve session bounds from profile columns, then SessionLabel, then Feb→Jan defaults.
 */
export function resolveSessionBounds(profile) {
  const startMonth = toOptionalMonth(profile?.sessionStartMonth ?? profile?.SessionStartMonth)
  const startYear = toOptionalYear(profile?.sessionStartYear ?? profile?.SessionStartYear)
  const endMonth = toOptionalMonth(profile?.sessionEndMonth ?? profile?.SessionEndMonth)
  const endYear = toOptionalYear(profile?.sessionEndYear ?? profile?.SessionEndYear)

  if (startMonth && startYear && endMonth && endYear) {
    const start = new Date(startYear, startMonth - 1, 1)
    const end = new Date(endYear, endMonth - 1, 1)
    if (end >= start) {
      return {
        startMonth,
        startYear,
        endMonth,
        endYear,
        label: buildSessionLabel(startYear, endYear),
      }
    }
  }

  const fromLabel = parseSessionLabel(profile?.sessionLabel ?? profile?.SessionLabel)
  if (fromLabel) {
    return {
      startMonth: 2,
      startYear: fromLabel.startYear,
      endMonth: 1,
      endYear: fromLabel.endYear,
      label: fromLabel.label,
    }
  }

  const year = new Date().getFullYear()
  return {
    startMonth: 2,
    startYear: year,
    endMonth: 1,
    endYear: year + 1,
    label: `${year}-${year + 1}`,
  }
}

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export function formatMonthYear(month, year) {
  const m = toOptionalMonth(month)
  const y = toOptionalYear(year)
  if (!m || !y) return ''
  const name = MONTH_OPTIONS.find((opt) => opt.value === m)?.label || String(m)
  return `${name} ${y}`
}

export function normalizeCampusProfile(raw) {
  const feeYear1 = toOptionalYear(raw?.feeYear1 ?? raw?.FeeYear1)
  const feeYear2 = toOptionalYear(raw?.feeYear2 ?? raw?.FeeYear2)
  const feeYear3 = toOptionalYear(raw?.feeYear3 ?? raw?.FeeYear3)
  const fromList = Array.isArray(raw?.feeYears ?? raw?.FeeYears)
    ? (raw.feeYears || raw.FeeYears).map(toOptionalYear).filter(Boolean)
    : []
  const feeYears = [...new Set(
    fromList.length
      ? fromList
      : [feeYear1, feeYear2, feeYear3].filter(Boolean),
  )].sort((a, b) => a - b)

  const session = resolveSessionBounds(raw)

  return {
    id: Number(raw?.id ?? raw?.Id) || 0,
    schoolName: trimStr(raw?.schoolName ?? raw?.SchoolName) || null,
    schoolLogo: trimStr(raw?.schoolLogo ?? raw?.SchoolLogo) || null,
    campusLabel: trimStr(raw?.campusLabel ?? raw?.CampusLabel) || null,
    streetAddress: trimStr(raw?.streetAddress ?? raw?.StreetAddress) || null,
    address: trimStr(raw?.address ?? raw?.Address) || null,
    phone1: trimStr(raw?.phone1 ?? raw?.Phone1) || null,
    phone2: trimStr(raw?.phone2 ?? raw?.Phone2) || null,
    landline: trimStr(raw?.landline ?? raw?.Landline) || null,
    email: trimStr(raw?.email ?? raw?.Email) || null,
    showPhone1OnInvoice: Boolean(raw?.showPhone1OnInvoice ?? raw?.ShowPhone1OnInvoice ?? true),
    showPhone2OnInvoice: Boolean(raw?.showPhone2OnInvoice ?? raw?.ShowPhone2OnInvoice),
    showLandlineOnInvoice: Boolean(raw?.showLandlineOnInvoice ?? raw?.ShowLandlineOnInvoice ?? true),
    sessionLabel: session.label || trimStr(raw?.sessionLabel ?? raw?.SessionLabel) || null,
    sessionStartMonth: session.startMonth,
    sessionStartYear: session.startYear,
    sessionEndMonth: session.endMonth,
    sessionEndYear: session.endYear,
    feeYear1,
    feeYear2,
    feeYear3,
    feeYears,
    receiptFooterNote: trimStr(raw?.receiptFooterNote ?? raw?.ReceiptFooterNote) || null,
    showAddressOnReceipts: Boolean(raw?.showAddressOnReceipts ?? raw?.ShowAddressOnReceipts ?? true),
    biometricAttendanceType: normalizeBiometricAttendanceType(
      raw?.biometricAttendanceType ?? raw?.BiometricAttendanceType,
    ),
    teacherCheckInTime:
      toTimeInputValue(raw?.teacherCheckInTime ?? raw?.TeacherCheckInTime) || '07:15',
    teacherCheckOutTime:
      toTimeInputValue(raw?.teacherCheckOutTime ?? raw?.TeacherCheckOutTime) || '13:30',
    adminEarlyMinutes: toMinutes(raw?.adminEarlyMinutes ?? raw?.AdminEarlyMinutes, 30),
    coordinatorEarlyMinutes: toMinutes(
      raw?.coordinatorEarlyMinutes ?? raw?.CoordinatorEarlyMinutes,
      15,
    ),
    fridayCheckOutTime:
      toTimeInputValue(raw?.fridayCheckOutTime ?? raw?.FridayCheckOutTime) || '12:30',
  }
}

function buildPhonesDisplay(profile) {
  const parts = []
  if (profile.showPhone1OnInvoice && profile.phone1) parts.push(profile.phone1)
  if (profile.showPhone2OnInvoice && profile.phone2) parts.push(profile.phone2)
  if (profile.showLandlineOnInvoice && profile.landline) parts.push(profile.landline)
  return parts.join(' / ')
}

function defaultFeeYears() {
  const current = new Date().getFullYear()
  return [current, current + 1]
}

/**
 * Shared branding/meta for fee receipts and Student / Fee / Attendance / Exam report headers.
 */
export function getCampusPrintMeta() {
  const campusCode =
    localStorage.getItem('campus') || localStorage.getItem('employeeCampus') || ''
  const profile = getStoredCampusProfile()
  const normalized = profile ? normalizeCampusProfile(profile) : null
  const schoolName = getCampusSchoolNameDisplay(normalized)
  const campusLabel =
    normalized?.campusLabel || getCampusLabel(campusCode) || campusCode.toUpperCase() || ''

  const phonesDisplay = normalized ? buildPhonesDisplay(normalized) : ''

  const addressLines = []
  if (normalized?.showAddressOnReceipts !== false) {
    if (normalized?.streetAddress) addressLines.push(normalized.streetAddress)
    if (normalized?.address) addressLines.push(normalized.address)
  }

  const feeYears =
    normalized?.feeYears?.length > 0 ? normalized.feeYears : defaultFeeYears()

  const session = resolveSessionBounds(normalized || {})

  return {
    campusCode,
    schoolName,
    campusLabel,
    logoSrc: resolveCampusLogoSrc(normalized),
    streetAddress: normalized?.streetAddress || '',
    address: normalized?.address || '',
    addressLines,
    addressDisplay: addressLines.join(', '),
    phone1: normalized?.phone1 || '',
    phone2: normalized?.phone2 || '',
    landline: normalized?.landline || '',
    phonesDisplay,
    /** @deprecated use phonesDisplay — kept for older call sites */
    campusPhone: phonesDisplay,
    email: normalized?.email || '',
    sessionLabel: session.label,
    sessionStartMonth: session.startMonth,
    sessionStartYear: session.startYear,
    sessionEndMonth: session.endMonth,
    sessionEndYear: session.endYear,
    receiptFooterNote: normalized?.receiptFooterNote || '',
    showAddressOnReceipts: normalized?.showAddressOnReceipts !== false,
    feeYears,
  }
}

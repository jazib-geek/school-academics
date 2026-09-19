import { SCHOOL_LOGO_PATH } from '../../../constants/branding'
import { getCampusPrintMeta } from '../../../utils/campusProfile'

export const EXAM_PRINT_LANDSCAPE_LAYOUTS = new Set(['fancy-card', 'award-12col', 'award-subjects'])

export function getExamPrintMeta() {
  const meta = getCampusPrintMeta()
  return {
    campusCode: meta.campusCode,
    campusPhone: meta.phonesDisplay,
    campusLabel: meta.campusLabel,
    schoolName: meta.schoolName,
    sessionLabel: meta.sessionLabel,
    logoSrc: SCHOOL_LOGO_PATH,
  }
}

export function formatPrintDate(value) {
  if (!value) return ''
  const dateObj = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dateObj.getTime())) return String(value)
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${dateObj.getFullYear()}`
}

export function dash(value) {
  if (value == null || value === '') return '-'
  return String(value)
}

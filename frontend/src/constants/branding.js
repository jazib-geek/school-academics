import schoolLogo from '../assets/logo.png'

export const SCHOOL_NAME = 'Science Base School'
export const SCHOOL_LOGO_PATH = schoolLogo

export const CAMPUS_LABELS = {
  local: 'Local',
  main: 'Satellite Town Campus',
  mt: 'Model Town Campus',
  pc: 'Peoples Colony Campus',
  nc: 'Naseem Campus',
  gt: 'GT Road Campus',
  dc: 'DC Road Campus',
  mc: 'Master City Campus',
  wtl: 'Wapda Town Lahore',
  citi: 'Citi Housing Campus',
}

export const CAMPUS_OPTIONS = [
  { value: 'local', label: CAMPUS_LABELS.local },
  { value: 'main', label: CAMPUS_LABELS.main },
  { value: 'mt', label: CAMPUS_LABELS.mt },
  { value: 'pc', label: CAMPUS_LABELS.pc },
  { value: 'nc', label: CAMPUS_LABELS.nc },
  { value: 'gt', label: CAMPUS_LABELS.gt },
  { value: 'dc', label: CAMPUS_LABELS.dc },
  { value: 'mc', label: CAMPUS_LABELS.mc },
  { value: 'wtl', label: CAMPUS_LABELS.wtl },
  { value: 'citi', label: CAMPUS_LABELS.citi },
]

export const getCampusLabel = (campusCode) => {
  const key = String(campusCode || '').trim().toLowerCase()
  return CAMPUS_LABELS[key] || key.toUpperCase() || 'N/A'
}

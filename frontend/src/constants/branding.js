import schoolLogo from '../assets/logo.png'

export const SCHOOL_NAME = 'Science Base School'
export const SCHOOL_LOGO_PATH = schoolLogo

export const CAMPUS_LABELS = {
  main: 'Satellite Town Campus',
  mt: 'Model Town Campus',
  pc: 'Peoples Colony Campus',
  nc: 'Naseem Campus',
  gt: 'GT Road Campus',
  mc: 'Master City Campus',
  wtl: 'Wapd Town Lhr',
  citi: 'Citi Housing Campus',
  dc: 'DC Road Campus',
  demo: 'Demo Campus',
  local: 'Local',
}

export const CAMPUS_ORDER = ['demo', 'main', 'mt', 'pc', 'nc', 'gt', 'mc', 'wtl', 'citi', 'dc', 'local']

export const CAMPUS_OPTIONS = [
  ...CAMPUS_ORDER.map((value) => ({ value, label: CAMPUS_LABELS[value] })),
]

export const getCampusLabel = (campusCode) => {
  const key = String(campusCode || '').trim().toLowerCase()
  return CAMPUS_LABELS[key] || key.toUpperCase() || 'N/A'
}

export const getCampusSortRank = (campusCode) => {
  const key = String(campusCode || '').trim().toLowerCase()
  const index = CAMPUS_ORDER.indexOf(key)
  return index === -1 ? CAMPUS_ORDER.length : index
}

export const sortCampusItems = (items, keySelector = (item) => item?.campus ?? item?.key ?? item?.value) =>
  [...(items || [])].sort((a, b) => {
    const rankA = getCampusSortRank(keySelector(a))
    const rankB = getCampusSortRank(keySelector(b))
    if (rankA !== rankB) return rankA - rankB
    return getCampusLabel(keySelector(a)).localeCompare(getCampusLabel(keySelector(b)))
  })

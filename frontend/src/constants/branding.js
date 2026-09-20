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

const isLocalCampusKey = (value) => String(value || '').trim().toLowerCase() === 'local'

/** Parsed from VITE_CAMPUS_ALLOWLIST (comma-separated). Empty = no restriction. */
export const parseCampusAllowlist = () => {
  const raw = import.meta.env.VITE_CAMPUS_ALLOWLIST
  if (raw == null || String(raw).trim() === '') return []
  return String(raw)
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

const campusAllowlist = parseCampusAllowlist()

export const isCampusAllowedInApp = (campusKey) => {
  const key = String(campusKey || '').trim().toLowerCase()
  if (!key) return false
  if (campusAllowlist.length === 0) return true
  return campusAllowlist.includes(key)
}

/** Login dropdown, employee login, super-admin campus switcher. */
export const getAppCampusOptions = () => {
  let options = CAMPUS_OPTIONS
  if (import.meta.env.PROD) {
    options = options.filter((item) => !isLocalCampusKey(item.value))
  }
  if (campusAllowlist.length > 0) {
    options = options.filter((item) => campusAllowlist.includes(item.value))
  }
  return options
}

/** Org-wide dashboard tab; off when this build is scoped to specific campuses only. */
export const showAllCampusesDashboard = () => campusAllowlist.length === 0

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

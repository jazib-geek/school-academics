import academicApi from './academicApi'

const INSTITUTE_SETTINGS_KEY = 'academicInstituteSettings'
const PERMISSIONS_KEY = 'academicPermissions'

export const getStoredAcademicInstituteSettings = () => {
  try {
    const raw = localStorage.getItem(INSTITUTE_SETTINGS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const persistAcademicInstituteSettings = (settings) => {
  if (settings && typeof settings === 'object') {
    localStorage.setItem(INSTITUTE_SETTINGS_KEY, JSON.stringify(settings))
  } else {
    localStorage.removeItem(INSTITUTE_SETTINGS_KEY)
  }
}

export const getStoredAcademicPermissions = () => {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((code) => String(code).toLowerCase()) : []
  } catch {
    return []
  }
}

export const persistAcademicPermissions = (codes) => {
  if (Array.isArray(codes)) {
    localStorage.setItem(
      PERMISSIONS_KEY,
      JSON.stringify(codes.map((code) => String(code).toLowerCase())),
    )
  } else {
    localStorage.removeItem(PERMISSIONS_KEY)
  }
}

export const hasAcademicPermission = (code) => {
  if (!code) return false
  const granted = getStoredAcademicPermissions()
  return granted.includes(String(code).toLowerCase())
}

export const hasAnyAcademicPermission = (...codes) =>
  codes.some((code) => hasAcademicPermission(code))

export const academicLogin = async ({ username, password }) => {
  const response = await academicApi.post('/api/academics/auth/login', {
    userName: username,
    password,
  })

  const payload = response?.data?.data || {}
  localStorage.setItem('academicToken', payload?.token || '')
  localStorage.setItem('academicUsername', payload?.userName || username)
  persistAcademicInstituteSettings(payload?.instituteSettings ?? null)
  persistAcademicPermissions(payload?.grantedPermissionCodes || [])

  return payload
}

export const academicLogout = () => {
  localStorage.removeItem('academicToken')
  localStorage.removeItem('academicUsername')
  localStorage.removeItem(INSTITUTE_SETTINGS_KEY)
  localStorage.removeItem(PERMISSIONS_KEY)
}

export const isAcademicAuthenticated = () => Boolean(localStorage.getItem('academicToken'))

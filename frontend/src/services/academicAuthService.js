import academicApi from './academicApi'

const INSTITUTE_SETTINGS_KEY = 'academicInstituteSettings'

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

export const academicLogin = async ({ username, password }) => {
  const response = await academicApi.post('/api/academics/auth/login', {
    userName: username,
    password,
  })

  const payload = response?.data?.data || {}
  localStorage.setItem('academicToken', payload?.token || '')
  localStorage.setItem('academicUsername', payload?.userName || username)
  persistAcademicInstituteSettings(payload?.instituteSettings ?? null)

  return payload
}

export const academicLogout = () => {
  localStorage.removeItem('academicToken')
  localStorage.removeItem('academicUsername')
  localStorage.removeItem(INSTITUTE_SETTINGS_KEY)
}

export const isAcademicAuthenticated = () => Boolean(localStorage.getItem('academicToken'))

import api from './api'
import { normalizeAccess } from './employeeAppAccess'

const EMPLOYEE_LOGIN_PATH = import.meta.env.VITE_EMPLOYEE_LOGIN_PATH || '/api/auth/employee-login'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'Campus'

const readEmployeeUser = () => {
  try {
    return JSON.parse(localStorage.getItem('employeeUser') || '{}')
  } catch {
    return {}
  }
}

export const persistEmployeeProfile = ({ id, name, gender, designation, isCoordinator, appAccess } = {}) => {
  const prev = readEmployeeUser()
  const next = {
    ...prev,
    ...(id != null ? { id } : {}),
    ...(name != null ? { name } : {}),
    ...(gender != null && gender !== '' ? { gender } : {}),
    ...(designation != null ? { designation } : {}),
    ...(isCoordinator != null ? { isCoordinator } : {}),
    ...(appAccess != null ? { appAccess } : {}),
  }

  if (name) localStorage.setItem('employeeName', name)
  if (gender) localStorage.setItem('employeeGender', gender)
  if (designation) localStorage.setItem('employeeDesignation', designation)
  localStorage.setItem('employeeUser', JSON.stringify(next))
}

export const getEmployeeGender = () =>
  localStorage.getItem('employeeGender') || readEmployeeUser().gender || ''

export const getEmployeeDesignation = () =>
  localStorage.getItem('employeeDesignation') || readEmployeeUser().designation || ''

const mapEmployeeLoginResponse = (data) => {
  const payload = data?.data || data

  return {
    token: payload?.token || '',
    employee: {
      id: payload?.id ?? payload?.ID,
      name: payload?.employeeName || '',
      gender: payload?.gender ?? payload?.Gender ?? '',
      designation: payload?.designation || '',
      branchId: payload?.branchID ?? null,
      isCoordinator: Boolean(payload?.isCoordinator),
      appAccess: normalizeAccess(payload?.appAccess),
    },
  }
}

export const employeeLoginWithCampus = async ({ campus, username, password }) => {
  const response = await api.post(
    EMPLOYEE_LOGIN_PATH,
    {
      username: String(username || '').trim(),
      password,
    },
    {
      headers: {
        [CAMPUS_HEADER]: campus,
      },
    },
  )

  const mapped = mapEmployeeLoginResponse(response.data)
  localStorage.setItem('employeeCampus', campus)
  localStorage.setItem('employeeId', String(mapped.employee.id ?? ''))
  localStorage.setItem('employeeName', mapped.employee.name || '')
  localStorage.setItem('employeeUser', JSON.stringify(mapped.employee))

  persistEmployeeProfile({
    id: mapped.employee.id,
    name: mapped.employee.name,
    gender: mapped.employee.gender,
    designation: mapped.employee.designation,
    isCoordinator: mapped.employee.isCoordinator,
    appAccess: mapped.employee.appAccess,
  })

  if (mapped.token) {
    localStorage.setItem('employeeToken', mapped.token)
  }

  return mapped
}

/** Backfill gender/designation for sessions created before profile fields were stored. */
export const ensureEmployeeProfile = async () => {
  const gender = getEmployeeGender()
  const designation = getEmployeeDesignation()
  if (gender) return { gender, designation }

  try {
    const response = await api.get('/api/auth/employee-session')
    const payload = response?.data?.data || response?.data
    if (!payload) return { gender, designation }

    persistEmployeeProfile({
      id: payload.id ?? payload.ID,
      name: payload.employeeName,
      gender: payload.gender ?? payload.Gender ?? '',
      designation: payload.designation ?? payload.Designation ?? '',
    })

    return {
      gender: getEmployeeGender(),
      designation: getEmployeeDesignation(),
    }
  } catch {
    return { gender, designation }
  }
}

export const changeEmployeePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await api.post('/api/auth/employee-change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  })
  return response?.data
}

export const employeeLogout = () => {
  // Keep `employeeCampus` so the login dropdown can preselect the last campus.
  localStorage.removeItem('employeeId')
  localStorage.removeItem('employeeName')
  localStorage.removeItem('employeeGender')
  localStorage.removeItem('employeeDesignation')
  localStorage.removeItem('employeeToken')
  localStorage.removeItem('employeeUser')
}

export const isEmployeeAuthenticated = () =>
  Boolean(localStorage.getItem('employeeToken') || localStorage.getItem('employeeId'))

export { isEmployeeCoordinator } from './employeeAppAccess'

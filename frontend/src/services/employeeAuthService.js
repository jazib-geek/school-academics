import api from './api'
import { persistCampusProfile, clearCampusProfile } from '../utils/campusProfile'
import { DEFAULT_MOCK_COORDINATOR_WING } from '../utils/proformaWings'
import { normalizeAccess } from './employeeAppAccess'

const EMPLOYEE_LOGIN_PATH = import.meta.env.VITE_EMPLOYEE_LOGIN_PATH || '/api/auth/employee-login'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'X-Campus'

const readEmployeeUser = () => {
  try {
    return JSON.parse(localStorage.getItem('employeeUser') || '{}')
  } catch {
    return {}
  }
}

export const persistEmployeeProfile = ({ id, name, gender, designation, isCoordinator, wingCode, isAcademicHead, isDisciplineIncharge, appAccess } = {}) => {
  const prev = readEmployeeUser()
  const next = {
    ...prev,
    ...(id != null ? { id } : {}),
    ...(name != null ? { name } : {}),
    ...(gender != null && gender !== '' ? { gender } : {}),
    ...(designation != null ? { designation } : {}),
    ...(isCoordinator != null ? { isCoordinator } : {}),
    ...(wingCode != null && wingCode !== '' ? { wingCode } : {}),
    ...(isAcademicHead != null ? { isAcademicHead } : {}),
    ...(isDisciplineIncharge != null ? { isDisciplineIncharge } : {}),
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

/** Coordinator proforma default wing (API will supply after login). */
export const getEmployeeWingCode = () =>
  readEmployeeUser().wingCode || DEFAULT_MOCK_COORDINATOR_WING

export const isEmployeeAcademicHead = () => Boolean(readEmployeeUser().isAcademicHead)

export const isEmployeeDisciplineIncharge = () => Boolean(readEmployeeUser().isDisciplineIncharge)

export const ACADEMIC_HEAD_DESIGNATION_LABEL = 'Academic Head'

/** User-facing designation; academic heads always show as Academic Head. */
export const getEmployeeDisplayDesignation = () =>
  isEmployeeAcademicHead() ? ACADEMIC_HEAD_DESIGNATION_LABEL : getEmployeeDesignation()

const designationFromAuthPayload = (payload) => {
  const isHead = Boolean(payload?.isAcademicHead ?? payload?.IsAcademicHead)
  if (isHead) return ACADEMIC_HEAD_DESIGNATION_LABEL
  return payload?.designation ?? payload?.Designation ?? ''
}

const mapEmployeeLoginResponse = (data) => {
  const payload = data?.data || data

  return {
    token: payload?.token || '',
    employee: {
      id: payload?.id ?? payload?.ID,
      name: payload?.employeeName || '',
      gender: payload?.gender ?? payload?.Gender ?? '',
      designation: designationFromAuthPayload(payload),
      branchId: payload?.branchID ?? null,
      isCoordinator: Boolean(payload?.isCoordinator),
      wingCode: payload?.wingCode || payload?.WingCode || '',
      isAcademicHead: Boolean(payload?.isAcademicHead ?? payload?.IsAcademicHead),
      isDisciplineIncharge: Boolean(payload?.isDisciplineIncharge ?? payload?.IsDisciplineIncharge),
      appAccess: normalizeAccess(payload?.appAccess),
    },
    campusProfile: payload?.campusProfile || payload?.CampusProfile || null,
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
    wingCode: mapped.employee.wingCode,
    isAcademicHead: mapped.employee.isAcademicHead,
    isDisciplineIncharge: mapped.employee.isDisciplineIncharge,
    name: mapped.employee.name,
    gender: mapped.employee.gender,
    designation: mapped.employee.designation,
    isCoordinator: mapped.employee.isCoordinator,
    appAccess: mapped.employee.appAccess,
  })

  if (mapped.token) {
    localStorage.setItem('employeeToken', mapped.token)
  }

  persistCampusProfile(mapped.campusProfile)

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
      designation: designationFromAuthPayload(payload),
      wingCode: payload.wingCode ?? payload.WingCode ?? '',
      isAcademicHead: Boolean(payload.isAcademicHead ?? payload.IsAcademicHead),
      isDisciplineIncharge: Boolean(payload.isDisciplineIncharge ?? payload.IsDisciplineIncharge),
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
  clearCampusProfile()
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

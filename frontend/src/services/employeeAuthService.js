import api from './api'

const EMPLOYEE_LOGIN_PATH = import.meta.env.VITE_EMPLOYEE_LOGIN_PATH || '/api/auth/employee-login'
const CAMPUS_HEADER = import.meta.env.VITE_CAMPUS_HEADER || 'Campus'

const mapEmployeeLoginResponse = (data) => {
  const payload = data?.data || data

  return {
    token: payload?.token || '',
    employee: {
      id: payload?.id,
      name: payload?.employeeName || '',
      designation: payload?.designation || '',
      branchId: payload?.branchID ?? null,
      isCoordinator: Boolean(payload?.isCoordinator),
    },
  }
}

export const employeeLoginWithCampus = async ({ campus, employeeId, password }) => {
  const response = await api.post(
    EMPLOYEE_LOGIN_PATH,
    {
      id: Number(employeeId),
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
  localStorage.setItem('employeeId', String(mapped.employee.id ?? employeeId))
  localStorage.setItem('employeeName', mapped.employee.name || '')
  localStorage.setItem('employeeUser', JSON.stringify(mapped.employee))

  if (mapped.token) {
    localStorage.setItem('employeeToken', mapped.token)
  }

  return mapped
}

export const employeeLogout = () => {
  localStorage.removeItem('employeeCampus')
  localStorage.removeItem('employeeId')
  localStorage.removeItem('employeeName')
  localStorage.removeItem('employeeToken')
  localStorage.removeItem('employeeUser')
}

export const isEmployeeAuthenticated = () =>
  Boolean(localStorage.getItem('employeeToken') || localStorage.getItem('employeeId'))

export const isEmployeeCoordinator = () => {
  try {
    const raw = localStorage.getItem('employeeUser')
    if (!raw) return false
    const user = JSON.parse(raw)
    return Boolean(user?.isCoordinator)
  } catch {
    return false
  }
}

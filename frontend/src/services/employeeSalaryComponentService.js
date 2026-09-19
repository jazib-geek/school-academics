import api from './api'

const BASE = '/api/campus/employee-salary-components'

export const getEmployeeSalaryComponents = async (employeeId) => {
  const response = await api.get(BASE, { params: { employeeId } })
  return response?.data?.data || []
}

export const getEmployeeSalaryPeriodStatus = async ({ employeeId, month, year }) => {
  const response = await api.get(`${BASE}/salary-status`, {
    params: { employeeId, month, year },
  })
  return response?.data?.data
}

/** Logged-in employee portal: adjustments for the signed-in employee only. */
export const getMyEmployeeSalaryComponents = async () => {
  const response = await api.get(`${BASE}/my`)
  return response?.data?.data || []
}

export const getMyEmployeeSalaryPeriodStatus = async ({ month, year }) => {
  const response = await api.get(`${BASE}/my/salary-status`, {
    params: { month, year },
  })
  return response?.data?.data
}

export const upsertEmployeeSalaryComponent = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const deleteEmployeeSalaryComponent = async (id) => {
  const response = await api.post(`${BASE}/${id}/delete`)
  return response?.data
}

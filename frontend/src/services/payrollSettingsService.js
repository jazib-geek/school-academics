import api from './api'

const BASE = '/api/campus/payroll-settings'

export const getPayrollSettings = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || { teaAllowance: 0 }
}

export const updatePayrollSettings = async (payload) => {
  const response = await api.post(`${BASE}/update`, payload)
  return response?.data?.data
}

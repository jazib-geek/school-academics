import api from './api'

const BASE = '/api/campus/employees'

export const getEmployees = async (params) => {
  const response = await api.get(BASE, { params })
  return response?.data?.data
}

export const getAllActiveEmployees = async () => {
  const pageSize = 100
  const items = []
  let pageNumber = 1

  for (;;) {
    const data = await getEmployees({
      isActive: true,
      pageNumber,
      pageSize,
    })
    const pageItems = data?.items || []
    items.push(...pageItems)
    const totalPages = Number(data?.totalPages) || 0
    if (pageItems.length === 0 || pageNumber >= totalPages || pageItems.length < pageSize) break
    pageNumber += 1
    if (pageNumber > 50) break
  }

  return items
}

export const getEmployee = async (id) => {
  const response = await api.get(`${BASE}/${id}`)
  return response?.data?.data
}

export const getEmployeeLookups = async () => {
  const response = await api.get(`${BASE}/lookups`)
  return response?.data?.data || { designations: [], localities: [] }
}

export const createEmployee = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateEmployee = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setEmployeeStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/${id}/status`, { isActive })
  return response?.data
}

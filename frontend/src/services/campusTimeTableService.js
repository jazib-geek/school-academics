import api from './api'

const BASE = '/api/campus/timetables'

export const getTimetables = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || []
}

export const getMyTimetable = async () => {
  const response = await api.get(`${BASE}/mine`)
  return response?.data?.data
}

export const getTimetable = async (id) => {
  const response = await api.get(`${BASE}/${id}`)
  return response?.data?.data
}

export const getTimetablePrint = async (id) => {
  const response = await api.get(`${BASE}/${id}/print`)
  return response?.data?.data
}

export const getTimetableAllocationCandidates = async (id) => {
  const response = await api.get(`${BASE}/${id}/allocation-candidates`)
  return response?.data?.data || []
}

export const createTimetable = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateTimetable = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setTimetableDefault = async (id) => {
  const response = await api.post(`${BASE}/${id}/set-default`)
  return response?.data
}

export const clearTimetableDefault = async (id) => {
  const response = await api.post(`${BASE}/${id}/clear-default`)
  return response?.data
}

export const replaceTimetablePeriods = async (id, periods) => {
  const response = await api.post(`${BASE}/${id}/periods`, { periods })
  return response?.data?.data
}

export const replaceTimetableMembers = async (id, { sectionIDs, employeeIDs }) => {
  const response = await api.post(`${BASE}/${id}/members`, { sectionIDs, employeeIDs })
  return response?.data?.data
}

export const replaceTimetableSlots = async (id, slots) => {
  const response = await api.post(`${BASE}/${id}/slots`, { slots })
  return response?.data?.data
}

export const seedTimetableFromAllocation = async (id) => {
  const response = await api.post(`${BASE}/${id}/seed-from-allocation`)
  return response?.data?.data
}

export const deleteTimetable = async (id) => {
  const response = await api.post(`${BASE}/${id}/delete`)
  return response?.data
}

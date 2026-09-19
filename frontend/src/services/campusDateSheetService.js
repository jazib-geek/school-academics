import api from './api'

const BASE = '/api/campus/datesheets'

export const getDateSheets = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || []
}

export const getDateSheet = async (id) => {
  const response = await api.get(`${BASE}/${id}`)
  return response?.data?.data
}

export const getDateSheetPrint = async (id) => {
  const response = await api.get(`${BASE}/${id}/print`)
  return response?.data?.data
}

export const createDateSheet = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateDateSheet = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const replaceDateSheetClasses = async (id, classes) => {
  const response = await api.post(`${BASE}/${id}/classes`, { classes })
  return response?.data?.data
}

export const replaceDateSheetDays = async (id, examDates) => {
  const response = await api.post(`${BASE}/${id}/days`, { examDates })
  return response?.data?.data
}

export const replaceDateSheetEntries = async (id, entries) => {
  const response = await api.post(`${BASE}/${id}/entries`, { entries })
  return response?.data?.data
}

export const deleteDateSheet = async (id) => {
  const response = await api.post(`${BASE}/${id}/delete`)
  return response?.data
}

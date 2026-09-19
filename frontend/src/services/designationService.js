import api from './api'

const BASE = '/api/campus/designations'

export const getDesignations = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || []
}

export const createDesignation = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateDesignation = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setDesignationStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/${id}/status`, { isActive })
  return response?.data
}

export const deleteDesignation = async (id) => {
  const response = await api.post(`${BASE}/${id}/delete`)
  return response?.data
}

import api from './api'

const BASE = '/api/campus/localities'

export const getLocalities = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || []
}

export const createLocality = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateLocality = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setLocalityStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/${id}/status`, { isActive })
  return response?.data
}

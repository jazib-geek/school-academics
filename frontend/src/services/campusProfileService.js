import api from './api'

const BASE = '/api/campus/profile'

export const getCampusProfile = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || null
}

export const updateCampusProfile = async (payload) => {
  const response = await api.post(`${BASE}/update`, payload)
  return response?.data?.data
}

import api from './api'

const BASE = '/api/campus/users'

export const getPermissionCatalog = async () => {
  const response = await api.get(`${BASE}/permissions`)
  return response?.data?.data || []
}

export const getCampusUsers = async () => {
  const response = await api.get(BASE)
  return response?.data?.data || []
}

export const getCampusUser = async (id) => {
  const response = await api.get(`${BASE}/${id}`)
  return response?.data?.data
}

export const createCampusUser = async (payload) => {
  const response = await api.post(BASE, payload)
  return response?.data?.data
}

export const updateCampusUser = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setCampusUserStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/${id}/status`, { isActive })
  return response?.data
}

export const forceChangeCampusUserPassword = async (id, { newPassword, confirmPassword }) => {
  const response = await api.post(`${BASE}/${id}/password`, { newPassword, confirmPassword })
  return response?.data
}

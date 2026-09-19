import api from './api'

const BASE = '/api/NewsAndEvents'

export const getAnnouncementsManageList = async () => {
  const response = await api.get(`${BASE}/manage`)
  return response.data?.data ?? []
}

export const getAnnouncement = async (id) => {
  const response = await api.get(`${BASE}/${id}`)
  return response.data?.data
}

export const createAnnouncement = async (payload) => {
  const response = await api.post(BASE, payload)
  return response.data?.data
}

export const updateAnnouncement = async (id, payload) => {
  const response = await api.post(`${BASE}/${id}/update`, payload)
  return response.data?.data
}

export const setAnnouncementStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/${id}/status`, { isActive })
  return response.data
}

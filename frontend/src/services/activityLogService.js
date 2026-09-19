import api from './api'

const BASE = '/api/campus/activity-logs'

export const getActivityLogs = async (params = {}) => {
  const response = await api.get(BASE, { params })
  return response?.data?.data || { items: [], totalCount: 0, pageNumber: 1, pageSize: 25, totalPages: 0 }
}

export const getActivityLogLookups = async () => {
  const response = await api.get(`${BASE}/lookups`)
  return response?.data?.data || { activityTypes: [], users: [] }
}

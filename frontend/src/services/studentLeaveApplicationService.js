import api from './api'

export const getLeaveApplications = async ({ status, dateFrom, dateTo, search } = {}) => {
  const params = {}
  if (status && status !== 'all') params.status = status
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo
  if (search?.trim()) params.search = search.trim()
  const response = await api.get('/api/campus/leave-applications', { params })
  return response?.data?.data?.items || []
}

export const approveLeaveApplication = async (id, reviewNote) => {
  const response = await api.post(`/api/campus/leave-applications/${id}/approve`, {
    reviewNote: reviewNote || null,
  })
  return response?.data?.data
}

export const rejectLeaveApplication = async (id, reviewNote) => {
  const response = await api.post(`/api/campus/leave-applications/${id}/reject`, {
    reviewNote: reviewNote || null,
  })
  return response?.data?.data
}

import api from './api'

export const listShortLeaves = async ({ date, dateFrom, dateTo } = {}) => {
  const response = await api.get('/api/attendance/short-leave', {
    params: { date, dateFrom, dateTo },
  })
  return response?.data?.data || []
}

export const getShortLeave = async (id) => {
  const response = await api.get(`/api/attendance/short-leave/${id}`)
  return response?.data?.data
}

export const createShortLeave = async (payload) => {
  const response = await api.post('/api/attendance/short-leave', payload)
  return response?.data?.data
}

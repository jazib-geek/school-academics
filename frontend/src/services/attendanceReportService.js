import api from './api'

export const getSmartAttendanceCatalog = async () => {
  const response = await api.get('/api/attendancereports/smart/catalog')
  return response?.data?.data || []
}

export const getAttendanceExecutiveSnapshot = async () => {
  const response = await api.get('/api/attendancereports/smart/executive-snapshot')
  return response?.data?.data
}

export const runSmartAttendanceReport = async (reportId, parameters = {}) => {
  const response = await api.post('/api/attendancereports/smart/run', { reportId, parameters })
  return response?.data?.data
}

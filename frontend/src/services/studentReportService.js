import api from './api'

export const getSmartStudentCatalog = async () => {
  const response = await api.get('/api/studentreports/smart/catalog')
  return response?.data?.data || []
}

export const getStudentExecutiveSnapshot = async () => {
  const response = await api.get('/api/studentreports/smart/executive-snapshot')
  return response?.data?.data
}

export const runSmartStudentReport = async (reportId, parameters = {}) => {
  const response = await api.post('/api/studentreports/smart/run', { reportId, parameters })
  return response?.data?.data
}

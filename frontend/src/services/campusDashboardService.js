import api from './api'

export const getAllCampusesDashboard = async () => {
  const response = await api.get('/api/dashboard/all-campuses')
  return response?.data?.data
}

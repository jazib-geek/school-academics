import api from './api'

export const getSubjects = async () => {
  const response = await api.get('/api/subject')
  return response?.data?.data || []
}

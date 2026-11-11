import api from './api'

export const previewCustomNotice = async (payload) => {
  const response = await api.post('/api/custom-notices/preview', payload)
  return response?.data?.data
}

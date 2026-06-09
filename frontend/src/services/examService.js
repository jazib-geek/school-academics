import api from './api'

export const getExamTypes = async () => {
  const response = await api.get('/api/exam/types')
  return response?.data || []
}

export const getStudentExamResult = async (studentId, examTypeId) => {
  const response = await api.get(`/api/exam/${studentId}/result/${examTypeId}`)
  return response?.data
}

export const getExamMarkSheet = async ({ sectionId, examTypeId, sortBy = 'position' } = {}) => {
  const response = await api.get('/api/exam/mark-sheet', {
    params: { sectionId, examTypeId, sortBy },
  })
  return response?.data
}

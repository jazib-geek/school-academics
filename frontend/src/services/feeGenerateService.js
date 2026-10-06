import api from './api'

export const getFeeGenerateStudentPeriod = async (studentId, month, year) => {
  const response = await api.get(`/api/fee/generate/student/${studentId}/period`, {
    params: { month, year },
  })
  return response?.data?.data
}

export const generateFeeForAll = async ({ month, year }) => {
  const response = await api.post(
    '/api/fee/generate/all',
    { month, year },
    { timeout: 190_000 },
  )
  return response?.data
}

export const generateFeeForStudent = async ({ studentId, month, year, amount }) => {
  const response = await api.post('/api/fee/generate/student', {
    studentId,
    month,
    year,
    amount,
  })
  return response?.data
}

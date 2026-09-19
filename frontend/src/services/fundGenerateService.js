import api from './api'

export const getStudentFunds = async (studentId) => {
  const response = await api.get(`/api/fund/generate/student/${studentId}`)
  return response?.data?.data
}

export const generateFundForStudent = async ({ studentId, amounts }) => {
  const response = await api.post('/api/fund/generate/student', {
    studentId,
    amounts,
  })
  return response?.data
}

export const generateFundBulk = async ({ fundTypeId, amount, classCompositeId }) => {
  const response = await api.post(
    '/api/fund/generate/bulk',
    {
      fundTypeId,
      amount,
      classCompositeId: classCompositeId || null,
    },
    { timeout: 190_000 },
  )
  return response?.data
}

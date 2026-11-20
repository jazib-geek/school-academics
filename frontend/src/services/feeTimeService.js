import api from './api'

export const getFeeTimes = async () => (await api.get('/api/fee-time')).data.data
export const getStudentFeeTime = async (regId) => (await api.get(`/api/fee-time/students/${regId}`)).data.data
export const searchFeeTimeStudents = async (term, mode) =>
  (await api.get('/api/fee-time/students/search', { params: { term, mode } })).data.data
export const saveStudentFeeTime = async (regId, feeTime) =>
  (await api.put(`/api/fee-time/students/${regId}`, { feeTime })).data.data
export const removeStudentFeeTime = async (regId) =>
  (await api.delete(`/api/fee-time/students/${regId}`)).data.data

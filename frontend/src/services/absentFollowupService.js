import api from './api'

export const getAbsentFollowupReasons = async () => {
  const response = await api.get('/api/absent-followup/reasons')
  return response?.data?.data || []
}

export const getAbsentFollowupByDate = async (date) => {
  const response = await api.get('/api/absent-followup', {
    params: { date },
  })
  return response?.data?.data || []
}

export const saveAbsentFollowup = async ({ studentId, date, reasonId, description }) => {
  const response = await api.post('/api/absent-followup', {
    studentId,
    date,
    reasonId: reasonId || null,
    description,
  })
  return response?.data?.data
}

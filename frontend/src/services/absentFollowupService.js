import api from './api'

export const getAbsentFollowupReasons = async () => {
  const response = await api.get('/api/absent-followup/reasons')
  return response?.data?.data || []
}

const campusHeaderName = import.meta.env.VITE_CAMPUS_HEADER || 'X-Campus'

export const getAbsentFollowupByDate = async (date, campusKey) => {
  const response = await api.get('/api/absent-followup', {
    params: { date },
    ...(campusKey
      ? { headers: { [campusHeaderName]: campusKey } }
      : {}),
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

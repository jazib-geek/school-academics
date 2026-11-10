import api from './api'

export const getMyDisciplineDay = async (date) => {
  const response = await api.get('/api/discipline/my-day', { params: { date } })
  return response?.data?.data
}

export const saveDisciplineRound = async ({ date, roundId, status, note }) => {
  const response = await api.post('/api/discipline/round', { date, roundId, status, note })
  return response?.data?.data
}

export const saveDisciplineFinding = async (payload) => {
  const response = await api.post('/api/discipline/finding', payload)
  return response?.data?.data
}

export const deleteDisciplineFinding = async (id) => {
  const response = await api.post(`/api/discipline/finding/${id}/delete`)
  return response?.data?.data
}

export const submitDisciplineDayReport = async ({ date, whatWasDone, anythingElse }) => {
  const response = await api.post('/api/discipline/day-report', { date, whatWasDone, anythingElse })
  return response?.data?.data
}

export const getDisciplineCampusDay = async (date) => {
  const response = await api.get('/api/discipline/day', { params: { date } })
  return response?.data?.data
}

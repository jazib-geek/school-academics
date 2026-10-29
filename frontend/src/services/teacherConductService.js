import api from './api'

export {
  notePolarity,
  dayPolarity,
  polarityChipClass,
  polarityCardClass,
} from './studentConductService'

export const getTeacherConductCatalog = async () => {
  const response = await api.get('/api/teacher-conduct/types')
  return response?.data?.data || []
}

export const searchTeacherConductEmployees = async (search) => {
  const term = search?.trim()
  if (!term || term.length < 2) return []
  const response = await api.get('/api/teacher-conduct/employee-lookup', { params: { search: term } })
  return response?.data?.data || []
}

export const upsertTeacherConductNote = async ({
  subjectEmployeeId,
  noteDate,
  conductTypeId,
  tagIds,
  remarks,
}) => {
  const response = await api.post('/api/teacher-conduct/note', {
    subjectEmployeeId,
    noteDate,
    conductTypeId,
    tagIds,
    remarks,
  })
  return response?.data?.data
}

export const deleteTeacherConductNote = async (id) => {
  const response = await api.post(`/api/teacher-conduct/note/${id}/delete`)
  return response?.data?.data
}

export const getTeacherConductHistory = async (employeeId, { month, year }) => {
  const response = await api.get(`/api/teacher-conduct/employee/${employeeId}`, {
    params: { month, year },
  })
  return response?.data?.data
}

export const getMyTeacherConductHistory = async ({ month, year }) => {
  const response = await api.get('/api/teacher-conduct/me', {
    params: { month, year },
  })
  return response?.data?.data
}

export const getTeacherConductDayReport = async ({
  date,
  dateTo,
  subjectEmployeeId,
  recordedByEmployeeId,
}) => {
  const params = { date }
  if (dateTo) params.dateTo = dateTo
  if (subjectEmployeeId) params.subjectEmployeeId = subjectEmployeeId
  if (recordedByEmployeeId) params.recordedByEmployeeId = recordedByEmployeeId
  const response = await api.get('/api/teacher-conduct/report', { params })
  return response?.data?.data
}

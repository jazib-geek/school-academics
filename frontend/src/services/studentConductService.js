import api from './api'

export const getConductCatalog = async () => {
  const response = await api.get('/api/student-conduct/types')
  return response?.data?.data || []
}

export const getConductClassSheet = async ({ date, classSectionCompositeId }) => {
  const response = await api.get('/api/student-conduct/class-sheet', {
    params: { date, classSectionCompositeId },
  })
  return response?.data?.data
}

export const upsertConductNote = async ({ studentId, noteDate, conductTypeId, tagIds, remarks }) => {
  const response = await api.post('/api/student-conduct/note', {
    studentId,
    noteDate,
    conductTypeId,
    tagIds,
    remarks,
  })
  return response?.data?.data
}

export const deleteConductNote = async (id) => {
  const response = await api.post(`/api/student-conduct/note/${id}/delete`)
  return response?.data?.data
}

export const getStudentConductHistory = async (studentId, { month, year }) => {
  const response = await api.get(`/api/student-conduct/student/${studentId}`, {
    params: { month, year },
  })
  return response?.data?.data
}

export const getConductDayReport = async ({ date, dateTo, recordedByEmployeeId }) => {
  const params = { date }
  if (dateTo) params.dateTo = dateTo
  if (recordedByEmployeeId) params.recordedByEmployeeId = recordedByEmployeeId
  const response = await api.get('/api/student-conduct/report', {
    params,
  })
  return response?.data?.data
}

export const notePolarity = (note) => {
  const tags = note?.tags || []
  let hasGood = false
  let hasBad = false
  for (const tag of tags) {
    if (tag?.isGood) hasGood = true
    else hasBad = true
  }
  if (hasGood && hasBad) return 'mixed'
  if (hasGood) return 'good'
  if (hasBad) return 'bad'
  return 'none'
}

export const dayPolarity = (notes) => {
  let hasGood = false
  let hasBad = false
  for (const note of notes || []) {
    const polarity = notePolarity(note)
    if (polarity === 'good' || polarity === 'mixed') hasGood = true
    if (polarity === 'bad' || polarity === 'mixed') hasBad = true
  }
  if (hasGood && hasBad) return 'mixed'
  if (hasGood) return 'good'
  if (hasBad) return 'bad'
  return 'none'
}

export const polarityChipClass = (polarity) => {
  if (polarity === 'good') return 'bg-emerald-50 text-emerald-800'
  if (polarity === 'bad') return 'bg-rose-50 text-rose-800'
  if (polarity === 'mixed') return 'bg-amber-50 text-amber-900'
  return 'bg-slate-100 text-slate-700'
}

export const polarityCardClass = (polarity) => {
  if (polarity === 'good') return 'border-emerald-100 bg-emerald-50/80'
  if (polarity === 'bad') return 'border-rose-100 bg-rose-50/80'
  if (polarity === 'mixed') return 'border-amber-100 bg-amber-50/70'
  return 'border-slate-100 bg-slate-50'
}

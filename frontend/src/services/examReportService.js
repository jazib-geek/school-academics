import api from './api'

export const getSmartExamCatalog = async () => {
  const response = await api.get('/api/examreports/smart/catalog')
  return response?.data?.data || []
}

export const getExamExecutiveSnapshot = async () => {
  const response = await api.get('/api/examreports/smart/executive-snapshot')
  return response?.data?.data
}

export const runSmartExamReport = async (reportId, parameters = {}) => {
  const response = await api.post('/api/examreports/smart/run', { reportId, parameters })
  return response?.data?.data
}

export const getExamReportClassSubjects = async (sectionId) => {
  const response = await api.get('/api/examreports/smart/class-subjects', {
    params: { sectionId },
  })
  return response?.data?.data || []
}

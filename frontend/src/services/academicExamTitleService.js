import academicApi from './academicApi'

export const getAcademicExamTitles = async () => {
  const response = await academicApi.get('/api/academics/examtitles')
  return response?.data?.data || []
}

export const upsertAcademicExamTitle = async (payload) => {
  const response = await academicApi.post('/api/academics/examtitles/upsert', payload)
  return response?.data?.data
}

export const deleteAcademicExamTitle = async (id) => {
  await academicApi.delete(`/api/academics/examtitles/${id}`)
}

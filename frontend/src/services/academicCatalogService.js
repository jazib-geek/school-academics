import academicApi from './academicApi'
import { sortClassesByCustomOrder } from './classSort'

export const getAcademicClasses = async () => {
  const response = await academicApi.get('/api/academics/classes')
  return sortClassesByCustomOrder(response?.data?.data || [])
}

export const upsertAcademicClass = async (payload) => {
  const response = await academicApi.post('/api/academics/classes/upsert', payload)
  return response?.data?.data
}

export const deleteAcademicClass = async (id) => {
  await academicApi.post(`/api/academics/classes/${id}/delete`)
}

export const getAcademicSubjects = async () => {
  const response = await academicApi.get('/api/academics/subjects')
  return response?.data?.data || []
}

export const upsertAcademicSubject = async (payload) => {
  const response = await academicApi.post('/api/academics/subjects/upsert', payload)
  return response?.data?.data
}

export const deleteAcademicSubject = async (id) => {
  await academicApi.post(`/api/academics/subjects/${id}/delete`)
}

export const getQuestionCatalog = async (chapterId) => {
  const response = await academicApi.get('/api/academics/questioncatalog', {
    params: chapterId ? { chapterId } : undefined,
  })
  return response?.data?.data || []
}

export const upsertQuestionCatalog = async (payload) => {
  const response = await academicApi.post('/api/academics/questioncatalog/upsert', payload)
  return response?.data?.data
}

export const deleteQuestionCatalog = async (id) => {
  await academicApi.post(`/api/academics/questioncatalog/${id}/delete`)
}

export const getAcademicChapters = async () => {
  const response = await academicApi.get('/api/academics/chapters')
  return response?.data?.data || []
}

export const upsertAcademicChapter = async (payload) => {
  const response = await academicApi.post('/api/academics/chapters/upsert', payload)
  return response?.data?.data
}

export const deleteAcademicChapter = async (id) => {
  await academicApi.post(`/api/academics/chapters/${id}/delete`)
}

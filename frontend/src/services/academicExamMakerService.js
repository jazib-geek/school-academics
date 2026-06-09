import academicApi from './academicApi'

export const getExamQuestionPool = async ({
  classId,
  subjectId,
  chapterIds = [],
  search = '',
  type = 'all',
  category = 'all',
  take = 120,
}) => {
  const params = new URLSearchParams()
  params.append('classId', classId)
  params.append('subjectId', subjectId)
  chapterIds.forEach((id) => params.append('chapterIds', id))
  if (`${search}`.trim()) params.append('search', `${search}`.trim())
  if (type && type !== 'all') params.append('type', type)
  if (category && category !== 'all') params.append('category', category)
  params.append('take', String(take))
  const response = await academicApi.get(`/api/academics/exammaker/question-pool?${params.toString()}`)
  return response?.data?.data || []
}

export const getExamQuestionAvailability = async ({ classId, subjectId }) => {
  const response = await academicApi.get('/api/academics/exammaker/question-availability', {
    params: { classId, subjectId },
  })
  return response?.data?.data || []
}

export const generateAcademicExamPaper = async (payload) => {
  const response = await academicApi.post('/api/academics/exammaker/generate', payload)
  return response?.data?.data
}

export const createAcademicExamPaperFromSelection = async (payload) => {
  const response = await academicApi.post('/api/academics/exammaker/create-from-selection', payload)
  return response?.data?.data
}

export const updateAcademicExamPaperFromSelection = async (id, payload) => {
  // POST (not PUT): production reverse proxy returned 403 + text/html for PUT on this path while POST worked.
  const response = await academicApi.post(`/api/academics/exammaker/papers/${id}/from-selection`, payload)
  return response?.data?.data
}

export const randomizeAcademicExamPaperFromChapters = async (payload) => {
  const response = await academicApi.post('/api/academics/exammaker/auto-from-chapters', payload)
  return response?.data?.data
}

export const getAcademicExamPapers = async ({ classId, subjectId } = {}) => {
  const response = await academicApi.get('/api/academics/exammaker/papers', {
    params: {
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
    },
  })
  return response?.data?.data || []
}

export const getAcademicExamPaperById = async (id) => {
  const response = await academicApi.get(`/api/academics/exammaker/papers/${id}`)
  return response?.data?.data
}

export const deleteAcademicExamPaper = async (id) => {
  // POST (not DELETE): production Plesk hosting blocks DELETE requests.
  await academicApi.post(`/api/academics/exammaker/papers/${id}/delete`)
}

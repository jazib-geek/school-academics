import axios from 'axios'
import academicApi from './academicApi'

const REQUEST_TIMEOUT_MS = 15000

const isRequestCancelled = (error) =>
  error?.name === 'AbortError' ||
  error?.name === 'CanceledError' ||
  error?.code === 'ERR_CANCELED' ||
  axios.isCancel?.(error)

const withTimeout = (promise, timeoutMs = REQUEST_TIMEOUT_MS) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

const pendingRequests = new Map()

const cancelPreviousRequest = (key) => {
  const existing = pendingRequests.get(key)
  if (existing) {
    existing.abort()
  }
}

const trackRequest = (key, signal) => {
  pendingRequests.set(key, { abort: () => signal?.abort?.() })
}

export const getExamQuestionPool = async ({
  classId,
  subjectId,
  chapterIds = [],
  search = '',
  type = 'all',
  category = 'all',
  take = 120,
}) => {
  const requestKey = `pool-${classId}-${subjectId}-${search}-${type}-${category}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const params = new URLSearchParams()
    params.append('classId', classId)
    params.append('subjectId', subjectId)
    chapterIds.forEach((id) => params.append('chapterIds', id))
    if (`${search}`.trim()) params.append('search', `${search}`.trim())
    if (type && type !== 'all') params.append('type', type)
    if (category && category !== 'all') params.append('category', category)
    params.append('take', String(take))

    const response = await withTimeout(
      academicApi.get(`/api/academics/exammaker/question-pool?${params.toString()}`, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data || []
  } catch (error) {
    if (isRequestCancelled(error)) {
      return []
    }
    throw error
  }
}

export const getExamQuestionAvailability = async ({ classId, subjectId }) => {
  const requestKey = `availability-${classId}-${subjectId}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.get('/api/academics/exammaker/question-availability', {
        params: { classId, subjectId },
        signal: controller.signal,
      }),
    )
    return response?.data?.data || []
  } catch (error) {
    if (isRequestCancelled(error)) {
      return []
    }
    throw error
  }
}

export const generateAcademicExamPaper = async (payload) => {
  const requestKey = 'generate-exam'
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.post('/api/academics/exammaker/generate', payload, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

export const createAcademicExamPaperFromSelection = async (payload) => {
  const requestKey = 'create-paper'
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.post('/api/academics/exammaker/create-from-selection', payload, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

export const updateAcademicExamPaperFromSelection = async (id, payload) => {
  const requestKey = `update-paper-${id}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.post(`/api/academics/exammaker/papers/${id}/from-selection`, payload, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

export const randomizeAcademicExamPaperFromChapters = async (payload) => {
  const requestKey = `auto-paper-${payload?.paperId || 'new'}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.post('/api/academics/exammaker/auto-from-chapters', payload, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

export const getAcademicExamPapers = async ({ classId, subjectId } = {}) => {
  const requestKey = `papers-${classId}-${subjectId}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.get('/api/academics/exammaker/papers', {
        params: {
          ...(classId ? { classId } : {}),
          ...(subjectId ? { subjectId } : {}),
        },
        signal: controller.signal,
      }),
    )
    return response?.data?.data || []
  } catch (error) {
    if (isRequestCancelled(error)) {
      return []
    }
    throw error
  }
}

export const getAcademicExamPaperById = async (id) => {
  const requestKey = `paper-${id}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    const response = await withTimeout(
      academicApi.get(`/api/academics/exammaker/papers/${id}`, {
        signal: controller.signal,
      }),
    )
    return response?.data?.data
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

export const deleteAcademicExamPaper = async (id) => {
  const requestKey = `delete-paper-${id}`
  cancelPreviousRequest(requestKey)

  const controller = new AbortController()
  trackRequest(requestKey, controller)

  try {
    await withTimeout(
      // POST (not DELETE): production Plesk hosting blocks DELETE requests.
      academicApi.post(`/api/academics/exammaker/papers/${id}/delete`, undefined, {
        signal: controller.signal,
      }),
    )
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

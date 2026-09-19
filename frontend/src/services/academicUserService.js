import academicApi from './academicApi'

const BASE = '/api/academics/users'

export const getAcademicPermissionCatalog = async () => {
  const response = await academicApi.get(`${BASE}/permissions`)
  return response?.data?.data || []
}

export const getAcademicUsers = async () => {
  const response = await academicApi.get(BASE)
  return response?.data?.data || []
}

export const getAcademicUser = async (id) => {
  const response = await academicApi.get(`${BASE}/${id}`)
  return response?.data?.data
}

export const createAcademicUser = async (payload) => {
  const response = await academicApi.post(BASE, payload)
  return response?.data?.data
}

export const updateAcademicUser = async (id, payload) => {
  const response = await academicApi.post(`${BASE}/${id}/update`, payload)
  return response?.data?.data
}

export const setAcademicUserStatus = async (id, isActive) => {
  const response = await academicApi.post(`${BASE}/${id}/status`, { isActive })
  return response?.data
}

export const forceChangeAcademicUserPassword = async (id, { newPassword, confirmPassword }) => {
  const response = await academicApi.post(`${BASE}/${id}/password`, { newPassword, confirmPassword })
  return response?.data
}

import academicApi from './academicApi'

export const getAcademicInstituteSettingsList = async () => {
  const response = await academicApi.get('/api/academics/institutesettings')
  return response?.data?.data || []
}

export const getAcademicInstituteSettingById = async (id) => {
  const response = await academicApi.get(`/api/academics/institutesettings/${id}`)
  return response?.data?.data
}

export const upsertAcademicInstituteSetting = async (payload) => {
  const response = await academicApi.post('/api/academics/institutesettings/upsert', payload)
  return response?.data?.data
}

export const deleteAcademicInstituteSetting = async (id) => {
  await academicApi.delete(`/api/academics/institutesettings/${id}`)
}

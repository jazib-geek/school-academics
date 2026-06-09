import academicApi from './academicApi'

export const getAcademicDashboard = async () => {
  const response = await academicApi.get('/api/academics/dashboard')
  return response?.data?.data || {}
}

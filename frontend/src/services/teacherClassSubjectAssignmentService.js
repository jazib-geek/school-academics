import api from './api'

const BASE_URL = '/api/campus/teacher-class-subject-assignments'

export const getTeacherClassSubjectAssignments = async () => {
  const response = await api.get(BASE_URL)
  return response?.data?.data || []
}

export const getMyTeacherAssignments = async () => {
  const response = await api.get(`${BASE_URL}/mine`)
  return response?.data?.data
}

export const getTeacherAssignmentEmployees = async () => {
  const response = await api.get(`${BASE_URL}/employees`)
  return response?.data?.data || []
}

export const createTeacherClassSubjectAssignment = async ({ employeeID, classID, subjectID }) => {
  const response = await api.post(BASE_URL, {
    employeeID,
    classID,
    subjectID,
  })
  return response?.data?.data
}

export const deleteTeacherClassSubjectAssignment = async (id) => {
  const response = await api.post(`${BASE_URL}/${id}/delete`)
  return response?.data?.data
}

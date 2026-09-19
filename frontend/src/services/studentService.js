import api from './api'

export const getStudents = async (filters) => {
  const response = await api.get('/api/student', { params: filters })
  return response?.data?.data
}

/** Server-side student lookup for autocomplete (name or reg no.). */
export const searchStudents = async (search, pageSize = 20) => {
  const term = search?.trim()
  if (!term) return []

  const data = await getStudents({
    search: term,
    pageNumber: 1,
    pageSize,
    isActive: true,
    sortBy: 'reg_Id',
    sortDirection: 'desc',
  })

  return data?.items || []
}

export const mapStudentToSelectOption = (student) => {
  const regId = student.reg_Id ?? student.Reg_Id
  const fullName = student.fullName ?? student.FullName ?? 'Student'
  const className = student.className ?? student.ClassName

  return {
    value: regId,
    label: `#${regId} — ${fullName}${className ? ` · ${className}` : ''}`,
    student,
  }
}

export const getStudentFamilyMembers = async (familyId) => {
  const response = await api.get(`/api/student/family/${familyId}`)
  return response?.data?.data || []
}

export const getStudentFeeBalance = async (studentId, { singleStudent = false } = {}) => {
  const response = await api.get(`/api/student/${studentId}/fee-balance`, {
    params: singleStudent ? { singleStudent: true } : undefined,
  })
  return response?.data?.data
}

export const receiveStudentFee = async (payload) => {
  const response = await api.post('/api/student/receive-fee', payload)
  return response?.data?.data
}

export const getStudentLedger = async (studentId) => {
  const response = await api.get(`/api/student/${studentId}/ledger`)
  const rows = response?.data?.data || []
  return rows.filter((row) => Number(row?.debit || 0) !== 0 || Number(row?.credit || 0) !== 0)
}

export const getAdmissionLookups = async () => {
  const response = await api.get('/api/student/admission-lookups')
  return response?.data?.data || {}
}

export const getNextFamilyCode = async () => {
  const response = await api.get('/api/student/families/next-code')
  return response?.data?.data?.familyCode
}

export const searchFamilies = async (q) => {
  const response = await api.get('/api/student/families/search', { params: { q } })
  return response?.data?.data || []
}

export const getFamily = async (familyId) => {
  const response = await api.get(`/api/student/families/${familyId}`)
  return response?.data?.data
}

export const registerStudent = async (payload) => {
  const response = await api.post('/api/student/register', payload)
  return response?.data?.data
}

export const getStudentAdmissionDetail = async (studentId) => {
  const response = await api.get(`/api/student/${studentId}/admission`)
  return response?.data?.data
}

export const updateStudent = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/update`, payload)
  return response?.data?.data
}

export const getBulkEditStudents = async (classCompositeId) => {
  const response = await api.get('/api/student/bulk-edit', {
    params: { classCompositeId },
  })
  return response?.data?.data || []
}

export const bulkUpdateStudent = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/bulk-update`, payload)
  return response?.data?.data
}

export const transferStudent = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/transfer`, payload)
  return response?.data?.data
}

export const updateStudentTuitionFee = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/update-fee`, payload)
  return response?.data?.data
}

export const activateStudent = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/activate`, payload)
  return response?.data?.data
}

export const deactivateStudent = async (studentId, payload) => {
  const response = await api.post(`/api/student/${studentId}/deactivate`, payload)
  return response?.data?.data
}

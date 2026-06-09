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

export const getStudentLedger = async (studentId) => {
  const response = await api.get(`/api/student/${studentId}/ledger`)
  const rows = response?.data?.data || []
  return rows.filter((row) => Number(row?.debit || 0) !== 0 || Number(row?.credit || 0) !== 0)
}

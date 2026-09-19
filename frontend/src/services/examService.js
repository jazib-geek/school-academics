import api from './api'

export const getExamTypes = async () => {
  const response = await api.get('/api/exam/types')
  return response?.data || []
}

export const loadExamEntryMatrix = async ({ sectionId, examTypeId }) => {
  const response = await api.post('/api/exam/entry/load', { sectionId, examTypeId })
  return response?.data
}

export const addMissingExamEntryStudents = async ({ sectionId, examTypeId }) => {
  const response = await api.post('/api/exam/entry/add-missing-students', { sectionId, examTypeId })
  return response?.data
}

export const updateExamEntryCell = async ({ examId, obtainedMarks }) => {
  const response = await api.post(`/api/exam/entry/cells/${examId}`, { obtainedMarks })
  return response?.data
}

export const updateExamEntrySubjectMarks = async ({ sectionId, examTypeId, subjectId, totalMarks, passingMarks }) => {
  const response = await api.post('/api/exam/entry/subject-marks', {
    sectionId,
    examTypeId,
    subjectId,
    totalMarks,
    passingMarks,
  })
  return response?.data
}

export const updateExamEntryAttendance = async ({ sectionId, examTypeId, studentId, attendanceRatio }) => {
  const response = await api.post('/api/exam/entry/attendance', {
    sectionId,
    examTypeId,
    studentId,
    attendanceRatio,
  })
  return response?.data
}

export const getAvailableExamEntrySubjects = async ({ sectionId, examTypeId }) => {
  const response = await api.get('/api/exam/entry/available-subjects', {
    params: { sectionId, examTypeId },
  })
  return response?.data || []
}

export const addExamEntrySubject = async ({ sectionId, examTypeId, subjectId, totalMarks, passingMarks }) => {
  const response = await api.post('/api/exam/entry/subjects', {
    sectionId,
    examTypeId,
    subjectId,
    totalMarks,
    passingMarks,
  })
  return response?.data
}

export const deleteExamEntrySubject = async ({ sectionId, examTypeId, subjectId }) => {
  const response = await api.post(`/api/exam/entry/subjects/${subjectId}/delete`, null, {
    params: { sectionId, examTypeId },
  })
  return response?.data
}

export const loadSubjectComponentEntry = async ({ sectionId, examTypeId, subjectId }) => {
  const response = await api.get('/api/exam/subject-component-entry', {
    params: { sectionId, examTypeId, subjectId },
  })
  return response?.data
}

export const addSubjectComponentHeader = async ({ sectionId, examTypeId, subjectId, headerName, maxMarks }) => {
  const response = await api.post('/api/exam/subject-component-entry/headers', {
    sectionId,
    examTypeId,
    subjectId,
    headerName,
    maxMarks,
  })
  return response?.data
}

export const deleteSubjectComponentHeader = async ({ sectionId, examTypeId, subjectId, headerId }) => {
  const response = await api.post(`/api/exam/subject-component-entry/headers/${headerId}/delete`, null, {
    params: { sectionId, examTypeId, subjectId },
  })
  return response?.data
}

export const saveSubjectComponentMarks = async ({ sectionId, examTypeId, subjectId, students }) => {
  const response = await api.post('/api/exam/subject-component-entry/marks', {
    sectionId,
    examTypeId,
    subjectId,
    students,
  })
  return response?.data
}

export const getStudentExamResult = async (studentId, examTypeId) => {
  const response = await api.get(`/api/exam/${studentId}/result/${examTypeId}`)
  return response?.data
}

export const getExamMarkSheet = async ({
  sectionId,
  examTypeId,
  sortBy = 'position',
  includeDrawing = false,
  includeStemp = false,
} = {}) => {
  const response = await api.get('/api/exam/mark-sheet', {
    params: { sectionId, examTypeId, sortBy, includeDrawing, includeStemp },
  })
  return response?.data
}

export const getTeacherExamAnalysis = async ({
  sectionId,
  employeeId,
  examTypeId,
  includeDrawing = false,
  includeStemp = false,
} = {}) => {
  const response = await api.get('/api/exam/teacher-analysis', {
    params: { sectionId, employeeId, examTypeId, includeDrawing, includeStemp },
  })
  return response?.data
}

export const getTeacherPerformanceGrid = async ({
  employeeId,
  includeDrawing = false,
  includeStemp = false,
} = {}) => {
  const response = await api.get('/api/exam/teacher-performance-grid', {
    params: { employeeId, includeDrawing, includeStemp },
  })
  return response?.data
}

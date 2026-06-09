import api from './api'

export const getClassAttendanceSheet = async ({ date, classSectionCompositeId }) => {
  const response = await api.get('/api/attendance/class-sheet', {
    params: {
      date,
      classSectionCompositeId,
    },
  })

  return response?.data?.data
}

export const getSchoolAttendanceSheet = async ({ date }) => {
  const response = await api.get('/api/attendance/school-sheet', {
    params: { date },
  })

  return response?.data?.data
}

export const setClassAttendanceStatusForAll = async ({ date, classSectionCompositeId, status }) => {
  const response = await api.post('/api/attendance/class-sheet/status-all', {
    date,
    classSectionCompositeId,
    status,
  })

  return response?.data?.data
}

export const setStudentAttendanceStatus = async ({ date, classSectionCompositeId, studentId, status }) => {
  const response = await api.post('/api/attendance/class-sheet/student-status', {
    date,
    classSectionCompositeId,
    studentId,
    status,
  })

  return response?.data?.data
}

export const setSchoolAttendancePresentForAll = async ({ date }) => {
  const response = await api.post('/api/attendance/school-sheet/present-all', {
    date,
  })

  return response?.data?.data
}

export const getEmployeeAttendanceStats = async ({ date } = {}) => {
  const response = await api.get('/api/attendance/employee-stats', {
    params: date ? { date } : undefined,
  })

  return response?.data?.data
}

export const getAttendanceReport = async ({ dateFrom, dateTo, classSectionCompositeId, status }) => {
  const response = await api.get('/api/attendance/report', {
    params: {
      dateFrom,
      dateTo,
      classSectionCompositeId: classSectionCompositeId || undefined,
      status: status || undefined,
    },
  })

  return response?.data?.data
}

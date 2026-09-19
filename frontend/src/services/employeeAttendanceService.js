import api from './api'

export const getEmployeeAttendanceLiveDay = async ({ date } = {}) => {
  const response = await api.get('/api/employee-attendance/live', {
    params: {
      ...(date ? { date } : {}),
    },
  })

  return response?.data?.data
}

export const getEmployeeAttendanceMonthlySheet = async ({ year, month } = {}) => {
  const response = await api.get('/api/employee-attendance/monthly', {
    params: {
      ...(year != null ? { year } : {}),
      ...(month != null ? { month } : {}),
    },
  })

  return response?.data?.data
}

export const getMyEmployeeAttendance = async ({ year, month } = {}) => {
  const response = await api.get('/api/employee-attendance/my', {
    params: {
      ...(year != null ? { year } : {}),
      ...(month != null ? { month } : {}),
    },
  })

  return response?.data?.data
}

export const getEmployeeAttendanceManageDay = async ({ date } = {}) => {
  const response = await api.get('/api/employee-attendance/manage', {
    params: {
      ...(date ? { date } : {}),
    },
  })

  return response?.data?.data
}

export const editEmployeeAttendance = async (attendanceId, payload) => {
  const response = await api.post(`/api/employee-attendance/${attendanceId}/edit`, payload)
  return response?.data?.data
}

export const deleteEmployeeAttendance = async (attendanceId) => {
  const response = await api.post(`/api/employee-attendance/${attendanceId}/delete`)
  return response?.data?.data
}

export const markEmployeePresent = async (payload) => {
  const response = await api.post('/api/employee-attendance/mark-present', payload)
  return response?.data?.data
}

export const backfillEmployeeAttendance = async (payload) => {
  const response = await api.post('/api/employee-attendance/backfill', payload)
  return response?.data?.data
}

export const getBackfillExistingAttendance = async ({ employeeId, from, to }) => {
  const response = await api.get('/api/employee-attendance/backfill/existing', {
    params: { employeeId, from, to },
  })
  return response?.data?.data
}

export const markEmployeeHoliday = async ({ date, overwriteExisting }) => {
  const response = await api.post('/api/employee-attendance/mark-holiday', {
    date,
    overwriteExisting,
  })
  return response?.data?.data
}

export const recalculateEmployeeDutyTimes = async ({ date, designations }) => {
  const response = await api.post('/api/employee-attendance/recalculate-duty-times', {
    date,
    designations,
  })
  return response?.data?.data
}

export const getEmployeeAttendanceActivity = async (attendanceId) => {
  const response = await api.get(`/api/employee-attendance/${attendanceId}/activity`)
  return response?.data?.data
}

export const previewEmployeeAttendanceImport = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const response = await api.post('/api/employee-attendance/import/preview', form)
  return response?.data?.data
}

export const importEmployeeAttendance = async (file, payload) => {
  const form = new FormData()
  form.append('file', file)
  form.append('rules', JSON.stringify(payload))
  const response = await api.post('/api/employee-attendance/import', form)
  return {
    data: response?.data?.data,
    message: response?.data?.message,
  }
}

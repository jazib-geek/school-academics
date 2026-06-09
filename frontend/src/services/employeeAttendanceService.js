import api from './api'

export const getEmployeeAttendanceMonthlySheet = async ({ year, month } = {}) => {
  const response = await api.get('/api/employee-attendance/monthly', {
    params: {
      ...(year != null ? { year } : {}),
      ...(month != null ? { month } : {}),
    },
  })

  return response?.data?.data
}

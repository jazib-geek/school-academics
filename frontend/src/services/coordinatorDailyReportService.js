import api from './api'

const BASE = '/api/employee/coordinator/daily-report'
const CAMPUS_MONITOR = '/api/campus/coordinator-daily-report/monitor'

const unwrap = (response) => response?.data?.data

export const getCampusCoordinatorDailyReportingMonitor = async ({ reportDate } = {}) => {
  const response = await api.get(CAMPUS_MONITOR, {
    params: reportDate ? { reportDate } : undefined,
  })
  return unwrap(response)
}

export const getCoordinatorStaffForPick = async () => {
  const response = await api.get(`${BASE}/me/staff-for-pick`)
  return unwrap(response) ?? []
}

export const getCoordinatorHeadOfficeBundle = async ({ reportDate } = {}) => {
  const response = await api.get(`${BASE}/me/head-office-bundle`, {
    params: reportDate ? { reportDate } : undefined,
  })
  return unwrap(response)
}

export const postCoordinatorArrival = async ({ reportDate, arrivalTime }) => {
  const response = await api.post(`${BASE}/me/arrival`, {
    reportDate,
    arrivalTime: arrivalTime || null,
  })
  return unwrap(response)
}

export const postCoordinatorAssembly = async (body) => {
  const response = await api.post(`${BASE}/me/assembly`, body)
  return unwrap(response)
}

export const postCoordinatorModDuties = async ({ reportDate, duties }) => {
  const response = await api.post(`${BASE}/me/mod-duties`, { reportDate, duties })
  return unwrap(response)
}

export const postCoordinatorAbsentTeachers = async ({ reportDate, absentTeachers }) => {
  const response = await api.post(`${BASE}/me/absent-teachers`, { reportDate, absentTeachers })
  return unwrap(response)
}

export const postCoordinatorWorkingReportLines = async ({ reportDate, lines }) => {
  const response = await api.post(`${BASE}/me/working-report-lines`, { reportDate, lines })
  return unwrap(response)
}

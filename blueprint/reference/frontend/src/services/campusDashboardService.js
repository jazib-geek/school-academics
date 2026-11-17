import api from './api'

const DASHBOARD_TIMEOUT_MS = 120000

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

const isRetryableNetworkError = (error) => !error?.response && (
  error?.code === 'ERR_NETWORK' ||
  error?.message === 'Network Error'
)

const withDashboardRequest = async (requestFn, { retries = 2 } = {}) => {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await requestFn()
      return response?.data?.data
    } catch (error) {
      lastError = error
      if (attempt < retries && isRetryableNetworkError(error)) {
        await wait(750 * (attempt + 1))
        continue
      }
      throw error
    }
  }

  throw lastError
}

const dashboardGet = (url, config = {}) =>
  withDashboardRequest(() => api.get(url, {
    timeout: DASHBOARD_TIMEOUT_MS,
    ...config,
  }))

export const getAllCampusesDashboard = async () => {
  const response = await api.get('/api/dashboard/all-campuses', {
    timeout: DASHBOARD_TIMEOUT_MS,
  })
  return response?.data?.data
}

export const getCampusDashboard = async (campus) => {
  const response = await api.get(`/api/dashboard/campus/${encodeURIComponent(campus)}`, {
    timeout: DASHBOARD_TIMEOUT_MS,
  })
  return response?.data?.data
}

export const getCampusExpenseDetails = async ({ campus, days = 30 }) =>
  dashboardGet(`/api/dashboard/campus/${encodeURIComponent(campus)}/expense-details`, {
    params: { days },
  })

export const getAllCampusesFeeCollectionByDate = async (date) =>
  dashboardGet('/api/dashboard/all-campuses/fee-collection-by-date', {
    params: { date },
  })

export const getAllCampusesExpensesByInterval = async (days = 30) =>
  dashboardGet('/api/dashboard/all-campuses/expenses-by-interval', {
    params: { days },
  })

export const getAllCampusesFeeBalanceByMonth = async ({ month, year }) =>
  dashboardGet('/api/dashboard/all-campuses/fee-balance-by-month', {
    params: { month, year },
  })

export const getCampusFeeBreakdownByMonth = async ({ campus, month, year }) =>
  dashboardGet(`/api/dashboard/campus/${encodeURIComponent(campus)}/fee-breakdown-by-month`, {
    params: { month, year },
  })

export const getCampusAdmissionsVsLeftTrend = async ({ campus, days }) =>
  dashboardGet(`/api/dashboard/campus/${encodeURIComponent(campus)}/admissions-vs-left-trend`, {
    params: { days },
  })

export const getAllCampusesAdmissionsByMonth = async ({ month, year }) =>
  dashboardGet('/api/dashboard/all-campuses/admissions-by-month', {
    params: { month, year },
  })

export const getCampusLeftStudentsByMonth = async ({ campus, month, year }) =>
  dashboardGet(`/api/dashboard/campus/${encodeURIComponent(campus)}/left-students-by-month`, {
    params: { month, year },
  })

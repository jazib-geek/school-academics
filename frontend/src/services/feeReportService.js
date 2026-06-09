import api from './api'

export const getFeeCollectionOnDate = async (date) => {
  const response = await api.get('/api/feereports/collection-by-date', { params: { date } })
  return response?.data?.data
}

export const getFeeCollectionInInterval = async (dateFrom, dateTo) => {
  const response = await api.get('/api/feereports/collection-by-interval', {
    params: { dateFrom, dateTo },
  })
  return response?.data?.data
}

export const getFeeDefaulters = async (month, year) => {
  const response = await api.get('/api/feereports/fee-defaulters', {
    params: { month, year },
  })
  return response?.data?.data
}

export const getFundDefaulters = async (fundTypeId) => {
  const response = await api.get('/api/feereports/fund-defaulters', {
    params: { fundTypeId },
  })
  return response?.data?.data
}

export const getOverallReceivable = async () => {
  const response = await api.get('/api/feereports/overall-receivable')
  return response?.data?.data
}

export const getFundTypes = async () => {
  const response = await api.get('/api/feereports/fund-types')
  return response?.data?.data || []
}

export const getExpectedIncome = async (dateFrom, dateTo) => {
  const response = await api.get('/api/feereports/expected-income', {
    params: { dateFrom, dateTo },
  })
  return response?.data?.data
}

export const getIncomeStatement = async (month, year) => {
  const response = await api.get('/api/feereports/income-statement', {
    params: { month, year },
  })
  return response?.data?.data
}

import api from './api'

const BASE = '/api/royalty-share'

export const getRoyaltyShareMeta = async () => {
  const response = await api.get(`${BASE}/meta`)
  const data = response?.data?.data
  return {
    isFranchise: Boolean(data?.isFranchise ?? data?.IsFranchise),
    royaltySharePercent: data?.royaltySharePercent ?? data?.RoyaltySharePercent ?? null,
  }
}

export const getRoyaltyShareMonth = async (year, month) => {
  const response = await api.get(`${BASE}/month`, { params: { year, month } })
  return response?.data?.data
}

export const getRoyaltyShareHistory = async (limit = 24) => {
  const response = await api.get(`${BASE}/history`, { params: { limit } })
  return response?.data?.data || []
}

export const closeRoyaltyShareMonth = async (year, month) => {
  const response = await api.post(`${BASE}/close`, { year, month })
  return response?.data?.data
}

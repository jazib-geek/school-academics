import api from './api'

const BASE = '/api/campus/accounts'

export const getAccountMasters = async () => {
  const response = await api.get(`${BASE}/masters`)
  return response?.data?.data || []
}

export const getAccountGroups = async (masterId) => {
  const response = await api.get(`${BASE}/groups`, {
    params: masterId != null && masterId !== '' ? { masterId } : undefined,
  })
  return response?.data?.data || []
}

export const getAccountSubGroups = async (groupId) => {
  const response = await api.get(`${BASE}/sub-groups`, {
    params: groupId ? { groupId } : undefined,
  })
  return response?.data?.data || []
}

export const getAccountLevel4 = async (subGroupId) => {
  const response = await api.get(`${BASE}/level4`, {
    params: subGroupId ? { subGroupId } : undefined,
  })
  return response?.data?.data || []
}

export const getPostableAccounts = async (excludeCashInHand = true) => {
  const response = await api.get(`${BASE}/postable`, {
    params: { excludeCashInHand },
  })
  return response?.data?.data || []
}

export const createAccountGroup = async (payload) => {
  const response = await api.post(`${BASE}/groups`, payload)
  return response?.data?.data
}

export const createAccountSubGroup = async (payload) => {
  const response = await api.post(`${BASE}/sub-groups`, payload)
  return response?.data?.data
}

export const createAccountLevel4 = async (payload) => {
  const response = await api.post(`${BASE}/level4`, payload)
  return response?.data?.data
}

export const renameAccountGroup = async (id, title) => {
  const response = await api.post(`${BASE}/groups/${id}/update`, { title })
  return response?.data
}

export const renameAccountSubGroup = async (id, title) => {
  const response = await api.post(`${BASE}/sub-groups/${id}/update`, { title })
  return response?.data
}

export const renameAccountLevel4 = async (id, title) => {
  const response = await api.post(`${BASE}/level4/${id}/update`, { title })
  return response?.data
}

export const saveCashPaymentVoucher = async (payload) => {
  const response = await api.post(`${BASE}/vouchers/cash-payment`, payload)
  return response?.data?.data
}

export const saveCashReceiptVoucher = async (payload) => {
  const response = await api.post(`${BASE}/vouchers/cash-receipt`, payload)
  return response?.data?.data
}

export const getAccountLedger = async ({ accountId, from, to }) => {
  const response = await api.get(`${BASE}/ledger`, {
    params: { accountId, from, to },
  })
  return response?.data?.data
}

export const getCashBook = async ({ from, to }) => {
  const response = await api.get(`${BASE}/cash-book`, {
    params: { from, to },
  })
  return response?.data?.data
}

export const getAccountSummary = async ({ from, to }) => {
  const response = await api.get(`${BASE}/summary`, {
    params: { from, to },
  })
  return response?.data?.data
}

export const getDayClosingPreview = async (date) => {
  const response = await api.get(`${BASE}/day-closing`, {
    params: date ? { date } : undefined,
  })
  return response?.data?.data
}

export const closeDay = async (payload) => {
  const response = await api.post(`${BASE}/day-closing`, payload)
  return response?.data?.data
}

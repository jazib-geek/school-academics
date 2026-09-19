import api from './api'

const BASE = '/api/fee/receipts'

export const searchFeeReceipts = async ({ dateFrom, dateTo, studentName } = {}) => {
  const response = await api.get(BASE, {
    params: {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      studentName: studentName || undefined,
    },
  })
  return response?.data?.data || []
}

export const getFeeReceiptForReprint = async (receiptId) => {
  const response = await api.get(`${BASE}/${receiptId}`)
  return response?.data?.data
}

export const voidFeeReceipt = async (receiptId, { reason } = {}) => {
  const response = await api.post(`${BASE}/${receiptId}/void`, { reason: reason || undefined })
  return response?.data?.data
}

export const editFeeReceipt = async (receiptId, payload) => {
  const response = await api.post(`${BASE}/${receiptId}/edit`, payload)
  return response?.data?.data
}

export const searchVoidedFeeReceipts = async ({
  dateFrom,
  dateTo,
  studentName,
  receiptId,
  pageNumber = 1,
  pageSize = 25,
} = {}) => {
  const response = await api.get(`${BASE}/voided`, {
    params: {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      studentName: studentName || undefined,
      receiptId: receiptId || undefined,
      pageNumber,
      pageSize,
    },
  })
  return response?.data?.data || { items: [], totalCount: 0, pageNumber: 1, pageSize, totalPages: 0 }
}

export const getVoidedFeeReceiptForPrint = async (activityLogId) => {
  const response = await api.get(`${BASE}/voided/${activityLogId}`)
  return response?.data?.data
}

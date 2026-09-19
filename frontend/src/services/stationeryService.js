import api from './api'

const BASE = '/api/campus/stationery'

export const getStationeryItems = async () => {
  const response = await api.get(`${BASE}/items`)
  return response?.data?.data || []
}

export const createStationeryItem = async (payload) => {
  const response = await api.post(`${BASE}/items`, payload)
  return response?.data?.data
}

export const updateStationeryItem = async (id, payload) => {
  const response = await api.post(`${BASE}/items/${id}/update`, payload)
  return response?.data?.data
}

export const setStationeryItemStatus = async (id, isActive) => {
  const response = await api.post(`${BASE}/items/${id}/status`, { isActive })
  return response?.data
}

export const getStationeryPurchases = async (params) => {
  const response = await api.get(`${BASE}/purchases`, { params })
  return response?.data?.data || []
}

export const getStationeryPurchase = async (id) => {
  const response = await api.get(`${BASE}/purchases/${id}`)
  return response?.data?.data
}

export const createStationeryPurchase = async (payload) => {
  const response = await api.post(`${BASE}/purchases`, payload)
  return response?.data?.data
}

export const getStationeryHandovers = async (params) => {
  const response = await api.get(`${BASE}/handovers`, { params })
  return response?.data?.data || []
}

export const getStationeryHandover = async (id) => {
  const response = await api.get(`${BASE}/handovers/${id}`)
  return response?.data?.data
}

export const createStationeryHandover = async (payload) => {
  const response = await api.post(`${BASE}/handovers`, payload)
  return response?.data?.data
}

export const getStationeryStock = async () => {
  const response = await api.get(`${BASE}/stock`)
  return response?.data?.data || []
}

export const getStationeryExpenseReport = async (from, to) => {
  const response = await api.get(`${BASE}/reports/expense`, { params: { from, to } })
  return response?.data?.data
}

export const getStationeryItemReport = async (itemId, from, to) => {
  const response = await api.get(`${BASE}/reports/item`, { params: { itemId, from, to } })
  return response?.data?.data
}

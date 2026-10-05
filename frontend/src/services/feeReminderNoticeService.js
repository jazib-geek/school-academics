import api from './api'

export const getFeeReminderTemplates = async () => {
  const response = await api.get('/api/fee-reminder-notices/templates')
  return response?.data?.data || []
}

export const updateFeeReminderTemplate = async (code, payload) => {
  const response = await api.post(`/api/fee-reminder-notices/templates/${encodeURIComponent(code)}/update`, payload)
  return response?.data?.data
}

export const getFeeReminderClassBalances = async (className) => {
  const response = await api.get('/api/fee-reminder-notices/class-balances', {
    params: { className },
  })
  return response?.data?.data
}

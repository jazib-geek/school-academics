import api from './api'

export const REMINDER_KINDS = {
  Reminder: 'Reminder',
  Note: 'Note',
  Todo: 'Todo',
  Instruction: 'Instruction',
}

export const listMyReminders = async (kind) => {
  const response = await api.get('/api/reminders', { params: kind ? { kind } : undefined })
  return response?.data?.data || []
}

export const listDueReminders = async () => {
  const response = await api.get('/api/reminders/due')
  return response?.data?.data || []
}

export const listAssignedByMe = async () => {
  const response = await api.get('/api/reminders/assigned-by-me')
  return response?.data?.data || []
}

export const listAssignableUsers = async () => {
  const response = await api.get('/api/reminders/assignable-users')
  return response?.data?.data || []
}

export const createReminder = async (payload) => {
  const response = await api.post('/api/reminders', payload)
  return response?.data?.data
}

export const updateReminder = async (id, payload) => {
  const response = await api.post(`/api/reminders/${id}/update`, payload)
  return response?.data?.data
}

const postAction = async (id, action, body) => {
  const response = await api.post(`/api/reminders/${id}/${action}`, body)
  return response?.data?.data
}

export const deleteReminder = (id) => postAction(id, 'delete')
export const markReminderDone = (id) => postAction(id, 'done')
export const reopenReminder = (id) => postAction(id, 'reopen')
export const dismissReminder = (id) => postAction(id, 'dismiss')
export const snoozeReminder = (id, minutes) => postAction(id, 'snooze', { minutes })
export const toggleReminderPin = (id) => postAction(id, 'pin')

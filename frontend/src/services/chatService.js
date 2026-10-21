import api from './api'

export const listChatUsers = async () => {
  const response = await api.get('/api/chat/users')
  return response?.data?.data || []
}

export const getChatConversation = async (otherUserId, afterId) => {
  const response = await api.get(`/api/chat/conversation/${otherUserId}`, {
    params: afterId ? { afterId } : undefined,
  })
  return response?.data?.data || []
}

export const sendChatMessage = async (recipientUserId, body) => {
  const response = await api.post('/api/chat/send', { recipientUserId, body })
  return response?.data?.data
}

export const markChatRead = async (otherUserId) => {
  await api.post(`/api/chat/conversation/${otherUserId}/read`)
}

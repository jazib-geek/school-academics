import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listChatUsers, markChatRead } from '../services/chatService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'

function parse(event) {
  try {
    return JSON.parse(event.data)
  } catch {
    return null
  }
}

/**
 * One live connection per campus session: chat messages, read receipts, online presence,
 * plus reminder events (forwarded to `onReminderEvent`).
 */
export default function useCampusChat({ active, token, myUserId, onIncomingMessage, onReminderEvent }) {
  const [users, setUsers] = useState([])
  const usersRef = useRef(users)
  usersRef.current = users
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef(new Set())
  const viewingUserIdRef = useRef(null)
  const incomingRef = useRef(onIncomingMessage)
  const reminderRef = useRef(onReminderEvent)
  incomingRef.current = onIncomingMessage
  reminderRef.current = onReminderEvent

  const refreshUsers = useCallback(async () => {
    try {
      const rows = await listChatUsers()
      setUsers(rows)
    } catch {
      // Keep the last known list.
    }
  }, [])

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  const emit = useCallback((type, data) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(type, data)
      } catch {
        // Listener errors must not break the stream.
      }
    })
  }, [])

  const markConversationRead = useCallback(async (otherUserId) => {
    if (!otherUserId) return
    setUsers((prev) => prev.map((u) => (u.userId === otherUserId ? { ...u, unreadCount: 0 } : u)))
    try {
      await markChatRead(otherUserId)
    } catch {
      // Next refresh resyncs.
    }
  }, [])

  const setViewingUserId = useCallback((userId) => {
    viewingUserIdRef.current = userId || null
  }, [])

  useEffect(() => {
    if (!active || !token || !myUserId) {
      setUsers([])
      setConnected(false)
      return undefined
    }

    let closed = false
    let source = null
    let reconnectTimer = null

    const applyMessage = (message) => {
      if (!message?.id) return
      const incoming = message.senderUserId !== myUserId
      const otherId = incoming ? message.senderUserId : message.recipientUserId
      const isViewing = incoming && viewingUserIdRef.current === otherId && !document.hidden

      if (!usersRef.current.some((u) => u.userId === otherId)) refreshUsers()
      setUsers((prev) =>
        prev.map((u) =>
          u.userId !== otherId
            ? u
            : {
                ...u,
                lastMessage: message.body,
                lastAtUtc: message.sentAtUtc,
                lastFromMe: !incoming,
                unreadCount: incoming && !isViewing ? (u.unreadCount || 0) + 1 : u.unreadCount,
              },
        ),
      )

      emit('chat-message', message)
      if (incoming) {
        if (isViewing) markChatRead(otherId).catch(() => {})
        else incomingRef.current?.(message)
      }
    }

    const connect = () => {
      if (closed) return
      source?.close()
      const url = new URL('/api/chat/stream', API_BASE_URL)
      url.searchParams.set('access_token', token)
      source = new EventSource(url.toString())

      source.onopen = () => {
        setConnected(true)
        refreshUsers()
      }

      source.addEventListener('chat-message', (event) => applyMessage(parse(event)))

      source.addEventListener('chat-reaction', (event) => {
        const data = parse(event)
        if (data) emit('chat-reaction', data)
      })

      source.addEventListener('chat-read', (event) => {
        const data = parse(event)
        if (data) emit('chat-read', data)
      })

      source.addEventListener('chat-read-self', (event) => {
        const data = parse(event)
        if (!data?.otherUserId) return
        setUsers((prev) => prev.map((u) => (u.userId === data.otherUserId ? { ...u, unreadCount: 0 } : u)))
      })

      source.addEventListener('presence', (event) => {
        const data = parse(event)
        if (!data?.userId) return
        if (!usersRef.current.some((u) => u.userId === data.userId)) {
          if (data.isOnline) refreshUsers()
          return
        }
        setUsers((prev) =>
          prev.map((u) => (u.userId === data.userId ? { ...u, isOnline: Boolean(data.isOnline) } : u)),
        )
      })

      ;['reminder-assigned', 'reminder-updated', 'reminder-deleted'].forEach((type) => {
        source.addEventListener(type, (event) => {
          const data = parse(event)
          if (data) reminderRef.current?.(type, data)
        })
      })

      source.onerror = () => {
        setConnected(false)
        source?.close()
        source = null
        if (closed) return
        reconnectTimer = window.setTimeout(connect, 4000)
      }
    }

    refreshUsers()
    connect()

    return () => {
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      source?.close()
      setConnected(false)
    }
  }, [active, token, myUserId, refreshUsers, emit])

  const unreadTotal = useMemo(
    () => users.reduce((sum, u) => sum + (Number(u.unreadCount) || 0), 0),
    [users],
  )
  const onlineCount = useMemo(() => users.filter((u) => u.isOnline).length, [users])

  return {
    users,
    connected,
    unreadTotal,
    onlineCount,
    refreshUsers,
    subscribe,
    markConversationRead,
    setViewingUserId,
  }
}

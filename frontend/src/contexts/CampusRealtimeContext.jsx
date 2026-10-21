import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import useCampusChat from '../hooks/useCampusChat.jsx'
import useReminderAlarms from '../hooks/useReminderAlarms.jsx'
import useTabTitleBadge from '../hooks/useTabTitleBadge.js'
import CampusChatDrawer from '../components/campus/chat/CampusChatDrawer.jsx'
import ReminderAlarmModal from '../components/campus/reminders/ReminderAlarmModal.jsx'
import { getCampusUserId } from '../utils/campusSessionUser'
import { playMessagePing } from '../utils/campusSounds'

const noop = () => {}

const CampusRealtimeContext = createContext({
  active: false,
  myUserId: 0,
  chatUnread: 0,
  chatOpen: false,
  openChat: noop,
  closeChat: noop,
  pendingReminderCount: 0,
})

/**
 * App-level (survives page navigation) campus chat + reminder alarms.
 * Only active on `/campus` routes with a campus session.
 */
export function CampusRealtimeProvider({ children }) {
  const { pathname } = useLocation()
  const token = localStorage.getItem('token') || ''
  const myUserId = pathname.startsWith('/campus') ? getCampusUserId(token) : 0
  const active = myUserId > 0

  const [chatOpen, setChatOpen] = useState(false)
  const [activeChatUserId, setActiveChatUserId] = useState(null)
  const chatOpenRef = useRef(chatOpen)
  chatOpenRef.current = chatOpen
  const usersRef = useRef([])

  const reminders = useReminderAlarms({ active, myUserId })

  const openChat = useCallback((userId) => {
    setChatOpen(true)
    if (userId) setActiveChatUserId(userId)
  }, [])
  const closeChat = useCallback(() => setChatOpen(false), [])

  const onIncomingMessage = useCallback(
    (message) => {
      playMessagePing()
      if (chatOpenRef.current) return
      const sender = usersRef.current.find((u) => u.userId === message.senderUserId)
      toast(sender?.username || 'New message', {
        id: `chat-${message.senderUserId}`,
        description: message.body.length > 120 ? `${message.body.slice(0, 120)}…` : message.body,
        action: { label: 'Reply', onClick: () => openChat(message.senderUserId) },
        duration: 6000,
      })
    },
    [openChat],
  )

  const chat = useCampusChat({
    active,
    token,
    myUserId,
    onIncomingMessage,
    onReminderEvent: reminders.handleEvent,
  })
  usersRef.current = chat.users

  const { setViewingUserId } = chat
  useEffect(() => {
    setViewingUserId(chatOpen ? activeChatUserId : null)
  }, [chatOpen, activeChatUserId, setViewingUserId])

  useEffect(() => {
    if (!active) {
      setChatOpen(false)
      setActiveChatUserId(null)
    }
  }, [active])

  const ringingCount = reminders.ringing.length
  const badgeCount = active ? chat.unreadTotal + ringingCount : 0
  const flashText = ringingCount > 0 ? 'Reminder due' : chat.unreadTotal > 0 ? 'New message' : ''
  useTabTitleBadge(badgeCount, flashText)

  const value = useMemo(
    () => ({
      active,
      myUserId,
      chatUnread: chat.unreadTotal,
      chatOpen,
      openChat,
      closeChat,
      pendingReminderCount: reminders.pendingTodayCount,
    }),
    [active, myUserId, chat.unreadTotal, chatOpen, openChat, closeChat, reminders.pendingTodayCount],
  )

  return (
    <CampusRealtimeContext.Provider value={value}>
      {children}
      {active ? (
        <>
          <CampusChatDrawer
            open={chatOpen}
            onClose={closeChat}
            chat={chat}
            myUserId={myUserId}
            activeUserId={activeChatUserId}
            onSelectUser={setActiveChatUserId}
          />
          <ReminderAlarmModal
            item={reminders.current}
            queueCount={ringingCount}
            onSnooze={reminders.snooze}
            onDone={reminders.done}
            onDismiss={reminders.dismiss}
          />
        </>
      ) : null}
    </CampusRealtimeContext.Provider>
  )
}

export function useCampusRealtime() {
  return useContext(CampusRealtimeContext)
}

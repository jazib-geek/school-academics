import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import useCampusChat from '../hooks/useCampusChat.jsx'
import { CAMPUS_REALTIME_TOASTER_ID } from '../hooks/useCampusNotifications.jsx'
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
      const title = sender?.username || 'New message'
      const body = message.body || ''
      const preview = body.length > 120 ? `${body.slice(0, 120)}…` : body

      toast.custom(
        (t) => (
          <div className="campus-realtime-toast campus-realtime-toast--chat">
            <div className="campus-realtime-toast__body">
              <div className="campus-realtime-toast__icon" aria-hidden>
                <Mail className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="campus-realtime-toast__text">
                <p className="campus-realtime-toast__title">{title}</p>
                {preview ? <p className="campus-realtime-toast__message">{preview}</p> : null}
              </div>
              <div className="campus-realtime-toast__actions">
                <button
                  type="button"
                  className="campus-realtime-toast__detail"
                  onClick={() => {
                    toast.dismiss(t)
                    openChat(message.senderUserId)
                  }}
                >
                  Reply
                </button>
                <button
                  type="button"
                  className="campus-realtime-toast__close"
                  aria-label="Dismiss"
                  onClick={() => toast.dismiss(t)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ),
        {
          id: `chat-${message.senderUserId}`,
          toasterId: CAMPUS_REALTIME_TOASTER_ID,
          duration: 6000,
        },
      )
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

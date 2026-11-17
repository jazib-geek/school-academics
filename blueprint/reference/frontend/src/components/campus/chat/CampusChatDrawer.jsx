import { useMemo, useState } from 'react'
import { Mail, MessagesSquare, Search, X } from 'lucide-react'
import { formatPkRelative } from '../../../utils/pakistanTime'
import ChatAvatar from './ChatAvatar.jsx'
import ChatConversation from './ChatConversation.jsx'

function shortTime(value) {
  if (!value) return ''
  const label = formatPkRelative(value)
  return label.startsWith('Today ') ? label.slice(6) : label.replace(/,.*$/, '')
}

export default function CampusChatDrawer({
  open,
  onClose,
  chat,
  myUserId,
  activeUserId,
  onSelectUser,
}) {
  const [query, setQuery] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return chat.users.filter((u) => {
      if (onlineOnly && !u.isOnline && !(u.unreadCount > 0)) return false
      return !q || u.username.toLowerCase().includes(q)
    })
  }, [chat.users, query, onlineOnly])

  const activeUser = chat.users.find((u) => u.userId === activeUserId) || null

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/20 backdrop-blur-[1px]"
        aria-label="Close messages"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="campus-chat-title"
        className="absolute inset-y-0 right-0 flex w-[min(100vw,46rem)] bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)] animate-[campus-notif-slide-in_220ms_ease-out]"
      >
        <section
          className={`min-h-0 w-full flex-col border-slate-100 md:flex md:w-[17.5rem] md:shrink-0 md:border-r ${
            activeUser ? 'hidden' : 'flex'
          }`}
        >
          <div className="flex h-[3.75rem] shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <h2
              id="campus-chat-title"
              className="flex items-center gap-2 text-[1.05rem] font-bold tracking-tight text-slate-900"
            >
              <Mail size={18} className="shrink-0 text-indigo-600" strokeWidth={2.25} />
              Messages
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 md:hidden"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="shrink-0 space-y-2 border-b border-slate-100 p-3">
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setOnlineOnly(false)}
                className={`rounded-full px-2.5 py-1 transition ${
                  !onlineOnly ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setOnlineOnly(true)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
                  onlineOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${onlineOnly ? 'bg-white' : 'bg-emerald-500'}`} />
                Online ({chat.onlineCount})
              </button>
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-5 py-10 text-center text-xs text-slate-400">
                {onlineOnly ? 'Nobody else is online right now.' : 'No one found.'}
              </li>
            ) : (
              filtered.map((u) => {
                const selected = u.userId === activeUserId
                return (
                  <li key={u.userId}>
                    <button
                      type="button"
                      onClick={() => onSelectUser(u.userId)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                        selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <ChatAvatar name={u.username} online={u.isOnline} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[13px] ${u.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}
                          >
                            {u.username}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">{shortTime(u.lastAtUtc)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${u.unreadCount > 0 ? 'font-medium text-slate-700' : 'text-slate-400'}`}
                          >
                            {u.lastMessage
                              ? `${u.lastFromMe ? 'You: ' : ''}${u.lastMessage}`
                              : u.isOnline
                                ? 'Online'
                                : 'Tap to start a chat'}
                          </span>
                          {u.unreadCount > 0 ? (
                            <span className="grid h-[1.15rem] min-w-[1.15rem] shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                              {u.unreadCount > 99 ? '99+' : u.unreadCount}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <p className="shrink-0 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
            Messages are kept for 2 days.
          </p>
        </section>

        <section className={`min-h-0 min-w-0 flex-1 flex-col ${activeUser ? 'flex' : 'hidden md:flex'}`}>
          {activeUser ? (
            <ChatConversation
              key={activeUser.userId}
              user={activeUser}
              myUserId={myUserId}
              subscribe={chat.subscribe}
              onRead={chat.markConversationRead}
              onBack={() => onSelectUser(null)}
            />
          ) : (
            <div className="grid flex-1 place-items-center bg-slate-50/60 px-8 text-center">
              <div>
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-indigo-50 text-indigo-400">
                  <MessagesSquare size={26} strokeWidth={1.75} />
                </span>
                <p className="text-sm font-medium text-slate-600">Pick someone to chat with</p>
                <p className="mt-1 text-xs text-slate-400">Green dot means they are online now.</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3.5 hidden rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 md:block"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </section>
      </aside>
    </div>
  )
}

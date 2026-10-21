import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, Loader2, SendHorizontal } from 'lucide-react'
import { getChatConversation, sendChatMessage } from '../../../services/chatService'
import { formatPkDayHeading, formatPkTime, pkDateKey } from '../../../utils/pakistanTime'
import ChatAvatar from './ChatAvatar.jsx'
import ChatEmojiPicker from './ChatEmojiPicker.jsx'

const MAX_LENGTH = 1000

function isEmojiOnly(text) {
  const compact = String(text || '').replace(/\s/g, '')
  if (!compact || [...compact].length > 8) return false
  return /^(\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u.test(compact)
}

export default function ChatConversation({ user, myUserId, subscribe, onRead, onBack }) {
  const otherId = user.userId
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const upsertMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      incoming.forEach((m) => byId.set(m.id, { ...byId.get(m.id), ...m }))
      return [...byId.values()].sort((a, b) => a.id - b.id)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setError('')
    getChatConversation(otherId)
      .then((rows) => {
        if (!cancelled) setMessages(rows)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load messages.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    onRead(otherId)
    inputRef.current?.focus()
    return () => {
      cancelled = true
    }
  }, [otherId, onRead])

  useEffect(
    () =>
      subscribe((type, data) => {
        if (type === 'chat-message') {
          const inThread =
            (data.senderUserId === otherId && data.recipientUserId === myUserId) ||
            (data.senderUserId === myUserId && data.recipientUserId === otherId)
          if (inThread) upsertMessages([data])
        } else if (type === 'chat-read' && data.readerUserId === otherId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderUserId === myUserId && !m.readAtUtc && m.id <= data.upToId ? { ...m, readAtUtc: data.readAtUtc } : m,
            ),
          )
        }
      }),
    [subscribe, otherId, myUserId, upsertMessages],
  )

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, loading])

  const grouped = useMemo(() => {
    const out = []
    let lastDay = null
    messages.forEach((m) => {
      const day = pkDateKey(m.sentAtUtc)
      if (day !== lastDay) {
        out.push({ kind: 'day', key: `day-${day}`, label: formatPkDayHeading(m.sentAtUtc) })
        lastDay = day
      }
      out.push({ kind: 'msg', key: m.id, message: m })
    })
    return out
  }, [messages])

  const insertEmoji = (emoji) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`
    if ([...next].length > MAX_LENGTH) return
    setDraft(next)
    const caret = start + emoji.length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  const send = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const saved = await sendChatMessage(otherId, body)
      if (saved) upsertMessages([saved])
      setDraft('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Message not sent. Please try again.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/60">
      <div className="flex h-[3.75rem] shrink-0 items-center gap-2.5 border-b border-slate-100 bg-white px-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft size={17} />
        </button>
        <ChatAvatar name={user.username} online={user.isOnline} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
          <p className={`text-[11px] ${user.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
            {user.isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="grid h-full place-items-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">Say hello to {user.username}</p>
              <p className="mt-1 text-xs text-slate-400">Messages are kept for 2 days.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {grouped.map((row) => {
              if (row.kind === 'day') {
                return (
                  <li key={row.key} className="flex justify-center py-1.5">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 shadow-sm ring-1 ring-slate-100">
                      {row.label}
                    </span>
                  </li>
                )
              }
              const m = row.message
              const mine = m.senderUserId === myUserId
              return (
                <li key={row.key} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug shadow-sm ${
                      mine
                        ? 'rounded-br-md bg-indigo-600 text-white'
                        : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100'
                    }`}
                  >
                    <p className={`whitespace-pre-wrap break-words ${isEmojiOnly(m.body) ? 'text-2xl leading-snug' : ''}`}>
                      {m.body}
                    </p>
                    <p
                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                        mine ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {formatPkTime(m.sentAtUtc)}
                      {mine ? (
                        m.readAtUtc ? (
                          <CheckCheck size={13} className="text-sky-300" aria-label="Seen" />
                        ) : (
                          <Check size={13} aria-label="Sent" />
                        )
                      ) : null}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white p-2.5">
        {error ? <p className="mb-1.5 px-1 text-xs text-rose-600">{error}</p> : null}
        <div className="flex items-end gap-2">
          <ChatEmojiPicker onPick={insertEmoji} disabled={sending} />
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Type a message"
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            aria-label="Send"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
          </button>
        </div>
        {draft.length > MAX_LENGTH - 100 ? (
          <p className="mt-1 px-1 text-right text-[10px] text-slate-400">
            {draft.length}/{MAX_LENGTH}
          </p>
        ) : null}
      </div>
    </div>
  )
}

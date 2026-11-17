# User-to-user chat (SSE)

Direct messages between users of the **same tenant**, with presence (online dot), read receipts, emoji
reactions, unread badge, and automatic expiry. Transport is **Server-Sent Events** (no SignalR, no
WebSockets) — works behind Plesk/IIS without extra modules.

Original files (copy and rename):

| Layer | Reference | Blueprint |
|---|---|---|
| Entities | `Entities/ChatMessage.cs`, `ChatReaction.cs` | same |
| EF config | `Data/Configurations/UserReminderConfiguration.cs` (contains `ChatMessageConfiguration`, `ChatReactionConfiguration`) | split into `ChatMessageConfiguration.cs`, `ChatReactionConfiguration.cs` (drop reminders) |
| Service | `Application/Services/ChatService.cs`, `Interfaces/IChatService.cs` | `ChatService` (replace `tblUser` legacy fields with new `User`) |
| Sink | `Application/Interfaces/ICampusChatSink.cs`, `API/Services/CampusChatStream.cs` | `IChatSink`, `TenantChatStream` |
| Controller | `API/Controllers/ChatController.cs` | `ChatController` |
| Purge | `API/Services/ChatPurgeService.cs` | `ChatPurgeService` (iterate tenants via `ITenantRegistry`) |
| FE hook | `hooks/useCampusChat.jsx` | `hooks/useChat.jsx` |
| FE context | `contexts/CampusRealtimeContext.jsx` | `contexts/RealtimeContext.jsx` |
| FE UI | `components/campus/chat/*` | `components/chat/*` |
| FE API | `services/chatService.js` | same |

---

## 1. Data model

`dbo.tblChatMessage`

| Column | Type |
|---|---|
| `Id` | `bigint` identity PK |
| `SenderUserId` | `int` FK → `tblUser` (no cascade) |
| `RecipientUserId` | `int` FK → `tblUser` (no cascade) |
| `Body` | `nvarchar(1000)` |
| `SentAtUtc` | `datetime2` |
| `ReadAtUtc` | `datetime2` null |

Indexes: `(RecipientUserId, ReadAtUtc)` for unread counts; `(SenderUserId, RecipientUserId, Id)` and
`(RecipientUserId, SenderUserId, Id)` for conversations; `(SentAtUtc)` for purge.

`dbo.tblChatReaction`

| Column | Type |
|---|---|
| `Id` | `bigint` identity PK |
| `MessageId` | `bigint` FK → `tblChatMessage` cascade |
| `UserId` | `int` |
| `Emoji` | `nvarchar(16)` |
| `CreatedAtUtc` | `datetime2` |

Unique `(MessageId, UserId)` — one reaction per user per message (re-react replaces; same emoji toggles off).

Limits (constants in `ChatService`): `MaxBodyLength = 1000`, `MaxConversationMessages = 300`,
`Retention = Chat:RetentionHours` (default 48 h).

---

## 2. API (`[Authorize]`, `[RequirePermission(PermissionCodes.ChatUse)]`, `[Route("api/chat")]`)

| Method | Route | Purpose |
|---|---|---|
| GET | `users` | active users of this tenant except me: `{ id, username, fullName, isOnline, unreadCount, lastMessage, lastMessageAtUtc }` sorted online → recent → name |
| GET | `conversation/{otherUserId}?afterId=` | last 300 messages (or newer than `afterId`) with reactions |
| POST | `send` `{ recipientUserId, body }` | validate (trim, non-empty, ≤ 1000, recipient active & not self), save, publish `chat-message` to both users |
| POST | `messages/{messageId}/react` `{ emoji }` | toggle/replace reaction, publish `chat-reaction` to both |
| POST | `conversation/{otherUserId}/read` | mark all from other → me as read; publish `chat-read` to other, `chat-read-self` to me |
| GET | `unread-count` | int |
| GET | `stream?access_token=<jwt>` | SSE stream (JWT via query; see `Program.cs` `OnMessageReceived`) |

The stream endpoint: headers `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`,
`Content-Type: text/event-stream`; writes `: connected`, then `event: <type>\ndata: <json>\n\n` per event and
`: ping` every **25 s** heartbeat (copy the loop from `reference/.../ChatController.cs` `Stream`).

Tenant for the stream comes from the JWT `Tenant` claim (EventSource cannot set `X-Tenant`).

---

## 3. In-memory sink (`TenantChatStream`, singleton)

Structure: `tenant → userId → connectionId → Channel<ChatEventDto>` (copy `CampusChatStream.cs`).

- `Subscribe(tenant, userId, ct)` → creates an unbounded channel; first connection for a user broadcasts
  `presence { userId, isOnline: true }`; on cancel removes it and, if last, broadcasts `isOnline: false`.
- `Publish(tenant, userId, evt)` → writes to every connection (tabs/devices) of that user.
- `Broadcast(tenant, evt, exceptUserId)`.
- `GetOnlineUserIds(tenant)`.

**Scale note:** this is single-instance (in-process). If the API ever runs on more than one server, put a
Redis pub/sub (or SQL-backed outbox) behind `IChatSink` — controllers and FE do not change.

Events:

| `event:` | `data` |
|---|---|
| `chat-message` | `ChatMessageDto { id, senderUserId, recipientUserId, body, sentAtUtc, readAtUtc, reactions[] }` |
| `chat-reaction` | `ChatReactionEventDto { messageId, senderUserId, recipientUserId, reactions[] }` |
| `chat-read` | `ChatReadEventDto { readerUserId, upToId, readAtUtc }` |
| `chat-read-self` | `{ otherUserId, upToId }` (sync other tabs) |
| `presence` | `{ userId, isOnline }` |

---

## 4. Purge

- `ChatService.PurgeIfDueAsync` — opportunistic purge on send (at most every 30 min per tenant).
- `ChatPurgeService : BackgroundService` — hourly; for each active tenant create a context via
  `TenantDbContextFactory` and `ExecuteDeleteAsync` messages older than retention (reactions cascade).

---

## 5. Frontend

### 5.1 `useChat({ active, token, myUserId, onIncomingMessage, onIncomingReaction })`

Port `useCampusChat.jsx`:

- Builds `new URL('/api/chat/stream', apiBaseUrl)` + `access_token`, opens `EventSource`.
- Listeners for each event type above; maintains `users`, `onlineIds`, `unreadByUser`, `messagesByUser`.
- `onerror` → close and reconnect after **4 s**; cleanup on unmount / token change.
- Exposes `send(recipientId, body)`, `react(messageId, emoji)`, `markRead(otherId)`, `loadConversation(otherId)`.

### 5.2 `RealtimeProvider` (`contexts/RealtimeContext.jsx`)

- Mounted once in `main.jsx` around `<App />`.
- `active = isAuthenticated() && hasPermission('chat_use')`; re-evaluates on login/logout
  (listen to a `session-changed` window event fired by `authService.persistSession/logout`).
- Context value: `{ openChat(userId?), closeChat(), isChatOpen, unreadTotal, onlineIds }`.
- Renders `<ChatDrawer />` (portal) so any page can open it.
- Incoming message while drawer is closed or on another conversation → realtime toast
  (`REALTIME_TOASTER_ID`) "New message from {name}" with Reply button → `openChat(senderId)`.

### 5.3 UI components (copy from `reference/frontend/src/components/campus/chat/`)

| Component | Notes |
|---|---|
| `ChatDrawer.jsx` | right drawer (same chrome as `Drawer`), two panes on ≥ `sm`: user list (search, online dot, unread badge, last message) / conversation; single pane with back button on phones |
| `ChatConversation.jsx` | message bubbles (mine right `bg-[var(--app-primary)] text-white`, theirs left `bg-slate-100`), day separators, read ticks, reaction chips, auto-scroll, textarea (Enter = send, Shift+Enter = newline), 1000-char counter |
| `ChatEmojiPicker.jsx` | small fixed set of reactions |
| `ChatAvatar.jsx` | initials avatar with deterministic colour + online dot |

Top bar: mail/chat icon with red badge `unreadTotal` (cap "9+") → `realtime.openChat()`.

### 5.4 `services/chatService.js`

```js
export const getChatUsers = async () => unwrap(await api.get('/api/chat/users'))
export const getConversation = async (otherUserId, afterId) => unwrap(await api.get(`/api/chat/conversation/${otherUserId}`, { params: { afterId } }))
export const sendChatMessage = async (recipientUserId, body) => unwrap(await api.post('/api/chat/send', { recipientUserId, body }))
export const reactToMessage = async (messageId, emoji) => unwrap(await api.post(`/api/chat/messages/${messageId}/react`, { emoji }))
export const markConversationRead = async (otherUserId) => unwrap(await api.post(`/api/chat/conversation/${otherUserId}/read`))
export const getUnreadCount = async () => unwrap(await api.get('/api/chat/unread-count'))
```

Copy text: "Messages are kept for 48 hours." in the drawer footer (no technical wording).

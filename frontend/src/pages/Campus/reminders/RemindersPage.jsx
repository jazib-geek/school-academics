import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  Check,
  ChevronDown,
  Clock3,
  ListTodo,
  Loader2,
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ReminderEditorModal from '../../../components/campus/reminders/ReminderEditorModal.jsx'
import {
  KIND_BADGE,
  KIND_LABEL,
  PRIORITY_STRIPE,
  STATUS_BADGE,
  STATUS_LABEL,
  noteCardClass,
} from '../../../components/campus/reminders/reminderStyles'
import { useCampusRealtime } from '../../../contexts/CampusRealtimeContext.jsx'
import { REMINDERS_CHANGED_EVENT } from '../../../hooks/useReminderAlarms.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  createReminder,
  deleteReminder,
  listAssignableUsers,
  listAssignedByMe,
  listMyReminders,
  markReminderDone,
  reopenReminder,
  toggleReminderPin,
} from '../../../services/reminderService'
import { formatPkRelative, pkDateKey, pkInputAt } from '../../../utils/pakistanTime'

const ASSIGN_PERMISSION = 'assign_user_reminders'

const QUICK_CHIPS = [
  { label: '15 min', value: () => pkInputAt({ addMinutes: 15 }) },
  { label: '1 hour', value: () => pkInputAt({ addMinutes: 60 }) },
  { label: 'Tomorrow 9 AM', value: () => pkInputAt({ addDays: 1, hour: 9 }) },
]

const NOTE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Todo', label: 'To-dos' },
  { value: 'Note', label: 'Notes' },
  { value: 'Instruction', label: 'Instructions' },
]

function dueMs(item) {
  const value = item.dueAtUtc || item.remindAtUtc
  return value ? new Date(value).getTime() : null
}

function errorMessage(err, fallback) {
  return err?.response?.data?.message || fallback
}

function usePkClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export default function RemindersPage() {
  const { myUserId } = useCampusRealtime()
  const canAssign = hasCampusPermission(ASSIGN_PERMISSION)
  const now = usePkClock()

  const [tab, setTab] = useState('reminders')
  const [items, setItems] = useState([])
  const [assigned, setAssigned] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)

  const load = useCallback(async () => {
    try {
      const [mine, byMe] = await Promise.all([
        listMyReminders(),
        canAssign ? listAssignedByMe() : Promise.resolve([]),
      ])
      setItems(mine)
      setAssigned(byMe)
    } catch {
      toast.error('Could not load your reminders.')
    } finally {
      setLoading(false)
    }
  }, [canAssign])

  useEffect(() => {
    load()
    window.addEventListener(REMINDERS_CHANGED_EVENT, load)
    return () => window.removeEventListener(REMINDERS_CHANGED_EVENT, load)
  }, [load])

  useEffect(() => {
    if (!canAssign) return
    listAssignableUsers()
      .then(setAssignableUsers)
      .catch(() => setAssignableUsers([]))
  }, [canAssign])

  const changed = () => window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT))

  const act = async (fn, success) => {
    try {
      await fn()
      if (success) toast.success(success)
      changed()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update. Please try again.'))
    }
  }

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    act(() => deleteReminder(item.id), 'Deleted')
  }

  const reminderItems = useMemo(() => items.filter((x) => x.kind === 'Reminder'), [items])
  const noteItems = useMemo(() => items.filter((x) => x.kind !== 'Reminder'), [items])
  const pendingReminders = reminderItems.filter((x) => x.status === 'Pending').length
  const openTodos = noteItems.filter((x) => x.kind !== 'Note' && x.status === 'Pending').length

  const openEditor = (initial) => setEditor(initial || { kind: tab === 'notes' ? 'Note' : 'Reminder' })

  const tabs = [
    { id: 'reminders', label: 'Reminders', icon: AlarmClock, count: pendingReminders },
    { id: 'notes', label: 'Notes & To-dos', icon: NotebookPen, count: openTodos },
    ...(canAssign
      ? [{ id: 'assigned', label: 'Assigned by me', icon: Send, count: assigned.filter((x) => x.status === 'Pending').length }]
      : []),
  ]

  return (
    <CampusShell headerContext="Reminders & Notes">
      <div className="min-h-screen bg-slate-100 p-3 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <AlarmClock size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Reminders &amp; Notes</h1>
                  <p className="text-sm text-slate-500">
                    {now.toLocaleString('en-PK', {
                      timeZone: 'Asia/Karachi',
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}{' '}
                    (Pakistan time)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canAssign ? (
                  <button
                    type="button"
                    onClick={() => setEditor({ kind: 'Todo', assignMode: true })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Send size={16} /> Assign task
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEditor()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white"
                >
                  <Plus size={18} /> New
                </button>
              </div>
            </div>
            <div className="mt-4 inline-flex h-10 max-w-full overflow-x-auto rounded-lg border border-slate-300 bg-white p-0.5">
              {tabs.map((t) => {
                const Icon = t.icon
                const selected = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition ${
                      selected ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={15} />
                    {t.label}
                    {t.count > 0 ? (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-bold ${
                          selected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </section>

          {loading ? (
            <div className="grid place-items-center rounded-2xl bg-white py-16 text-slate-400 shadow-sm">
              <Loader2 className="animate-spin" />
            </div>
          ) : tab === 'reminders' ? (
            <RemindersTab
              items={reminderItems}
              myUserId={myUserId}
              now={now}
              onEdit={openEditor}
              onDelete={handleDelete}
              onDone={(item) => act(() => markReminderDone(item.id), 'Marked as done')}
              onReopen={(item) => act(() => reopenReminder(item.id))}
            />
          ) : tab === 'notes' ? (
            <NotesTab
              items={noteItems}
              myUserId={myUserId}
              onEdit={openEditor}
              onDelete={handleDelete}
              onToggleDone={(item) =>
                act(() => (item.status === 'Pending' ? markReminderDone(item.id) : reopenReminder(item.id)))
              }
              onTogglePin={(item) => act(() => toggleReminderPin(item.id))}
            />
          ) : (
            <AssignedTab
              items={assigned}
              onEdit={openEditor}
              onDelete={handleDelete}
              onAssign={() => setEditor({ kind: 'Todo', assignMode: true })}
            />
          )}
        </div>
      </div>

      {editor ? (
        <ReminderEditorModal
          initial={editor}
          myUserId={myUserId}
          canAssign={canAssign}
          assignableUsers={assignableUsers}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            changed()
          }}
        />
      ) : null}
    </CampusShell>
  )
}

function QuickAddReminder() {
  const [title, setTitle] = useState('')
  const [at, setAt] = useState(() => pkInputAt({ addMinutes: 60 }))
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!title.trim() || !at || saving) return
    setSaving(true)
    try {
      await createReminder({ kind: 'Reminder', title: title.trim(), remindAtPkt: at })
      toast.success(`Reminder set for ${formatPkRelative(new Date(`${at}:00+05:00`))}`)
      setTitle('')
      window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT))
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add the reminder.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-2 md:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Remind me to…"
          className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-[13px] outline-none focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
        />
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] outline-none focus:border-[#405189] focus:ring-2 focus:ring-indigo-100 md:w-56"
        />
        <button
          type="submit"
          disabled={!title.trim() || !at || saving}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#405189] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#364474] disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <AlarmClock size={15} />}
          Set
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Quick:</span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setAt(chip.value())}
            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </form>
  )
}

function RemindersTab({ items, myUserId, now, onEdit, onDelete, onDone, onReopen }) {
  const [showClosed, setShowClosed] = useState(false)
  const nowMs = now.getTime()
  const todayKey = pkDateKey(now)

  const groups = useMemo(() => {
    const pending = items.filter((x) => x.status === 'Pending').sort((a, b) => (dueMs(a) ?? 0) - (dueMs(b) ?? 0))
    return {
      overdue: pending.filter((x) => (dueMs(x) ?? 0) <= nowMs),
      today: pending.filter((x) => (dueMs(x) ?? 0) > nowMs && pkDateKey(x.dueAtUtc || x.remindAtUtc) === todayKey),
      upcoming: pending.filter((x) => (dueMs(x) ?? 0) > nowMs && pkDateKey(x.dueAtUtc || x.remindAtUtc) !== todayKey),
      closed: items
        .filter((x) => x.status !== 'Pending')
        .sort((a, b) => new Date(b.updatedAtUtc) - new Date(a.updatedAtUtc)),
    }
  }, [items, nowMs, todayKey])

  const sections = [
    { key: 'overdue', title: 'Needs attention', tone: 'text-rose-600', rows: groups.overdue },
    { key: 'today', title: 'Later today', tone: 'text-indigo-600', rows: groups.today },
    { key: 'upcoming', title: 'Upcoming', tone: 'text-slate-600', rows: groups.upcoming },
  ]
  const hasPending = sections.some((s) => s.rows.length)

  return (
    <div className="space-y-4">
      <QuickAddReminder />

      {!hasPending ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-400">
            <AlarmClock size={22} />
          </span>
          <p className="text-sm font-medium text-slate-600">No upcoming reminders</p>
          <p className="mt-1 text-xs text-slate-400">Set one above and it will pop up on screen at the right time.</p>
        </div>
      ) : (
        sections
          .filter((s) => s.rows.length)
          .map((s) => (
            <section key={s.key} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <h3 className={`border-b border-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide ${s.tone}`}>
                {s.title} · {s.rows.length}
              </h3>
              <ul className="divide-y divide-slate-100">
                {s.rows.map((item) => (
                  <ReminderRow
                    key={item.id}
                    item={item}
                    myUserId={myUserId}
                    overdue={s.key === 'overdue'}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDone={onDone}
                    onReopen={onReopen}
                  />
                ))}
              </ul>
            </section>
          ))
      )}

      {groups.closed.length ? (
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Done &amp; seen · {groups.closed.length}
            <ChevronDown size={15} className={`transition ${showClosed ? 'rotate-180' : ''}`} />
          </button>
          {showClosed ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {groups.closed.map((item) => (
                <ReminderRow
                  key={item.id}
                  item={item}
                  myUserId={myUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDone={onDone}
                  onReopen={onReopen}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function IconAction({ title, onClick, children, tone = 'hover:bg-slate-100 hover:text-slate-700' }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition ${tone}`}
    >
      {children}
    </button>
  )
}

function ReminderRow({ item, myUserId, overdue, onEdit, onDelete, onDone, onReopen }) {
  const closed = item.status !== 'Pending'
  const canEdit = item.createdByUserId === myUserId
  const fromOther = item.createdByUserId !== myUserId
  const snoozed = item.snoozedUntilUtc && !closed

  return (
    <li className="flex items-stretch gap-3 px-3 py-2.5">
      <span className={`w-1 shrink-0 rounded-full ${PRIORITY_STRIPE[item.priority] || PRIORITY_STRIPE[0]}`} />
      <button
        type="button"
        onClick={() => (closed ? onReopen(item) : onDone(item))}
        title={closed ? 'Mark as not done' : 'Mark as done'}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
          item.status === 'Done'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 text-transparent hover:border-emerald-400 hover:text-emerald-400'
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold ${closed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</p>
        {item.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`inline-flex items-center gap-1 font-medium ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
            <Clock3 size={11} />
            {formatPkRelative(item.remindAtUtc)}
          </span>
          {snoozed ? (
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700 ring-1 ring-violet-100">
              Snoozed till {formatPkRelative(item.snoozedUntilUtc)}
            </span>
          ) : null}
          {fromOther ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700 ring-1 ring-sky-100">
              <UserRound size={10} /> From {item.createdByName}
            </span>
          ) : null}
          {closed ? (
            <span className={`rounded-full px-1.5 py-0.5 font-semibold ring-1 ${STATUS_BADGE[item.status]}`}>
              {STATUS_LABEL[item.status]}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-0.5">
        {closed ? (
          <IconAction title="Remind again" onClick={() => onReopen(item)}>
            <RotateCcw size={14} />
          </IconAction>
        ) : null}
        {canEdit ? (
          <>
            <IconAction title="Edit" onClick={() => onEdit(item)}>
              <Pencil size={14} />
            </IconAction>
            <IconAction title="Delete" onClick={() => onDelete(item)} tone="hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={14} />
            </IconAction>
          </>
        ) : null}
      </div>
    </li>
  )
}

function NotesTab({ items, myUserId, onEdit, onDelete, onToggleDone, onTogglePin }) {
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickKind, setQuickKind] = useState('Todo')
  const [saving, setSaving] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((x) => !filter || x.kind === filter)
      .filter((x) => !q || x.title.toLowerCase().includes(q) || (x.body || '').toLowerCase().includes(q))
  }, [items, filter, query])

  const pinned = visible.filter((x) => x.isPinned && x.status === 'Pending')
  const others = visible.filter((x) => !x.isPinned && x.status === 'Pending')
  const completed = visible.filter((x) => x.status !== 'Pending')

  const quickAdd = async (event) => {
    event.preventDefault()
    if (!quickTitle.trim() || saving) return
    setSaving(true)
    try {
      await createReminder({ kind: quickKind, title: quickTitle.trim() })
      setQuickTitle('')
      window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT))
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add.'))
    } finally {
      setSaving(false)
    }
  }

  const renderGrid = (rows) => (
    <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 [&>*]:mb-3">
      {rows.map((item) => (
        <NoteCard
          key={item.id}
          item={item}
          myUserId={myUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <form onSubmit={quickAdd} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { value: 'Todo', label: 'To-do', icon: ListTodo },
              { value: 'Note', label: 'Note', icon: NotebookPen },
            ].map((k) => {
              const Icon = k.icon
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setQuickKind(k.value)}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    quickKind === k.value ? 'bg-white text-[#405189] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Icon size={13} /> {k.label}
                </button>
              )
            })}
          </div>
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            maxLength={200}
            placeholder={quickKind === 'Todo' ? 'Add a to-do…' : 'Take a note…'}
            className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-[13px] outline-none focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim() || saving}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#405189] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#364474] disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {NOTE_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === f.value ? 'bg-[#405189] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-[#405189]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-400">
            <NotebookPen size={22} />
          </span>
          <p className="text-sm font-medium text-slate-600">Nothing here yet</p>
          <p className="mt-1 text-xs text-slate-400">Jot down notes, to-dos and instructions for yourself.</p>
        </div>
      ) : (
        <>
          {pinned.length ? (
            <div>
              <p className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <Pin size={12} /> Pinned
              </p>
              {renderGrid(pinned)}
            </div>
          ) : null}
          {others.length ? (
            <div>
              {pinned.length ? (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Others</p>
              ) : null}
              {renderGrid(others)}
            </div>
          ) : null}
          {completed.length ? (
            <div className="opacity-75">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Completed</p>
              {renderGrid(completed)}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function NoteCard({ item, myUserId, onEdit, onDelete, onToggleDone, onTogglePin }) {
  const canEdit = item.createdByUserId === myUserId
  const checkable = item.kind !== 'Note'
  const done = item.status !== 'Pending'

  return (
    <article className={`group break-inside-avoid rounded-xl p-3 shadow-sm ring-1 transition hover:shadow-md ${noteCardClass(item.color)}`}>
      <div className="flex items-start gap-2">
        {checkable ? (
          <button
            type="button"
            onClick={() => onToggleDone(item)}
            title={done ? 'Mark as not done' : 'Mark as done'}
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${
              done
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 bg-white text-transparent hover:border-emerald-400 hover:text-emerald-400'
            }`}
          >
            <Check size={12} strokeWidth={3} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h4 className={`text-[13px] font-semibold leading-snug ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {item.title}
          </h4>
          {item.body ? (
            <p className={`mt-1 whitespace-pre-wrap text-xs leading-relaxed ${done ? 'text-slate-400' : 'text-slate-600'}`}>
              {item.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onTogglePin(item)}
          title={item.isPinned ? 'Unpin' : 'Pin'}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
            item.isPinned ? 'text-[#405189]' : 'text-slate-300 opacity-0 hover:text-slate-600 group-hover:opacity-100'
          }`}
        >
          {item.isPinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`rounded-full px-1.5 py-0.5 font-semibold ring-1 ${KIND_BADGE[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
        {item.priority > 0 ? (
          <span
            className={`rounded-full px-1.5 py-0.5 font-semibold ring-1 ${
              item.priority >= 2 ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-amber-50 text-amber-700 ring-amber-100'
            }`}
          >
            {item.priority >= 2 ? 'Urgent' : 'High'}
          </span>
        ) : null}
        {item.remindAtUtc ? (
          <span className="inline-flex items-center gap-0.5 font-medium text-slate-500">
            <AlarmClock size={10} /> {formatPkRelative(item.dueAtUtc || item.remindAtUtc)}
          </span>
        ) : null}
        {item.createdByUserId !== myUserId ? (
          <span className="inline-flex items-center gap-0.5 font-semibold text-sky-700">
            <UserRound size={10} /> {item.createdByName}
          </span>
        ) : null}
        {canEdit ? (
          <span className="ml-auto flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <IconAction title="Edit" onClick={() => onEdit(item)}>
              <Pencil size={13} />
            </IconAction>
            <IconAction title="Delete" onClick={() => onDelete(item)} tone="hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={13} />
            </IconAction>
          </span>
        ) : null}
      </div>
    </article>
  )
}

function AssignedTab({ items, onEdit, onDelete, onAssign }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-sky-50 text-sky-400">
          <Send size={22} />
        </span>
        <p className="text-sm font-medium text-slate-600">You have not assigned anything yet</p>
        <button
          type="button"
          onClick={onAssign}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#405189] px-3 text-xs font-semibold text-white"
        >
          <Plus size={14} /> Assign a task
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full text-[13px] leading-snug">
        <thead>
          <tr className="bg-[#405189] text-left text-white">
            <th className="px-3 py-2 font-semibold">For</th>
            <th className="px-3 py-2 font-semibold">Task</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Alarm</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Assigned</th>
            <th className="px-3 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-3 py-1.5 font-medium text-slate-800">{item.ownerName}</td>
              <td className="max-w-xs px-3 py-1.5">
                <p className="truncate font-medium text-slate-800">{item.title}</p>
                {item.body ? <p className="truncate text-xs text-slate-400">{item.body}</p> : null}
              </td>
              <td className="px-3 py-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${KIND_BADGE[item.kind]}`}>
                  {KIND_LABEL[item.kind]}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                {item.remindAtUtc ? formatPkRelative(item.remindAtUtc) : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_BADGE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                {item.completedAtUtc && item.status === 'Done' ? (
                  <span className="ml-1.5 text-[11px] text-slate-400">{formatPkRelative(item.completedAtUtc)}</span>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{formatPkRelative(item.createdAtUtc)}</td>
              <td className="px-3 py-1.5">
                <div className="flex justify-end gap-1">
                  <button type="button" className="btn-table-action" title="Edit" onClick={() => onEdit(item)}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="btn-table-action" title="Delete" onClick={() => onDelete(item)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

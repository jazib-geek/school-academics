import { useMemo, useState } from 'react'
import Select from 'react-select'
import { Check, Loader2, Pin, X } from 'lucide-react'
import { toast } from 'sonner'
import { createReminder, updateReminder } from '../../../services/reminderService'
import { pkInputAt, toPkInputValue } from '../../../utils/pakistanTime'
import { KIND_OPTIONS, NOTE_COLORS, PRIORITY_OPTIONS } from './reminderStyles'

const QUICK_TIMES = [
  { label: 'In 15 min', value: () => pkInputAt({ addMinutes: 15 }) },
  { label: 'In 1 hour', value: () => pkInputAt({ addMinutes: 60 }) },
  { label: 'Today 5 PM', value: () => pkInputAt({ hour: 17 }) },
  { label: 'Tomorrow 9 AM', value: () => pkInputAt({ addDays: 1, hour: 9 }) },
  { label: 'Next week', value: () => pkInputAt({ addDays: 7, hour: 9 }) },
]

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

function buildForm(initial) {
  return {
    kind: initial?.kind || 'Reminder',
    title: initial?.title || '',
    body: initial?.body || '',
    color: initial?.color || '',
    isPinned: Boolean(initial?.isPinned),
    priority: Number(initial?.priority) || 0,
    remindAtPkt: initial?.remindAtUtc ? toPkInputValue(initial.remindAtUtc) : initial?.remindAtPkt || '',
    ownerUserId: initial?.ownerUserId || null,
  }
}

export default function ReminderEditorModal({ initial, myUserId, canAssign, assignableUsers, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState(() => buildForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const assignMode = Boolean(initial?.assignMode)
  const userOptions = useMemo(
    () => [
      ...(assignMode ? [] : [{ value: myUserId, label: 'Myself' }]),
      ...assignableUsers.map((u) => ({ value: u.userId, label: u.username })),
    ],
    [assignableUsers, myUserId, assignMode],
  )
  const selectedOwner =
    assignMode && !form.ownerUserId
      ? null
      : userOptions.find((o) => o.value === (form.ownerUserId || myUserId)) ||
        (initial?.ownerUserId && initial.ownerUserId !== myUserId
          ? { value: initial.ownerUserId, label: initial.ownerName || 'User' }
          : userOptions[0])

  const needsTime = form.kind === 'Reminder'

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Please add a title.')
      return
    }
    if (assignMode && !form.ownerUserId) {
      setError('Choose who this is for.')
      return
    }
    if (needsTime && !form.remindAtPkt) {
      setError('Pick a date and time for the reminder.')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      body: form.body,
      color: form.color,
      isPinned: form.isPinned,
      priority: form.priority,
      remindAtPkt: form.remindAtPkt || null,
      ownerUserId: form.ownerUserId && form.ownerUserId !== myUserId ? form.ownerUserId : null,
    }

    try {
      const saved = isEdit ? await updateReminder(initial.id, payload) : await createReminder(payload)
      toast.success(
        isEdit ? 'Saved' : payload.ownerUserId ? `Sent to ${selectedOwner?.label || 'user'}` : 'Added',
      )
      onSaved?.(saved)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-900/40 p-3 backdrop-blur-[1px]" role="presentation">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-editor-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id="reminder-editor-title" className="text-base font-bold text-slate-900">
            {assignMode ? 'Assign' : isEdit ? 'Edit' : 'New'} {KIND_OPTIONS.find((k) => k.value === form.kind)?.label.toLowerCase()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => set({ kind: k.value })}
                className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                  form.kind === k.value ? 'bg-white text-[#405189] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-slate-700">Title</span>
            <input
              autoFocus
              value={form.title}
              maxLength={200}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={form.kind === 'Reminder' ? 'e.g. Call the bus driver' : 'What is it about?'}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-slate-700">Details</span>
            <textarea
              value={form.body}
              maxLength={4000}
              rows={form.kind === 'Note' || form.kind === 'Instruction' ? 5 : 3}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="Optional"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div>
            <span className="mb-1 block text-[13px] font-medium text-slate-700">
              {needsTime ? 'Remind me at (Pakistan time)' : 'Alarm (optional, Pakistan time)'}
            </span>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={form.remindAtPkt}
                onChange={(e) => set({ remindAtPkt: e.target.value })}
                className={inputClass}
              />
              {form.remindAtPkt && !needsTime ? (
                <button
                  type="button"
                  onClick={() => set({ remindAtPkt: '' })}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_TIMES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => set({ remindAtPkt: q.value() })}
                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {canAssign ? (
            <div>
              <span className="mb-1 block text-[13px] font-medium text-slate-700">For</span>
              <Select
                classNamePrefix="react-select"
                options={userOptions}
                value={selectedOwner}
                placeholder="Choose a person"
                onChange={(opt) => set({ ownerUserId: opt?.value || null })}
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 100 }) }}
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-[13px] font-medium text-slate-700">Priority</span>
              <div className="flex gap-1">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set({ priority: p.value })}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition ${
                      form.priority === p.value
                        ? p.value === 2
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : p.value === 1
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-[#405189] bg-indigo-50 text-[#405189]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[13px] font-medium text-slate-700">Color</span>
              <div className="flex items-center gap-1.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.key || 'plain'}
                    type="button"
                    onClick={() => set({ color: c.key })}
                    title={c.label}
                    aria-label={c.label}
                    className={`grid h-7 w-7 place-items-center rounded-full ring-1 ring-slate-300 ${c.swatch} ${
                      form.color === c.key ? 'ring-2 ring-[#405189]' : ''
                    }`}
                  >
                    {form.color === c.key ? <Check size={13} className="text-slate-700" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => set({ isPinned: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Pin size={14} className="text-slate-500" /> Pin to top
          </label>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#405189] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#364474] disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

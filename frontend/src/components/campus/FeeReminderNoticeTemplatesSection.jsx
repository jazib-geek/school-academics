import { useEffect, useMemo, useState } from 'react'
import { Eye, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import RichTextEditor from './RichTextEditor.jsx'
import {
  SettingsCard,
  SettingsField,
  SettingsSegmented,
  settingsInputClass,
} from './settings/SettingsUi.jsx'
import {
  getFeeReminderTemplates,
  updateFeeReminderTemplate,
} from '../../services/feeReminderNoticeService'
import { formatNoticeDueDate, renderBodyHtml } from '../../utils/feeReminderNoticePrint'

const NOTICE_TYPES = [
  { value: 'pre_due', label: 'Before due date' },
  { value: 'last_due', label: 'Last reminder' },
]

function draftFromTemplate(match) {
  return {
    title: match?.title || '',
    greeting: match?.greeting || '',
    bodyText: match?.bodyText || '',
    closingText: match?.closingText || '',
    dayOfMonth: match?.dayOfMonth ?? 10,
  }
}

const isSameDraft = (a, b) =>
  a.title === b.title &&
  a.greeting === b.greeting &&
  a.bodyText === b.bodyText &&
  a.closingText === b.closingText &&
  Number(a.dayOfMonth) === Number(b.dayOfMonth)

export default function FeeReminderNoticeTemplatesSection({ disabled = false }) {
  const [templates, setTemplates] = useState([])
  const [noticeCode, setNoticeCode] = useState('pre_due')
  const [drafts, setDrafts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        const tpl = await getFeeReminderTemplates()
        if (cancelled) return
        const list = Array.isArray(tpl) ? tpl : []
        setTemplates(list)
        setDrafts(
          Object.fromEntries(
            NOTICE_TYPES.map((t) => [t.value, draftFromTemplate(list.find((x) => x.code === t.value))]),
          ),
        )
      } catch {
        if (!cancelled) toast.error('Could not load fee reminder notice wording.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const savedFor = (code) => draftFromTemplate(templates.find((t) => t.code === code))
  const isDirty = (code) => (drafts[code] ? !isSameDraft(drafts[code], savedFor(code)) : false)

  const draft = drafts[noticeCode] || draftFromTemplate(null)
  const isPreDue = noticeCode === 'pre_due'
  const dirty = isDirty(noticeCode)

  const setField = (field, value) =>
    setDrafts((prev) => ({ ...prev, [noticeCode]: { ...(prev[noticeCode] || draft), [field]: value } }))

  const handleDiscard = () => setDrafts((prev) => ({ ...prev, [noticeCode]: savedFor(noticeCode) }))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await updateFeeReminderTemplate(noticeCode, {
        title: draft.title,
        greeting: draft.greeting,
        bodyText: draft.bodyText,
        closingText: draft.closingText,
        dayOfMonth: isPreDue ? draft.dayOfMonth : null,
      })
      const merged = { ...templates.find((t) => t.code === noticeCode), ...updated, code: noticeCode }
      setTemplates((prev) =>
        prev.some((t) => t.code === noticeCode)
          ? prev.map((t) => (t.code === noticeCode ? merged : t))
          : [...prev, merged],
      )
      setDrafts((prev) => ({ ...prev, [noticeCode]: draftFromTemplate(merged) }))
      toast.success('Fee reminder notice wording saved.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save notice wording.')
    } finally {
      setIsSaving(false)
    }
  }

  const previewBody = useMemo(() => {
    const now = new Date()
    const dueLabel = isPreDue ? formatNoticeDueDate(draft.dayOfMonth, now.getMonth(), now.getFullYear()) : ''
    return renderBodyHtml(draft.bodyText, dueLabel, isPreDue)
  }, [draft.bodyText, draft.dayOfMonth, isPreDue])

  return (
    <SettingsCard
      title="Fee reminder notices"
      description="Wording printed on fee reminder vouchers from the Fee menu."
      aside={
        isLoading ? null : (
          <SettingsSegmented
            options={NOTICE_TYPES.map((t) => ({ ...t, badge: isDirty(t.value) }))}
            value={noticeCode}
            onChange={setNoticeCode}
          />
        )
      }
      footer={
        isLoading ? null : (
          <>
            {dirty ? <span className="mr-auto text-xs font-medium text-amber-700">Unsaved changes</span> : null}
            <button
              type="button"
              onClick={handleDiscard}
              disabled={disabled || isSaving || !dirty}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isSaving || !dirty}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#405189] px-4 text-[13px] font-semibold text-white hover:bg-[#364574] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save notice
            </button>
          </>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className={`grid gap-4 ${isPreDue ? 'sm:grid-cols-[minmax(0,1fr)_9rem]' : ''}`}>
              <SettingsField label="Title">
                <input
                  className={settingsInputClass}
                  value={draft.title}
                  disabled={disabled}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </SettingsField>
              {isPreDue ? (
                <SettingsField label="Due day of month">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={settingsInputClass}
                    value={draft.dayOfMonth ?? 10}
                    disabled={disabled}
                    onChange={(e) => setField('dayOfMonth', Number(e.target.value) || 10)}
                  />
                </SettingsField>
              ) : null}
            </div>

            <SettingsField label="Greeting">
              <input
                className={settingsInputClass}
                value={draft.greeting}
                disabled={disabled}
                onChange={(e) => setField('greeting', e.target.value)}
              />
            </SettingsField>

            <div>
              <span className="text-[13px] font-medium text-slate-700">Message</span>
              <RichTextEditor
                className="mt-1"
                value={draft.bodyText}
                disabled={disabled}
                onChange={(html) => setField('bodyText', html)}
                placeholder="Write the notice message…"
              />
              {isPreDue ? (
                <p className="mt-1 text-xs text-slate-500">
                  Type{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                    {'{dueDate}'}
                  </code>{' '}
                  where the due date should appear.
                </p>
              ) : null}
            </div>

            <SettingsField label="Closing line">
              <input
                className={settingsInputClass}
                value={draft.closingText}
                disabled={disabled}
                onChange={(e) => setField('closingText', e.target.value)}
              />
            </SettingsField>
          </div>

          <div className="xl:sticky xl:top-20 xl:self-start">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Eye size={14} /> Preview
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-2.5 rounded-md border border-slate-200 bg-white p-4 text-[12px] leading-relaxed text-slate-800 shadow-sm">
                <p className="text-center text-[13px] font-bold uppercase underline underline-offset-2">
                  {draft.title || 'Title'}
                </p>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Student: ________</span>
                  <span>Class: ______</span>
                </div>
                {draft.greeting ? <p className="font-medium">{draft.greeting}</p> : null}
                <div
                  className="[&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: previewBody || '<p class="text-slate-400">Message…</p>' }}
                />
                {draft.closingText ? <p>{draft.closingText}</p> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  )
}

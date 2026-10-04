import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BookCheck, BookOpen, CalendarDays, Check, ChevronRight, CircleCheck, ClipboardCheck, Clock3, Eye, FileText, GraduationCap, HeartHandshake, ListChecks, MessageCircle, MessageSquare, NotebookPen, Paperclip, PhoneCall, Plus, Printer, Search, Send, ShieldCheck, Sunrise, Sunset, Trash2, Users, X } from 'lucide-react'
import CoordinatorAbsentFollowupTab from '../../components/employee/CoordinatorAbsentFollowupTab'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import QuickChoiceField from '../../components/employee/QuickChoiceField'
import EmployeeSheetHeading from '../../components/employee/EmployeeSheetHeading'
import NotebookRecheckFields from '../../components/employee/NotebookRecheckFields'
import ProformaPageOne, { PageOneChecklist } from '../../components/employee/ProformaPageOne'
import NotebookSchedule from '../../components/employee/NotebookSchedule'
import ProformaPaperPreview from '../../components/employee/ProformaPaperPreview'
import ProformaSectionPage from '../../components/employee/ProformaSectionPage'
import { getCampusLabel } from '../../constants/branding'
import { proformaWingLabel } from '../../utils/proformaWings'
import { fetchProformaDay, fetchProformaLookups, mapDayDtoToReport, saveProformaDay, submitProformaDay } from '../../services/coordinatorProformaApi'
import {
  buildProformaSections,
  createReport,
  EMPTY_PROFORMA_LOOKUPS,
  PROFORMA_LOOKUP_ID_KEYS,
  todayInPakistan,
  WINGS,
  NOTEBOOK_SCHEDULE_DAYS,
  hasNotebookSchedule,
  prepareReportForPrint,
  sectionProofreadStatus,
} from './coordinatorWorkspaceData'
import { openProformaPrint } from '../Heads/ProformaPrint'
import {
  EMPLOYEE_PROFORMA_LIVE_EVENT,
  reportDateFromEmployeeNotification,
} from '../../utils/employeeProformaLiveUpdate'
import './coordinatorWorkspace.css'

/** Legacy proforma follow-ups / report preview tabs — hidden from nav; code kept for later. */
const SHOW_LEGACY_COORDINATOR_TABS = false

const headNotesStorageKey = (reportId) => `cw-head-notes-seen-${reportId}`

function headNotesSignature(comments) {
  if (!comments?.length) return ''
  const last = comments[comments.length - 1]
  return `${comments.length}|${last.by ?? ''}|${last.at ?? ''}|${last.text ?? ''}`
}

function readSeenHeadNotesSignature(reportId) {
  if (!reportId) return ''
  try {
    return localStorage.getItem(headNotesStorageKey(reportId)) || ''
  } catch {
    return ''
  }
}

function writeSeenHeadNotesSignature(reportId, signature) {
  if (!reportId || !signature) return
  try {
    localStorage.setItem(headNotesStorageKey(reportId), signature)
  } catch {
    // ignore quota errors
  }
}

const workspacePayload = (report) => {
  const { reportId: _reportId, submittedAt: _submittedAt, ...workspace } = report
  return workspace
}

const uid = () => crypto.randomUUID()
const SECTION_VISUALS = {
  criticalDiary: [NotebookPen, 'amber'],
  dailyChecks: [ListChecks, 'mint'], activities: [CalendarDays, 'violet'], priority: [MessageCircle, 'amber'],
  morning: [Sunrise, 'amber'], dispatch: [Send, 'blue'], routine: [ListChecks, 'mint'],
  friday: [CalendarDays, 'violet'], tests: [ClipboardCheck, 'blue'], oxygen: [MessageCircle, 'mint'],
  kaizen: [GraduationCap, 'violet'], diary: [BookOpen, 'blue'], notebooks: [BookCheck, 'mint'],
  observation: [NotebookPen, 'amber'], parents: [Users, 'blue'], teachers: [HeartHandshake, 'mint'],
  faculty: [ShieldCheck, 'violet'], closing: [Sunset, 'amber'],
}
const describeEntry = (entry) => {
  if (entry.section === 'notebooks') {
    const summary = [
      entry.values.details,
      entry.values.writing ? `Writing: ${entry.values.writing}` : '',
      entry.values.correction ? `Correction: ${entry.values.correction}` : '',
    ].filter(Boolean).join(' · ')
    return summary || 'Copy check recorded'
  }
  return entry.values.details || entry.values.concern || entry.values.strengths || entry.values.title || entry.values.pending || 'Details recorded'
}
const entryContext = (entry) => [entry.values.class, entry.values.subject, entry.values.student, entry.values.teacher, entry.values.kind].filter(Boolean).join(' · ')
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })

function normalizeChoiceOptions(options) {
  return (options || []).map((option) => (typeof option === 'string' ? { value: option, label: option } : option))
}

function normalizeClassLabel(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
}

function studentOptionsForSelectedClass(studentOptions, values) {
  const classId = values?.classId
  const classLabel = String(values?.class ?? '').trim()
  if (!classId && !classLabel) return []
  const items = normalizeChoiceOptions(studentOptions)
  if (classId) {
    const bySection = items.filter((opt) => String(opt.sectionId ?? '') === String(classId))
    if (bySection.length > 0) return bySection
  }
  if (!classLabel) return []
  const target = normalizeClassLabel(classLabel)
  return items.filter((opt) => normalizeClassLabel(opt.description) === target)
}

const PROFORMA_LOOKUP_SELECT_KEYS = new Set(['class', 'subject', 'teacher', 'student'])

function Field({ definition, value, values, onChange, lookupsLoading = false }) {
  const { key, label, type, options } = definition
  if (type === 'inline') return <fieldset className="cw-paper-choices cw-wide"><legend>{label}</legend><div>{options.map(option => <label key={option}><input type="checkbox" checked={value === option} onChange={() => onChange(key, value === option ? '' : option)} /><span>{option}</span></label>)}</div></fieldset>
  if (type === 'select') {
    const idKey = PROFORMA_LOOKUP_ID_KEYS[key]
    const items = normalizeChoiceOptions(options)
    const storedId = idKey ? values?.[idKey] : ''
    const selectValue = storedId || value || ''
    const isStudent = key === 'student'
    const choiceOptions = isStudent ? studentOptionsForSelectedClass(options, values) : options
    const classSelected = Boolean(String(values?.class ?? '').trim() || values?.classId)
    const optionsLoading = Boolean(
      lookupsLoading
      && PROFORMA_LOOKUP_SELECT_KEYS.has(key)
      && (!isStudent || classSelected),
    )
    return (
      <QuickChoiceField
        label={label}
        options={choiceOptions}
        value={selectValue}
        searchable={['class', 'subject', 'teacher', 'student'].includes(key)}
        disabled={isStudent && !classSelected}
        loading={optionsLoading}
        onChange={(next) => {
          if (!idKey) {
            onChange(key, next)
            return
          }
          if (!next) {
            onChange({ [key]: '', [idKey]: '' })
            return
          }
          const option = items.find((item) => item.value === next)
          if (key === 'class') {
            onChange({
              [idKey]: next,
              [key]: option?.label ?? '',
              student: '',
              studentId: '',
            })
            return
          }
          onChange({ [idKey]: next, [key]: option?.label ?? '' })
        }}
      />
    )
  }
  return <div className={`cw-field ${type === 'textarea' ? 'cw-wide' : ''}`}>
    <span>{label}</span>
    {definition.emptyResponse && <span className="cw-empty-response"><input type="checkbox" aria-label={label + ': ' + definition.emptyResponse} checked={value === definition.emptyResponse} onChange={() => onChange(key, value === definition.emptyResponse ? '' : definition.emptyResponse)} />{definition.emptyResponse}</span>}
    {type === 'textarea' ? <textarea aria-label={label} dir="auto" rows={3} value={value || ''} onChange={(e) => onChange(key, e.target.value)} placeholder="Add a short note…" />
      : <input aria-label={label} dir="auto" type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined} value={value || ''} onChange={(e) => onChange(key, e.target.value)} />}
  </div>
}

function MeetingPoints({ value, onChange }) {
  const points = (value || '').split('\n')
  return <div className="cw-meeting-points"><p>Morning Meeting · record each point on a separate line.</p>{points.map((point, index) => <div key={index}><span>{index + 1}</span><textarea aria-label={`Meeting point ${index + 1}`} dir="auto" rows={2} value={point} onChange={(event) => onChange(points.map((text, i) => i === index ? event.target.value.replace(/\n/g, ' ') : text).join('\n'))} /><button type="button" className="cw-icon" aria-label={`Remove meeting point ${index + 1}`} onClick={() => onChange(points.filter((_, i) => i !== index).join('\n'))}><Trash2 size={16} /></button></div>)}<button type="button" className="cw-text-button" onClick={() => onChange([...points, ''].join('\n'))}><Plus size={16} /> Add point</button></div>
}

function Attachment({ file, onRemove }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return <div className="cw-attachment">
    {file.type.startsWith('image/') ? <img src={url} alt={file.name} /> : <FileText size={22} />}
    <a href={url} target="_blank" rel="noreferrer">{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></a>
    {onRemove && <button type="button" className="cw-icon" aria-label={`Remove ${file.name}`} onClick={onRemove}><X size={18} /></button>}
  </div>
}

function Modal({ title, subtitle, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    // Avoid painting a focus ring on the header close control when the dialog opens.
    requestAnimationFrame(() => dialog.focus())
    return () => { dialog.close(); document.body.style.overflow = oldOverflow }
  }, [])
  return <dialog ref={ref} className="cw-modal" tabIndex={-1} aria-labelledby="cw-modal-title" onCancel={onClose}>
    <header><div><p className="cw-eyebrow">COORDINATOR WORKSPACE</p><EmployeeSheetHeading id="cw-modal-title">{title}</EmployeeSheetHeading>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="cw-icon" aria-label="Close" onClick={onClose}><X size={20} strokeWidth={2} aria-hidden="true" /></button></header>
    {children}
  </dialog>
}

function InlineEditor({ title, subtitle, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }, [])
  return <section ref={ref} className="cw-inline-editor" aria-label={title}><header><div><EmployeeSheetHeading level={3}>{title}</EmployeeSheetHeading><p>{subtitle}</p></div><button className="cw-icon" type="button" onClick={onClose} aria-label="Close editor"><X size={18} /></button></header>{children}</section>
}

function EntryEditor({ section, entry, action, locked, approved = false, onClose, onSave, reportDate, inline = false, lookupsLoading = false }) {
  const [values, setValues] = useState(entry?.values || {})
  const [attachments, setAttachments] = useState(entry?.attachments || [])
  const [followup, setFollowup] = useState(Boolean(action))
  const [task, setTask] = useState(action || { title: '', owner: '', due: '' })
  const update = (keyOrPatch, value) => setValues((current) => {
    const patch = typeof keyOrPatch === 'object' && keyOrPatch !== null
      ? keyOrPatch
      : { [keyOrPatch]: value }
    const next = { ...current, ...patch }
    if (section.id === 'tests' && patch.kind !== undefined) {
      const hidden = patch.kind === 'Retest' ? ['copies', 'absentCount'] : patch.kind === 'SOS test' ? ['testDate', 'period', 'students'] : []
      hidden.forEach((field) => { delete next[field] })
    }
    return next
  })
  const editorFields = section.fields.filter(field => section.id !== 'tests' || !(values.kind === 'Retest' ? ['copies', 'absentCount'] : values.kind === 'SOS test' ? ['testDate', 'period', 'students'] : []).includes(field.key))
  const addFiles = (event) => {
    const files = Array.from(event.target.files || [])
    const supported = files.filter((file) => (file.type.startsWith('image/') || file.type === 'application/pdf') && file.size <= 10 * 1024 * 1024)
    if (supported.length !== files.length) toast.error('Choose images or PDFs up to 10 MB each for this preview.')
    setAttachments((current) => [...current, ...supported])
    event.target.value = ''
  }
  const Container = inline ? InlineEditor : Modal
  const lockSubtitle = locked
    ? (approved ? 'Approved report · locked' : 'Submitted report · read only')
    : 'All fields are optional. Record what matters.'
  return <Container title={entry ? section.title : `Add ${section.short.toLowerCase()} entry`} subtitle={lockSubtitle} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ id: entry?.id || uid(), section: section.id, values, attachments }, followup ? task : null) }}>
      <div className="cw-modal-body">
        <fieldset disabled={locked} className={['notebooks', 'morning', 'observation'].includes(section.id) ? 'cw-paper-fieldset' : 'cw-form-grid'}>{section.id === 'notebooks' ? <NotebookRecheckFields reportDate={reportDate} values={values} onChange={update} fields={section.fields} renderField={(definition) => <Field key={definition.key} definition={definition} values={values} value={values[definition.key]} onChange={update} lookupsLoading={lookupsLoading} />} /> : section.id === 'morning' ? <MeetingPoints value={values.details} onChange={(value) => update('details', value)} /> : section.id === 'observation' ? <><div className="cw-form-grid">{editorFields.filter(field => !field.key.startsWith('check')).map(definition => <Field key={definition.key} definition={definition} values={values} value={values[definition.key]} onChange={update} lookupsLoading={lookupsLoading} />)}</div><details className="cw-observation-rubric"><summary>Observation criteria · optional checks</summary><p>{section.description}</p>{editorFields.filter(field => field.key.startsWith('check')).map(definition => <Field key={definition.key} definition={{ ...definition, type: 'inline' }} value={values[definition.key]} onChange={update} />)}</details></> : editorFields.map((definition) => <Field key={definition.key} definition={definition} values={values} value={values[definition.key]} onChange={update} lookupsLoading={lookupsLoading} />)}</fieldset>
        <section className="cw-editor-block"><h3><Paperclip size={17} /> Evidence</h3><p>Attachments are saved on this device for now and are not uploaded to the server.</p>
          {attachments.map((file, index) => <Attachment key={`${file.name}-${index}`} file={file} onRemove={locked ? undefined : () => setAttachments((items) => items.filter((_, i) => i !== index))} />)}
          {!locked && <label className="cw-upload"><Plus size={17} /> Add photos or documents<input type="file" multiple accept="image/*,application/pdf" onChange={addFiles} /></label>}
        </section>
        <fieldset disabled={locked} className="cw-editor-block">
          <label className="cw-toggle"><input type="checkbox" checked={followup} onChange={(e) => setFollowup(e.target.checked)} /><span><strong>Needs a follow-up</strong><small>Keep the action visible beyond this daily report.</small></span></label>
          {followup && <div className="cw-form-grid cw-task-fields">
            <Field definition={{ key: 'title', label: 'Agreed action', type: 'textarea' }} value={task.title} onChange={(key, value) => setTask((current) => ({ ...current, [key]: value }))} />
            <Field definition={{ key: 'owner', label: 'Responsible person', type: 'text' }} value={task.owner} onChange={(key, value) => setTask((current) => ({ ...current, [key]: value }))} />
            <Field definition={{ key: 'due', label: 'Due date', type: 'date' }} value={task.due} onChange={(key, value) => setTask((current) => ({ ...current, [key]: value }))} />
          </div>}
        </fieldset>
      </div>
      <footer><button type="button" className="cw-button" onClick={onClose}>{locked ? 'Close' : 'Cancel'}</button>{!locked && <button className="cw-button cw-primary" type="submit"><Check size={17} /> Save entry</button>}</footer>
    </form>
  </Container>
}

export default function CoordinatorWorkspacePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [today] = useState(todayInPakistan)
  const [date, setDate] = useState(() => searchParams.get('date') || todayInPakistan())
  const [report, setReport] = useState(() => createReport(today))
  const [lookups, setLookups] = useState(EMPTY_PROFORMA_LOOKUPS)
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const sections = useMemo(() => buildProformaSections(lookups), [lookups])
  const paperSections = useMemo(() => sections.filter((section) => section.group !== 'Additional checks'), [sections])
  const sectionById = useCallback((id) => sections.find((section) => section.id === id), [sections])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('today')
  const [showRecordedWork, setShowRecordedWork] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [taskNote, setTaskNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [absentFollowupCount, setAbsentFollowupCount] = useState(0)
  const [headNotesSeenSignature, setHeadNotesSeenSignature] = useState('')
  const headNotesRef = useRef(null)
  const debouncedSaveRef = useRef(null)
  const persistQueueRef = useRef(null)
  const persistInFlightRef = useRef(false)
  useEffect(() => () => {
    if (debouncedSaveRef.current) window.clearTimeout(debouncedSaveRef.current)
  }, [])
  useEffect(() => { setModal(null); setShowRecordedWork(false) }, [date])
  useEffect(() => {
    setLookupsLoading(true)
    fetchProformaLookups()
      .then(setLookups)
      .catch(() => toast.error('Could not load class and teacher lists.'))
      .finally(() => setLookupsLoading(false))
  }, [])
  const applyProformaDay = useCallback((day, reportDate) => {
    setReport(mapDayDtoToReport(day) || createReport(reportDate))
  }, [])

  const reloadReport = useCallback(async (reportDate, { showLoading = false } = {}) => {
    if (showLoading) setLoading(true)
    try {
      const day = await fetchProformaDay(reportDate)
      applyProformaDay(day, reportDate)
    } catch {
      if (showLoading) toast.error('Could not load this report.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [applyProformaDay])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProformaDay(date)
      .then((day) => {
        if (cancelled) return
        applyProformaDay(day, date)
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load this report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [date, applyProformaDay])

  useEffect(() => {
    const onLiveUpdate = (event) => {
      const payload = event.detail
      const notifDate = reportDateFromEmployeeNotification(payload)
      if (notifDate && notifDate !== date) return
      void reloadReport(date)
    }
    window.addEventListener(EMPLOYEE_PROFORMA_LIVE_EVENT, onLiveUpdate)
    return () => window.removeEventListener(EMPLOYEE_PROFORMA_LIVE_EVENT, onLiveUpdate)
  }, [date, reloadReport])
  const locked = report.status !== 'Draft' && report.status !== 'Returned'
  const isApproved = Boolean(report.approved || report.status === 'Approved')
  const entries = report.entries || []
  const headComments = report.comments || []
  const headNotesCurrentSignature = useMemo(() => headNotesSignature(headComments), [headComments])
  const hasUnreadHeadNotes = Boolean(
    report.reportId
    && headNotesCurrentSignature
    && headNotesCurrentSignature !== headNotesSeenSignature,
  )

  useEffect(() => {
    setHeadNotesSeenSignature(readSeenHeadNotesSignature(report.reportId))
  }, [report.reportId])

  useEffect(() => {
    if (!headNotesCurrentSignature || !report.reportId) return
    if (headNotesCurrentSignature === readSeenHeadNotesSignature(report.reportId)) {
      setHeadNotesSeenSignature(headNotesCurrentSignature)
    }
  }, [headNotesCurrentSignature, report.reportId])

  const acknowledgeHeadNotes = useCallback(() => {
    if (!report.reportId || !headNotesCurrentSignature) return
    writeSeenHeadNotesSignature(report.reportId, headNotesCurrentSignature)
    setHeadNotesSeenSignature(headNotesCurrentSignature)
  }, [headNotesCurrentSignature, report.reportId])

  useEffect(() => {
    if (searchParams.get('focus') !== 'headNotes') return
    if (loading || !headComments.length) return
    const next = new URLSearchParams(searchParams)
    next.delete('focus')
    setSearchParams(next, { replace: true })
    requestAnimationFrame(() => {
      headNotesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [headComments.length, loading, searchParams, setSearchParams])

  const flushPersistQueue = useCallback(async () => {
    if (persistInFlightRef.current) return
    persistInFlightRef.current = true
    setSaving(true)
    try {
      while (persistQueueRef.current) {
        const nextReport = persistQueueRef.current
        persistQueueRef.current = null
        const day = await saveProformaDay(date, workspacePayload(nextReport))
        const mapped = mapDayDtoToReport(day)
        if (mapped) setReport(mapped)
      }
    } catch {
      toast.error('Could not save your report.')
      throw new Error('save failed')
    } finally {
      persistInFlightRef.current = false
      setSaving(false)
      if (persistQueueRef.current) flushPersistQueue()
    }
  }, [date])

  const persistReport = async (nextReport) => {
    persistQueueRef.current = nextReport
    await flushPersistQueue()
  }

  const schedulePersist = useCallback((nextReport) => {
    persistQueueRef.current = nextReport
    if (debouncedSaveRef.current) window.clearTimeout(debouncedSaveRef.current)
    debouncedSaveRef.current = window.setTimeout(() => {
      debouncedSaveRef.current = null
      flushPersistQueue().catch(() => {})
    }, 450)
  }, [flushPersistQueue])

  const updateReport = (change) => {
    if (locked) return
    const next = typeof change === 'function' ? change(report) : { ...report, ...change }
    setReport(next)
    schedulePersist(next)
  }
  const setWingCode = (wingCode) => updateReport({ wingCode, wing: proformaWingLabel(wingCode) })
  const actions = (report.actions || []).map((action) => ({ ...action, reportKey: date }))
  const openActions = actions.filter((action) => action.status !== 'Closed')
  const overdue = openActions.filter((action) => action.due && action.due < today)
  const completedSections = paperSections.filter((section) => entries.some((entry) => entry.section === section.id) || report.sections[section.id]).length
  const canSubmit = report.status === 'Draft' || report.status === 'Returned'
  const confirmSubmit = async () => {
    try {
      setSubmitting(true)
      if (debouncedSaveRef.current) {
        window.clearTimeout(debouncedSaveRef.current)
        debouncedSaveRef.current = null
      }
      await persistReport(persistQueueRef.current || report)
      const day = await submitProformaDay(date)
      const mapped = mapDayDtoToReport(day)
      if (mapped) setReport(mapped)
      setModal(null)
      setTab('submit')
      toast.success('Report submitted for academic-head review.')
    } catch {
      toast.error('Could not submit. Save your entries and try again.')
    } finally {
      setSubmitting(false)
    }
  }
  const saveEntry = async (entry, task) => {
    if (locked) return
    if (sectionById(entry.section)?.single) {
      const existing = entries.find(item => item.section === entry.section)
      if (existing) entry = { ...entry, id: existing.id }
    }
    const next = {
      ...report,
      entries: [...(report.entries || []).filter((item) => item.id !== entry.id), entry],
      sections: { ...report.sections, [entry.section]: '' },
      actions: task
        ? [...(report.actions || []).filter((item) => item.sourceId !== entry.id), {
          ...task,
          id: task.id || uid(),
          sourceId: entry.id,
          title: task.title || `Follow up: ${sectionById(entry.section).title}`,
          status: task.status || 'Open',
          updates: task.updates || [],
        }]
        : (report.actions || []).filter((item) => item.sourceId !== entry.id),
    }
    setReport(next)
    if (debouncedSaveRef.current) {
      window.clearTimeout(debouncedSaveRef.current)
      debouncedSaveRef.current = null
    }
    try {
      await persistReport(next)
    } catch {
      return
    }
    setModal(null)
    toast.success('Entry saved.')
  }
  const setSectionState = (id, value) => updateReport((current) => ({ ...current, sections: { ...current.sections, [id]: value } }))
  const transitionTask = async (status) => {
    const { action } = modal
    const next = {
      ...report,
      actions: (report.actions || []).map((item) => item.id === action.id
        ? { ...item, status, updates: [...(item.updates || []), { status, note: taskNote, at: new Date().toLocaleString('en-GB') }] }
        : item),
    }
    setReport(next)
    if (debouncedSaveRef.current) {
      window.clearTimeout(debouncedSaveRef.current)
      debouncedSaveRef.current = null
    }
    try {
      await persistReport(next)
    } catch {
      return
    }
    setModal(null)
    setTaskNote('')
    toast.success('Follow-up updated.')
  }
  const inlineEditing = modal?.type === 'edit' && ['notebooks', 'observation', 'teachers', 'faculty', 'closing'].includes(modal.section.id)
  const inlineEditor = inlineEditing ? <EntryEditor inline reportDate={date} key={date + (modal.entry?.id || modal.section.id)} section={modal.section} entry={modal.entry} action={(report.actions || []).find(action => action.sourceId === modal.entry?.id)} locked={locked} approved={isApproved} lookupsLoading={lookupsLoading} onClose={() => setModal(null)} onSave={saveEntry} /> : null
  const openSection = (id) => {
    if (['notebooks', 'observation', 'teachers', 'faculty', 'closing'].includes(id)) {
      setTab('today')
      setModal({ type: 'edit', section: sectionById(id), entry: entries.find(entry => entry.section === id) })
    } else setModal({ type: 'section', section: sectionById(id) })
  }
  const filteredEntries = entries.filter((entry) => (filter === 'all' || entry.section === filter) && `${sectionById(entry.section).title} ${Object.values(entry.values).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const coordinatorName = localStorage.getItem('employeeName') || 'Coordinator'
  const campusLabel = getCampusLabel(localStorage.getItem('employeeCampus') || 'demo')
  return <EmployeeLayout title="Coordinator workspace" compactContentTop hideAppBarSubtitle>
    <div className={`cw-workspace${isApproved ? ' cw-workspace--approved' : ''}`}>
      {(loading || saving) && <div className="cw-preview-banner">{loading ? 'Loading report…' : 'Saving…'}</div>}
      {isApproved && (
        <div className="cw-status-banner cw-status-banner--approved" role="status">
          <ShieldCheck size={22} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>Approved by academic head</strong>
            <p>This day&apos;s report is locked. You can view entries only until it is returned for correction.</p>
          </div>
        </div>
      )}
      {locked && !isApproved && report.status !== 'Returned' && (
        <div className="cw-status-banner cw-status-banner--submitted" role="status">
          <Clock3 size={20} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>Submitted for review</strong>
            <p>Editing is locked while your academic head reviews this report.</p>
          </div>
        </div>
      )}
      {hasUnreadHeadNotes && (
        <div className="cw-status-banner cw-status-banner--head-note" role="status">
          <MessageSquare size={20} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>New note from your academic head</strong>
            <p>Read the message below for this day&apos;s report.</p>
          </div>
          <button type="button" className="cw-button cw-button-compact" onClick={() => {
            headNotesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            acknowledgeHeadNotes()
          }}>
            View note
          </button>
        </div>
      )}
      {headComments.length > 0 && (
        <section
          ref={headNotesRef}
          className={`cw-panel cw-head-notes${hasUnreadHeadNotes ? ' cw-head-notes--unread' : ''}`}
          aria-label="Academic head notes"
        >
          <div className="cw-section-heading">
            <div className="cw-head-notes-title">
              <MessageSquare size={18} strokeWidth={2} aria-hidden="true" />
              <h3>Academic head notes</h3>
            </div>
            {hasUnreadHeadNotes ? <span className="cw-tag cw-head-notes-new">New</span> : null}
          </div>
          <ul className="cw-head-notes-list">
            {headComments.map((item, index) => (
              <li
                key={`${item.at}-${item.by}-${index}`}
                className={index === headComments.length - 1 && hasUnreadHeadNotes ? 'cw-head-note cw-head-note--latest' : 'cw-head-note'}
              >
                <small>{item.by || 'Academic head'} · {item.at || '—'}</small>
                <p dir="auto">{item.text}</p>
              </li>
            ))}
          </ul>
          {hasUnreadHeadNotes ? (
            <button type="button" className="cw-text-button cw-head-notes-dismiss" onClick={acknowledgeHeadNotes}>
              Mark as read
            </button>
          ) : null}
        </section>
      )}
      <section aria-label="Report context"><div className="cw-context-status"><span>{getCampusLabel(localStorage.getItem("employeeCampus") || "demo")}</span><span>{formatDate(date)}</span></div>
        <div className="cw-context">
          <label className="cw-field"><span>Date & Day</span><input aria-label="Report date" type="date" value={date} disabled={locked} onChange={(e) => { if (e.target.value) setDate(e.target.value) }} /></label>
          <QuickChoiceField label="Wing" options={WINGS} value={report.wingCode} clearable={false} disabled={locked} onChange={setWingCode} />
        </div>
        <div className="cw-context-status"><span className={isApproved ? 'cw-status-pill cw-status-pill--approved' : ''}>{report.status} · {completedSections}/{paperSections.length} sections recorded</span><span>{locked ? 'Locked' : 'All optional'}</span></div>
      </section>
      <nav className="cw-tabs" aria-label="Workspace views">{[['today', 'Today', CalendarDays], ['absentFollowup', 'Absentee follow-up', PhoneCall, absentFollowupCount], ['preview', 'Preview', Eye], ['submit', 'Submit', Send, null, canSubmit], ...(SHOW_LEGACY_COORDINATOR_TABS ? [['followups', 'Follow-ups', Clock3, openActions.length], ['report', 'Report', FileText]] : [])].map(([id, label, Icon, count, accent]) => <button key={id} aria-label={count === undefined ? label : `${label} (${count})`} aria-current={tab === id ? 'page' : undefined} className={[tab === id ? 'active' : '', accent ? 'cw-tab-accent' : ''].filter(Boolean).join(' ')} onClick={() => setTab(id)}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{count !== undefined && count !== null && <span className="cw-tab-count" aria-hidden="true">{count}</span>}</button>)}</nav>

      <CoordinatorAbsentFollowupTab
        date={date}
        formatDateLabel={formatDate}
        active={tab === 'absentFollowup'}
        onCountChange={setAbsentFollowupCount}
      />

      {tab === 'today' && (
        <>
          <label className="cw-today-mode">
            <input
              type="checkbox"
              checked={showRecordedWork}
              onChange={(event) => setShowRecordedWork(event.target.checked)}
            />
            <span className="cw-today-mode-text">
              <strong>Show recorded work</strong>
              <small>List of entries you have saved today ({entries.length})</small>
            </span>
          </label>
          {showRecordedWork ? (
            <>
              <div className="cw-section-heading">
                <div><p className="cw-eyebrow">{formatDate(date)} · {report.wing}</p><h3>Recorded work</h3></div>
                {!locked && <button type="button" className="cw-button cw-primary" onClick={() => setModal({ type: 'picker' })}><Plus size={17} /> Add entry</button>}
              </div>
              <div className="cw-filter">
                <label className="cw-search"><Search size={18} /><input placeholder="Search entries…" aria-label="Search entries" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
                <QuickChoiceField label="Filter section" hideLabel clearable={false} options={[{ value: 'all', label: 'All sections' }, ...sections.map((section) => ({ value: section.id, label: section.title }))]} value={filter} onChange={setFilter} />
              </div>
              {filteredEntries.length ? filteredEntries.map((entry) => (
                <article key={entry.id} className="cw-panel cw-entry">
                  <div className="cw-section-heading">
                    <span className="cw-tag">{sectionById(entry.section).title}</span>
                    <button type="button" className="cw-text-button" onClick={() => setModal({ type: 'edit', entry, section: sectionById(entry.section) })}>{locked ? 'View' : 'Edit'} <ChevronRight size={15} /></button>
                  </div>
                  <h4>{entryContext(entry) || 'General entry'}</h4>
                  <p dir="auto">{describeEntry(entry)}</p>
                  <div className="cw-entry-footer">
                    <span>{entry.attachments.length ? `${entry.attachments.length} attachment(s)` : 'No attachments'}{report.actions.some((action) => action.sourceId === entry.id) ? ' · Follow-up linked' : ''}</span>
                    {!locked && <button type="button" className="cw-icon" aria-label={`Delete ${sectionById(entry.section).title} entry`} onClick={() => setModal({ type: 'delete', entry })}><Trash2 size={16} /></button>}
                  </div>
                </article>
              )) : (
                <div className="cw-empty"><FileText /><h3>No entries here yet</h3><p>Add an entry or try another search.</p></div>
              )}
            </>
          ) : (
            <>
              <ProformaPageOne report={report} locked={locked} updateReport={updateReport} renderField={(key, label, type) => <Field definition={{ key, label, type }} value={report[key]} onChange={(name, value) => updateReport({ [name]: value })} />} openSection={openSection} addEntry={(id) => setModal({ type: 'edit', section: sectionById(id) })} />
              {[2, 3, 4, 5].map(page => <ProformaSectionPage key={page} page={page} sections={sections} report={report} locked={locked} onOpen={openSection} onAdd={(id) => setModal({ type: 'edit', section: sectionById(id), entry: sectionById(id).single ? entries.find(entry => entry.section === id) : undefined })} onEdit={(entry, section) => setModal({ type: 'edit', entry, section })} onState={setSectionState} renderEditor={(id) => inlineEditing && modal.section.id === id ? inlineEditor : null}>{page === 4 && <NotebookSchedule report={report} locked={locked} onChange={(notebookSchedule) => updateReport({ notebookSchedule })} />}</ProformaSectionPage>)}
              <div className="cw-section-heading"><h3>Additional checks</h3>{!locked && <button type="button" className="cw-button cw-primary" onClick={() => setModal({ type: 'picker' })}><Plus size={16} /> Add entry</button>}</div>
              <div className="cw-daily-list">{['Additional checks'].map((group) => <section key={group} className="cw-group"><h4>{group}</h4><div className="cw-section-list">{sections.filter((section) => section.group === group).map((section) => {
                const count = entries.filter((entry) => entry.section === section.id).length
                const [Icon, tone] = SECTION_VISUALS[section.id]
                return <div className="cw-section-line" key={section.id}><button type="button" className="cw-section-row" onClick={() => setModal({ type: 'section', section })}><span className={`cw-row-icon cw-tone-${tone}`}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></span><strong>{section.title}</strong><span className={count || report.sections[section.id] ? 'cw-recorded' : 'cw-unrecorded'}>{count ? count : report.sections[section.id] || '—'}</span><ChevronRight size={15} /></button>{!locked && <button type="button" className="cw-quick-add" aria-label={`Add ${section.title.toLowerCase()}`} onClick={() => setModal({ type: 'edit', section })}><Plus size={17} aria-hidden="true" /></button>}</div>
              })}</div></section>)}</div>
            </>
          )}
        </>
      )}

      {tab !== 'today' && tab !== 'preview' && inlineEditor}

      {SHOW_LEGACY_COORDINATOR_TABS && tab === 'followups' && <>
        <div className="cw-section-heading"><div><p className="cw-eyebrow">{report.wing} · ALL REPORT DATES</p><h3>Keep the loop closed</h3></div><span className="cw-tag">{overdue.length} overdue</span></div>
        <p className="cw-muted">Actions stay here across report dates. Academic-head verification will close completed work.</p>
        {actions.length ? actions.map((action) => <article className="cw-panel cw-action" key={action.id}><div className="cw-section-heading"><span className={`cw-tag ${action.due && action.due < today && action.status !== 'Closed' ? 'cw-danger-tag' : ''}`}>{action.status}</span><span className="cw-muted">{action.due ? `Due ${formatDate(action.due)}` : 'No due date'}</span></div><h3>{action.title}</h3><p>{action.owner || 'Owner not set'}</p><small>From {formatDate(action.reportKey)}{action.updates?.length ? ` · ${action.updates.length} progress update(s)` : ''}</small><button className="cw-button" onClick={() => { setTaskNote(''); setModal({ type: 'action', action }) }}>View / update progress <ArrowUpRight size={16} /></button></article>) : <div className="cw-empty"><ClipboardCheck /><h3>No follow-ups yet</h3><p>Turn on “Needs a follow-up” when recording an entry.</p></div>}
      </>}

      {SHOW_LEGACY_COORDINATOR_TABS && tab === 'report' && <>
        <section className="cw-panel"><div className="cw-section-heading"><div><p className="cw-eyebrow">REPORT PREVIEW</p><h3>{formatDate(date)} · {report.wing}</h3></div><div className="cw-section-heading-actions"><span className="cw-tag">{report.status}</span><button type="button" className="cw-button cw-button-compact" onClick={() => { if (!openProformaPrint(prepareReportForPrint({ ...report, date, coordinator: localStorage.getItem('employeeName') || 'Coordinator' }), getCampusLabel(localStorage.getItem('employeeCampus') || 'demo'))) toast.error('Allow pop-ups to open the printable proforma.') }}><Printer size={16} /> Print</button></div></div><p className="cw-muted">{report.theme || 'Theme not recorded'} · SOS week {report.sosWeek || 'not recorded'}</p>
          <div className="cw-review-states"><span><Check size={16} /> {isApproved ? 'Approved' : locked ? (report.status === 'Returned' ? 'Returned for correction' : 'Submitted') : 'Draft in progress'}</span><span><Clock3 size={16} /> {report.acknowledged ? 'Acknowledged' : 'Head acknowledgement pending'}</span><span className={isApproved ? 'cw-review-approved' : ''}><ShieldCheck size={16} /> {report.approved ? 'Approved' : 'Head approval pending'}</span></div>
          {isApproved && <p className="cw-notice cw-notice--approved">Your academic head approved this report. It cannot be edited unless they return it for correction.</p>}
          {report.status === 'Returned' && <p className="cw-notice">Your academic head returned this report. Update entries and submit again when ready.</p>}
          <PageOneChecklist report={report} /><NotebookSchedule report={report} locked reveal={hasNotebookSchedule(report)} />
          {canSubmit && <p className="cw-muted cw-report-submit-hint"><button type="button" className="cw-text-button" onClick={() => setTab('preview')}>Proofread on Preview tab <ArrowUpRight size={15} /></button></p>}
        </section>
        {sections.map((section) => {
          const { tag, items, showSchedule } = sectionProofreadStatus(section.id, report, entries)
          return <section className="cw-panel" key={section.id}><div className="cw-section-heading"><h3>{section.title}</h3><span className="cw-tag">{tag}</span></div>
            {section.id === 'notebooks' && showSchedule ? (
              <div className="cw-report-entry cw-report-schedule">
                <strong>Weekly checking plan</strong>
                {NOTEBOOK_SCHEDULE_DAYS.map((day) => {
                  const value = String(report.notebookSchedule?.[day] || '').trim()
                  if (!value) return null
                  return <p key={day} dir="auto"><em>{day}</em> · {value}</p>
                })}
              </div>
            ) : null}
            {items.map((entry) => <button key={entry.id} className="cw-report-entry" onClick={() => setModal({ type: 'edit', section, entry })}><strong>{entryContext(entry) || 'General entry'}</strong><span dir="auto">{describeEntry(entry)}</span><small>View full details{entry.attachments.length ? ` · ${entry.attachments.length} attachment(s)` : ''} →</small></button>)}
          </section>
        })}
      </>}

      {tab === 'preview' && (
        <section className="cw-panel cw-paper-preview-panel" aria-label="Report preview">
          <div>
            <p className="cw-eyebrow">OFFICIAL LAYOUT</p>
            <h3>Proofread your report</h3>
            <p className="cw-muted">Same five-page form your academic head sees. Scroll down for all pages.</p>
            {canSubmit && (
              <p className="cw-muted cw-report-submit-hint">
                <button type="button" className="cw-text-button" onClick={() => setTab('submit')}>Ready to send? Go to Submit <ArrowUpRight size={15} /></button>
              </p>
            )}
          </div>
          <ProformaPaperPreview report={report} campus={campusLabel} coordinatorName={coordinatorName} reportDate={date} />
        </section>
      )}

      {tab === 'submit' && (
        <>
          <section className="cw-panel cw-submit-panel" aria-label="Submit daily report">
            {canSubmit ? (
              <>
                <div className="cw-submit-hero">
                  <span className="cw-submit-hero-icon" aria-hidden="true"><Send size={28} strokeWidth={1.75} /></span>
                  <h3>{report.status === 'Returned' ? 'Send your updated report' : 'Submit for head review'}</h3>
                  <p className="cw-muted">
                    {report.status === 'Returned'
                      ? 'Your academic head returned this report. Make your updates, then submit again when you are ready.'
                      : 'When you are done for the day, send this report to your academic head. Sections you leave blank will show as not recorded.'}
                  </p>
                </div>
                <ul className="cw-submit-stats">
                  <li><strong>{completedSections}</strong> of {paperSections.length} sections recorded</li>
                  <li><strong>{entries.length}</strong> {entries.length === 1 ? 'entry' : 'entries'}</li>
                  <li><strong>{openActions.length}</strong> open follow-up{openActions.length === 1 ? '' : 's'}</li>
                </ul>
              </>
            ) : (
              <>
                <div className={`cw-submit-hero cw-submit-hero-done${isApproved ? ' cw-submit-hero-approved' : ''}`}>
                  <span className={`cw-submit-hero-icon cw-submit-hero-icon-done${isApproved ? ' cw-submit-hero-icon-approved' : ''}`} aria-hidden="true">
                    {isApproved ? <ShieldCheck size={30} strokeWidth={1.75} /> : <CircleCheck size={30} strokeWidth={1.75} />}
                  </span>
                  <h3>{isApproved ? 'Report approved' : 'Report submitted'}</h3>
                  <p className="cw-muted">
                    {isApproved
                      ? 'Your academic head approved this report. It is locked until they return it for correction.'
                      : 'Your academic head can acknowledge and approve this report. You will be notified when there is an update.'}
                  </p>
                </div>
                <div className="cw-review-states cw-review-states-stack">
                  <span><Check size={16} /> {isApproved ? 'Approved' : report.status}</span>
                  <span><Clock3 size={16} /> {report.acknowledged ? 'Acknowledged' : 'Acknowledgement pending'}</span>
                  <span className={isApproved ? 'cw-review-approved' : ''}><ShieldCheck size={16} /> {report.approved ? 'Approved' : 'Approval pending'}</span>
                </div>
              </>
            )}
            {canSubmit && (
              <p className="cw-muted cw-submit-preview-link">
                <button type="button" className="cw-text-button" onClick={() => setTab('preview')}>Review the full layout on Preview <ArrowUpRight size={15} /></button>
              </p>
            )}
          </section>
          {canSubmit && (
            <section className="cw-panel cw-submit-panel cw-submit-panel--action">
              <button type="button" className="cw-submit-block" disabled={submitting || saving} onClick={() => setModal({ type: 'submit' })}>
                <Send size={22} strokeWidth={1.9} aria-hidden="true" />
                <span>{report.status === 'Returned' ? 'Resubmit report' : 'Submit report'}</span>
                <small>Academic head will review after submission</small>
              </button>
            </section>
          )}
        </>
      )}
      <button className="cw-back-link" onClick={() => navigate('/employee/dashboard')}><ArrowLeft size={16} /> Employee home</button>
    </div>

    {modal?.type === 'picker' && <Modal title="What did you work on?" subtitle="Choose a section to start a short entry." onClose={() => setModal(null)}><div className="cw-modal-body cw-picker">{sections.map((section) => <button key={section.id} onClick={() => setModal({ type: 'edit', section })}><span><strong>{section.title}</strong><small>{section.description}</small></span><Plus size={18} /></button>)}</div></Modal>}
    {modal?.type === 'edit' && !inlineEditing && <EntryEditor reportDate={date} key={modal.entry?.id || modal.section.id} section={modal.section} entry={modal.entry} action={report.actions.find((action) => action.sourceId === modal.entry?.id)} locked={locked} approved={isApproved} lookupsLoading={lookupsLoading} onClose={() => setModal(null)} onSave={saveEntry} />}
    {modal?.type === 'section' && <Modal title={modal.section.title} subtitle={modal.section.description} onClose={() => setModal(null)}><div className="cw-modal-body">
      {entries.filter((entry) => entry.section === modal.section.id).map((entry) => <button key={entry.id} className="cw-report-entry" onClick={() => setModal({ type: 'edit', section: modal.section, entry })}><strong>{entryContext(entry) || 'General entry'}</strong><span>{describeEntry(entry)}</span><small>{locked ? 'View details' : 'Edit entry'} →</small></button>)}
      {!entries.some((entry) => entry.section === modal.section.id) && <><p className="cw-muted">{report.sections[modal.section.id] || 'Nothing recorded yet. Leaving this blank does not mean there were no issues.'}</p>{!locked && <QuickChoiceField label="Section status" clearable={false} options={[{ value: "", label: "Not recorded" }, "None to report", "Not applicable"]} value={report.sections[modal.section.id] || ""} onChange={(value) => setSectionState(modal.section.id, value)} />}</>}
    </div><footer><button className="cw-button" onClick={() => setModal(null)}>Close</button>{!locked && <button className="cw-button cw-primary" onClick={() => setModal({ type: 'edit', section: modal.section })}><Plus size={17} /> Add entry</button>}</footer></Modal>}
    {modal?.type === 'delete' && <Modal title="Remove this entry?" subtitle="Its attachments and linked follow-up will also be removed from this report." onClose={() => setModal(null)}><footer><button className="cw-button" onClick={() => setModal(null)}>Keep entry</button><button className="cw-button cw-delete" onClick={() => { updateReport((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== modal.entry.id), actions: current.actions.filter((action) => action.sourceId !== modal.entry.id) })); setModal(null) }}>Remove entry</button></footer></Modal>}
    {modal?.type === 'submit' && <Modal title="Ready for head review?" subtitle={`${completedSections} of ${paperSections.length} sections recorded. All sections are optional.`} onClose={() => !submitting && setModal(null)}><div className="cw-modal-body"><p>Unfilled sections will remain “Not recorded”. Open follow-ups will remain active after submission.</p></div><footer><button className="cw-button" disabled={submitting} onClick={() => setModal(null)}>Keep editing</button><button className="cw-button cw-primary" disabled={submitting} onClick={confirmSubmit}><Send size={17} /> {submitting ? 'Submitting…' : 'Submit report'}</button></footer></Modal>}
    {modal?.type === 'action' && <Modal title={modal.action.title} subtitle={`${modal.action.owner || 'Unassigned'} · ${modal.action.status}`} onClose={() => setModal(null)}><div className="cw-modal-body"><button className="cw-text-button" onClick={() => { const source = (report.entries || []).find((entry) => entry.id === modal.action.sourceId); if (!source) return; if (modal.action.reportKey !== date) setDate(modal.action.reportKey); setModal({ type: 'edit', section: sectionById(source.section), entry: source }) }}>Open original entry <ArrowUpRight size={16} /></button>
      {modal.action.updates.map((update, i) => <div className="cw-progress" key={i}><strong>{update.status}</strong><small>{update.at}</small><p dir="auto">{update.note || 'Status updated'}</p></div>)}
      <label className="cw-field"><span>Progress / completion note</span><textarea rows={3} dir="auto" value={taskNote} onChange={(e) => setTaskNote(e.target.value)} placeholder="What has changed?" /></label><p className="cw-muted">Completion requests remain ready for verification until an academic head reviews them.</p></div><footer className="cw-wrap"><button className="cw-button" onClick={() => transitionTask('In progress')}>Save progress</button><button className="cw-button cw-primary" onClick={() => transitionTask('Ready for verification')}><Check size={17} /> Ready for verification</button></footer></Modal>}
  </EmployeeLayout>
}

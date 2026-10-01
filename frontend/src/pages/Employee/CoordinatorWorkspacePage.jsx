import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BookCheck, BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3, FileText, GraduationCap, HeartHandshake, ListChecks, MessageCircle, NotebookPen, Paperclip, Plus, Search, Send, ShieldCheck, Sunrise, Sunset, Trash2, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { createReport, SAMPLE_ATTENDANCE, SECTIONS, todayInPakistan, WINGS } from './coordinatorWorkspaceData'
import './coordinatorWorkspace.css'

const uid = () => crypto.randomUUID()
const SECTION_VISUALS = {
  morning: [Sunrise, 'amber'], dispatch: [Send, 'blue'], routine: [ListChecks, 'mint'],
  friday: [CalendarDays, 'violet'], tests: [ClipboardCheck, 'blue'], oxygen: [MessageCircle, 'mint'],
  kaizen: [GraduationCap, 'violet'], diary: [BookOpen, 'blue'], notebooks: [BookCheck, 'mint'],
  observation: [NotebookPen, 'amber'], parents: [Users, 'blue'], teachers: [HeartHandshake, 'mint'],
  faculty: [ShieldCheck, 'violet'], closing: [Sunset, 'amber'],
}
const sectionById = (id) => SECTIONS.find((section) => section.id === id)
const describeEntry = (entry) => entry.values.details || entry.values.concern || entry.values.strengths || entry.values.title || entry.values.pending || 'Details recorded'
const entryContext = (entry) => [entry.values.class, entry.values.subject, entry.values.student, entry.values.teacher, entry.values.kind].filter(Boolean).join(' · ')
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })

function Field({ definition, value, onChange }) {
  const { key, label, type, options } = definition
  return <label className={`cw-field ${type === 'textarea' ? 'cw-wide' : ''}`}>
    <span>{label}</span>
    {type === 'select' ? <select aria-label={label} value={value || ''} onChange={(e) => onChange(key, e.target.value)}>
      <option value="">Choose…</option>{options.map((option) => <option key={option}>{option}</option>)}
    </select> : type === 'textarea' ? <textarea aria-label={label} dir="auto" rows={3} value={value || ''} onChange={(e) => onChange(key, e.target.value)} placeholder="Add a short note…" />
      : <input aria-label={label} dir="auto" type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined} value={value || ''} onChange={(e) => onChange(key, e.target.value)} />}
  </label>
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
    <a href={url} target="_blank" rel="noreferrer">{file.name}<small>{Math.ceil(file.size / 1024)} KB · preview</small></a>
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
    return () => { dialog.close(); document.body.style.overflow = oldOverflow }
  }, [])
  return <dialog ref={ref} className="cw-modal" aria-labelledby="cw-modal-title" onCancel={onClose}>
    <header><div><p className="cw-eyebrow">COORDINATOR WORKSPACE</p><h2 id="cw-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="cw-icon" aria-label="Close" onClick={onClose}><X /></button></header>
    {children}
  </dialog>
}

function EntryEditor({ section, entry, action, locked, onClose, onSave }) {
  const [values, setValues] = useState(entry?.values || {})
  const [attachments, setAttachments] = useState(entry?.attachments || [])
  const [followup, setFollowup] = useState(Boolean(action))
  const [task, setTask] = useState(action || { title: '', owner: '', due: '' })
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }))
  const addFiles = (event) => {
    const files = Array.from(event.target.files || [])
    const supported = files.filter((file) => (file.type.startsWith('image/') || file.type === 'application/pdf') && file.size <= 10 * 1024 * 1024)
    if (supported.length !== files.length) toast.error('Choose images or PDFs up to 10 MB each for this preview.')
    setAttachments((current) => [...current, ...supported])
    event.target.value = ''
  }
  return <Modal title={entry ? section.title : `Add ${section.short.toLowerCase()} entry`} subtitle={locked ? 'Submitted report · read only' : 'All fields are optional. Record what matters.'} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ id: entry?.id || uid(), section: section.id, values, attachments }, followup ? task : null) }}>
      <div className="cw-modal-body">
        {section.id === 'faculty' && <p className="cw-notice">Use sample information in this prototype. Staff counselling is intended for restricted academic-head review.</p>}
        <fieldset disabled={locked} className="cw-form-grid">{section.fields.map((definition) => <Field key={definition.key} definition={definition} value={values[definition.key]} onChange={update} />)}</fieldset>
        <section className="cw-editor-block"><h3><Paperclip size={17} /> Evidence</h3><p>Images and PDFs stay in this preview; files are not uploaded.</p>
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
  </Modal>
}

export default function CoordinatorWorkspacePage() {
  const navigate = useNavigate()
  const [today] = useState(todayInPakistan)
  const [date, setDate] = useState(today)
  const [wing, setWing] = useState('Primary + High')
  const [reports, setReports] = useState(() => ({ [`${today}|Primary + High`]: createReport(today, true) }))
  const [tab, setTab] = useState('today')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [taskNote, setTaskNote] = useState('')
  const reportKey = `${date}|${wing}`
  const report = reports[reportKey] || createReport(date)
  const locked = report.status !== 'Draft'
  const entries = report.entries
  const updateReport = (change, key = reportKey) => setReports((current) => {
    const existing = current[key] || createReport(key.split('|')[0])
    return { ...current, [key]: typeof change === 'function' ? change(existing) : { ...existing, ...change } }
  })
  const actions = Object.entries(reports).filter(([key]) => key.split('|')[1] === wing).flatMap(([key, value]) => value.actions.map((action) => ({ ...action, reportKey: key })))
  const openActions = actions.filter((action) => action.status !== 'Closed')
  const overdue = openActions.filter((action) => action.due && action.due < today)
  const completedSections = SECTIONS.filter((section) => entries.some((entry) => entry.section === section.id) || report.sections[section.id]).length
  const saveEntry = (entry, task) => {
    updateReport((current) => ({ ...current,
      entries: [...current.entries.filter((item) => item.id !== entry.id), entry],
      sections: { ...current.sections, [entry.section]: '' },
      actions: task ? [...current.actions.filter((item) => item.sourceId !== entry.id), { ...task, id: task.id || uid(), sourceId: entry.id, title: task.title || `Follow up: ${sectionById(entry.section).title}`, status: task.status || 'Open', updates: task.updates || [] }] : current.actions.filter((item) => item.sourceId !== entry.id),
    }))
    setModal(null)
    toast.success('Entry saved in preview.')
  }
  const setSectionState = (id, value) => updateReport((current) => ({ ...current, sections: { ...current.sections, [id]: value } }))
  const transitionTask = (status) => {
    const { action } = modal
    updateReport((current) => ({ ...current, actions: current.actions.map((item) => item.id === action.id ? { ...item, status, updates: [...item.updates, { status, note: taskNote, at: new Date().toLocaleString('en-GB') }] } : item) }), action.reportKey)
    setModal(null); setTaskNote(''); toast.success('Follow-up updated in preview.')
  }
  const filteredEntries = entries.filter((entry) => (filter === 'all' || entry.section === filter) && `${sectionById(entry.section).title} ${Object.values(entry.values).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <EmployeeLayout title="Coordinator workspace" compactContentTop hideAppBarSubtitle>
    <div className="cw-workspace">
      <div className="cw-preview-banner">Preview · sample data resets on leaving or refreshing</div>
      <section aria-label="Report context">
        <div className="cw-context">
          <label className="cw-field"><span>Report date</span><input aria-label="Report date" type="date" value={date} onChange={(e) => { if (e.target.value) setDate(e.target.value) }} /></label>
          <label className="cw-field"><span>Wing</span><select aria-label="Wing" value={wing} onChange={(e) => setWing(e.target.value)}>{WINGS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="cw-context-status"><span>{report.status} · {completedSections}/{SECTIONS.length} sections recorded</span><span>All optional</span></div>
      </section>
      <nav className="cw-tabs" aria-label="Workspace views">{[['today', 'Today', CalendarDays], ['entries', 'Entries', NotebookPen, entries.length], ['followups', 'Follow-ups', Clock3, openActions.length], ['report', 'Report', FileText]].map(([id, label, Icon, count]) => <button key={id} aria-label={count === undefined ? label : `${label} (${count})`} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{count !== undefined && <span className="cw-tab-count" aria-hidden="true">{count}</span>}</button>)}</nav>

      {tab === 'today' && <>
        <details className="cw-details cw-attendance"><summary aria-label="Attendance breakdown"><span><strong>195</strong> active</span><span><strong>178</strong> present</span><span><strong>14</strong> absent</span><span><strong>3</strong> unmarked</span><ChevronRight size={16} /></summary><p className="cw-muted">Sample campus totals, not connected to the selected wing or date.</p><div className="cw-table-wrap"><table><thead><tr><th>Class</th><th>Active</th><th>Present</th><th>Absent</th><th>Unmarked</th></tr></thead><tbody>{SAMPLE_ATTENDANCE.map((row) => <tr key={row.class}><td>{row.class}</td><td>{row.active}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.unmarked}</td></tr>)}</tbody></table></div><p className="cw-muted">Absentee follow-up: 10 of 14 recorded · Faculty: 20 active, 18 attendance records, 2 awaiting confirmation.</p></details>
        <details className="cw-details cw-daily-context"><summary>Theme & SOS week <span>{report.sosWeek ? `Week ${report.sosWeek}` : 'Optional'} <ChevronRight size={16} /></span></summary><fieldset disabled={locked} className="cw-form-grid">
          <Field definition={{ key: 'theme', label: 'Monthly / weekly theme', type: 'text' }} value={report.theme} onChange={(key, value) => !locked && updateReport({ [key]: value })} />
          <Field definition={{ key: 'sosWeek', label: 'Scheme of studies · week', type: 'number' }} value={report.sosWeek} onChange={(key, value) => !locked && updateReport({ [key]: value })} />
        </fieldset>{locked && <p className="cw-muted">Submitted context is read only. Reopen the draft from Report to edit.</p>}</details>
        <div className="cw-section-heading"><h3>Daily entries</h3>{!locked && <button className="cw-button cw-primary" onClick={() => setModal({ type: 'picker' })}><Plus size={16} /> Add entry</button>}</div>
        <div className="cw-daily-list">{['Start the day', 'Academic checks', 'Care & communication', 'Close the day'].map((group) => <section key={group} className="cw-group"><h4>{group}</h4><div className="cw-section-list">{SECTIONS.filter((section) => section.group === group).map((section) => {
          const count = entries.filter((entry) => entry.section === section.id).length
          const [Icon, tone] = SECTION_VISUALS[section.id]
          return <div className="cw-section-line" key={section.id}><button className="cw-section-row" onClick={() => setModal({ type: 'section', section })}><span className={`cw-row-icon cw-tone-${tone}`}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></span><strong>{section.title}</strong><span className={count || report.sections[section.id] ? 'cw-recorded' : 'cw-unrecorded'}>{count ? count : report.sections[section.id] || '—'}</span><ChevronRight size={15} /></button>{!locked && <button className="cw-quick-add" aria-label={`Add ${section.title.toLowerCase()}`} onClick={() => setModal({ type: 'edit', section })}><Plus size={17} aria-hidden="true" /></button>}</div>
        })}</div></section>)}</div>
      </>}

      {tab === 'entries' && <>
        <div className="cw-section-heading"><div><p className="cw-eyebrow">{formatDate(date)} · {wing}</p><h3>Recorded work</h3></div>{!locked && <button className="cw-button cw-primary" onClick={() => setModal({ type: 'picker' })}><Plus size={17} /> Add entry</button>}</div>
        <div className="cw-filter"><label className="cw-search"><Search size={18} /><input placeholder="Search entries…" aria-label="Search entries" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Filter section" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All sections</option>{SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></div>
        {filteredEntries.length ? filteredEntries.map((entry) => <article key={entry.id} className="cw-panel cw-entry"><div className="cw-section-heading"><span className="cw-tag">{sectionById(entry.section).title}</span><button className="cw-text-button" onClick={() => setModal({ type: 'edit', entry, section: sectionById(entry.section) })}>{locked ? 'View' : 'Edit'} <ChevronRight size={15} /></button></div><h4>{entryContext(entry) || 'General entry'}</h4><p dir="auto">{describeEntry(entry)}</p><div className="cw-entry-footer"><span>{entry.attachments.length ? `${entry.attachments.length} attachment(s)` : 'No attachments'}{report.actions.some((action) => action.sourceId === entry.id) ? ' · Follow-up linked' : ''}</span>{!locked && <button className="cw-icon" aria-label={`Delete ${sectionById(entry.section).title} entry`} onClick={() => setModal({ type: 'delete', entry })}><Trash2 size={16} /></button>}</div></article>) : <div className="cw-empty"><FileText /><h3>No entries here yet</h3><p>Add an entry or try another search.</p></div>}
      </>}

      {tab === 'followups' && <>
        <div className="cw-section-heading"><div><p className="cw-eyebrow">{wing} · ALL REPORT DATES</p><h3>Keep the loop closed</h3></div><span className="cw-tag">{overdue.length} overdue</span></div>
        <p className="cw-muted">Actions stay here across report dates. Academic-head verification will close completed work.</p>
        {actions.length ? actions.map((action) => <article className="cw-panel cw-action" key={action.id}><div className="cw-section-heading"><span className={`cw-tag ${action.due && action.due < today && action.status !== 'Closed' ? 'cw-danger-tag' : ''}`}>{action.status}</span><span className="cw-muted">{action.due ? `Due ${formatDate(action.due)}` : 'No due date'}</span></div><h3>{action.title}</h3><p>{action.owner || 'Owner not set'}</p><small>From {formatDate(action.reportKey.split('|')[0])}{action.updates.length ? ` · ${action.updates.length} progress update(s)` : ''}</small><button className="cw-button" onClick={() => { setTaskNote(''); setModal({ type: 'action', action }) }}>View / update progress <ArrowUpRight size={16} /></button></article>) : <div className="cw-empty"><ClipboardCheck /><h3>No follow-ups yet</h3><p>Turn on “Needs a follow-up” when recording an entry.</p></div>}
      </>}

      {tab === 'report' && <>
        <section className="cw-panel"><div className="cw-section-heading"><div><p className="cw-eyebrow">REPORT PREVIEW</p><h3>{formatDate(date)} · {wing}</h3></div><span className="cw-tag">{report.status}</span></div><p className="cw-muted">{report.theme || 'Theme not recorded'} · SOS week {report.sosWeek || 'not recorded'}</p>
          <div className="cw-review-states"><span><Check size={16} /> {locked ? 'Submitted in preview' : 'Draft in progress'}</span><span><Clock3 size={16} /> {report.acknowledged ? 'Acknowledged' : 'Head acknowledgement pending'}</span><span><Clock3 size={16} /> {report.approved ? 'Approved' : 'Head approval pending'}</span></div>
          <p className="cw-notice">Submission is simulated here. Nothing is sent to the office. The academic-head dashboard will be a separate application view.</p>
          <div className="cw-report-actions">{locked ? <button className="cw-button" onClick={() => updateReport({ status: 'Draft' })}>Reopen preview draft</button> : <button className="cw-button cw-primary" onClick={() => setModal({ type: 'submit' })}><Send size={16} /> Submit preview report</button>}</div>
        </section>
        {SECTIONS.map((section) => {
          const items = entries.filter((entry) => entry.section === section.id)
          return <section className="cw-panel" key={section.id}><div className="cw-section-heading"><h3>{section.title}</h3><span className="cw-tag">{items.length ? `${items.length} recorded` : report.sections[section.id] || 'Not recorded'}</span></div>{items.map((entry) => <button key={entry.id} className="cw-report-entry" onClick={() => setModal({ type: 'edit', section, entry })}><strong>{entryContext(entry) || 'General entry'}</strong><span dir="auto">{describeEntry(entry)}</span><small>View full details{entry.attachments.length ? ` · ${entry.attachments.length} attachment(s)` : ''} →</small></button>)}</section>
        })}
      </>}
      <button className="cw-back-link" onClick={() => navigate('/heads/monitoring-preview')}><ShieldCheck size={16} /> Head monitoring preview <ArrowUpRight size={14} /></button>
      <button className="cw-back-link" onClick={() => navigate('/employee/dashboard')}><ArrowLeft size={16} /> Employee home</button>
    </div>

    {modal?.type === 'picker' && <Modal title="What did you work on?" subtitle="Choose a section to start a short entry." onClose={() => setModal(null)}><div className="cw-modal-body cw-picker">{SECTIONS.map((section) => <button key={section.id} onClick={() => setModal({ type: 'edit', section })}><span><strong>{section.title}</strong><small>{section.description}</small></span><Plus size={18} /></button>)}</div></Modal>}
    {modal?.type === 'edit' && <EntryEditor key={modal.entry?.id || modal.section.id} section={modal.section} entry={modal.entry} action={report.actions.find((action) => action.sourceId === modal.entry?.id)} locked={locked} onClose={() => setModal(null)} onSave={saveEntry} />}
    {modal?.type === 'section' && <Modal title={modal.section.title} subtitle={modal.section.description} onClose={() => setModal(null)}><div className="cw-modal-body">
      {entries.filter((entry) => entry.section === modal.section.id).map((entry) => <button key={entry.id} className="cw-report-entry" onClick={() => setModal({ type: 'edit', section: modal.section, entry })}><strong>{entryContext(entry) || 'General entry'}</strong><span>{describeEntry(entry)}</span><small>{locked ? 'View details' : 'Edit entry'} →</small></button>)}
      {!entries.some((entry) => entry.section === modal.section.id) && <><p className="cw-muted">{report.sections[modal.section.id] || 'Nothing recorded yet. Leaving this blank does not mean there were no issues.'}</p>{!locked && <label className="cw-field"><span>Section status</span><select value={report.sections[modal.section.id] || ''} onChange={(e) => setSectionState(modal.section.id, e.target.value)}><option value="">Not recorded</option><option>None to report</option><option>Not applicable</option></select></label>}</>}
    </div><footer><button className="cw-button" onClick={() => setModal(null)}>Close</button>{!locked && <button className="cw-button cw-primary" onClick={() => setModal({ type: 'edit', section: modal.section })}><Plus size={17} /> Add entry</button>}</footer></Modal>}
    {modal?.type === 'delete' && <Modal title="Remove this entry?" subtitle="Its attachments and linked follow-up will also be removed from this preview." onClose={() => setModal(null)}><footer><button className="cw-button" onClick={() => setModal(null)}>Keep entry</button><button className="cw-button cw-delete" onClick={() => { updateReport((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== modal.entry.id), actions: current.actions.filter((action) => action.sourceId !== modal.entry.id) })); setModal(null) }}>Remove entry</button></footer></Modal>}
    {modal?.type === 'submit' && <Modal title="Ready for head review?" subtitle={`${completedSections} of ${SECTIONS.length} sections recorded. All sections are optional.`} onClose={() => setModal(null)}><div className="cw-modal-body"><p>Unfilled sections will remain “Not recorded”. Open follow-ups will remain active after submission.</p><p className="cw-notice">This only changes the mock report state. No report or notification is sent.</p></div><footer><button className="cw-button" onClick={() => setModal(null)}>Keep editing</button><button className="cw-button cw-primary" onClick={() => { updateReport({ status: 'Submitted' }); setModal(null); toast.success('Preview submitted. Awaiting academic-head acknowledgement and approval.') }}><Send size={17} /> Submit preview</button></footer></Modal>}
    {modal?.type === 'action' && <Modal title={modal.action.title} subtitle={`${modal.action.owner || 'Unassigned'} · ${modal.action.status}`} onClose={() => setModal(null)}><div className="cw-modal-body"><button className="cw-text-button" onClick={() => { const source = reports[modal.action.reportKey].entries.find((entry) => entry.id === modal.action.sourceId); setDate(modal.action.reportKey.split('|')[0]); setModal({ type: 'edit', section: sectionById(source.section), entry: source }) }}>Open original entry <ArrowUpRight size={16} /></button>
      {modal.action.updates.map((update, i) => <div className="cw-progress" key={i}><strong>{update.status}</strong><small>{update.at}</small><p dir="auto">{update.note || 'Status updated'}</p></div>)}
      <label className="cw-field"><span>Progress / completion note</span><textarea rows={3} dir="auto" value={taskNote} onChange={(e) => setTaskNote(e.target.value)} placeholder="What has changed?" /></label><p className="cw-muted">Completion requests remain ready for verification until an academic head reviews them.</p></div><footer className="cw-wrap"><button className="cw-button" onClick={() => transitionTask('In progress')}>Save progress</button><button className="cw-button cw-primary" onClick={() => transitionTask('Ready for verification')}><Check size={17} /> Ready for verification</button></footer></Modal>}
  </EmployeeLayout>
}

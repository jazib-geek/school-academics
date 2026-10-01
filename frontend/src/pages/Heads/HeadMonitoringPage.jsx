import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Building2, Check, CheckCheck, ChevronRight, CircleAlert, ClipboardCheck, Clock3, FileText, LayoutDashboard, MessageSquare, Paperclip, Search, Send, ShieldCheck, Undo2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SECTIONS, todayInPakistan } from '../Employee/coordinatorWorkspaceData'
import { createHeadMock, hasConcern, HEAD_CAMPUSES, previousDay, reportStatus } from './headMonitoringMock'
import './headMonitoring.css'

const sectionName = (id) => SECTIONS.find((section) => section.id === id)?.title || id
const displayDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const stamp = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(new Date())
const badgeClass = (status) => ['Approved', 'Closed'].includes(status) ? 'green' : ['Missing', 'Returned'].includes(status) ? 'rose' : ['Submitted', 'Ready for verification'].includes(status) ? 'blue' : 'amber'
function Badge({ children }) { return <span className={`hm-badge hm-${badgeClass(children)}`}>{children}</span> }

function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { dialog.close(); document.body.style.overflow = overflow }
  }, [])
  return <dialog className="hm-dialog" ref={ref} onCancel={onClose} aria-labelledby="hm-dialog-title"><header><h2 id="hm-dialog-title">{title}</h2><button className="hm-icon" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</dialog>
}

export default function HeadMonitoringPage() {
  const [reports, setReports] = useState(createHeadMock)
  const [campusId, setCampusId] = useState('main')
  const [date, setDate] = useState(todayInPakistan)
  const [tab, setTab] = useState('reports')
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [concernsOnly, setConcernsOnly] = useState(false)
  const [comment, setComment] = useState('')
  const [dialog, setDialog] = useState(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const campus = HEAD_CAMPUSES.find((item) => item.id === campusId)
  const today = todayInPakistan()
  const dayReports = reports.filter((report) => report.campus === campusId && report.date === date)
  const shownReports = dayReports.filter((report) => (filter === 'All' || reportStatus(report) === filter) && `${report.coordinator} ${report.wing}`.toLowerCase().includes(query.toLowerCase()))
  const selected = reports.find((report) => report.id === selectedId)
  const actions = reports.filter((report) => report.campus === campusId).flatMap((report) => report.actions.map((action) => ({ ...action, report })))
  const pending = actions.filter((action) => action.status !== 'Closed')
  const [actionFilter, setActionFilter] = useState('Open')
  const visibleActions = actions.filter((action) => actionFilter === 'All' || (actionFilter === 'Open' ? action.status !== 'Closed' : action.status === actionFilter))
  const submitted = dayReports.filter((report) => report.status === 'Submitted')
  const acknowledged = submitted.filter((report) => report.acknowledged)
  const approved = submitted.filter((report) => report.approved)
  const canReview = selected?.status === 'Submitted'
  const updateReport = (id, changes, event) => {
    setReports((current) => current.map((report) => report.id === id ? { ...report, ...changes, history: [...report.history, { text: event, at: stamp(), by: 'Academic head (preview)' }] } : report))
    setNotice(`${event} · preview only`)
  }
  const selectReport = (report) => { setSelectedId(report.id); setComment(''); setConcernsOnly(false) }
  const changeScope = (key, value) => {
    if (key === 'campus') setCampusId(value)
    else setDate(value)
    setSelectedId(null); setFilter('All'); setQuery(''); setNotice(''); setComment('')
  }
  const openDialog = (value) => { setReason(''); setDialog(value) }
  const saveDecision = (event) => {
    event.preventDefault()
    if (dialog.type === 'approve') updateReport(selected.id, { approved: true }, 'Report approved')
    if (dialog.type === 'return') updateReport(selected.id, { status: 'Returned', approved: false, comments: [...selected.comments, { text: reason, at: stamp(), by: 'Academic head (preview)' }] }, 'Returned for correction')
    if (dialog.type === 'action') {
      const report = reports.find((item) => item.id === dialog.action.report.id)
      updateReport(report.id, { actions: report.actions.map((action) => action.id === dialog.action.id ? { ...action, status: dialog.next, updates: [...action.updates, { text: reason || 'Completion verified by head.', at: stamp(), by: 'Academic head (preview)' }] } : action) }, dialog.next === 'Closed' ? 'Action verified and closed' : 'Action reopened')
    }
    setDialog(null)
  }
  return <div className="hm-app">
    <header className="hm-topbar"><div className="hm-brand"><span className="hm-brand-icon"><ShieldCheck size={23} /></span><div><strong>Academic oversight</strong><small>Head’s monitoring board</small></div></div><label className="hm-campus"><Building2 size={17} /><select aria-label="Campus" value={campusId} onChange={(event) => changeScope('campus', event.target.value)}>{HEAD_CAMPUSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className="hm-avatar" aria-label="Academic head preview">AH</span></header>
    <main className="hm-main">
      <div className="hm-preview"><span>MOCKUP · Sample records; changes reset on refresh. No notifications sent.</span><Link to="/employee/coordinator-workspace">Coordinator view <ChevronRight size={13} /></Link></div>
      <div className="hm-page-heading"><div><h1>{campus.name}</h1><p>Coordinator reporting & follow-through</p></div><label className="hm-date"><span>Report date</span><input aria-label="Report date" type="date" value={date} onChange={(event) => event.target.value && changeScope('date', event.target.value)} /></label></div>
      <div className="hm-stats">{[[ClipboardCheck, submitted.length, 'Submitted', `${dayReports.length} expected`, 'blue'], [CheckCheck, acknowledged.length, 'Acknowledged', 'Receipt confirmed', 'mint'], [ShieldCheck, approved.length, 'Approved', 'Review complete', 'violet'], [Clock3, pending.length, 'Open actions', 'Across report dates', 'amber']].map(([Icon, count, title, detail, tone]) => <button key={title} className="hm-stat" onClick={() => { setSelectedId(null); setTab(title === 'Open actions' ? 'actions' : 'reports'); setFilter(title === 'Approved' ? 'Approved' : 'All') }}><span className={`hm-stat-icon hm-tone-${tone}`}><Icon size={18} /></span><span><strong>{count}<small>{title}</small></strong><em>{detail}</em></span></button>)}</div>
      <details className="hm-attendance"><summary><span><Building2 size={15} /> Campus attendance <small>sample · {displayDate(today)}</small></span><span><b>{campus.strength}</b> active <ChevronRight size={15} /></span></summary><div><span><b>{campus.present}</b> present</span><span><b>{campus.absent}</b> absent</span><span><b>{campus.unmarked}</b> unmarked</span></div><p>Illustrative attendance for {displayDate(today)}. Historical attendance is not connected in this mockup.</p></details>
      <div className="hm-viewbar"><nav aria-label="Monitoring views"><button className={tab === 'reports' ? 'active' : ''} onClick={() => { setTab('reports'); setSelectedId(null) }}><LayoutDashboard size={16} /> Reports</button><button className={tab === 'actions' ? 'active' : ''} onClick={() => { setTab('actions'); setSelectedId(null) }}><ListIcon /> Follow-ups <span>{pending.length}</span></button></nav><span className="hm-date-hint">{displayDate(date)} · {dayReports.length} coordinators</span></div>
      {notice && <div className="hm-notice" role="status"><Check size={16} />{notice}<button className="hm-icon" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}

      {tab === 'reports' && <div className={`hm-report-layout ${selected ? 'hm-has-selection' : ''}`}>
        <section className="hm-report-list" aria-label="Coordinator reports"><div className="hm-list-tools"><label className="hm-search"><Search size={16} /><input aria-label="Search coordinators" placeholder="Find coordinator or wing" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Report status" value={filter} onChange={(event) => setFilter(event.target.value)}>{['All', 'Submitted', 'Acknowledged', 'Approved', 'Missing', 'Draft', 'Returned'].map((status) => <option key={status}>{status}</option>)}</select></div>
          <div className="hm-list-heading"><span>Coordinator / wing</span><span>Report status</span></div>
          {shownReports.map((report) => <button key={report.id} className={`hm-report-row ${selectedId === report.id ? 'selected' : ''}`} onClick={() => selectReport(report)}><span className="hm-person">{report.coordinator.split(' ').map((part) => part[0]).join('')}</span><span className="hm-report-person"><strong>{report.coordinator}</strong><small>{report.wing}</small><em>{report.status === 'Missing' ? 'No report received' : `${report.entries.length} entries · ${report.entries.filter(hasConcern).length} concerns`}</em></span><span className="hm-row-right"><Badge>{reportStatus(report)}</Badge><small>{report.submittedAt || '—'}</small><ChevronRight size={15} /></span></button>)}
          {!shownReports.length && <div className="hm-empty"><FileText size={26} /><strong>No reports found</strong><p>{dayReports.length ? 'Try another search or status.' : `Sample reports are available for ${displayDate(today)} and ${displayDate(previousDay(today))}.`}</p></div>}
          <p className="hm-list-note">All sections are optional. Missing reports remain visible.</p>
        </section>
        <section className="hm-inspector" aria-label="Report detail">{!selected ? <div className="hm-empty hm-select-prompt"><FileText size={30} /><h2>Select a coordinator</h2><p>Review all entries, evidence and follow-ups.<br />Acknowledge receipt and approve separately.</p></div> : <>
          <header className="hm-inspector-header"><button className="hm-back" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> All reports</button><div className="hm-detail-title"><div><h2>{selected.coordinator}</h2><p>{selected.wing} · {displayDate(selected.date)}</p></div><Badge>{reportStatus(selected)}</Badge></div><div className="hm-review-flags"><span className={selected.acknowledged ? 'done' : ''}><CheckCheck size={14} />{selected.acknowledged ? 'Acknowledged' : 'Not acknowledged'}</span><span className={selected.approved ? 'done' : ''}><ShieldCheck size={14} />{selected.approved ? 'Approved' : 'Not approved'}</span></div>
            {canReview && <div className="hm-review-buttons"><button className="hm-button" disabled={selected.acknowledged} onClick={() => updateReport(selected.id, { acknowledged: true }, 'Report acknowledged')}><CheckCheck size={16} /> Acknowledge</button><button className="hm-button hm-primary" disabled={selected.approved} onClick={() => openDialog({ type: 'approve' })}><ShieldCheck size={16} /> Approve</button><button className="hm-button hm-return" onClick={() => openDialog({ type: 'return' })}><Undo2 size={16} /> Return</button></div>}
          </header>
          {selected.status === 'Missing' ? <div className="hm-empty"><Clock3 size={25} /><h3>Report not received</h3><p>This coordinator is expected to report for {selected.wing}. There are no entries to review yet.</p></div> : <div className="hm-detail-body">
            {selected.status !== 'Submitted' && <p className="hm-inline-note">{selected.status === 'Draft' ? 'Work in progress. Acknowledgement and approval become available after submission.' : 'Returned for correction. Awaiting coordinator resubmission.'}</p>}
            <div className="hm-report-context"><span><small>Theme</small>{selected.theme || 'Not recorded'}</span><span><small>SOS week</small>{selected.sosWeek || 'Not recorded'}</span></div>
            <div className="hm-section-toolbar"><h3>Report sections <span>{SECTIONS.length}</span></h3><label><input type="checkbox" checked={concernsOnly} onChange={(event) => setConcernsOnly(event.target.checked)} /> Concerns only</label></div>
            {SECTIONS.filter((section) => !concernsOnly || selected.entries.some((entry) => entry.section === section.id && hasConcern(entry))).map((section) => {
              const entries = selected.entries.filter((entry) => entry.section === section.id && (!concernsOnly || hasConcern(entry)))
              return <details className="hm-section" key={`${selected.id}-${section.id}`}><summary><span>{entries.some(hasConcern) ? <CircleAlert size={15} className="hm-concern-icon" /> : <FileText size={15} />}{section.title}</span><span>{entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : selected.sections[section.id] || 'Not recorded'}<ChevronRight size={14} /></span></summary><div className="hm-section-content">{entries.length ? entries.map((entry) => <article className="hm-entry-detail" key={entry.id}><dl>{section.fields.filter((field) => entry.values[field.key] !== undefined && entry.values[field.key] !== '').map((field) => <div key={field.key}><dt>{field.label}</dt><dd dir="auto">{entry.values[field.key]}</dd></div>)}</dl>{entry.attachments.map((attachment) => <button key={attachment.id} className="hm-evidence" onClick={() => openDialog({ type: 'evidence', attachment, entry })}><Paperclip size={16} /><span>{attachment.name}<small>{attachment.kind} · open preview</small></span><ChevronRight size={15} /></button>)}</article>) : <p className="hm-muted">{selected.sections[section.id] || 'The coordinator has not recorded this section.'}</p>}</div></details>
            })}
            {concernsOnly && !selected.entries.some(hasConcern) && <p className="hm-muted">No flagged concerns in this report.</p>}
            <section className="hm-linked-actions"><h3>Linked follow-ups</h3>{selected.actions.map((action) => <div key={action.id}><span><strong>{action.title}</strong><small>{action.owner} · due {displayDate(action.due)}</small></span><Badge>{action.status}</Badge><button className="hm-button" onClick={() => openDialog({ type: 'action', action: { ...action, report: selected }, next: action.status === 'Closed' ? 'Open' : 'Closed' })}>{action.status === 'Closed' ? 'Reopen' : 'Review'}</button></div>)}</section>
            <section className="hm-comments"><h3><MessageSquare size={16} /> Head’s notes</h3>{selected.comments.map((item, i) => <div className="hm-comment" key={i}><small>{item.by} · {item.at}</small><p dir="auto">{item.text}</p></div>)}<form onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; updateReport(selected.id, { comments: [...selected.comments, { text: comment.trim(), by: 'Academic head (preview)', at: stamp() }] }, 'Review note added'); setComment('') }}><textarea aria-label="Review note" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for this coordinator…" rows={2} /><button className="hm-button" disabled={!comment.trim()}><Send size={15} /> Add note</button></form></section>
            <details className="hm-history"><summary>Review activity <ChevronRight size={14} /></summary>{selected.history.map((item, i) => <p key={i}><strong>{item.text}</strong><small>{item.by} · {item.at}</small></p>)}</details>
          </div>}
        </>}</section>
      </div>}

      {tab === 'actions' && <section className="hm-actions-view"><div className="hm-action-heading"><div><h2>Follow-ups</h2><p>All report dates · {campus.name} · {pending.filter((action) => action.due < today).length} overdue</p></div><select aria-label="Follow-up status" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>{['Open', 'Ready for verification', 'Closed', 'All'].map((value) => <option key={value}>{value}</option>)}</select></div>{visibleActions.map((action) => <article className="hm-action-row" key={action.id}><span className="hm-action-icon"><Clock3 size={18} /></span><div><strong>{action.title}</strong><p>{action.owner} · {action.report.wing}</p><small className={action.due < today && action.status !== 'Closed' ? 'hm-overdue' : ''}>Due {displayDate(action.due)} · report {displayDate(action.report.date)}</small><button className="hm-source" onClick={() => { setDate(action.report.date); setFilter('All'); setQuery(''); setTab('reports'); selectReport(action.report) }}>Open source report <ChevronRight size={13} /></button></div><div className="hm-action-controls"><Badge>{action.status}</Badge><button className="hm-button" onClick={() => openDialog({ type: 'action', action, next: action.status === 'Closed' ? 'Open' : 'Closed' })}>{action.status === 'Closed' ? 'Reopen' : 'Review action'}</button></div></article>)}{!visibleActions.length && <div className="hm-empty"><CheckCheck size={26} /><strong>No matching follow-ups</strong><p>Choose another status to see other actions.</p></div>}</section>}
      <footer className="hm-footer">Academic oversight · UI preview · No live campus data</footer>
    </main>
    {dialog && <Dialog title={dialog.type === 'evidence' ? 'Evidence preview' : dialog.type === 'approve' ? 'Approve this report?' : dialog.type === 'return' ? 'Return for correction' : 'Review follow-up'} onClose={() => setDialog(null)}>
      {dialog.type === 'evidence' ? <div className="hm-dialog-body"><p className="hm-inline-note">Illustrative document, not an uploaded student file.</p><div className="hm-document"><span>SAMPLE EVIDENCE</span><h3>Notebook rechecking</h3><p>{dialog.entry.values.class} · {dialog.entry.values.subject}</p><hr /><p>Page numbering: needs attention</p><p>Checking accuracy: needs attention</p><p>{dialog.entry.values.details}</p><hr /><small>Coordinator’s inspection record · mock attachment</small></div></div> : <form onSubmit={saveDecision}><div className="hm-dialog-body">
        {dialog.type === 'approve' && <><p>Approve {selected.coordinator}’s report for {selected.wing}, {displayDate(selected.date)}.</p><p className="hm-muted">Approval does not close linked actions or acknowledge receipt automatically. This decision is simulated.</p></>}
        {dialog.type === 'return' && <label>Correction requested<textarea required aria-label="Correction requested" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs updating…" /></label>}
        {dialog.type === 'action' && <><h3>{dialog.action.title}</h3><p className="hm-muted">{dialog.action.owner} · {sectionName(dialog.action.section)}</p>{dialog.action.updates.map((update, i) => <div className="hm-comment" key={i}><small>{update.by} · {update.at}</small><p>{update.text}</p></div>)}<label>Verification note<textarea aria-label="Verification note" required={dialog.next === 'Open'} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={dialog.next === 'Open' ? 'Why does this need more work?' : 'What did you verify?'} /></label>{dialog.next === 'Closed' && <p className="hm-muted">Close only after reviewing the correction. You can reopen it later.</p>}</>}
      </div><footer><button type="button" className="hm-button" onClick={() => setDialog(null)}>Cancel</button><button className="hm-button hm-primary" type="submit">{dialog.type === 'approve' ? 'Approve report' : dialog.type === 'return' ? 'Return report' : dialog.next === 'Closed' ? 'Verify & close' : 'Reopen action'}</button></footer></form>}
    </Dialog>}
  </div>
}

function ListIcon() { return <ClipboardCheck size={16} /> }

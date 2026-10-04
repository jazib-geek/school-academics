import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Building2, Check, CheckCheck, ChevronDown, ChevronRight, CircleAlert, ClipboardCheck, Clock3, Eye, FileText, MessageSquare, Paperclip, PhoneCall, Search, Send, ShieldCheck, Undo2, Users, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  acknowledgeProformaReport,
  approveProformaReport,
  commentProformaReport,
  fetchProformaMonitorCampuses,
  fetchProformaMonitorDay,
  fetchProformaMonitorReport,
  listItemFromMonitorRow,
  returnProformaReport,
} from '../../services/coordinatorProformaApi'
import { getCampusLabel, sortCampusItems } from '../../constants/branding'
import { defaultMonitorCampusKey, parseCoordinatorMonitoringSearch } from '../../constants/employeeHeadPortal'
import { SECTIONS, hasNotebookSchedule, todayInPakistan } from '../Employee/coordinatorWorkspaceData'
import {
  EMPLOYEE_PROFORMA_LIVE_EVENT,
  campusKeyFromEmployeeNotification,
  reportDateFromEmployeeNotification,
} from '../../utils/employeeProformaLiveUpdate'
import { hasConcern, reportStatus } from './headMonitoringMock'
import QuickChoiceField from '../../components/employee/QuickChoiceField'
import EmployeeSheetHeading from '../../components/employee/EmployeeSheetHeading'
import ProformaPageHeading, { PROFORMA_PAGE_GROUPS, proformaPageNumberFromGroup, proformaPageSubtitleFromGroup } from '../../components/employee/ProformaPageHeading'
import NotebookSchedule from '../../components/employee/NotebookSchedule'
import { PageOneChecklist } from '../../components/employee/ProformaPageOne'
import AbsentFollowupReadOnlyList from '../../components/employee/AbsentFollowupReadOnlyList'
import '../Employee/coordinatorWorkspace.css'
import './headMonitoring.css'
import { openProformaPrint } from './ProformaPrint'

const sectionName = (id) => SECTIONS.find((section) => section.id === id)?.title || id
const displayDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const stamp = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }).format(new Date())
const STATUS_BADGE = {
  Submitted: { tone: 'submitted', Icon: ClipboardCheck },
  'Ready for verification': { tone: 'submitted', Icon: ClipboardCheck },
  Acknowledged: { tone: 'acknowledged', Icon: CheckCheck },
  Approved: { tone: 'approved', Icon: ShieldCheck },
  Closed: { tone: 'approved', Icon: Check },
  Missing: { tone: 'missing', Icon: Clock3 },
  Returned: { tone: 'returned', Icon: Undo2 },
  Draft: { tone: 'draft', Icon: FileText },
}
function Badge({ children: status }) {
  const { tone, Icon } = STATUS_BADGE[status] || { tone: 'draft', Icon: CircleAlert }
  return (
    <span className={`hm-badge hm-badge--${tone}`} role="status">
      <Icon size={12} strokeWidth={2.35} aria-hidden />
      {status}
    </span>
  )
}

function sectionFillState(report, sectionId, entries) {
  if (entries.length) return 'recorded'
  if (report.sections?.[sectionId]) return 'marked'
  return 'empty'
}

function sectionIsFilled(report, sectionId) {
  const entries = (report.entries || []).filter((entry) => entry.section === sectionId)
  if (entries.length) return true
  return Boolean(String(report.sections?.[sectionId] ?? '').trim())
}

function MonitoringBottomSheet({ open, title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const dialog = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
    }
  }, [open])
  if (!open) return null
  return (
    <dialog className="hm-coordinator-sheet" ref={ref} onCancel={onClose} aria-labelledby="hm-coordinator-sheet-title">
      <header>
        <EmployeeSheetHeading id="hm-coordinator-sheet-title">{title}</EmployeeSheetHeading>
        <button type="button" className="hm-icon" onClick={onClose} aria-label="Close coordinator list"><X size={20} /></button>
      </header>
      {children}
    </dialog>
  )
}

function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { dialog.close(); document.body.style.overflow = overflow }
  }, [])
  return <dialog className="hm-dialog" ref={ref} onCancel={onClose} aria-labelledby="hm-dialog-title"><header><EmployeeSheetHeading id="hm-dialog-title">{title}</EmployeeSheetHeading><button className="hm-icon" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</dialog>
}

export default function HeadMonitoringPage({ employeeShell = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [campuses, setCampuses] = useState([])
  const [reports, setReports] = useState([])
  const [campusId, setCampusId] = useState('')
  const [date, setDate] = useState(todayInPakistan)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [concernsOnly, setConcernsOnly] = useState(false)
  const [filledOnly, setFilledOnly] = useState(false)
  const [coordinatorSheetOpen, setCoordinatorSheetOpen] = useState(false)
  const [campusSheetOpen, setCampusSheetOpen] = useState(false)
  const [campusSheetQuery, setCampusSheetQuery] = useState('')
  const [comment, setComment] = useState('')
  const [dialog, setDialog] = useState(null)
  const [decisionSaving, setDecisionSaving] = useState(false)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [headAbsentFollowupCount, setHeadAbsentFollowupCount] = useState(0)
  const deepLinkConsumedRef = useRef('')
  const deepLink = parseCoordinatorMonitoringSearch(searchParams)
  const dayReports = reports
  const shownReports = dayReports.filter((report) => (filter === 'All' || reportStatus(report) === filter) && `${report.coordinator} ${report.wing}`.toLowerCase().includes(query.toLowerCase()))
  const selected = reports.find((report) => report.id === selectedId)
  const submitted = dayReports.filter((report) => ['Submitted', 'Acknowledged', 'Approved'].includes(reportStatus(report)))
  const acknowledged = dayReports.filter((report) => report.acknowledged)
  const approved = dayReports.filter((report) => report.approved)
  const selectedStatus = selected ? reportStatus(selected) : null
  const canReturnReport = selected?.reportId > 0
    && ['Submitted', 'Acknowledged', 'Approved'].includes(selectedStatus)
  const reviewBlocked = selectedStatus === 'Draft'
    ? 'Work in progress. Acknowledgement and approval become available after submission.'
    : selectedStatus === 'Returned'
      ? 'Returned for correction. Awaiting coordinator resubmission.'
      : null
  const showReviewActions = selected?.reportId > 0 && selected.status !== 'Missing'
  const onReviewGuard = (run) => (event) => {
    if (reviewBlocked) {
      event.preventDefault()
      toast.info(reviewBlocked)
      return
    }
    run()
  }

  const patchSelectedReport = (changes) => {
    setReports((current) => current.map((report) => (report.id === selectedId ? { ...report, ...changes } : report)))
  }

  const reloadDay = useCallback(async ({ showLoading = true } = {}) => {
    if (!campusId) return
    if (showLoading) setLoading(true)
    try {
      const day = await fetchProformaMonitorDay(date, campusId)
      setReports((day.reports || []).map((row) => listItemFromMonitorRow({ ...row, campusKey: day.campusKey })))
    } catch {
      if (showLoading) toast.error('Could not load coordinator reports.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [campusId, date])

  useEffect(() => {
    fetchProformaMonitorCampuses()
      .then((items) => {
        setCampuses(items)
        setCampusId((current) => {
          if (deepLink.campus && items.some((item) => item.campusKey === deepLink.campus)) {
            return deepLink.campus
          }
          return current || defaultMonitorCampusKey(items)
        })
      })
      .catch(() => toast.error('Could not load campuses.'))
  }, [deepLink.campus])

  useEffect(() => {
    if (deepLink.date) setDate(deepLink.date)
  }, [deepLink.date])

  useEffect(() => {
    if (!deepLink.campus || !campuses.length) return
    if (campuses.some((item) => item.campusKey === deepLink.campus)) {
      setCampusId(deepLink.campus)
    }
  }, [deepLink.campus, campuses])

  useEffect(() => { reloadDay() }, [reloadDay])

  useEffect(() => {
    const onLiveUpdate = (event) => {
      const payload = event.detail
      if (payload?.type !== 'proforma_submitted') return
      const notifDate = reportDateFromEmployeeNotification(payload)
      const notifCampus = campusKeyFromEmployeeNotification(payload)
      if (notifDate && notifDate !== date) return
      if (notifCampus && campusId && notifCampus !== campusId.toLowerCase()) return
      void reloadDay({ showLoading: false })
    }
    window.addEventListener(EMPLOYEE_PROFORMA_LIVE_EVENT, onLiveUpdate)
    return () => window.removeEventListener(EMPLOYEE_PROFORMA_LIVE_EVENT, onLiveUpdate)
  }, [campusId, date, reloadDay])

  const acknowledgeReport = useCallback(async (reportId, campusKey) => {
    await acknowledgeProformaReport(reportId, campusKey)
    setReports((current) => current.map((item) => (
      item.reportId === reportId
        ? { ...item, acknowledged: true, status: item.approved ? item.status : 'Acknowledged' }
        : item
    )))
  }, [])

  const selectReport = useCallback(async (report, { autoAcknowledge = false } = {}) => {
    setSelectedId(report.id)
    setComment('')
    setConcernsOnly(false)
    setCoordinatorSheetOpen(false)
    if (!report.reportId || report.status === 'Missing') return
    try {
      const row = await fetchProformaMonitorReport(report.reportId, campusId)
      let full = listItemFromMonitorRow(row)
      if (
        autoAcknowledge
        && full.reportId
        && !full.acknowledged
        && full.status !== 'Missing'
        && full.status !== 'Draft'
        && full.status !== 'Returned'
      ) {
        try {
          await acknowledgeReport(full.reportId, campusId)
          full = { ...full, acknowledged: true, status: full.approved ? full.status : 'Acknowledged' }
          setNotice('Report acknowledged')
        } catch {
          toast.error('Could not acknowledge this report.')
        }
      }
      setReports((current) => current.map((item) => (item.id === full.id ? full : item)))
    } catch {
      toast.error('Could not open this report.')
    }
  }, [acknowledgeReport, campusId])

  useEffect(() => {
    if (!deepLink.hasDeepLink || !deepLink.coordinatorEmployeeId || loading || !campusId) return
    const token = `${campusId}|${date}|${deepLink.coordinatorEmployeeId}`
    if (deepLinkConsumedRef.current === token) return
    const report = reports.find((item) => item.coordinatorEmployeeId === deepLink.coordinatorEmployeeId)
    if (!report) {
      if (!loading) {
        deepLinkConsumedRef.current = token
        setSearchParams({}, { replace: true })
        toast.info('That coordinator report is not on this date or campus.')
      }
      return
    }
    deepLinkConsumedRef.current = token
    void selectReport(report, { autoAcknowledge: true })
    setSearchParams({}, { replace: true })
  }, [
    campusId,
    date,
    deepLink.coordinatorEmployeeId,
    deepLink.hasDeepLink,
    loading,
    reports,
    selectReport,
    setSearchParams,
  ])

  const changeScope = (key, value) => {
    if (key === 'campus') setCampusId(value)
    else setDate(value)
    setSelectedId(null); setFilter('All'); setQuery(''); setNotice(''); setComment('')
  }

  useEffect(() => {
    setHeadAbsentFollowupCount(0)
  }, [selectedId, campusId, date, selected?.date])

  const openDialog = (value) => { setReason(''); setDialog(value) }

  const closeDialog = () => {
    if (decisionSaving) return
    setDialog(null)
  }

  const saveDecision = async (event) => {
    event.preventDefault()
    if (!selected?.reportId || decisionSaving) return
    setDecisionSaving(true)
    try {
      if (dialog.type === 'approve') {
        await approveProformaReport(selected.reportId, campusId)
        setNotice('Report approved')
      } else if (dialog.type === 'return') {
        await returnProformaReport(selected.reportId, campusId, reason)
        setNotice('Returned for correction')
      } else if (dialog.type === 'action') {
        const report = reports.find((item) => item.id === dialog.action.report.id)
        if (report) {
          patchSelectedReport({
            actions: report.actions.map((action) => action.id === dialog.action.id ? {
              ...action,
              status: dialog.next,
              updates: [...(action.updates || []), { text: reason || 'Completion verified by head.', at: stamp(), by: 'Academic head' }],
            } : action),
          })
          setNotice(dialog.next === 'Closed' ? 'Action verified and closed' : 'Action reopened')
        }
        setDialog(null)
        return
      }
      await reloadDay()
      if (selectedId) {
        const row = await fetchProformaMonitorReport(selected.reportId, campusId)
        const full = listItemFromMonitorRow(row)
        setReports((current) => current.map((item) => (item.id === full.id ? full : item)))
      }
      setDialog(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save review decision.')
    } finally {
      setDecisionSaving(false)
    }
  }

  const acknowledgeSelected = async () => {
    if (!selected?.reportId) return
    try {
      await acknowledgeProformaReport(selected.reportId, campusId)
      setNotice('Report acknowledged')
      await reloadDay()
    } catch {
      toast.error('Could not acknowledge report.')
    }
  }
  const sortedCampuses = sortCampusItems(campuses, (item) => item.campusKey)
  const campusOptions = sortedCampuses.map((item) => ({ value: item.campusKey, label: getCampusLabel(item.campusKey) }))
  const campusSheetQueryNorm = campusSheetQuery.trim().toLowerCase()
  const filteredCampuses = sortedCampuses.filter((item) => {
    const label = getCampusLabel(item.campusKey).toLowerCase()
    const key = String(item.campusKey || '').toLowerCase()
    return label.includes(campusSheetQueryNorm) || key.includes(campusSheetQueryNorm)
  })
  const activeCampusLabel = campusId ? getCampusLabel(campusId) : 'Choose campus'
  const campusField = (
    <div className="hm-campus">
      <Building2 size={17} />
      <QuickChoiceField label="Campus" hideLabel clearable={false} searchable value={campusId} options={campusOptions} onChange={(value) => changeScope('campus', value)} />
    </div>
  )
  const employeeScopeBar = (
    <div className="hm-scope-bar">
      <div className="hm-scope-field">
        <span className="hm-scope-label">Campus</span>
        <button type="button" className="hm-scope-trigger" aria-haspopup="dialog" aria-expanded={campusSheetOpen} onClick={() => setCampusSheetOpen(true)}>
          <Building2 size={17} aria-hidden />
          <span className="hm-scope-trigger-value">{activeCampusLabel}</span>
          <ChevronDown size={17} aria-hidden />
        </button>
        <MonitoringBottomSheet open={campusSheetOpen} title="Choose campus" onClose={() => { setCampusSheetOpen(false); setCampusSheetQuery('') }}>
          <label className="hm-search hm-sheet-search"><Search size={16} /><input aria-label="Search campuses" placeholder="Find campus" value={campusSheetQuery} onChange={(event) => setCampusSheetQuery(event.target.value)} /></label>
          <div className="hm-sheet-list">
            {filteredCampuses.map((item) => (
              <button key={item.campusKey} type="button" className={`hm-campus-pick ${campusId === item.campusKey ? 'selected' : ''}`} onClick={() => { changeScope('campus', item.campusKey); setCampusSheetOpen(false); setCampusSheetQuery('') }}>
                <span className="hm-campus-pick-icon"><Building2 size={17} /></span>
                <span className="hm-campus-pick-text"><strong>{getCampusLabel(item.campusKey)}</strong></span>
                {campusId === item.campusKey ? <Check size={17} aria-hidden /> : null}
              </button>
            ))}
            {!filteredCampuses.length && <div className="hm-empty"><strong>No campus found</strong></div>}
          </div>
        </MonitoringBottomSheet>
      </div>
      <label className="hm-scope-field hm-scope-date">
        <span className="hm-scope-label">Report date</span>
        <input aria-label="Report date" type="date" value={date} onChange={(event) => event.target.value && changeScope('date', event.target.value)} />
      </label>
    </div>
  )

  return <div className={`hm-app${employeeShell ? ' hm-app--employee' : ''}`}>
    {!employeeShell ? (
      <header className="hm-topbar">
        <div className="hm-brand"><span className="hm-brand-icon"><ShieldCheck size={23} /></span><div><strong>Coordinator monitoring</strong><small>Review daily proformas</small></div></div>
        {campusField}
        <span className="hm-avatar" aria-label="Academic head">AH</span>
      </header>
    ) : null}
    <main className="hm-main">
      {!employeeShell ? (
        <div className="hm-preview"><span>{loading ? 'Loading reports…' : 'Live campus data'}</span><Link to="/employee/coordinator-workspace">Coordinator view <ChevronRight size={13} /></Link></div>
      ) : loading ? <div className="hm-preview"><span>Loading reports…</span></div> : null}
      {employeeShell ? (
        <div className="hm-page-heading hm-page-heading--compact">{employeeScopeBar}</div>
      ) : (
        <div className="hm-page-heading">
          <div><h1>{activeCampusLabel}</h1><p>Coordinator reporting & follow-through</p></div>
          <label className="hm-date"><span>Report date</span><input aria-label="Report date" type="date" value={date} onChange={(event) => event.target.value && changeScope('date', event.target.value)} /></label>
        </div>
      )}
      <div className="hm-stats">{[[ClipboardCheck, submitted.length, 'Submitted', `${dayReports.length} expected`, 'blue'], [CheckCheck, acknowledged.length, 'Acknowledged', 'Receipt confirmed', 'mint'], [ShieldCheck, approved.length, 'Approved', 'Review complete', 'violet']].map(([Icon, count, title, detail, tone]) => <button key={title} type="button" className="hm-stat" onClick={() => { setSelectedId(null); setFilter(title === 'Approved' ? 'Approved' : 'All') }}><span className={`hm-stat-icon hm-tone-${tone}`}><Icon size={18} /></span><span><strong>{count}<small>{title}</small></strong><em>{detail}</em></span></button>)}</div>
      <p className="hm-date-hint hm-date-hint--standalone">{displayDate(date)} · {dayReports.length} coordinators</p>
      {notice && <div className="hm-notice" role="status"><Check size={16} />{notice}<button className="hm-icon" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}

      <>
        <button type="button" className="hm-mobile-coordinator-trigger" onClick={() => setCoordinatorSheetOpen(true)}>
          <span className="hm-mobile-trigger-icon"><Users size={18} /></span>
          <span className="hm-mobile-trigger-text">
            <strong>{selected?.coordinator || 'Choose coordinator'}</strong>
            <small>{selected ? `${selected.wing} · ${reportStatus(selected)}` : `${shownReports.length} on this date`}</small>
          </span>
          <ChevronDown size={18} aria-hidden />
        </button>
        <MonitoringBottomSheet open={coordinatorSheetOpen} title="Coordinators" onClose={() => setCoordinatorSheetOpen(false)}>
          <div className="hm-list-tools"><label className="hm-search"><Search size={16} /><input aria-label="Search coordinators" placeholder="Find coordinator or wing" value={query} onChange={(event) => setQuery(event.target.value)} /></label><QuickChoiceField label="Report status" hideLabel clearable={false} value={filter} options={["All", "Submitted", "Acknowledged", "Approved", "Missing", "Draft", "Returned"]} onChange={setFilter} /></div>
          <div className="hm-sheet-list">{shownReports.map((report) => <button key={report.id} type="button" className={`hm-report-row ${selectedId === report.id ? 'selected' : ''} hm-row-${report.status === 'Missing' ? 'missing' : 'active'}`} onClick={() => selectReport(report)}><span className="hm-person">{report.coordinator.split(' ').map((part) => part[0]).join('')}</span><span className="hm-report-person"><strong>{report.coordinator}</strong><small>{report.wing}</small><em>{report.status === 'Missing' ? 'No report received' : `${report.entries?.length ?? report.entryCount ?? 0} entries · ${report.concernCount ?? report.entries?.filter(hasConcern).length ?? 0} concerns`}</em></span><span className="hm-row-right"><Badge>{reportStatus(report)}</Badge><ChevronRight size={15} /></span></button>)}
            {!shownReports.length && <div className="hm-empty"><FileText size={26} /><strong>No reports found</strong></div>}
          </div>
        </MonitoringBottomSheet>
        <div className={`hm-report-layout ${selected ? 'hm-has-selection' : ''}`}>
        <section className="hm-report-list hm-desktop-only" aria-label="Coordinator reports"><div className="hm-list-tools"><label className="hm-search"><Search size={16} /><input aria-label="Search coordinators" placeholder="Find coordinator or wing" value={query} onChange={(event) => setQuery(event.target.value)} /></label><QuickChoiceField label="Report status" hideLabel clearable={false} value={filter} options={["All", "Submitted", "Acknowledged", "Approved", "Missing", "Draft", "Returned"]} onChange={setFilter} /></div>
          <div className="hm-list-heading"><span>Coordinator / wing</span><span>Report status</span></div>
          {shownReports.map((report) => <button key={report.id} type="button" className={`hm-report-row ${selectedId === report.id ? 'selected' : ''} hm-row-${report.status === 'Missing' ? 'missing' : 'active'}`} onClick={() => selectReport(report)}><span className="hm-person">{report.coordinator.split(' ').map((part) => part[0]).join('')}</span><span className="hm-report-person"><strong>{report.coordinator}</strong><small>{report.wing}</small><em>{report.status === 'Missing' ? 'No report received' : `${report.entries?.length ?? report.entryCount ?? 0} entries · ${report.concernCount ?? report.entries?.filter(hasConcern).length ?? 0} concerns`}</em></span><span className="hm-row-right"><Badge>{reportStatus(report)}</Badge><small>{report.submittedAt || '—'}</small><ChevronRight size={15} /></span></button>)}
          {!shownReports.length && <div className="hm-empty"><FileText size={26} /><strong>No reports found</strong><p>{dayReports.length ? 'Try another search or status.' : 'No coordinator slots for this date.'}</p></div>}
          <p className="hm-list-note">All sections are optional. Missing reports remain visible.</p>
        </section>
        <section className="hm-inspector" aria-label="Report detail">{!selected ? <div className="hm-empty hm-select-prompt"><FileText size={30} /><h2>Select a coordinator</h2><p>Review entries and evidence.<br />Acknowledge receipt and approve separately.</p><button type="button" className="hm-button hm-primary hm-mobile-only hm-prompt-picker" onClick={() => setCoordinatorSheetOpen(true)}><Users size={16} /> Choose coordinator</button></div> : <>
          <header className="hm-inspector-header">
            <button type="button" className="hm-back" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> All reports</button>
            <div className="hm-detail-title">
              <div className="hm-detail-identity"><h2>{selected.coordinator}</h2><p>{selected.wing} · {displayDate(selected.date)}</p></div>
              <div className="hm-title-actions">
                <Badge>{reportStatus(selected)}</Badge>
                {selected.status !== 'Missing' && (
                  <button type="button" className="hm-button hm-button-compact hm-button-preview" onClick={async () => {
                    try {
                      let printReport = selected
                      if (selected.reportId) {
                        const row = await fetchProformaMonitorReport(selected.reportId, campusId)
                        printReport = listItemFromMonitorRow(row)
                      }
                      if (!openProformaPrint(printReport, activeCampusLabel)) setNotice('Allow pop-ups to preview the report layout.')
                    } catch {
                      toast.error('Could not load the report preview.')
                    }
                  }}>
                    <Eye size={16} /> Preview
                  </button>
                )}
              </div>
            </div>
            {showReviewActions && (
              <div className="hm-review-toolbar">
                <div className="hm-review-flags">
                  <span className={selected.acknowledged ? 'done' : ''}><CheckCheck size={14} />{selected.acknowledged ? 'Acknowledged' : 'Not acknowledged'}</span>
                  <span className={selected.approved ? 'done' : ''}><ShieldCheck size={14} />{selected.approved ? 'Approved' : 'Not approved'}</span>
                </div>
                <div className="hm-review-buttons">
                  <button type="button" className={`hm-button hm-button-acknowledge${reviewBlocked ? ' hm-button--pending' : ''}`} disabled={!reviewBlocked && selected.acknowledged} onClick={onReviewGuard(() => { if (!selected.acknowledged) acknowledgeSelected() })}><CheckCheck size={16} /> Acknowledge</button>
                  <button type="button" className={`hm-button hm-button-approve${reviewBlocked ? ' hm-button--pending' : ''}`} disabled={!reviewBlocked && selected.approved} onClick={onReviewGuard(() => openDialog({ type: 'approve' }))}><ShieldCheck size={16} /> Approve</button>
                  {canReturnReport && <button type="button" className="hm-button hm-button-return" onClick={() => openDialog({ type: 'return' })}><Undo2 size={16} /> {selectedStatus === 'Approved' ? 'Return to coordinator' : 'Return'}</button>}
                </div>
              </div>
            )}
          </header>
          {selected.status === 'Missing' ? <div className="hm-empty"><Clock3 size={25} /><h3>Report not received</h3><p>This coordinator is expected to report for {selected.wing}. There are no entries to review yet.</p></div> : <div className="hm-detail-body">
            <div className="hm-report-context"><span><small>Theme</small>{selected.theme || 'Not recorded'}</span><span><small>SOS week</small>{selected.sosWeek || 'Not recorded'}</span></div>
            <div className="hm-proforma-embed"><PageOneChecklist report={selected} /><NotebookSchedule report={selected} reveal={hasNotebookSchedule(selected)} /></div>
            <details className="hm-section hm-absent-followup-accordion" aria-label="Absentee follow-up">
              <summary>
                <span className="hm-section-title">
                  <PhoneCall size={16} className="hm-section-icon" aria-hidden="true" />
                  Absentee follow-up
                </span>
                <span className="hm-section-meta">
                  <span className="hm-section-pill hm-section-pill--recorded">
                    {headAbsentFollowupCount ? `${headAbsentFollowupCount} absent` : 'Absent list'}
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </span>
              </summary>
              <div className="hm-section-content hm-absent-followup-content">
                <AbsentFollowupReadOnlyList
                  date={selected.date || date}
                  campusKey={campusId || undefined}
                  showIntro={false}
                  onCountChange={setHeadAbsentFollowupCount}
                />
              </div>
            </details>
            <div className="hm-section-toolbar">
              <h3>Report sections <span>{SECTIONS.length}</span></h3>
              <div className="hm-section-toolbar-filters">
                <label className="hm-toolbar-check"><input type="checkbox" checked={filledOnly} onChange={(event) => setFilledOnly(event.target.checked)} /> Filled only</label>
                <label className="hm-toolbar-check"><input type="checkbox" checked={concernsOnly} onChange={(event) => setConcernsOnly(event.target.checked)} /> Concerns only</label>
              </div>
            </div>
            {(() => {
              const visibleSections = SECTIONS.filter((section) => {
                if (filledOnly && !sectionIsFilled(selected, section.id)) return false
                if (concernsOnly && !selected.entries.some((entry) => entry.section === section.id && hasConcern(entry))) return false
                return true
              })
              const renderSection = (section) => {
                const entries = selected.entries.filter((entry) => entry.section === section.id && (!concernsOnly || hasConcern(entry)))
                const fill = sectionFillState(selected, section.id, entries)
                const meta = entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : selected.sections[section.id] || 'Not recorded'
                return (
                  <details className={`hm-section hm-section--${fill}`} key={`${selected.id}-${section.id}`}>
                    <summary>
                      <span className="hm-section-title">{entries.some(hasConcern) ? <CircleAlert size={16} className="hm-concern-icon" /> : <FileText size={16} className="hm-section-icon" />}{section.title}</span>
                      <span className="hm-section-meta"><span className={`hm-section-pill hm-section-pill--${fill}`}>{meta}</span><ChevronRight size={14} /></span>
                    </summary>
                    <div className="hm-section-content">{entries.length ? entries.map((entry) => <article className="hm-entry-detail" key={entry.id}><dl>{section.fields.filter((field) => entry.values[field.key] !== undefined && entry.values[field.key] !== '').map((field) => <div key={field.key}><dt>{field.label}</dt><dd dir="auto">{entry.values[field.key]}</dd></div>)}</dl>{entry.attachments.map((attachment) => <button key={attachment.id} className="hm-evidence" onClick={() => openDialog({ type: 'evidence', attachment, entry })}><Paperclip size={16} /><span>{attachment.name}<small>{attachment.kind} · open preview</small></span><ChevronRight size={15} /></button>)}</article>) : <p className="hm-muted">{selected.sections[section.id] || 'The coordinator has not recorded this section.'}</p>}</div>
                  </details>
                )
              }
              if (!visibleSections.length) {
                return <p className="hm-muted">Nothing to show with the current filters.</p>
              }
              return <>
                {PROFORMA_PAGE_GROUPS.map((group) => {
                  const groupSections = visibleSections.filter((section) => section.group === group)
                  if (!groupSections.length) return null
                  return (
                    <div className="hm-proforma-page-group" key={group}>
                      <ProformaPageHeading className="hm-proforma-page-heading" page={proformaPageNumberFromGroup(group)}>{proformaPageSubtitleFromGroup(group)}</ProformaPageHeading>
                      {groupSections.map(renderSection)}
                    </div>
                  )
                })}
                {visibleSections.filter((section) => !PROFORMA_PAGE_GROUPS.includes(section.group)).map(renderSection)}
              </>
            })()}
            {concernsOnly && !selected.entries.some(hasConcern) && <p className="hm-muted">No flagged concerns in this report.</p>}
            <section className="hm-comments"><h3><MessageSquare size={16} /> Head’s notes</h3>{(selected.comments || []).map((item, i) => <div className="hm-comment" key={i}><small>{item.by} · {item.at}</small><p dir="auto">{item.text}</p></div>)}<form onSubmit={async (event) => {
              event.preventDefault()
              if (!comment.trim() || !selected.reportId) return
              try {
                await commentProformaReport(selected.reportId, campusId, comment.trim())
                setComment('')
                setNotice('Review note added')
                const row = await fetchProformaMonitorReport(selected.reportId, campusId)
                const full = listItemFromMonitorRow(row)
                setReports((current) => current.map((item) => (item.id === full.id ? full : item)))
              } catch {
                toast.error('Could not add note.')
              }
            }}><textarea aria-label="Review note" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for this coordinator…" rows={2} /><button className="hm-button" disabled={!comment.trim()}><Send size={15} /> Add note</button></form></section>
            <details className="hm-history"><summary>Review activity <ChevronRight size={14} /></summary>{selected.history.map((item, i) => <p key={i}><strong>{item.text}</strong><small>{item.by} · {item.at}</small></p>)}</details>
          </div>}
        </>}</section>
      </div></>
      {!employeeShell ? <footer className="hm-footer">Coordinator monitoring</footer> : null}
    </main>
    {dialog && <Dialog title={dialog.type === 'evidence' ? 'Evidence preview' : dialog.type === 'approve' ? 'Approve this report?' : dialog.type === 'return' ? 'Return for correction' : 'Review follow-up'} onClose={closeDialog}>
      {dialog.type === 'evidence' ? <div className="hm-dialog-body"><p className="hm-inline-note">Illustrative document, not an uploaded student file.</p><div className="hm-document"><span>SAMPLE EVIDENCE</span><h3>Notebook rechecking</h3><p>{dialog.entry.values.class} · {dialog.entry.values.subject}</p><hr /><p>Page numbering: needs attention</p><p>Checking accuracy: needs attention</p><p>{dialog.entry.values.details}</p><hr /><small>Coordinator’s inspection record · mock attachment</small></div></div> : <form onSubmit={saveDecision}><div className="hm-dialog-body">
        {dialog.type === 'approve' && <><p>Approve {selected.coordinator}’s report for {selected.wing}, {displayDate(selected.date)}.</p><p className="hm-muted">Receipt is acknowledged automatically if you have not done so yet.</p></>}
        {dialog.type === 'return' && <><p className="hm-muted">{selectedStatus === 'Approved' ? 'This report is approved. Returning it lets the coordinator edit and resubmit.' : 'The coordinator can edit and resubmit after you return this report.'}</p><label>Correction requested<textarea required aria-label="Correction requested" rows={4} value={reason} disabled={decisionSaving} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs updating…" /></label></>}
        {dialog.type === 'action' && <><h3>{dialog.action.title}</h3><p className="hm-muted">{dialog.action.owner} · {sectionName(dialog.action.section)}</p>{dialog.action.updates.map((update, i) => <div className="hm-comment" key={i}><small>{update.by} · {update.at}</small><p>{update.text}</p></div>)}<label>Verification note<textarea aria-label="Verification note" required={dialog.next === 'Open'} rows={3} value={reason} disabled={decisionSaving} onChange={(event) => setReason(event.target.value)} placeholder={dialog.next === 'Open' ? 'Why does this need more work?' : 'What did you verify?'} /></label>{dialog.next === 'Closed' && <p className="hm-muted">Close only after reviewing the correction. You can reopen it later.</p>}</>}
      </div><footer><button type="button" className="hm-button" disabled={decisionSaving} onClick={closeDialog}>Cancel</button><button className={`hm-button ${dialog.type === 'return' ? 'hm-button-return' : 'hm-button-approve'}`} type="submit" disabled={decisionSaving} aria-busy={decisionSaving}>{decisionSaving ? 'Please wait…' : dialog.type === 'approve' ? 'Approve report' : dialog.type === 'return' ? 'Return report' : dialog.next === 'Closed' ? 'Verify & close' : 'Reopen action'}</button></footer></form>}
    </Dialog>}
  </div>
}

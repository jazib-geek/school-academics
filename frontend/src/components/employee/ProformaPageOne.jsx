import { ChevronRight, PhoneCall, Plus, Square, SquareCheck } from 'lucide-react'
import ProformaAccordion from './ProformaAccordion'
import ProformaPageHeading, { proformaPageSubtitle } from './ProformaPageHeading'

export const PAGE_ONE_CHECKS = [
  ['notebooks', 'Notebook rechecking', 'Fix'],
  ['diary', 'Students’ diary checking', 'Fix'],
  ['kaizen', 'Students’ Kaizen', 'Fix'],
  ['observation', 'Class observation', 'Fix'],
  ['teachers', 'Follow-up with teachers', 'Optional'],
  ['faculty', 'Counselling / warning with faculty', 'Optional'],
]

function PageOneCheckIcon({ checked, label }) {
  const Icon = checked ? SquareCheck : Square
  return (
    <span
      className={`cw-proforma-check-icon ${checked ? 'cw-proforma-check-icon--done' : 'cw-proforma-check-icon--todo'}`}
      role="img"
      aria-label={`${label}, ${checked ? 'done' : 'not done'}`}
    >
      <Icon size={21} strokeWidth={checked ? 2.25 : 1.85} aria-hidden />
    </span>
  )
}

export function PageOneChecklist({ report, locked = true, onChange, onDetails }) {
  const readOnlyIcons = locked && !onChange
  return (
    <section className="cw-proforma-checks">
      <div className="cw-proforma-check-columns">
        {['Fix', 'Optional'].map((group) => (
          <div key={group}>
            <h4>{group}</h4>
            {PAGE_ONE_CHECKS.filter((item) => item[2] === group).map(([id, label]) => {
              const checked = Boolean(report.pageOneChecks?.[id])
              return (
                <div className="cw-proforma-check" key={id}>
                  {readOnlyIcons ? (
                    <div className="cw-proforma-check-readonly">
                      <PageOneCheckIcon checked={checked} label={label} />
                      <span>{label}</span>
                    </div>
                  ) : (
                    <label>
                      <input type="checkbox" disabled={locked} checked={checked} onChange={(event) => onChange?.(id, event.target.checked)} />
                      <span>{label}</span>
                    </label>
                  )}
                  {onDetails && (
                    <button type="button" aria-label={`${label} details`} onClick={() => onDetails(id)}>
                      Details <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ProformaPageOne({ report, locked, renderField, updateReport, openSection, addEntry }) {
  const entries = report.entries
  const row = (id, label, hint) => {
    const items = entries.filter((entry) => entry.section === id)
    return <ProformaAccordion key={id} sectionId={id} title={label} status={items.length ? `${items.length} recorded` : 'Not recorded'}>{hint && <small className="cw-proforma-hint">{hint}</small>}{items.map((entry) => <p key={entry.id} dir="auto">{entry.values.details || [entry.values.concern, entry.values.response].filter(Boolean).join(' — ')}</p>)}<div className="cw-proforma-row-actions cw-page-one-actions">{!locked && <button className="cw-text-button" onClick={() => addEntry(id)}><Plus size={15} /> {id === 'morning' ? 'Record meeting points' : 'Add entry'}</button>}<button className="cw-text-button" onClick={() => openSection(id)}>{locked ? 'View records' : 'View / edit records'} <ChevronRight size={14} /></button></div></ProformaAccordion>
  }
  return <section className="cw-proforma-page">
    <ProformaPageHeading page={1}>{proformaPageSubtitle(1)}</ProformaPageHeading>
    <ProformaAccordion title="My Spirit and Stature – My Work"><p>We believe that like any resource, every response about school matters is an invisible show of the school. Obviously we are clear and capable to run all the school matters with diligence and commitment and to report it with professional honesty. As a custodian we are solemnly responsible to maintain, mend and strengthen our school status. We seek Allah’s help to do justice with our students for their grooming and academic Kaizen.</p></ProformaAccordion>
    <ProformaAccordion sectionId="theme" title="Monthly/Weekly Theme" status={report.theme || 'Not recorded'}><fieldset disabled={locked} className="cw-form-grid">{renderField('theme', 'Monthly/Weekly Theme', 'text')}{renderField('sosWeek', 'SOS Week', 'number')}</fieldset></ProformaAccordion>
    <ProformaAccordion sectionId="strength" title="Students’ Strength / Faculty">{(() => {
      const snap = report.attendanceSnapshot
      const studentLine = snap?.present != null && snap?.active != null ? `${snap.present} / ${snap.active}` : '—'
      const facultyLine = snap?.presentFaculty != null && snap?.faculty != null ? `${snap.presentFaculty} / ${snap.faculty}` : (snap?.faculty ?? '—')
      const absentFaculty = snap?.absentFaculty?.length ? snap.absentFaculty.join(', ') : '—'
      return <>
        <div className="cw-proforma-strength"><span>Students’ Strength<strong>{studentLine}</strong></span><span>Absent Students<strong>{snap?.absent ?? '—'}</strong></span><span>Total Faculty<strong>{facultyLine}</strong></span></div>
        <div className="cw-proforma-absent"><strong>Absent faculty (names)</strong><span>{absentFaculty}</span></div>
        {!snap && <p className="cw-proforma-source">Attendance figures will appear here when connected to campus data.</p>}
      </>
    })()}</ProformaAccordion>
    {row('morning', 'Morning Meeting')}
    {row('dispatch', 'Due Dispatch', 'Notice / Fee Challan / Schedule / Syllabus / Papers etc.')}
    {row('activities', 'Z-Lesson / Special Period / Competition / Event / PTM', 'Activity / Preparation')}
    <ProformaAccordion sectionId="checks" title="Fix / Optional"><PageOneChecklist report={report} locked={locked} onChange={(id, value) => updateReport({ pageOneChecks: { ...report.pageOneChecks, [id]: value } })} onDetails={openSection} /></ProformaAccordion>
    {row('priority', 'Priority Response — Parents’ Concerns')}
    <button type="button" className="cw-text-button cw-page-jump" onClick={() => openSection('parents')}><span className="cw-proforma-page-icon" aria-hidden="true"><PhoneCall size={13} strokeWidth={2.25} /></span><span>Detailed parent concerns</span><ChevronRight size={14} aria-hidden="true" /></button>
  </section>
}

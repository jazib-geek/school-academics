import { Plus, ChevronRight } from 'lucide-react'
import ProformaAccordion from './ProformaAccordion'
import ProformaPageHeading, { proformaPageSubtitle } from './ProformaPageHeading'
import { SECTIONS } from '../../pages/Employee/coordinatorWorkspaceData'

export default function ProformaSectionPage({ page, report, locked, onAdd, onEdit, onState, renderEditor, children, sections = SECTIONS }) {
  return <section className="cw-proforma-page"><ProformaPageHeading page={page}>{proformaPageSubtitle(page)}</ProformaPageHeading>{children}{sections.filter(section => section.group === `Page ${page}`).map(section => {
    const entries = report.entries.filter(entry => entry.section === section.id)
    const columns = section.fields.filter(field => entries.some(entry => entry.values[field.key] !== undefined && entry.values[field.key] !== ''))
    const editor = renderEditor?.(section.id)
    return <ProformaAccordion key={section.id} sectionId={section.id} title={section.title} status={entries.length ? `${entries.length} recorded` : report.sections[section.id] || 'Not recorded'} reveal={Boolean(editor)}><small>{section.description}</small>
      {entries.length > 0 && <div className="cw-proforma-records">{entries.map((entry, index) => <button className="cw-proforma-record" key={entry.id} onClick={() => onEdit(entry, section)}><span className="cw-proforma-record-number">{index + 1}</span><dl>{columns.map(field => <div key={field.key}><dt>{field.label}</dt><dd dir="auto">{entry.values[field.key] || '—'}</dd></div>)}</dl><ChevronRight size={14} /></button>)}</div>}
      {!locked && <div className="cw-proforma-row-actions"><button className="cw-text-button" onClick={() => onAdd(section.id)}><Plus size={15} /> {entries.length ? section.single ? 'Edit closing' : 'Add another record' : 'Add record'}</button>{!entries.length && <button className="cw-text-button" aria-pressed={report.sections[section.id] === 'None to report'} onClick={() => onState(section.id, report.sections[section.id] === 'None to report' ? '' : 'None to report')}>{report.sections[section.id] === 'None to report' ? 'Clear Nil' : section.emptyLabel || 'Nil / none to report'}</button>}</div>}
      {editor}
    </ProformaAccordion>
  })}</section>
}

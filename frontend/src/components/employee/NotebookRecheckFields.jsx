import { Check, X } from 'lucide-react'

function TickChoices({ label, field, options, values, onChange }) {
  return <fieldset className="cw-paper-choices"><legend>{label}</legend><div>{options.map(([value, text]) => <label key={value}><input type="checkbox" checked={values[field] === value} onChange={() => onChange(field, values[field] === value ? '' : value)} /><span>{text}</span></label>)}</div></fieldset>
}

export default function NotebookRecheckFields({ values, onChange, fields, renderField, reportDate }) {
  return <div className="cw-paper-form">
    <div className="cw-paper-title"><strong>Copies rechecking report</strong><span>{reportDate} · one student’s copy</span></div>
    <div className="cw-form-grid">{['class', 'student', 'subject', 'teacher'].map((key) => renderField(fields.find((field) => field.key === key)))}</div>
    <section className="cw-paper-cover"><h3>Copy cover</h3><p>Tick or cross each item. Leave blank if not checked.</p><div className="cw-paper-grid cw-paper-grid-head"><span>Check</span><span><Check size={14} /> Yes</span><span><X size={14} /> No</span></div>{[['check0', 'Title'], ['check1', 'Page numbering'], ['check2', 'Neatness']].map(([key, label]) => <div className="cw-paper-grid" key={key}><span>{label}</span>{[['Satisfactory', 'Yes'], ['Needs attention', 'No']].map(([value, text]) => <label key={value}><input type="checkbox" aria-label={`${label}: ${text}`} checked={values[key] === value} onChange={() => onChange(key, values[key] === value ? '' : value)} /></label>)}</div>)}</section>
    <TickChoices label="Writing" field="writing" options={[["Below average", "Below"], ["Average", "Avg"], ["Good", "Good"]]} values={values} onChange={onChange} />
    <div className="cw-form-grid">{['details', 'correctionTime'].map((key) => renderField(fields.find((field) => field.key === key)))}</div>
    <TickChoices label="Mistakes corrected or not" field="correction" options={[["Partially corrected", "Partially"], ["Completed", "Completed"], ["Not corrected", "No"]]} values={values} onChange={onChange} />
    <section className="cw-paper-signature"><h3>Signature of teacher</h3><p>The teacher’s signature is not captured digitally yet. A signed copy can be attached below as evidence.</p>{renderField(fields.find((field) => field.key === 'acknowledgement'))}</section>
  </div>
}

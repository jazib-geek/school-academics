import ProformaAccordion from './ProformaAccordion'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export default function NotebookSchedule({ report, locked = true, onChange, reveal = false }) {
  return <ProformaAccordion sectionId="schedule" title="Notebook rechecking · Monday–Friday schedule" reveal={reveal}><div className="cw-notebook-schedule"><p>Classes and subjects planned for checking. Separate from the copies actually checked.</p><fieldset disabled={locked}>{DAYS.map(day => <label key={day}><span>{day}</span><input aria-label={`${day} notebook schedule`} placeholder="e.g. Classes 3–8 · Maths, Islamiat" value={report.notebookSchedule?.[day] || ''} onChange={event => onChange?.({ ...report.notebookSchedule, [day]: event.target.value })} /></label>)}</fieldset></div></ProformaAccordion>
}

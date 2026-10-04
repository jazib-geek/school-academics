import { renderToStaticMarkup } from 'react-dom/server'
import { hasNotebookSchedule, NOTEBOOK_SCHEDULE_DAYS, prepareReportForPrint, SECTIONS } from '../Employee/coordinatorWorkspaceData'
import styles from './proformaPrint.css?raw'

const join = (...values) => values.filter(value => value !== undefined && value !== null && value !== '' && value !== false).join(' · ')
const rows = (count) => Array.from({ length: count }, (_, i) => i)
const mark = value => value === 'Satisfactory' ? '✓' : value === 'Needs attention' ? '✗' : value || ''
function Table({ children, widths, className = '' }) {
  return <table className={className}>{widths && <colgroup>{widths.map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>}<tbody>{children}</tbody></table>
}
function Band({ title, children }) { return <Table widths={[17, 83]}><tr><th className="blue">{title}</th><th>{children}</th></tr></Table> }
function Sheet({ number, report, campus, children, embedded = false }) {
  const footerNote = embedded ? null : (report.reportId ? 'Coordinator proforma' : 'Preview')
  const footerMeta = embedded
    ? `${campus} · ${report.wing} · ${report.date}`
    : `${campus} · ${report.coordinator} · ${report.wing} · ${report.date} · ${report.status}${footerNote ? ` · ${footerNote}` : ''}`
  return <section className="paper"><div className="paper-body">{children}</div><footer>{footerMeta}<span>Page {number} of 5</span></footer></section>
}

export function ProformaPrint({ report, campus, embedded = false }) {
  report = prepareReportForPrint(report)
  const supplements = []
  const text = (value, max = 150) => {
    const string = String(value ?? '')
    if (string.length <= max) return string
    const ref = `C${supplements.length + 1}`
    supplements.push({ title: ref, detail: string })
    return `${string.slice(0, max)}… [${ref}]`
  }
  const days = NOTEBOOK_SCHEDULE_DAYS
  const scheduleDay = (day) => text(report.notebookSchedule?.[day], 80)
  const all = id => (report.entries || []).filter(entry => entry.section === id)
  const take = (id, count) => {
    const entries = all(id)
    entries.slice(count).forEach(entry => supplements.push({ title: `${SECTIONS.find(s => s.id === id)?.title} — additional record`, entry }))
    return rows(count).map(i => entries[i]?.values || {})
  }
  const combined = (id, keys, max = 200) => text(all(id).map(entry => join(...keys.map(key => entry.values[key]))).join('\n') || report.sections?.[id] || '', max)
  const routine = ['Delivery of Moral Lesson', 'Absentees Follow-up', 'H/Work delivery in 1st Lesson', 'MODs Welcome']
  const friday = ['Evidence Matters', "Teachers’ Diary", 'Lesson Planning', 'Teaching Material', 'Other Planning / Question Papers']
  const critical = take('criticalDiary', 3), parents = take('parents', 3), kaizen = take('kaizen', 5), diary = take('diary', 4)
  const notebooks = take('notebooks', 8), observations = take('observation', 2), teachers = take('teachers', 2)
  const tests = take('tests', 10), oxygen = take('oxygen', 3), closing = take('closing', 1)[0]
  const attendance = report.attendanceSnapshot || {}
  const studentStrength = () => {
    if (attendance.present != null && attendance.active != null) return `${attendance.present} / ${attendance.active}`
    return attendance.active ?? ''
  }
  const facultyStrength = () => {
    if (attendance.presentFaculty != null && attendance.faculty != null) return `${attendance.presentFaculty} / ${attendance.faculty}`
    return attendance.faculty ?? ''
  }
  const inlineMark = (value) => {
    if (value === 'Done' || value === 'Checked' || value === 'Satisfactory') return '■'
    if (value === 'Not done' || value === 'Needs attention' || value === 'Not checked') return '✗'
    return value || ''
  }
  const routineCell = (i) => {
    const entries = all('routine')
    const parts = entries.map((entry) => {
      const v = entry.values[`routine${i}`]
      const note = entry.values[`routineNote${i}`]
      const mark = inlineMark(v)
      return [mark, note].filter(Boolean).join(' ')
    }).filter(Boolean)
    return text(parts.join('\n') || '', 150)
  }
  const fridayCell = (i) => {
    const entries = all('friday')
    const parts = entries.map((entry) => {
      const v = entry.values[`friday${i}`]
      const note = entry.values[`fridayNote${i}`]
      const mark = inlineMark(v)
      return [mark, note].filter(Boolean).join(' ')
    }).filter(Boolean)
    return text(parts.join('\n') || '', 100)
  }
  const date = report.date ? new Date(`${report.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' }) : ''
  const check = (id, label) => <>{report.pageOneChecks?.[id] ? '☑' : '☐'} {label}</>
  const pages = [
    <Sheet key="1" number="1" report={report} campus={campus} embedded={embedded}>
      <Table widths={[24, 23, 19, 34]}><tr><td>Science Base School</td><td>Date &amp; Day<br /><span className="filled" data-print-system>{date}</span></td><td>SOS Week: <span className="filled">{text(report.sosWeek, 25)}</span></td><th>Planning/Execution Matters</th></tr></Table>
      <Table><tr><th className="blue">My Spirit and Stature - My Work</th></tr><tr><th className="spirit">We believe that like any resource, every response about school matters is an invisible show of the school. Obviously we are clear and capable to run all the school matters with diligence and commitment and to report it with professional honesty. As a custodian we are solemnly responsible to maintain, mend and strengthen our school status. We seek Allah's help to do justice with our students for their grooming and academic Kaizen.</th></tr></Table>
      <Table widths={[28, 52, 7, 13]}><tr><th>Monthly/<span className="red">Weekly Theme</span></th><td className="filled">{text(report.theme)}</td><th>Wing</th><td className="filled" data-print-system>{report.wing}</td></tr></Table>
      <Table widths={[11, 7, 7, 7, 11, 7, 9, 41]}><tr><th>Students’<br />Strength</th><td className="filled" data-print-system>{studentStrength()}</td><th>Absent</th><td className="filled" data-print-system>{attendance.absent ?? ''}</td><th>Total Faculty</th><td className="filled" data-print-system>{facultyStrength()}</td><th>Absent<br />(Names)</th><td className="filled" data-print-system>{text(attendance.absentFaculty?.join(', '))}</td></tr></Table>
      <Band title="Morning Meeting"> </Band><div className="ruled morning filled">{combined('morning', ['details'], 900)}</div>
      <Table widths={[17, 45, 38]}><tr><th className="blue">Due Dispatch</th><th><i>Notice/Fee Challan/Schedule/Syllabus/Papers etc.</i></th><td className="filled">{combined('dispatch', ['kind', 'details'], 180)}</td></tr></Table>
      <Table widths={[69, 31]}><tr><th><i>Z-Lesson/Special Period /Competition/Event /PTM (Activity/Preparation)etc.</i></th><td className="filled">{combined('activities', ['kind', 'details'], 130)}</td></tr></Table>
      <Table widths={[25, 25, 25, 25]}><tr><th colSpan={2} className="cyan">Fix</th><th colSpan={2} className="peach">Optional</th></tr><tr><th><i>{check('notebooks', 'note book re-checking')}</i></th><th><i>{check('diary', "students’ diary checking")}</i></th><th><i>{check('teachers', 'follow-up with teachers')}</i></th><th><i>{check('faculty', 'counselling/warning with faculty')}</i></th></tr><tr><th><i>{check('kaizen', "students’ kaizen")}</i></th><th><i>{check('observation', 'class observation')}</i></th><td /><td /></tr><tr><td /><td /><td /><td /></tr><tr><td colSpan={2} className="cyan" /><td colSpan={2} className="peach" /></tr></Table>
      <Band title="Priority Response">Parents' Concerns</Band><div className="filled priority">{combined('priority', ['concern', 'response'], 220)}</div>
    </Sheet>,
    <Sheet key="2" number="2" report={report} campus={campus} embedded={embedded}>
      <Table widths={[10, 7, 28, 55]}><tr><th rowSpan={4}>Critical<br />Diary Note</th><th>Class</th><th>Subject/Teacher/Issue</th><th>Concern &amp; Response</th></tr>{critical.map((v, i) => <tr key={i}><td className="filled">{text(v.class, 30)}</td><td className="filled">{text(join(v.subject, v.teacher, v.issue), 100)}</td><td className="filled">{text(join(v.concern, v.response), 180) || (i === 0 ? report.sections?.criticalDiary : '')}</td></tr>)}</Table>
      <Table widths={[10, 7, 14, 45, 24]}><tr><th rowSpan={4}>Complaint/Call<br />Visit<br />Inquiry<br /><span className="red">(Incoming/Outgoing)</span></th><th>Class</th><th>Student</th><th>Complaint / Inquiry</th><th>Remedy/Response</th></tr>{parents.map((v, i) => <tr key={i}><td className="filled">{text(v.class, 30)}</td><td className="filled">{text(v.student, 45)}</td><td className="filled">{text(join(v.kind, v.direction, v.concern), 170) || (i === 0 ? report.sections?.parents : '')}</td><td className="filled">{text(v.response, 100)}</td></tr>)}</Table>
      <Band title="Trust but verify.">Remarks For Non Compliance in Routine Matters</Band>
      <Table><tr><th>{routine.map((label, i) => `${i + 1}. ■ ${label}`).join('  ')}</th></tr></Table><Table>{<tr>{routine.map((label, i) => <td className="filled routine-cell" key={label}>{routineCell(i)}</td>)}</tr>}</Table>
      <Band title="Friday Matters"><span className="small">{friday.map((label, i) => `${i + 1}. ${label}`).join('  ')}</span></Band><Table><tr>{friday.map((label, i) => <td className="filled friday-cell" key={label}>{fridayCell(i)}</td>)}</tr></Table>
      <Band title="Test Confirmation">SOS -T, Re -T, MKR-T <span className="filled">{report.sections?.tests}</span></Band>
      <Table className="test-grid" widths={[6, 11, ...rows(10).map(() => 8.3)]}><tr><th rowSpan={4} className="vertical">SOS Test</th><th>Class</th>{tests.map((v, i) => <th className="filled" key={i}>{text(v.class, 28)}{v.kind === 'MKR-T' && <small> MKR-T</small>}</th>)}</tr>{[['Subject', 'subject'], ['Test Copies', 'copies'], ['Absent', 'absentCount']].map(([label, key]) => <tr key={key}><td>{label}</td>{tests.map((v, i) => <td className="filled" key={i}>{v.kind !== 'Retest' ? text(v[key], 42) : ''}</td>)}</tr>)}{[['Subject', 'subject'], ['Dated', 'testDate'], ['Period', 'period'], ['Students', 'students']].map(([label, key], i) => <tr key={key}>{i === 0 && <th rowSpan={4} className="vertical">Retest</th>}<td>{label}</td>{tests.map((v, j) => <td className="filled" key={j}>{v.kind === 'Retest' ? text(v[key], 42) : ''}</td>)}</tr>)}</Table>
    </Sheet>,
    <Sheet key="3" number="3" report={report} campus={campus} embedded={embedded}>
      <Band title="Oxygen Period">Test Discussion - <span className="normal">Appreciation, Correction, Motivation &amp; Grooming</span></Band>
      <Table><tr><th>Availability of Question Paper, Answer Sheets, Award-List with instructional comments and use of Board is necessary.</th></tr></Table>
      <Table widths={[6, 8, 3.5, 23, 8, 3.5, 23, 8, 3.5, 13.5]}><tr><td>Class</td>{oxygen.map((_, i) => <CellGroup key={i} headings={['Subject', 'Period', 'Instructional Comments']} />)}</tr><tr className="oxygen-record"><td className="filled">{text(oxygen[0].class, 35) || report.sections?.oxygen}</td>{oxygen.map((v, i) => <CellGroup key={i} values={[text(join(i ? v.class : '', v.subject), 55), text(v.period, 15), text(v.details, 330)]} />)}</tr>{rows(7).map(i => <tr key={i}>{rows(10).map(j => <td key={j} />)}</tr>)}</Table>
      <Band title="Of Coordinator's">1 Students' Kaizen - <span className="normal">Breaktime counselling and guidelines for addressing students' performance status altogether.</span></Band>
      <Table widths={[6, 35, 7, 52]}><tr><th>Class</th><td>Student(s)</td><th>Category</th><td>Remedial Grooming / Counselling</td></tr>{kaizen.map((v, i) => <tr key={i}><td className="filled">{text(v.class, 30)}</td><td className="filled">{text(v.students, 80)}</td><td className="filled">{text(v.category, 40)}</td><td className="filled">{text(v.response, 160) || (i === 0 ? report.sections?.kaizen : '')}</td></tr>)}</Table>
      <Table><tr><th>2 Students' Diary Checking - <span className="normal">Award or Title Missing/Unsigned/Unclear/Uncorrected Issue etc.</span></th></tr></Table><Table widths={[10, 22.5, 22.5, 22.5, 22.5]}><tr><th>Class/CT</th>{diary.map((v, i) => <td className="filled" key={i}>{text(join(v.class, v.teacher), 65)}</td>)}</tr><tr><th>Issue</th>{diary.map((v, i) => <td className="filled" key={i}>{text(join(v.issue, v.details), 90) || (i === 0 ? report.sections?.diary : '')}</td>)}</tr></Table>
    </Sheet>,
    <Sheet key="4" number="4" report={report} campus={campus} embedded={embedded}>
      <div className="page-four"><div><Table widths={[11, ...rows(5).map(() => 17.8)]}><tr><th>3</th><th colSpan={5}>Note Book Re-Checking</th></tr><tr><th rowSpan={3}>Class</th><td colSpan={5}>Neat,timely checked,well checked,remarks compliant,complete etc</td></tr><tr>{days.map(day => <th key={day}>{day}</th>)}</tr><tr className="schedule">{days.map(day => <td className="filled schedule-cell" key={day}>{scheduleDay(day)}</td>)}</tr></Table><Table widths={[11, 89]}>{notebooks.map((v, i) => <tr className="notebook-row" key={i}><td className="filled">{text(v.class, 30)}</td><td className="filled dotted">{text(join(v.student, v.subject, v.details), 170) || (i === 0 ? report.sections?.notebooks : '')}</td></tr>)}{!notebooks.some((v) => join(v.class, v.student, v.subject, v.details)) && hasNotebookSchedule(report) && <tr className="notebook-row" data-print-system><td className="filled">—</td><td className="filled">Weekly plan recorded above · no copy rows yet</td></tr>}</Table></div><div><Table><tr><th>4 Class Observation</th></tr><tr><td className="rubric">Reference material, SOS relevance, engaging, demonstrating, disciplined, effective board/av use, q/a oriented, h/w as per schedule</td></tr></Table>{observations.map((v, i) => <div key={i}><Table widths={[17, 17, 26, 17, 23]}><tr>{['Class', 'Subject', 'Teacher', 'Period', 'Formal/Informal'].map(label => <th key={label}>{label}</th>)}</tr><tr>{['class', 'subject', 'teacher', 'period', 'kind'].map(key => <td className="filled obs-context" key={key}>{text(v[key], 45)}</td>)}</tr></Table><div className="observation-notes filled">{text(join(v.strengths, v.details), 580) || (i === 0 ? report.sections?.observation : '')}</div></div>)}</div></div>
      <Table><tr><th>5 Follow-up with Teachers-<span className="small">R &amp; P, SOS, Students' Diary, Teacher's Diary, Notebooks, C-Ob, Test, MODs,C-Discipline</span></th></tr></Table><Table widths={[24, 53, 23]}><tr><td>Supporting Schedule</td><td>M-Urdu &amp; Maths, T-Sc &amp; Isl, W-Eng &amp; CS, Th-Maths, F-Quran</td><td>Urgency Exceptions Valid.</td></tr></Table>
    </Sheet>,
    <Sheet key="5" number="5" report={report} campus={campus} embedded={embedded}>
      <Table widths={[24, 7, 69]}><tr><th>Teacher(s)</th><th>Class</th><th>Points of Concern</th></tr>{teachers.map((v, i) => <TeacherRows key={i} teacher={text(v.teacher, 60)} className={text(v.class, 30)} concern={text(join(v.subject, v.kind, v.concern), 240) || (i === 0 ? report.sections?.teachers : '')} response={text(v.response, 260)} />)}</Table>
      <Table widths={[6, 42, 52]}><tr><th>6</th><th>Counselling or <span className="red">Warning</span> with Faculty/Staff</th><td className="filled">{combined('faculty', ['teacher', 'kind', 'concern', 'response'], 220)}</td></tr></Table><div className="spacer" />
      <Table widths={[17, 41, 42]}><tr><th className="blue">Closing</th><td>Pending Proposal/Report Submission (If any)</td><td><b>SVHW results to headoffice.</b> <span className="filled">{text(closing.svhw, 40)}</span></td></tr></Table><div className="ruled closing filled">{text(join(closing.pending, closing.details), 900) || report.sections?.closing}</div>
      <Table widths={[31, 69]}><tr><td>Any Critical Matter of the Day</td><td className="filled">{text(closing.critical, 240)}</td></tr></Table><Table widths={[41, 59]}><tr><td>No one/Any one Waiting/Present at Closing</td><td className="filled">{text(closing.remaining, 210)}</td></tr></Table><Table widths={[14, 7, 14, 7, 14, 44]}><tr><td>Plan/Report</td><td className="filled">{text(closing.planReport, 20)}</td><td>Departure at</td><td className="filled">{closing.departure}</td><td>Morning MODs</td><td className="filled">{text(closing.mods, 140)}</td></tr></Table>
    </Sheet>,
  ]
  // The paper has no columns for these structured checks; retain them in supporting details.
  const extraKeys = { oxygen: ['check0', 'check1', 'check2', 'check3'], observation: rows(8).map(i => `check${i}`), dailyChecks: SECTIONS.find(s => s.id === 'dailyChecks').fields.map(f => f.key) }
  for (const [id, keys] of Object.entries(extraKeys)) for (const entry of all(id)) {
    const fields = SECTIONS.find(s => s.id === id).fields.filter(f => keys.includes(f.key) && entry.values[f.key] !== undefined && entry.values[f.key] !== '')
    if (fields.length) supplements.push({ title: join(SECTIONS.find(s => s.id === id).title, entry.values.class, entry.values.subject, entry.values.teacher), detail: fields.map(f => `${f.label}: ${entry.values[f.key]}`).join('\n') })
  }
  return <>{pages}{all('notebooks').length > 0 && <section className="support"><h2>COPIES RECHECKING REPORT</h2><p>Coordinator’s Name: {report.coordinator}  Branch: {campus}  Month: {report.date?.slice(0, 7)}</p><table className="copies-table"><colgroup>{[7, 6, 8, 7, 8, 4, 4, 4, 3, 3, 3, 17, 7, 7, 4, 4, 4].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup><thead><tr>{['Date', 'Class & Section', "Student’s Name", 'Subject', 'Teacher name'].map(label => <th rowSpan={2} key={label}>{label}</th>)}<th colSpan={3}>Copy Cover</th><th colSpan={3}>Writing</th><th rowSpan={2}>Mistakes</th><th rowSpan={2}>Time Given for Correction</th><th rowSpan={2}>Signature of Teacher</th><th colSpan={3}>Mistakes Corrected or Not</th></tr><tr>{['Title', 'Page numbering', 'Neatness', 'Below', 'Avg', 'Good', 'Partially', 'Completed', 'No'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{all('notebooks').map(entry => { const v = entry.values; return <tr key={entry.id}><td>{report.date}</td>{['class', 'student', 'subject', 'teacher'].map(key => <td key={key}>{v[key]}</td>)}{['check0', 'check1', 'check2'].map(key => <td key={key}>{mark(v[key])}</td>)}{['Below average', 'Average', 'Good'].map(value => <td key={value}>{v.writing === value ? '✓' : ''}</td>)}<td>{v.details}</td><td>{v.correctionTime}</td><td />{['Partially corrected', 'Completed', 'Not corrected'].map(value => <td key={value}>{v.correction === value ? '✓' : ''}</td>)}</tr> })}</tbody></table><p className="small">Teacher signatures remain blank. {all('notebooks').map(e => join(e.values.student, e.values.acknowledgement && `Teacher informed: ${e.values.acknowledgement}`, e.values.correction === 'Not needed' && 'Correction not needed')).filter(Boolean).join('; ')}</p></section>}{supplements.length > 0 && <section className="support"><h2>Continuation &amp; supporting details</h2><p>{campus} · {report.coordinator} · {report.date} · {report.wing}</p>{supplements.map((item, i) => <div className="continuation" key={i}><h3>{item.title}</h3>{item.entry ? <dl>{SECTIONS.find(s => s.id === item.entry.section)?.fields.filter(f => item.entry.values[f.key] !== undefined && item.entry.values[f.key] !== '').map(f => <div key={f.key}><dt>{f.label}</dt><dd dir="auto">{String(item.entry.values[f.key])}</dd></div>)}</dl> : <p dir="auto">{item.detail}</p>}</div>)}</section>}</>
}
function CellGroup({ headings, values }) { return <>{(headings || values).map((value, i) => <td className={values ? 'filled' : ''} key={i}>{value}</td>)}</> }
function TeacherRows({ teacher, className, concern, response }) { return <><tr><td className="filled">{teacher}</td><td className="filled">{className}</td><td className="filled">{concern}</td></tr><tr><th><i>Acknowledged Measures</i></th><td colSpan={2} className="filled">{response}</td></tr></> }

export function openProformaPrint(report, campus, options = {}) {
  const returnPath = options.returnPath
    || `${window.location.pathname}${window.location.search}${window.location.hash}`
    || '/'
  const preview = window.open('', '_blank')
  if (!preview) return false
  const content = renderToStaticMarkup(<ProformaPrint report={report} campus={campus} />)
  preview.document.open()
  preview.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Coordinator proforma</title><style>${styles}</style></head><body><nav class="print-controls"><button type="button" id="back" class="print-back">Back</button><button type="button" id="print">Print / Save PDF</button><span>A4 landscape · 100% scale · turn off browser headers/footers. Five pages — weekly notebook plan on page 4 (Mon–Fri row). Blank cells are unrecorded.</span></nav>${content}</body></html>`)
  preview.document.close()
  // Keep the five reference pages intact even when several cells contain long notes.
  // Move the visible cell text to a referenced continuation, never silently clip it.
  const fitPages = () => {
    let continuation
    preview.document.querySelectorAll('.paper').forEach((page, pageIndex) => {
      const body = page.querySelector('.paper-body')
      const available = page.querySelector('footer').offsetTop - body.offsetTop - 10
      const candidates = [...body.querySelectorAll('.filled')].filter(cell => cell.textContent.length > 14).sort((a, b) => b.textContent.length - a.textContent.length)
      let index = Number(page.dataset.continuationCount || 0)
      while (body.getBoundingClientRect().height > available && candidates.length) {
        if (!continuation) {
          continuation = preview.document.createElement('section')
          continuation.className = 'support'
          const heading = preview.document.createElement('h2')
          heading.textContent = 'Page layout continuations'
          continuation.append(heading)
          preview.document.body.append(continuation)
        }
        const cell = candidates.shift()
        const ref = `P${pageIndex + 1}-${++index}`
        const block = preview.document.createElement('div')
        block.className = 'continuation'
        const heading = preview.document.createElement('h3')
        heading.textContent = ref
        const note = preview.document.createElement('p')
        note.dir = 'auto'
        note.textContent = cell.textContent
        block.append(heading, note)
        continuation.append(block)
        cell.textContent = `[${ref}]`
      }
      page.dataset.continuationCount = String(index)
    })
  }
  const applyCoordinatorEntryHighlights = () => {
    const doc = preview.document
    doc.querySelectorAll('.coord-entry').forEach((el) => el.classList.remove('coord-entry'))
    doc.querySelectorAll('.filled:not([data-print-system])').forEach((el) => {
      const text = el.textContent?.replace(/\u00a0/g, ' ').trim()
      if (text) el.classList.add('coord-entry')
    })
    doc.querySelectorAll('.support .continuation dd, .support .continuation p').forEach((el) => {
      const text = el.textContent?.replace(/\u00a0/g, ' ').trim()
      if (text) el.classList.add('coord-entry')
    })
  }
  fitPages()
  applyCoordinatorEntryHighlights()
  preview.addEventListener('beforeprint', () => {
    fitPages()
    applyCoordinatorEntryHighlights()
  })
  preview.document.getElementById('print').addEventListener('click', () => preview.print())
  preview.document.getElementById('back').addEventListener('click', () => {
    const opener = preview.opener
    if (opener && !opener.closed) {
      try { opener.focus() } catch { /* cross-origin */ }
      preview.close()
      return
    }
    preview.location.assign(`${preview.location.origin}${returnPath}`)
  })
  return true
}

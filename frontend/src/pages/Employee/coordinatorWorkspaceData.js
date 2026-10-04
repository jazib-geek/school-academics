import { DEFAULT_MOCK_COORDINATOR_WING, proformaWingLabel, PROFORMA_WINGS } from '../../utils/proformaWings'
import { getEmployeeWingCode } from '../../services/employeeAuthService'
import { sortClassesByCustomOrder } from '../../services/classSort'

export const WINGS = PROFORMA_WINGS

export const EMPTY_PROFORMA_LOOKUPS = {
  classes: [],
  subjects: [],
  teachers: [],
  students: [],
}

/** Saved next to display text in entry values for future reporting. */
export const PROFORMA_LOOKUP_ID_KEYS = {
  class: 'classId',
  subject: 'subjectId',
  teacher: 'teacherId',
  student: 'studentId',
}

const field = (key, label, type = 'text', options) => ({ key, label, type, options })
const select = (key, label, options) => field(key, label, 'select', options)
const notes = (key, label) => field(key, label, 'textarea')

export function mapProformaLookupOptions(lookups) {
  const toChoice = (item) => ({
    value: item.id != null && item.id !== '' ? String(item.id) : (item.value ?? item.label),
    label: item.label ?? item.value ?? '',
    ...(item.description ? { description: item.description } : {}),
    ...(item.sectionId != null && item.sectionId !== '' ? { sectionId: String(item.sectionId) } : {}),
  })

  const classes = sortClassesByCustomOrder(
    (lookups?.classes || []).map((item) => ({
      id: item.id,
      className: item.label ?? item.value,
    })),
  ).map((item) => toChoice({ id: item.id, label: item.className }))

  const subjects = (lookups?.subjects || []).map((item) => toChoice({
    id: item.id,
    label: item.label ?? item.value,
  }))
  const teachers = (lookups?.teachers || []).map((item) => toChoice({
    id: item.id,
    label: item.label ?? item.value,
    description: item.description,
  }))
  const students = (lookups?.students || []).map((item) => toChoice({
    id: item.id,
    label: item.label ?? item.value,
    description: item.description,
    sectionId: item.sectionId,
  }))

  return { classes, subjects, teachers, students }
}

export function buildProformaSections(lookups = EMPTY_PROFORMA_LOOKUPS) {
  const { classes, subjects, teachers, students } = mapProformaLookupOptions(lookups)

  const classField = select('class', 'Class / section', classes)
  const subjectField = select('subject', 'Subject', subjects)
  const teacherField = select('teacher', 'Teacher', teachers)
  const studentField = select('student', 'Student', students)

  return [
    { id: 'morning', title: 'Morning Meeting', short: 'Morning meeting', group: 'Page 1', description: 'Points discussed and instructions given in the morning meeting.', fields: [notes('details', 'Meeting points')] },
    { id: 'dailyChecks', title: 'Additional daily checks', short: 'Daily checks', group: 'Additional checks', description: 'Existing arrival, assembly, uniform, cleanliness and MOD recording.', fields: [
      field('topic', 'Moral lesson topic'),
      select('assembly', 'Assembly conducted per policy', ['Yes', 'No', 'Not observed']),
      ...checks(['Uniform', 'Campus cleanliness', 'Teachers in classes']),
      select('duty', 'MOD duty', ['Welcome', 'Assembly', 'Break', 'Off time', 'Other']), teacherField,
      field('arrival', 'Arrival time', 'time'),
    ] },
    { id: 'dispatch', title: 'Due Dispatch', short: 'Dispatch', group: 'Page 1', description: 'Notice / Fee Challan / Schedule / Syllabus / Papers etc.', fields: [
      select('kind', 'Dispatch type', ['Notice', 'Fee challan', 'Schedule', 'Syllabus', 'Question papers', 'Other']),
      notes('details', 'Dispatch details'),
    ] },
    { id: 'activities', title: 'Z-Lesson / Special Period / Competition / Event / PTM', short: 'Activity', group: 'Page 1', description: 'Activity / Preparation', fields: [select('kind', 'Activity', ['Z-Lesson', 'Special Period', 'Competition', 'Event', 'PTM', 'Other']), notes('details', 'Activity / Preparation')] },
    { id: 'priority', title: 'Priority Response — Parents’ Concerns', short: 'Priority response', group: 'Page 1', description: 'Priority concern and response; detailed contacts are on Page 2.', fields: [notes('concern', 'Parents’ concern / priority'), notes('response', 'Priority response')] },
    { id: 'criticalDiary', title: 'Critical Diary Note', short: 'Critical diary note', group: 'Page 2', description: 'Class · Subject / Teacher / Issue · Concern & Response', fields: [classField, subjectField, teacherField, field('issue', 'Issue'), notes('concern', 'Concern'), notes('response', 'Response')] },
    { id: 'parents', title: 'Complaint / Call / Visit / Inquiry', short: 'Parent contact', group: 'Page 2', description: 'Incoming / Outgoing · Class · Student · Complaint / Inquiry · Remedy / Response', fields: [
      select('kind', 'Contact type', ['Complaint', 'Call', 'Visit', 'Inquiry']), select('direction', 'Incoming / Outgoing', ['Incoming', 'Outgoing']), classField, studentField, notes('concern', 'Complaint / Inquiry'), notes('response', 'Remedy / Response'),
    ] },
    { id: 'routine', title: 'Trust but verify', short: 'Routine matters', group: 'Page 2', description: 'Remarks for Non Compliance in Routine Matters', fields: [
      ...['Delivery of Moral Lesson', 'Absentees Follow-up', 'H/Work delivery in 1st Lesson', 'MODs Welcome'].flatMap((label, i) => [field('routine' + i, label, 'inline', ['Done', 'Not done', 'Not verified', 'Not applicable']), notes('routineNote' + i, label + ' — remarks')]),
    ] },
    { id: 'friday', title: 'Friday Matters', short: 'Friday matters', group: 'Page 2', description: 'Evidence Matters · Teachers’ Diary · Lesson Planning · Teaching Material · Other Planning / Question Papers', fields: [
      ...['Evidence Matters', 'Teachers’ Diary', 'Lesson Planning', 'Teaching Material', 'Other Planning / Question Papers'].flatMap((label, i) => [field('friday' + i, label, 'inline', ['Checked', 'Needs attention', 'Not checked', 'Not applicable']), notes('fridayNote' + i, label + ' — remarks')]),
    ] },
    { id: 'tests', title: 'Test Confirmation', short: 'Test confirmation', group: 'Page 2', description: 'SOS-T / Re-T / MKR-T · one record per class and subject', fields: [
      field('kind', 'Test type', 'inline', ['SOS test', 'Retest', 'MKR-T']), classField, subjectField,
      field('copies', 'Test Copies', 'number'), field('absentCount', 'Absent', 'number'),
      field('testDate', 'Dated', 'date'), field('period', 'Period'), notes('students', 'Students'),
    ] },
    { id: 'oxygen', title: 'Oxygen Period', short: 'Oxygen period', group: 'Page 3', description: 'Test Discussion — Appreciation, Correction, Motivation & Grooming', fields: [
      classField, subjectField, field('period', 'Period'), notes('details', 'Instructional Comments'),
      ...['Question Paper', 'Answer Sheets', 'Award List with instructional comments', 'Use of Board'].map((label, i) => field('check' + i, label, 'inline', ['Satisfactory', 'Needs attention', 'Not checked', 'Not applicable'])),
    ] },
    { id: 'kaizen', title: '1 · Students’ Kaizen', short: 'Kaizen', group: 'Page 3', description: 'Breaktime counselling and guidelines for students’ performance', fields: [
      classField, field('students', 'Student(s)'), select('category', 'Category', ['Below average', 'Average', 'Good', 'Academic support', 'Behaviour', 'Grooming', 'Motivation', 'Other']), notes('response', 'Remedial Grooming / Counselling'),
    ] },
    { id: 'diary', title: '2 · Students’ Diary Checking', short: 'Diary checking', group: 'Page 3', description: 'Award or Title Missing / Unsigned / Unclear / Uncorrected Issue etc.', fields: [
      classField, { ...teacherField, label: 'CT / Class teacher' }, field('issue', 'Issue', 'inline', ['OK', 'Missing', 'Unsigned', 'Unclear', 'Uncorrected', 'Award / title missing', 'Other']), notes('details', 'Issue details'),
    ] },
    { id: 'notebooks', title: '3 · Note Book Re-Checking', short: 'Notebooks', group: 'Page 4', description: 'Neat, timely checked, well checked, remarks compliant, complete etc.', fields: [
      classField, subjectField, teacherField, studentField,
      ...checks(['Title', 'Page numbering', 'Neatness']),
      select('writing', 'Writing quality', ['Below average', 'Average', 'Good']),
      notes('details', 'Mistakes'), field('correctionTime', 'Time given for correction (e.g. 2 days)'),
      select('correction', 'Correction status', ['Not needed', 'Not corrected', 'Partially corrected', 'Completed']),
      select('acknowledgement', 'Teacher informed', ['Not yet', 'Informed by coordinator']),
    ] },
    { id: 'observation', title: '4 · Class Observation', short: 'Observation', group: 'Page 4', description: 'Reference material, SOS relevance, engaging, demonstrating, disciplined, effective board / AV use, Q/A oriented, homework as per schedule.', fields: [
      classField, subjectField, teacherField, field('period', 'Period'),
      field('kind', 'Formal / Informal', 'inline', ['Formal', 'Informal']),
      ...checks(['Reference material', 'Scheme of studies relevance', 'Student engagement', 'Demonstration', 'Discipline', 'Board / audiovisual use', 'Questions & answers', 'Homework as scheduled']),
      notes('strengths', 'Observation remarks'), notes('details', 'Guidance / improvement points'),
    ] },
    { id: 'teachers', title: '5 · Follow-up with Teachers', short: 'Teachers', group: 'Page 5', description: 'Teacher(s) · Class · Points of Concern · Acknowledged Measures', fields: [
      teacherField, classField, subjectField,
      select('kind', 'Area', ['Scheme of studies', 'Student diary', 'Teacher diary', 'Notebooks', 'Class observation', 'Test', 'MOD / discipline', 'Other']),
      notes('concern', 'Points of concern'), notes('response', 'Acknowledged Measures'),
    ] },
    { id: 'faculty', title: '6 · Counselling or Warning with Faculty/Staff', short: 'Faculty', group: 'Page 5', emptyLabel: 'No one', description: 'Record counselling or a warning, or mark No one.', fields: [
      { ...teacherField, label: 'Faculty / Staff' }, field('kind', 'Counselling / Warning', 'inline', ['Counselling', 'Warning']), notes('concern', 'Reason / concern'), notes('response', 'Advice / agreed action'),
    ] },
    { id: 'closing', title: 'Closing', short: 'Closing', group: 'Page 5', single: true, description: 'Pending submissions / SVHW results / Critical matters / Departure / Morning MODs', fields: [
      { ...notes('pending', 'Pending Proposal / Report Submission (if any)'), emptyResponse: 'None' },
      field('svhw', 'SVHW results to head office (Summer vacation homework)', 'inline', ['Yes', 'No', 'Not applicable']),
      { ...notes('critical', 'Any Critical Matter of the Day'), emptyResponse: 'None' },
      { ...notes('remaining', 'Anyone Waiting / Present at Closing'), emptyResponse: 'No one' },
      field('planReport', 'Plan / Report', 'inline', ['Plan', 'Report']),
      field('departure', 'Departure at', 'time'), field('mods', 'Morning MODs'), notes('details', 'Closing remarks'),
    ] },
  ]
}

function checks(labels) {
  return labels.map((label, i) => select(`check${i}`, label, ['Satisfactory', 'Needs attention', 'Not checked', 'Not applicable']))
}

/** Static section catalog (labels/structure) for print and monitoring views. */
export const SECTIONS = buildProformaSections(EMPTY_PROFORMA_LOOKUPS)

/** Sections that appear on the printed five-page proforma (excludes extra daily checks). */
export const PAPER_SECTIONS = SECTIONS.filter((section) => section.group !== 'Additional checks')

export const todayInPakistan = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

function defaultWingCode() {
  return getEmployeeWingCode() || DEFAULT_MOCK_COORDINATOR_WING
}

export const NOTEBOOK_SCHEDULE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function hasNotebookSchedule(report) {
  const schedule = normalizeNotebookSchedule(report?.notebookSchedule)
  return NOTEBOOK_SCHEDULE_DAYS.some((day) => String(schedule[day] || '').trim())
}

/** Canonical Mon–Fri keys for print and API (handles legacy casing). */
export function normalizeNotebookSchedule(schedule) {
  const normalized = {}
  if (!schedule || typeof schedule !== 'object') return normalized
  for (const day of NOTEBOOK_SCHEDULE_DAYS) {
    const direct = schedule[day]
    const lower = schedule[day.toLowerCase()]
    const value = direct ?? lower ?? ''
    if (String(value).trim()) normalized[day] = String(value).trim()
  }
  return normalized
}

/** Merge workspace fields for the five-page print layout. */
export function prepareReportForPrint(report) {
  if (!report) return report
  const workspace = report.workspace && typeof report.workspace === 'object' ? report.workspace : {}
  return {
    ...workspace,
    ...report,
    coordinator: report.coordinator || report.coordinatorName || '',
    date: report.date || report.reportDate || '',
    wing: report.wing || workspace.wing || '',
    theme: report.theme ?? workspace.theme ?? '',
    sosWeek: report.sosWeek ?? workspace.sosWeek ?? '',
    status: report.status ?? workspace.status ?? 'Draft',
    sections: { ...(workspace.sections || {}), ...(report.sections || {}) },
    pageOneChecks: { ...(workspace.pageOneChecks || {}), ...(report.pageOneChecks || {}) },
    attendanceSnapshot: report.attendanceSnapshot ?? workspace.attendanceSnapshot ?? null,
    notebookSchedule: normalizeNotebookSchedule(report.notebookSchedule ?? workspace.notebookSchedule),
    entries: report.entries ?? workspace.entries ?? [],
    actions: report.actions ?? workspace.actions ?? [],
    comments: report.comments ?? workspace.comments ?? [],
    history: report.history ?? workspace.history ?? [],
  }
}

export function sectionProofreadStatus(sectionId, report, entries = []) {
  const items = entries.filter((entry) => entry.section === sectionId)
  if (items.length) return { tag: `${items.length} recorded`, items, showSchedule: false }
  if (sectionId === 'notebooks') {
    if (hasNotebookSchedule(report)) return { tag: 'Schedule recorded', items, showSchedule: true }
    if (report?.pageOneChecks?.notebooks) return { tag: 'Marked on page 1', items, showSchedule: false }
  }
  const marker = report?.sections?.[sectionId]
  if (marker) return { tag: marker, items, showSchedule: false }
  return { tag: 'Not recorded', items, showSchedule: false }
}

export function createReport(date, _sample = false, wingCode = defaultWingCode()) {
  return {
    wingCode,
    wing: proformaWingLabel(wingCode),
    theme: '',
    sosWeek: '',
    status: 'Draft',
    acknowledged: false,
    approved: false,
    sections: {},
    pageOneChecks: {},
    notebookSchedule: {},
    entries: [],
    actions: [],
    history: [],
  }
}

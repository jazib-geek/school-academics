// Prototype fixtures only. No campus records or API writes are used by this workspace.
export const WINGS = ['Pre-primary', 'Primary', 'Middle', 'High', 'Primary + High']
const CLASSES = ['Nursery Blue', 'Prep Blue', '3 Blue', '4 Blue', '5 Blue', '6 Blue', '7 Blue', '7 Red', '8 Blue']
const SUBJECTS = ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiat', 'T. Quran', 'Social studies', 'Computer science']
const TEACHERS = ['Ms. Amina (sample)', 'Ms. Sara (sample)', 'Ms. Hina (sample)']
const STUDENTS = ['Ali (sample)', 'Dua (sample)', 'Noor (sample)', 'Qasim (sample)']
const field = (key, label, type = 'text', options) => ({ key, label, type, options })
const select = (key, label, options) => field(key, label, 'select', options)
const notes = (key, label) => field(key, label, 'textarea')
const classField = select('class', 'Class / section', CLASSES)
const subjectField = select('subject', 'Subject', SUBJECTS)
const teacherField = select('teacher', 'Teacher', TEACHERS)
const studentField = select('student', 'Student', STUDENTS)
const outcome = select('outcome', 'Outcome', ['Satisfactory', 'Needs attention', 'Not checked', 'Not applicable'])
const checks = (labels) => labels.map((label, i) => select(`check${i}`, label, ['Satisfactory', 'Needs attention', 'Not checked', 'Not applicable']))

export const SECTIONS = [
  { id: 'morning', title: 'Morning & planning', short: 'Morning', group: 'Start the day', description: 'Meeting points, assembly, priorities and MOD duties.', fields: [
    select('kind', 'Entry type', ['Morning meeting', 'Assembly / morning round', 'MOD duty', 'Priority for today']),
    notes('details', 'Meeting points / instructions'), field('topic', 'Moral lesson topic'),
    select('assembly', 'Assembly conducted per policy', ['Yes', 'No', 'Not observed']),
    ...checks(['Uniform', 'Campus cleanliness', 'Teachers in classes']),
    select('duty', 'MOD duty', ['Welcome', 'Assembly', 'Break', 'Off time', 'Other']), teacherField,
    field('arrival', 'Arrival time', 'time'),
  ] },
  { id: 'dispatch', title: 'Dispatch & activities', short: 'Activities', group: 'Start the day', description: 'Notices, special periods, events and PTM preparation.', fields: [
    select('kind', 'Type', ['Notice', 'Fee challan', 'Schedule', 'Syllabus', 'Question papers', 'Z-lesson / special period', 'Competition', 'Event', 'PTM', 'Other']),
    field('title', 'Activity / dispatch'), classField, field('dueDate', 'Due date', 'date'),
    select('outcome', 'Progress', ['Planned', 'In progress', 'Completed', 'Delayed']), notes('details', 'Preparation / delivery details'),
  ] },
  { id: 'parents', title: 'Parent concerns', short: 'Parents', group: 'Care & communication', description: 'Critical diary notes, calls, visits and responses.', fields: [
    select('kind', 'Contact type', ['Critical diary note', 'Call', 'Visit', 'Inquiry']),
    select('direction', 'Direction', ['Incoming', 'Outgoing']), classField, studentField, subjectField, teacherField,
    notes('concern', 'Concern / inquiry'), notes('response', 'Response / remedy'),
  ] },
  { id: 'routine', title: 'Routine verification', short: 'Routine', group: 'Start the day', description: 'Moral lesson, absentee follow-up, homework and welcome.', fields: [
    select('kind', 'Routine matter', ['Moral lesson delivery', 'Absentees follow-up', 'Homework delivery in first lesson', 'MOD welcome']),
    classField, select('outcome', 'Verification', ['Completed', 'Partially completed', 'Not completed', 'Not verified', 'Not applicable']), notes('details', 'Evidence / exception / response'),
  ] },
  { id: 'friday', title: 'Friday matters', short: 'Friday', group: 'Academic checks', description: 'Evidence, teacher diaries, lesson plans and material.', fields: [
    select('kind', 'Check', ['Evidence matters', 'Teacher diary', 'Lesson planning', 'Teaching material', 'Question papers / other planning']),
    teacherField, classField, outcome, notes('details', 'Findings'),
  ] },
  { id: 'tests', title: 'Tests & retests', short: 'Tests', group: 'Academic checks', description: 'Test confirmation, copies, absences and retest plans.', fields: [
    select('kind', 'Test type', ['SOS test', 'Retest', 'MKR-T']), classField, subjectField,
    field('testDate', 'Test / retest date', 'date'), field('period', 'Period'),
    select('outcome', 'Conducted', ['Yes', 'No', 'Planned']), field('copies', 'Test copies', 'number'),
    field('absentCount', 'Absent in this test', 'number'), notes('students', 'Absent / retest students'), notes('details', 'Notes'),
  ] },
  { id: 'oxygen', title: 'Oxygen period', short: 'Oxygen', group: 'Academic checks', description: 'Test discussion, correction, appreciation and guidance.', fields: [
    classField, subjectField, teacherField, field('period', 'Period'),
    ...checks(['Question paper available', 'Answer sheets available', 'Award list with comments', 'Board use']),
    notes('details', 'Instructional comments / guidance'),
  ] },
  { id: 'kaizen', title: 'Students’ Kaizen', short: 'Kaizen', group: 'Care & communication', description: 'Student growth, counselling and remedial support.', fields: [
    classField, field('students', 'Student(s)'), select('category', 'Category', ['Academic support', 'Behaviour', 'Grooming', 'Motivation', 'Other']),
    notes('concern', 'Concern / support needed'), notes('response', 'Remedial work / counselling'),
  ] },
  { id: 'diary', title: 'Student diary checking', short: 'Diaries', group: 'Academic checks', description: 'Record satisfactory checks and diary issues.', fields: [
    classField, teacherField, field('sampleCount', 'Diaries checked', 'number'),
    select('issue', 'Finding', ['All satisfactory', 'Missing', 'Unsigned', 'Unclear', 'Uncorrected', 'Award / title missing', 'Other']),
    notes('students', 'Student(s), if relevant'), notes('details', 'Findings / action taken'),
  ] },
  { id: 'notebooks', title: 'Notebook rechecking', short: 'Notebooks', group: 'Academic checks', description: 'Individual copies, quality checks and correction deadlines.', fields: [
    classField, subjectField, teacherField, studentField,
    ...checks(['Title / cover', 'Page numbering', 'Neatness', 'Syllabus tag', 'Timely checking', 'Checking accuracy', 'Remarks', 'Work complete']),
    select('writing', 'Writing quality', ['Below average', 'Average', 'Good']),
    notes('details', 'Mistakes / findings'),
    select('correction', 'Correction status', ['Not needed', 'Not corrected', 'Partially corrected', 'Completed']),
    select('acknowledgement', 'Teacher informed', ['Not yet', 'Informed by coordinator']),
  ] },
  { id: 'observation', title: 'Class observation', short: 'Observation', group: 'Academic checks', description: 'Teaching practice, strengths and improvement points.', fields: [
    classField, subjectField, teacherField, field('period', 'Period'),
    select('kind', 'Observation type', ['Formal', 'Informal']),
    ...checks(['Reference material', 'Scheme of studies relevance', 'Student engagement', 'Demonstration', 'Discipline', 'Board / audiovisual use', 'Questions & answers', 'Homework as scheduled']),
    notes('strengths', 'Strengths'), notes('details', 'Improvement points / guidance'),
  ] },
  { id: 'teachers', title: 'Teacher follow-up', short: 'Teachers', group: 'Care & communication', description: 'Concerns, agreed measures and progress with teachers.', fields: [
    teacherField, classField, subjectField,
    select('kind', 'Area', ['Scheme of studies', 'Student diary', 'Teacher diary', 'Notebooks', 'Class observation', 'Test', 'MOD / discipline', 'Other']),
    notes('concern', 'Points of concern'), notes('response', 'Agreed measures'),
  ] },
  { id: 'faculty', title: 'Faculty counselling', short: 'Faculty', group: 'Care & communication', description: 'Staff counselling, warnings and agreed action.', fields: [
    teacherField, select('kind', 'Type', ['Counselling', 'Warning']), notes('concern', 'Reason / concern'), notes('response', 'Advice / agreed action'),
  ] },
  { id: 'closing', title: 'Closing the day', short: 'Closing', group: 'Close the day', description: 'Pending work, critical matters, departure and next morning.', fields: [
    notes('pending', 'Pending proposal / report submissions'),
    select('svhw', 'Summer vacation homework results sent', ['Yes', 'No', 'Not applicable']),
    notes('critical', 'Critical matter of the day'), notes('remaining', 'Anyone waiting / present at closing'),
    field('departure', 'Departure time', 'time'), field('mods', 'Next morning MODs'), notes('details', 'Plan / closing remarks'),
  ] },
]

export const todayInPakistan = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

export function createReport(date, sample = false) {
  return {
    theme: sample ? 'Cleanliness & care' : '', sosWeek: sample ? '5' : '', status: 'Draft',
    acknowledged: false, approved: false, sections: {},
    entries: sample ? [
      { id: 'sample-morning', section: 'morning', values: { kind: 'Morning meeting', details: 'Discussed notebook checking and lesson delivery. Planned the colour day activity.', topic: 'Respect for shared spaces' }, attachments: [] },
      { id: 'sample-notebook', section: 'notebooks', values: { class: '6 Blue', subject: 'Mathematics', teacher: TEACHERS[0], student: STUDENTS[1], check0: 'Satisfactory', check1: 'Needs attention', check2: 'Satisfactory', check3: 'Satisfactory', check4: 'Satisfactory', check5: 'Needs attention', writing: 'Average', details: 'Two corrections were missed. Add page numbers and recheck the corrected work.', correction: 'Not corrected' }, attachments: [] },
      { id: 'sample-observation', section: 'observation', values: { class: '4 Blue', subject: 'Urdu', teacher: TEACHERS[1], period: '3', kind: 'Formal', check2: 'Satisfactory', check4: 'Satisfactory', strengths: 'Students participated well; the board was prepared before the lesson.', details: 'Allow more time for independent reading.' }, attachments: [] },
    ] : [],
    actions: sample ? [{ id: 'sample-action', sourceId: 'sample-notebook', title: 'Recheck corrections and page numbering', owner: TEACHERS[0], due: date, status: 'Open', updates: [] }] : [],
    history: [],
  }
}

export const SAMPLE_ATTENDANCE = [
  { class: '3 Blue', active: 32, present: 29, absent: 2, unmarked: 1 },
  { class: '4 Blue', active: 30, present: 28, absent: 2, unmarked: 0 },
  { class: '5 Blue', active: 31, present: 29, absent: 2, unmarked: 0 },
  { class: '6 Blue', active: 34, present: 31, absent: 2, unmarked: 1 },
  { class: '7 Blue', active: 35, present: 31, absent: 3, unmarked: 1 },
  { class: '8 Blue', active: 33, present: 30, absent: 3, unmarked: 0 },
]

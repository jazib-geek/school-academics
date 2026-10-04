import { proformaWingLabel } from '../../utils/proformaWings'
import { createReport, todayInPakistan } from '../Employee/coordinatorWorkspaceData'

export const HEAD_CAMPUSES = [
  { id: 'main', name: 'Satellite Town', strength: 582, present: 541, absent: 32, unmarked: 9 },
  { id: 'mt', name: 'Model Town', strength: 436, present: 411, absent: 21, unmarked: 4 },
  { id: 'pc', name: 'Peoples Colony', strength: 368, present: 350, absent: 18, unmarked: 0 },
]
export const previousDay = (date) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - 1)
  return value.toISOString().slice(0, 10)
}
const EXTRA_ENTRIES = [
  ['dispatch', { kind: 'Notice', title: 'Retest schedule shared', class: '6 Blue', outcome: 'Completed', details: 'Parents received the revised retest schedule.' }],
  ['parents', { kind: 'Call', direction: 'Incoming', class: '3 Blue', student: 'Ali (sample)', concern: 'Parent requested extra reading support.', response: 'Agreed a ten-minute daily reading routine and a Friday check-in.' }],
  ['criticalDiary', { class: 'Prep Blue', subject: 'Urdu', teacher: 'Ms. Sara (sample)', issue: 'Reading support', concern: 'Student needs more Urdu reading practice.', response: 'Give special attention during guided reading.' }],
  ['routine', { routine0: 'Not done', routineNote0: 'Moral lesson was not delivered.', routine1: 'Not done', routineNote1: 'Ten families contacted. Four calls remain pending.', routine2: 'Done', routineNote2: 'Homework delivered in first lesson.', routine3: 'Done', routineNote3: 'MODs on welcome duty.' }],
  ['friday', { friday2: 'Checked', fridayNote2: 'Next week’s lesson material reviewed in advance.' }],
  ['tests', { kind: 'SOS test', class: '7 Blue', subject: 'Urdu', outcome: 'Yes', copies: '29', absentCount: '2', details: 'Two absent students scheduled for a retest.' }],
  ['oxygen', { class: '7 Blue', subject: 'Urdu', period: '4', check0: 'Satisfactory', check1: 'Satisfactory', check2: 'Needs attention', check3: 'Satisfactory', details: 'Practised dictation; add instructional comments to the award list.' }],
  ['kaizen', { class: '3 Blue', students: 'Ali and Qasim (sample)', category: 'Academic support', concern: 'Students need support with independent writing.', response: 'Short guided practice after reading the lesson.' }],
  ['diary', { class: '6 Blue', teacher: 'Ms. Amina (sample)', sampleCount: '12', issue: 'All satisfactory', details: 'Homework instructions were clear and signed.' }],
  ['teachers', { teacher: 'Ms. Amina (sample)', class: '7 Blue', kind: 'Notebooks', concern: 'Syllabus tags missing from two notebooks.', response: 'Teacher agreed to complete tags by the next school day.' }],
  ['closing', { pending: 'Award-list comments and four parent calls.', svhw: 'Not applicable', critical: 'None', remaining: 'No students waiting', departure: '14:30', mods: 'Ms. Sara (sample)', details: 'Reading support to continue tomorrow.' }],
]

export function createHeadMock() {
  const today = todayInPakistan()
  const wings = ['PrimaryHigh', 'Junior', 'Primary']
  return HEAD_CAMPUSES.flatMap((campus, campusIndex) => [today, previousDay(today)].flatMap((date, dateIndex) => wings.map((wingCode, index) => {
    const id = `${campus.id}-${date}-${index}`
    const base = createReport(date, true, wingCode)
    const status = dateIndex ? 'Submitted' : index === 2 ? 'Missing' : campusIndex === 1 && index === 1 ? 'Draft' : 'Submitted'
    const entries = index === 0 ? [...base.entries, ...EXTRA_ENTRIES.map(([section, values]) => ({ id: `${id}-${section}`, section, values, attachments: [] }))] : base.entries.slice(0, 2)
    return {
      ...base, id, campus: campus.id, date, wingCode, wing: proformaWingLabel(wingCode), status,
      coordinator: ['Amina Shah', 'Sara Ahmed', 'Hina Malik'][index],
      acknowledged: dateIndex > 0 || (campusIndex === 2 && index === 0),
      approved: dateIndex > 0,
      submittedAt: status === 'Submitted' ? '14:35' : null,
      sections: index === 0 ? { faculty: 'None to report' } : { friday: 'Not applicable' },
      entries: status === 'Missing' ? [] : entries.map((entry, i) => ({ ...entry, id: `${id}-entry-${i}`, attachments: entry.section === 'notebooks' ? [{ id: `${id}-evidence`, name: 'Notebook recheck · sample evidence', kind: 'Sample document' }] : [] })),
      actions: status === 'Missing' ? [] : [{ id: `${id}-action`, section: 'notebooks', title: 'Recheck corrections and page numbering', owner: 'Ms. Amina (sample)', due: dateIndex ? date : previousDay(today), status: dateIndex ? 'Closed' : index === 0 ? 'Ready for verification' : 'Open', updates: [{ text: 'Teacher reports that corrections are complete. Awaiting verification.', at: '14:10', by: 'Coordinator (sample)' }] }],
      comments: [], history: status === 'Submitted' ? [{ text: 'Report submitted', at: `${date} 14:35`, by: 'Coordinator (sample)' }] : [],
    }
  })))
}

export const reportStatus = (report) => report.status === 'Submitted' ? report.approved ? 'Approved' : report.acknowledged ? 'Acknowledged' : 'Submitted' : report.status
export const hasConcern = (entry) => Boolean(entry.values.concern || Object.values(entry.values).some((value) => ['Needs attention', 'Partially completed', 'Not corrected', 'Not done'].includes(value)))

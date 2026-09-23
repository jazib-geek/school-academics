import { getCampusPrintMeta } from '../../../utils/campusProfile'
import {
  TT_FORMAT,
  buildSlotMaps,
  formatSplitCellLines,
  formatTimeRange,
  getClassCellSlots,
  getId,
  getText,
  printTitle,
  teacherDisplayName,
  teacherSlotKey,
  breakLabel,
  isBreakPeriod,
  sortPeriods,
} from './timetableHelpers'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const cellSubjectTeacher = (cellSlots) => {
  const slots = Array.isArray(cellSlots) ? cellSlots : cellSlots ? [cellSlots] : []
  if (slots.length === 0) return ''
  const { subjectLine, teacherLine } = formatSplitCellLines(slots)
  return `<div class="line">${escapeHtml(subjectLine)}</div><div class="sub">${escapeHtml(teacherLine)}</div>`
}

const cellClassSubject = (slot) => {
  if (!slot) return ''
  const className = getText(slot, 'className', 'ClassName')
  const subject =
    getText(slot, 'subjectShortName', 'SubjectShortName') ||
    getText(slot, 'subjectName', 'SubjectName')
  return `<div class="line">${escapeHtml(className)}</div><div class="sub">${escapeHtml(subject)}</div>`
}

const cellClassSubjectOrFree = (slot, showFree) => {
  if (slot) return cellClassSubject(slot)
  return showFree ? '<div class="free-cell">Free</div>' : ''
}

const breakCellHtml = (period, rowSpan) =>
  `<td class="break-col" rowspan="${rowSpan}"><span class="break-label">${escapeHtml(breakLabel(period))}</span></td>`

const sharedStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .print-head { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 10px; }
  .print-logo { height: 56px; width: auto; object-fit: contain; }
  .print-head-text { text-align: center; }
  .sheet-title { text-align: center; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: 0.02em; color: #111; }
  .sheet-sub { text-align: center; font-size: 12px; color: #333; margin: 2px 0 0; font-weight: 600; }
  table.tt { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.tt th, table.tt td {
    border: 1px solid #111;
    padding: 6px 4px;
    vertical-align: middle;
    text-align: center;
    font-size: 11px;
    background: #fff;
    color: #111;
  }
  table.tt thead th {
    background: #fff !important;
    color: #111 !important;
    font-weight: 800;
  }
  table.tt .stub {
    background: #fff !important;
    color: #111 !important;
    font-weight: 800;
    text-align: left;
    padding-left: 8px;
    width: 120px;
  }
  table.tt .stub-light {
    background: #fff !important;
    color: #111 !important;
    font-weight: 800;
    text-align: left;
    padding-left: 8px;
  }
  table.tt tbody tr:nth-child(even) td { background: #f3f3f3; }
  table.tt tbody tr:nth-child(odd) td { background: #fff; }
  .time { font-size: 10px; font-weight: 700; }
  .line { font-weight: 700; line-height: 1.2; color: #111; }
  .sub { font-size: 10px; margin-top: 2px; line-height: 1.15; font-weight: 600; color: #111; }
  .free-cell { font-weight: 700; color: #555; font-size: 11px; }
  .serial { width: 56px; font-weight: 800; }
  table.tt td.break-col, table.tt th.break-col {
    background: #d9d9d9 !important;
    padding: 8px 4px;
  }
  .break-label {
    display: inline-block;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  @media print {
    body { padding: 8px; }
    @page { size: landscape; margin: 10mm; }
    .print-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

function renderClassWise(detail) {
  const periods = sortPeriods(detail.periods || [])
  const classes = detail.classes || []
  const rowCount = classes.length || 1
  const { byClass } = buildSlotMaps(detail.slots || [])

  const periodHeaders = periods
    .map((p) => {
      const n = getId(p, 'periodNumber', 'PeriodNumber')
      const label = getText(p, 'label', 'Label') || `Period ${n}`
      return `<th>${escapeHtml(label)}</th>`
    })
    .join('')

  const timeHeaders = periods
    .map((p) => {
      const range = formatTimeRange(getText(p, 'startTime', 'StartTime'), getText(p, 'endTime', 'EndTime'))
      return `<th class="time">${escapeHtml(range)}</th>`
    })
    .join('')

  const rows = classes
    .map((cls, rowIndex) => {
      const sectionId = getId(cls, 'sectionID', 'SectionID')
      const name = getText(cls, 'className', 'ClassName')
      const cells = periods
        .map((p) => {
          if (isBreakPeriod(p)) {
            if (rowIndex > 0) return ''
            return breakCellHtml(p, rowCount)
          }
          const n = getId(p, 'periodNumber', 'PeriodNumber')
          const cellSlots = getClassCellSlots(byClass, sectionId, n, 0)
          return `<td>${cellSubjectTeacher(cellSlots)}</td>`
        })
        .join('')
      return `<tr><th class="stub-light">${escapeHtml(name)}</th>${cells}</tr>`
    })
    .join('')

  return `
    <table class="tt">
      <thead>
        <tr>
          <th class="stub">PERIODS →</th>
          ${periodHeaders}
        </tr>
        <tr>
          <th class="stub">CLASSES ↓</th>
          ${timeHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function renderTeacherWise(detail, { withFree, withSerial }) {
  const periods = sortPeriods(detail.periods || [])
  const teachers = detail.teachers || []
  const rowCount = teachers.length || 1
  const { byTeacher } = buildSlotMaps(detail.slots || [])

  const periodHeaders = periods
    .map((p) => {
      const n = getId(p, 'periodNumber', 'PeriodNumber')
      return `<th>${escapeHtml(getText(p, 'label', 'Label') || `Period ${n}`)}</th>`
    })
    .join('')

  const head = `
    <tr>
      ${withSerial ? '<th class="serial">SERIAL NO.</th>' : ''}
      <th class="stub" style="width:140px">TEACHER NAME</th>
      ${periodHeaders}
    </tr>
  `

  const rows = teachers
    .map((teacher, index) => {
      const employeeId = getId(teacher, 'employeeID', 'EmployeeID')
      const name = getText(teacher, 'employeeName', 'EmployeeName')
      const cells = periods
        .map((p) => {
          if (isBreakPeriod(p)) {
            if (index > 0) return ''
            return breakCellHtml(p, rowCount)
          }
          const n = getId(p, 'periodNumber', 'PeriodNumber')
          const slot = byTeacher.get(teacherSlotKey(employeeId, n, 0))
          return `<td>${cellClassSubjectOrFree(slot, withFree)}</td>`
        })
        .join('')

      return `<tr>
        ${withSerial ? `<td class="serial">${index + 1}</td>` : ''}
        <th class="stub-light">${escapeHtml(name)}</th>
        ${cells}
      </tr>`
    })
    .join('')

  return `<table class="tt"><thead>${head}</thead><tbody>${rows}</tbody></table>`
}

export function openTimetablePrint(detail, { campusLabel = '' } = {}) {
  const formatType = getId(detail, 'formatType', 'FormatType')
  const title = printTitle(detail)
  const printMeta = getCampusPrintMeta()
  const logoSrc = printMeta.logoSrc || ''
  const schoolName = printMeta.schoolName || ''

  const tableHtml =
    formatType === TT_FORMAT.CLASS_WISE
      ? renderClassWise(detail)
      : formatType === TT_FORMAT.TEACHER_WISE_FREE
        ? renderTeacherWise(detail, { withFree: true, withSerial: false })
        : renderTeacherWise(detail, { withFree: false, withSerial: true })

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) return false

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="print-head">
    ${logoSrc ? `<img class="print-logo" src="${escapeHtml(logoSrc)}" alt="" />` : ''}
    <div class="print-head-text">
      <h1 class="sheet-title">${escapeHtml(title)}</h1>
      <p class="sheet-sub">${escapeHtml(schoolName)}${campusLabel ? ` · ${escapeHtml(campusLabel)}` : ''}</p>
    </div>
  </div>
  ${tableHtml}
</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 250)
  return true
}

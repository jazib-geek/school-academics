import { getCampusPrintMeta } from '../../../utils/campusProfile'
import {
  buildDisplayColumns,
  buildEntryMap,
  entryKey,
  formatExamDate,
  getText,
  isHolidayEntry,
  isRegularEntry,
  printTitle,
  resolveCellLabel,
} from './dateSheetHelpers'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const sharedStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .print-head { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 10px; }
  .print-logo { height: 56px; width: auto; object-fit: contain; }
  .print-head-text { text-align: center; }
  .sheet-title { text-align: center; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: 0.02em; color: #111; }
  .sheet-sub { text-align: center; font-size: 13px; color: #333; margin: 4px 0 0; font-weight: 700; text-transform: uppercase; }
  table.ds { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.ds th, table.ds td {
    border: 1px solid #111;
    padding: 6px 4px;
    vertical-align: middle;
    text-align: center;
    font-size: 11px;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #111;
    font-weight: 400;
  }
  table.ds thead th {
    background: #111 !important;
    color: #fff !important;
    font-weight: 800;
    font-family: Arial, Helvetica, sans-serif;
  }
  table.ds thead th.stub,
  table.ds thead th.stub-day {
    background: #111 !important;
    color: #fff !important;
    font-weight: 800;
  }
  table.ds tbody td.stub {
    background: #fff !important;
    color: #111 !important;
    font-weight: 400;
    width: 92px;
  }
  table.ds tbody td.stub-day {
    background: #fff !important;
    color: #111 !important;
    font-weight: 400;
    width: 88px;
  }
  .holiday-cell {
    background: #e91e8c !important;
    color: #fff !important;
    font-weight: 400;
  }
  .regular-cell {
    background: #2ecc71 !important;
    color: #111 !important;
    font-weight: 400;
  }
  @media print {
    body { padding: 8px; }
    @page { size: landscape; margin: 8mm; }
    .print-logo, .holiday-cell, .regular-cell, table.ds thead th {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`

function renderTable(detail) {
  const days = detail.days || detail.Days || []
  const classes = detail.classes || detail.Classes || []
  const entries = detail.entries || detail.Entries || []
  const columns = buildDisplayColumns(classes)
  const map = buildEntryMap(entries)

  const headCells = columns
    .map((col) => `<th>${escapeHtml(col.label)}</th>`)
    .join('')

  const bodyRows = days
    .map((day) => {
      const examDate = getText(day, 'examDate', 'ExamDate')
      const dayName = getText(day, 'dayName', 'DayName')
      const cells = columns
        .map((col) => {
          const classId = col.classIds[0]
          const entry = map.get(entryKey(classId, examDate))
          const label = resolveCellLabel(entry)
          if (isHolidayEntry(entry)) {
            return `<td class="holiday-cell">${escapeHtml(label || '--Holiday--')}</td>`
          }
          if (isRegularEntry(entry)) {
            return `<td class="regular-cell">${escapeHtml(label || '--Regular Class--')}</td>`
          }
          return `<td>${escapeHtml(label)}</td>`
        })
        .join('')

      return `<tr>
        <td class="stub">${escapeHtml(formatExamDate(examDate))}</td>
        <td class="stub-day">${escapeHtml(dayName)}</td>
        ${cells}
      </tr>`
    })
    .join('')

  return `<table class="ds">
    <thead>
      <tr>
        <th class="stub">Date</th>
        <th class="stub-day">Day</th>
        ${headCells}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`
}

/**
 * Opens a print popup for a datesheet detail/print DTO.
 * @returns {boolean} false if pop-up blocked
 */
export function openDateSheetPrint(detail, { campusLabel = '' } = {}) {
  if (!detail) return false
  const title = printTitle(detail)
  const subtitle = getText(detail, 'subtitle', 'Subtitle')
  const printMeta = getCampusPrintMeta()
  const logoSrc = printMeta.logoSrc || ''
  const schoolName = printMeta.schoolName || ''

  // Do not use noopener — browsers return null for the window handle, which breaks printing.
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
      <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${escapeHtml(schoolName)}${campusLabel ? ` — ${escapeHtml(campusLabel)}` : ''}</div>
      <h1 class="sheet-title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="sheet-sub">(${escapeHtml(subtitle)})</p>` : ''}
    </div>
  </div>
  ${renderTable(detail)}
</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 250)
  return true
}

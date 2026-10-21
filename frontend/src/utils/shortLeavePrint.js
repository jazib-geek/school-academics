import { getCampusPrintMeta } from './campusProfile'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatDate = (value) => {
  const raw = String(value || '').slice(0, 10)
  const [year, month, day] = raw.split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return raw || '—'
}

const formatTime = (value) => {
  const raw = String(value || '')
  const match = raw.match(/(\d{2}):(\d{2})/)
  if (!match) return raw || '—'
  const hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${suffix}`
}

const fieldRow = (label, value) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>`

const renderSlip = (pass, meta, copyLabel) => {
  const students = Array.isArray(pass.students) ? pass.students : []
  const rows = students
    .flatMap((student) => [
      fieldRow('Reg no.', student.studentId),
      fieldRow('Student', student.studentName),
      fieldRow('Class', student.className),
    ])
    .join('')

  const phoneLine = pass.phoneConfirmationRequired
    ? `<p><strong>Phone confirmation:</strong> Approved by ${escapeHtml(pass.phoneConfirmedWith || 'home')}</p>`
    : ''

  return `
  <div class="slip">
    <h1>${escapeHtml(meta.schoolName || 'School')}</h1>
    <p class="sub">${escapeHtml(meta.addressDisplay || meta.campusLabel || '')}</p>
    <p class="title">Short Leave</p>
    <p class="copy">${escapeHtml(copyLabel)}</p>
    <div class="meta">
      <span>Pass ${escapeHtml(pass.id)}</span>
      <span>${escapeHtml(formatDate(pass.leaveDate))} · ${escapeHtml(formatTime(pass.pickupTime))}</span>
    </div>
    <table class="fields">
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Collected by:</strong> ${escapeHtml(pass.pickupPersonName)} (${escapeHtml(pass.pickupRelation)})</p>
    <p><strong>Reason:</strong> ${escapeHtml(pass.reason)}</p>
    ${phoneLine}
    <p><strong>Allowed by:</strong> ${escapeHtml(pass.approvedByUserName)}</p>
    <div class="signs">
      <div class="sign"><div class="line">Person collecting</div></div>
      <div class="sign"><div class="line">Office</div></div>
    </div>
  </div>`
}

export const printShortLeavePass = (pass) => {
  if (!pass) return
  const meta = getCampusPrintMeta()

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Short Leave ${escapeHtml(pass.id)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
    .sheet { display: flex; width: 100%; align-items: stretch; gap: 4mm; }
    .slip {
      flex: 1 1 0;
      width: 50%;
      border: 1px solid #000;
      padding: 5mm 4mm 5mm;
    }
    h1 { margin: 0; font-size: 14px; text-align: center; }
    .sub { margin: 2px 0 0; text-align: center; font-size: 10px; }
    .title { margin: 6px 0 0; text-align: center; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
    .copy { margin: 2px 0 0; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .meta { margin-top: 6px; display: flex; justify-content: space-between; gap: 6px; font-size: 11px; }
    table.fields { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; table-layout: fixed; }
    table.fields th, table.fields td {
      border: 1px solid #000;
      padding: 3px 5px;
      text-align: left;
      vertical-align: middle;
      height: 18px;
    }
    table.fields th { width: 28mm; background: #d9d9d9; font-weight: bold; }
    p { margin: 6px 0 0; font-size: 11px; }
    .signs { margin-top: 14px; display: flex; justify-content: space-between; gap: 10px; font-size: 11px; }
    .sign { width: 46%; }
    .line { margin-top: 22px; border-top: 1px solid #000; padding-top: 3px; }
  </style>
</head>
<body>
  <div class="sheet">
    ${renderSlip(pass, meta, 'Office copy')}
    ${renderSlip(pass, meta, 'Student copy')}
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=800,height=700')
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

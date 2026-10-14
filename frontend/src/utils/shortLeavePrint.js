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

export const printShortLeavePass = (pass) => {
  if (!pass) return
  const meta = getCampusPrintMeta()
  const students = Array.isArray(pass.students) ? pass.students : []
  const studentRows = students
    .map(
      (student) => `
        <tr>
          <td>${escapeHtml(student.studentId)}</td>
          <td>${escapeHtml(student.studentName)}</td>
          <td>${escapeHtml(student.className)}</td>
        </tr>`,
    )
    .join('')

  const phoneLine = pass.phoneConfirmationRequired
    ? `<p><strong>Phone confirmation:</strong> Approved by ${escapeHtml(pass.phoneConfirmedWith || 'home')}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Short Leave ${escapeHtml(pass.id)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
    .slip {
      width: 100%;
      height: 148mm;
      border: 1px solid #000;
      padding: 7mm 8mm;
      overflow: hidden;
    }
    h1 { margin: 0; font-size: 16px; text-align: center; }
    .sub { margin: 2px 0 0; text-align: center; font-size: 11px; }
    .title { margin: 8px 0 0; text-align: center; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
    .meta { margin-top: 8px; display: flex; justify-content: space-between; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
    th { background: #d9d9d9; }
    p { margin: 6px 0 0; font-size: 12px; }
    .signs { margin-top: 14px; display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
    .sign { width: 42%; }
    .line { margin-top: 22px; border-top: 1px solid #000; padding-top: 3px; }
  </style>
</head>
<body>
  <div class="slip">
    <h1>${escapeHtml(meta.schoolName || 'School')}</h1>
    <p class="sub">${escapeHtml(meta.addressDisplay || meta.campusLabel || '')}</p>
    <p class="title">Short Leave</p>
    <div class="meta">
      <span>Pass ${escapeHtml(pass.id)}</span>
      <span>${escapeHtml(formatDate(pass.leaveDate))} · ${escapeHtml(formatTime(pass.pickupTime))}</span>
    </div>
    <table>
      <thead>
        <tr><th>Reg no.</th><th>Student</th><th>Class</th></tr>
      </thead>
      <tbody>${studentRows}</tbody>
    </table>
    <p><strong>Collected by:</strong> ${escapeHtml(pass.pickupPersonName)} (${escapeHtml(pass.pickupRelation)})</p>
    <p><strong>Reason:</strong> ${escapeHtml(pass.reason)}</p>
    ${phoneLine}
    <p><strong>Allowed by:</strong> ${escapeHtml(pass.approvedByUserName)}</p>
    <div class="signs">
      <div class="sign"><div class="line">Person collecting</div></div>
      <div class="sign"><div class="line">Office</div></div>
    </div>
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

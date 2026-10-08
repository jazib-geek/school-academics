import { getCampusPrintMeta } from './campusProfile.js'
import { formatReportPrintDate, formatReportPrintMoney } from './campusReportPrint.js'
import { getSecurityDepositProfileInfo } from './studentSecurityDepositDisplay.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function securityDepositEventLabel(type) {
  if (type === 'deposit') return 'Payment received'
  if (type === 'refund') return 'Refund issued'
  if (type === 'deposit_reversal') return 'Adjustment'
  return 'Entry'
}

function normalizeEvents(summary) {
  const rows = Array.isArray(summary?.events) ? [...summary.events] : []
  return rows.sort((a, b) => {
    const da = new Date(a.eventDate || 0).getTime()
    const db = new Date(b.eventDate || 0).getTime()
    if (da !== db) return da - db
    return (a.id || 0) - (b.id || 0)
  })
}

export function printSecurityDepositLog({ student, summary }) {
  if (!student || !summary) return

  const meta = getCampusPrintMeta()
  const studentId = student.reg_Id ?? student.Reg_Id
  const studentName = student.fullName ?? student.FullName ?? `Student ${studentId}`
  const className = student.className ?? student.ClassName ?? '—'
  const info = getSecurityDepositProfileInfo(summary, {
    securityDeposit: summary.chargeAmount,
  })
  const events = normalizeEvents(summary)
  const preparedBy = localStorage.getItem('username') || 'Staff'
  const printedOn = formatReportPrintDate(new Date(), 'long')

  const tableRows = events.length
    ? events
        .map(
          (row, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(formatReportPrintDate(row.eventDate))}</td>
        <td>${escapeHtml(securityDepositEventLabel(row.eventType))}</td>
        <td class="num">${escapeHtml(formatReportPrintMoney(row.amount))}</td>
        <td class="center">${escapeHtml(row.sessionYear ?? '—')}</td>
        <td class="center">${escapeHtml(row.receiptId ?? '—')}</td>
        <td class="center">${escapeHtml(row.voucherNo ?? '—')}</td>
        <td>${escapeHtml(row.entryUser ?? '—')}</td>
        <td>${escapeHtml(row.notes ?? '—')}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="9" class="center">No entries on record.</td></tr>`

  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Security Deposit — ${escapeHtml(studentName)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 12px 14px 18px;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 12px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .school-name {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .meta { margin: 2px 0 0; font-size: 11px; color: #333; }
          .doc-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            text-align: right;
            text-transform: uppercase;
          }
          .student-box {
            margin-bottom: 10px;
            padding: 8px 10px;
            border: 1px solid #000;
          }
          .student-box strong { font-size: 13px; }
          .summary {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .summary th, .summary td {
            border: 1px solid #000;
            padding: 5px 6px;
            text-align: center;
            font-weight: 700;
          }
          .summary th { background: #d9d9d9; }
          table.log {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          table.log th, table.log td {
            border: 1px solid #000;
            padding: 4px 5px;
            vertical-align: top;
          }
          table.log th {
            background: #d9d9d9;
            text-align: center;
            font-weight: 700;
          }
          .num { text-align: right; }
          .center { text-align: center; }
          .footer {
            margin-top: 14px;
            padding-top: 8px;
            border-top: 1px solid #999;
            font-size: 11px;
            color: #333;
          }
          .sign {
            margin-top: 28px;
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }
          .sign div {
            flex: 1;
            border-top: 1px solid #000;
            padding-top: 4px;
            font-size: 11px;
          }
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="school-name">${escapeHtml(meta.schoolName)}</h1>
            <p class="meta">${escapeHtml(meta.campusLabel || '')}</p>
            <p class="meta">Tel: ${escapeHtml(meta.phonesDisplay || '')}</p>
          </div>
          <h2 class="doc-title">Security deposit record</h2>
        </div>

        <div class="student-box">
          <strong>${escapeHtml(studentName)}</strong>
          &nbsp;·&nbsp; Reg #${escapeHtml(studentId)}
          &nbsp;·&nbsp; Class: ${escapeHtml(className)}
        </div>

        <table class="summary">
          <thead>
            <tr>
              <th>Status</th>
              <th>Held (Rs)</th>
              <th>Refunded (Rs)</th>
              <th>Net received (Rs)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(info.statusLabel)}</td>
              <td>${escapeHtml(formatReportPrintMoney(summary.heldAmount ?? summary.HeldAmount ?? 0))}</td>
              <td>${escapeHtml(formatReportPrintMoney(summary.totalRefunded ?? summary.TotalRefunded ?? 0))}</td>
              <td>${escapeHtml(formatReportPrintMoney(summary.netDeposited ?? summary.NetDeposited ?? 0))}</td>
            </tr>
          </tbody>
        </table>

        <p style="margin:0 0 6px;font-weight:700;text-transform:uppercase;font-size:11px;">Transaction log</p>
        <table class="log">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Type</th>
              <th>Amount (Rs)</th>
              <th>Session</th>
              <th>Receipt</th>
              <th>Voucher</th>
              <th>Recorded by</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <div class="sign">
          <div>Parent / guardian signature</div>
          <div>Office signature &amp; stamp</div>
        </div>

        <div class="footer">
          Printed on ${escapeHtml(printedOn)} · Prepared by ${escapeHtml(preparedBy)}
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => { window.focus(); window.print(); }, 200);
          });
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

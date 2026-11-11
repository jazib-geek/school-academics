function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function applyNoticeTokens(html, row) {
  const percent =
    row.percent == null || row.percent === ''
      ? ''
      : Number(row.percent).toLocaleString(undefined, { maximumFractionDigits: 1 })
  const map = {
    studentName: row.studentName || '',
    class: row.className || '',
    regNo: row.studentId == null ? '' : String(row.studentId),
    tuitionBalance: money(row.tuitionBalance),
    fundsBalance: money(row.fundsBalance),
    overallBalance: money(row.overallBalance),
    absentDays: row.absentDays == null ? '' : String(row.absentDays),
    examName: row.examName || '',
    percent,
  }
  return String(html || '').replace(/\{(\w+)\}/g, (full, key) =>
    Object.prototype.hasOwnProperty.call(map, key) ? escapeHtml(map[key]) : full,
  )
}

function sanitizeNoticeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}

export const CUSTOM_NOTICE_STYLES = `
  .custom-notice-page {
    width: 100%;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    gap: 8mm;
  }
  .custom-notice-page:last-child {
    page-break-after: auto;
  }
  .custom-notice-slip {
    border: 1px solid #000;
    padding: 16px 22px;
    page-break-inside: avoid;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }
  .custom-notice-slip p {
    margin: 0 0 8px;
  }
  .custom-notice-slip p:last-child {
    margin-bottom: 0;
  }
  .custom-notice-slip ul {
    list-style: disc;
    margin: 0 0 8px;
    padding-left: 1.25rem;
  }
  .custom-notice-slip ol {
    list-style: decimal;
    margin: 0 0 8px;
    padding-left: 1.25rem;
  }
`

export function buildCustomNoticeVoucherHtml(notice) {
  const body = sanitizeNoticeHtml(applyNoticeTokens(notice.bodyText, notice))
  return `<div class="custom-notice-slip">${body}</div>`
}

const PRINT_WINDOW_CSS = `
  ${CUSTOM_NOTICE_STYLES}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    color: #000;
    background: #fff;
  }
  @page {
    size: auto;
    margin: 8mm;
  }
`

export function printCustomNotices(notices, noticesPerPage = 3) {
  const rows = Array.isArray(notices) ? notices : []
  if (!rows.length) return

  const perPage = Math.min(3, Math.max(1, Number(noticesPerPage) || 3))
  const vouchers = rows.map((notice) => buildCustomNoticeVoucherHtml(notice))
  const pages = []
  for (let i = 0; i < vouchers.length; i += perPage) {
    const slice = vouchers.slice(i, i + perPage)
    pages.push(`<div class="custom-notice-page">${slice.join('')}</div>`)
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Custom Notices</title>
        <style>${PRINT_WINDOW_CSS}</style>
      </head>
      <body>${pages.join('')}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

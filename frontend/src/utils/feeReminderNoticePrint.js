const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatNoticeDueDate(dayOfMonth, monthIndex, year) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1))
  const month = MONTH_NAMES[Math.min(11, Math.max(0, Number(monthIndex) || 0))] || 'January'
  const y = Number(year) || new Date().getFullYear()
  return `${day}-${month}-${y}`
}

export function formatIssuanceDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function formatNoticeAmount(value) {
  const n = Math.round(Number(value) || 0)
  return `=${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}/-`
}

function isHtmlContent(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ''))
}

export function renderBodyHtml(bodyText, dueDateLabel, isPreDue) {
  const raw = String(bodyText || '')
  const dueHtml =
    isPreDue && dueDateLabel
      ? `<span class="fee-reminder-voucher__due-date"><strong><u>${escapeHtml(dueDateLabel)}</u></strong></span>`
      : ''

  if (isHtmlContent(raw)) {
    return dueHtml ? raw.replace(/\{dueDate\}/g, dueHtml) : raw
  }

  const escaped = escapeHtml(raw)
  if (!dueHtml) return escaped
  return escaped.replace(/\{dueDate\}/g, dueHtml)
}

/** Plain-text length check for required body (HTML from rich editor). */
export function richBodyPlainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildVoucherHtml(notice) {
  const {
    title,
    greeting,
    bodyHtml,
    closing,
    regNo,
    studentName,
    className,
    amount,
    issuanceDate,
  } = notice

  return `
    <div class="fee-reminder-voucher">
      <div class="fee-reminder-voucher__title">${escapeHtml(title)}</div>
      <div class="fee-reminder-voucher__body">
        <div class="fee-reminder-voucher__left">
          <div class="fee-reminder-voucher__fields">
            <div class="fee-reminder-voucher__field">
              <span class="label">Reg No.</span>
              <span class="value-line value-line--short">${escapeHtml(regNo)}</span>
            </div>
            <div class="fee-reminder-voucher__field fee-reminder-voucher__field--student-name">
              <span class="label">Student Name:</span>
              <span class="value-line value-line--long value-line--name">${escapeHtml(studentName)}</span>
            </div>
            <div class="fee-reminder-voucher__field">
              <span class="label">Class/Sec:</span>
              <span class="value-line value-line--long">${escapeHtml(className)}</span>
            </div>
            <div class="fee-reminder-voucher__amount-row">
              <span class="label">Total Amount Due:</span>
              <span class="amount-box">${escapeHtml(formatNoticeAmount(amount))}</span>
            </div>
          </div>
          <div class="fee-reminder-voucher__footer">
            <span class="label fee-reminder-voucher__footer-ruler" aria-hidden="true">Student Name:</span>
            <div class="fee-reminder-voucher__footer-align">
              <div class="fee-reminder-voucher__sign">Administration</div>
              <div class="fee-reminder-voucher__date">Date: ${escapeHtml(issuanceDate)}</div>
            </div>
          </div>
        </div>
        <div class="fee-reminder-voucher__right">
          <div class="fee-reminder-voucher__message">
            <p class="greeting">${escapeHtml(greeting)}</p>
            <p class="message">${bodyHtml}</p>
            <p class="closing">${escapeHtml(closing)}</p>
          </div>
        </div>
      </div>
    </div>
  `
}

/** Shared voucher layout (preview + print window). */
export const FEE_REMINDER_VOUCHER_STYLES = `
  * {
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif !important;
  }
  .fee-reminder-page {
    width: 100%;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    gap: 22mm;
    padding: 4mm 0 0;
  }
  .fee-reminder-page--2 {
    gap: 31mm;
  }
  .fee-reminder-page--3 {
    gap: 1.1in;
  }
  .fee-reminder-page:last-child {
    page-break-after: auto;
  }
  .fee-reminder-voucher {
    border: 1px solid #000;
    padding: 18px 32px 18px;
    page-break-inside: avoid;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 13px;
    color: #000;
    background: #fff;
  }
  .fee-reminder-voucher__title {
    text-align: center;
    font-weight: 700;
    font-size: 20px !important;
    text-decoration: underline;
    margin: 2px 0 28px;
    line-height: 1.2;
    padding: 0 8px;
  }
  .fee-reminder-voucher__body {
    display: flex;
    gap: 16px;
    align-items: stretch;
    min-height: 0;
    padding: 0 10px 6px 2px;
  }
  .fee-reminder-voucher__left {
    flex: 0 0 50%;
    max-width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    font-size: 14px;
    line-height: 1.35;
    padding: 2px 0 0 2px;
  }
  .fee-reminder-voucher__fields {
    flex: 0 0 auto;
    padding-top: 2px;
  }
  .fee-reminder-voucher__field {
    margin-bottom: 14px;
    white-space: nowrap;
  }
  .fee-reminder-voucher__field .label {
    font-weight: 700;
  }
  .value-line {
    display: inline-block;
    border-bottom: 1px solid #000;
    vertical-align: bottom;
    padding: 0 2px 1px;
    margin-left: 4px;
    font-weight: 400;
    white-space: normal;
    word-break: break-word;
  }
  .value-line--short {
    min-width: 72px;
  }
  .value-line--long {
    min-width: 155px;
    max-width: calc(100% - 8px);
  }
  .value-line--name {
    width: 155px;
    min-width: 155px;
    max-width: 155px;
    font-weight: 700;
  }
  .fee-reminder-voucher__amount-row {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .fee-reminder-voucher__amount-row .label {
    font-weight: 700;
  }
  .amount-box {
    border: 1px solid #000;
    padding: 3px 12px;
    font-weight: 700;
    font-size: 16px;
    line-height: 1.3;
    text-align: center;
    display: inline-block;
  }
  .fee-reminder-voucher__footer {
    margin-top: auto;
    padding-top: 10px;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    width: 100%;
  }
  .fee-reminder-voucher__footer-ruler {
    visibility: hidden;
    flex: 0 0 auto;
  }
  .fee-reminder-voucher__footer-align {
    margin-left: 4px;
    width: 155px;
    min-width: 155px;
    max-width: 155px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .fee-reminder-voucher__sign {
    font-weight: 700;
    margin-bottom: 4px;
  }
  .fee-reminder-voucher__date {
    font-size: 14px;
    text-align: right;
  }
  .fee-reminder-voucher__right {
    flex: 0 0 calc(50% - 12px);
    max-width: calc(50% - 12px);
    margin-right: 12px;
    align-self: stretch;
    border: 1px solid #000;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    box-sizing: border-box;
  }
  .fee-reminder-voucher__message {
    width: 100%;
    text-align: center;
    font-size: 17px !important;
    line-height: 1.5;
    padding: 4px 10px;
  }
  .fee-reminder-voucher__message p,
  .fee-reminder-voucher__message .message,
  .fee-reminder-voucher__message .message p {
    font-size: 17px !important;
  }
  .fee-reminder-voucher__message p {
    margin: 0 0 8px;
  }
  .fee-reminder-voucher__message p:last-child {
    margin-bottom: 0;
  }
  .fee-reminder-voucher__message .message {
    margin-bottom: 10px;
  }
  .fee-reminder-voucher__message .message p {
    margin: 0 0 6px;
  }
  .fee-reminder-voucher__message .message p:last-child {
    margin-bottom: 0;
  }
  .fee-reminder-voucher__message strong {
    font-weight: 700;
  }
  .fee-reminder-voucher__due-date {
    white-space: nowrap;
  }
`

const PRINT_WINDOW_CSS = `
  ${FEE_REMINDER_VOUCHER_STYLES}
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 13px;
    color: #000;
    background: #fff;
  }
  @page {
    size: auto;
    margin: 8mm;
  }
  @media print {
    * {
      font-family: Arial, Helvetica, sans-serif !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .fee-reminder-page--3 {
      gap: 1.1in;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .fee-reminder-page--3 .fee-reminder-voucher {
      padding: 18px 32px 18px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__title {
      margin-bottom: 16px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__field {
      margin-bottom: 8px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__amount-row {
      margin-top: 10px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__footer {
      margin-top: auto;
      padding-top: 8px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__right {
      padding: 10px 16px;
    }
    .fee-reminder-page--3 .fee-reminder-voucher__body {
      padding-bottom: 4px;
    }
  }
`

export function buildFeeReminderVoucherHtml(notice) {
  const isPreDue = notice.code === 'pre_due'
  const bodyHtml = renderBodyHtml(notice.bodyText, notice.dueDateLabel, isPreDue)
  return buildVoucherHtml({
    title: notice.title,
    greeting: notice.greeting,
    bodyHtml,
    closing: notice.closingText,
    regNo: notice.studentId,
    studentName: notice.studentName,
    className: notice.className,
    amount: notice.amount,
    issuanceDate: notice.issuanceDate,
  })
}

export function printFeeReminderNotices(notices, noticesPerPage = 3) {
  const rows = Array.isArray(notices) ? notices : []
  if (!rows.length) return

  const perPage = Math.min(3, Math.max(1, Number(noticesPerPage) || 3))
  const vouchers = rows.map((n) => buildFeeReminderVoucherHtml(n))
  const pages = []
  for (let i = 0; i < vouchers.length; i += perPage) {
    const slice = vouchers.slice(i, i + perPage)
    pages.push(
      `<div class="fee-reminder-page fee-reminder-page--${perPage}">${slice.join('')}</div>`,
    )
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Fee Reminder Notices</title>
        <style>${PRINT_WINDOW_CSS}</style>
      </head>
      <body>${pages.join('')}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export { MONTH_NAMES }

import { getCampusPrintMeta } from './campusProfile'

const formatPakistanDateDisplay = (value) => {
  if (!value) return '-'
  const raw = String(value)
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}/${month}/${year}`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const formatReceiptAmount = (value) => {
  const num = Number(value || 0)
  if (Number.isNaN(num)) return '0'
  return String(Math.round(num))
}

const formatReceiptDate = (value) => {
  if (!value) return ''
  const formatted = formatPakistanDateDisplay(value)
  return formatted === '-' ? '' : formatted
}

const buildReceiptCopyHtml = (receipt, {
  includeTime,
  signatureLabel,
  schoolName,
  campusLabel,
  phone,
  addressDisplay,
  receiptFooterNote,
  logoUrl,
  watermark,
  isVoided = false,
  singleColumn = false,
}) => {
  const lines = receipt.lines || []
  const dateText = formatReceiptDate(receipt.date)
  const dateTimeText = includeTime && receipt.time
    ? `${dateText}&nbsp;&nbsp;${escapeHtml(receipt.time)}`
    : escapeHtml(dateText)

  const rows = lines.map((line, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(line.description)}</td>
      <td>${formatReceiptAmount(line.actualAmount)}</td>
      <td>${formatReceiptAmount(line.concession ?? line.previousReceived)}</td>
      <td>${formatReceiptAmount(line.amount)}</td>
    </tr>
  `).join('')

  const addressHtml = addressDisplay
    ? `<h6>${escapeHtml(addressDisplay)}</h6>`
    : ''
  const footerHtml = !isVoided && receiptFooterNote
    ? `<li>${escapeHtml(receiptFooterNote)}</li>`
    : ''
  const watermarkHtml = watermark
    ? `<div class="receipt-watermark" aria-hidden="true">${escapeHtml(watermark)}</div>`
    : ''
  const noteBlock = isVoided
    ? `
      <div class="divInfo-bottom note-block">
        <b>Note :</b>
        <br />
        <p class="void-note">This receipt is void and is not valid anymore.</p>
      </div>
    `
    : `
      <div class="divInfo-bottom note-block">
        <b>Note :</b>
        <br />
        <ul>
          <li class="note-fine">After 10th of every month Fee will be received with Fine.</li>
          <li>Any kind of dues paid once are neither refundable nor adjustable in any case.</li>
          ${footerHtml}
        </ul>
      </div>
    `

  return `
    <div class="receipt-half${singleColumn ? ' receipt-half--single' : ''}">
      ${watermarkHtml}
      <div class="receipt-header">
        <div class="receipt-logo">
          <img src="${escapeHtml(logoUrl)}" alt="" />
        </div>
        <div class="receipt-school text-center">
          <h5>${escapeHtml(schoolName)}</h5>
          <h6>${escapeHtml(campusLabel)}</h6>
          ${addressHtml}
          <h6>${escapeHtml(phone)}</h6>
        </div>
      </div>

      <div class="divInfo">
        <div class="master-block-upper">
          <div class="child-block-upper-left">Date &amp; Time :</div>
          <div class="child-block-upper-right">${dateTimeText}</div>
        </div>
        <div class="master-block-upper">
          <div class="child-block-upper-left">Student Name :</div>
          <div class="child-block-upper-right">${escapeHtml(receipt.studentName)}</div>
        </div>
        <div class="master-block-upper">
          <div class="child-block-upper-left">Class-Section :</div>
          <div class="child-block-upper-right">${escapeHtml(receipt.className)}</div>
        </div>
        <div class="receipt-block-upper">
          <div class="rcpt-col">Recipt no : ${escapeHtml(receipt.receiptId)}${receipt.manualRcptNo ? ` <small>/${escapeHtml(receipt.manualRcptNo)}</small>` : ''}</div>
          <div class="family-col">F No. ${escapeHtml(receipt.familyCode ?? '')}</div>
          <div class="acc-col">Acc/no. ${escapeHtml(receipt.studentId)}</div>
        </div>

        <table class="table-bordered">
          <thead>
            <tr>
              <th>Sr.</th>
              <th style="width:40%">Description</th>
              <th>Actual Amount</th>
              <th>Concession</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="spacer-row">
              <td></td><td></td><td></td><td></td>
              <td style="height:55px"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-center">Total Amount Received</td>
              <td>${formatReceiptAmount(receipt.totalReceived)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="remaining-row">
        <div class="remaining-label">&nbsp;&nbsp;&nbsp;Total Amount Remaining</div>
        <div class="remaining-value">${formatReceiptAmount(receipt.totalRemaining)}</div>
      </div>

      <div class="divInfo-bottom signature-row">
        <div class="sig-left"><small>${signatureLabel}</small></div>
        <div class="sig-right">_____________________</div>
      </div>

      <div class="divInfo-bottom received-row">
        <div class="received-spacer"></div>
        <div class="received-by"><small>Received By : ${escapeHtml(receipt.receivedBy)}</small></div>
      </div>

      <br /><br />

      ${noteBlock}
    </div>
  `
}

const buildDualReceiptHtml = (receipt, branding, logoUrl, watermark) => `
  <div class="invoice-row">
    ${buildReceiptCopyHtml(receipt, {
      includeTime: true,
      signatureLabel: 'Signature (Office copy)',
      ...branding,
      logoUrl,
      watermark,
    })}
    ${buildReceiptCopyHtml(receipt, {
      includeTime: false,
      signatureLabel: 'Signature <br /> (Student copy)',
      ...branding,
      logoUrl,
      watermark,
    })}
  </div>
`

export function printFeeReceipts(receipts, options = {}) {
  const rows = Array.isArray(receipts) ? receipts : [receipts]
  if (!rows.length) return

  const watermark = options.watermark ? String(options.watermark) : ''

  const meta = getCampusPrintMeta()
  const branding = {
    schoolName: meta.schoolName,
    campusLabel: meta.campusLabel,
    phone: meta.phonesDisplay,
    addressDisplay: meta.addressDisplay,
    receiptFooterNote: meta.receiptFooterNote,
  }
  const logoUrl = meta.logoSrc
  const perPage = 2
  const invoiceRows = rows.map((receipt) => buildDualReceiptHtml(receipt, branding, logoUrl, watermark))
  const pages = Array.from({ length: Math.ceil(invoiceRows.length / perPage) }, (_, index) => {
    const slice = invoiceRows.slice(index * perPage, index * perPage + perPage)
    const packedClass = slice.length > 1 ? ' receipt-page--packed' : ''
    return `
      <div class="receipt-page${packedClass}">
        ${slice.join('')}
      </div>
    `
  }).join('')

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${watermark ? `${escapeHtml(watermark)} Fee Receipt` : 'Fee Receipt'}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
            color: #000;
            background: #fff !important;
          }
          .text-center { text-align: center; }
          .receipt-page {
            width: 100%;
            min-height: 100vh;
            padding: 12px;
            page-break-after: always;
            overflow: hidden;
          }
          .receipt-page:last-child { page-break-after: auto; }
          .invoice-row {
            display: flex;
            width: 100%;
            align-items: stretch;
          }
          .receipt-page--packed .invoice-row {
            min-height: 0;
            transform-origin: top center;
          }
          .receipt-page--packed .invoice-row + .invoice-row {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #999;
          }
          .receipt-half {
            position: relative;
            width: 50%;
            padding: 0 15px 0 10px;
            overflow: hidden;
          }
          .receipt-half:first-child {
            border-right: 2px dashed #000;
          }
          .receipt-watermark {
            position: absolute;
            inset: 18% 8% 22% 8%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 5;
            font-size: 72px;
            font-weight: 800;
            letter-spacing: 0.12em;
            color: rgba(220, 38, 38, 0.28);
            transform: rotate(-28deg);
            text-transform: uppercase;
            user-select: none;
          }
          .receipt-header {
            display: flex;
            align-items: flex-start;
            margin-left: 0;
            padding-left: 10px;
          }
          .receipt-logo {
            width: 30%;
            float: left;
          }
          .receipt-logo img {
            display: block;
            max-width: 50%;
            height: auto;
          }
          .receipt-school {
            width: 60%;
            float: left;
          }
          .receipt-school h5 {
            margin: 0 0 4px;
            padding-top: 0.4em;
            font-size: 17px !important;
            line-height: 1.15 !important;
            font-weight: bold;
            font-family: Arial !important;
          }
          .receipt-school h6 {
            margin: 0 0 2px;
            font-size: 12px !important;
            line-height: 1.2 !important;
            font-weight: normal;
            font-family: Arial !important;
          }
          .receipt-school h6:last-child {
            padding-bottom: 0.5em;
            margin-bottom: 0;
          }
          .divInfo {
            width: 95%;
            margin-top: 1em;
            margin-left: 0.8em;
            font-weight: normal;
          }
          .master-block-upper {
            height: 22px;
            width: 100%;
            overflow: hidden;
            font-weight: bold;
            font-size: 11px !important;
          }
          .child-block-upper-left {
            width: 32%;
            margin-left: 1.3em;
            float: left;
            white-space: nowrap;
            font-size: 11px !important;
            font-weight: bold;
          }
          .child-block-upper-right {
            width: 56%;
            margin-left: 0.6em;
            float: left;
            text-decoration: underline;
            font-size: 11px !important;
            font-weight: bold;
          }
          .receipt-block-upper {
            height: 22px;
            width: 93%;
            margin-left: 1.3em;
            overflow: hidden;
            font-size: 11px !important;
            font-weight: bold;
          }
          .rcpt-col { width: 35%; float: left; }
          .family-col { width: 35%; float: left; text-align: center; }
          .acc-col { width: 30%; float: left; text-align: center; }
          table.table-bordered {
            max-width: 95%;
            width: 95%;
            margin-top: 0.1em;
            margin-left: 0.8em;
            border-collapse: collapse;
            border: 2px solid #000 !important;
            font-weight: normal;
          }
          table.table-bordered th,
          table.table-bordered td {
            border: 2px solid #000 !important;
            text-align: left;
            vertical-align: top;
          }
          table.table-bordered td {
            padding: 2px !important;
            font-size: 11px !important;
            font-weight: normal !important;
          }
          table.table-bordered th {
            padding: 4px !important;
            font-size: 12px !important;
            font-weight: bold;
          }
          table.table-bordered tfoot td {
            font-weight: bold !important;
            font-size: 11px !important;
          }
          .remaining-row {
            font-weight: bold;
            font-size: 11px !important;
            width: 100%;
            height: 2.4em;
            overflow: hidden;
            margin-top: 2px;
          }
          .remaining-label {
            width: 80%;
            float: left;
            text-align: center;
            padding-top: 0.35em;
            padding-bottom: 0.35em;
            font-size: 11px !important;
          }
          .remaining-value {
            width: 18%;
            float: right;
            text-align: center;
            padding-top: 0.35em;
            padding-bottom: 0.35em;
            font-size: 11px !important;
          }
          .divInfo-bottom {
            width: 90%;
            margin-top: 0.5em;
            margin-left: 22px;
            overflow: hidden;
          }
          .signature-row .sig-left {
            width: 40%;
            float: left;
            text-align: center;
            padding-top: 0.4em;
            padding-bottom: 0.4em;
          }
          .signature-row .sig-right {
            width: 60%;
            float: right;
            text-align: center;
            padding-top: 0.4em;
            padding-bottom: 0.4em;
          }
          .received-row .received-spacer {
            width: 55%;
            float: left;
          }
          .received-row .received-by {
            width: 45%;
            float: right;
            padding-top: 0.4em;
            padding-bottom: 0.4em;
          }
          .note-block ul {
            margin: 0;
            padding-left: 10px !important;
          }
          .note-block li {
            font-size: 10.5px;
          }
          .note-block li.note-fine {
            font-weight: bold;
            font-style: italic;
          }
          .void-note {
            margin: 6px 0 0;
            font-size: 12px;
            font-weight: bold;
            color: #b91c1c;
          }
          @media print {
            @page { size: A4 portrait; margin: 12px !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt-page {
              min-height: auto;
              height: auto;
              padding: 0;
            }
            .receipt-page--packed .invoice-row {
              max-height: 48vh;
              overflow: hidden;
            }
            .receipt-page--packed .receipt-half {
              font-size: 0.92em;
            }
            .receipt-page--packed table.table-bordered td { font-size: 10px !important; }
            .receipt-page--packed table.table-bordered th { font-size: 11px !important; }
            .receipt-page--packed .spacer-row td { height: 28px !important; }
            .receipt-page--packed .spacer-row td[style] { height: 28px !important; }
            .receipt-page--packed br { display: none; }
          }
        </style>
      </head>
      <body>
        ${pages}
        <script>
          const waitForImages = () => Promise.all(
            Array.from(document.images).map((img) => {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve()
              return new Promise((resolve) => {
                img.onload = resolve
                img.onerror = resolve
              })
            })
          )
          window.addEventListener('load', async () => {
            await waitForImages()
            setTimeout(() => {
              window.focus()
              window.print()
            }, 250)
          })
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

/** Single-copy receipt HTML for on-screen preview (modal / void pane). */
export function buildFeeReceiptPreviewHtml(receipt, options = {}) {
  if (!receipt) return ''

  const isVoided = Boolean(options.isVoided)
  const watermark = options.watermark ? String(options.watermark) : ''

  const meta = getCampusPrintMeta()
  const branding = {
    schoolName: meta.schoolName,
    campusLabel: meta.campusLabel,
    phone: meta.phonesDisplay,
    addressDisplay: meta.addressDisplay,
    receiptFooterNote: meta.receiptFooterNote,
  }
  const logoUrl = meta.logoSrc
  const body = buildReceiptCopyHtml(receipt, {
    includeTime: true,
    signatureLabel: 'Signature',
    ...branding,
    logoUrl,
    watermark: watermark || undefined,
    isVoided,
    singleColumn: true,
  })

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 16px;
        font-family: Arial, sans-serif !important;
        font-size: 12px !important;
        color: #000;
        background: #fff !important;
      }
      .text-center { text-align: center; }
      .receipt-half {
        position: relative;
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        padding: 0 8px;
        overflow: hidden;
      }
      .receipt-half--single { width: 100%; }
      .receipt-watermark {
        position: absolute;
        inset: 18% 8% 22% 8%;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 5;
        font-size: 64px;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: rgba(220, 38, 38, 0.28);
        transform: rotate(-28deg);
        text-transform: uppercase;
        user-select: none;
      }
      .receipt-header {
        display: flex;
        align-items: flex-start;
        padding-left: 10px;
      }
      .receipt-logo { width: 30%; float: left; }
      .receipt-logo img {
        display: block;
        max-width: 50%;
        height: auto;
      }
      .receipt-school { width: 60%; float: left; }
      .receipt-school h5 {
        margin: 0 0 4px;
        padding-top: 0.4em;
        font-size: 17px !important;
        line-height: 1.15 !important;
        font-weight: bold;
      }
      .receipt-school h6 {
        margin: 0 0 2px;
        font-size: 12px !important;
        line-height: 1.2 !important;
        font-weight: normal;
      }
      .divInfo {
        width: 95%;
        margin-top: 1em;
        margin-left: 0.8em;
      }
      .master-block-upper {
        height: 22px;
        width: 100%;
        overflow: hidden;
        font-weight: bold;
        font-size: 11px !important;
      }
      .child-block-upper-left {
        width: 32%;
        margin-left: 1.3em;
        float: left;
        white-space: nowrap;
        font-size: 11px !important;
        font-weight: bold;
      }
      .child-block-upper-right {
        width: 56%;
        margin-left: 0.6em;
        float: left;
        text-decoration: underline;
        font-size: 11px !important;
        font-weight: bold;
      }
      .receipt-block-upper {
        height: 22px;
        width: 93%;
        margin-left: 1.3em;
        overflow: hidden;
        font-size: 11px !important;
        font-weight: bold;
      }
      .rcpt-col { width: 35%; float: left; }
      .family-col { width: 35%; float: left; text-align: center; }
      .acc-col { width: 30%; float: left; text-align: center; }
      table.table-bordered {
        max-width: 95%;
        width: 95%;
        margin-top: 0.1em;
        margin-left: 0.8em;
        border-collapse: collapse;
        border: 2px solid #000 !important;
      }
      table.table-bordered th,
      table.table-bordered td {
        border: 2px solid #000 !important;
        text-align: left;
        vertical-align: top;
      }
      table.table-bordered td {
        padding: 2px !important;
        font-size: 11px !important;
      }
      table.table-bordered th {
        padding: 4px !important;
        font-size: 12px !important;
        font-weight: bold;
      }
      table.table-bordered tfoot td {
        font-weight: bold !important;
        font-size: 11px !important;
      }
      .remaining-row {
        width: 95%;
        margin-left: 0.8em;
        margin-top: 0.4em;
        overflow: hidden;
        font-weight: bold;
        font-size: 11px !important;
      }
      .remaining-label { float: left; width: 70%; }
      .remaining-value { float: left; width: 30%; }
      .divInfo-bottom {
        width: 95%;
        margin-left: 0.8em;
        margin-top: 0.5em;
      }
      .signature-row { overflow: hidden; }
      .sig-left { float: left; width: 45%; }
      .sig-right { float: right; width: 50%; text-align: right; }
      .received-row { overflow: hidden; }
      .received-spacer { width: 55%; float: left; }
      .received-by { width: 45%; float: right; padding-top: 0.4em; }
      .note-block ul {
        margin: 0;
        padding-left: 10px !important;
      }
      .void-note {
        margin: 6px 0 0;
        font-size: 12px;
        font-weight: bold;
        color: #b91c1c;
      }
    </style>
  </head>
  <body>${body}</body>
</html>`
}

/** @deprecated Prefer buildFeeReceiptPreviewHtml(receipt, { watermark: 'VOID', isVoided: true }) */
export function buildVoidReceiptPreviewHtml(receipt) {
  return buildFeeReceiptPreviewHtml(receipt, { watermark: 'VOID', isVoided: true })
}



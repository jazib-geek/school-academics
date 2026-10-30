import { useMemo } from 'react'
import { SECURITY_DEPOSIT_FUND_TYPE_ID } from '../../../constants/campusFundTypes.js'
import { getCampusPrintMeta } from '../../../utils/campusProfile.js'

const MONTHS = [
  '',
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

const SUMMARY_COLUMNS = [
  { label: 'Tuition Fee', fundTypeIds: [1], nameMatchers: ['tuition', 'tution'] },
  { label: 'Fine', fundTypeIds: [], nameMatchers: ['fine'] },
  { label: 'Admission Fee', fundTypeIds: [], nameMatchers: ['admission'] },
  { label: 'Misc Charges', fundTypeIds: [], nameMatchers: ['misc'] },
  { label: 'Prev Balance', fundTypeIds: [], nameMatchers: ['prev', 'previous', 'balance'] },
  {
    label: 'Security Deposit',
    fundTypeIds: [SECURITY_DEPOSIT_FUND_TYPE_ID],
    nameMatchers: ['security deposit', 'security'],
  },
]

const PRINT_WIDTHS = {
  rcptId: '5.5%',
  manualRcptNo: '7%',
  transactionId: '7.5%',
  studentId: '6%',
  studentName: '13%',
  className: '11%',
  fundTypeName: '14%',
  month: '10.5%',
  year: '5.5%',
  paymentMode: '8%',
  received: '11.5%',
}

function printAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: true,
  })
}

function dash(value) {
  if (value == null || value === '') return '-'
  const text = String(value).trim()
  return text || '-'
}

function formatPrintDate(value) {
  if (!value) return ''
  const text = String(value).slice(0, 10)
  const [year, month, day] = text.split('-')
  if (!year || !month || !day) return text
  return `${day}/${month}/${year}`
}

function formatMonthName(monthValue) {
  const month = Number(monthValue)
  if (!month || month < 1 || month > 12) return '—'
  return MONTHS[month]
}

function displayMonth(row) {
  const monthRaw = row.month
  if ((!monthRaw || monthRaw === 0 || monthRaw === '0') && typeof row.monthLabel === 'string' && row.monthLabel.trim()) {
    const parts = row.monthLabel.trim().split(/\s+/)
    if (parts.length >= 2) return parts.slice(0, -1).join(' ')
  }
  if (monthRaw === 0 || monthRaw === '0') return '—'
  if (typeof monthRaw === 'string' && /[a-zA-Z]/.test(monthRaw)) return monthRaw
  return formatMonthName(monthRaw)
}

function displayYear(row) {
  const yearRaw = row.year
  if ((!row.month || row.month === 0 || row.month === '0') && typeof row.monthLabel === 'string' && row.monthLabel.trim()) {
    const parts = row.monthLabel.trim().split(/\s+/)
    if (parts.length >= 2) return parts[parts.length - 1]
    if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0]
  }
  if (yearRaw == null || yearRaw === '') return ''
  return String(yearRaw).replace(/,/g, '')
}

function rowsHaveManualRcpt(rows) {
  return (rows || []).some((row) => {
    const raw = row.manualRcptNo ?? row.ManualRcptNo
    if (raw == null || raw === '') return false
    const text = String(raw).trim()
    return text.length > 0 && text !== '-'
  })
}

function rowIsOnlinePayment(row) {
  const raw = row?.paymentMode ?? row?.PaymentMode
  return String(raw || '').trim().toLowerCase() === 'online'
}

function matchSummaryColumn(row, column) {
  const fundTypeId = Number(row.fundTypeId || 0)
  if (column.fundTypeIds.includes(fundTypeId)) return true
  const name = String(row.fundTypeName || '')
    .trim()
    .toLowerCase()
  return column.nameMatchers.some((matcher) => name.includes(matcher))
}

function cellStyle(key) {
  const width = PRINT_WIDTHS[key] || '8%'
  const isMoney = key === 'received'
  const leftAlign = key === 'studentName' || key === 'className' || key === 'fundTypeName'
  const wrap = key === 'studentName' || key === 'className'
  return {
    width,
    maxWidth: width,
    textAlign: leftAlign ? 'left' : 'center',
    verticalAlign: 'middle',
    fontWeight: isMoney ? 700 : undefined,
    whiteSpace: wrap ? 'normal' : 'nowrap',
    lineHeight: 1.25,
    padding: '3px 4px',
  }
}

export function collectionPrintSubtitle({ date, dateFrom, dateTo, reportId }) {
  if (reportId === 'collection-by-interval') {
    return `From: ${formatPrintDate(dateFrom)}   To: ${formatPrintDate(dateTo)}`
  }
  if (reportId === 'collection-by-date' || (date && !dateFrom)) {
    return `As on Date: ${formatPrintDate(date)}`
  }
  return `From: ${formatPrintDate(dateFrom)}   To: ${formatPrintDate(dateTo)}`
}

/**
 * Portrait FEE Collection sheet shared by Fee Reports and Transaction History.
 * Hidden on screen (`.print-only`); `window.print()` shows it.
 */
export default function FeeCollectionPrintSheet({ result, date, dateFrom, dateTo }) {
  const meta = getCampusPrintMeta()
  const rows = result?.rows
  const reportId = result?.reportId

  const summary = useMemo(() => {
    const totals = new Map(SUMMARY_COLUMNS.map((column) => [column.label, 0]))
    ;(rows || []).forEach((row) => {
      const amount = Number(row.received || 0)
      if (!amount) return
      const column = SUMMARY_COLUMNS.find((item) => matchSummaryColumn(row, item))
      if (!column) return
      totals.set(column.label, totals.get(column.label) + amount)
    })
    return SUMMARY_COLUMNS.map((column) => ({
      label: column.label,
      amount: totals.get(column.label) || 0,
    }))
  }, [rows])

  const showManualRcpt = useMemo(() => rowsHaveManualRcpt(rows), [rows])
  const showPaymentMode = useMemo(() => (rows || []).some(rowIsOnlinePayment), [rows])
  const paymentTotals = useMemo(() => {
    let cash = 0
    let online = 0
    ;(rows || []).forEach((row) => {
      const amount = Number(row.received || 0)
      if (!amount) return
      if (rowIsOnlinePayment(row)) online += amount
      else cash += amount
    })
    return { cash, online }
  }, [rows])
  const columnCount = 9 + (showManualRcpt ? 1 : 0) + (showPaymentMode ? 1 : 0)
  const subtitle = collectionPrintSubtitle({ date, dateFrom, dateTo, reportId })

  if (!result) return null

  return (
    <div className="print-only print-sheet">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          * {
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body, #root { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          .no-print, .hide-in-print, .fee-result-modal { display: none !important; }
          .print-only { display: block !important; }
          .print-sheet { width: 100% !important; }
          .legacy-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 11px !important;
          }
          .legacy-print-table th,
          .legacy-print-table td {
            border: 1px solid #000 !important;
            padding: 3px 4px !important;
            vertical-align: middle !important;
          }
          .legacy-print-table thead th {
            background: #d9d9d9 !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .legacy-print-table tr { page-break-inside: avoid !important; }
          .legacy-print-table .total-row td {
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .legacy-print-summary {
            margin-top: 14px !important;
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 12px !important;
          }
          .legacy-print-summary th,
          .legacy-print-summary td {
            border: 1px solid #000 !important;
            padding: 5px 4px !important;
            text-align: center !important;
            font-weight: 700 !important;
          }
          .legacy-print-summary th { background: #d9d9d9 !important; }
          .payment-mode-summary {
            width: 280px !important;
            max-width: 100% !important;
            margin-top: 12px !important;
            margin-left: auto !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 12px !important;
          }
          .payment-mode-summary th,
          .payment-mode-summary td {
            border: 1px solid #000 !important;
            padding: 5px 10px !important;
          }
          .payment-mode-summary thead th {
            background: #d9d9d9 !important;
            font-weight: 700 !important;
          }
          .payment-mode-summary thead th:first-child,
          .payment-mode-summary tbody td:first-child { text-align: left !important; }
          .payment-mode-summary thead th:last-child { text-align: center !important; width: 110px !important; }
          .payment-mode-summary tbody td:last-child { text-align: right !important; font-weight: 700 !important; }
          .payment-mode-summary tr.total-row td {
            background: #e8e8e8 !important;
            font-size: 14px !important;
            font-weight: 800 !important;
          }
          .fee-collection-print-table th,
          .fee-collection-print-table td {
            overflow: visible !important;
            text-overflow: clip !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .fee-collection-print-table thead th { white-space: nowrap !important; padding: 4px 3px !important; }
          .fee-collection-print-table .col-student-name,
          .fee-collection-print-table .col-class-name {
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow: hidden !important;
          }
        }
        .print-only { display: none; }
      `}</style>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 10,
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.3 }}>{meta.schoolName}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{meta.campusLabel}</div>
          <div style={{ fontSize: 12 }}>Tel. {meta.phonesDisplay}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>FEE Collection</div>
          {subtitle ? (
            <div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-line' }}>{subtitle}</div>
          ) : null}
        </div>
      </div>
      <table className="legacy-print-table fee-collection-print-table">
        <thead>
          <tr>
            <th style={cellStyle('rcptId')}>Rcpt ID</th>
            {showManualRcpt ? <th style={cellStyle('manualRcptNo')}>Manual Rcpt#</th> : null}
            <th style={cellStyle('transactionId')}>Trx ID</th>
            <th style={cellStyle('studentId')}>Std ID</th>
            <th className="col-student-name" style={cellStyle('studentName')}>Name</th>
            <th className="col-class-name" style={cellStyle('className')}>Class/Section</th>
            <th style={cellStyle('fundTypeName')}>Type</th>
            <th style={cellStyle('month')}>Month</th>
            <th style={cellStyle('year')}>Year</th>
            {showPaymentMode ? <th style={cellStyle('paymentMode')}>Pay mode</th> : null}
            <th style={cellStyle('received')}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td colSpan={columnCount} style={{ textAlign: 'center' }}>
                No report rows found.
              </td>
            </tr>
          ) : (
            (rows || []).map((row, index) => (
              <tr key={`${row.rcptId || index}-${index}`}>
                <td style={cellStyle('rcptId')}>{dash(row.rcptId)}</td>
                {showManualRcpt ? <td style={cellStyle('manualRcptNo')}>{dash(row.manualRcptNo)}</td> : null}
                <td style={cellStyle('transactionId')}>{dash(row.transactionId)}</td>
                <td style={cellStyle('studentId')}>{dash(row.studentId)}</td>
                <td className="col-student-name" style={cellStyle('studentName')}>{dash(row.studentName)}</td>
                <td className="col-class-name" style={cellStyle('className')}>{dash(row.className)}</td>
                <td style={cellStyle('fundTypeName')}>{dash(row.fundTypeName)}</td>
                <td style={cellStyle('month')}>{dash(displayMonth(row))}</td>
                <td style={cellStyle('year')}>{dash(displayYear(row))}</td>
                {showPaymentMode ? (
                  <td style={cellStyle('paymentMode')}>{rowIsOnlinePayment(row) ? 'Online' : 'Cash'}</td>
                ) : null}
                <td style={cellStyle('received')}>{printAmount(row.received)}</td>
              </tr>
            ))
          )}
          {(rows || []).length > 0 ? (
            <tr className="total-row">
              <td colSpan={columnCount - 1} style={{ textAlign: 'right', fontWeight: 700 }}>
                Total
              </td>
              <td style={{ ...cellStyle('received'), fontWeight: 700 }}>{printAmount(result.totalAmount)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <table className="legacy-print-summary">
          <thead>
            <tr>
              {summary.map((item) => (
                <th key={item.label}>{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {summary.map((item) => (
                <td key={item.label}>{printAmount(item.amount)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      {showPaymentMode ? (
        <table className="payment-mode-summary">
          <thead>
            <tr>
              <th>Payment Mode</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cash</td>
              <td>{printAmount(paymentTotals.cash)}</td>
            </tr>
            <tr>
              <td>Online</td>
              <td>{printAmount(paymentTotals.online)}</td>
            </tr>
            <tr className="total-row">
              <td>Total</td>
              <td>{printAmount(result.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

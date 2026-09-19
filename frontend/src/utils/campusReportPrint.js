/**
 * Shared print stylesheet for campus report pages (Fee / Student / Accounts).
 * Keep this the single source of truth for A4 report printing.
 */
import { getCampusPrintMeta } from './campusProfile'

export { getCampusPrintMeta }

export const CAMPUS_REPORT_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 8mm;
  }
  @media print {
    * {
      font-family: Arial, Helvetica, sans-serif !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body, #root {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print,
    .hide-in-print { display: none !important; }
    .print-only { display: block !important; }
    .print-page-root,
    .print-main-wrap,
    .print-content-wrap {
      background: #ffffff !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      min-height: auto !important;
    }
    /* Clear CampusShell mobile header offset on paper. */
    .print-main-wrap main > :not(header),
    main > .print-content-wrap,
    .print-content-wrap {
      padding: 0 !important;
      padding-top: 0 !important;
      margin-top: 0 !important;
    }
    .print-area {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .print-sheet {
      display: block !important;
      width: 100% !important;
      font-size: 12px !important;
      font-weight: 400 !important;
    }
    .print-sheet .print-school-name,
    .print-sheet .print-report-title {
      font-size: 16px !important;
      font-weight: 700 !important;
    }
    .print-sheet .print-meta {
      font-size: 12px !important;
      font-weight: 400 !important;
    }
    .legacy-print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 12px !important;
      font-weight: 400 !important;
    }
    .legacy-print-table th,
    .legacy-print-table td {
      border: 1px solid #000 !important;
      padding: 4px 5px !important;
      vertical-align: middle !important;
      overflow: hidden !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      word-wrap: break-word !important;
      font-size: 12px !important;
    }
    .legacy-print-table thead th {
      background: #d9d9d9 !important;
      font-weight: 700 !important;
      text-align: center !important;
    }
    .legacy-print-table tr { page-break-inside: avoid !important; }
    .legacy-print-table .band-row td {
      text-align: left !important;
      font-weight: 700 !important;
      background: #ffffff !important;
    }
    .legacy-print-table .total-row td {
      font-weight: 700 !important;
      background: #e8e8e8 !important;
    }
    .legacy-print-summary {
      margin-top: 14px !important;
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 12px !important;
    }
    .legacy-print-summary th,
    .legacy-print-summary td {
      border: 1px solid #000 !important;
      padding: 5px 4px !important;
      text-align: center !important;
      font-weight: 700 !important;
    }
    .legacy-print-summary th {
      background: #d9d9d9 !important;
    }
  }
  .print-only { display: none; }
`

/** @deprecated Prefer getCampusPrintMeta from utils/campusProfile */
export function getCampusReportPrintMeta() {
  const meta = getCampusPrintMeta()
  return {
    campusCode: meta.campusCode,
    campusPhone: meta.phonesDisplay,
    schoolName: meta.schoolName,
    campusLabel: meta.campusLabel,
    sessionLabel: meta.sessionLabel,
  }
}

export function formatReportPrintMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatReportPrintDate(value, style = 'short') {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  if (style === 'long') {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

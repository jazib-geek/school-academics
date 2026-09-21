import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarCheck2,
  ClipboardCheck,
  FileBarChart2,
  History,
  IdCard,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  School,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from 'lucide-react'
import Select from 'react-select'
import { toast } from 'sonner'
import { getClasses } from '../../../services/classService'
import { buildWhatsAppWebUrl, normalizeWhatsAppPhone } from '../../../utils/whatsapp'
import {
  getStudentAdmissionDetail,
  getStudentFamilyMembers,
  getStudentFeeBalance,
  getStudentLedger,
  getStudents,
  receiveStudentFee,
  activateStudent,
  deactivateStudent,
} from '../../../services/studentService'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import FloatingMenu from '../../../components/campus/FloatingMenu.jsx'
import {
  AccessForbiddenPanel,
  PermissionControl,
} from '../../../components/campus/CampusPermissionUi.jsx'
import {
  CAMPUS_PROFILE_CHANGED_EVENT,
  getCampusPrintMeta,
  getStoredCampusProfile,
  normalizeCampusProfile,
} from '../../../utils/campusProfile'
import { printFeeReceipts } from '../../../utils/feeReceiptPrint'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { clampToPakistanToday, getPakistanTodayIso } from '../../../utils/pakistanDate.js'
import { hasCampusPermission } from '../../../services/authService'
import StudentProfileModal from './StudentProfileModal.jsx'
import StudentActivityLogsModal from './StudentActivityLogsModal.jsx'
import StudentAttendanceModal from './StudentAttendanceModal.jsx'
import StudentConductModal from './StudentConductModal.jsx'

const initialFilters = {
  class: '',
  name: '',
  reg_Id: '',
  status: 'active',
  gender: '',
  creditFilter: '',
  pageNumber: 1,
  pageSize: 20,
}

const getTodayIso = () => getPakistanTodayIso()

const collectStudentContacts = (fatherContact, motherContact) => {
  const father = String(fatherContact || '').trim()
  const mother = String(motherContact || '').trim()
  const parts = []
  if (father) parts.push(father)
  if (mother) parts.push(mother)
  return parts
}

const StudentContactButtons = ({ fatherContact, motherContact, onSelect }) => {
  const parts = collectStudentContacts(fatherContact, motherContact)
  if (!parts.length) return <span>-</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      {parts.map((number, index) => (
        <span key={`${number}-${index}`} className="inline-flex items-center gap-x-1">
          {index > 0 ? <span className="text-slate-400">/</span> : null}
          <button
            type="button"
            onClick={() => onSelect(number)}
            className="font-medium text-[var(--campus-primary)] underline-offset-2 hover:underline"
            title="Send WhatsApp message"
          >
            {number}
          </button>
        </span>
      ))}
    </span>
  )
}

const genderFilterRadioClass = (value) => {
  if (value === 'Male') return 'accent-sky-600'
  if (value === 'Female') return 'accent-pink-600'
  return 'accent-slate-500'
}

const statusFilterRadioClass = (value) => {
  if (value === 'active') return 'accent-emerald-600'
  if (value === 'deactivated') return 'accent-rose-600'
  return 'accent-slate-500'
}

const creditFilterRadioClass = (value) => {
  if (value === 'credit') return 'accent-amber-600'
  if (value === 'not_credit') return 'accent-slate-600'
  return 'accent-slate-500'
}

const STUDENT_FILTER_GROUP_THEMES = {
  sky: {
    border: 'border-sky-300',
    title: 'text-sky-800',
    divider: 'border-sky-200',
    selectedBg: 'bg-sky-50',
  },
  emerald: {
    border: 'border-emerald-300',
    title: 'text-emerald-800',
    divider: 'border-emerald-200',
    selectedBg: 'bg-emerald-50',
  },
  amber: {
    border: 'border-amber-300',
    title: 'text-amber-900',
    divider: 'border-amber-200',
    selectedBg: 'bg-amber-50',
  },
}

function StudentListFilterRadioGroup({
  title,
  theme,
  name,
  selectedValue,
  options,
  onChange,
  radioClassFn,
  compact = false,
}) {
  const palette = STUDENT_FILTER_GROUP_THEMES[theme]
  return (
    <div
      className={`flex min-h-10 shrink-0 flex-nowrap items-center rounded-lg border bg-white text-[13px] shadow-sm ${palette.border} ${
        compact ? 'gap-1.5 px-1.5 py-1' : 'gap-2.5 px-2.5 py-1.5'
      }`}
    >
      {!compact && title ? (
        <span
          className={`shrink-0 border-r pr-2.5 text-xs font-semibold uppercase tracking-wide ${palette.divider} ${palette.title}`}
        >
          {title}
        </span>
      ) : null}
      {options.map(([value, label]) => {
        const selected = selectedValue === value
        return (
          <label
            key={label}
            className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md py-0.5 ${
              compact ? 'px-1' : 'gap-1.5 px-1.5'
            } ${selected ? `${palette.selectedBg} font-semibold text-slate-800` : 'text-slate-600'}`}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={selected}
              onChange={() => onChange(value)}
              className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${radioClassFn(value)}`}
            />
            {label}
          </label>
        )
      })}
    </div>
  )
}

/** Format a date for display using Pakistan calendar day (no UTC midnight shift). */
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

const formatLedgerPrintDate = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatLedgerPrintAmount = (value) => {
  if (value === '' || value == null) return ''
  const num = Number(value)
  if (Number.isNaN(num) || num === 0) return ''
  return String(Math.round(num))
}

const buildLedgerPrintRows = (items) => {
  const rows = []

  for (const entry of items || []) {
    const debit = Number(entry.debit || 0)
    const credit = Number(entry.credit || 0)
    if (debit === 0 && credit === 0) continue

    let fundTypeName = entry.fundTypeName || entry.FundTypeName || ''
    let feeMonth = entry.feeMonth || entry.FeeMonth || ''
    if (!fundTypeName && entry.description) {
      const parts = String(entry.description).split(' - ')
      fundTypeName = parts[0] || ''
      if (!feeMonth && parts.length > 1) feeMonth = parts.slice(1).join(' - ')
    }
    const receiptNo = entry.receiptNo || entry.ReceiptNo || ''
    const date = formatLedgerPrintDate(entry.date)
    const balance = Math.round(Number(entry.balance || 0))

    if (debit !== 0 && credit !== 0) {
      rows.push({
        date,
        description: fundTypeName,
        feeMonth,
        receiptNo: '',
        due: formatLedgerPrintAmount(debit),
        received: '',
        balance: String(balance + Math.round(credit)),
      })
      rows.push({
        date,
        description: fundTypeName,
        feeMonth,
        receiptNo,
        due: '',
        received: formatLedgerPrintAmount(credit),
        balance: String(balance),
      })
      continue
    }

    if (debit !== 0) {
      rows.push({
        date,
        description: fundTypeName,
        feeMonth,
        receiptNo: '',
        due: formatLedgerPrintAmount(debit),
        received: '',
        balance: String(balance),
      })
    } else {
      rows.push({
        date,
        description: fundTypeName,
        feeMonth,
        receiptNo,
        due: '',
        received: formatLedgerPrintAmount(credit),
        balance: String(balance),
      })
    }
  }

  return rows
}

const printStudentFeeLedger = ({ student, items }) => {
  const rows = buildLedgerPrintRows(items)
  if (!rows.length) return

  const meta = getCampusPrintMeta()
  const totalReceivable = (items || []).reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalPaid = (items || []).reduce((sum, row) => sum + Number(row.credit || 0), 0)
  const balance = totalReceivable - totalPaid
  const studentName = String(student?.fullName || student?.FullName || 'Student').toUpperCase()
  const studentId = student?.reg_Id ?? student?.Reg_Id ?? ''
  const className = student?.className || student?.ClassName || '-'
  const phone = meta.phonesDisplay
  const schoolName = meta.schoolName
  const campusLabel = meta.campusLabel

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(row.feeMonth)}</td>
        <td class="center">${escapeHtml(row.receiptNo)}</td>
        <td class="num">${escapeHtml(row.due)}</td>
        <td class="num">${escapeHtml(row.received)}</td>
        <td class="num">${escapeHtml(row.balance)}</td>
      </tr>`
    )
    .join('')

  const printWindow = window.open('', '_blank', 'width=1024,height=800')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Fee Ledger - ${escapeHtml(studentName)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 18px 22px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 14px;
          }
          .school-name {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }
          .campus-line, .tel-line {
            margin: 2px 0 0;
            font-size: 13px;
          }
          .doc-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            text-align: right;
            letter-spacing: 0.04em;
          }
          .student-line {
            margin: 4px 0 0;
            font-size: 13px;
            font-weight: 700;
            text-align: right;
            text-transform: uppercase;
          }
          .class-line {
            margin: 2px 0 0;
            font-size: 13px;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #9ca3af;
            padding: 6px 8px;
            vertical-align: middle;
          }
          th {
            background: #d1d5db;
            font-weight: 700;
            text-align: center;
          }
          td.num { text-align: right; }
          td.center { text-align: center; }
          .summary-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
          }
          .summary {
            min-width: 220px;
            background: #e5e7eb;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 700;
          }
          .summary div {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin: 3px 0;
          }
          .summary .rule {
            border-top: 2px solid #111;
            margin: 6px 0;
          }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="school-name">${escapeHtml(schoolName)}</h1>
            <p class="campus-line">${escapeHtml(campusLabel || '')}</p>
            <p class="tel-line">Tel: ${escapeHtml(phone)}</p>
          </div>
          <div>
            <h2 class="doc-title">FEE LEDGER</h2>
            <p class="student-line">${escapeHtml(studentName)} (ID : ${escapeHtml(studentId)})</p>
            <p class="class-line">${escapeHtml(className)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Fee Month</th>
              <th>Recpt #</th>
              <th>Due</th>
              <th>Received</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary-wrap">
          <div class="summary">
            <div><span>Total Receiveable :</span><span>${Math.round(totalReceivable)}</span></div>
            <div><span>Total Paid :</span><span>${Math.round(totalPaid)}</span></div>
            <div class="rule"></div>
            <div><span>Balance :</span><span>${Math.round(balance)}</span></div>
          </div>
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.focus()
              window.print()
            }, 200)
          })
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const familyPrintRegId = (row) => row.reg_Id ?? row.regId ?? ''
const familyPrintName = (row) => row.studentName ?? row.StudentName ?? '-'
const familyPrintClass = (row) => row.className ?? row.ClassName ?? '-'
const familyPrintFather = (row) => row.fatherName ?? row.FatherName ?? '-'
const familyPrintRegDate = (row) => row.regDate ?? row.RegDate
const familyPrintFee = (row) => Number(row.fee ?? row.Fee ?? 0)
const familyPrintConcession = (row) => Number(row.concession ?? row.Concession ?? 0)
const familyPrintActualFee = (row) => {
  const actual = row.actualFee ?? row.ActualFee
  if (actual != null && actual !== '') return Number(actual)
  return Math.max(0, familyPrintFee(row) - familyPrintConcession(row))
}

const formatFamilyPrintAmount = (value) => String(Math.round(Number(value || 0)))

const formatFamilyPrintAsOnDate = (value = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const printFamilyFeeDetail = ({ familyId, members }) => {
  const rows = Array.isArray(members) ? members : []
  if (!rows.length) return

  const meta = getCampusPrintMeta()
  const schoolName = meta.schoolName
  const campusLabel = meta.campusLabel
  const phone = meta.phonesDisplay
  const asOnDate = formatFamilyPrintAsOnDate()
  const familyCode = familyId ?? ''

  let totalFee = 0
  let totalConcession = 0
  let totalActual = 0

  const tableRows = rows
    .map((row, index) => {
      const fee = familyPrintFee(row)
      const concession = familyPrintConcession(row)
      const actualFee = familyPrintActualFee(row)
      totalFee += fee
      totalConcession += concession
      totalActual += actualFee
      return `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="center">${escapeHtml(familyPrintRegId(row))}</td>
        <td class="center">${escapeHtml(formatLedgerPrintDate(familyPrintRegDate(row)) || '-')}</td>
        <td>${escapeHtml(familyPrintName(row))}</td>
        <td>${escapeHtml(familyPrintFather(row))}</td>
        <td>${escapeHtml(familyPrintClass(row))}</td>
        <td class="num">${escapeHtml(formatFamilyPrintAmount(fee))}</td>
        <td class="num">${escapeHtml(formatFamilyPrintAmount(concession))}</td>
        <td class="num">${escapeHtml(formatFamilyPrintAmount(actualFee))}</td>
      </tr>`
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=1024,height=800')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Family Fee Detail - ${escapeHtml(familyCode)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 18px 22px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 10px;
          }
          .school-name {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }
          .campus-line, .tel-line {
            margin: 2px 0 0;
            font-size: 13px;
          }
          .doc-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            text-align: right;
            letter-spacing: 0.04em;
          }
          .meta-row {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 700;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #9ca3af;
            padding: 6px 8px;
            vertical-align: middle;
          }
          th {
            background: #d1d5db;
            font-weight: 700;
            text-align: center;
          }
          td.num { text-align: right; }
          td.center { text-align: center; }
          tfoot td {
            font-weight: 700;
            background: #f3f4f6;
          }
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="school-name">${escapeHtml(schoolName)}</h1>
            <p class="campus-line">${escapeHtml(campusLabel || '')}</p>
            <p class="tel-line">Tel: ${escapeHtml(phone)}</p>
          </div>
          <div>
            <h2 class="doc-title">FAMILY FEE DETAIL</h2>
          </div>
        </div>

        <div class="meta-row">
          <span>Family ID: ${escapeHtml(familyCode)}</span>
          <span>As on Date: ${escapeHtml(asOnDate)}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>DOA</th>
              <th>Student Name</th>
              <th>Father Name</th>
              <th>Class</th>
              <th>Fee</th>
              <th>Concession</th>
              <th>Actual Fee</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" class="center">Total</td>
              <td class="num">${escapeHtml(formatFamilyPrintAmount(totalFee))}</td>
              <td class="num">${escapeHtml(formatFamilyPrintAmount(totalConcession))}</td>
              <td class="num">${escapeHtml(formatFamilyPrintAmount(totalActual))}</td>
            </tr>
          </tfoot>
        </table>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.focus()
              window.print()
            }, 200)
          })
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const dash = (value) => {
  if (value == null || value === '') return '—'
  return String(value)
}

const printStudentProfile = ({
  detail,
  ledgerItems,
  includeLedger,
}) => {
  if (!detail) return

  const meta = getCampusPrintMeta()
  const phone = meta.phonesDisplay
  const campusLabel = meta.campusLabel
  const schoolName = meta.schoolName
  const logoUrl = meta.logoSrc
  const studentName = String(detail.fullName || 'Student')
  const urduName = detail.nameInUrdu || ''
  const isActive = detail.isActive !== false
  const classFee = Number(detail.classFee || 0)
  const tuitionFee = Number(detail.tuitionFee || 0)
  const concession = Number(detail.feeConcession || 0)

  const field = (label, value, opts = {}) => `
    <div class="field ${opts.wide ? 'wide' : ''}">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value"${opts.dir ? ` dir="${opts.dir}"` : ''}>${escapeHtml(dash(value))}</div>
    </div>`

  const money = (value) => {
    const num = Number(value)
    if (Number.isNaN(num)) return '—'
    return Math.round(num).toLocaleString('en-PK')
  }

  const rows = includeLedger ? buildLedgerPrintRows(ledgerItems || []) : []
  const totalDue = (ledgerItems || []).reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalReceived = (ledgerItems || []).reduce((sum, row) => sum + Number(row.credit || 0), 0)
  const outstanding = totalDue - totalReceived
  const tableRows = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(row.feeMonth)}</td>
        <td class="center">${escapeHtml(row.receiptNo)}</td>
        <td class="num">${escapeHtml(row.due)}</td>
        <td class="num">${escapeHtml(row.received)}</td>
        <td class="num">${escapeHtml(row.balance)}</td>
      </tr>`).join('')
    : `<tr><td colspan="7" class="center muted-cell">No ledger entries.</td></tr>`

  const feeBlock = includeLedger
    ? `
    <div class="card fee-ledger" style="margin-bottom:10px">
      <div class="card-title"><span class="ico">☰</span> FEE LEDGER</div>
      <div class="card-body">
        <table class="ledger">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Fee Month</th>
              <th>Receipt #</th>
              <th>Due (Rs.)</th>
              <th>Received (Rs.)</th>
              <th>Balance (Rs.)</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="ledger-foot">
          <div><span>Total Due</span><strong class="rose">${money(totalDue)}</strong></div>
          <div><span>Total Received</span><strong class="green">${money(totalReceived)}</strong></div>
          <div><span>Outstanding Balance</span><strong class="rose">${money(outstanding)}</strong></div>
        </div>
      </div>
    </div>`
    : ''

  const printWindow = window.open('', '_blank', 'width=1024,height=900')
  if (!printWindow) return

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Student Profile - ${escapeHtml(studentName)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 12px 16px 18px;
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            color: #1a2b4b;
            background: #fff;
          }
          .header {
            display: grid;
            grid-template-columns: 1.3fr 1fr 1fr;
            align-items: center;
            gap: 12px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1a2b4b;
            margin-bottom: 12px;
          }
          .brand { display: flex; align-items: center; gap: 10px; }
          .brand img { width: 54px; height: 54px; object-fit: contain; }
          .school-name {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            color: #1a2b4b;
          }
          .meta {
            margin: 3px 0 0;
            font-size: 11px;
            color: #5b6b7c;
          }
          .doc-title {
            margin: 0;
            text-align: center;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.06em;
            color: #1a2b4b;
          }
          .reg-box { text-align: right; }
          .reg-box .k {
            font-size: 10px;
            font-weight: 700;
            color: #5b6b7c;
            letter-spacing: 0.04em;
          }
          .reg-box .v {
            font-size: 16px;
            font-weight: 800;
            color: #1a2b4b;
            margin-bottom: 4px;
          }
          .hero {
            position: relative;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 14px;
            border: 1px solid #d7dee8;
            border-radius: 10px;
            margin-bottom: 10px;
            overflow: hidden;
            background: linear-gradient(90deg, #fff 55%, #f4f7fb 100%);
          }
          .hero-watermark {
            position: absolute;
            right: 18px;
            top: 50%;
            transform: translateY(-50%);
            width: 120px;
            height: 120px;
            opacity: 0.08;
            object-fit: contain;
            pointer-events: none;
          }
          .hero-motto {
            position: absolute;
            right: 16px;
            bottom: 10px;
            font-size: 11px;
            font-style: italic;
            color: #7b8794;
            z-index: 1;
          }
          .photo {
            width: 92px;
            height: 110px;
            border: 1px solid #c5ceda;
            border-radius: 4px;
            background: #eef3f8;
            display: grid;
            place-items: center;
            font-size: 34px;
            font-weight: 800;
            color: var(--campus-primary);
            flex-shrink: 0;
          }
          .hero-main { position: relative; z-index: 1; min-width: 0; flex: 1; }
          .hero-name {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            color: #1a2b4b;
            line-height: 1.1;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
          }
          .hafiz-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 999px;
            border: 1px solid #a7f3d0;
            background: #ecfdf5;
            color: #047857;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            vertical-align: middle;
          }
          .hero-urdu {
            margin: 2px 0 8px;
            font-size: 18px;
            color: #334155;
            direction: rtl;
            text-align: left;
            min-height: 22px;
          }
          .pill {
            display: inline-block;
            background: #1a2b4b;
            color: #fff;
            border-radius: 999px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          .quick {
            display: flex;
            flex-wrap: wrap;
            gap: 18px;
            font-size: 12px;
            color: #334155;
          }
          .quick span { font-weight: 700; color: #1a2b4b; }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .card {
            border: 1px solid #d7dee8;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
          }
          .card-title {
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: #1a2b4b;
            border-bottom: 1px solid #e5ebf2;
            background: #f7f9fc;
          }
          .card-title .ico { margin-right: 6px; color: var(--campus-primary); }
          .card-body { padding: 10px 12px; }
          .fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 14px;
          }
          .field .label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #7b8794;
          }
          .field .value {
            margin-top: 2px;
            font-size: 12px;
            font-weight: 700;
            color: #1a2b4b;
            min-height: 16px;
          }
          .field.wide { grid-column: 1 / -1; }
          .office-body {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr auto;
            gap: 10px 16px;
            align-items: start;
          }
          .office-col { display: grid; gap: 8px; }
          .status-box {
            min-width: 110px;
            border: 1px solid #c8e6c9;
            background: #f1f8f2;
            border-radius: 10px;
            padding: 10px 12px;
            text-align: center;
          }
          .status-box .l {
            font-size: 10px;
            font-weight: 700;
            color: #5b6b7c;
            text-transform: uppercase;
          }
          .status-pill {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            background: ${isActive ? '#2e7d32' : '#64748b'};
            color: #fff;
          }
          table.ledger {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          table.ledger th, table.ledger td {
            border: 1px solid #cfd8e3;
            padding: 5px 6px;
            vertical-align: middle;
          }
          table.ledger th {
            background: #1a2b4b;
            color: #fff;
            font-weight: 700;
            text-align: center;
          }
          td.num { text-align: right; }
          td.center { text-align: center; }
          td.muted-cell { color: #7b8794; }
          .ledger-foot {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 8px;
          }
          .ledger-foot > div {
            border: 1px solid #e5ebf2;
            border-radius: 8px;
            padding: 8px 10px;
            background: #f8fafc;
          }
          .ledger-foot span {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #5b6b7c;
            text-transform: uppercase;
          }
          .ledger-foot strong {
            display: block;
            margin-top: 2px;
            font-size: 14px;
          }
          .rose { color: #c62828; }
          .green { color: #2e7d32; }
          .footer {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #d7dee8;
            text-align: center;
            font-size: 12px;
            color: #5b6b7c;
          }
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <img src="${escapeHtml(logoUrl)}" alt="" />
            <div>
              <h1 class="school-name">${escapeHtml(schoolName)}</h1>
              <p class="meta">${escapeHtml(campusLabel || 'Gujranwala')}</p>
              <p class="meta">Tel: ${escapeHtml(phone)}</p>
            </div>
          </div>
          <h2 class="doc-title">STUDENT PROFILE</h2>
          <div class="reg-box">
            <div class="k">REG. NO.</div>
            <div class="v">${escapeHtml(detail.regId)}</div>
            <div class="k">CLASS</div>
            <div class="v">${escapeHtml(dash(detail.className))}</div>
          </div>
        </div>

        <div class="hero">
          <img class="hero-watermark" src="${escapeHtml(logoUrl)}" alt="" />
          <div class="photo">${escapeHtml(String(studentName).trim().charAt(0).toUpperCase() || 'S')}</div>
          <div class="hero-main">
            <h2 class="hero-name">${escapeHtml(studentName)}${detail.isHafiz ? '<span class="hafiz-pill" title="Hafiz-e-Quran">☪ Hafiz</span>' : ''}</h2>
            <div class="hero-urdu">${escapeHtml(urduName || '—')}</div>
            <div class="pill">Reg #${escapeHtml(detail.regId)}${detail.className ? ` • ${escapeHtml(detail.className)}` : ''}</div>
            <div class="quick">
              <div>DOB: <span>${escapeHtml(formatLedgerPrintDate(detail.dateOfBirth) || '—')}</span></div>
              <div>Gender: <span>${escapeHtml(dash(detail.gender))}</span></div>
              <div>Father: <span>${escapeHtml(dash(detail.fatherName))}</span></div>
            </div>
          </div>
          <div class="hero-motto">Striving for Excellence in Education</div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title"><span class="ico">●</span> STUDENT INFO</div>
            <div class="card-body">
              <div class="fields">
                ${field('Full Name', detail.fullName)}
                ${field('Name (Urdu)', detail.nameInUrdu, { dir: 'rtl' })}
                ${field('Address', detail.homeAddress, { wide: true })}
                ${field('Locality', detail.localityName)}
                ${field('Caste', detail.caste)}
                ${field('Date of Birth', formatLedgerPrintDate(detail.dateOfBirth))}
                ${field('Form-B No.', detail.bFormNum)}
                ${field('Gender', detail.gender)}
                ${field('Subject Group', detail.subjectGroupName)}
                ${field('Previous School', detail.prevSchoolName)}
                ${field('Previous Class', detail.prevSchoolClass)}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><span class="ico">●</span> FAMILY INFO</div>
            <div class="card-body">
              <div class="fields">
                ${field('Father Name', detail.fatherName)}
                ${field('Mother Name', detail.motherName)}
                ${field('Father CNIC', detail.fatherCNIC)}
                ${field('Mother CNIC', detail.motherCNIC)}
                ${field('Father Mobile', detail.fatherMobileNo)}
                ${field('Mother Mobile', detail.motherPhoneNo)}
                ${field('Father Qualification', detail.fatherQualificationName)}
                ${field('Mother Qualification', detail.motherQualificationName)}
                ${field('Father Occupation', detail.fatherOccupationName)}
                ${field('Mother Occupation', detail.motherOccupationName)}
                ${field('Home Phone', detail.homePhone)}
                ${field('Special Notes', detail.specialNotes, { wide: true })}
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:10px">
          <div class="card-title"><span class="ico">●</span> OFFICE USE</div>
          <div class="card-body">
            <div class="office-body">
              <div class="office-col">
                ${field('Reg Date', formatLedgerPrintDate(detail.regDate))}
                ${field('Class', detail.className)}
                ${field('Medium', detail.medium)}
              </div>
              <div class="office-col">
                ${field('Reg No.', detail.regId)}
                ${field('Session', detail.sessionSpan)}
                ${field('Family Code', detail.familyCode)}
              </div>
              <div class="office-col">
                ${field('Class Fee', money(classFee))}
                ${field('Tuition Fee', money(tuitionFee))}
                ${field('Concession', money(concession))}
              </div>
              <div class="status-box">
                <div class="l">Status</div>
                <div class="status-pill">${isActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          </div>
        </div>

        ${feeBlock}

        <div class="footer">☆ Thank you for trusting us with your child's education.</div>

        <script>
          window.addEventListener('load', () => {
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

function StudentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canListStudents = hasCampusPermission('list_std')
  const canAddStudent = hasCampusPermission('add_std')
  const canEditStudent = hasCampusPermission('edit_std')
  const canReceiveFee = hasCampusPermission('submit_fee')
  const canReceiveFeePrevDate = hasCampusPermission('submit_fee_prevdate')
  const canViewLedger = hasCampusPermission('trx')
  const canViewLogs = hasCampusPermission('view_activity_logs')
  const canActivateStudent = hasCampusPermission('activate_std')
  const canViewProfile = hasCampusPermission('rpt_std_profile') || canListStudents
  const canViewConduct = hasCampusPermission('view_student_conduct')
  const [filters, setFilters] = useState(initialFilters)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const [showCreditStudent, setShowCreditStudent] = useState(
    () => normalizeCampusProfile(getStoredCampusProfile() || {}).showCreditStudent,
  )
  const [result, setResult] = useState({
    items: [],
    totalCount: 0,
    totalPages: 0,
    pageNumber: 1,
    pageSize: 20,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isClassesLoading, setIsClassesLoading] = useState(false)
  const [isLedgerLoading, setIsLedgerLoading] = useState(false)
  const [ledgerItems, setLedgerItems] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [openActionForRegId, setOpenActionForRegId] = useState(null)
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null)
  const [familyModal, setFamilyModal] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [isFamilyLoading, setIsFamilyLoading] = useState(false)
  const [receiveFeeModal, setReceiveFeeModal] = useState(null)
  const [receiveFeeMode, setReceiveFeeMode] = useState('family')
  const [manualRcptNo, setManualRcptNo] = useState('')
  const [feeBalance, setFeeBalance] = useState(null)
  const [receiveAmounts, setReceiveAmounts] = useState({})
  const [receiveDate, setReceiveDate] = useState(() => getTodayIso())
  const [isFeeSubmitting, setIsFeeSubmitting] = useState(false)
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false)
  const [receiptResult, setReceiptResult] = useState(null)
  const [isFeeBalanceLoading, setIsFeeBalanceLoading] = useState(false)
  const [classOptions, setClassOptions] = useState([])
  const [error, setError] = useState('')
  const [profileModal, setProfileModal] = useState(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isProfileLedgerLoading, setIsProfileLedgerLoading] = useState(false)
  const [activationModal, setActivationModal] = useState(null)
  const [activationReason, setActivationReason] = useState('')
  const [isActivationSubmitting, setIsActivationSubmitting] = useState(false)
  const [activityLogsModal, setActivityLogsModal] = useState(null)
  const [attendanceModal, setAttendanceModal] = useState(null)
  const [conductModal, setConductModal] = useState(null)
  const [whatsAppModal, setWhatsAppModal] = useState(null)
  const [whatsAppError, setWhatsAppError] = useState('')
  const classSelectOptions = classOptions.map((item) => ({
    value: item.className,
    label: item.className,
  }))

  const loadStudents = useCallback(async (query) => {
    if (!hasCampusPermission('list_std')) {
      setResult({
        items: [],
        totalCount: 0,
        totalPages: 0,
        pageNumber: query.pageNumber || 1,
        pageSize: query.pageSize || 20,
      })
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudents({
        class: query.class || undefined,
        name: query.name?.trim() || undefined,
        reg_Id: query.reg_Id ? Number(query.reg_Id) : undefined,
        isActive:
          query.status === 'all'
            ? undefined
            : query.status === 'active',
        gender: query.gender || undefined,
        isCreditStudent:
          query.creditFilter === 'credit'
            ? true
            : query.creditFilter === 'not_credit'
              ? false
              : undefined,
        sortBy: 'reg_Id',
        sortDirection: 'desc',
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      })

      setResult({
        items: data?.items || [],
        totalCount: data?.totalCount || 0,
        totalPages: data?.totalPages || 0,
        pageNumber: data?.pageNumber || query.pageNumber,
        pageSize: data?.pageSize || query.pageSize,
      })
    } catch {
      setError('Unable to load students. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setIsClassesLoading(true)
    try {
      const classes = await getClasses()
      setClassOptions(classes)
    } catch {
      setClassOptions([])
    } finally {
      setIsClassesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadStudents(initialFilters)
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadStudents])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadClasses()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadClasses])

  useEffect(() => {
    const syncProfile = () => {
      setShowCreditStudent(normalizeCampusProfile(getStoredCampusProfile() || {}).showCreditStudent)
    }
    syncProfile()
    window.addEventListener(CAMPUS_PROFILE_CHANGED_EVENT, syncProfile)
    return () => window.removeEventListener(CAMPUS_PROFILE_CHANGED_EVENT, syncProfile)
  }, [])

  const applyFilters = (patch = {}) => {
    const next = { ...filters, ...patch, pageNumber: 1 }
    setFilters(next)
    loadStudents(next)
  }

  const onFilterBlur = () => {
    const next = { ...filtersRef.current, pageNumber: 1 }
    setFilters(next)
    loadStudents(next)
  }

  const onResetFilters = () => {
    setFilters(initialFilters)
    loadStudents(initialFilters)
  }

  const onDropdownFilterChange = (name, value) => {
    applyFilters({ [name]: value })
  }

  const onStatusFilterChange = (value) => {
    applyFilters({ status: value })
  }

  const onGenderFilterChange = (value) => {
    applyFilters({ gender: value })
  }

  const onCreditFilterChange = (value) => {
    applyFilters({ creditFilter: value })
  }

  const onPageChange = (nextPage) => {
    const next = { ...filters, pageNumber: nextPage }
    setFilters(next)
    loadStudents(next)
  }

  const openWhatsAppConfirm = (number) => {
    setWhatsAppError('')
    setWhatsAppModal({ displayNumber: String(number || '').trim() })
  }

  const closeWhatsAppConfirm = () => {
    setWhatsAppModal(null)
    setWhatsAppError('')
  }

  const confirmWhatsApp = () => {
    if (!whatsAppModal?.displayNumber) return
    const phone = normalizeWhatsAppPhone(whatsAppModal.displayNumber)
    if (!phone) {
      setWhatsAppError('This number is not valid for WhatsApp. Use a mobile number like 03XXXXXXXXX.')
      return
    }
    const url = buildWhatsAppWebUrl(whatsAppModal.displayNumber)
    if (!url) {
      setWhatsAppError('This number is not valid for WhatsApp. Use a mobile number like 03XXXXXXXXX.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    closeWhatsAppConfirm()
  }

  const closeActionMenu = () => {
    setOpenActionForRegId(null)
    setActionMenuAnchorEl(null)
  }

  const toggleActionMenu = (regId, event) => {
    event.stopPropagation()
    if (openActionForRegId === regId) {
      closeActionMenu()
      return
    }
    setOpenActionForRegId(regId)
    setActionMenuAnchorEl(event.currentTarget)
  }

  const openActionStudent =
    openActionForRegId == null
      ? null
      : result.items.find((item) => item.reg_Id === openActionForRegId) || null

  const openLedger = async (student) => {
    closeActionMenu()
    setSelectedStudent(student)
    setIsLedgerLoading(true)
    try {
      const ledger = await getStudentLedger(student.reg_Id)
      setLedgerItems(ledger)
    } catch {
      setLedgerItems([])
    } finally {
      setIsLedgerLoading(false)
    }
  }

  const closeLedger = () => {
    setSelectedStudent(null)
    setLedgerItems([])
  }

  const closeProfileModal = () => {
    setProfileModal(null)
    setIsProfileLedgerLoading(false)
  }

  const openStudentProfile = async (student) => {
    if (!student?.reg_Id) return
    closeActionMenu()
    setIsProfileLoading(true)
    try {
      const detail = await getStudentAdmissionDetail(student.reg_Id)
      setProfileModal({
        detail,
        ledgerItems: [],
        includeLedger: false,
        ledgerLoaded: false,
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load student profile.')
    } finally {
      setIsProfileLoading(false)
    }
  }

  useEffect(() => {
    const raw = searchParams.get('profile')
    if (!raw) return
    const regId = Number.parseInt(raw, 10)
    if (!Number.isFinite(regId) || regId <= 0) {
      setSearchParams({}, { replace: true })
      return
    }
    if (!canViewProfile) {
      toast.error("You don't have access to student profiles.")
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams({}, { replace: true })
    void openStudentProfile({ reg_Id: regId })
    // Deep-link from notification Detail; open once per profile query value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canViewProfile, setSearchParams])

  const toggleProfileLedger = async () => {
    if (!profileModal || isProfileLedgerLoading) return
    if (profileModal.includeLedger) {
      setProfileModal({ ...profileModal, includeLedger: false })
      return
    }
    if (profileModal.ledgerLoaded) {
      setProfileModal({ ...profileModal, includeLedger: true })
      return
    }
    const studentId = profileModal.detail?.regId ?? profileModal.detail?.reg_Id
    if (!studentId) return
    setIsProfileLedgerLoading(true)
    try {
      const ledger = await getStudentLedger(studentId)
      setProfileModal((current) =>
        current
          ? {
              ...current,
              ledgerItems: ledger || [],
              includeLedger: true,
              ledgerLoaded: true,
            }
          : current,
      )
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load the fee ledger.')
    } finally {
      setIsProfileLedgerLoading(false)
    }
  }

  const feeBalanceRowKey = (row) =>
    `${row.studentId}-${row.fundTypeId}-${row.month || 0}-${row.year || 0}`

  const openReceiveFee = async (student, mode = 'family') => {
    closeActionMenu()
    setReceiveFeeModal(student)
    setReceiveFeeMode(mode)
    setManualRcptNo('')
    setFeeBalance(null)
    setReceiveAmounts({})
    setReceiveDate(getTodayIso())
    setIsFeeBalanceLoading(true)
    try {
      const data = await getStudentFeeBalance(student.reg_Id, {
        singleStudent: mode === 'manual',
      })
      const rows = Array.isArray(data?.items) ? data.items : []
      setFeeBalance({ ...data, items: rows })
      setReceiveAmounts(
        rows.reduce((acc, row) => {
          acc[feeBalanceRowKey(row)] = '0'
          return acc
        }, {})
      )
    } catch {
      setFeeBalance({ items: [], totalGenerated: 0, totalReceived: 0, totalDue: 0 })
      setReceiveAmounts({})
    } finally {
      setIsFeeBalanceLoading(false)
    }
  }

  const closeReceiveFee = () => {
    setReceiveFeeModal(null)
    setReceiveFeeMode('family')
    setManualRcptNo('')
    setFeeBalance(null)
    setReceiveAmounts({})
    setIsReceiveConfirmOpen(false)
    setIsFeeSubmitting(false)
  }

  const openActivationModal = (student, mode) => {
    closeActionMenu()
    setActivationReason('')
    setActivationModal({ student, mode })
  }

  const openActivityLogs = (student) => {
    closeActionMenu()
    setActivityLogsModal(student)
  }

  const closeActivityLogs = () => {
    setActivityLogsModal(null)
  }

  const openAttendance = (student) => {
    closeActionMenu()
    setAttendanceModal(student)
  }

  const closeAttendance = () => {
    setAttendanceModal(null)
  }

  const openConduct = (student) => {
    closeActionMenu()
    setConductModal(student)
  }

  const closeConduct = () => {
    setConductModal(null)
  }

  const closeActivationModal = () => {
    if (isActivationSubmitting) return
    setActivationModal(null)
    setActivationReason('')
  }

  const submitActivation = async () => {
    if (!activationModal?.student) return
    const reason = activationReason.trim()
    if (reason.length < 3) {
      toast.error('Please enter a short reason.')
      return
    }

    const { student, mode } = activationModal
    const isActivate = mode === 'activate'
    setIsActivationSubmitting(true)
    const toastId = 'student-activation'
    toast.loading(isActivate ? 'Activating student...' : 'Deactivating student...', { id: toastId })
    try {
      if (isActivate) {
        await activateStudent(student.reg_Id, { description: reason })
        toast.success('Student activated.', { id: toastId })
      } else {
        await deactivateStudent(student.reg_Id, { description: reason })
        toast.success('Student deactivated.', { id: toastId })
      }
      setActivationModal(null)
      setActivationReason('')
      await loadStudents(filters)
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (isActivate ? 'Could not activate student.' : 'Could not deactivate student.'),
        { id: toastId }
      )
    } finally {
      setIsActivationSubmitting(false)
    }
  }

  useEffect(() => {
    if (!activationModal) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeActivationModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activationModal, isActivationSubmitting])

  useEffect(() => {
    if (!familyModal) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFamilyModal(null)
        setFamilyMembers([])
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [familyModal])

  useEffect(() => {
    if (!receiveFeeModal) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeReceiveFee()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [receiveFeeModal])

  useEffect(() => {
    if (!receiveFeeModal) return
    setReceiveDate((current) =>
      canReceiveFeePrevDate ? clampToPakistanToday(current) : getTodayIso(),
    )
  }, [receiveFeeModal, canReceiveFeePrevDate])

  useEffect(() => {
    if (!profileModal) return
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      closeProfileModal()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [profileModal])

  const openFamily = async (student) => {
    const familyId = student.familyID ?? student.FamilyID
    if (familyId == null || familyId === '') {
      return
    }
    setFamilyModal({ familyId: Number(familyId), familyCode: String(familyId) })
    setIsFamilyLoading(true)
    setFamilyMembers([])
    try {
      const rows = await getStudentFamilyMembers(Number(familyId))
      setFamilyMembers(Array.isArray(rows) ? rows : [])
    } catch {
      setFamilyMembers([])
    } finally {
      setIsFamilyLoading(false)
    }
  }

  const closeFamily = () => {
    setFamilyModal(null)
    setFamilyMembers([])
  }

  const familyRowRegId = (row) => row.reg_Id ?? row.regId
  const familyRowName = (row) => row.studentName ?? row.StudentName ?? '-'
  const familyRowClass = (row) => row.className ?? row.ClassName ?? '-'
  const familyRowFather = (row) => row.fatherName ?? row.FatherName ?? '-'
  const familyRowContact = (row) => row.fatherContact ?? row.FatherContact ?? '-'
  const familyRowRegDate = (row) => row.regDate ?? row.RegDate
  const familyRowFee = (row) => Number(row.fee ?? row.Fee ?? 0)
  const familyRowConcession = (row) => Number(row.concession ?? row.Concession ?? 0)
  const familyRowActualFee = (row) => {
    const actual = row.actualFee ?? row.ActualFee
    if (actual != null && actual !== '') return Number(actual)
    return Math.max(0, familyRowFee(row) - familyRowConcession(row))
  }
  const familyFeeTotals = familyMembers.reduce(
    (acc, row) => {
      acc.fee += familyRowFee(row)
      acc.concession += familyRowConcession(row)
      acc.actualFee += familyRowActualFee(row)
      return acc
    },
    { fee: 0, concession: 0, actualFee: 0 },
  )

  const formatDate = (value) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleDateString()
  }

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const validateReceiveAmount = (value, due) => {
    if (value === '') return ''
    const parsed = Number(value || 0)
    const balance = Number(due || 0)
    if (Number.isNaN(parsed) || parsed < 0) return ''
    if (parsed > balance) {
      toast.error(`Amount cannot be greater than balance Rs ${formatAmount(balance)}.`)
      return ''
    }
    return String(Math.floor(parsed))
  }

  const fillAllReceiveAmounts = () => {
    setReceiveAmounts(
      feeBalanceItems.reduce((acc, row) => {
        acc[feeBalanceRowKey(row)] = String(Math.floor(Number(row.due || 0)))
        return acc
      }, {})
    )
  }

  const getReceivableItems = () =>
    feeBalanceItems
      .map((row) => ({
        row,
        amount: Number(receiveAmounts[feeBalanceRowKey(row)] || 0),
      }))
      .filter((item) => item.amount > 0)

  const openReceiveFeeConfirm = () => {
    const receivableItems = getReceivableItems()
    if (receivableItems.length === 0) {
      toast.error('Enter receiving amount for at least one row.')
      return
    }

    if (receiveFeeMode === 'manual' && !manualRcptNo.trim()) {
      toast.error('Enter the manual receipt number.')
      return
    }

    // Re-sync to Pakistan "today" unless previous-date permission allows a chosen (non-future) date.
    if (!canReceiveFeePrevDate) {
      setReceiveDate(getTodayIso())
    } else {
      setReceiveDate((current) => clampToPakistanToday(current))
    }
    setIsReceiveConfirmOpen(true)
  }

  const submitReceiveFee = async () => {
    const receivableItems = getReceivableItems()
    if (receivableItems.length === 0) {
      toast.error('Enter receiving amount for at least one row.')
      setIsReceiveConfirmOpen(false)
      return
    }

    const trimmedManualRcpt = manualRcptNo.trim()
    if (receiveFeeMode === 'manual' && !trimmedManualRcpt) {
      toast.error('Enter the manual receipt number.')
      setIsReceiveConfirmOpen(false)
      return
    }

    setIsFeeSubmitting(true)
    const toastId = 'receive-fee-submit'
    toast.loading('Receiving fee...', { id: toastId })
    try {
      const effectiveDate = clampToPakistanToday(canReceiveFeePrevDate ? receiveDate : getTodayIso())
      setReceiveDate(effectiveDate)
      const payload = {
        date: effectiveDate,
        items: receivableItems.map(({ row, amount }) => ({
          studentId: row.studentId,
          fundTypeId: row.fundTypeId,
          month: row.month,
          year: row.year,
          amount,
        })),
      }
      if (receiveFeeMode === 'manual') {
        payload.manualRcptNo = trimmedManualRcpt
      }
      const result = await receiveStudentFee(payload)
      toast.success('Fee received.', { id: toastId })
      closeReceiveFee()
      await loadStudents(filters)

      const receipts = result?.receipts || []
      if (receipts.length === 1) {
        setReceiptResult(null)
        printFeeReceipts(receipts)
      } else if (receipts.length > 1) {
        setReceiptResult(result)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not receive fee.', { id: toastId })
    } finally {
      setIsFeeSubmitting(false)
    }
  }

  const closingBalance =
    ledgerItems.length > 0 ? ledgerItems[ledgerItems.length - 1]?.balance : null
  const feeBalanceItems = feeBalance?.items || []
  const receiveTotal = Object.values(receiveAmounts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  )
  const hasReceiveAmount = receiveTotal > 0

  const GenderAvatar = ({ gender }) => {
    const normalized = (gender || '').toLowerCase()
    const isFemale = normalized === 'female'

    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
          isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
        }`}
        title={gender || 'Male'}
      >
        {isFemale ? (
          <svg viewBox="0 0 100 100" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              style={{ fill: '#5F3E20', stroke: '#311710' }}
              d="M 24,57 C 31,49 25,27 28,19 32,8 36,1 47,1 c 13,0 20,10 24,20 1,2 0,8 2,14 2,5 -1,10 -1,12 0,5 -1,3 3,10 -7,17 -40,13 -51,0 z"
            />
            <path
              style={{ fill: '#E78FB3', stroke: '#B85D87' }}
              d="m 40,51 c -5,6 -22,4 -25,17 -2,7 -1,30 14,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,61 74,57 63,54 62,51 60,51 58,51 40,51 40,51 z"
            />
            <path
              style={{ fill: '#DEB89F', stroke: '#693311' }}
              d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z"
            />
            <path
              style={{ fill: '#DBBFA8', stroke: '#693311' }}
              d="M 50,50 C 33,50 22,4 49,3.4 73,5 66,50 50,50 z"
            />
            <path
              style={{ fill: '#5F3E20' }}
              d="M 46,12 C 42,17 37,21 32,22 27,23 34,2 47,2 54,2 64,6 66,20 58,21 48,15 46,12"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              style={{ fill: '#427794', stroke: '#2A424F' }}
              d="m 39,52 c -5,6 -20,3 -23,16 -2,7 -2,30 13,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,59 70,55 59,53 62,52 60,52 58,52 39,52 39,52 z"
            />
            <path
              style={{ fill: '#C29B82', stroke: '#693311' }}
              d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z"
            />
            <path
              style={{ fill: '#CDA68E', stroke: '#693311' }}
              d="M 50,50 C 33,50 21,4.1 49,3.4 79,3.3 66,50 50,50 z"
            />
            <path
              style={{ fill: '#553932', stroke: '#311710' }}
              d="M 33,30 C 29,19 29,2.2 49,1.2 66,2.1 72,18 66,30 66,25 67,23 64,19 59,18 52,19 46,12 44,18 30,15 33,30 z"
            />
          </svg>
        )}
      </span>
    )
  }

  return (
    <>
      <CampusShell>
        <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                applyFilters()
              }}
              autoComplete="off"
              className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <School size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Registered Students</h1>
                  <p className="text-sm text-slate-500">
                    Search and manage students with quick filters.
                  </p>
                </div>
                </div>
                <PermissionControl allowed={canAddStudent}>
                <button
                  type="button"
                  onClick={() => navigate('/campus/students/admit')}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white"
                >
                  <Plus size={18} /> Add Student
                </button>
                </PermissionControl>
              </div>

              <div className={showCreditStudent ? 'space-y-2' : undefined}>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 xl:grid-cols-[4.75rem_minmax(0,1fr)_5.25rem]">
                  <input
                    name="filterRegId"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={filters.reg_Id}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '')
                      setFilters((previous) => ({ ...previous, reg_Id: digits }))
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      const next = { ...filtersRef.current, pageNumber: 1 }
                      setFilters(next)
                      loadStudents(next)
                    }}
                    placeholder="Reg ID"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                  />
                  <div
                    className={
                      showCreditStudent
                        ? 'grid min-w-0 grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2 xl:col-span-1'
                        : 'flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center xl:col-span-1 xl:flex-nowrap xl:gap-1.5'
                    }
                  >
                    <div
                      className={
                        showCreditStudent
                          ? 'contents'
                          : 'grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-1.5 xl:min-w-0 xl:flex-[1_1_0]'
                      }
                    >
                    <input
                      name="filterStudentOrFatherName"
                      value={filters.name}
                      onChange={(event) =>
                        setFilters((previous) => ({ ...previous, name: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        const next = { ...filtersRef.current, pageNumber: 1 }
                        setFilters(next)
                        loadStudents(next)
                      }}
                      placeholder="Name or contact"
                      className="h-10 min-w-0 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                    />
                    <div className="min-w-0 w-full">
                      <Select
                        isClearable
                        isSearchable
                        isLoading={isClassesLoading}
                        options={classSelectOptions}
                        placeholder="Search class"
                        value={
                          filters.class
                            ? { value: filters.class, label: filters.class }
                            : null
                        }
                        onChange={(selectedOption) =>
                          onDropdownFilterChange('class', selectedOption?.value || '')
                        }
                        onBlur={onFilterBlur}
                        className="text-sm"
                        styles={{
                          control: (baseStyles) => ({
                            ...baseStyles,
                            minHeight: '40px',
                            height: '40px',
                            borderRadius: '0.5rem',
                          }),
                          valueContainer: (baseStyles) => ({
                            ...baseStyles,
                            paddingTop: 0,
                            paddingBottom: 0,
                          }),
                          menu: (baseStyles) => ({
                            ...baseStyles,
                            zIndex: 60,
                          }),
                        }}
                      />
                    </div>
                    </div>
                    {!showCreditStudent ? (
                      <>
                        <StudentListFilterRadioGroup
                          compact
                          theme="sky"
                          name="student-gender"
                          selectedValue={filters.gender}
                          options={[['', 'All'], ['Male', 'Male'], ['Female', 'Female']]}
                          onChange={onGenderFilterChange}
                          radioClassFn={genderFilterRadioClass}
                        />
                        <StudentListFilterRadioGroup
                          compact
                          theme="emerald"
                          name="student-status"
                          selectedValue={filters.status}
                          options={[['active', 'Active'], ['all', 'All'], ['deactivated', 'Deactivated']]}
                          onChange={onStatusFilterChange}
                          radioClassFn={statusFilterRadioClass}
                        />
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-2 text-sm text-slate-700 hover:bg-slate-50 sm:col-span-2 xl:col-span-1"
                  >
                    <RotateCcw size={14} className="shrink-0 text-slate-500" aria-hidden />
                    Reset
                  </button>
                </div>
                {showCreditStudent ? (
                  <div
                    className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    role="group"
                    aria-label="Student list filters"
                  >
                    <StudentListFilterRadioGroup
                      title="Gender"
                      theme="sky"
                      name="student-gender"
                      selectedValue={filters.gender}
                      options={[['', 'All'], ['Male', 'Male'], ['Female', 'Female']]}
                      onChange={onGenderFilterChange}
                      radioClassFn={genderFilterRadioClass}
                    />
                    <StudentListFilterRadioGroup
                      title="Status"
                      theme="emerald"
                      name="student-status"
                      selectedValue={filters.status}
                      options={[['active', 'Active'], ['all', 'All'], ['deactivated', 'Deactivated']]}
                      onChange={onStatusFilterChange}
                      radioClassFn={statusFilterRadioClass}
                    />
                    <StudentListFilterRadioGroup
                      title="Credit"
                      theme="amber"
                      name="student-credit"
                      selectedValue={filters.creditFilter}
                      options={[['', 'All'], ['credit', 'Credit'], ['not_credit', 'Not credit']]}
                      onChange={onCreditFilterChange}
                      radioClassFn={creditFilterRadioClass}
                    />
                  </div>
                ) : null}
              </div>
            </form>

            <div className="rounded-2xl bg-white shadow-sm">
              {!canListStudents ? (
                <AccessForbiddenPanel
                  title="Student list restricted"
                  message="You don't have access to view the student list."
                  className="m-4 border-0 bg-transparent py-12"
                />
              ) : error ? (
                <p className="p-4 text-sm text-rose-600">{error}</p>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                  <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                  <span className="text-sm font-medium">Fetching students...</span>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-[13px] leading-snug">
                      <thead className="text-left">
                        <tr>
                          <th className="px-3 py-2">Reg ID</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2">Family ID</th>
                          <th className="px-3 py-2">Father</th>
                          {showCreditStudent ? <th className="px-3 py-2">Credit</th> : null}
                          <th className="px-3 py-2">Contact</th>
                          <th className="relative px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((student) => (
                          <tr key={student.reg_Id} className="border-t border-slate-100">
                            <td className="px-3 py-1.5">{student.reg_Id}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <GenderAvatar gender={student.gender} />
                                <span>{student.fullName || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">{student.className || '-'}</td>
                            <td className="px-3 py-1.5">{student.familyID || '-'}</td>
                            <td className="px-3 py-1.5">{student.fatherName || '-'}</td>
                            {showCreditStudent ? (
                              <td className="px-3 py-1.5">
                                {student.isCreditStudent ? (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            ) : null}
                            <td className="px-3 py-1.5">
                              <StudentContactButtons
                                fatherContact={student.fatherContact}
                                motherContact={student.motherContact}
                                onSelect={openWhatsAppConfirm}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <PermissionControl allowed={canReceiveFee}>
                                  <button
                                    type="button"
                                    title="Receive Fee (Family)"
                                    aria-label="Receive Fee (Family)"
                                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50"
                                    onClick={() => openReceiveFee(student, 'family')}
                                  >
                                    <ReceiptText size={15} />
                                  </button>
                                </PermissionControl>
                                <button
                                  type="button"
                                  aria-haspopup="menu"
                                  aria-expanded={openActionForRegId === student.reg_Id}
                                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                  onClick={(event) => toggleActionMenu(student.reg_Id, event)}
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {result.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                              No students found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {result.items.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-500">
                        No students found.
                      </div>
                    ) : (
                      result.items.map((student) => (
                        <article
                          key={student.reg_Id}
                          className="relative rounded-xl border border-slate-200 p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs text-slate-400">Reg ID</p>
                                  <p className="font-semibold text-slate-800">{student.reg_Id}</p>
                                </div>
                                {student.isActive ? (
                                  <span className="shrink-0 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                                    Active
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="flex items-center gap-2 font-medium text-slate-700">
                                <GenderAvatar gender={student.gender} />
                                <span className="truncate">{student.fullName || '-'}</span>
                              </p>
                            </div>
                            <div className="shrink-0">
                              <div className="inline-flex items-center gap-1">
                                <PermissionControl allowed={canReceiveFee}>
                                  <button
                                    type="button"
                                    title="Receive Fee (Family)"
                                    aria-label="Receive Fee (Family)"
                                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50"
                                    onClick={() => openReceiveFee(student, 'family')}
                                  >
                                    <ReceiptText size={18} />
                                  </button>
                                </PermissionControl>
                                <button
                                  type="button"
                                  aria-haspopup="menu"
                                  aria-expanded={openActionForRegId === student.reg_Id}
                                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                  onClick={(event) => toggleActionMenu(student.reg_Id, event)}
                                >
                                  <MoreVertical size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <p>Class: {student.className || '-'}</p>
                            <p>Family ID: {student.familyID || '-'}</p>
                            <p>Father: {student.fatherName || '-'}</p>
                            {showCreditStudent ? (
                              <p>
                                Credit:{' '}
                                {student.isCreditStudent ? (
                                  <span className="font-medium text-amber-800">Yes</span>
                                ) : (
                                  '—'
                                )}
                              </p>
                            ) : null}
                            <p className="col-span-2">
                              Contact:{' '}
                              <StudentContactButtons
                                fatherContact={student.fatherContact}
                                motherContact={student.motherContact}
                                onSelect={openWhatsAppConfirm}
                              />
                            </p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 p-4">
                    <p className="text-sm text-slate-500">Total: {result.totalCount}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPageChange(Math.max(1, result.pageNumber - 1))}
                        disabled={result.pageNumber <= 1}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {result.pageNumber} / {Math.max(result.totalPages, 1)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onPageChange(Math.min(result.totalPages || 1, result.pageNumber + 1))
                        }
                        disabled={result.pageNumber >= result.totalPages}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      </CampusShell>

      {isProfileLoading && !profileModal ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-xl">
            <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
            Loading profile…
          </div>
        </div>
      ) : null}

      {profileModal ? (
        <StudentProfileModal
          detail={profileModal.detail}
          ledgerItems={profileModal.ledgerItems}
          includeLedger={profileModal.includeLedger}
          isLedgerLoading={isProfileLedgerLoading}
          onToggleLedger={canViewLedger ? toggleProfileLedger : undefined}
          onClose={closeProfileModal}
          onPrint={() =>
            printStudentProfile({
              detail: profileModal.detail,
              ledgerItems: profileModal.ledgerItems,
              includeLedger: profileModal.includeLedger,
            })
          }
        />
      ) : null}

      <FloatingMenu
        open={Boolean(openActionStudent)}
        anchorEl={actionMenuAnchorEl}
        onClose={closeActionMenu}
        preferredWidth={210}
        className="min-w-52 w-max max-w-[16.5rem] rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
      >
        {openActionStudent ? (
          <>
            <PermissionControl allowed={canEditStudent} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  closeActionMenu()
                  navigate(`/campus/students/admit/${openActionStudent.reg_Id}`)
                }}
              >
                <Pencil size={16} className="shrink-0 text-indigo-600" />
                Edit
              </button>
            </PermissionControl>
            <PermissionControl allowed={canViewProfile} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => void openStudentProfile(openActionStudent)}
              >
                <IdCard size={16} className="shrink-0 text-sky-600" />
                Profile
              </button>
            </PermissionControl>
            <PermissionControl allowed={canReceiveFee} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openReceiveFee(openActionStudent, 'family')}
              >
                <ReceiptText size={16} className="shrink-0 text-emerald-600" />
                Receive Fee (Family)
              </button>
            </PermissionControl>
            <PermissionControl allowed={canReceiveFee} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openReceiveFee(openActionStudent, 'manual')}
              >
                <ReceiptText size={16} className="shrink-0 text-amber-600" />
                Receive Fee (Manual)
              </button>
            </PermissionControl>
            <PermissionControl allowed={canViewLedger} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openLedger(openActionStudent)}
              >
                <FileBarChart2 size={16} className="shrink-0 text-indigo-600" />
                Ledger
              </button>
            </PermissionControl>
            <PermissionControl allowed={canViewLogs} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openActivityLogs(openActionStudent)}
              >
                <History size={16} className="shrink-0 text-amber-600" />
                Logs
              </button>
            </PermissionControl>
            <PermissionControl allowed={canListStudents} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openAttendance(openActionStudent)}
              >
                <CalendarCheck2 size={16} className="shrink-0 text-emerald-600" />
                Attendance
              </button>
            </PermissionControl>
            <PermissionControl allowed={canViewConduct} className="block w-full">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => openConduct(openActionStudent)}
              >
                <ClipboardCheck size={16} className="shrink-0 text-fuchsia-600" />
                Conduct
              </button>
            </PermissionControl>
            <PermissionControl allowed={canListStudents} className="block w-full">
              <button
                type="button"
                role="menuitem"
                disabled={!(openActionStudent.familyID ?? openActionStudent.FamilyID)}
                title={
                  !(openActionStudent.familyID ?? openActionStudent.FamilyID)
                    ? 'No family ID on record'
                    : undefined
                }
                className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (openActionStudent.familyID ?? openActionStudent.FamilyID) {
                    closeActionMenu()
                    openFamily(openActionStudent)
                  }
                }}
              >
                <UsersRound size={16} className="shrink-0 text-indigo-600" />
                Family fee
              </button>
            </PermissionControl>
            {openActionStudent.isActive ? (
              <PermissionControl allowed={canActivateStudent} className="block w-full">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => openActivationModal(openActionStudent, 'deactivate')}
                >
                  <UserX size={16} className="shrink-0 text-rose-600" />
                  Deactivate
                </button>
              </PermissionControl>
            ) : (
              <PermissionControl allowed={canActivateStudent} className="block w-full">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => openActivationModal(openActionStudent, 'activate')}
                >
                  <UserCheck size={16} className="shrink-0 text-emerald-600" />
                  Activate
                </button>
              </PermissionControl>
            )}
          </>
        ) : null}
      </FloatingMenu>

      {activityLogsModal ? (
        <StudentActivityLogsModal student={activityLogsModal} onClose={closeActivityLogs} />
      ) : null}

      {attendanceModal ? (
        <StudentAttendanceModal student={attendanceModal} onClose={closeAttendance} />
      ) : null}

      {conductModal ? (
        <StudentConductModal student={conductModal} onClose={closeConduct} />
      ) : null}

      {whatsAppModal ? (
        <div
          className="fixed inset-0 z-[84] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
          role="presentation"
          onClick={closeWhatsAppConfirm}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">WhatsApp</p>
                <h2 id="whatsapp-modal-title" className="mt-0.5 text-lg font-semibold text-slate-900">
                  Open WhatsApp chat?
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  This will open WhatsApp Web for{' '}
                  <span className="font-semibold text-slate-700">{whatsAppModal.displayNumber}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWhatsAppConfirm}
                className="rounded-lg p-2 text-slate-600 hover:bg-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {whatsAppError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {whatsAppError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeWhatsAppConfirm}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmWhatsApp}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activationModal ? (
        <div
          className="fixed inset-0 z-[84] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
          role="presentation"
          onClick={closeActivationModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activation-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {activationModal.mode === 'activate' ? 'Activate student' : 'Deactivate student'}
                </p>
                <h2 id="activation-modal-title" className="mt-0.5 truncate text-lg font-semibold text-slate-900">
                  {activationModal.student.fullName || `Student ${activationModal.student.reg_Id}`}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Reg #{activationModal.student.reg_Id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeActivationModal}
                disabled={isActivationSubmitting}
                className="rounded-lg p-2 text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason</span>
                <textarea
                  value={activationReason}
                  onChange={(event) => setActivationReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  disabled={isActivationSubmitting}
                  placeholder="Enter a short reason..."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeActivationModal}
                  disabled={isActivationSubmitting}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitActivation()}
                  disabled={isActivationSubmitting || activationReason.trim().length < 3}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    activationModal.mode === 'activate'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isActivationSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {activationModal.mode === 'activate' ? 'Activate' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedStudent ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  Ledger - {selectedStudent.fullName || selectedStudent.reg_Id}
                </h2>
                <p className="text-sm text-slate-500">Reg ID: {selectedStudent.reg_Id}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    printStudentFeeLedger({
                      student: selectedStudent,
                      items: ledgerItems,
                    })
                  }
                  disabled={isLedgerLoading || ledgerItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[#34457c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  type="button"
                  onClick={closeLedger}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto p-4">
              {isLedgerLoading ? (
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-[var(--campus-primary)]" />
                  <span>Loading ledger...</span>
                </div>
              ) : ledgerItems.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No ledger entries found.</p>
              ) : (
                <>
                  <table className="min-w-full text-[13px] leading-snug">
                    <thead className="text-left">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerItems.map((entry) => (
                        <tr key={entry.id} className="border-t border-slate-100">
                          <td className="px-3 py-1.5">{formatDate(entry.date)}</td>
                          <td className="px-3 py-1.5">{entry.description || '-'}</td>
                          <td className="px-3 py-1.5 text-right">{formatAmount(entry.debit)}</td>
                          <td className="px-3 py-1.5 text-right">{formatAmount(entry.credit)}</td>
                          <td className="px-3 py-1.5 text-right font-semibold">
                            {formatAmount(entry.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                    <p className="text-base font-extrabold text-slate-800">
                      Closing Balance: {formatAmount(closingBalance)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {receiveFeeModal ? (
        <div
          className="fixed inset-0 z-[84] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
          role="presentation"
        >
          <style>
            {'@keyframes feeModalIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}'}
          </style>
          <div
            className="relative max-h-[96vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
            style={{ animation: 'feeModalIn 180ms ease-out' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-fee-modal-title"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 ring-1 ring-violet-100">
                    {receiveFeeMode === 'manual' ? 'Receive Fee (Manual)' : 'Receive Fee (Family)'}
                  </p>
                  <h2 id="receive-fee-modal-title" className="truncate text-xl font-bold text-slate-900">
                  {receiveFeeModal.fullName || `Student ${receiveFeeModal.reg_Id}`}
                  </h2>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-4">
                <p className="whitespace-nowrap text-sm text-slate-500">
                  Reg #{receiveFeeModal.reg_Id} - Family #{feeBalance?.familyCode ?? receiveFeeModal.familyID ?? '-'}
                </p>
                <button
                  type="button"
                  onClick={closeReceiveFee}
                  disabled={isFeeSubmitting}
                  className="rounded-lg p-2 text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close receive fee"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(96vh-58px)] overflow-auto p-3">
              {isFeeBalanceLoading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                  <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                  <span className="text-sm font-medium">Loading pending fee...</span>
                </div>
              ) : feeBalanceItems.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm font-medium text-emerald-700">
                  {receiveFeeMode === 'manual'
                    ? 'No pending fee found for this student.'
                    : 'No pending fee found for this family.'}
                </div>
              ) : (
                <>
                  <div className="mb-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-t-4 border-slate-200 border-t-[var(--campus-primary)] bg-white p-3">
                      <p className="text-xs uppercase text-slate-400">Generated</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">Rs {formatAmount(feeBalance?.totalGenerated)}</p>
                    </div>
                    <div className="rounded-xl border border-t-4 border-slate-200 border-t-sky-500 bg-white p-3">
                      <p className="text-xs uppercase text-slate-400">Received</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">Rs {formatAmount(feeBalance?.totalReceived)}</p>
                    </div>
                    <div className="rounded-xl border border-t-4 border-slate-200 border-t-rose-500 bg-white p-3">
                      <p className="text-xs uppercase text-slate-400">Due</p>
                      <p className="mt-1 text-xl font-bold text-rose-600">Rs {formatAmount(feeBalance?.totalDue)}</p>
                    </div>
                    <div className="rounded-xl border border-t-4 border-emerald-200 border-t-emerald-500 bg-emerald-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase text-emerald-700">Pay</p>
                          <p className="mt-1 text-xl font-bold text-emerald-800">Rs {formatAmount(receiveTotal)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={fillAllReceiveAmounts}
                          disabled={isFeeSubmitting}
                          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Pay all
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full table-fixed text-[13px] leading-snug">
                      <colgroup>
                        <col className="w-[7%]" />
                        <col className="w-[25%]" />
                        <col className="w-[14%]" />
                        <col className="w-[12%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                      </colgroup>
                      <thead className="bg-[#34457c] text-left text-white">
                        <tr>
                          <th className="px-2 py-2">Reg #</th>
                          <th className="px-2 py-2">Student</th>
                          <th className="px-2 py-2">Class/Section</th>
                          <th className="px-2 py-2">Type</th>
                          <th className="px-2 py-2">Month</th>
                          <th className="px-2 py-2 text-right">Total</th>
                          <th className="px-2 py-2 text-right">Paid</th>
                          <th className="px-2 py-2 text-right">Due</th>
                          <th className="px-2 py-2 text-center">Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeBalanceItems.map((row) => {
                          const key = feeBalanceRowKey(row)
                          return (
                            <tr key={key} className="border-t border-slate-100">
                              <td className="px-2 py-1.5 font-medium text-slate-800">{row.studentId}</td>
                              <td className="truncate px-2 py-1.5" title={row.studentName}>{row.studentName}</td>
                              <td className="truncate px-2 py-1.5" title={row.className || '-'}>{row.className || '-'}</td>
                              <td className="truncate px-2 py-1.5" title={row.fundTypeName}>{row.fundTypeName}</td>
                              <td className="px-2 py-1.5">{row.periodLabel || '-'}</td>
                              <td className="px-2 py-1.5 text-right">{formatAmount(row.generated)}</td>
                              <td className="px-2 py-1.5 text-right">{formatAmount(row.received)}</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-rose-600">{formatAmount(row.due)}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={Number(row.due || 0)}
                                  step="1"
                                  value={receiveAmounts[key] ?? '0'}
                                  disabled={isFeeSubmitting}
                                  onChange={(event) =>
                                    setReceiveAmounts((previous) => ({
                                      ...previous,
                                      [key]: validateReceiveAmount(event.target.value, row.due),
                                    }))
                                  }
                                  className="mx-auto block w-full max-w-20 rounded-lg border border-slate-300 px-2 py-2 text-right font-semibold text-slate-800 focus:border-[var(--campus-primary)] focus:outline-none focus:ring-2 focus:ring-[#405189]/15"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                        <tr>
                          <td colSpan={4} className="px-3 py-3">
                            <div className="flex flex-wrap items-end gap-4">
                              <label className="flex max-w-xs items-center gap-2 text-sm font-semibold">
                                Date
                                <span
                                  className="inline-flex"
                                  title={
                                    canReceiveFeePrevDate
                                      ? undefined
                                      : "You don't have access to receive fee on a previous date."
                                  }
                                >
                                  <input
                                    type="date"
                                    value={clampToPakistanToday(receiveDate)}
                                    max={getTodayIso()}
                                    onChange={(event) => {
                                      if (!canReceiveFeePrevDate) {
                                        setReceiveDate(getTodayIso())
                                        return
                                      }
                                      setReceiveDate(clampToPakistanToday(event.target.value))
                                    }}
                                    disabled={isFeeSubmitting || !canReceiveFeePrevDate}
                                    className="rounded-lg border border-slate-300 px-3 py-2 font-normal disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                  />
                                </span>
                              </label>
                              {receiveFeeMode === 'manual' ? (
                                <label className="flex min-w-[14rem] flex-1 items-center gap-2 text-sm font-semibold">
                                  Manual receipt no.
                                  <input
                                    type="text"
                                    value={manualRcptNo}
                                    onChange={(event) => setManualRcptNo(event.target.value)}
                                    disabled={isFeeSubmitting}
                                    required
                                    placeholder="Required"
                                    className="w-full max-w-[12rem] rounded-lg border border-slate-300 px-3 py-2 font-normal focus:border-[var(--campus-primary)] focus:outline-none focus:ring-2 focus:ring-[#405189]/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                                  />
                                </label>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">Total</td>
                          <td className="px-3 py-3 text-right">{formatAmount(feeBalance?.totalGenerated)}</td>
                          <td className="px-3 py-3 text-right">{formatAmount(feeBalance?.totalReceived)}</td>
                          <td className="px-3 py-3 text-right">{formatAmount(feeBalance?.totalDue)}</td>
                          <td className="px-2 py-1.5 text-center">{formatAmount(receiveTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={openReceiveFeeConfirm}
                      disabled={!hasReceiveAmount || isFeeSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#34457c] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isFeeSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      {isFeeSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {isReceiveConfirmOpen ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                      <ReceiptText size={21} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                        Confirm Receive Fee
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">Receive Rs {formatAmount(receiveTotal)}?</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        This will save receiving entries for {getReceivableItems().length} selected row
                        {getReceivableItems().length === 1 ? '' : 's'}
                        {receiveFeeMode === 'manual' && manualRcptNo.trim()
                          ? ` with manual receipt ${manualRcptNo.trim()}.`
                          : '.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Date: <span className="font-semibold text-slate-900">{formatPakistanDateDisplay(clampToPakistanToday(receiveDate))}</span>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReceiveConfirmOpen(false)}
                      disabled={isFeeSubmitting}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitReceiveFee}
                      disabled={isFeeSubmitting}
                      className="inline-flex min-w-24 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#34457c] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isFeeSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      {isFeeSubmitting ? 'Saving...' : 'Yes'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {receiptResult?.receipts?.length > 1 ? (
        <div
          className="fixed inset-0 z-[86] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
          role="presentation"
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-picker-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  Receipts Ready
                </p>
                <h2 id="receipt-picker-title" className="mt-1 text-2xl font-bold text-slate-900">
                  Print fee receipts
                </h2>
                <p className="text-sm text-slate-500">
                  Transaction #{receiptResult.transactionId} - {receiptResult.receipts.length} students
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptResult(null)}
                className="rounded-lg p-2 text-slate-600 hover:bg-white"
                aria-label="Close receipt picker"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => printFeeReceipts(receiptResult.receipts)}
                  className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#34457c]"
                >
                  Print All
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {receiptResult.receipts.map((receipt) => (
                  <button
                    key={`${receipt.studentId}-${receipt.receiptId}`}
                    type="button"
                    onClick={() => printFeeReceipts([receipt])}
                    className="rounded-xl border border-t-4 border-slate-200 border-t-[var(--campus-primary)] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-slate-900">{receipt.studentName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Reg #{receipt.studentId} - Receipt #{receipt.receiptId}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{receipt.className || '-'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs uppercase text-slate-400">Received</p>
                        <p className="text-lg font-bold text-emerald-700">Rs {formatAmount(receipt.totalReceived)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {familyModal ? (
        <div
          className="fixed inset-0 z-[82] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={closeFamily}
          role="presentation"
        >
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-modal-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 id="family-modal-title" className="text-xl font-semibold text-slate-800">
                  Family fee
                </h2>
                <p className="text-sm text-slate-500">
                  Family ID {familyModal.familyCode} — students linked to the same family record
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-3">
                {!isFamilyLoading && familyMembers.length > 0 ? (
                  <div className="max-w-[14rem] text-right text-sm sm:max-w-xs">
                    <p className="font-semibold text-slate-800">{familyRowFather(familyMembers[0])}</p>
                    <p className="mt-0.5 text-slate-600">{familyRowContact(familyMembers[0])}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    printFamilyFeeDetail({
                      familyId: familyModal.familyCode,
                      members: familyMembers,
                    })
                  }
                  disabled={isFamilyLoading || familyMembers.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[#34457c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  type="button"
                  onClick={closeFamily}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Close family fee"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto p-4">
              {isFamilyLoading ? (
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-[var(--campus-primary)]" />
                  <span>Loading family members...</span>
                </div>
              ) : familyMembers.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No students found for this family.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px] leading-snug">
                    <thead className="text-left">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">DOA</th>
                        <th className="px-3 py-2">Student Name</th>
                        <th className="px-3 py-2">Father Name</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2 text-right">Fee</th>
                        <th className="px-3 py-2 text-right">Concession</th>
                        <th className="px-3 py-2 text-right">Actual Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyMembers.map((row, index) => (
                        <tr key={familyRowRegId(row)} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-500">{index + 1}</td>
                          <td className="px-3 py-1.5">{familyRowRegId(row) ?? '-'}</td>
                          <td className="px-3 py-1.5">{formatDate(familyRowRegDate(row))}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-800">{familyRowName(row)}</td>
                          <td className="px-3 py-1.5">{familyRowFather(row)}</td>
                          <td className="px-3 py-1.5">{familyRowClass(row)}</td>
                          <td className="px-3 py-1.5 text-right">{formatAmount(familyRowFee(row))}</td>
                          <td className="px-3 py-1.5 text-right">{formatAmount(familyRowConcession(row))}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-800">
                            {formatAmount(familyRowActualFee(row))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                        <td className="px-3 py-2" colSpan={6}>
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">{formatAmount(familyFeeTotals.fee)}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(familyFeeTotals.concession)}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(familyFeeTotals.actualFee)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default StudentsPage

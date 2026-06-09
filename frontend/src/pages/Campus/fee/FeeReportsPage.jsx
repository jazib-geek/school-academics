import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  getFeeCollectionInInterval,
  getFeeCollectionOnDate,
  getFeeDefaulters,
  getFundTypes,
  getFundDefaulters,
  getExpectedIncome,
  getOverallReceivable,
} from '../../../services/feeReportService'

const reportTypes = [
  { value: 'date', label: 'Fee Collection on Date' },
  { value: 'interval', label: 'Fee Collection in Interval' },
  { value: 'defaulters', label: 'Fee Defaulters (Month/Year)' },
  { value: 'fund-defaulters', label: 'Fund Defaulters by Fund Type' },
  { value: 'overall', label: 'Overall Receivable' },
  { value: 'expected-income', label: 'Expected Income Report' },
]

const todayIso = new Date().toISOString().slice(0, 10)
const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((value) => ({
  value: String(value),
  label: String(value),
}))

const toWordsUnder1000 = (value) => {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (value < 20) return ones[value]
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`
  const rem = value % 100
  return `${ones[Math.floor(value / 100)]} Hundred${rem ? ` ${toWordsUnder1000(rem)}` : ''}`
}

const numberToWords = (num) => {
  const n = Number(num || 0)
  if (!n) return 'Zero'
  const parts = []
  const units = [
    { value: 10000000, label: 'Crore' },
    { value: 100000, label: 'Lac' },
    { value: 1000, label: 'Thousand' },
  ]
  let rem = Math.floor(n)
  for (const unit of units) {
    if (rem >= unit.value) {
      const q = Math.floor(rem / unit.value)
      parts.push(`${toWordsUnder1000(q)} ${unit.label}`)
      rem %= unit.value
    }
  }
  if (rem > 0) parts.push(toWordsUnder1000(rem))
  return parts.join(' ')
}

function FeeReportsPage() {
  const campus = localStorage.getItem('campus') || 'N/A'

  const [reportType, setReportType] = useState('date')
  const [date, setDate] = useState(todayIso)
  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [month, setMonth] = useState(String(currentMonth))
  const [year, setYear] = useState(String(currentYear))
  const [fundTypeId, setFundTypeId] = useState('')
  const [fundTypeOptions, setFundTypeOptions] = useState([])
  const [report, setReport] = useState({ totalRecords: 0, totalAmount: 0, items: [] })
  const [expectedIncome, setExpectedIncome] = useState({
    dateFrom: '',
    dateTo: '',
    tuitionByMonth: [],
    fundsOverall: [],
    tuitionTotal: 0,
    fundsTotal: 0,
    netTotal: 0,
    activeStudentCount: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReport = async () => {
    setIsLoading(true)
    setError('')
    try {
      let data
      if (reportType === 'date') {
        data = await getFeeCollectionOnDate(date)
      } else if (reportType === 'interval') {
        data = await getFeeCollectionInInterval(dateFrom, dateTo)
      } else if (reportType === 'defaulters') {
        data = await getFeeDefaulters(Number(month), Number(year))
      } else if (reportType === 'fund-defaulters') {
        if (!fundTypeId) {
          setError('No annual fund types found for this campus.')
          setReport({ totalRecords: 0, totalAmount: 0, items: [] })
          setIsLoading(false)
          return
        }
        data = await getFundDefaulters(Number(fundTypeId))
      } else if (reportType === 'expected-income') {
        data = await getExpectedIncome(dateFrom, dateTo)
        setExpectedIncome({
          dateFrom: data?.dateFrom || dateFrom,
          dateTo: data?.dateTo || dateTo,
          tuitionByMonth: data?.tuitionByMonth || [],
          fundsOverall: data?.fundsOverall || [],
          tuitionTotal: data?.tuitionTotal || 0,
          fundsTotal: data?.fundsTotal || 0,
          netTotal: data?.netTotal || 0,
          activeStudentCount: data?.activeStudentCount || 0,
        })
        setReport({ totalRecords: 0, totalAmount: 0, items: [] })
        return
      } else {
        data = await getOverallReceivable()
      }

      setReport({
        totalRecords: data?.totalRecords || 0,
        totalAmount: data?.totalAmount || 0,
        items: data?.items || [],
      })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load fee report.')
      setReport({ totalRecords: 0, totalAmount: 0, items: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const amountLabel = useMemo(
    () =>
      Number(report.totalAmount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [report.totalAmount],
  )

  const classGroupedRows = useMemo(() => {
    const sorted = [...(report.items || [])].sort((a, b) => {
      const classA = (a.className || 'Unassigned').toLowerCase()
      const classB = (b.className || 'Unassigned').toLowerCase()
      if (classA < classB) return -1
      if (classA > classB) return 1

      const studentA = (a.studentName || '').toLowerCase()
      const studentB = (b.studentName || '').toLowerCase()
      if (studentA < studentB) return -1
      if (studentA > studentB) return 1

      return Number(a.studentId || 0) - Number(b.studentId || 0)
    })

    const rows = []
    let lastClass = ''
    for (const item of sorted) {
      const currentClass = item.className || 'Unassigned'
      if (currentClass !== lastClass) {
        rows.push({
          __type: 'class-header',
          className: currentClass,
        })
        lastClass = currentClass
      }
      rows.push({
        __type: 'data',
        ...item,
      })
    }
    return rows
  }, [report.items])

  const schoolName = localStorage.getItem('schoolName') || 'Jazib School'
  const schoolLogoUrl =
    localStorage.getItem('schoolLogoUrl') || localStorage.getItem('instituteLogo') || ''

  const selectedReportLabel =
    reportTypes.find((item) => item.value === reportType)?.label || 'Fee Reports'

  const selectedMonthLabel =
    monthOptions.find((option) => option.value === month)?.label || month

  const filterSummary = useMemo(() => {
    if (reportType === 'date') {
      return `Date: ${date || '-'}`
    }
    if (reportType === 'interval') {
      return `From: ${dateFrom || '-'}  To: ${dateTo || '-'}`
    }
    if (reportType === 'defaulters') {
      return `Month/Year: ${selectedMonthLabel} ${year || ''}`.trim()
    }
    if (reportType === 'fund-defaulters') {
      const fundLabel = fundTypeOptions.find((option) => String(option.id) === String(fundTypeId))?.name || '-'
      return `Fund Type: ${fundLabel}`
    }
    if (reportType === 'expected-income') {
      return `From: ${dateFrom || '-'}  To: ${dateTo || '-'}`
    }
    return 'All active students'
  }, [date, dateFrom, dateTo, fundTypeId, fundTypeOptions, reportType, selectedMonthLabel, year])

  const showFundAndMonthColumns = reportType !== 'overall'

  const formatMonthYear = (monthValue, yearValue) => {
    if (!monthValue || !yearValue) {
      return '-'
    }
    const monthName = monthOptions.find((option) => Number(option.value) === Number(monthValue))?.label
    return monthName ? `${monthName} ${yearValue}` : `${monthValue}/${yearValue}`
  }

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  const formatDateReadable = (value) => {
    if (!value) return '-'
    const dateObj = new Date(value)
    if (Number.isNaN(dateObj.getTime())) return value
    return dateObj.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const expectedReportMonthLabel = useMemo(() => {
    const base = expectedIncome.dateTo || dateTo
    const dateObj = new Date(base)
    if (Number.isNaN(dateObj.getTime())) return '-'
    return dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }, [dateTo, expectedIncome.dateTo])

  const expectedNetInWords = useMemo(() => {
    return `${numberToWords(expectedIncome.netTotal)} Only`
  }, [expectedIncome.netTotal])

  useEffect(() => {
    const loadFundTypes = async () => {
      try {
        const options = await getFundTypes()
        setFundTypeOptions(options)
        if (options.length > 0) {
          setFundTypeId(String(options[0].id))
        }
      } catch {
        setFundTypeOptions([])
      }
    }

    loadFundTypes()
  }, [])

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html, body, #root {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page-root,
          .print-main-wrap,
          .print-content-wrap {
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
          .print-main-wrap {
            min-height: auto !important;
          }
          .print-content-wrap {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-report-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            gap: 16px !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding-bottom: 10px !important;
            margin-bottom: 10px !important;
          }
          .print-only { display: block !important; }
          .hide-in-print { display: none !important; }
          .print-table-wrap {
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px !important;
          }
          .print-table thead th {
            color: #0f172a !important;
            background: #eef2ff !important;
          }
          .print-table tr { page-break-inside: avoid !important; }
          .expected-sheet {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .expected-grid-two {
            grid-template-columns: 1fr 1fr !important;
          }
          body { background: #fff !important; }
        }
      `}</style>
      <CampusShell
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
          <div className="print-content-wrap space-y-5 p-4 pt-20 md:p-6 md:pt-24">
            <section className="print-area rounded-2xl bg-white p-5 shadow-sm">
              {reportType !== 'expected-income' ? (
              <div className="print-only hidden print-report-header">
                <div className="flex items-start gap-3">
                  {schoolLogoUrl ? (
                    <img src={schoolLogoUrl} alt="School logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded border border-slate-300 text-xs font-bold text-slate-600">
                      {schoolName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-bold text-slate-900">{schoolName}</p>
                    <p className="text-xs text-slate-600">Campus: {campus}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-900">{selectedReportLabel}</p>
                  <p className="text-xs text-slate-600">{filterSummary}</p>
                </div>
              </div>
              ) : null}

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 hide-in-print">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Fee Reports</h1>
                  <p className="text-sm text-slate-500">Campus wise reports for active students only.</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Print Report
                </button>
              </div>

              <div className="no-print grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="text-xs font-medium text-slate-600">
                  Report Type
                  <select
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    {reportTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {reportType === 'date' && (
                  <label className="text-xs font-medium text-slate-600">
                    Date
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </label>
                )}

                {(reportType === 'interval' || reportType === 'expected-income') && (
                  <>
                    <label className="text-xs font-medium text-slate-600">
                      Date From
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Date To
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>
                  </>
                )}

                {reportType === 'defaulters' && (
                  <>
                    <label className="text-xs font-medium text-slate-600">
                      Month
                      <select
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      >
                        {monthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Year
                      <select
                        value={year}
                        onChange={(event) => setYear(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      >
                        {yearOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {reportType === 'fund-defaulters' && (
                  <label className="text-xs font-medium text-slate-600">
                    Fund Type
                    <select
                      value={fundTypeId}
                      onChange={(event) => setFundTypeId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      {fundTypeOptions.length === 0 ? (
                        <option value="">No fund types available</option>
                      ) : null}
                      {fundTypeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 no-print">
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={isLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? <Loader2 size={16} className="mr-2 inline animate-spin" /> : null}
                  Load Report
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {reportType !== 'expected-income' ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 hide-in-print">
                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs text-indigo-600">Total Records</p>
                      <p className="text-xl font-semibold text-indigo-900">{report.totalRecords}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                      <p className="text-xs text-emerald-600">Total Amount</p>
                      <p className="text-xl font-semibold text-emerald-900">Rs {amountLabel}</p>
                    </div>
                  </div>

                  <div className="print-table-wrap mt-5 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="print-table min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Student ID</th>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">Class</th>
                          {showFundAndMonthColumns ? <th className="px-3 py-2">Fund</th> : null}
                          {showFundAndMonthColumns ? <th className="px-3 py-2">Month/Year</th> : null}
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classGroupedRows.map((row, index) => {
                          if (row.__type === 'class-header') {
                            return (
                              <tr key={`class-${row.className}-${index}`} className="border-t border-slate-100 bg-slate-100/80">
                                <td colSpan={showFundAndMonthColumns ? 6 : 4} className="px-3 py-2 text-sm font-semibold text-slate-800">
                                   {row.className}
                                </td>
                              </tr>
                            )
                          }

                          const amount = row.received ?? row.outstandingAmount ?? 0
                          const monthYear = formatMonthYear(row.month, row.year)
                          return (
                            <tr
                              key={`${row.studentId}-${row.fundTypeId || 0}-${row.month || 0}-${row.year || 0}-${amount}-${index}`}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-2">{row.studentId}</td>
                              <td className="px-3 py-2">{row.studentName || '-'}</td>
                              <td className="px-3 py-2">{row.className || '-'}</td>
                              {showFundAndMonthColumns ? <td className="px-3 py-2">{row.fundTypeName || '-'}</td> : null}
                              {showFundAndMonthColumns ? <td className="px-3 py-2">{monthYear}</td> : null}
                              <td className="px-3 py-2 text-right">{formatAmount(amount)}</td>
                            </tr>
                          )
                        })}
                        {classGroupedRows.length > 0 ? (
                          <tr className="bg-slate-50 font-semibold">
                            <td colSpan={showFundAndMonthColumns ? 5 : 3} className="px-3 py-2 text-right">
                              Total
                            </td>
                            <td className="px-3 py-2 text-right">{formatAmount(report.totalAmount)}</td>
                          </tr>
                        ) : null}
                        {classGroupedRows.length === 0 ? (
                          <tr>
                            <td colSpan={showFundAndMonthColumns ? 6 : 4} className="px-3 py-6 text-center text-slate-500">
                              No report rows found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="expected-sheet mt-5 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
                  <div className="grid items-start gap-4 md:grid-cols-[120px_1fr_260px]">
                    <div className="flex items-center justify-center">
                      {schoolLogoUrl ? (
                        <img src={schoolLogoUrl} alt="School logo" className="h-16 w-16 object-contain" />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded border border-slate-300 text-sm font-bold text-slate-600">
                          {schoolName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-slate-800">Monthly Estimated Income Report</h2>
                    </div>
                    <table className="print-table w-full text-xs">
                      <tbody>
                        <tr><td className="px-2 py-1 font-semibold">SCIENCE BASE SCHOOL</td></tr>
                        <tr><td className="px-2 py-1">SOP: SBS-ACC-WI-03-01</td></tr>
                        <tr><td className="px-2 py-1">Revision: 00</td></tr>
                        <tr><td className="px-2 py-1">Issue Date: {formatDateReadable(new Date())}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <p className="text-lg">
                      For The Month of : <span className="border border-slate-900 px-2 py-0.5 font-semibold">{expectedReportMonthLabel}</span>
                    </p>
                    <p className="text-right text-lg">
                      Campus : <span className="border border-slate-900 px-2 py-0.5 font-semibold">{campus}</span>
                    </p>
                  </div>

                  <div className="expected-grid-two grid gap-6 md:grid-cols-2">
                    <section className="print-table-wrap overflow-hidden border border-slate-300">
                      <table className="print-table min-w-full text-sm">
                        <thead className="bg-indigo-100 text-left text-xs uppercase tracking-wide text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Tuition Fee</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expectedIncome.tuitionByMonth.map((item) => (
                            <tr key={`${item.month}-${item.year}`} className="border-t border-slate-100">
                              <td className="px-3 py-2">{item.monthLabel}</td>
                              <td className="px-3 py-2 text-right">{formatAmount(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td className="px-3 py-2 uppercase">Total</td>
                            <td className="px-3 py-2 text-right">{formatAmount(expectedIncome.tuitionTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </section>

                    <section className="print-table-wrap overflow-hidden border border-slate-300">
                      <table className="print-table min-w-full text-sm">
                        <thead className="bg-indigo-100 text-left text-xs uppercase tracking-wide text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Other Income</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expectedIncome.fundsOverall.map((item) => (
                            <tr key={item.fundTypeId} className="border-t border-slate-100">
                              <td className="px-3 py-2">{item.fundTypeName}</td>
                              <td className="px-3 py-2 text-right">{formatAmount(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td className="px-3 py-2 uppercase">Total</td>
                            <td className="px-3 py-2 text-right">{formatAmount(expectedIncome.fundsTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </section>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <p className="text-lg">
                      Net Total in Figures : <span className="border border-slate-900 px-2 py-0.5 font-semibold">{formatAmount(expectedIncome.netTotal)}</span>
                    </p>
                    <p className="text-lg">
                      In Words : <span className="border-b border-slate-700 px-1 font-medium">{expectedNetInWords}</span>
                    </p>
                  </div>

                  <div className="grid items-end gap-6 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-600">Total Active Students (At time of print) :</p>
                      <p className="mt-2 inline-block min-w-28 border-2 border-slate-800 px-4 py-1 text-center text-3xl font-semibold">
                        {formatAmount(expectedIncome.activeStudentCount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Date :</p>
                      <p className="mt-2 inline-block border border-slate-900 px-2 py-1 font-semibold">
                        {formatDateReadable(new Date())}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Signature of Campus Head :</p>
                      <div className="mt-8 border-b border-slate-700" />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
      </CampusShell>
    </div>
  )
}

export default FeeReportsPage

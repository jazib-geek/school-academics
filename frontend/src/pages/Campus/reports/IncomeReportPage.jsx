import { useCallback, useEffect, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getIncomeStatement } from '../../../services/feeReportService'
import { getCampusPrintMeta } from '../../../utils/campusProfile'

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

const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((value) => ({
  value: String(value),
  label: String(value),
}))

const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  @media print {
    html, body, #root { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .print-page-root, .print-main-wrap, .print-content-wrap { background: #fff !important; }
    .no-print { display: none !important; }
    .print-main-wrap { min-height: auto !important; }
    .print-content-wrap { padding: 0 !important; margin: 0 !important; }
    .print-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; }
    .print-only { display: block !important; }
    .print-report-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      gap: 16px !important;
      border-bottom: 1px solid #cbd5e1 !important;
      padding-bottom: 10px !important;
      margin-bottom: 10px !important;
    }
    .print-table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; }
    .print-table th, .print-table td { border: 1px solid #e2e8f0 !important; padding: 6px !important; }
    .print-table thead th { color: #0f172a !important; background: #eef2ff !important; }
    .print-table tr { page-break-inside: avoid !important; }
  }
`

function IncomeReportPage() {
  const { campusLabel, schoolName, logoSrc } = getCampusPrintMeta()

  const [month, setMonth] = useState(String(currentMonth))
  const [year, setYear] = useState(String(currentYear))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState({
    monthLabel: '',
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    expenseHeads: [],
  })

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getIncomeStatement(Number(month), Number(year))
      setReport({
        monthLabel: data?.monthLabel || '',
        totalIncome: data?.totalIncome || 0,
        totalExpenses: data?.totalExpenses || 0,
        netProfit: data?.netProfit || 0,
        expenseHeads: data?.expenseHeads || [],
      })
    } catch {
      setError('Unable to load income report for this campus and period.')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  const generatedDate = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="print-page-root min-h-screen bg-slate-100 text-slate-700">
      <style>{PRINT_STYLES}</style>
      <CampusShell
        headerContext="Income report"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap space-y-5 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <section className="print-area rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="print-only hidden print-report-header">
              <div className="flex items-start gap-3">
                <img src={logoSrc} alt="" className="h-12 w-12 object-contain" />
                <div>
                  <p className="text-base font-bold text-slate-900">{schoolName}</p>
                  <p className="text-xs text-slate-600">Campus: {campusLabel}</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p className="font-semibold text-slate-900">Income &amp; Expenditure Statement</p>
                <p>{report.monthLabel || `${month}/${year}`}</p>
                <p>Generated: {generatedDate}</p>
              </div>
            </div>

            <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Profit Loss Statement</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Logged-in campus: <span className="font-medium text-slate-700">{campusLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-500">
                  Month
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Year
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {yearOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={isLoading}
                  className="rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                <span className="text-sm">Preparing statement...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-base font-bold uppercase tracking-wide text-slate-800">
                    Statement of Income &amp; Expenditure
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    For the month ended {report.monthLabel || `${month}/${year}`}
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">{campusLabel}</p>
                </div>

                <table className="print-table w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="w-[70%] px-3 py-2">Particulars</th>
                      <th className="w-[30%] px-3 py-2 text-right">Amount (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-indigo-50/60">
                      <td colSpan={2} className="px-3 py-1.5 font-semibold text-indigo-900">
                        INCOME
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 pl-6">Fee &amp; fund collections (Received)</td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {formatAmount(report.totalIncome)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="px-3 py-1.5">Total Income</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">
                        {formatAmount(report.totalIncome)}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/60">
                      <td colSpan={2} className="px-3 py-1.5 font-semibold text-rose-900">
                        EXPENSES
                      </td>
                    </tr>
                    {report.expenseHeads.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                          No expenses recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      report.expenseHeads.map((head) => (
                        <tr key={head.subGroupId || head.headName} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 pl-6">{head.headName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(head.amount)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="px-3 py-1.5">Total Expenses</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-rose-700">
                        {formatAmount(report.totalExpenses)}
                      </td>
                    </tr>
                    <tr className="border-t-4 border-double border-slate-300 bg-slate-50 font-bold">
                      <td className="px-3 py-3">
                        {report.netProfit >= 0 ? 'Net Surplus (Profit)' : 'Net Deficit (Loss)'}
                      </td>
                      <td
                        className={`px-3 py-3 text-right tabular-nums ${
                          report.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {formatAmount(Math.abs(report.netProfit))}
                        {report.netProfit < 0 ? ' (Dr)' : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </CampusShell>
    </div>
  )
}

export default IncomeReportPage


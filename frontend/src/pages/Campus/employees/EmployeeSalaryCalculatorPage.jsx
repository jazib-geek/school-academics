import { useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  getEmployeeSalaryCalculationResult,
  startEmployeeSalaryCalculation,
  subscribeEmployeeSalaryProgress,
} from '../../../services/employeeSalaryService'
import { MONTH_OPTIONS, isFutureSalaryPeriod } from '../../../constants/salaryComponents'

const inputClass =
  'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const formatAmount = (value) =>
  Math.round(Number(value || 0)).toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })

function countSundaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month - 1, day).getDay() === 0) count += 1
  }
  return count
}

function printReport(rows, monthLabel, year) {
  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${row.employeeId}</td>
        <td>${row.employeeName || ''}</td>
        <td>${formatAmount(row.basicSalary)}</td>
        <td>${row.presentDaysCount}</td>
        <td>${row.lateComingsCount}</td>
        <td>${formatAmount(row.lateDeduction)}</td>
        <td>${formatAmount(row.absentDeduction)}</td>
        <td>${formatAmount(row.workingDaysSalary)}</td>
        <td>${formatAmount(row.loanAndSecurityCharges ?? Number(row.loan || 0) + Number(row.securityCharges || 0) + Number(row.advance || 0))}</td>
        <td>${formatAmount(row.bonus)}</td>
        <td>${formatAmount(row.netSalary)}</td>
      </tr>`,
    )
    .join('')

  const totalNet = rows.reduce((sum, row) => sum + Number(row.netSalary || 0), 0)
  const html = `
    <html>
      <head><title>Salary Report ${monthLabel} ${year}</title></head>
      <body>
        <h3 style="text-align:center;margin:0 0 8px;">Salary Report — ${monthLabel} ${year}</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Basic Salary</th><th>Days Present</th><th>LC</th>
              <th>Late Deduction</th><th>Absent Deduction</th><th>Working Days Salary</th>
              <th>Loan/SC/Adv</th><th>Bonus</th><th>Net Salary</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr><td colspan="10" style="text-align:right;font-weight:bold;">Total</td><td style="font-weight:bold;">${formatAmount(totalNet)}</td></tr></tfoot>
        </table>
        <style>
          @media print { @page { size: landscape; } }
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 8px; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
          th { background: #eee; }
        </style>
      </body>
    </html>`

  const win = window.open('', '', 'width=1000,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}

function printSlips(rows, monthLabel, year) {
  let slipsHtml = ''
  rows.forEach((row, index) => {
    if (index % 4 === 0) {
      if (index > 0) slipsHtml += '</div>'
      slipsHtml +=
        '<div class="slip-page" style="display:flex;flex-wrap:wrap;page-break-after:always;">'
    }

    slipsHtml += `
      <div class="salary-slip" style="width:48%;border:1px solid #000;margin:1%;padding:6px;border-radius:6px;font-size:11px;box-sizing:border-box;page-break-inside:avoid;">
        <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:8px;">Salary for ${monthLabel} ${year}</div>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Account No:</td><td style="border:1px solid #000;padding:3px 5px;">${row.employeeId}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Name:</td><td style="border:1px solid #000;padding:3px 5px;">${row.employeeName || ''}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Basic Pay:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.basicSalary)}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Days Present:</td><td style="border:1px solid #000;padding:3px 5px;">${row.presentDaysCount}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Late Comings:</td><td style="border:1px solid #000;padding:3px 5px;">${row.lateComingsCount}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Late Deduction:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.lateDeduction)}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Absent Deduction:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.absentDeduction)}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Working Days Salary:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.workingDaysSalary)}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Loan / SC / Advance:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.loanAndSecurityCharges ?? Number(row.loan || 0) + Number(row.securityCharges || 0) + Number(row.advance || 0))}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;">Bonus:</td><td style="border:1px solid #000;padding:3px 5px;">${formatAmount(row.bonus)}</td></tr>
            <tr><td style="border:1px solid #000;padding:3px 5px;font-weight:bold;">Net Salary:</td><td style="border:1px solid #000;padding:3px 5px;font-weight:bold;">${formatAmount(row.netSalary)}</td></tr>
          </tbody>
        </table>
      </div>`
  })
  if (rows.length) slipsHtml += '</div>'

  const html = `
    <html>
      <head><title>Salary Slips ${monthLabel} ${year}</title></head>
      <body>${slipsHtml}
        <style>
          @media print { @page { size: portrait; margin: 8mm; } }
          body { font-family: Arial, sans-serif; margin: 0; color: #000; }
        </style>
      </body>
    </html>`

  const win = window.open('', '', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}

function EmployeeSalaryCalculatorPage() {
  const canCalculate = hasCampusPermission('calculate_employee_salary')
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [sundaysToInclude, setSundaysToInclude] = useState(() =>
    countSundaysInMonth(now.getFullYear(), now.getMonth() + 1),
  )
  const [rows, setRows] = useState([])
  const [totalNet, setTotalNet] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const unsubscribeRef = useRef(null)

  const monthLabel = useMemo(
    () => MONTH_OPTIONS.find((m) => m.value === Number(month))?.label || String(month),
    [month],
  )

  const maxSundays = useMemo(
    () => countSundaysInMonth(Number(year), Number(month)),
    [month, year],
  )

  useEffect(() => {
    // Month/year changed — default to all Sundays in that month.
    setSundaysToInclude(maxSundays)
  }, [maxSundays])

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const list = []
    for (let y = currentYear - 1; y <= currentYear; y += 1) list.push(y)
    return list
  }, [])

  const isFuturePeriod = useMemo(
    () => isFutureSalaryPeriod(Number(month), Number(year)),
    [month, year],
  )

  const sundayOptions = useMemo(() => {
    const options = []
    for (let n = 0; n <= maxSundays; n += 1) options.push(n)
    return options
  }, [maxSundays])

  const handleCalculate = async () => {
    if (!month) {
      toast.error('Please select a month.')
      return
    }
    if (isFuturePeriod) {
      toast.error('Salary cannot be calculated for a future month.')
      return
    }

    unsubscribeRef.current?.()
    setIsCalculating(true)
    setProgress(0)
    setRows([])
    setTotalNet(0)

    try {
      const started = await startEmployeeSalaryCalculation({
        month: Number(month),
        year: Number(year),
        sundaysToInclude: Number(sundaysToInclude),
      })
      const generationId = started?.generationId
      if (!generationId) throw new Error('Could not start calculation.')

      unsubscribeRef.current = subscribeEmployeeSalaryProgress(generationId, {
        onPercent: (percent) => setProgress(percent),
        onDone: async () => {
          try {
            const result = await getEmployeeSalaryCalculationResult(generationId)
            setRows(result?.rows || [])
            setTotalNet(result?.totalNetSalary || 0)
            setProgress(100)
            toast.success('Salaries calculated.')
          } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not load salary results.')
          } finally {
            setIsCalculating(false)
          }
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message || error?.message || 'Salary calculation failed.',
          )
          setIsCalculating(false)
        },
      })
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Could not start calculation.',
      )
      setIsCalculating(false)
    }
  }

  return (
    <CampusShell headerContext="Calculate salary">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-[95rem] space-y-4">
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <Calculator size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Calculate Salary</h1>
                <p className="text-sm text-slate-500">
                  Generate monthly salaries from attendance, late deductions, and loan entries.
                </p>
              </div>
            </div>

            <PermissionControl permission="calculate_employee_salary">
              <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Month</label>
                  <select
                    className={`${inputClass} min-w-[10rem]`}
                    value={month}
                    disabled={isCalculating || !canCalculate}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Year</label>
                  <select
                    className={`${inputClass} min-w-[7rem]`}
                    value={year}
                    disabled={isCalculating || !canCalculate}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">
                    Sundays to include
                  </label>
                  <select
                    className={`${inputClass} min-w-[8rem]`}
                    value={sundaysToInclude}
                    disabled={isCalculating || !canCalculate}
                    onChange={(e) => setSundaysToInclude(Number(e.target.value))}
                  >
                    {sundayOptions.map((n) => (
                      <option key={n} value={n}>
                        {n === maxSundays ? `${n} (all)` : n === 0 ? '0 (none)' : n}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={isCalculating || !canCalculate || isFuturePeriod}
                  onClick={handleCalculate}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                >
                  {isCalculating ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}
                  Calculate
                </button>
                <button
                  type="button"
                  disabled={!rows.length}
                  onClick={() => printReport(rows, monthLabel, year)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Print Report
                </button>
                <button
                  type="button"
                  disabled={!rows.length}
                  onClick={() => printSlips(rows, monthLabel, year)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Print Slips
                </button>
              </div>
              {isFuturePeriod ? (
                <p className="text-[13px] text-amber-700">
                  Future months cannot be calculated. Choose the current or a past month.
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-[13px] leading-snug">
                  <thead className="bg-[var(--campus-primary)] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">ID</th>
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-right font-semibold">Basic Salary</th>
                      <th className="px-3 py-2 text-right font-semibold">Days Present</th>
                      <th className="px-3 py-2 text-right font-semibold">LC</th>
                      <th className="px-3 py-2 text-right font-semibold">Late Deduction</th>
                      <th className="px-3 py-2 text-right font-semibold">Absent Deduction</th>
                      <th className="px-3 py-2 text-right font-semibold">Working Days Salary</th>
                      <th className="px-3 py-2 text-right font-semibold">Loan/SC/Adv</th>
                      <th className="px-3 py-2 text-right font-semibold">Bonus</th>
                      <th className="px-3 py-2 text-right font-semibold">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {!rows.length ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                          Select month/year and calculate to see results.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5">{row.employeeId}</td>
                          <td className="px-3 py-1.5">{row.employeeName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(row.basicSalary)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{row.presentDaysCount}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{row.lateComingsCount}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(row.lateDeduction)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(row.absentDeduction)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(row.workingDaysSalary)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatAmount(
                              row.loanAndSecurityCharges ??
                                Number(row.loan || 0) + Number(row.securityCharges || 0) + Number(row.advance || 0),
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(row.bonus)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatAmount(row.netSalary)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={10} className="px-3 py-2 text-right font-semibold text-slate-700">
                          Total net
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--campus-primary)]">
                          {formatAmount(totalNet)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              </div>
            </PermissionControl>
          </section>
        </div>
      </div>

      {isCalculating && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="salary-progress-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <Loader2 className="animate-spin" size={20} />
              </div>
              <div className="min-w-0">
                <h2 id="salary-progress-title" className="text-lg font-semibold text-slate-900">
                  Calculating salaries
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {monthLabel} {year} — please wait while each employee is processed.
                </p>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Progress</span>
              <span className="tabular-nums text-base font-bold text-[var(--campus-primary)]">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--campus-primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="mt-3 text-center text-[12px] text-slate-400">Do not close this page until it finishes.</p>
          </div>
        </div>
      )}
    </CampusShell>
  )
}

export default EmployeeSalaryCalculatorPage

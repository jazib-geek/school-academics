export const SALARY_COMPONENT_TYPES = {
  WorkingDaySalary: 'WorkingDaySalary',
  BasicSalary: 'BasicSalary',
  TeaAllowance: 'TeaAllowance',
  Loan: 'Loan',
  SecurityCharges: 'SecurityCharges',
  Bonus: 'Bonus',
  Fine: 'Fine',
  Advance: 'Advance',
}

/** Last calendar day of a year/month (1–12). Used when current-month deductions count as paid. */
export const lastDayOfSalaryMonth = (year, month) =>
  new Date(Number(year), Number(month), 0).getDate()

export const EDITABLE_SALARY_COMPONENT_TYPES = [
  SALARY_COMPONENT_TYPES.Loan,
  SALARY_COMPONENT_TYPES.SecurityCharges,
  SALARY_COMPONENT_TYPES.Bonus,
  SALARY_COMPONENT_TYPES.Fine,
  SALARY_COMPONENT_TYPES.Advance,
]

/** KPI strip order on Salary Adjustments (all-time). Fine and Advance are excluded. */
export const KPI_SALARY_COMPONENT_TYPES = [
  SALARY_COMPONENT_TYPES.Loan,
  SALARY_COMPONENT_TYPES.SecurityCharges,
  SALARY_COMPONENT_TYPES.Bonus,
]

/** These KPIs show paid / remaining vs total (settled by month + last day of month). */
export const BALANCE_KPI_SALARY_COMPONENT_TYPES = [
  SALARY_COMPONENT_TYPES.Loan,
  SALARY_COMPONENT_TYPES.SecurityCharges,
]

export const SALARY_COMPONENT_TYPE_LABELS = {
  [SALARY_COMPONENT_TYPES.Loan]: 'Loan',
  [SALARY_COMPONENT_TYPES.SecurityCharges]: 'Security Charges',
  [SALARY_COMPONENT_TYPES.Bonus]: 'Bonus',
  [SALARY_COMPONENT_TYPES.Fine]: 'Fine',
  [SALARY_COMPONENT_TYPES.Advance]: 'Advance',
}

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

/** Pakistan calendar year/month for payroll period checks. */
export const getPakistanYearMonth = (referenceDate = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(referenceDate)

  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  }
}

export const salaryPeriodKey = (year, month) => Number(year) * 12 + Number(month)

export const isFutureSalaryPeriod = (month, year, referenceDate = new Date()) => {
  const current = getPakistanYearMonth(referenceDate)
  return salaryPeriodKey(year, month) > salaryPeriodKey(current.year, current.month)
}

export const isCurrentSalaryPeriod = (month, year, referenceDate = new Date()) => {
  const current = getPakistanYearMonth(referenceDate)
  return Number(year) === current.year && Number(month) === current.month
}

export const isPastSalaryPeriod = (month, year, referenceDate = new Date()) =>
  !isFutureSalaryPeriod(month, year, referenceDate) &&
  !isCurrentSalaryPeriod(month, year, referenceDate)

/**
 * Past months are settled. Future months are not.
 * Current month is settled only on/after its last calendar day (Pakistan calendar).
 */
export const isSalaryComponentPeriodSettled = (month, year, referenceDate = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate)

  const currentYear = Number(parts.find((p) => p.type === 'year')?.value)
  const currentMonth = Number(parts.find((p) => p.type === 'month')?.value)
  const currentDay = Number(parts.find((p) => p.type === 'day')?.value)

  const periodKey = Number(year) * 12 + Number(month)
  const currentKey = currentYear * 12 + currentMonth

  if (periodKey < currentKey) return true
  if (periodKey > currentKey) return false
  return currentDay >= lastDayOfSalaryMonth(currentYear, currentMonth)
}

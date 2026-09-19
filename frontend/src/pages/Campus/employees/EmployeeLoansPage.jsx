import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Banknote,
  Clock3,
  Gift,
  HandCoins,
  Loader2,
  MinusCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getEmployees } from '../../../services/employeeService'
import {
  deleteEmployeeSalaryComponent,
  getEmployeeSalaryComponents,
  getEmployeeSalaryPeriodStatus,
  upsertEmployeeSalaryComponent,
} from '../../../services/employeeSalaryComponentService'
import {
  BALANCE_KPI_SALARY_COMPONENT_TYPES,
  EDITABLE_SALARY_COMPONENT_TYPES,
  isFutureSalaryPeriod,
  isCurrentSalaryPeriod,
  isPastSalaryPeriod,
  isSalaryComponentPeriodSettled,
  KPI_SALARY_COMPONENT_TYPES,
  MONTH_OPTIONS,
  SALARY_COMPONENT_TYPES,
  SALARY_COMPONENT_TYPE_LABELS,
} from '../../../constants/salaryComponents'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500'

const TYPE_META = {
  [SALARY_COMPONENT_TYPES.Loan]: {
    label: 'Loan',
    icon: HandCoins,
    badge: 'bg-sky-50 text-sky-800 ring-sky-200',
    card: 'border-sky-200/80 bg-white',
    iconWrap: 'bg-sky-600 text-white shadow-sky-200',
    bar: 'bg-sky-500',
    barTrack: 'bg-sky-100',
  },
  [SALARY_COMPONENT_TYPES.SecurityCharges]: {
    label: 'Security',
    icon: Shield,
    badge: 'bg-violet-50 text-violet-800 ring-violet-200',
    card: 'border-violet-200/80 bg-white',
    iconWrap: 'bg-violet-600 text-white shadow-violet-200',
    bar: 'bg-violet-500',
    barTrack: 'bg-violet-100',
  },
  [SALARY_COMPONENT_TYPES.Advance]: {
    label: 'Advance',
    icon: Banknote,
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    card: 'border-amber-200/80 bg-white',
    iconWrap: 'bg-amber-500 text-white shadow-amber-200',
    bar: 'bg-amber-500',
    barTrack: 'bg-amber-100',
  },
  [SALARY_COMPONENT_TYPES.Bonus]: {
    label: 'Bonus',
    icon: Gift,
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    card: 'border-emerald-200/80 bg-white',
    iconWrap: 'bg-emerald-600 text-white shadow-emerald-200',
    bar: 'bg-emerald-500',
    barTrack: 'bg-emerald-100',
  },
  [SALARY_COMPONENT_TYPES.Fine]: {
    label: 'Fine',
    icon: Scale,
    badge: 'bg-rose-50 text-rose-800 ring-rose-200',
    card: 'border-rose-200/80 bg-white',
    iconWrap: 'bg-rose-600 text-white shadow-rose-200',
    bar: 'bg-rose-500',
    barTrack: 'bg-rose-100',
  },
}

const emptyForm = () => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  componentType: '',
  amount: '',
  description: '',
})

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

const getEmployeeId = (emp) => Number(emp?.id ?? emp?.ID ?? 0)
const getEmployeeName = (emp) =>
  emp?.employeeName || emp?.EmployeeName || emp?.name || ''

/** Progress completeness: red → orange → yellow → green */
const completenessTone = (paidPct) => {
  if (paidPct >= 75) {
    return {
      bar: 'bg-emerald-500',
      track: 'bg-emerald-100',
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    }
  }
  if (paidPct >= 50) {
    return {
      bar: 'bg-amber-400',
      track: 'bg-amber-100',
      pill: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    }
  }
  if (paidPct >= 25) {
    return {
      bar: 'bg-orange-500',
      track: 'bg-orange-100',
      pill: 'bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200',
    }
  }
  return {
    bar: 'bg-rose-500',
    track: 'bg-rose-100',
    pill: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  }
}

const entryStatusMeta = (componentType, month, year) => {
  if (componentType === SALARY_COMPONENT_TYPES.Bonus) {
    return {
      label: 'Awarded',
      Icon: Award,
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    }
  }

  if (isSalaryComponentPeriodSettled(month, year)) {
    return {
      label: 'Deducted',
      Icon: MinusCircle,
      className: 'bg-purple-50 text-purple-700 ring-purple-200',
    }
  }

  return {
    label: 'To be paid',
    Icon: Clock3,
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  }
}

function EmployeePickerModal({ open, employees, selectedEmployeeId, isLoading, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filteredEmployees = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return employees
    return employees.filter((employee) => {
      const id = getEmployeeId(employee)
      const name = getEmployeeName(employee)
      const designation = employee?.designationName || employee?.DesignationName || ''
      return `${id} ${name} ${designation}`.toLowerCase().includes(needle)
    })
  }, [employees, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select employee</h2>
            <p className="text-sm text-slate-500">Choose an employee to load salary adjustments.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close employee picker"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="filterSalaryAdjustmentsEmployeeSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee by name or designation"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[var(--campus-primary)] focus:ring-4 focus:ring-[#405189]/10"
              autoFocus
              {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-[var(--campus-primary)]" />
              Loading employees…
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No employees found.</div>
          ) : (
            <table className="min-w-full text-[13px] leading-snug">
              <thead className="sticky top-0 bg-[var(--campus-primary)] text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-2 font-semibold">Employee</th>
                  <th className="min-w-[140px] px-3 py-2 text-right font-semibold">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => {
                  const id = getEmployeeId(employee)
                  const name = getEmployeeName(employee) || `Employee #${id}`
                  const designation = employee?.designationName || employee?.DesignationName || '—'
                  const selected = Number(selectedEmployeeId) === id

                  return (
                    <tr
                      key={id}
                      className={`cursor-pointer transition ${
                        selected ? 'bg-indigo-50 text-[var(--campus-primary)]' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => onSelect(employee)}
                    >
                      <td className="px-3 py-1.5">
                        <button type="button" className="text-left font-semibold">
                          {name}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{designation}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function EmployeeLoansPage() {
  const canManage = hasCampusPermission('manage_employee_loans')
  const canEditPast = hasCampusPermission('edit_past_employee_loans')
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isPickerOpen, setIsPickerOpen] = useState(true)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isLoadingRows, setIsLoadingRows] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingBasic, setIsSavingBasic] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [periodStatus, setPeriodStatus] = useState(null)
  const [basicSalaryInput, setBasicSalaryInput] = useState('')
  const [basicUnlocked, setBasicUnlocked] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const amountInputRef = useRef(null)
  const [amountFlash, setAmountFlash] = useState(false)
  const amountFlashTimerRef = useRef(null)

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list = []
    for (let y = current - 2; y <= current + 1; y += 1) list.push(y)
    return list
  }, [])

  const isFuturePeriod = useMemo(
    () => isFutureSalaryPeriod(form.month, form.year),
    [form.month, form.year],
  )

  const canMutatePeriod =
    canManage &&
    (isCurrentSalaryPeriod(form.month, form.year) ||
      isFutureSalaryPeriod(form.month, form.year) ||
      canEditPast)

  const selectedEmployee = useMemo(
    () => employees.find((emp) => String(getEmployeeId(emp)) === String(employeeId)) || null,
    [employees, employeeId],
  )

  const selectedEmployeeName = selectedEmployee
    ? getEmployeeName(selectedEmployee) || `Employee #${employeeId}`
    : ''

  const periodRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          Number(row.month) === Number(form.month) &&
          Number(row.year) === Number(form.year) &&
          Number(row.amount) !== 0,
      ),
    [rows, form.month, form.year],
  )

  const kpiStats = useMemo(() => {
    const stats = Object.fromEntries(
      KPI_SALARY_COMPONENT_TYPES.map((type) => [type, { total: 0, remaining: 0, paid: 0 }]),
    )

    for (const row of rows) {
      const type = row.componentType
      if (!stats[type]) continue
      const amount = Number(row.amount) || 0
      stats[type].total += amount

      if (!BALANCE_KPI_SALARY_COMPONENT_TYPES.includes(type)) continue

      if (isSalaryComponentPeriodSettled(row.month, row.year)) {
        stats[type].paid += amount
      } else {
        stats[type].remaining += amount
      }
    }

    return stats
  }, [rows])

  const periodLabel = useMemo(
    () => `${MONTH_OPTIONS.find((m) => m.value === Number(form.month))?.label || form.month} ${form.year}`,
    [form.month, form.year],
  )

  const periodShortLabel = useMemo(() => {
    const full = MONTH_OPTIONS.find((m) => m.value === Number(form.month))?.label || String(form.month)
    const short = full.length > 3 ? full.slice(0, 3) : full
    return `${short} ${form.year}`
  }, [form.month, form.year])

  const needsGeneratedWarning = Boolean(
    periodStatus?.isGenerated && isPastSalaryPeriod(form.month, form.year),
  )

  const loadEmployees = useCallback(async () => {
    setIsLoadingEmployees(true)
    try {
      const all = []
      let page = 1
      let totalPages = 1
      do {
        const result = await getEmployees({ page, pageSize: 100, isActive: true })
        const items = result?.items || []
        all.push(...items)
        totalPages = Math.max(1, Number(result?.totalPages) || 1)
        page += 1
      } while (page <= totalPages)
      setEmployees(all)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load employees.')
    } finally {
      setIsLoadingEmployees(false)
    }
  }, [])

  const loadRows = useCallback(async (id) => {
    if (!id) {
      setRows([])
      return
    }
    setIsLoadingRows(true)
    try {
      setRows(await getEmployeeSalaryComponents(Number(id)))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load salary adjustments.')
      setRows([])
    } finally {
      setIsLoadingRows(false)
    }
  }, [])

  const loadPeriodStatus = useCallback(async (id, month, year) => {
    if (!id || !month || !year) {
      setPeriodStatus(null)
      setBasicSalaryInput('')
      return
    }
    try {
      const status = await getEmployeeSalaryPeriodStatus({
        employeeId: Number(id),
        month: Number(month),
        year: Number(year),
      })
      setPeriodStatus(status)
      setBasicSalaryInput(status?.basicSalary != null ? String(status.basicSalary) : '')
    } catch {
      setPeriodStatus(null)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    loadRows(employeeId)
    setEditingId(null)
    setForm(emptyForm())
    setBasicUnlocked(false)
    setConfirmDialog(null)
  }, [employeeId, loadRows])

  useEffect(() => {
    if (!employeeId) {
      setPeriodStatus(null)
      setBasicSalaryInput('')
      return
    }
    loadPeriodStatus(employeeId, form.month, form.year)
    setBasicUnlocked(false)
  }, [employeeId, form.month, form.year, loadPeriodStatus])

  useEffect(() => {
    if (periodStatus?.canEditBasic && !periodStatus?.hasBasicSalarySnapshot) {
      setBasicUnlocked(true)
    }
  }, [periodStatus?.canEditBasic, periodStatus?.hasBasicSalarySnapshot])

  const resetForm = () => {
    setEditingId(null)
    setAmountFlash(false)
    setForm((prev) => ({
      ...emptyForm(),
      month: prev.month,
      year: prev.year,
    }))
  }

  const focusAmountField = () => {
    window.requestAnimationFrame(() => {
      const el = amountInputRef.current
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
      el.select()
    })
  }

  const flashAmountField = () => {
    if (amountFlashTimerRef.current) window.clearTimeout(amountFlashTimerRef.current)
    setAmountFlash(true)
    focusAmountField()
    amountFlashTimerRef.current = window.setTimeout(() => setAmountFlash(false), 1800)
  }

  useEffect(
    () => () => {
      if (amountFlashTimerRef.current) window.clearTimeout(amountFlashTimerRef.current)
    },
    [],
  )

  const requestConfirm = (dialog) => {
    setConfirmDialog(dialog)
  }

  const closeConfirm = () => {
    if (isSaving || isSavingBasic || deletingId != null) return
    setConfirmDialog(null)
  }

  const startEdit = (row) => {
    if (
      isPastSalaryPeriod(row.month, row.year) &&
      !canEditPast
    ) {
      toast.error('You do not have permission to change past months.')
      return
    }
    setEditingId(row.id)
    setForm({
      month: Number(row.month),
      year: Number(row.year),
      componentType: row.componentType || '',
      amount: String(row.amount ?? ''),
      description: row.description || '',
    })
    window.setTimeout(() => flashAmountField(), 50)
  }

  const findExistingEntry = (month, year, componentType) => {
    if (!componentType) return null
    return (
      rows.find(
        (row) =>
          Number(row.month) === Number(month) &&
          Number(row.year) === Number(year) &&
          row.componentType === componentType,
      ) || null
    )
  }

  const applyFormField = (patch) => {
    if (editingId) {
      setForm((f) => ({ ...f, ...patch }))
      return
    }

    const next = { ...form, ...patch }
    const match = findExistingEntry(next.month, next.year, next.componentType)
    if (match) {
      startEdit(match)
      return
    }
    setForm(next)
  }

  const handleSelectEmployee = (employee) => {
    setEmployeeId(String(getEmployeeId(employee)))
    setIsPickerOpen(false)
  }

  const performSave = async () => {
    setIsSaving(true)
    try {
      const month = Number(form.month)
      const year = Number(form.year)
      await upsertEmployeeSalaryComponent({
        employeeId: Number(employeeId),
        month,
        year,
        componentType: form.componentType,
        amount: Number(form.amount),
        description: form.description?.trim() || null,
      })
      toast.success(editingId ? 'Entry updated.' : 'Entry saved.')
      resetForm()
      await loadRows(employeeId)
      await loadPeriodStatus(employeeId, month, year)
      setConfirmDialog(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!employeeId) {
      toast.error('Select an employee first.')
      return
    }
    if (!canMutatePeriod) {
      toast.error(
        isPastSalaryPeriod(form.month, form.year)
          ? 'You do not have permission to change past months.'
          : 'You do not have permission to manage salary adjustments.',
      )
      return
    }
    if (!form.month || !form.year || !form.componentType || form.amount === '') {
      toast.error('Please fill month, year, type, and amount.')
      return
    }
    if (needsGeneratedWarning) {
      requestConfirm({
        kind: 'save',
        title: 'Salary already calculated',
        description:
          'Salary for this month is already calculated. This change will update that employee\'s net salary.',
      })
      return
    }
    await performSave()
  }

  const performSaveBasic = async () => {
    setIsSavingBasic(true)
    try {
      const month = Number(form.month)
      const year = Number(form.year)
      await upsertEmployeeSalaryComponent({
        employeeId: Number(employeeId),
        month,
        year,
        componentType: SALARY_COMPONENT_TYPES.BasicSalary,
        amount: Number(basicSalaryInput),
        description: null,
      })
      toast.success('Month basic salary saved.')
      setBasicUnlocked(false)
      await loadPeriodStatus(employeeId, month, year)
      await loadRows(employeeId)
      setConfirmDialog(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save basic salary.')
    } finally {
      setIsSavingBasic(false)
    }
  }

  const handleSaveBasic = async () => {
    if (!employeeId) {
      toast.error('Select an employee first.')
      return
    }
    if (!canMutatePeriod || !canEditPast) {
      toast.error('You do not have permission to change past-month basic salary.')
      return
    }
    if (basicSalaryInput === '' || Number(basicSalaryInput) < 0) {
      toast.error('Enter a valid basic salary.')
      return
    }
    if (needsGeneratedWarning) {
      requestConfirm({
        kind: 'basic',
        title: 'Salary already calculated',
        description:
          'Salary for this month is already calculated. Changing basic salary will update that employee\'s net salary.',
      })
      return
    }
    await performSaveBasic()
  }

  const performDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteEmployeeSalaryComponent(id)
      toast.success('Entry deleted.')
      if (editingId === id) resetForm()
      await loadRows(employeeId)
      await loadPeriodStatus(employeeId, form.month, form.year)
      setConfirmDialog(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete entry.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDelete = (id) => {
    if (!canMutatePeriod) {
      toast.error(
        isPastSalaryPeriod(form.month, form.year)
          ? 'You do not have permission to change past months.'
          : 'You do not have permission to manage salary adjustments.',
      )
      return
    }
    if (needsGeneratedWarning) {
      requestConfirm({
        kind: 'delete',
        id,
        title: 'Salary already calculated',
        description:
          'Salary for this month is already calculated. Deleting this entry will update that employee\'s net salary.',
      })
      return
    }
    requestConfirm({
      kind: 'delete',
      id,
      title: 'Delete entry?',
      description: 'This entry will be removed from the employee list.',
    })
  }

  const handleBasicUnlockToggle = (checked) => {
    if (!canEditPast) {
      toast.error('You do not have permission to change past-month basic salary.')
      return
    }
    if (!checked) {
      setBasicUnlocked(false)
      return
    }
    requestConfirm({
      kind: 'unlockBasic',
      title: 'Edit month basic salary?',
      description: `Basic salary on ${periodShortLabel} is locked because it was used for salary. Unlocking lets you change the amount, which can change calculated net pay for this month.`,
    })
  }

  const handleConfirmDialog = async () => {
    if (!confirmDialog) return
    if (confirmDialog.kind === 'unlockBasic') {
      setBasicUnlocked(true)
      setConfirmDialog(null)
      return
    }
    if (confirmDialog.kind === 'save') {
      await performSave()
      return
    }
    if (confirmDialog.kind === 'basic') {
      await performSaveBasic()
      return
    }
    if (confirmDialog.kind === 'delete') {
      await performDelete(confirmDialog.id)
    }
  }

  const isEditing = Boolean(editingId)

  return (
    <CampusShell headerContext="Salary adjustments">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--campus-primary)] text-white shadow-md">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Salary Adjustments</h1>
                    <p className="mt-0.5 max-w-xl text-sm text-slate-500">
                      Record loans, security charges, advances, fines, and bonuses for monthly salary.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadRows(employeeId)}
                    disabled={!employeeId || isLoadingRows}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isLoadingRows ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                  </button>
                  <PermissionControl permission="manage_employee_loans">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[#344574]"
                    >
                      <UserRound size={16} />
                      {selectedEmployee ? 'Switch employee' : 'Select employee'}
                    </button>
                  </PermissionControl>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                {selectedEmployee ? (
                  <>
                    <HandCoins size={16} className="shrink-0 text-[var(--campus-primary)]" />
                    <span className="font-semibold text-slate-900">
                      {selectedEmployeeName}
                      {selectedEmployeeName.toLowerCase().endsWith('s') ? "'" : "'s"} Loan, Security and Bonus
                      Adjustments
                    </span>
                  </>
                ) : (
                  <>
                    <UserRound size={16} className="shrink-0 text-slate-400" />
                    <span className="font-semibold text-slate-900">No employee selected</span>
                  </>
                )}
              </div>
            </div>

            <PermissionControl permission="manage_employee_loans">
              {!employeeId ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <UserRound size={22} />
                  </div>
                  <h2 className="text-base font-semibold text-slate-800">No employee selected</h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Choose an employee to view balances and add salary adjustments.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--campus-primary)] px-4 text-sm font-semibold text-white hover:bg-[#344574]"
                  >
                    <UserRound size={16} />
                    Select employee
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 md:p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {KPI_SALARY_COMPONENT_TYPES.map((type) => {
                      const meta = TYPE_META[type]
                      const Icon = meta.icon
                      const { total, remaining, paid } = kpiStats[type]
                      if (
                        (type === SALARY_COMPONENT_TYPES.Bonus || type === SALARY_COMPONENT_TYPES.Loan) &&
                        total === 0
                      ) {
                        return null
                      }
                      const isBalance = BALANCE_KPI_SALARY_COMPONENT_TYPES.includes(type)
                      const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
                      const remainingPct = total > 0 ? Math.max(0, 100 - paidPct) : 0
                      const tone = completenessTone(paidPct)

                      return (
                        <div
                          key={type}
                          className={`overflow-hidden rounded-2xl border shadow-sm ${meta.card}`}
                        >
                          <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-3">
                            <div
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-md ${meta.iconWrap}`}
                            >
                              <Icon size={20} strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[13px] font-semibold text-slate-700">{meta.label}</p>
                                {isBalance && total > 0 ? (
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone.pill}`}
                                  >
                                    {paidPct}% cleared
                                  </span>
                                ) : null}
                              </div>

                              {isBalance ? (
                                <>
                                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">
                                    {formatAmount(remaining)}
                                    <span className="ml-1 text-[12px] font-semibold text-slate-500">left</span>
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-slate-600">
                                    <span>
                                      <span className="font-semibold text-emerald-700">{formatAmount(paid)}</span>
                                      <span className="text-slate-400"> paid</span>
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span>
                                      <span className="font-semibold text-slate-800">{formatAmount(total)}</span>
                                      <span className="text-slate-400"> total</span>
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">
                                    {formatAmount(total)}
                                  </p>
                                  <p className="mt-1.5 text-[12px] text-slate-500">All-time bonus given</p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className={`h-2 w-full ${isBalance ? tone.track : meta.barTrack}`}>
                            {isBalance ? (
                              <div
                                className={`h-full ${tone.bar} transition-[width] duration-300`}
                                style={{ width: `${total > 0 ? paidPct : 0}%` }}
                                title={`${paidPct}% paid, ${remainingPct}% remaining`}
                              />
                            ) : (
                              <div
                                className={`h-full ${meta.bar}`}
                                style={{ width: total > 0 ? '100%' : '0%' }}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      {periodStatus?.isCurrentMonth ? (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <h2 className="text-base font-semibold text-slate-800">Current Basic Salary</h2>
                          <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold tabular-nums text-white">
                            {basicSalaryInput !== '' ? Number(basicSalaryInput).toLocaleString() : '—'}
                          </span>
                        </div>
                      ) : (
                      <div
                        className={`rounded-2xl border p-4 transition ${
                          periodStatus?.canEditBasic && !basicUnlocked
                            ? 'border-slate-200 bg-slate-100/80 opacity-80'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2
                              className={`text-base font-semibold ${
                                periodStatus?.canEditBasic && !basicUnlocked
                                  ? 'text-slate-500'
                                  : 'text-slate-800'
                              }`}
                            >
                              {periodStatus?.canEditBasic
                                ? `Basic salary on ${periodShortLabel} was`
                                : 'Month basic salary'}
                            </h2>
                            <p className="text-[12px] text-slate-500">
                              {periodStatus?.canEditBasic
                                ? !canEditPast
                                  ? 'Past months are view-only for your account.'
                                  : basicUnlocked
                                    ? 'Editing unlocked. Save to update the locked month amount.'
                                    : 'Locked for this past month. Turn on Edit to change it.'
                                : isFuturePeriod
                                  ? 'Uses the employee profile salary when this month is calculated.'
                                  : 'Set this before calculating a past month\'s salary.'}
                            </p>
                          </div>
                          {periodStatus?.canEditBasic && canEditPast ? (
                            <label className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-slate-600">
                              <span>Edit</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={basicUnlocked}
                                onClick={() => handleBasicUnlockToggle(!basicUnlocked)}
                                className={`relative h-6 w-11 rounded-full transition ${
                                  basicUnlocked ? 'bg-[var(--campus-primary)]' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                                    basicUnlocked ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </label>
                          ) : null}
                        </div>
                        {periodStatus?.isGenerated ? (
                          <p className="mb-2 text-[12px] font-medium text-amber-700">
                            Salary for this month is already calculated.
                          </p>
                        ) : null}
                        {periodStatus?.canEditBasic && canEditPast ? (
                          <div className="flex gap-2">
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="1"
                              value={basicSalaryInput}
                              disabled={!basicUnlocked || isSavingBasic}
                              onChange={(e) => setBasicSalaryInput(e.target.value)}
                            />
                            <button
                              type="button"
                              disabled={!basicUnlocked || isSavingBasic}
                              onClick={handleSaveBasic}
                              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--campus-primary)] px-3 text-[13px] font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                            >
                              {isSavingBasic ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="text-lg font-bold tabular-nums text-slate-900">
                            {basicSalaryInput !== '' ? Number(basicSalaryInput).toLocaleString() : '—'}
                          </p>
                        )}
                      </div>
                      )}

                    <div
                      className={`rounded-2xl border bg-slate-50/50 p-4 ${
                        isEditing ? 'border-[#405189]/40 ring-2 ring-[#405189]/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold text-slate-800">
                            {isEditing ? 'Edit entry' : 'Add entry'}
                          </h2>
                          <p className="text-[12px] text-slate-500">
                            {isEditing
                              ? 'Update amount or description for this month and type.'
                              : canMutatePeriod
                                ? 'Fill the details, then save to the employee list.'
                                : isPastSalaryPeriod(form.month, form.year) && !canEditPast
                                  ? 'Past months are view-only for your account.'
                                  : 'You cannot change entries for this month.'}
                          </p>
                        </div>
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-white"
                            title="Cancel edit"
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-1 block text-[12px] font-medium text-slate-600">Month</span>
                            <select
                              className={inputClass}
                              value={form.month}
                              disabled={isEditing}
                              onChange={(e) => applyFormField({ month: Number(e.target.value) })}
                            >
                              {MONTH_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[12px] font-medium text-slate-600">Year</span>
                            <select
                              className={inputClass}
                              value={form.year}
                              disabled={isEditing}
                              onChange={(e) => applyFormField({ year: Number(e.target.value) })}
                            >
                              {years.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-[12px] font-medium text-slate-600">Type</span>
                          <select
                            className={inputClass}
                            value={form.componentType}
                            disabled={isEditing}
                            onChange={(e) => applyFormField({ componentType: e.target.value })}
                          >
                            <option value="">Select type</option>
                            {EDITABLE_SALARY_COMPONENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {SALARY_COMPONENT_TYPE_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[12px] font-medium text-slate-600">Amount</span>
                          <input
                            ref={amountInputRef}
                            className={`${inputClass} ${
                              amountFlash
                                ? 'border-[var(--campus-primary)] ring-2 ring-[var(--campus-primary)] animate-[pulse_0.5s_ease-in-out_3]'
                                : ''
                            }`}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={form.amount}
                            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[12px] font-medium text-slate-600">Description</span>
                          <input
                            className={inputClass}
                            placeholder="Optional note"
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        </label>

                        <div className="flex gap-2 pt-1">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={resetForm}
                              disabled={isSaving}
                              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isSaving || !canMutatePeriod}
                            onClick={handleSave}
                            className="inline-flex h-9 flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-[var(--campus-primary)] px-3 text-[13px] font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                          >
                            {isSaving ? (
                              <Loader2 className="animate-spin" size={15} />
                            ) : isEditing ? (
                              <Save size={15} />
                            ) : (
                              <Plus size={15} />
                            )}
                            {isEditing ? 'Update' : 'Add entry'}
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-100 px-3 py-2.5 md:px-4">
                        <h2 className="text-base font-semibold text-slate-800">This month's entries</h2>
                        <p className="text-[12px] text-slate-500">
                          {periodLabel} · {periodRows.length} of {EDITABLE_SALARY_COMPONENT_TYPES.length}{' '}
                          types filled
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-[13px] leading-snug">
                          <thead className="bg-[var(--campus-primary)] text-white">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Type</th>
                              <th className="px-3 py-2 text-right font-semibold">Amount</th>
                              <th className="px-3 py-2 text-left font-semibold">Description</th>
                              <th className="px-3 py-2 text-left font-semibold">Status</th>
                              <th className="px-3 py-2 text-right font-semibold"> </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoadingRows ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={16} />
                                    Loading entries…
                                  </span>
                                </td>
                              </tr>
                            ) : periodRows.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                                  Nothing saved for {periodLabel} yet. Add loan, bonus, or other adjustments
                                  on the left.
                                </td>
                              </tr>
                            ) : (
                              periodRows.map((row) => {
                                const meta = TYPE_META[row.componentType] || {
                                  label:
                                    SALARY_COMPONENT_TYPE_LABELS[row.componentType] || row.componentType,
                                  badge: 'bg-slate-50 text-slate-700 ring-slate-200',
                                }
                                const status = entryStatusMeta(row.componentType, row.month, row.year)
                                const StatusIcon = status.Icon
                                const active = editingId === row.id
                                return (
                                  <tr
                                    key={row.id}
                                    className={`hover:bg-slate-50 ${active ? 'bg-indigo-50/60' : ''}`}
                                  >
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${meta.badge}`}
                                      >
                                        {meta.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-medium tabular-nums text-slate-800">
                                      {formatAmount(row.amount)}
                                    </td>
                                    <td
                                      className="max-w-[220px] truncate px-3 py-1.5 text-slate-600"
                                      title={row.description || ''}
                                    >
                                      {row.description || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${status.className}`}
                                      >
                                        <StatusIcon size={12} strokeWidth={2.25} aria-hidden />
                                        {status.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      {canMutatePeriod ? (
                                      <div className="flex justify-end gap-1">
                                        <button
                                          type="button"
                                          className="btn-icon-soft inline-flex h-7 w-7 items-center justify-center text-[var(--campus-primary)]"
                                          onClick={() => startEdit(row)}
                                          title="Edit"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-icon-soft inline-flex h-7 w-7 items-center justify-center text-rose-600"
                                          disabled={deletingId === row.id}
                                          onClick={() => handleDelete(row.id)}
                                          title="Delete"
                                        >
                                          {deletingId === row.id ? (
                                            <Loader2 className="animate-spin" size={14} />
                                          ) : (
                                            <Trash2 size={14} />
                                          )}
                                        </button>
                                      </div>
                                      ) : (
                                        <span className="block text-right text-[12px] text-slate-400">View only</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </PermissionControl>
          </section>
        </div>
      </div>

      <EmployeePickerModal
        open={isPickerOpen && canManage}
        employees={employees}
        selectedEmployeeId={employeeId}
        isLoading={isLoadingEmployees}
        onSelect={handleSelectEmployee}
        onClose={() => setIsPickerOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description || ''}
        confirmLabel={confirmDialog?.kind === 'delete' ? 'Delete' : confirmDialog?.kind === 'unlockBasic' ? 'Unlock' : 'Continue'}
        cancelLabel="Cancel"
        busy={isSaving || isSavingBasic || deletingId != null}
        icon={<AlertTriangle size={20} />}
        confirmClass={
          confirmDialog?.kind === 'delete'
            ? 'inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60'
            : 'inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60'
        }
        onCancel={closeConfirm}
        onConfirm={handleConfirmDialog}
      />
    </CampusShell>
  )
}

export default EmployeeLoansPage

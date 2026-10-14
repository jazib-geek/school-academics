import { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncSelect from 'react-select/async'
import { Car, Loader2, Printer, Shield, User, UserRound, UserRoundCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import { getStudentFamilyMembers, searchStudents } from '../../../services/studentService'
import { createShortLeave, listShortLeaves } from '../../../services/shortLeaveService'
import { printShortLeavePass } from '../../../utils/shortLeavePrint'

const RELATIONS = [
  { value: 'Father', label: 'Father', icon: User },
  { value: 'Mother', label: 'Mother', icon: UserRound },
  { value: 'Relative', label: 'Relative', icon: Users },
  { value: 'Guardian', label: 'Guardian', icon: Shield },
  { value: 'Auto-Driver', label: 'Auto-Driver', icon: Car },
  { value: 'Other', label: 'Someone else', icon: UserRoundCheck },
]

const RELATIVE_KINDS = [
  { value: 'Brother', icon: User },
  { value: 'Sister', icon: UserRound },
  { value: 'Uncle', icon: User },
  { value: 'Aunt', icon: UserRound },
  { value: 'Grandfather', icon: User },
  { value: 'Grandmother', icon: UserRound },
  { value: 'Cousin', icon: Users },
]

const pillOn = 'border-[var(--campus-primary)] bg-[var(--campus-primary)] text-white'
const pillOff = 'border-slate-200 bg-white text-slate-700 hover:border-[var(--campus-primary)] hover:text-[var(--campus-primary)]'

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

const pakistanNowTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

const studentOption = (student) => {
  const regId = student.reg_Id ?? student.Reg_Id
  const name = student.fullName ?? student.FullName ?? 'Student'
  const className = student.className ?? student.ClassName ?? ''
  return {
    value: regId,
    label: `#${regId} — ${name}${className ? ` · ${className}` : ''}`,
    student,
  }
}

const pakistanDate = (offsetDays = 0) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatListDate = (value) => {
  const raw = String(value || '').slice(0, 10)
  const [year, month, day] = raw.split('-')
  if (!year || !month || !day) return raw
  return `${day}/${month}/${year}`
}
const memberId = (member) => member.reg_Id ?? member.Reg_Id
const memberName = (member) => member.studentName ?? member.StudentName ?? member.fullName ?? member.FullName ?? 'Student'
const memberClass = (member) => member.className ?? member.ClassName ?? ''

function CampusShortLeavePage() {
  const [studentOptionValue, setStudentOptionValue] = useState(null)
  const [members, setMembers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loadingFamily, setLoadingFamily] = useState(false)
  const [relation, setRelation] = useState('Father')
  const [relativeKind, setRelativeKind] = useState('')
  const [pickupName, setPickupName] = useState('')
  const [reason, setReason] = useState('')
  const [pickupTime, setPickupTime] = useState(pakistanNowTime)
  const [phoneRequired, setPhoneRequired] = useState(false)
  const [phoneWith, setPhoneWith] = useState('')
  const [phoneApproved, setPhoneApproved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passes, setPasses] = useState([])
  const [loadingPasses, setLoadingPasses] = useState(true)
  const [panel, setPanel] = useState('today')
  const [historyFrom, setHistoryFrom] = useState(() => pakistanDate(-30))
  const [historyTo, setHistoryTo] = useState(() => pakistanDate(0))
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const someoneElse = relation === 'Other'
  const callRequired = someoneElse || phoneRequired

  const loadPasses = useCallback(async () => {
    setLoadingPasses(true)
    try {
      const rows = await listShortLeaves()
      setPasses(Array.isArray(rows) ? rows : [])
    } catch {
      setPasses([])
      toast.error('Could not load today’s short leaves.')
    } finally {
      setLoadingPasses(false)
    }
  }, [])

  useEffect(() => {
    void loadPasses()
  }, [loadPasses])

  const loadStudentOptions = useCallback(async (inputValue) => {
    const term = inputValue?.trim()
    if (!term) return []
    const numeric = /^\d+$/.test(term)
    if (!numeric && term.length < 2) return []
    const items = await searchStudents(term, numeric ? 5 : 20, { exactNumericRegId: true })
    return items.map(studentOption)
  }, [])

  const allowedTodayByStudent = useMemo(() => {
    const map = new Map()
    for (const pass of passes) {
      for (const student of pass.students || []) {
        if (!map.has(student.studentId)) map.set(student.studentId, { pass, name: student.studentName })
      }
    }
    return map
  }, [passes])

  const onPickStudent = async (option) => {
    setStudentOptionValue(option)
    setMembers([])
    setSelectedIds([])
    if (!option?.student) return

    const student = option.student
    const active = student.isActive ?? student.IsActive
    if (active === false || active === 0) return
    const regId = student.reg_Id ?? student.Reg_Id
    const familyId = student.family_Code ?? student.Family_Code
    setSelectedIds(regId && !allowedTodayByStudent.has(regId) ? [regId] : [])

    if (!familyId) {
      setMembers([
        {
          reg_Id: regId,
          studentName: student.fullName ?? student.FullName,
          className: student.className ?? student.ClassName,
        },
      ])
      return
    }

    setLoadingFamily(true)
    try {
      const rows = await getStudentFamilyMembers(familyId)
      const list = Array.isArray(rows) && rows.length
        ? rows
        : [{ reg_Id: regId, studentName: student.fullName ?? student.FullName, className: student.className ?? student.ClassName }]
      setMembers(list)
      if (regId && !list.some((row) => memberId(row) === regId)) {
        setMembers([
          { reg_Id: regId, studentName: student.fullName ?? student.FullName, className: student.className ?? student.ClassName },
          ...list,
        ])
      }
    } catch {
      setMembers([
        { reg_Id: regId, studentName: student.fullName ?? student.FullName, className: student.className ?? student.ClassName },
      ])
    } finally {
      setLoadingFamily(false)
    }
  }

  const toggleStudent = (id) => {
    if (allowedTodayByStudent.has(id) && !selectedIds.includes(id)) return
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const resetForm = () => {
    setStudentOptionValue(null)
    setMembers([])
    setSelectedIds([])
    setRelation('Father')
    setRelativeKind('')
    setPickupName('')
    setReason('')
    setPickupTime(pakistanNowTime())
    setPhoneRequired(false)
    setPhoneWith('')
    setPhoneApproved(false)
    setConfirmOpen(false)
  }

  const duplicateNames = selectedIds
    .filter((id) => allowedTodayByStudent.has(id))
    .map((id) => allowedTodayByStudent.get(id)?.name || `#${id}`)

  const selectedNames = selectedIds.map((id) => {
    const member = members.find((row) => memberId(row) === id)
    return member ? memberName(member) : `#${id}`
  })

  const canSubmit = useMemo(() => {
    if (saving || selectedIds.length === 0 || duplicateNames.length > 0) return false
    if (pickupName.trim().length < 2 || reason.trim().length < 3 || !pickupTime) return false
    if (relation === 'Relative' && !relativeKind) return false
    if (callRequired && (phoneWith.trim().length < 2 || !phoneApproved)) return false
    return true
  }, [saving, selectedIds.length, duplicateNames.length, pickupName, reason, pickupTime, relation, relativeKind, callRequired, phoneWith, phoneApproved])

  const onSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const pass = await createShortLeave({
        studentIds: selectedIds,
        pickupPersonName: pickupName.trim(),
        pickupRelation: relation === 'Relative' ? relativeKind : relation,
        reason: reason.trim(),
        pickupTime,
        phoneConfirmationRequired: callRequired,
        phoneConfirmedWith: callRequired ? phoneWith.trim() : '',
        phoneCallApproved: callRequired ? phoneApproved : false,
      })
      toast.success('Short leave allowed.')
      resetForm()
      await loadPasses()
      printShortLeavePass(pass)
    } catch (error) {
      const status = error?.response?.status
      const message = error?.response?.data?.message || 'Could not allow short leave.'
      toast.error(message)
      if (status === 409) await loadPasses()
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const rows = await listShortLeaves({ dateFrom: historyFrom, dateTo: historyTo })
      setHistory(Array.isArray(rows) ? rows : [])
    } catch (error) {
      setHistory([])
      toast.error(error?.response?.data?.message || 'Could not load short leave history.')
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <CampusShell headerContext="Allow Short Leave">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <form onSubmit={(event) => event.preventDefault()} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <UserRoundCheck size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Allow Short Leave</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Record who is collecting the student today. Attendance is updated when you allow it.
                </p>
              </div>
            </div>

            <label className="block text-[13px] font-medium text-slate-700">
              Find student
              <div className="mt-1">
                <AsyncSelect
                  defaultOptions={false}
                  loadOptions={loadStudentOptions}
                  value={studentOptionValue}
                  onChange={(option) => void onPickStudent(option)}
                  placeholder="Name or registration number"
                  isClearable
                  classNamePrefix="react-select"
                />
              </div>
            </label>

            {loadingFamily ? (
              <p className="flex items-center gap-2 text-[13px] text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Looking up brothers and sisters…
              </p>
            ) : null}

            {members.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="text-[13px] font-medium text-slate-700">Leaving now</legend>
                {members.some((member) => allowedTodayByStudent.has(memberId(member))) ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    Short leave is already allowed today for{' '}
                    {members
                      .filter((member) => allowedTodayByStudent.has(memberId(member)))
                      .map((member) => memberName(member))
                      .join(', ')}
                    .
                  </p>
                ) : null}
                {members.map((member) => {
                  const id = memberId(member)
                  const already = allowedTodayByStudent.has(id)
                  const checked = selectedIds.includes(id)
                  return (
                    <label
                      key={id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-[13px] ${
                        already
                          ? 'cursor-not-allowed border-amber-200 bg-amber-50'
                          : checked
                            ? 'cursor-pointer border-[var(--campus-primary)] bg-[#405189]/10'
                            : 'cursor-pointer border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={already}
                        onChange={() => toggleStudent(id)}
                        className="h-4 w-4 accent-[var(--campus-primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-slate-900">{memberName(member)}</span>
                        <span className="ml-2 text-slate-500">#{id}{memberClass(member) ? ` · ${memberClass(member)}` : ''}</span>
                        {already ? <span className="mt-0.5 block text-[12px] font-medium text-amber-800">Already allowed today</span> : null}
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-slate-700">
                Name of the person who came to pick up
                <input
                  className={`${inputClass} mt-1`}
                  value={pickupName}
                  placeholder="Enter the name"
                  onChange={(event) => setPickupName(event.target.value)}
                />
              </label>
              <label className="block text-[13px] font-medium text-slate-700">
                Time
                <input
                  type="time"
                  className={`${inputClass} mt-1`}
                  value={pickupTime}
                  max={pakistanNowTime()}
                  onChange={(event) => setPickupTime(event.target.value)}
                />
              </label>
            </div>

            <fieldset>
              <legend className="text-[13px] font-medium text-slate-700">Relation</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {RELATIONS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRelation(item.value)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                        relation === item.value ? pillOn : pillOff
                      }`}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              {relation === 'Relative' ? (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIVE_KINDS.map((kind) => {
                      const Icon = kind.icon
                      return (
                        <button
                          key={kind.value}
                          type="button"
                          onClick={() => setRelativeKind(kind.value)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                            relativeKind === kind.value ? pillOn : pillOff
                          }`}
                        >
                          <Icon size={12} />
                          {kind.value}
                        </button>
                      )
                    })}
                  </div>
                  {!relativeKind ? (
                    <p className="mt-1.5 text-[12px] font-medium text-amber-800">Choose which relative came to pick up.</p>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

            <label className="block text-[13px] font-medium text-slate-700">
              Reason
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>

            <div className={`rounded-xl border px-3 py-3 ${someoneElse ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              {someoneElse ? (
                <p className="mb-2 text-[13px] font-medium text-amber-900">
                  Someone else is collecting the student. Call home and confirm before you allow this pickup.
                </p>
              ) : null}
              <label className="flex items-start gap-2 text-[13px] text-slate-800">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--campus-primary)]"
                  checked={callRequired}
                  disabled={someoneElse}
                  onChange={(event) => {
                    setPhoneRequired(event.target.checked)
                    if (!event.target.checked) setPhoneApproved(false)
                  }}
                />
                <span>A phone call was needed to confirm this pickup with home.</span>
              </label>
              {callRequired ? (
                <div className="mt-3 space-y-2 pl-6">
                  <label className="block text-[13px] font-medium text-slate-700">
                    Who was called
                    <input className={`${inputClass} mt-1`} value={phoneWith} onChange={(event) => setPhoneWith(event.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--campus-primary)]"
                      checked={phoneApproved}
                      onChange={(event) => setPhoneApproved(event.target.checked)}
                    />
                    The call approved this pickup.
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#405189] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Allow and print
              </button>
            </div>
          </form>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPanel('today')}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                  panel === 'today' ? 'bg-[#405189] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanel('history')
                  if (history.length === 0) void loadHistory()
                }}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                  panel === 'history' ? 'bg-[#405189] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                History
              </button>
            </div>

            {panel === 'today' ? (
              loadingPasses ? (
                <p className="mt-4 flex items-center gap-2 text-[13px] text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </p>
              ) : passes.length === 0 ? (
                <p className="mt-4 text-[13px] text-slate-500">No short leave allowed yet today.</p>
              ) : (
                <PassList passes={passes} />
              )
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[12px] font-medium text-slate-600">
                    From
                    <input type="date" className={`${inputClass} mt-1`} value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} />
                  </label>
                  <label className="text-[12px] font-medium text-slate-600">
                    To
                    <input type="date" className={`${inputClass} mt-1`} value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Show
                </button>
                {loadingHistory ? (
                  <p className="flex items-center gap-2 text-[13px] text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-[13px] text-slate-500">No short leave in this period.</p>
                ) : (
                  <PassList passes={history} showDate />
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Allow short leave?"
        description={
          <span>
            {selectedNames.join(', ')} will leave with {pickupName.trim() || 'the collector'} at {pickupTime}. This cannot be entered again for today.
          </span>
        }
        confirmLabel="Allow and print"
        busy={saving}
        onCancel={() => {
          if (!saving) setConfirmOpen(false)
        }}
        onConfirm={() => void onSubmit()}
      />
    </CampusShell>
  )
}

function PassList({ passes, showDate = false }) {
  return (
    <ul className="mt-3 space-y-2">
      {passes.map((pass) => (
        <li key={pass.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-900">
                {(pass.students || []).map((student) => student.studentName).join(', ') || 'Student'}
              </p>
              <p className="text-[12px] text-slate-500">
                {showDate ? `${formatListDate(pass.leaveDate)} · ` : ''}
                {pass.pickupPersonName} · {pass.pickupRelation} · {pass.pickupTime}
              </p>
            </div>
            <button
              type="button"
              onClick={() => printShortLeavePass(pass)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer size={13} />
              Print
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default CampusShortLeavePage

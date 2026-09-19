import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Banknote, Loader2, RefreshCw, UserRound, X } from 'lucide-react'
import AsyncSelect from 'react-select/async'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  getStudentAdmissionDetail,
  mapStudentToSelectOption,
  searchStudents,
  updateStudentTuitionFee,
} from '../../../services/studentService'

const embeddedSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '40px',
    border: 'none',
    borderRadius: '0 0.75rem 0.75rem 0',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    '&:hover': { border: 'none' },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 10,
    paddingRight: 4,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({ ...base, zIndex: 80 }),
  menuPortal: (base) => ({ ...base, zIndex: 80 }),
}

const inputClass =
  'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function debouncePromise(fn, waitMs) {
  let timer
  let pending
  return (...args) =>
    new Promise((resolve, reject) => {
      if (timer) clearTimeout(timer)
      pending = { resolve, reject }
      timer = setTimeout(async () => {
        try {
          pending.resolve(await fn(...args))
        } catch (error) {
          pending.reject(error)
        }
      }, waitMs)
    })
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function PrefixedSelectShell({ icon: Icon, label, children, className = '' }) {
  return (
    <div
      className={`flex w-full items-stretch rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-[var(--campus-primary)] focus-within:ring-2 focus-within:ring-indigo-100 ${className}`}
    >
      <div className="flex shrink-0 items-center gap-1.5 rounded-l-xl border-r border-slate-200 bg-slate-50 px-3 text-slate-600">
        <Icon size={16} className="text-[var(--campus-primary)]" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function CompareRow({ label, before, after }) {
  const changed = String(before ?? '') !== String(after ?? '')
  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl px-3 py-2.5 ${
        changed ? 'bg-amber-50/80' : 'bg-slate-50'
      }`}
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{before ?? '—'}</p>
      </div>
      <ArrowRight className={`h-4 w-4 ${changed ? 'text-amber-600' : 'text-slate-300'}`} />
      <div className="text-right">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">After</p>
        <p className={`mt-0.5 text-[13px] font-semibold ${changed ? 'text-emerald-700' : 'text-slate-800'}`}>
          {after ?? '—'}
        </p>
      </div>
    </div>
  )
}

function CampusStudentUpdateFeePage() {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [detail, setDetail] = useState(null)
  const [tuitionInput, setTuitionInput] = useState('')
  const [description, setDescription] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentToSelectOption)
    }, 300),
  ).current

  const clearForm = useCallback(() => {
    setSelectedStudent(null)
    setDetail(null)
    setTuitionInput('')
    setDescription('')
  }, [])

  const loadDetail = useCallback(async (regId) => {
    if (!regId) {
      setDetail(null)
      return
    }
    setIsLoadingDetail(true)
    try {
      const data = await getStudentAdmissionDetail(regId)
      setDetail(data)
      setTuitionInput(data.tuitionFee != null ? String(data.tuitionFee) : '0')
      setDescription('')
    } catch (error) {
      setDetail(null)
      toast.error(error?.response?.data?.message || 'Could not load student.')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    const regId = Number(selectedStudent?.value)
    if (regId) loadDetail(regId)
    else {
      setDetail(null)
      setTuitionInput('')
      setDescription('')
    }
  }, [selectedStudent, loadDetail])

  const preview = useMemo(() => {
    if (!detail) return null
    const classFee = Number(detail.classFee || 0)
    const currentTuition = Number(detail.tuitionFee || 0)
    const currentConcession = Number(detail.feeConcession ?? Math.max(0, classFee - currentTuition))
    const nextTuition = tuitionInput === '' ? null : Number(tuitionInput)
    const nextConcession = nextTuition == null || Number.isNaN(nextTuition)
      ? null
      : Math.max(0, classFee - nextTuition)
    const unchanged = nextTuition != null && nextTuition === currentTuition

    return {
      className: detail.className || '—',
      classFee,
      currentTuition,
      currentConcession,
      nextTuition,
      nextConcession,
      unchanged,
      invalid: nextTuition == null || Number.isNaN(nextTuition) || nextTuition < 0,
    }
  }, [detail, tuitionInput])

  const canSubmit =
    Boolean(detail) &&
    preview &&
    !preview.invalid &&
    !preview.unchanged &&
    !isSaving

  const openConfirm = (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  const performUpdate = async () => {
    if (!canSubmit || !detail || preview.nextTuition == null) return
    setIsSaving(true)
    const toastId = 'student-fee-update'
    toast.loading('Updating tuition fee...', { id: toastId })
    try {
      await updateStudentTuitionFee(detail.regId, {
        tuitionFee: preview.nextTuition,
        description: description.trim() || null,
      })
      toast.success('Tuition fee updated.', { id: toastId })
      setConfirmOpen(false)
      clearForm()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update tuition fee.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Update Fee">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-4xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Update Fee</h1>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Change a student’s tuition fee and review the effect on concession.
                  </p>
                </div>
              </div>
              {detail ? (
                <button
                  type="button"
                  onClick={() => loadDetail(detail.regId)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDetail ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              ) : null}
            </div>

            <div className="relative z-20 mt-4 flex justify-center">
              <PrefixedSelectShell icon={UserRound} label="Student" className="max-w-xl">
                <AsyncSelect
                  cacheOptions
                  defaultOptions={false}
                  loadOptions={loadStudentOptions}
                  value={selectedStudent}
                  onChange={setSelectedStudent}
                  placeholder="Search by name or ID"
                  isClearable
                  className="text-sm"
                  styles={embeddedSelectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  noOptionsMessage={({ inputValue }) =>
                    inputValue?.trim()?.length >= 2 ? 'No students found' : 'Type at least 2 characters'
                  }
                />
              </PrefixedSelectShell>
            </div>
          </section>

          {isLoadingDetail && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {!isLoadingDetail && detail && preview && (
            <form onSubmit={openConfirm} className="space-y-4">
              <section className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{detail.fullName}</h2>
                    <p className="text-[13px] text-slate-500">
                      ID {detail.regId}
                      {detail.fatherName ? ` · ${detail.fatherName}` : ''}
                    </p>
                  </div>
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-700">
                    {preview.className}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Class fee</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{money(preview.classFee)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Current tuition</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{money(preview.currentTuition)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Current concession</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{money(preview.currentConcession)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block text-[12px] font-medium text-slate-600">
                    New tuition fee
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={inputClass}
                      value={tuitionInput}
                      onChange={(e) => setTuitionInput(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="Enter amount"
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-slate-600">
                    Note (optional)
                    <input
                      type="text"
                      className={inputClass}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional note for the activity log"
                      maxLength={1000}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Before and after</h3>
                <div className="space-y-2">
                  <CompareRow
                    label="Tuition fee"
                    before={money(preview.currentTuition)}
                    after={preview.nextTuition == null || Number.isNaN(preview.nextTuition)
                      ? '—'
                      : money(preview.nextTuition)}
                  />
                  <CompareRow
                    label="Concession"
                    before={money(preview.currentConcession)}
                    after={preview.nextConcession == null ? '—' : money(preview.nextConcession)}
                  />
                  <CompareRow
                    label="Class fee"
                    before={money(preview.classFee)}
                    after={money(preview.classFee)}
                  />
                </div>
                <p className="mt-3 text-[12px] text-slate-500">
                  Concession is recalculated as class fee minus tuition.
                </p>
              </section>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-5 text-[13px] font-medium text-white hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Banknote className="h-4 w-4" />
                  Save fee
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {confirmOpen && detail && preview ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Banknote size={21} />
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setConfirmOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <h2 id="fee-confirm-title" className="text-lg font-bold text-slate-900">
                Update tuition fee?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {detail.fullName}’s tuition will change from{' '}
                <span className="font-semibold text-slate-800">{money(preview.currentTuition)}</span> to{' '}
                <span className="font-semibold text-slate-800">{money(preview.nextTuition)}</span>.
                Concession becomes{' '}
                <span className="font-semibold text-slate-800">{money(preview.nextConcession)}</span>.
              </p>
              {description.trim() ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                  <span className="font-medium text-slate-800">Note: </span>
                  {description.trim()}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={performUpdate}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                Update fee
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStudentUpdateFeePage

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import { AccessForbiddenPanel } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  approveLeaveApplication,
  getLeaveApplications,
  rejectLeaveApplication,
} from '../../../services/studentLeaveApplicationService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import { getPakistanTodayIso } from '../../../utils/pakistanDate.js'

const todayIso = getPakistanTodayIso()
const DETAILS_PREVIEW_MAX = 100

const clipDetailsPreview = (text) => {
  const full = String(text || '').trim()
  if (!full) return { preview: '', truncated: false, full: '' }
  if (full.length <= DETAILS_PREVIEW_MAX) return { preview: full, truncated: false, full }
  return {
    preview: `${full.slice(0, DETAILS_PREVIEW_MAX)}…`,
    truncated: true,
    full,
  }
}

function LeaveDetailsDialog({ open, studentName, reasonLabel, details, onClose }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-details-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 id="leave-details-title" className="text-base font-semibold text-slate-900">
              Reason details
            </h3>
            {studentName ? (
              <p className="mt-0.5 text-[13px] text-slate-500">{studentName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(60vh,20rem)] overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-slate-700">
          {reasonLabel ? (
            <p className="mb-2 font-medium text-slate-800">{reasonLabel}</p>
          ) : null}
          <p className="whitespace-pre-wrap break-words">{details || '—'}</p>
        </div>
        <div className="flex justify-end bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const formatLeaveDate = (value) => {
  const iso = String(value || '').slice(0, 10)
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso || '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
}

function StatusBadge({ status, label }) {
  const key = String(status || '').toLowerCase()
  if (key === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800">
        <Check className="h-3 w-3" />
        {label || 'Approved'}
      </span>
    )
  }
  if (key === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[12px] font-medium text-rose-800">
        <X className="h-3 w-3" />
        {label || 'Rejected'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-800">
      {label || 'Pending'}
    </span>
  )
}

export default function CampusLeaveApplicationsPage() {
  const canView = hasCampusPermission('view_leave_applications')
  const canManage = hasCampusPermission('manage_leave_applications')
  const [searchParams, setSearchParams] = useSearchParams()

  const initialStatus = searchParams.get('status') || 'pending'

  const [status, setStatus] = useState(initialStatus)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [actingId, setActingId] = useState(null)
  const [highlightLeaveId, setHighlightLeaveId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [detailsDialog, setDetailsDialog] = useState(null)

  useEffect(() => {
    const fromQuery = searchParams.get('status')
    if (fromQuery && searchParams.get('autoSearch') !== '1') setStatus(fromQuery)
  }, [searchParams])

  const load = useCallback(async (overrides = {}) => {
    if (!canView) return []
    const statusVal = overrides.status ?? status
    const from = overrides.dateFrom ?? dateFrom
    const to = overrides.dateTo ?? dateTo
    const searchVal = overrides.search ?? search

    setIsLoading(true)
    try {
      const items = await getLeaveApplications({
        status: statusVal,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        search: searchVal,
      })
      setRows(items)
      return items
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load leave requests.')
      setRows([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [canView, status, dateFrom, dateTo, search])

  useEffect(() => {
    if (searchParams.get('autoSearch') === '1') return
    void load()
  }, [load, searchParams])

  useEffect(() => {
    if (!canView) return
    if (searchParams.get('autoSearch') !== '1') return

    const date = searchParams.get('date') || ''
    const statusFilter = searchParams.get('status') || 'pending'
    const idRaw = Number.parseInt(searchParams.get('id') || '', 10)
    const leaveId = Number.isFinite(idRaw) && idRaw > 0 ? idRaw : null

    setSearchParams({}, { replace: true })
    setStatus(statusFilter)
    if (date) {
      setDateFrom(date)
      setDateTo(date)
    }
    setSearch('')

    let pulseTimer
    void (async () => {
      const data = await load({
        status: statusFilter,
        dateFrom: date,
        dateTo: date,
        search: '',
      })
      if (!leaveId || !data?.length) return
      const hasMatch = data.some((row) => Number(row.id) === leaveId)
      if (!hasMatch) return
      setHighlightLeaveId(leaveId)
      pulseTimer = window.setTimeout(() => setHighlightLeaveId(null), 2000)
    })()

    return () => {
      if (pulseTimer) window.clearTimeout(pulseTimer)
    }
  }, [canView, searchParams, setSearchParams, load])

  const subtitle = useMemo(() => {
    if (status === 'pending') return 'Requests awaiting your decision'
    if (status === 'approved') return 'Approved leave requests'
    if (status === 'rejected') return 'Rejected leave requests'
    return 'All family leave requests'
  }, [status])

  const runDecision = async (kind, row) => {
    if (!canManage || !row) return
    setActingId(row.id)
    try {
      if (kind === 'approve') {
        await approveLeaveApplication(row.id)
        toast.success('Leave approved.')
      } else {
        await rejectLeaveApplication(row.id)
        toast.success('Leave rejected.')
      }
      await load()
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (kind === 'approve' ? 'Could not approve leave.' : 'Could not reject leave.'),
      )
    } finally {
      setActingId(null)
      setConfirmDialog(null)
    }
  }

  const handleConfirmDecision = () => {
    if (!confirmDialog?.row || !confirmDialog?.kind) return
    void runDecision(confirmDialog.kind, confirmDialog.row)
  }

  const openApproveConfirm = (row) => {
    if (!canManage) return
    setConfirmDialog({
      kind: 'approve',
      row,
      title: 'Approve leave?',
      description: (
        <>
          Approve leave for <span className="font-medium text-slate-800">{row.studentName}</span> on{' '}
          <span className="font-medium text-slate-800">{formatLeaveDate(row.leaveDate)}</span>?
          Attendance for that day will be marked as leave.
        </>
      ),
    })
  }

  const openRejectConfirm = (row) => {
    if (!canManage) return
    setConfirmDialog({
      kind: 'reject',
      row,
      title: 'Reject leave?',
      description: (
        <>
          Reject leave for <span className="font-medium text-slate-800">{row.studentName}</span> on{' '}
          <span className="font-medium text-slate-800">{formatLeaveDate(row.leaveDate)}</span>?
          Attendance for that day will be marked as absent.
        </>
      ),
    })
  }

  const confirmBusy = actingId != null && confirmDialog?.row?.id === actingId

  if (!canView) {
    return (
      <CampusShell headerContext="Leave applications">
        <AccessForbiddenPanel message="You do not have access to view leave applications." />
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Leave applications">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Leave applications</h1>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={isLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-[12px] font-medium text-slate-600">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${inputClass} mt-1`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-slate-600">
                From date
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || todayIso}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`${inputClass} mt-1`}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <label className="block text-[12px] font-medium text-slate-600">
                To date
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  max={todayIso}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`${inputClass} mt-1`}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
              </label>
              <label className="block text-[12px] font-medium text-slate-600">
                Search
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or reg. no."
                    className={`${inputClass} pl-9`}
                    {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px] leading-snug">
                <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center text-slate-500">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center text-slate-500">
                        No leave requests match your filters.
                      </td>
                    </tr>
                  ) : null}
                  {rows.map((row) => {
                    const isPending = String(row.status || '').toLowerCase() === 'pending'
                    const busy = actingId === row.id
                    const isHighlighted =
                      highlightLeaveId != null && Number(row.id) === highlightLeaveId
                    return (
                      <tr
                        key={row.id}
                        className={`text-slate-800 ${isHighlighted ? 'fee-txn-row-pulse' : ''}`}
                      >
                        <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-900">
                          {formatLeaveDate(row.leaveDate)}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{row.studentName}</div>
                          <div className="text-[12px] text-slate-500">
                            {row.className ? `${row.className} · ` : ''}Reg {row.studentId} · Family {row.familyId}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">
                          <div>{row.reasonLabel || row.reasonCode}</div>
                          {row.reasonDetails ? (
                            (() => {
                              const { preview, truncated, full } = clipDetailsPreview(row.reasonDetails)
                              if (!preview) return null
                              if (!truncated) {
                                return (
                                  <div className="mt-0.5 max-w-md truncate text-[12px] text-slate-500">
                                    {preview}
                                  </div>
                                )
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailsDialog({
                                      studentName: row.studentName,
                                      reasonLabel: row.reasonLabel || row.reasonCode,
                                      details: full,
                                    })
                                  }
                                  className="mt-0.5 block max-w-md truncate text-left text-[12px] text-indigo-600 hover:text-indigo-800 hover:underline"
                                  title="View full details"
                                >
                                  {preview}
                                </button>
                              )
                            })()
                          ) : null}
                        </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={row.status} label={row.statusLabel} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                          {formatLeaveDate(String(row.submittedAtPkt || '').slice(0, 10))}
                        </td>
                        {canManage ? (
                          <td className="px-3 py-1.5">
                            {isPending ? (
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openApproveConfirm(row)}
                                  className="btn-table-action text-emerald-700 hover:bg-emerald-50"
                                  title="Approve"
                                >
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openRejectConfirm(row)}
                                  className="btn-table-action text-rose-700 hover:bg-rose-50"
                                  title="Reject"
                                >
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                </button>
                              </div>
                            ) : (
                              <span className="block text-right text-[12px] text-slate-400">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.kind === 'reject' ? 'Reject' : 'Approve'}
        cancelLabel="Cancel"
        busy={confirmBusy}
        confirmClass={
          confirmDialog?.kind === 'reject'
            ? 'inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60'
            : 'inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60'
        }
        onCancel={() => {
          if (!confirmBusy) setConfirmDialog(null)
        }}
        onConfirm={handleConfirmDecision}
      />

      <LeaveDetailsDialog
        open={Boolean(detailsDialog)}
        studentName={detailsDialog?.studentName}
        reasonLabel={detailsDialog?.reasonLabel}
        details={detailsDialog?.details}
        onClose={() => setDetailsDialog(null)}
      />
    </CampusShell>
  )
}

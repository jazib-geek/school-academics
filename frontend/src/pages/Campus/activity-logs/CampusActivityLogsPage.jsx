import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, History, Loader2, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getActivityLogLookups, getActivityLogs } from '../../../services/activityLogService'
import { getCampusUsers } from '../../../services/campusUserService'

const PAGE_SIZE = 25

const FIELD_LABELS = {
  fullName: 'Student name',
  nameInUrdu: 'Name in Urdu',
  homeAddress: 'Home address',
  localityId: 'Locality',
  caste: 'Caste',
  gender: 'Gender',
  isOrphan: 'Orphan',
  isHafiz: 'Hafiz',
  religion: 'Religion',
  dateOfBirth: 'Date of birth',
  bFormNum: 'B-Form',
  subjectGroupId: 'Subject group',
  medium: 'Medium',
  prevSchoolName: 'Previous school',
  prevSchoolClass: 'Previous class',
  specialNotes: 'Special notes',
  homePhone: 'Home phone',
  smsContact: 'SMS contact',
  regDate: 'Registration date',
  fatherName: 'Father name',
  fatherCnic: 'Father CNIC',
  fatherOccupationId: 'Father occupation',
  fatherQualificationId: 'Father qualification',
  fatherMobileNo: 'Father mobile',
  motherName: 'Mother name',
  motherCnic: 'Mother CNIC',
  motherPhoneNo: 'Mother phone',
  motherQualificationId: 'Mother qualification',
  motherOccupationId: 'Mother occupation',
  familyHomePhone: 'Family home phone',
  familyHomeAddress: 'Family address',
  classCompositeId: 'Class id',
  className: 'Class',
  classFee: 'Class fee',
  tuitionFee: 'Tuition fee',
  feeConcession: 'Fee concession',
  isActive: 'Active',
  leaveDate: 'Leave date',
  componentType: 'Type',
  amount: 'Amount',
  description: 'Description',
  month: 'Month',
  year: 'Year',
  employeeId: 'Employee ID',
  employeeName: 'Employee',
  purchaseDate: 'Purchase date',
  handoverDate: 'Handover date',
  totalAmount: 'Total amount',
  postedToAccounts: 'Posted to accounts',
  voucherNo: 'Voucher no.',
  lineCount: 'Line count',
  fileName: 'File name',
  created: 'Created',
  overwritten: 'Overwritten',
  skippedUnknown: 'Skipped (unknown)',
  skippedEmpty: 'Skipped (empty)',
  skippedNoDuty: 'Skipped (no duty)',
  adminMinutesBefore: 'Admin minutes before',
  coordinatorMinutesBefore: 'Coordinator minutes before',
  fridayCheckOut: 'Friday check-out',
  dates: 'Dates',
  unknownEmployeeCodes: 'Unknown employee codes',
  source: 'Source',
  wasCreated: 'Created new',
  time: 'Check-in',
  checkOutTime: 'Check-out',
  lateComings: 'Late comings',
  date: 'Date',
  reason: 'Reason',
  markedCount: 'Marked',
  skippedCount: 'Skipped',
  existingCount: 'Already present',
  recalculatedCount: 'Recalculated',
  overwriteExisting: 'Overwrite existing',
}

const ACTIVITY_LABELS = {
  StudentEdit: 'Student edit',
  StudentBulkEdit: 'Student bulk edit',
  StudentTransfer: 'Student transfer',
  StudentFeeUpdate: 'Fee update',
  StudentActivate: 'Student activate',
  StudentDeactivate: 'Student deactivate',
  EmployeeAttendanceEdit: 'Attendance edit',
  EmployeeAttendanceMarkPresent: 'Attendance mark present',
  EmployeeAttendanceMarkHoliday: 'Attendance mark holiday',
  EmployeeAttendanceDelete: 'Attendance delete',
  EmployeeAttendanceBackfill: 'Attendance backfill',
  EmployeeAttendanceRecalculateDutyTimes: 'Attendance duty times',
  EmployeeAttendanceImport: 'Attendance import',
  FeeReceiptVoid: 'Fee receipt void',
  FeeReceiptEdit: 'Fee receipt edit',
  StationeryPurchase: 'Stationery purchase',
  StationeryHandover: 'Stationery handover',
  EmployeeSalaryComponentEdit: 'Salary adjustment edit',
  EmployeeSalaryComponentDelete: 'Salary adjustment delete',
}

const META_KEYS = new Set([
  'changes',
  'before',
  'after',
  'description',
  'familyAddressUpdatedCount',
  'raw',
])

const inputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const emptyFilters = {
  activityType: '',
  userId: '',
  entityId: '',
  dateFrom: '',
  dateTo: '',
}

function formatPktDateTime(value) {
  if (!value) return '—'
  const raw = String(value)
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function humanizeKey(key) {
  if (!key) return '—'
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function displayValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === 'true') return 'Yes'
  if (value === 'false') return 'No'
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    if (value.every((item) => item == null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => displayValue(item)).join(', ')
    }
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function flattenObject(obj, prefix = '') {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, path))
    } else {
      out[path] = value
    }
  }
  return out
}

function diffObjects(before, after) {
  const left = flattenObject(before || {})
  const right = flattenObject(after || {})
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
  return keys
    .map((field) => ({
      field,
      old: left[field],
      new: right[field],
    }))
    .filter((row) => displayValue(row.old) !== displayValue(row.new))
}

function parseDetails(detailsJson) {
  if (!detailsJson) {
    return {
      changes: [],
      beforeAfterChanges: [],
      familyAddressUpdatedCount: 0,
      description: null,
      facts: [],
      lists: [],
      nested: [],
      empty: true,
    }
  }

  let parsed
  try {
    parsed = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson
  } catch {
    return {
      changes: [],
      beforeAfterChanges: [],
      familyAddressUpdatedCount: 0,
      description: null,
      facts: [],
      lists: [],
      nested: [],
      raw: String(detailsJson),
      empty: false,
    }
  }

  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      changes: [],
      beforeAfterChanges: [],
      familyAddressUpdatedCount: 0,
      description: null,
      facts: [],
      lists: [],
      nested: [],
      raw: displayValue(parsed),
      empty: false,
    }
  }

  const changes = Array.isArray(parsed.changes) ? parsed.changes : []
  const beforeAfterChanges =
    parsed.before != null || parsed.after != null ? diffObjects(parsed.before, parsed.after) : []

  const facts = []
  const lists = []
  const nested = []

  for (const [key, value] of Object.entries(parsed)) {
    if (META_KEYS.has(key)) continue
    if (Array.isArray(value)) {
      lists.push({ key, label: humanizeKey(key), value })
      continue
    }
    if (value != null && typeof value === 'object') {
      nested.push({ key, label: humanizeKey(key), value })
      continue
    }
    facts.push({ key, label: humanizeKey(key), value })
  }

  return {
    changes,
    beforeAfterChanges,
    familyAddressUpdatedCount: Number(parsed.familyAddressUpdatedCount || 0),
    description: parsed.description || null,
    facts,
    lists,
    nested,
    empty: false,
  }
}

function detailsPreview(details) {
  if (details.raw) return 'Raw data'
  if (details.changes.length > 0) {
    const n = details.changes.length
    return `${n} field${n === 1 ? '' : 's'}`
  }
  if (details.beforeAfterChanges.length > 0) {
    const n = details.beforeAfterChanges.length
    return `${n} change${n === 1 ? '' : 's'}`
  }
  if (details.familyAddressUpdatedCount > 0) return 'Family address updated'
  if (details.description) return 'Note'
  if (details.facts.length || details.lists.length || details.nested.length) return 'View details'
  if (details.empty) return '—'
  return 'View details'
}

function ChangeTable({ rows }) {
  if (!rows?.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-[13px] leading-snug">
        <thead className="bg-[var(--campus-primary)] text-white">
          <tr>
            <th className="px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Previous</th>
            <th className="px-3 py-2 font-semibold">New</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((change) => (
            <tr key={change.field}>
              <td className="px-3 py-1.5 font-medium text-slate-800">{humanizeKey(change.field)}</td>
              <td className="px-3 py-1.5 text-slate-600">{displayValue(change.old)}</td>
              <td className="px-3 py-1.5 text-slate-800">{displayValue(change.new)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FactsTable({ rows }) {
  if (!rows?.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-[13px] leading-snug">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Detail</th>
            <th className="px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-1.5 font-medium text-slate-800">{row.label}</td>
              <td className="px-3 py-1.5 text-slate-700">{displayValue(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActivityLogDetailsModal({ row, onClose }) {
  if (!row) return null

  const details = parseDetails(row.detailsJson)
  const activityLabel = ACTIVITY_LABELS[row.activityType] || row.activityType
  const changeRows =
    details.changes.length > 0
      ? details.changes
      : details.beforeAfterChanges.length > 0
        ? details.beforeAfterChanges
        : []

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-log-details-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">Activity details</p>
            <h3 id="activity-log-details-title" className="mt-0.5 truncate text-base font-semibold text-slate-900">
              {activityLabel}
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              {formatPktDateTime(row.occurredAtPkt)}
              {row.userName ? ` · ${row.userName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px]">
            <div className="font-medium text-slate-900">{row.entityLabel || '—'}</div>
            <div className="mt-0.5 text-slate-500">
              {[row.entityType, row.entityId ? `ID ${row.entityId}` : null].filter(Boolean).join(' · ') ||
                'No record link'}
            </div>
          </div>

          {details.description ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              <span className="font-semibold">Note: </span>
              {details.description}
            </p>
          ) : null}

          {details.familyAddressUpdatedCount > 0 ? (
            <p className="text-[13px] text-slate-600">
              Also updated home address for {details.familyAddressUpdatedCount} other family member
              {details.familyAddressUpdatedCount === 1 ? '' : 's'}.
            </p>
          ) : null}

          {changeRows.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Changes</h4>
              <ChangeTable rows={changeRows} />
            </div>
          ) : null}

          {details.facts.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Summary</h4>
              <FactsTable rows={details.facts} />
            </div>
          ) : null}

          {details.lists.map((list) => (
            <div key={list.key} className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{list.label}</h4>
              {Array.isArray(list.value) && list.value.length > 0 ? (
                list.value.every((item) => item == null || ['string', 'number', 'boolean'].includes(typeof item)) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {list.value.map((item, index) => (
                      <span
                        key={`${list.key}-${index}`}
                        className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
                      >
                        {displayValue(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
                    {JSON.stringify(list.value, null, 2)}
                  </pre>
                )
              ) : (
                <p className="text-[13px] text-slate-500">None</p>
              )}
            </div>
          ))}

          {details.nested.map((item) => (
            <div key={item.key} className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</h4>
              <FactsTable
                rows={Object.entries(flattenObject(item.value)).map(([key, value]) => ({
                  key,
                  label: humanizeKey(key),
                  value,
                }))}
              />
            </div>
          ))}

          {details.raw ? (
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
              {details.raw}
            </pre>
          ) : null}

          {!details.raw &&
          changeRows.length === 0 &&
          details.facts.length === 0 &&
          details.lists.length === 0 &&
          details.nested.length === 0 &&
          !details.description &&
          details.familyAddressUpdatedCount === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-500">No extra details were saved for this entry.</p>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CampusActivityLogsPage() {
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [lookups, setLookups] = useState({ activityTypes: [], users: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)

  const loadLookups = useCallback(async () => {
    try {
      const [lookupsData, campusUsers] = await Promise.all([
        getActivityLogLookups().catch(() => ({ activityTypes: [] })),
        getCampusUsers(),
      ])
      setLookups({
        activityTypes: lookupsData.activityTypes || [],
        users: (campusUsers || []).map((user) => ({
          id: user.id,
          name: user.username || `User #${user.id}`,
        })),
      })
    } catch {
      // Lookups are optional for filtering; page still works without them.
    }
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = {
        pageNumber,
        pageSize: PAGE_SIZE,
      }
      if (applied.activityType) params.activityType = applied.activityType
      if (applied.userId) params.userId = Number(applied.userId)
      if (applied.entityId) params.entityId = Number(applied.entityId)
      if (applied.dateFrom) params.dateFrom = applied.dateFrom
      if (applied.dateTo) params.dateTo = applied.dateTo

      const data = await getActivityLogs(params)
      setRows(data.items || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load activity logs.')
    } finally {
      setIsLoading(false)
    }
  }, [applied, pageNumber])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    load()
  }, [load])

  const activityTypeOptions = useMemo(() => {
    if (lookups.activityTypes?.length) return lookups.activityTypes
    return Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label }))
  }, [lookups.activityTypes])

  const applyFilters = (event) => {
    event.preventDefault()
    setPageNumber(1)
    setApplied({ ...filters })
  }

  const resetFilters = () => {
    setFilters(emptyFilters)
    setApplied(emptyFilters)
    setPageNumber(1)
  }

  return (
    <CampusShell headerContext="Activity Logs">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Activity Logs</h1>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Track who made changes and what was updated.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => load()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <form onSubmit={applyFilters} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="block text-[12px] font-medium text-slate-600">
                Activity
                <select
                  className={`${inputClass} mt-1`}
                  value={filters.activityType}
                  onChange={(e) => setFilters((prev) => ({ ...prev, activityType: e.target.value }))}
                >
                  <option value="">All activities</option>
                  {activityTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[12px] font-medium text-slate-600">
                User
                <select
                  className={`${inputClass} mt-1`}
                  value={filters.userId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
                >
                  <option value="">All users</option>
                  {(lookups.users || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[12px] font-medium text-slate-600">
                Record ID
                <input
                  type="number"
                  min="1"
                  className={`${inputClass} mt-1`}
                  value={filters.entityId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, entityId: e.target.value }))}
                  placeholder="ID"
                />
              </label>

              <label className="block text-[12px] font-medium text-slate-600">
                From
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
              </label>

              <label className="block text-[12px] font-medium text-slate-600">
                To
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </label>

              <div className="flex flex-wrap items-end gap-2 xl:col-span-5">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg bg-[var(--campus-primary)] px-4 text-[13px] font-medium text-white hover:bg-[#364574]"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <p className="text-[13px] text-slate-500">
                {totalCount.toLocaleString()} {totalCount === 1 ? 'entry' : 'entries'}
              </p>
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <button
                  type="button"
                  disabled={pageNumber <= 1 || isLoading}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>
                  Page {totalPages === 0 ? 0 : pageNumber} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageNumber >= totalPages || isLoading}
                  onClick={() => setPageNumber((p) => p + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px] leading-snug">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Activity</th>
                    <th className="px-3 py-2 font-medium">Record</th>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Details</th>
                    <th className="px-3 py-2 font-medium w-10" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                        No activity found for these filters.
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    rows.map((row) => {
                      const details = parseDetails(row.detailsJson)
                      const preview = detailsPreview(details)
                      return (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                            {formatPktDateTime(row.occurredAtPkt)}
                          </td>
                          <td className="px-3 py-1.5 text-slate-800">
                            {ACTIVITY_LABELS[row.activityType] || row.activityType}
                          </td>
                          <td className="px-3 py-1.5 text-slate-800">
                            <div className="font-medium">{row.entityLabel || '—'}</div>
                            {row.entityId ? (
                              <div className="text-[12px] text-slate-500">ID {row.entityId}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-1.5 text-slate-700">{row.userName || '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700">{preview}</td>
                          <td className="px-3 py-1.5">
                            <button
                              type="button"
                              className="btn-icon-soft inline-flex h-7 w-7 items-center justify-center text-[var(--campus-primary)]"
                              onClick={() => setSelectedRow(row)}
                              title="View details"
                              aria-label="View details"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ActivityLogDetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />
    </CampusShell>
  )
}

export default CampusActivityLogsPage

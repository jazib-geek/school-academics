import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, History, Loader2, X } from 'lucide-react'
import { getActivityLogs } from '../../../services/activityLogService'

const PAGE_SIZE = 15

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
}

const ACTIVITY_LABELS = {
  StudentEdit: 'Student edit',
  StudentBulkEdit: 'Student bulk edit',
  StudentTransfer: 'Student transfer',
  StudentFeeUpdate: 'Fee update',
  StudentActivate: 'Student activate',
  StudentDeactivate: 'Student deactivate',
  FeeReceiptVoid: 'Fee receipt void',
  FeeReceiptEdit: 'Fee receipt edit',
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

function fieldLabel(field) {
  return FIELD_LABELS[field] || field
}

function displayValue(value) {
  if (value == null || value === '') return '—'
  if (value === 'true') return 'Yes'
  if (value === 'false') return 'No'
  return String(value)
}

function parseDetails(detailsJson) {
  if (!detailsJson) return { changes: [], familyAddressUpdatedCount: 0, description: null }
  try {
    const parsed = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson
    return {
      changes: Array.isArray(parsed?.changes) ? parsed.changes : [],
      familyAddressUpdatedCount: Number(parsed?.familyAddressUpdatedCount || 0),
      description: parsed?.description || null,
      source: parsed?.source || null,
    }
  } catch {
    return { changes: [], familyAddressUpdatedCount: 0, description: null, raw: detailsJson }
  }
}

function StudentActivityLogsModal({ student, onClose }) {
  const [rows, setRows] = useState([])
  const [pageNumber, setPageNumber] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const regId = student?.reg_Id

  const loadLogs = useCallback(async (page) => {
    if (!regId) return
    setIsLoading(true)
    try {
      const data = await getActivityLogs({
        entityType: 'Student',
        entityId: regId,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      })
      setRows(data?.items || [])
      setTotalCount(data?.totalCount || 0)
      setTotalPages(data?.totalPages || 0)
      setPageNumber(data?.pageNumber || page)
      setExpandedId(null)
    } catch {
      setRows([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }, [regId])

  useEffect(() => {
    void loadLogs(1)
  }, [loadLogs])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[84] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-activity-logs-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <History size={14} />
              Activity logs
            </p>
            <h2 id="student-activity-logs-title" className="mt-0.5 truncate text-lg font-semibold text-slate-900">
              {student?.fullName || `Student ${regId}`}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Reg #{regId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-white"
            aria-label="Close activity logs"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <p className="text-[13px] text-slate-500">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'entry' : 'entries'}
          </p>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <button
                type="button"
                disabled={pageNumber <= 1 || isLoading}
                onClick={() => void loadLogs(pageNumber - 1)}
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
                onClick={() => void loadLogs(pageNumber + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
              <Loader2 size={20} className="animate-spin text-[var(--campus-primary)]" />
              <span className="text-sm">Loading activity...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No activity recorded for this student.
            </div>
          ) : (
            <table className="min-w-full text-left text-[13px] leading-snug">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Activity</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Summary</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const details = parseDetails(row.detailsJson)
                  const isOpen = expandedId === row.id
                  const changeCount = details.changes.length
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                          {formatPktDateTime(row.occurredAtPkt)}
                        </td>
                        <td className="px-3 py-1.5 text-slate-800">
                          {ACTIVITY_LABELS[row.activityType] || row.activityType}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">{row.userName || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {details.description ? (
                            <span className="line-clamp-2">{details.description}</span>
                          ) : changeCount > 0 ? (
                            `${changeCount} field${changeCount === 1 ? '' : 's'} changed`
                          ) : details.familyAddressUpdatedCount > 0 ? (
                            'Family address updated'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            type="button"
                            className="btn-icon-soft"
                            onClick={() => setExpandedId(isOpen ? null : row.id)}
                            aria-label={isOpen ? 'Hide details' : 'Show details'}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-t border-slate-100 bg-slate-50/80">
                          <td colSpan={5} className="px-3 py-3">
                            {details.raw ? (
                              <pre className="overflow-x-auto rounded-lg bg-white p-3 text-[12px] text-slate-700">
                                {details.raw}
                              </pre>
                            ) : (
                              <div className="space-y-2">
                                {details.description ? (
                                  <p className="rounded-lg bg-white px-3 py-2 text-[13px] text-slate-700">
                                    <span className="font-medium text-slate-900">Note: </span>
                                    {details.description}
                                  </p>
                                ) : null}
                                {details.familyAddressUpdatedCount > 0 ? (
                                  <p className="text-[12px] text-slate-600">
                                    Also updated home address for {details.familyAddressUpdatedCount} other family
                                    member{details.familyAddressUpdatedCount === 1 ? '' : 's'}.
                                  </p>
                                ) : null}
                                {changeCount === 0 ? (
                                  <p className="text-[13px] text-slate-500">No field changes recorded.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="min-w-full text-left text-[13px] leading-snug">
                                      <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                          <th className="px-3 py-2 font-medium">Field</th>
                                          <th className="px-3 py-2 font-medium">Previous</th>
                                          <th className="px-3 py-2 font-medium">New</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {details.changes.map((change) => (
                                          <tr
                                            key={`${row.id}-${change.field}`}
                                            className="border-t border-slate-100"
                                          >
                                            <td className="px-3 py-1.5 font-medium text-slate-800">
                                              {fieldLabel(change.field)}
                                            </td>
                                            <td className="px-3 py-1.5 text-slate-600">
                                              {displayValue(change.old)}
                                            </td>
                                            <td className="px-3 py-1.5 text-slate-800">
                                              {displayValue(change.new)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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

export default StudentActivityLogsModal

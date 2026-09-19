import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, Clock3, Eye, ImagePlus, Loader2, NotebookPen, Pencil, Trash2, User, X } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { hasEmployeeAppAccess } from '../../../services/employeeAppAccess'
import {
  deleteClassDiary,
  diaryRowClassId,
  diaryRowDateKey,
  diaryRowLastUpdatedAt,
  diaryRowLastUpdatedBy,
  getClassDiaryListing,
  parseDiaryDisplayImgUrls,
} from '../../../services/classDiaryService'
import { formatDiaryAuditPillTime } from '../../../utils/diaryUploadAudit'
import { resolveClassLabel, sortClassesByCustomOrder } from '../../../services/classSort'
import { formatDateLabel, getPakistanTodayIso } from './employeeAcademicsUtils'

function DiaryListingMeta({ row }) {
  const by = diaryRowLastUpdatedBy(row)?.trim()
  const atLabel = formatDiaryAuditPillTime(diaryRowLastUpdatedAt(row))

  if (!by && !atLabel) {
    return (
      <span className="emp-diary-meta-pill emp-diary-meta-pill-muted mt-2">Upload details unavailable</span>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {by ? (
        <span className="emp-diary-meta-pill emp-diary-meta-pill-user max-w-full">
          <User size={13} strokeWidth={2.25} aria-hidden />
          <span className="truncate">{by}</span>
        </span>
      ) : null}
      {atLabel ? (
        <span className="emp-diary-meta-pill emp-diary-meta-pill-time">
          <Clock3 size={13} strokeWidth={2.25} aria-hidden />
          <span>{atLabel}</span>
        </span>
      ) : null}
    </div>
  )
}

function DeleteConfirm({ open, className, dateLabel, deleting, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="text-base font-semibold text-[var(--emp-text)]">Delete daily diary?</h3>
        <p className="mt-2 text-sm text-[var(--emp-text-muted)]">
          This removes the diary for <span className="font-medium text-slate-800">{className}</span> on{' '}
          <span className="font-medium text-slate-800">{dateLabel}</span>, including all uploaded images.
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={deleting} className="emp-cta-btn h-11 flex-1 border-slate-200 text-slate-700">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="emp-cta-btn emp-cta-btn-danger h-11 flex-1">
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function DiaryImagePopup({ row, onClose }) {
  const cacheKey = diaryRowLastUpdatedAt(row) ?? ''
  const [urls, setUrls] = useState([])

  useEffect(() => {
    setUrls(parseDiaryDisplayImgUrls(row))
  }, [row, cacheKey])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!row) return null

  const className = resolveClassLabel(row, 'className')
  const dateLabel = formatDateLabel(diaryRowDateKey(row))

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${className} diary`}
    >
      <header
        className="flex shrink-0 items-center gap-2 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="emp-toolbar-btn shrink-0" aria-label="Close">
          <X size={24} strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-base font-semibold text-white">{className}</p>
          <p className="truncate text-xs text-white/60">{dateLabel}</p>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={onClose}
      >
        {urls.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/60">No images found.</p>
        ) : (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {urls.map((url, index) => (
              <figure key={`${url}-${index}`} className="w-full">
                {urls.length > 1 ? (
                  <figcaption className="mb-1.5 px-2 text-center text-[11px] font-medium uppercase tracking-wide text-white/50">
                    Page {index + 1} of {urls.length}
                  </figcaption>
                ) : null}
                <img
                  src={url}
                  alt={`${className} page ${index + 1}`}
                  className="mx-auto max-h-[min(78vh,900px)] w-full object-contain"
                />
              </figure>
            ))}
          </div>
        )}
      </div>

      <p className="pointer-events-none shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/40">
        Tap outside images to close
      </p>
    </div>
  )
}

function EmployeeDiaryPage() {
  const canEdit = hasEmployeeAppAccess('canEditDiary')
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerRow, setViewerRow] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const todayPktIso = useMemo(() => getPakistanTodayIso(), [])
  const [expandedDateKeys, setExpandedDateKeys] = useState(() => new Set())
  const [accordionInitialized, setAccordionInitialized] = useState(false)

  const loadListing = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getClassDiaryListing())
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Unable to load diaries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadListing()
  }, [loadListing, location.pathname, location.key])

  const groupedByDate = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      const dateKey = diaryRowDateKey(row)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(row)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({
        dateKey,
        dateLabel: formatDateLabel(dateKey),
        items: sortClassesByCustomOrder(items, 'className'),
      }))
  }, [rows])

  useEffect(() => {
    if (accordionInitialized || groupedByDate.length === 0) return
    const initial = new Set()
    if (groupedByDate.some((group) => group.dateKey === todayPktIso)) {
      initial.add(todayPktIso)
    }
    setExpandedDateKeys(initial)
    setAccordionInitialized(true)
  }, [accordionInitialized, groupedByDate, todayPktIso])

  const toggleDateGroup = (dateKey) => {
    setExpandedDateKeys((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  const onConfirmDelete = async () => {
    if (!pendingDelete) return
    const classId = diaryRowClassId(pendingDelete)
    const dateKey = diaryRowDateKey(pendingDelete)
    setDeleting(true)
    try {
      const response = await deleteClassDiary({ classId, date: dateKey })
      if (!response?.success) {
        toast.error(response?.message || 'Could not delete diary.')
        return
      }
      toast.success('Diary deleted.')
      setPendingDelete(null)
      await loadListing()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete diary.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <EmployeeLayout
      title="Daily diary"
      subtitle="View uploaded class diaries"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        {canEdit ? (
          <Link
            to="/employee/academics/diary/upload"
            className="emp-cta-btn emp-cta-btn-primary emp-cta-btn-block"
          >
            <ImagePlus size={18} /> Upload New Diary
          </Link>
        ) : null}

        {loading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-[var(--emp-radius-lg)] py-16 text-sm text-[var(--emp-text-muted)]">
            <Loader2 size={18} className="animate-spin text-[var(--emp-primary)]" /> Loading…
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="emp-surface rounded-[var(--emp-radius-lg)] px-4 py-12 text-center">
            <NotebookPen className="mx-auto text-[var(--emp-text-muted)]" size={28} />
            <p className="mt-3 text-sm font-medium text-[var(--emp-text)]">No diaries yet</p>
            <p className="mt-1 text-xs text-[var(--emp-text-muted)]">
              {canEdit ? 'Upload a diary to get started.' : 'Diaries will appear here once uploaded.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(({ dateKey, dateLabel, items }) => {
              const isToday = dateKey === todayPktIso
              const isExpanded = expandedDateKeys.has(dateKey)
              return (
                <section
                  key={dateKey}
                  className={`emp-diary-date-group ${isToday ? 'emp-diary-date-group-today' : ''} ${
                    isExpanded ? 'emp-diary-date-group-expanded' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="emp-diary-date-group-header"
                    onClick={() => toggleDateGroup(dateKey)}
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      {isToday ? (
                        <>
                          <p className="text-[0.9375rem] font-semibold text-[var(--emp-primary)]">Today</p>
                          <p className="mt-0.5 text-xs text-[var(--emp-text-muted)]">{dateLabel}</p>
                        </>
                      ) : (
                        <p className="text-[0.9375rem] font-semibold text-[var(--emp-text)]">{dateLabel}</p>
                      )}
                    </div>
                    <span className="emp-diary-date-group-count">
                      {items.length} class{items.length === 1 ? '' : 'es'}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-[var(--emp-text-muted)] transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isExpanded ? (
                    <div className="emp-diary-date-group-body space-y-2.5">
                      {items.map((row) => {
                        const classId = diaryRowClassId(row)
                        const className = resolveClassLabel(row, 'className')
                        const replaceTo = `/employee/academics/diary/upload?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(dateKey)}`
                        return (
                          <article key={`${classId}-${dateKey}`} className="emp-diary-card">
                            <div className="flex items-start gap-3 px-3.5 py-3">
                              <span className="emp-diary-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--emp-radius-btn)]">
                                <NotebookPen size={18} strokeWidth={2.25} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[0.9375rem] font-semibold text-[var(--emp-text)]">
                                  {className}
                                </p>
                                <DiaryListingMeta row={row} />
                              </div>
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete(row)}
                                  className="emp-icon-btn emp-icon-btn-sm emp-icon-btn-danger shrink-0"
                                  aria-label={`Delete diary for ${className}`}
                                >
                                  <Trash2 size={18} />
                                </button>
                              ) : null}
                            </div>
                            <div className="emp-split-actions">
                              <button
                                type="button"
                                className="emp-split-action-view"
                                onClick={() => setViewerRow(row)}
                              >
                                <Eye size={17} strokeWidth={2.25} />
                                View
                              </button>
                              {canEdit ? (
                                <Link to={replaceTo} className="emp-split-action-replace">
                                  <Pencil size={17} strokeWidth={2.25} />
                                  Replace
                                </Link>
                              ) : (
                                <button type="button" className="emp-split-action-replace" disabled>
                                  <Pencil size={17} strokeWidth={2.25} />
                                  Replace
                                </button>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {viewerRow ? (
        <DiaryImagePopup
          row={
            rows.find(
              (r) =>
                Number(diaryRowClassId(r)) === Number(diaryRowClassId(viewerRow)) &&
                diaryRowDateKey(r) === diaryRowDateKey(viewerRow),
            ) ?? viewerRow
          }
          onClose={() => setViewerRow(null)}
        />
      ) : null}

      <DeleteConfirm
        open={Boolean(pendingDelete)}
        className={pendingDelete ? resolveClassLabel(pendingDelete, 'className') : ''}
        dateLabel={pendingDelete ? formatDateLabel(diaryRowDateKey(pendingDelete)) : ''}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </EmployeeLayout>
  )
}

export default EmployeeDiaryPage

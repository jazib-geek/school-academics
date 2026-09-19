import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { getClassDiaryUploadHistory } from '../../services/classDiaryService'
import { formatDiaryAuditPillTime } from '../../utils/diaryUploadAudit'

function normalizeHistoryItem(item) {
  return {
    occurredAtPkt: item?.occurredAtPkt ?? item?.OccurredAtPkt,
    performedByName: item?.performedByName ?? item?.PerformedByName ?? 'Someone',
    previousUpdatedBy: item?.previousUpdatedBy ?? item?.PreviousUpdatedBy ?? 'Unknown',
  }
}

function DiaryReplaceHistoryEvent({ item, variant, compact }) {
  const { occurredAtPkt, performedByName, previousUpdatedBy } = normalizeHistoryItem(item)
  const when = formatDiaryAuditPillTime(occurredAtPkt)
  const isEmployee = variant === 'employee'

  if (compact) {
    return (
      <li className="flex gap-2.5 py-2.5 first:pt-0 last:pb-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]">
          <RefreshCw size={14} strokeWidth={2.25} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 border-b border-[var(--emp-border)] pb-2.5 last:border-0">
          <p className="text-[13px] leading-snug text-[var(--emp-text)]">
            <span className="font-semibold">{performedByName}</span>
            <span className="text-[var(--emp-text-muted)]"> replaced work by </span>
            <span className="font-medium">{previousUpdatedBy}</span>
          </p>
          {when ? (
            <p className="mt-1 text-[11px] text-[var(--emp-text-muted)]">{when}</p>
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <li className="relative pl-0">
      <div
        className={
          isEmployee
            ? 'flex gap-3 rounded-xl border border-[var(--emp-border)] bg-[var(--emp-surface)] p-3'
            : 'flex gap-3 rounded-xl border border-slate-200 bg-white p-3'
        }
      >
        <div
          className={
            isEmployee
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600'
          }
        >
          <RefreshCw size={17} strokeWidth={2.25} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug text-[var(--emp-text)]">
            {performedByName}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--emp-text-muted)]">
            Replaced a diary previously uploaded by{' '}
            <span className="font-semibold text-[var(--emp-text)]">{previousUpdatedBy}</span>
          </p>
          {when ? (
            <span className="mt-2 inline-flex max-w-full items-center rounded-full bg-[var(--emp-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--emp-text-muted)]">
              {when}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * Shows past replace events only when the API returns at least one entry.
 */
export default function DiaryReplaceHistoryPanel({
  classId,
  date,
  variant = 'employee',
  className = '',
  title = 'Replacement history',
  refreshKey = 0,
  collapsible = false,
  defaultExpanded = false,
  compact = false,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    if (!collapsible) setExpanded(true)
  }, [collapsible])

  useEffect(() => {
    if (!classId || !date) {
      setItems([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const data = await getClassDiaryUploadHistory({
          classId: Number(classId),
          date,
        })
        if (!cancelled) setItems(data || [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [classId, date, refreshKey])

  if (loading || items.length === 0) return null

  const surfaceClass =
    variant === 'campus'
      ? 'rounded-xl border border-slate-200 bg-slate-50/90 p-3.5'
      : compact
        ? 'rounded-[var(--emp-radius-lg)] border border-[var(--emp-border)] bg-[var(--emp-surface)] px-3.5 py-3'
        : 'emp-surface rounded-[var(--emp-radius-lg)] p-4'

  const heading = collapsible ? `${title} (${items.length})` : title

  return (
    <div className={`${surfaceClass} ${className}`.trim()}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={expanded}
        >
          <h2 className="text-sm font-semibold text-[var(--emp-text)]">{heading}</h2>
          <ChevronDown
            size={18}
            className={`shrink-0 text-[var(--emp-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        <h2 className="text-sm font-semibold text-[var(--emp-text)]">{heading}</h2>
      )}
      {expanded ? (
        <ul className={`relative ${collapsible ? 'mt-2.5' : 'mt-3'} ${compact ? 'space-y-0' : 'space-y-2.5'}`}>
          {items.map((item, index) => (
            <DiaryReplaceHistoryEvent
              key={`${item?.occurredAtPkt ?? item?.OccurredAtPkt ?? index}-${index}`}
              item={item}
              variant={variant}
              compact={compact}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

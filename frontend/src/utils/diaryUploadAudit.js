const formatDiaryAuditDateTime = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return `${value}`
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

export const formatDiaryUploadHistoryLine = (item) => {
  const performer = item?.performedByName ?? item?.PerformedByName ?? 'Someone'
  const previous = item?.previousUpdatedBy ?? item?.PreviousUpdatedBy ?? 'someone'
  const when = formatDiaryAuditDateTime(item?.occurredAtPkt ?? item?.OccurredAtPkt)
  return `${performer} replaced a diary previously uploaded by ${previous}${when ? ` · ${when}` : ''}`
}

export const formatDiaryCurrentUploadLine = (lastUpdatedBy, lastUpdatedAt) => {
  const name = lastUpdatedBy?.trim() || 'Unknown'
  const when = formatDiaryAuditDateTime(lastUpdatedAt)
  return when ? `Uploaded by ${name} · ${when}` : `Uploaded by ${name}`
}

/** Compact timestamp for listing pills (mobile). */
export const formatDiaryAuditPillTime = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return `${value}`
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

export { formatDiaryAuditDateTime }

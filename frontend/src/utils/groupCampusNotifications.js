/** Consecutive same-type runs of this size become one drawer row. */
export const CAMPUS_NOTIF_GROUP_THRESHOLD = 5
/** Max rows shown in the drawer after grouping. */
export const CAMPUS_NOTIF_DRAWER_SLOTS = 50

function groupTitle(type, count) {
  switch (type) {
    case 'attendance_check_in':
      return `${count} staff check-ins`
    case 'attendance_check_out':
      return `${count} staff check-outs`
    case 'fee_received':
      return `${count} fees received`
    case 'diary_upload':
      return `${count} diary uploads`
    case 'student_registered':
      return `${count} students registered`
    case 'day_closed':
      return `${count} day closings`
    case 'student_conduct':
      return `${count} conduct notes`
    default:
      return `${count} updates`
  }
}

/**
 * Collapse consecutive same-type runs (≥ threshold) into group rows.
 * Input must be newest-first. Output is capped at drawer slots.
 */
export function groupCampusNotifications(
  items,
  { threshold = CAMPUS_NOTIF_GROUP_THRESHOLD, maxSlots = CAMPUS_NOTIF_DRAWER_SLOTS } = {},
) {
  const list = Array.isArray(items) ? items.filter((item) => item?.id) : []
  if (list.length === 0) return []

  const runs = []
  for (const item of list) {
    const type = item.type || ''
    const last = runs[runs.length - 1]
    if (last && last.type === type) {
      last.items.push(item)
    } else {
      runs.push({ type, items: [item] })
    }
  }

  const rows = []
  for (const run of runs) {
    if (run.items.length >= threshold) {
      const newest = run.items[0]
      rows.push({
        kind: 'group',
        id: `group:${newest.id}`,
        type: run.type,
        title: groupTitle(run.type, run.items.length),
        message: 'Open to see each one',
        severity: newest.severity || 'info',
        link: newest.link || '',
        occurredAt: newest.occurredAt,
        read: run.items.every((item) => item.read),
        items: run.items,
      })
    } else {
      for (const item of run.items) {
        rows.push({ kind: 'single', ...item })
      }
    }
  }

  return rows.slice(0, maxSlots)
}

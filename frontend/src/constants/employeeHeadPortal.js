/** Employee portal route for academic heads (coordinator proforma monitoring). */
export const COORDINATOR_MONITORING_PATH = '/employee/coordinator-monitoring'

/** Deep link for head monitoring (coordinator + report date + campus). */
export function coordinatorMonitoringHref({ reportDate, campusKey, coordinatorEmployeeId }) {
  const params = new URLSearchParams()
  if (reportDate) params.set('date', reportDate)
  if (campusKey) params.set('campus', campusKey)
  if (coordinatorEmployeeId) params.set('coordinator', String(coordinatorEmployeeId))
  const qs = params.toString()
  return qs ? `${COORDINATOR_MONITORING_PATH}?${qs}` : COORDINATOR_MONITORING_PATH
}

export function parseCoordinatorMonitoringSearch(searchParams) {
  const rawCoordinator = searchParams.get('coordinator') ?? searchParams.get('coordinatorEmployeeId')
  const coordinatorEmployeeId = rawCoordinator ? Number(rawCoordinator) : null
  const date = searchParams.get('date') || ''
  const campus = searchParams.get('campus') || ''
  const hasDeepLink = Boolean(
    (Number.isFinite(coordinatorEmployeeId) && coordinatorEmployeeId > 0)
    || (/^\d{4}-\d{2}-\d{2}$/.test(date) && date)
    || campus,
  )
  return {
    coordinatorEmployeeId: Number.isFinite(coordinatorEmployeeId) && coordinatorEmployeeId > 0
      ? coordinatorEmployeeId
      : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    campus,
    hasDeepLink,
  }
}

/** Dev/local builds prefer the `local` campus key when the API lists it. */
export function defaultMonitorCampusKey(campuses) {
  if (!campuses?.length) return ''
  if (!import.meta.env.PROD) {
    const local = campuses.find((item) => item.campusKey === 'local')
    if (local) return local.campusKey
  }
  return campuses[0].campusKey
}

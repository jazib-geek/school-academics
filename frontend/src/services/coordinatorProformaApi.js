import api from './api'

const unwrap = (response) => response?.data?.data ?? response?.data

export async function fetchProformaLookups() {
  const response = await api.get('/api/employee/coordinator/proforma/lookups')
  return unwrap(response) || { classes: [], subjects: [], teachers: [], students: [] }
}

export async function fetchProformaDay(reportDate) {
  const response = await api.get('/api/employee/coordinator/proforma/me', { params: { reportDate } })
  return unwrap(response)
}

export async function saveProformaDay(reportDate, workspace) {
  const response = await api.post('/api/employee/coordinator/proforma/me/save', { reportDate, workspace })
  return unwrap(response)
}

export async function submitProformaDay(reportDate) {
  const response = await api.post('/api/employee/coordinator/proforma/me/submit', { reportDate })
  return unwrap(response)
}

export async function fetchProformaMonitorCampuses() {
  const response = await api.get('/api/employee/coordinator/proforma/monitor/campuses')
  return unwrap(response) || []
}

export async function fetchProformaMonitorDay(reportDate, campusKey) {
  const response = await api.get('/api/employee/coordinator/proforma/monitor', {
    params: { reportDate, campusKey },
  })
  return unwrap(response)
}

export async function fetchProformaMonitorReport(reportId, campusKey) {
  const response = await api.get(`/api/employee/coordinator/proforma/monitor/${reportId}`, {
    params: { campusKey },
  })
  return unwrap(response)
}

export async function acknowledgeProformaReport(reportId, campusKey) {
  await api.post(`/api/employee/coordinator/proforma/monitor/${reportId}/acknowledge`, null, { params: { campusKey } })
}

export async function approveProformaReport(reportId, campusKey) {
  await api.post(`/api/employee/coordinator/proforma/monitor/${reportId}/approve`, null, { params: { campusKey } })
}

export async function returnProformaReport(reportId, campusKey, note) {
  await api.post(`/api/employee/coordinator/proforma/monitor/${reportId}/return`, { note }, { params: { campusKey } })
}

export async function commentProformaReport(reportId, campusKey, note) {
  await api.post(`/api/employee/coordinator/proforma/monitor/${reportId}/comment`, { note }, { params: { campusKey } })
}

export function mapDayDtoToReport(day) {
  if (!day) return null
  const workspace = day.workspace || {}
  return {
    reportId: day.reportId,
    ...workspace,
    status: workspace.status || day.workflowStatus || 'Draft',
    acknowledged: day.acknowledged ?? workspace.acknowledged,
    approved: day.approved ?? workspace.approved,
    submittedAt: day.submittedAt,
  }
}

export function listItemFromMonitorRow(row) {
  const workspace = row.workspace || {}
  const id = row.reportId
    ? `${row.campusKey}-${row.reportId}`
    : `${row.campusKey}-missing-${row.coordinatorEmployeeId}`
  return {
    id,
    campus: row.campusKey,
    reportId: row.reportId,
    coordinatorEmployeeId: row.coordinatorEmployeeId,
    coordinator: row.coordinator,
    wing: row.wing,
    wingCode: row.wingCode,
    date: row.reportDate,
    status: row.status,
    acknowledged: row.acknowledged,
    approved: row.approved,
    submittedAt: row.submittedAt,
    entryCount: row.entryCount,
    concernCount: row.concernCount,
    theme: workspace.theme,
    sosWeek: workspace.sosWeek,
    sections: workspace.sections || {},
    pageOneChecks: workspace.pageOneChecks || {},
    attendanceSnapshot: workspace.attendanceSnapshot,
    notebookSchedule: workspace.notebookSchedule,
    entries: workspace.entries || [],
    actions: workspace.actions || [],
    comments: workspace.comments || [],
    history: workspace.history || [],
  }
}

export function mapMonitorRowToReport(row) {
  if (!row?.workspace) return null
  return {
    id: `${row.campusKey}-${row.reportId}`,
    campus: row.campusKey,
    reportId: row.reportId,
    coordinator: row.coordinator,
    wing: row.wing,
    wingCode: row.wingCode,
    date: row.reportDate,
    status: row.status,
    acknowledged: row.acknowledged,
    approved: row.approved,
    submittedAt: row.submittedAt,
    entries: row.workspace.entries || [],
    actions: row.workspace.actions || [],
    comments: row.workspace.comments || [],
    history: row.workspace.history || [],
    theme: row.workspace.theme,
    sosWeek: row.workspace.sosWeek,
    sections: row.workspace.sections || {},
    pageOneChecks: row.workspace.pageOneChecks || {},
    attendanceSnapshot: row.workspace.attendanceSnapshot,
    notebookSchedule: row.workspace.notebookSchedule,
  }
}

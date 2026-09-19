/** Smart student report id → permission code (legacy reuse where overlapping). */
export const STUDENT_REPORT_PERMISSIONS = {
  'admission-list-serial': 'rpt_std_list',
  'admission-list-class': 'rpt_std_list',
  'admission-count': 'rpt_std_admission_count',
  deactivated: 'rpt_std_deactivated',
  'student-profile': 'rpt_std_profile',
  strength: 'rpt_std_strength',
  'strength-with-fee': 'rpt_std_strength_fee',
  locality: 'rpt_std_locality',
  'family-list': 'rpt_std_family',
  'phone-list': 'rpt_std_phone',
  'family-accounts': 'rpt_std_family_accounts',
  'family-message': 'rpt_std_family_message',
  'age-list': 'rpt_std_age',
  'birthday-list': 'rpt_std_birthday',
}

/** Smart attendance report id → permission code. */
export const ATTENDANCE_REPORT_PERMISSIONS = {
  'day-class-summary': 'rpt_att_class',
  'day-status-list': 'rpt_attnd',
  'summary-by-date': 'rpt_att_summary',
  'class-attendance': 'rpt_att_class',
  'absent-list': 'rpt_att_list_absent',
  'absent-list-ndays': 'rpt_att_list_absent_ndays',
  'this-student': 'rpt_att_list_student',
  'summary-by-interval': 'rpt_att_list_summary_interval',
  'detailed-register': 'rpt_attnd',
}

/** Smart exam report id → permission code. */
export const EXAM_REPORT_PERMISSIONS = {
  'result-card': 'rpt_exam_resultcard_single',
  'result-card-junior': 'rpt_exam_resultcard_single',
  'result-card-multiple': 'rpt_exam_resultcard_multiple',
  'result-card-multiple-junior': 'rpt_exam_resultcard_multiple',
  'result-card-fancy': 'rpt_exam_resultcard_fancy_single',
  'fancy-multiple': 'rpt_exam_resultcard_fancy_multiple',
  'award-list-2col': 'rpt_exam_awardlist_2c',
  'award-list-remarks': 'rpt_exam_awardlist_2c',
  'award-list-12col': 'rpt_exam_awardlist_12c',
  'award-list-subjects': 'rpt_exam_awardlist_12c',
  'top-n': 'rpt_exam_top_pos',
  'top-n-junior': 'rpt_exam_top_pos',
}

/** Smart fee report id → permission code. */
export const FEE_REPORT_PERMISSIONS = {
  'tuition-defaulters': 'rpt_fee_due',
  'fund-defaulters': 'rpt_fee_fund_due',
  'overall-receivable': 'rpt_fee_recv',
  'overall-receivable-class-wise': 'rpt_fee_recv',
  'top-defaulters': 'rpt_fee_top_defaulters',
  'chronic-defaulters': 'rpt_fee_chronic_defaulters',
  'aging-receivable': 'rpt_fee_aging',
  'never-paid-period': 'rpt_fee_never_paid',
  'partial-payers': 'rpt_fee_partial_payers',
  'family-receivable': 'rpt_fee_family',
  'inactive-with-dues': 'rpt_fee_inactive_dues',
  'dues-above-threshold': 'rpt_fee_dues_threshold',
  'collection-by-date': 'rpt_fee_coll_date',
  'collection-by-interval': 'rpt_fee_coll_interval',
  'collection-by-fund': 'rpt_fee_coll_fund',
  'collection-by-class': 'rpt_fee_coll_class',
  'collection-trend': 'rpt_fee_coll_trend',
  'collection-mom-compare': 'rpt_fee_coll_mom',
  'largest-receipts': 'rpt_fee_largest_receipts',
  'collector-performance': 'rpt_fee_collector_perf',
  'discount-given': 'rpt_fee_list_concession',
  'voids-adjustments': 'rpt_fee_voids',
  'zero-collection-days': 'rpt_fee_zero_days',
  'class-wise-receivable': 'rpt_fee_class_recv',
  'recovery-rate': 'rpt_fee_recovery_rate',
  'tuition-month-matrix': 'rpt_fee_coll_tf',
  'expected-income': 'rpt_fee_expected_income',
  'concession-impact': 'rpt_fee_list_concession',
  'session-fee-snapshot': 'rpt_fee_session_snapshot',
  'fund-mix-outstanding': 'rpt_fee_fund_mix',
  'students-fully-cleared': 'rpt_fee_fully_cleared',
  'new-charges-vs-receipts': 'rpt_fee_charges_vs_receipts',
}

/**
 * Path prefix → required permission(s) for full-page access.
 * Listing-only codes (list_std, view_employees) are enforced inside the page
 * so the shell can still render with a forbidden listing panel.
 */
export const CAMPUS_ROUTE_PERMISSIONS = [
  { prefix: '/campus/dashboard', permission: 'stats_home' },
  { prefix: '/campus/overview', permission: 'view_all_campus_dashboard' },
  { prefix: '/campus/daily-reporting', permission: 'view_coordinator_reporting' },
  { prefix: '/campus/students/admit', permission: 'add_std', exact: true },
  { prefix: '/campus/students/admit/', permission: 'edit_std' },
  { prefix: '/campus/students/bulk-edit', permission: 'edit_std' },
  { prefix: '/campus/students/transfer', permission: 'trasnfer_std' },
  { prefix: '/campus/students/update-fee', permission: 'update_fee' },
  { prefix: '/campus/exams/entry', permission: 'create_exam' },
  { prefix: '/campus/exams/detailed-entry', permission: 'view_detailed_marks' },
  {
    prefix: '/campus/exams/result',
    anyOf: [
      'rpt_exam_resultcard_single',
      'rpt_exam_resultcard_multiple',
      'rpt_exam_resultcard_fancy_single',
      'rpt_exam_resultcard_fancy_multiple',
      'rpt_exam',
    ],
  },
  {
    prefix: '/campus/reports/exams',
    anyOf: [
      'rpt_exam',
      'rpt_exam_resultcard_single',
      'rpt_exam_resultcard_multiple',
      'rpt_exam_resultcard_fancy_single',
      'rpt_exam_resultcard_fancy_multiple',
      'rpt_exam_awardlist_2c',
      'rpt_exam_awardlist_12c',
      'rpt_exam_top_pos',
    ],
  },
  { prefix: '/campus/exams/mark-sheet', permission: 'rpt_exam' },
  { prefix: '/campus/exams/teacher-analysis', permission: 'view_teacher_analysis' },
  { prefix: '/campus/exams/teacher-performance', permission: 'view_teacher_performance' },
  { prefix: '/campus/teacher-assignments', permission: 'subject_allocation' },
  { prefix: '/campus/timetables', permission: 'view_timetable' },
  { prefix: '/campus/datesheets', permission: 'view_datesheet' },
  { prefix: '/campus/daily-diary', permission: 'view_daily_diary' },
  { prefix: '/campus/designations', permission: 'manage_designations' },
  { prefix: '/campus/employee-loans', permission: 'manage_employee_loans' },
  { prefix: '/campus/employee-salary', permission: 'calculate_employee_salary' },
  { prefix: '/campus/live-attendance', permission: 'view_live_emp_attendance' },
  { prefix: '/campus/employee-attendance/import', permission: 'edit_emp_attendance' },
  {
    prefix: '/campus/employee-attendance/manage',
    anyOf: ['edit_emp_attendance', 'view_live_emp_attendance', 'view_emp_monthly_attendance'],
  },
  { prefix: '/campus/employee-attendance', permission: 'view_emp_monthly_attendance' },
  { prefix: '/campus/attendance/mark', permission: 'mark_attnd' },
  { prefix: '/campus/attendance/absent-followup', permission: 'mark_attnd' },
  { prefix: '/campus/student-conduct', permission: 'view_student_conduct' },
  { prefix: '/campus/family-portal/announcements', permission: 'manage_family_announcements' },
  { prefix: '/campus/family-portal/accounts', permission: 'manage_family_accounts' },
  { prefix: '/campus/reports/attendance', permission: 'rpt_attnd' },
  { prefix: '/campus/accounts/cash-payment', permission: 'issue_voucher' },
  { prefix: '/campus/accounts/cash-receipt', permission: 'issue_voucher' },
  { prefix: '/campus/accounts/ledger', permission: 'view_ledger' },
  { prefix: '/campus/accounts/summary', permission: 'view_account_summary' },
  { prefix: '/campus/accounts/cash-book', permission: 'cash_book' },
  { prefix: '/campus/accounts/day-closing', permission: 'day_closing' },
  { prefix: '/campus/accounts/settings', permission: 'acct_settings' },
  { prefix: '/campus/stationery', permission: 'manage_stationery' },
  { prefix: '/campus/reports/students', permission: 'rpt_std' },
  { prefix: '/campus/fee/generate-fund', anyOf: ['generate_fund_all', 'generate_fund_single'] },
  { prefix: '/campus/fee/generate', anyOf: ['generate_fee_all', 'generate_fee_single'] },
  { prefix: '/campus/fee/transactions', permission: 'submit_fee' },
  { prefix: '/campus/fee/void-receipt', permission: 'void_rcpt' },
  { prefix: '/campus/fee/reports', permission: 'rpt_fee' },
  { prefix: '/campus/fee/balance-sheet', permission: 'rpt_fee_balance_sheet' },
  { prefix: '/campus/reports/income', permission: 'view_profit_loss' },
  { prefix: '/campus/settings/classes', permission: 'param_class' },
  { prefix: '/campus/settings/sections', permission: 'param_class' },
  { prefix: '/campus/settings/section-colors', permission: 'param_section_color' },
  { prefix: '/campus/settings/allowances', permission: 'manage_payroll_allowances' },
  { prefix: '/campus/settings/profile', permission: 'manage_campus_profile' },
  { prefix: '/campus/localities', permission: 'param_loc' },
  { prefix: '/campus/settings/occupations', permission: 'param_occ' },
  { prefix: '/campus/settings/degrees', permission: 'param_degree' },
  { prefix: '/campus/users', anyOf: ['user_list', 'user_mgmt'] },
  { prefix: '/campus/activity-logs/void-receipts', permission: 'void_rcpt' },
  { prefix: '/campus/activity-logs', permission: 'view_activity_logs' },
]

/** Longest-prefix match for a campus path. */
export function resolveCampusRoutePermission(pathname) {
  const path = String(pathname || '')
  const matches = CAMPUS_ROUTE_PERMISSIONS.filter((rule) => {
    if (rule.exact) return path === rule.prefix
    if (rule.prefix.endsWith('/')) return path.startsWith(rule.prefix)
    return path === rule.prefix || path.startsWith(`${rule.prefix}/`)
  }).sort((a, b) => b.prefix.length - a.prefix.length)
  return matches[0] || null
}

/** Ordered fallback landing targets after login. */
export const CAMPUS_LANDING_CANDIDATES = [
  { path: '/campus/dashboard', permission: 'stats_home' },
  { path: '/campus/students', permission: 'list_std' },
  { path: '/campus/fee/generate', anyOf: ['generate_fee_all', 'generate_fee_single'] },
  { path: '/campus/fee/generate-fund', anyOf: ['generate_fund_all', 'generate_fund_single'] },
  { path: '/campus/fee/reports', permission: 'rpt_fee' },
  { path: '/campus/reports/students', permission: 'rpt_std' },
  { path: '/campus/attendance/mark', permission: 'mark_attnd' },
  { path: '/campus/attendance/absent-followup', permission: 'mark_attnd' },
  { path: '/campus/reports/attendance', permission: 'rpt_attnd' },
  { path: '/campus/exams/entry', permission: 'create_exam' },
  { path: '/campus/employees', permission: 'view_employees' },
  { path: '/campus/live-attendance', permission: 'view_live_emp_attendance' },
  { path: '/campus/accounts/ledger', permission: 'view_ledger' },
  { path: '/campus/users', anyOf: ['user_list', 'user_mgmt'] },
  { path: '/campus/settings/classes', permission: 'param_class' },
]

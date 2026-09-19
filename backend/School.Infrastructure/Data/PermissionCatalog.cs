using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

/// <summary>
/// Canonical permission catalog for campus DBs. Seeded into tblPermission only —
/// never writes to tblUser / tblUserRights.
/// </summary>
public static class PermissionCatalog
{
    public static IReadOnlyList<Permission> All { get; } = Build();

    private static IReadOnlyList<Permission> Build()
    {
        var items = new List<(string Code, string Name, string Head)>();

        void Add(string code, string name, string head) => items.Add((code, name, head));

        // Student (legacy)
        Add("list_std", "Student List", "Student");
        Add("stats_home", "Home page stats", "Student");
        Add("graph", "Fee Graph", "Student");
        Add("sms", "Send SMS", "Student");
        Add("add_std", "Add Student", "Student");
        Add("del_std", "Delete Student", "Student");
        Add("trasnfer_std", "Transfer Student", "Student");
        Add("activate_std", "Activate/Deactivate Student", "Student");
        Add("edit_std", "Edit Student", "Student");
        Add("rpt_std", "Student Reports", "Student");
        Add("rpt_std_list", "Report : Admission List", "Student");
        Add("rpt_std_profile", "Report : Student Profile", "Student");
        Add("rpt_std_family", "Report : Family List", "Student");
        Add("rpt_std_phone", "Report : Phone no. List", "Student");
        Add("rpt_std_deactivated", "Report : Deactivated Student", "Student");
        Add("rpt_std_strength", "Report : Strength w/o Fee", "Student");
        Add("rpt_std_strength_fee", "Report : Strength with Fee", "Student");
        Add("rpt_std_birthday", "Report : Birthday List", "Student");

        // Fee (legacy)
        Add("submit_fee", "Receive Fee", "Fee");
        Add("submit_fee_prevdate", "Receive Fee Previous Date", "Fee");
        Add("generate_fee_all", "Generate Fee All", "Fee");
        Add("generate_fee_single", "Generate Fee Single", "Fee");
        Add("generate_fund_all", "Generate Fund All", "Fee");
        Add("generate_fund_single", "Generate Fund Single", "Fee");
        Add("update_fee", "Update Fee", "Fee");
        Add("void_rcpt", "Void Receipts", "Fee");
        Add("trx", "View Transactions", "Fee");
        Add("rpt_fee", "Fee Reports", "Fee");
        Add("fee_time", "Fee Time", "Fee");
        Add("rpt_fee_coll_date", "Report : Collection by Date", "Fee");
        Add("rpt_fee_coll_interval", "Report : Collection by Interval", "Fee");
        Add("rpt_fee_recv", "Report : Fee Receivables", "Fee");
        Add("rpt_fee_coll_tf", "Report : Tution Fee Collection by Month", "Fee");
        Add("rpt_fee_list", "Report : Fee List", "Fee");
        Add("rpt_fee_list_interval", "Report : Fee Ledger", "Fee");
        Add("rpt_fee_list_concession", "Report : Concession List", "Fee");
        Add("rpt_fee_ledger", "Report : Fee Ledger", "Fee");
        Add("rpt_fee_family", "Report : Family Fee", "Fee");
        Add("rpt_fee_due", "Report : Due Fee", "Fee");
        Add("rpt_fee_fund_due", "Report : Due Fund", "Fee");
        Add("rpt_fee_balance_sheet", "Report : Balance Sheet", "Fee");

        // Attendance (legacy)
        Add("mark_attnd", "Mark Attendance", "Attendance");
        Add("rpt_attnd", "Attendance Reports", "Attendance");
        Add("rpt_att_summary", "Report : Summary by Date", "Attendance");
        Add("rpt_att_class", "Report : Class Attendance", "Attendance");
        Add("rpt_att_list_absent", "Report : Absent List", "Attendance");
        Add("rpt_att_list_absent_ndays", "Report : Absent List N Days", "Attendance");
        Add("rpt_att_list_student", "Report : This Student", "Attendance");
        Add("rpt_att_list_summary_interval", "Report : Summary by Interval", "Attendance");

        // Accounts (legacy + new)
        Add("issue_voucher", "Issue Voucher", "Accounts");
        Add("view_ledger", "View Ledger", "Accounts");
        Add("cash_book", "Cash Book", "Accounts");
        Add("acct_settings", "Account Settings", "Accounts");
        Add("view_profit_loss", "View Profit and Loss Report", "Accounts");

        // Exam (legacy + new)
        Add("create_exam", "Create/Edit Exam", "Exam");
        Add("exam_type", "Exam Types", "Exam");
        Add("subject_def", "Subject Definition", "Exam");
        Add("subject_classwise", "Subjects Classwise", "Exam");
        Add("rpt_exam", "Exam Reports", "Exam");
        Add("rpt_exam_resultcard_single", "Report : Result Card Single", "Exam");
        Add("rpt_exam_resultcard_multiple", "Report : Result Card Multiple", "Exam");
        Add("rpt_exam_resultcard_fancy_single", "Report : Result Card Fancy Single", "Exam");
        Add("rpt_exam_resultcard_fancy_multiple", "Report : Result Card Fancy Multiple", "Exam");
        Add("rpt_exam_awardlist_2c", "Report : Award List 2 Col", "Exam");
        Add("rpt_exam_awardlist_12c", "Report : Award List 12 Col", "Exam");
        Add("rpt_exam_top_pos", "Report : Top Positions", "Exam");
        Add("rpt_exam_comp1", "Report : Comparison 1", "Exam");
        Add("rpt_exam_comp2", "Report : Comparison 2", "Exam");
        Add("change_exam_marks", "Change Exam Marks", "Exam");
        Add("view_detailed_marks", "View Detailed Marks Entry", "Exam");
        Add("change_detailed_marks", "Change Detailed Marks Entry", "Exam");
        Add("view_teacher_analysis", "View Teacher Analysis", "Exam");
        Add("view_teacher_performance", "View Teacher Performance", "Exam");

        // User (legacy)
        Add("user_mgmt", "User Rights", "User");
        Add("user_create", "Create User", "User");
        Add("user_list", "List Users", "User");

        // Parameters (legacy)
        Add("param_class", "Manage Class/Section", "Parameters");
        Add("param_occ", "Manage Occupations", "Parameters");
        Add("param_loc", "Manage Locality", "Parameters");

        // Dashboard (new)
        Add("view_all_campus_dashboard", "View All Campus Dashboard", "Dashboard");

        // Coordinator (new)
        Add("view_coordinator_reporting", "View Coordinator Reporting", "Coordinator");

        // Diary (new)
        Add("view_daily_diary", "View Daily Diary", "Diary");
        Add("edit_daily_diary", "Add/Update Daily Diary", "Diary");
        Add("delete_daily_diary", "Delete Daily Diary", "Diary");

        // Employee (new)
        Add("view_live_emp_attendance", "View Live Employee Attendance", "Employee");
        Add("view_timetable", "View Time Table", "Employee");
        Add("change_timetable", "Change TimeTable", "Employee");
        Add("subject_allocation", "Subject Allocation", "Employee");
        Add("view_emp_monthly_attendance", "View Teacher Monthly Attendance", "Employee");

        // Module gaps (SPA features without prior catalog codes)
        Add("view_employees", "View Employees", "Employee");
        Add("manage_employees", "Manage Employees", "Employee");
        Add("manage_designations", "Manage Designations", "Employee");
        Add("param_degree", "Manage Degrees", "Parameters");
        Add("param_section_color", "Manage Section Colors", "Parameters");
        Add("view_datesheet", "View Date Sheets", "Academics");
        Add("change_datesheet", "Change Date Sheets", "Academics");
        Add("day_closing", "Day Closing", "Accounts");
        Add("view_account_summary", "View Accounts Summary", "Accounts");
        Add("view_activity_logs", "View Activity Logs", "User");

        // Student smart reports (enhanced; legacy twins reused elsewhere)
        Add("rpt_std_admission_count", "Report : Admission Count by Class", "Student");
        Add("rpt_std_locality", "Report : Locality", "Student");
        Add("rpt_std_family_accounts", "Report : Family Accounts (Portal)", "Student");
        Add("rpt_std_family_message", "Report : Family Message", "Student");
        Add("rpt_std_age", "Report : Age List", "Student");

        // Fee smart reports (enhanced)
        Add("rpt_fee_top_defaulters", "Report : Top Defaulters", "Fee");
        Add("rpt_fee_chronic_defaulters", "Report : Chronic Defaulters", "Fee");
        Add("rpt_fee_aging", "Report : Aging Receivable", "Fee");
        Add("rpt_fee_never_paid", "Report : Never Paid (Period)", "Fee");
        Add("rpt_fee_partial_payers", "Report : Partial Payers", "Fee");
        Add("rpt_fee_inactive_dues", "Report : Inactive With Dues", "Fee");
        Add("rpt_fee_dues_threshold", "Report : Dues Above Threshold", "Fee");
        Add("rpt_fee_coll_fund", "Report : Collection by Fund", "Fee");
        Add("rpt_fee_coll_class", "Report : Collection by Class", "Fee");
        Add("rpt_fee_coll_trend", "Report : Collection Trend", "Fee");
        Add("rpt_fee_coll_mom", "Report : Month vs Last Month", "Fee");
        Add("rpt_fee_largest_receipts", "Report : Largest Receipts", "Fee");
        Add("rpt_fee_collector_perf", "Report : Collector Performance", "Fee");
        Add("rpt_fee_voids", "Report : Voids / Adjustments", "Fee");
        Add("rpt_fee_zero_days", "Report : Zero Collection Days", "Fee");
        Add("rpt_fee_class_recv", "Report : Class-wise Receivable", "Fee");
        Add("rpt_fee_recovery_rate", "Report : Recovery Rate", "Fee");
        Add("rpt_fee_expected_income", "Report : Expected Income", "Fee");
        Add("rpt_fee_session_snapshot", "Report : Session Fee Snapshot", "Fee");
        Add("rpt_fee_fund_mix", "Report : Fund Mix Outstanding", "Fee");
        Add("rpt_fee_fully_cleared", "Report : Fully Cleared Students", "Fee");
        Add("rpt_fee_charges_vs_receipts", "Report : Charges vs Receipts", "Fee");

        // Legacy general reports + cross-cutting export (SPA not built yet)
        Add("rpt_gen_31col", "Report : 31 Column List", "General");
        Add("rpt_gen_student_labels", "Report : Student Labels", "General");
        Add("rpt_gen_labels_wide", "Report : Labels (Wide)", "General");
        Add("rpt_gen_class_labels", "Report : Class Labels", "General");
        Add("export_excel", "Export Data to Excel", "General");

        Add("manage_employee_loans", "Manage Employee Loans / Advances", "Employee");
        Add("calculate_employee_salary", "Calculate Employee Salary", "Employee");
        Add("manage_payroll_allowances", "Manage Payroll Allowances", "Employee");
        Add("manage_campus_profile", "Manage Campus Institute Settings", "Parameters");
        Add("edit_emp_attendance", "Edit Employee Attendance", "Employee");
        Add("manage_stationery", "Manage Store / Supplies", "Store");
        Add("view_student_conduct", "View Student Conduct", "Student");
        Add("edit_past_employee_loans", "Edit Past Employee Salary Adjustments", "Employee");
        Add("manage_family_announcements", "Manage Family Portal Announcements", "Family Portal");
        Add("manage_family_accounts", "Manage Family Portal Accounts", "Family Portal");

        return items
            .Select((item, index) => new Permission
            {
                Id = index + 1,
                Code = item.Code,
                Name = item.Name,
                ModuleHead = item.Head,
                SortOrder = (index + 1) * 10,
                IsActive = true
            })
            .ToList();
    }
}

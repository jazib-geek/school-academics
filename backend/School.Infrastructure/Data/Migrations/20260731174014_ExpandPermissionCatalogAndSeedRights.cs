using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExpandPermissionCatalogAndSeedRights : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 90, "view_employees", true, "Employee", "View Employees", 900 },
                    { 91, "manage_employees", true, "Employee", "Manage Employees", 910 },
                    { 92, "manage_designations", true, "Employee", "Manage Designations", 920 },
                    { 93, "param_degree", true, "Parameters", "Manage Degrees", 930 },
                    { 94, "param_section_color", true, "Parameters", "Manage Section Colors", 940 },
                    { 95, "view_datesheet", true, "Academics", "View Date Sheets", 950 },
                    { 96, "change_datesheet", true, "Academics", "Change Date Sheets", 960 },
                    { 97, "day_closing", true, "Accounts", "Day Closing", 970 },
                    { 98, "view_account_summary", true, "Accounts", "View Accounts Summary", 980 },
                    { 99, "view_activity_logs", true, "User", "View Activity Logs", 990 },
                    { 100, "rpt_std_admission_count", true, "Student", "Report : Admission Count by Class", 1000 },
                    { 101, "rpt_std_locality", true, "Student", "Report : Locality", 1010 },
                    { 102, "rpt_std_family_accounts", true, "Student", "Report : Family Accounts (Portal)", 1020 },
                    { 103, "rpt_std_family_message", true, "Student", "Report : Family Message", 1030 },
                    { 104, "rpt_std_age", true, "Student", "Report : Age List", 1040 },
                    { 105, "rpt_fee_top_defaulters", true, "Fee", "Report : Top Defaulters", 1050 },
                    { 106, "rpt_fee_chronic_defaulters", true, "Fee", "Report : Chronic Defaulters", 1060 },
                    { 107, "rpt_fee_aging", true, "Fee", "Report : Aging Receivable", 1070 },
                    { 108, "rpt_fee_never_paid", true, "Fee", "Report : Never Paid (Period)", 1080 },
                    { 109, "rpt_fee_partial_payers", true, "Fee", "Report : Partial Payers", 1090 },
                    { 110, "rpt_fee_inactive_dues", true, "Fee", "Report : Inactive With Dues", 1100 },
                    { 111, "rpt_fee_dues_threshold", true, "Fee", "Report : Dues Above Threshold", 1110 },
                    { 112, "rpt_fee_coll_fund", true, "Fee", "Report : Collection by Fund", 1120 },
                    { 113, "rpt_fee_coll_class", true, "Fee", "Report : Collection by Class", 1130 },
                    { 114, "rpt_fee_coll_trend", true, "Fee", "Report : Collection Trend", 1140 },
                    { 115, "rpt_fee_coll_mom", true, "Fee", "Report : Month vs Last Month", 1150 },
                    { 116, "rpt_fee_largest_receipts", true, "Fee", "Report : Largest Receipts", 1160 },
                    { 117, "rpt_fee_collector_perf", true, "Fee", "Report : Collector Performance", 1170 },
                    { 118, "rpt_fee_voids", true, "Fee", "Report : Voids / Adjustments", 1180 },
                    { 119, "rpt_fee_zero_days", true, "Fee", "Report : Zero Collection Days", 1190 },
                    { 120, "rpt_fee_class_recv", true, "Fee", "Report : Class-wise Receivable", 1200 },
                    { 121, "rpt_fee_recovery_rate", true, "Fee", "Report : Recovery Rate", 1210 },
                    { 122, "rpt_fee_expected_income", true, "Fee", "Report : Expected Income", 1220 },
                    { 123, "rpt_fee_session_snapshot", true, "Fee", "Report : Session Fee Snapshot", 1230 },
                    { 124, "rpt_fee_fund_mix", true, "Fee", "Report : Fund Mix Outstanding", 1240 },
                    { 125, "rpt_fee_fully_cleared", true, "Fee", "Report : Fully Cleared Students", 1250 },
                    { 126, "rpt_fee_charges_vs_receipts", true, "Fee", "Report : Charges vs Receipts", 1260 },
                    { 127, "rpt_gen_31col", true, "General", "Report : 31 Column List", 1270 },
                    { 128, "rpt_gen_student_labels", true, "General", "Report : Student Labels", 1280 },
                    { 129, "rpt_gen_labels_wide", true, "General", "Report : Labels (Wide)", 1290 },
                    { 130, "rpt_gen_class_labels", true, "General", "Report : Class Labels", 1300 },
                    { 131, "export_excel", true, "General", "Export Data to Excel", 1310 }
                });

            // Seed tblUserRights (idempotent). Does not revoke existing grants.
            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#ActiveUsers') IS NOT NULL DROP TABLE #ActiveUsers;
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT u.Username
                INTO #ActiveUsers
                FROM dbo.tblUser u
                WHERE u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (
                    N'view_employees', N'manage_employees', N'manage_designations',
                    N'param_degree', N'param_section_color',
                    N'view_datesheet', N'change_datesheet',
                    N'day_closing', N'view_account_summary', N'view_activity_logs',
                    N'rpt_std_admission_count', N'rpt_std_locality', N'rpt_std_family_accounts',
                    N'rpt_std_family_message', N'rpt_std_age',
                    N'rpt_fee_top_defaulters', N'rpt_fee_chronic_defaulters', N'rpt_fee_aging',
                    N'rpt_fee_never_paid', N'rpt_fee_partial_payers', N'rpt_fee_inactive_dues',
                    N'rpt_fee_dues_threshold', N'rpt_fee_coll_fund', N'rpt_fee_coll_class',
                    N'rpt_fee_coll_trend', N'rpt_fee_coll_mom', N'rpt_fee_largest_receipts',
                    N'rpt_fee_collector_perf', N'rpt_fee_voids', N'rpt_fee_zero_days',
                    N'rpt_fee_class_recv', N'rpt_fee_recovery_rate', N'rpt_fee_expected_income',
                    N'rpt_fee_session_snapshot', N'rpt_fee_fund_mix', N'rpt_fee_fully_cleared',
                    N'rpt_fee_charges_vs_receipts',
                    N'rpt_gen_31col', N'rpt_gen_student_labels', N'rpt_gen_labels_wide',
                    N'rpt_gen_class_labels', N'export_excel'
                );

                /* 1) admin + jazib + SuperAdmin → all NEW codes */
                UPDATE r
                SET r.HasAccess = 1,
                    r.ModuleName = g.Name,
                    r.ModuleHead = g.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblUser u ON u.Username = r.UserName
                INNER JOIN #NewPerms g ON g.Code = r.ModuleCode
                WHERE u.IsActive = 1
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, g.Code, g.Name, 1, NULL, g.ModuleHead
                FROM dbo.tblUser u
                CROSS JOIN #NewPerms g
                WHERE u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username AND r.ModuleCode = g.Code
                  );

                /* 2) All active users → General Reports */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN #ActiveUsers u ON u.Username = r.UserName
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (
                    N'rpt_gen_31col', N'rpt_gen_student_labels',
                    N'rpt_gen_labels_wide', N'rpt_gen_class_labels'
                );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM #ActiveUsers u
                CROSS JOIN dbo.tblPermission p
                WHERE p.Code IN (
                    N'rpt_gen_31col', N'rpt_gen_student_labels',
                    N'rpt_gen_labels_wide', N'rpt_gen_class_labels'
                )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username AND r.ModuleCode = p.Code
                  );

                /* 3) All active users → Academics nav permissions */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN #ActiveUsers u ON u.Username = r.UserName
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (
                    N'subject_allocation',
                    N'view_timetable', N'change_timetable',
                    N'view_datesheet', N'change_datesheet',
                    N'view_daily_diary', N'edit_daily_diary', N'delete_daily_diary',
                    N'view_teacher_analysis', N'view_teacher_performance'
                );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM #ActiveUsers u
                CROSS JOIN dbo.tblPermission p
                WHERE p.Code IN (
                    N'subject_allocation',
                    N'view_timetable', N'change_timetable',
                    N'view_datesheet', N'change_datesheet',
                    N'view_daily_diary', N'edit_daily_diary', N'delete_daily_diary',
                    N'view_teacher_analysis', N'view_teacher_performance'
                )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username AND r.ModuleCode = p.Code
                  );

                /* 4a) Employee module heuristics */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (N'view_employees', N'manage_employees', N'manage_designations')
                  AND EXISTS (
                      SELECT 1 FROM dbo.tblUserRights x
                      INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                      WHERE x.UserName = r.UserName
                        AND x.HasAccess = 1
                        AND x.ModuleCode IN (
                            N'view_live_emp_attendance', N'view_emp_monthly_attendance', N'subject_allocation'
                        )
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1
                  AND x.ModuleCode IN (
                      N'view_live_emp_attendance', N'view_emp_monthly_attendance', N'subject_allocation'
                  )
                  AND p.Code IN (N'view_employees', N'manage_employees', N'manage_designations')
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4b) Degree / section color from param_class */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (N'param_degree', N'param_section_color')
                  AND EXISTS (
                      SELECT 1 FROM dbo.tblUserRights x
                      INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                      WHERE x.UserName = r.UserName AND x.HasAccess = 1 AND x.ModuleCode = N'param_class'
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1 AND x.ModuleCode = N'param_class'
                  AND p.Code IN (N'param_degree', N'param_section_color')
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4c) Accounts summary / day closing */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (N'day_closing', N'view_account_summary')
                  AND EXISTS (
                      SELECT 1 FROM dbo.tblUserRights x
                      INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                      WHERE x.UserName = r.UserName AND x.HasAccess = 1
                        AND x.ModuleCode IN (N'issue_voucher', N'view_ledger', N'cash_book', N'acct_settings')
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1
                  AND x.ModuleCode IN (N'issue_voucher', N'view_ledger', N'cash_book', N'acct_settings')
                  AND p.Code IN (N'day_closing', N'view_account_summary')
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4d) Activity logs from user mgmt */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = N'view_activity_logs' AND p.Code = r.ModuleCode
                WHERE EXISTS (
                    SELECT 1 FROM dbo.tblUserRights x
                    INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                    WHERE x.UserName = r.UserName AND x.HasAccess = 1
                      AND x.ModuleCode IN (N'user_mgmt', N'user_list')
                );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1 AND x.ModuleCode IN (N'user_mgmt', N'user_list')
                  AND p.Code = N'view_activity_logs'
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4e) New student smart reports */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (
                    N'rpt_std_admission_count', N'rpt_std_locality', N'rpt_std_family_accounts',
                    N'rpt_std_family_message', N'rpt_std_age'
                )
                  AND EXISTS (
                      SELECT 1 FROM dbo.tblUserRights x
                      INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                      WHERE x.UserName = r.UserName AND x.HasAccess = 1
                        AND (x.ModuleCode = N'rpt_std' OR x.ModuleCode LIKE N'rpt_std_%')
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1
                  AND (x.ModuleCode = N'rpt_std' OR x.ModuleCode LIKE N'rpt_std_%')
                  AND p.Code IN (
                      N'rpt_std_admission_count', N'rpt_std_locality', N'rpt_std_family_accounts',
                      N'rpt_std_family_message', N'rpt_std_age'
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4f) New fee smart reports */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = r.ModuleCode
                WHERE p.Code IN (
                    N'rpt_fee_top_defaulters', N'rpt_fee_chronic_defaulters', N'rpt_fee_aging',
                    N'rpt_fee_never_paid', N'rpt_fee_partial_payers', N'rpt_fee_inactive_dues',
                    N'rpt_fee_dues_threshold', N'rpt_fee_coll_fund', N'rpt_fee_coll_class',
                    N'rpt_fee_coll_trend', N'rpt_fee_coll_mom', N'rpt_fee_largest_receipts',
                    N'rpt_fee_collector_perf', N'rpt_fee_voids', N'rpt_fee_zero_days',
                    N'rpt_fee_class_recv', N'rpt_fee_recovery_rate', N'rpt_fee_expected_income',
                    N'rpt_fee_session_snapshot', N'rpt_fee_fund_mix', N'rpt_fee_fully_cleared',
                    N'rpt_fee_charges_vs_receipts'
                )
                  AND EXISTS (
                      SELECT 1 FROM dbo.tblUserRights x
                      INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                      WHERE x.UserName = r.UserName AND x.HasAccess = 1
                        AND (x.ModuleCode = N'rpt_fee' OR x.ModuleCode LIKE N'rpt_fee_%')
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1
                  AND (x.ModuleCode = N'rpt_fee' OR x.ModuleCode LIKE N'rpt_fee_%')
                  AND p.Code IN (
                      N'rpt_fee_top_defaulters', N'rpt_fee_chronic_defaulters', N'rpt_fee_aging',
                      N'rpt_fee_never_paid', N'rpt_fee_partial_payers', N'rpt_fee_inactive_dues',
                      N'rpt_fee_dues_threshold', N'rpt_fee_coll_fund', N'rpt_fee_coll_class',
                      N'rpt_fee_coll_trend', N'rpt_fee_coll_mom', N'rpt_fee_largest_receipts',
                      N'rpt_fee_collector_perf', N'rpt_fee_voids', N'rpt_fee_zero_days',
                      N'rpt_fee_class_recv', N'rpt_fee_recovery_rate', N'rpt_fee_expected_income',
                      N'rpt_fee_session_snapshot', N'rpt_fee_fund_mix', N'rpt_fee_fully_cleared',
                      N'rpt_fee_charges_vs_receipts'
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                /* 4g) export_excel for list_std / rpt_std / rpt_fee holders */
                UPDATE r
                SET r.HasAccess = 1, r.ModuleName = p.Name, r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = N'export_excel' AND p.Code = r.ModuleCode
                WHERE EXISTS (
                    SELECT 1 FROM dbo.tblUserRights x
                    INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                    WHERE x.UserName = r.UserName AND x.HasAccess = 1
                      AND x.ModuleCode IN (N'list_std', N'rpt_std', N'rpt_fee')
                );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT DISTINCT x.UserName, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUserRights x
                INNER JOIN dbo.tblUser u ON u.Username = x.UserName AND u.IsActive = 1
                CROSS JOIN dbo.tblPermission p
                WHERE x.HasAccess = 1 AND x.ModuleCode IN (N'list_std', N'rpt_std', N'rpt_fee')
                  AND p.Code = N'export_excel'
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = x.UserName AND r.ModuleCode = p.Code
                  );

                DROP TABLE #ActiveUsers;
                DROP TABLE #NewPerms;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 90);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 91);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 92);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 93);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 94);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 95);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 96);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 97);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 98);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 99);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 100);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 101);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 102);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 103);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 104);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 105);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 106);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 107);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 108);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 109);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 110);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 111);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 112);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 113);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 114);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 115);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 116);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 117);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 118);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 119);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 120);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 121);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 122);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 123);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 124);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 125);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 126);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 127);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 128);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 129);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 130);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 131);
        }
    }
}

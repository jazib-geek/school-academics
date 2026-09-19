using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreatePermissionCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Intentionally does NOT alter tblUser / tblUserRights — those columns already exist
            // in production; expanding the EF model must not emit AddColumn against live data.

            migrationBuilder.CreateTable(
                name: "tblPermission",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ModuleHead = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblPermission", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, "list_std", true, "Student", "Student List", 10 },
                    { 2, "stats_home", true, "Student", "Home page stats", 20 },
                    { 3, "graph", true, "Student", "Fee Graph", 30 },
                    { 4, "sms", true, "Student", "Send SMS", 40 },
                    { 5, "add_std", true, "Student", "Add Student", 50 },
                    { 6, "del_std", true, "Student", "Delete Student", 60 },
                    { 7, "trasnfer_std", true, "Student", "Transfer Student", 70 },
                    { 8, "activate_std", true, "Student", "Activate/Deactivate Student", 80 },
                    { 9, "edit_std", true, "Student", "Edit Student", 90 },
                    { 10, "rpt_std", true, "Student", "Student Reports", 100 },
                    { 11, "rpt_std_list", true, "Student", "Report : Admission List", 110 },
                    { 12, "rpt_std_profile", true, "Student", "Report : Student Profile", 120 },
                    { 13, "rpt_std_family", true, "Student", "Report : Family List", 130 },
                    { 14, "rpt_std_phone", true, "Student", "Report : Phone no. List", 140 },
                    { 15, "rpt_std_deactivated", true, "Student", "Report : Deactivated Student", 150 },
                    { 16, "rpt_std_strength", true, "Student", "Report : Strength w/o Fee", 160 },
                    { 17, "rpt_std_strength_fee", true, "Student", "Report : Strength with Fee", 170 },
                    { 18, "rpt_std_birthday", true, "Student", "Report : Birthday List", 180 },
                    { 19, "submit_fee", true, "Fee", "Receive Fee", 190 },
                    { 20, "submit_fee_prevdate", true, "Fee", "Receive Fee Previous Date", 200 },
                    { 21, "generate_fee_all", true, "Fee", "Generate Fee All", 210 },
                    { 22, "generate_fee_single", true, "Fee", "Generate Fee Single", 220 },
                    { 23, "generate_fund_all", true, "Fee", "Generate Fund All", 230 },
                    { 24, "generate_fund_single", true, "Fee", "Generate Fund Single", 240 },
                    { 25, "update_fee", true, "Fee", "Update Fee", 250 },
                    { 26, "void_rcpt", true, "Fee", "Void Receipts", 260 },
                    { 27, "trx", true, "Fee", "View Transactions", 270 },
                    { 28, "rpt_fee", true, "Fee", "Fee Reports", 280 },
                    { 29, "fee_time", true, "Fee", "Fee Time", 290 },
                    { 30, "rpt_fee_coll_date", true, "Fee", "Report : Collection by Date", 300 },
                    { 31, "rpt_fee_coll_interval", true, "Fee", "Report : Collection by Interval", 310 },
                    { 32, "rpt_fee_recv", true, "Fee", "Report : Fee Receivables", 320 },
                    { 33, "rpt_fee_coll_tf", true, "Fee", "Report : Tution Fee Collection by Month", 330 },
                    { 34, "rpt_fee_list", true, "Fee", "Report : Fee List", 340 },
                    { 35, "rpt_fee_list_interval", true, "Fee", "Report : Fee Ledger", 350 },
                    { 36, "rpt_fee_list_concession", true, "Fee", "Report : Concession List", 360 },
                    { 37, "rpt_fee_ledger", true, "Fee", "Report : Fee Ledger", 370 },
                    { 38, "rpt_fee_family", true, "Fee", "Report : Family Fee", 380 },
                    { 39, "rpt_fee_due", true, "Fee", "Report : Due Fee", 390 },
                    { 40, "rpt_fee_fund_due", true, "Fee", "Report : Due Fund", 400 },
                    { 41, "rpt_fee_balance_sheet", true, "Fee", "Report : Balance Sheet", 410 },
                    { 42, "mark_attnd", true, "Attendance", "Mark Attendance", 420 },
                    { 43, "rpt_attnd", true, "Attendance", "Attendance Reports", 430 },
                    { 44, "rpt_att_summary", true, "Attendance", "Report : Summary by Date", 440 },
                    { 45, "rpt_att_class", true, "Attendance", "Report : Class Attendance", 450 },
                    { 46, "rpt_att_list_absent", true, "Attendance", "Report : Absent List", 460 },
                    { 47, "rpt_att_list_absent_ndays", true, "Attendance", "Report : Absent List N Days", 470 },
                    { 48, "rpt_att_list_student", true, "Attendance", "Report : This Student", 480 },
                    { 49, "rpt_att_list_summary_interval", true, "Attendance", "Report : Summary by Interval", 490 },
                    { 50, "issue_voucher", true, "Accounts", "Issue Voucher", 500 },
                    { 51, "view_ledger", true, "Accounts", "View Ledger", 510 },
                    { 52, "cash_book", true, "Accounts", "Cash Book", 520 },
                    { 53, "acct_settings", true, "Accounts", "Account Settings", 530 },
                    { 54, "view_profit_loss", true, "Accounts", "View Profit and Loss Report", 540 },
                    { 55, "create_exam", true, "Exam", "Create/Edit Exam", 550 },
                    { 56, "exam_type", true, "Exam", "Exam Types", 560 },
                    { 57, "subject_def", true, "Exam", "Subject Definition", 570 },
                    { 58, "subject_classwise", true, "Exam", "Subjects Classwise", 580 },
                    { 59, "rpt_exam", true, "Exam", "Exam Reports", 590 },
                    { 60, "rpt_exam_resultcard_single", true, "Exam", "Report : Result Card Single", 600 },
                    { 61, "rpt_exam_resultcard_multiple", true, "Exam", "Report : Result Card Multiple", 610 },
                    { 62, "rpt_exam_resultcard_fancy_single", true, "Exam", "Report : Result Card Fancy Single", 620 },
                    { 63, "rpt_exam_resultcard_fancy_multiple", true, "Exam", "Report : Result Card Fancy Multiple", 630 },
                    { 64, "rpt_exam_awardlist_2c", true, "Exam", "Report : Award List 2 Col", 640 },
                    { 65, "rpt_exam_awardlist_12c", true, "Exam", "Report : Award List 12 Col", 650 },
                    { 66, "rpt_exam_top_pos", true, "Exam", "Report : Top Positions", 660 },
                    { 67, "rpt_exam_comp1", true, "Exam", "Report : Comparison 1", 670 },
                    { 68, "rpt_exam_comp2", true, "Exam", "Report : Comparison 2", 680 },
                    { 69, "change_exam_marks", true, "Exam", "Change Exam Marks", 690 },
                    { 70, "view_detailed_marks", true, "Exam", "View Detailed Marks Entry", 700 },
                    { 71, "change_detailed_marks", true, "Exam", "Change Detailed Marks Entry", 710 },
                    { 72, "view_teacher_analysis", true, "Exam", "View Teacher Analysis", 720 },
                    { 73, "view_teacher_performance", true, "Exam", "View Teacher Performance", 730 },
                    { 74, "user_mgmt", true, "User", "User Rights", 740 },
                    { 75, "user_create", true, "User", "Create User", 750 },
                    { 76, "user_list", true, "User", "List Users", 760 },
                    { 77, "param_class", true, "Parameters", "Manage Class/Section", 770 },
                    { 78, "param_occ", true, "Parameters", "Manage Occupations", 780 },
                    { 79, "param_loc", true, "Parameters", "Manage Locality", 790 },
                    { 80, "view_all_campus_dashboard", true, "Dashboard", "View All Campus Dashboard", 800 },
                    { 81, "view_coordinator_reporting", true, "Coordinator", "View Coordinator Reporting", 810 },
                    { 82, "view_daily_diary", true, "Diary", "View Daily Diary", 820 },
                    { 83, "edit_daily_diary", true, "Diary", "Add/Update Daily Diary", 830 },
                    { 84, "delete_daily_diary", true, "Diary", "Delete Daily Diary", 840 },
                    { 85, "view_live_emp_attendance", true, "Employee", "View Live Employee Attendance", 850 },
                    { 86, "view_timetable", true, "Employee", "View Time Table", 860 },
                    { 87, "change_timetable", true, "Employee", "Change TimeTable", 870 },
                    { 88, "subject_allocation", true, "Employee", "Subject Allocation", 880 },
                    { 89, "view_emp_monthly_attendance", true, "Employee", "View Teacher Monthly Attendance", 890 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblPermission_Code",
                table: "tblPermission",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblPermission");
        }
    }
}

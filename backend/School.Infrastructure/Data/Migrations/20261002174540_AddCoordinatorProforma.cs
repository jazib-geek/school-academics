using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoordinatorProforma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaActor",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HomeCampusKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrincipalType = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    PrincipalId = table.Column<int>(type: "int", nullable: false),
                    DisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaActor", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_Actor_PrincipalId", "[PrincipalId] > 0");
                    table.CheckConstraint("CK_CoordProforma_Actor_PrincipalType", "[PrincipalType] IN ('Employee', 'CampusUser')");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaReport",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CoordinatorEmployeeId = table.Column<int>(type: "int", nullable: false),
                    ReportDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Theme = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SosWeek = table.Column<short>(type: "smallint", nullable: true),
                    WorkflowStatus = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    CurrentRevisionNumber = table.Column<int>(type: "int", nullable: false),
                    TemplateVersion = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedByActorId = table.Column<int>(type: "int", nullable: false),
                    UpdatedByActorId = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaReport", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_Report_SosWeek", "[SosWeek] > 0");
                    table.CheckConstraint("CK_CoordProforma_Report_Versions", "[CurrentRevisionNumber] >= 0 AND [TemplateVersion] > 0");
                    table.CheckConstraint("CK_CoordProforma_Report_WorkflowStatus", "[WorkflowStatus] IN ('Draft', 'Submitted', 'Returned')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaReport_tblCoordinatorProformaActor_CreatedByActorId",
                        column: x => x.CreatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaReport_tblCoordinatorProformaActor_UpdatedByActorId",
                        column: x => x.UpdatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaReport_tblEmployee_CoordinatorEmployeeId",
                        column: x => x.CoordinatorEmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaAbsentFaculty",
                schema: "dbo",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaAbsentFaculty", x => new { x.ReportId, x.EmployeeId });
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAbsentFaculty_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAbsentFaculty_tblEmployee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaAttendanceSnapshot",
                schema: "dbo",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    ActiveStudents = table.Column<int>(type: "int", nullable: true),
                    PresentStudents = table.Column<int>(type: "int", nullable: true),
                    AbsentStudents = table.Column<int>(type: "int", nullable: true),
                    UnmarkedStudents = table.Column<int>(type: "int", nullable: true),
                    TotalFaculty = table.Column<int>(type: "int", nullable: true),
                    ScopeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    SourceCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    CapturedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    SourceNotes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaAttendanceSnapshot", x => x.ReportId);
                    table.CheckConstraint("CK_CoordProforma_AttendanceSnapshot_Counts", "[ActiveStudents] >= 0 AND [PresentStudents] >= 0 AND [AbsentStudents] >= 0 AND [UnmarkedStudents] >= 0 AND [TotalFaculty] >= 0");
                    table.CheckConstraint("CK_CoordProforma_AttendanceSnapshot_ScopeCode", "[ScopeCode] IN ('Campus')");
                    table.CheckConstraint("CK_CoordProforma_AttendanceSnapshot_SourceCode", "[SourceCode] IN ('AttendanceService', 'Manual')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAttendanceSnapshot_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaNotebookSchedule",
                schema: "dbo",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    WeekdayNumber = table.Column<byte>(type: "tinyint", nullable: false),
                    PlannedCoverage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaNotebookSchedule", x => new { x.ReportId, x.WeekdayNumber });
                    table.CheckConstraint("CK_CoordProforma_NotebookSchedule_Weekday", "[WeekdayNumber] BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaNotebookSchedule_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaRevision",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    SubmittedByActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    TemplateVersion = table.Column<int>(type: "int", nullable: false),
                    SnapshotSchemaVersion = table.Column<int>(type: "int", nullable: false),
                    PrintTemplateVersion = table.Column<int>(type: "int", nullable: false),
                    SnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaRevision", x => x.Id);
                    table.UniqueConstraint("AK_tblCoordinatorProformaRevision_Id_ReportId", x => new { x.Id, x.ReportId });
                    table.CheckConstraint("CK_CoordProforma_Revision_Json", "ISJSON([SnapshotJson]) = 1");
                    table.CheckConstraint("CK_CoordProforma_Revision_Versions", "[RevisionNumber] > 0 AND [TemplateVersion] > 0 AND [SnapshotSchemaVersion] > 0 AND [PrintTemplateVersion] > 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaRevision_tblCoordinatorProformaActor_SubmittedByActorId",
                        column: x => x.SubmittedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaRevision_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaSection",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    DeclarationCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    DeclarationNote = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaSection", x => x.Id);
                    table.UniqueConstraint("AK_tblCoordinatorProformaSection_ReportId_SectionCode", x => new { x.ReportId, x.SectionCode });
                    table.CheckConstraint("CK_CoordProforma_Section_DeclarationCode", "[DeclarationCode] IN ('NoneToReport', 'NotApplicable')");
                    table.CheckConstraint("CK_CoordProforma_Section_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaSection_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaSummaryTick",
                schema: "dbo",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    ItemCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    IsTicked = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaSummaryTick", x => new { x.ReportId, x.ItemCode });
                    table.CheckConstraint("CK_CoordProforma_SummaryTick_ItemCode", "[ItemCode] IN ('Notebooks', 'Diary', 'Kaizen', 'Observation', 'Teachers', 'Faculty')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaSummaryTick_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaComment",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    RevisionId = table.Column<int>(type: "int", nullable: true),
                    ActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaComment", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_Comment_Text", "LEN(LTRIM(RTRIM([Text]))) > 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaComment_tblCoordinatorProformaActor_ActorId",
                        column: x => x.ActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaComment_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaComment_tblCoordinatorProformaRevision_RevisionId_ReportId",
                        columns: x => new { x.RevisionId, x.ReportId },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaRevision",
                        principalColumns: new[] { "Id", "ReportId" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaReviewEvent",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RevisionId = table.Column<int>(type: "int", nullable: false),
                    EventCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    ActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaReviewEvent", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_ReviewEvent_EventCode", "[EventCode] IN ('Acknowledged', 'Approved', 'Returned')");
                    table.CheckConstraint("CK_CoordProforma_ReviewEvent_ReturnReason", "[EventCode] <> 'Returned' OR ([Note] IS NOT NULL AND LEN(LTRIM(RTRIM([Note]))) > 0)");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaReviewEvent_tblCoordinatorProformaActor_ActorId",
                        column: x => x.ActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaReviewEvent_tblCoordinatorProformaRevision_RevisionId",
                        column: x => x.RevisionId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaRevision",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaEntry",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ClassSectionId = table.Column<int>(type: "int", nullable: true),
                    SubjectId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedByActorId = table.Column<int>(type: "int", nullable: false),
                    UpdatedByActorId = table.Column<int>(type: "int", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaEntry", x => x.Id);
                    table.UniqueConstraint("AK_tblCoordinatorProformaEntry_Id_ReportId", x => new { x.Id, x.ReportId });
                    table.UniqueConstraint("AK_tblCoordinatorProformaEntry_Id_SectionCode", x => new { x.Id, x.SectionCode });
                    table.CheckConstraint("CK_CoordProforma_Entry_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')");
                    table.CheckConstraint("CK_CoordProforma_Entry_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblCoordinatorProformaActor_CreatedByActorId",
                        column: x => x.CreatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblCoordinatorProformaActor_UpdatedByActorId",
                        column: x => x.UpdatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblCoordinatorProformaSection_ReportId_SectionCode",
                        columns: x => new { x.ReportId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaSection",
                        principalColumns: new[] { "ReportId", "SectionCode" });
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblSection_ClassSectionId",
                        column: x => x.ClassSectionId,
                        principalSchema: "dbo",
                        principalTable: "tblSection",
                        principalColumn: "ID");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntry_tblSubjectMaster_SubjectId",
                        column: x => x.SubjectId,
                        principalSchema: "dbo",
                        principalTable: "tblSubjectMaster",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaAction",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    SourceEntryId = table.Column<int>(type: "int", nullable: false),
                    SourceRevisionId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OwnerEmployeeId = table.Column<int>(type: "int", nullable: true),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    StatusCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedByActorId = table.Column<int>(type: "int", nullable: false),
                    UpdatedByActorId = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaAction", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_Action_StatusCode", "[StatusCode] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')");
                    table.CheckConstraint("CK_CoordProforma_Action_Title", "LEN(LTRIM(RTRIM([Title]))) > 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblCoordinatorProformaActor_CreatedByActorId",
                        column: x => x.CreatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblCoordinatorProformaActor_UpdatedByActorId",
                        column: x => x.UpdatedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblCoordinatorProformaEntry_SourceEntryId_ReportId",
                        columns: x => new { x.SourceEntryId, x.ReportId },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "ReportId" });
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblCoordinatorProformaRevision_SourceRevisionId_ReportId",
                        columns: x => new { x.SourceRevisionId, x.ReportId },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaRevision",
                        principalColumns: new[] { "Id", "ReportId" });
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAction_tblEmployee_OwnerEmployeeId",
                        column: x => x.OwnerEmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaActivity",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    ActivityTypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaActivity", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_Activity_ActivityTypeCode", "[ActivityTypeCode] IN ('ZLesson', 'SpecialPeriod', 'Competition', 'Event', 'Ptm', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_Activity_Section", "[SectionCode] = 'Activities'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaActivity_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaAttachment",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    StorageProvider = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ObjectKey = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UploadStatus = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaAttachment", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_Attachment_ObjectKey", "LEN(LTRIM(RTRIM([ObjectKey]))) > 0");
                    table.CheckConstraint("CK_CoordProforma_Attachment_Size", "[SizeBytes] >= 0");
                    table.CheckConstraint("CK_CoordProforma_Attachment_UploadStatus", "[UploadStatus] IN ('Pending', 'Completed', 'Failed')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAttachment_tblCoordinatorProformaActor_UploadedByActorId",
                        column: x => x.UploadedByActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAttachment_tblCoordinatorProformaEntry_EntryId",
                        column: x => x.EntryId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaAuditEvent",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    EntryId = table.Column<int>(type: "int", nullable: true),
                    ActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    EventCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ChangeSchemaVersion = table.Column<int>(type: "int", nullable: false),
                    ChangeJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaAuditEvent", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_AuditEvent_Json", "[ChangeJson] IS NULL OR ISJSON([ChangeJson]) = 1");
                    table.CheckConstraint("CK_CoordProforma_AuditEvent_Version", "[ChangeSchemaVersion] > 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAuditEvent_tblCoordinatorProformaActor_ActorId",
                        column: x => x.ActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAuditEvent_tblCoordinatorProformaEntry_EntryId_ReportId",
                        columns: x => new { x.EntryId, x.ReportId },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "ReportId" });
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaAuditEvent_tblCoordinatorProformaReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaReport",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaCheckResponse",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    CriterionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    ResponseCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaCheckResponse", x => new { x.EntryId, x.CriterionCode });
                    table.CheckConstraint("CK_CoordProforma_CheckResponse_CriterionCode", "[CriterionCode] IN ('RoutineMoralLessonDelivered', 'RoutineAbsenteesFollowup', 'RoutineHomeworkFirstLesson', 'RoutineModsWelcome', 'FridayEvidenceMatters', 'FridayTeachersDiary', 'FridayLessonPlanning', 'FridayTeachingMaterial', 'FridayOtherPlanning', 'OxygenQuestionPaper', 'OxygenAnswerSheets', 'OxygenAwardList', 'OxygenBoardUse', 'ObservationReferenceMaterial', 'ObservationSosRelevance', 'ObservationStudentEngagement', 'ObservationDemonstration', 'ObservationDiscipline', 'ObservationBoardAvUse', 'ObservationQuestionsAnswers', 'ObservationHomeworkAsScheduled', 'DailyUniform', 'DailyCampusCleanliness', 'DailyTeachersInClasses')");
                    table.CheckConstraint("CK_CoordProforma_CheckResponse_CriterionScope", "([SectionCode] = 'Routine' AND [CriterionCode] IN ('RoutineMoralLessonDelivered', 'RoutineAbsenteesFollowup', 'RoutineHomeworkFirstLesson', 'RoutineModsWelcome')) OR ([SectionCode] = 'Friday' AND [CriterionCode] IN ('FridayEvidenceMatters', 'FridayTeachersDiary', 'FridayLessonPlanning', 'FridayTeachingMaterial', 'FridayOtherPlanning')) OR ([SectionCode] = 'Oxygen' AND [CriterionCode] IN ('OxygenQuestionPaper', 'OxygenAnswerSheets', 'OxygenAwardList', 'OxygenBoardUse')) OR ([SectionCode] = 'Observation' AND [CriterionCode] IN ('ObservationReferenceMaterial', 'ObservationSosRelevance', 'ObservationStudentEngagement', 'ObservationDemonstration', 'ObservationDiscipline', 'ObservationBoardAvUse', 'ObservationQuestionsAnswers', 'ObservationHomeworkAsScheduled')) OR ([SectionCode] = 'DailyChecks' AND [CriterionCode] IN ('DailyUniform', 'DailyCampusCleanliness', 'DailyTeachersInClasses'))");
                    table.CheckConstraint("CK_CoordProforma_CheckResponse_ResponseCode", "[ResponseCode] IN ('Done', 'NotDone', 'NotVerified', 'NotApplicable', 'Checked', 'NeedsAttention', 'NotChecked', 'Satisfactory')");
                    table.CheckConstraint("CK_CoordProforma_CheckResponse_ResponseScope", "([SectionCode] = 'Routine' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Done', 'NotDone', 'NotVerified', 'NotApplicable'))) OR ([SectionCode] = 'Friday' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Checked', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'Oxygen' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'Observation' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'DailyChecks' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable')))");
                    table.CheckConstraint("CK_CoordProforma_CheckResponse_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaCheckResponse_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaClassObservation",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    PeriodText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ObservationTypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    ObservationRemarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GuidanceText = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaClassObservation", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_ClassObservation_ObservationTypeCode", "[ObservationTypeCode] IN ('Formal', 'Informal')");
                    table.CheckConstraint("CK_CoordProforma_ClassObservation_Section", "[SectionCode] = 'Observation'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaClassObservation_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaClosing",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    PendingSubmissionState = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    PendingSubmissionText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SvhwResultsSentCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    CriticalMatterState = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    CriticalMatterText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PeopleRemainingState = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    PeopleRemainingText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PlanReportCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    DepartureTime = table.Column<TimeOnly>(type: "time(0)", nullable: true),
                    ClosingRemarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaClosing", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_Closing_CriticalMatter", "([CriticalMatterState] IS NULL AND [CriticalMatterText] IS NULL) OR ([CriticalMatterState] IS NOT NULL AND ([CriticalMatterState] = 'Details' OR ([CriticalMatterState] = 'None' AND [CriticalMatterText] IS NULL)))");
                    table.CheckConstraint("CK_CoordProforma_Closing_CriticalMatterState", "[CriticalMatterState] IN ('None', 'Details')");
                    table.CheckConstraint("CK_CoordProforma_Closing_PendingSubmission", "([PendingSubmissionState] IS NULL AND [PendingSubmissionText] IS NULL) OR ([PendingSubmissionState] IS NOT NULL AND ([PendingSubmissionState] = 'Details' OR ([PendingSubmissionState] = 'None' AND [PendingSubmissionText] IS NULL)))");
                    table.CheckConstraint("CK_CoordProforma_Closing_PendingSubmissionState", "[PendingSubmissionState] IN ('None', 'Details')");
                    table.CheckConstraint("CK_CoordProforma_Closing_PeopleRemaining", "([PeopleRemainingState] IS NULL AND [PeopleRemainingText] IS NULL) OR ([PeopleRemainingState] IS NOT NULL AND ([PeopleRemainingState] = 'Details' OR ([PeopleRemainingState] = 'None' AND [PeopleRemainingText] IS NULL)))");
                    table.CheckConstraint("CK_CoordProforma_Closing_PeopleRemainingState", "[PeopleRemainingState] IN ('None', 'Details')");
                    table.CheckConstraint("CK_CoordProforma_Closing_PlanReportCode", "[PlanReportCode] IN ('Plan', 'Report')");
                    table.CheckConstraint("CK_CoordProforma_Closing_Section", "[SectionCode] = 'Closing'");
                    table.CheckConstraint("CK_CoordProforma_Closing_SvhwResultsSentCode", "[SvhwResultsSentCode] IN ('Yes', 'No', 'NotApplicable')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaClosing_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaCriticalDiary",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    Issue = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Concern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Response = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaCriticalDiary", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_CriticalDiary_Section", "[SectionCode] = 'CriticalDiary'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaCriticalDiary_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaDailyCheck",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    MoralLessonTopic = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AssemblyResponse = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    ArrivalTime = table.Column<TimeOnly>(type: "time(0)", nullable: true),
                    DutyCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    DutyOtherLabel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaDailyCheck", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_DailyCheck_AssemblyResponse", "[AssemblyResponse] IN ('Yes', 'No', 'NotObserved')");
                    table.CheckConstraint("CK_CoordProforma_DailyCheck_DutyCode", "[DutyCode] IN ('Welcome', 'Assembly', 'Break', 'OffTime', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_DailyCheck_Section", "[SectionCode] = 'DailyChecks'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaDailyCheck_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaDiaryCheck",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    IssueCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    IssueDetails = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaDiaryCheck", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_DiaryCheck_IssueCode", "[IssueCode] IN ('Ok', 'Missing', 'Unsigned', 'Unclear', 'Uncorrected', 'AwardTitleMissing', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_DiaryCheck_Section", "[SectionCode] = 'Diary'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaDiaryCheck_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaDispatch",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    DispatchTypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaDispatch", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_Dispatch_DispatchTypeCode", "[DispatchTypeCode] IN ('Notice', 'FeeChallan', 'Schedule', 'Syllabus', 'QuestionPapers', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_Dispatch_Section", "[SectionCode] = 'Dispatch'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaDispatch_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaEntryEmployee",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    RoleCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaEntryEmployee", x => new { x.EntryId, x.EmployeeId, x.RoleCode });
                    table.CheckConstraint("CK_CoordProforma_EntryEmployee_RoleCode", "[RoleCode] IN ('SubjectTeacher', 'ClassTeacher', 'FollowupTeacher', 'CounselledStaff', 'MorningMod', 'DutyEmployee')");
                    table.CheckConstraint("CK_CoordProforma_EntryEmployee_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntryEmployee_tblCoordinatorProformaEntry_EntryId",
                        column: x => x.EntryId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntryEmployee_tblEmployee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaEntryStudent",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaEntryStudent", x => new { x.EntryId, x.StudentId });
                    table.CheckConstraint("CK_CoordProforma_EntryStudent_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntryStudent_tblCoordinatorProformaEntry_EntryId",
                        column: x => x.EntryId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaEntryStudent_tblStudent_StudentId",
                        column: x => x.StudentId,
                        principalSchema: "dbo",
                        principalTable: "tblStudent",
                        principalColumn: "Reg_Id");
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaFacultyCounselling",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    TypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Concern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AgreedAction = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaFacultyCounselling", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_FacultyCounselling_Section", "[SectionCode] = 'Faculty'");
                    table.CheckConstraint("CK_CoordProforma_FacultyCounselling_TypeCode", "[TypeCode] IN ('Counselling', 'Warning')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaFacultyCounselling_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaMeeting",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    MeetingPoints = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaMeeting", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_Meeting_Section", "[SectionCode] = 'Morning'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaMeeting_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaNotebookCheck",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    TitlePresent = table.Column<bool>(type: "bit", nullable: true),
                    PageNumberingPresent = table.Column<bool>(type: "bit", nullable: true),
                    NeatnessSatisfactory = table.Column<bool>(type: "bit", nullable: true),
                    WritingQualityCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Mistakes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CorrectionTimeText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CorrectionDueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CorrectionStatusCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    TeacherInformedCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaNotebookCheck", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_NotebookCheck_CorrectionStatusCode", "[CorrectionStatusCode] IN ('NotNeeded', 'NotCorrected', 'PartiallyCorrected', 'Completed')");
                    table.CheckConstraint("CK_CoordProforma_NotebookCheck_Section", "[SectionCode] = 'Notebooks'");
                    table.CheckConstraint("CK_CoordProforma_NotebookCheck_TeacherInformedCode", "[TeacherInformedCode] IN ('NotYet', 'InformedByCoordinator')");
                    table.CheckConstraint("CK_CoordProforma_NotebookCheck_WritingQualityCode", "[WritingQualityCode] IN ('BelowAverage', 'Average', 'Good')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaNotebookCheck_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaOxygenPeriod",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    PeriodText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    InstructionalComments = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaOxygenPeriod", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_OxygenPeriod_Section", "[SectionCode] = 'Oxygen'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaOxygenPeriod_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaParentContact",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    ContactTypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    DirectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Concern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Response = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaParentContact", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_ParentContact_ContactTypeCode", "[ContactTypeCode] IN ('Complaint', 'Call', 'Visit', 'Inquiry')");
                    table.CheckConstraint("CK_CoordProforma_ParentContact_DirectionCode", "[DirectionCode] IN ('Incoming', 'Outgoing')");
                    table.CheckConstraint("CK_CoordProforma_ParentContact_Section", "[SectionCode] = 'Parents'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaParentContact_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaPriorityResponse",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    Concern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Response = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaPriorityResponse", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_PriorityResponse_Section", "[SectionCode] = 'Priority'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaPriorityResponse_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaStudentKaizen",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    CategoryCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    RemedialCounselling = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaStudentKaizen", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_StudentKaizen_CategoryCode", "[CategoryCode] IN ('BelowAverage', 'Average', 'Good', 'AcademicSupport', 'Behaviour', 'Grooming', 'Motivation', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_StudentKaizen_Section", "[SectionCode] = 'Kaizen'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaStudentKaizen_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaTeacherFollowup",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    AreaCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    PointsOfConcern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AcknowledgedMeasures = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaTeacherFollowup", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_TeacherFollowup_AreaCode", "[AreaCode] IN ('SchemeOfStudies', 'StudentDiary', 'TeacherDiary', 'Notebooks', 'ClassObservation', 'Test', 'ModDiscipline', 'Other')");
                    table.CheckConstraint("CK_CoordProforma_TeacherFollowup_Section", "[SectionCode] = 'Teachers'");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaTeacherFollowup_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaTestConfirmation",
                schema: "dbo",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "int", nullable: false),
                    SectionCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    TestTypeCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    TestCopies = table.Column<int>(type: "int", nullable: true),
                    AbsentCount = table.Column<int>(type: "int", nullable: true),
                    TestDate = table.Column<DateOnly>(type: "date", nullable: true),
                    PeriodText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaTestConfirmation", x => x.EntryId);
                    table.CheckConstraint("CK_CoordProforma_TestConfirmation_Counts", "[TestCopies] >= 0 AND [AbsentCount] >= 0");
                    table.CheckConstraint("CK_CoordProforma_TestConfirmation_Section", "[SectionCode] = 'Tests'");
                    table.CheckConstraint("CK_CoordProforma_TestConfirmation_TestTypeCode", "[TestTypeCode] IN ('SosTest', 'Retest', 'MkrT')");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaTestConfirmation_tblCoordinatorProformaEntry_EntryId_SectionCode",
                        columns: x => new { x.EntryId, x.SectionCode },
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaEntry",
                        principalColumns: new[] { "Id", "SectionCode" });
                });

            migrationBuilder.CreateTable(
                name: "tblCoordinatorProformaActionEvent",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActionId = table.Column<int>(type: "int", nullable: false),
                    ActorId = table.Column<int>(type: "int", nullable: false),
                    ActorDisplayNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    EventCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    FromStatus = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    ToStatus = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ChangeSchemaVersion = table.Column<int>(type: "int", nullable: false),
                    ChangeJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCoordinatorProformaActionEvent", x => x.Id);
                    table.CheckConstraint("CK_CoordProforma_ActionEvent_EventCode", "[EventCode] IN ('Created', 'Updated', 'Assigned', 'DueDateChanged', 'StatusChanged', 'ReadyForVerification', 'VerifiedClosed', 'Reopened')");
                    table.CheckConstraint("CK_CoordProforma_ActionEvent_FromStatus", "[FromStatus] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')");
                    table.CheckConstraint("CK_CoordProforma_ActionEvent_Json", "[ChangeJson] IS NULL OR ISJSON([ChangeJson]) = 1");
                    table.CheckConstraint("CK_CoordProforma_ActionEvent_ToStatus", "[ToStatus] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')");
                    table.CheckConstraint("CK_CoordProforma_ActionEvent_Version", "[ChangeSchemaVersion] > 0");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaActionEvent_tblCoordinatorProformaAction_ActionId",
                        column: x => x.ActionId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaAction",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_tblCoordinatorProformaActionEvent_tblCoordinatorProformaActor_ActorId",
                        column: x => x.ActorId,
                        principalSchema: "dbo",
                        principalTable: "tblCoordinatorProformaActor",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAbsentFaculty_EmployeeId",
                schema: "dbo",
                table: "tblCoordinatorProformaAbsentFaculty",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_CreatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                column: "CreatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_OwnerEmployeeId_StatusCode",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                columns: new[] { "OwnerEmployeeId", "StatusCode" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_ReportId",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_SourceEntryId_ReportId",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                columns: new[] { "SourceEntryId", "ReportId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_SourceRevisionId_ReportId",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                columns: new[] { "SourceRevisionId", "ReportId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_StatusCode_DueDate",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                columns: new[] { "StatusCode", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAction_UpdatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaAction",
                column: "UpdatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaActionEvent_ActionId_CreatedAtUtc",
                schema: "dbo",
                table: "tblCoordinatorProformaActionEvent",
                columns: new[] { "ActionId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaActionEvent_ActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaActionEvent",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaActivity_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaActivity",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaActor_HomeCampusKey_PrincipalType_PrincipalId",
                schema: "dbo",
                table: "tblCoordinatorProformaActor",
                columns: new[] { "HomeCampusKey", "PrincipalType", "PrincipalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAttachment_EntryId",
                schema: "dbo",
                table: "tblCoordinatorProformaAttachment",
                column: "EntryId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAttachment_UploadedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaAttachment",
                column: "UploadedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAuditEvent_ActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaAuditEvent",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAuditEvent_EntryId_ReportId",
                schema: "dbo",
                table: "tblCoordinatorProformaAuditEvent",
                columns: new[] { "EntryId", "ReportId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaAuditEvent_ReportId_CreatedAtUtc",
                schema: "dbo",
                table: "tblCoordinatorProformaAuditEvent",
                columns: new[] { "ReportId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaCheckResponse_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaCheckResponse",
                columns: new[] { "EntryId", "SectionCode" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaClassObservation_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaClassObservation",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaClosing_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaClosing",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaComment_ActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaComment",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaComment_ReportId_CreatedAtUtc",
                schema: "dbo",
                table: "tblCoordinatorProformaComment",
                columns: new[] { "ReportId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaComment_RevisionId_ReportId",
                schema: "dbo",
                table: "tblCoordinatorProformaComment",
                columns: new[] { "RevisionId", "ReportId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaCriticalDiary_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaCriticalDiary",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaDailyCheck_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaDailyCheck",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaDiaryCheck_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaDiaryCheck",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaDispatch_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaDispatch",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_ClassSectionId_SubjectId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                columns: new[] { "ClassSectionId", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_CreatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                column: "CreatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_ReportId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                columns: new[] { "ReportId", "SectionCode" },
                unique: true,
                filter: "[SectionCode] = 'Closing' AND [DeletedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_ReportId_SectionCode_SortOrder",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                columns: new[] { "ReportId", "SectionCode", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_SubjectId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntry_UpdatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntry",
                column: "UpdatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntryEmployee_EmployeeId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntryEmployee",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaEntryStudent_StudentId",
                schema: "dbo",
                table: "tblCoordinatorProformaEntryStudent",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaFacultyCounselling_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaFacultyCounselling",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaMeeting_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaMeeting",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaNotebookCheck_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaNotebookCheck",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaOxygenPeriod_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaOxygenPeriod",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaParentContact_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaParentContact",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaPriorityResponse_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaPriorityResponse",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReport_CoordinatorEmployeeId_ReportDate",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                columns: new[] { "CoordinatorEmployeeId", "ReportDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReport_CreatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                column: "CreatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReport_ReportDate_WorkflowStatus",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                columns: new[] { "ReportDate", "WorkflowStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReport_UpdatedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                column: "UpdatedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReviewEvent_ActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaReviewEvent",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaReviewEvent_RevisionId_CreatedAtUtc",
                schema: "dbo",
                table: "tblCoordinatorProformaReviewEvent",
                columns: new[] { "RevisionId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaRevision_ReportId_RevisionNumber",
                schema: "dbo",
                table: "tblCoordinatorProformaRevision",
                columns: new[] { "ReportId", "RevisionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaRevision_SubmittedByActorId",
                schema: "dbo",
                table: "tblCoordinatorProformaRevision",
                column: "SubmittedByActorId");

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaStudentKaizen_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaStudentKaizen",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaTeacherFollowup_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaTeacherFollowup",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCoordinatorProformaTestConfirmation_EntryId_SectionCode",
                schema: "dbo",
                table: "tblCoordinatorProformaTestConfirmation",
                columns: new[] { "EntryId", "SectionCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaAbsentFaculty",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaActionEvent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaActivity",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaAttachment",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaAttendanceSnapshot",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaAuditEvent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaCheckResponse",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaClassObservation",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaClosing",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaComment",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaCriticalDiary",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaDailyCheck",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaDiaryCheck",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaDispatch",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaEntryEmployee",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaEntryStudent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaFacultyCounselling",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaMeeting",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaNotebookCheck",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaNotebookSchedule",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaOxygenPeriod",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaParentContact",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaPriorityResponse",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaReviewEvent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaStudentKaizen",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaSummaryTick",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaTeacherFollowup",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaTestConfirmation",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaAction",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaEntry",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaRevision",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaSection",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaReport",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCoordinatorProformaActor",
                schema: "dbo");
        }
    }
}

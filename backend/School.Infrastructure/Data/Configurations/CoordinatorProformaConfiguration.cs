using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

/// <summary>Relational storage for the daily proforma; deliberately independent of legacy reports.</summary>
internal static class CoordinatorProformaConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        var actor = modelBuilder.Entity<CoordinatorProformaActor>();
        actor.ToTable("tblCoordinatorProformaActor", "dbo");
        actor.HasKey(e => e.Id);
        actor.Property(e => e.HomeCampusKey).HasMaxLength(100);
        actor.Property(e => e.PrincipalType).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        actor.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Actor_PrincipalType", "[PrincipalType] IN ('Employee', 'CampusUser')"));
        actor.Property(e => e.DisplayNameSnapshot).HasMaxLength(250);
        actor.HasIndex(e => new { e.HomeCampusKey, e.PrincipalType, e.PrincipalId }).IsUnique();
        actor.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Actor_PrincipalId", "[PrincipalId] > 0"));

        var report = modelBuilder.Entity<CoordinatorProformaReport>();
        report.ToTable("tblCoordinatorProformaReport", "dbo");
        report.HasKey(e => e.Id);
        report.Property(e => e.Theme).HasMaxLength(500);
        report.Property(e => e.WorkflowStatus).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        report.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Report_WorkflowStatus", "[WorkflowStatus] IN ('Draft', 'Submitted', 'Returned')"));
        report.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        report.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2(3)");
        report.Property(e => e.RowVersion).IsRowVersion();
        report.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.CreatedByActorId).OnDelete(DeleteBehavior.NoAction);
        report.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.UpdatedByActorId).OnDelete(DeleteBehavior.NoAction);
        report.HasOne<Employee>(e => e.Coordinator).WithMany().HasForeignKey(e => e.CoordinatorEmployeeId).OnDelete(DeleteBehavior.NoAction);
        report.Property(e => e.WingCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        report.ToTable(t => t.HasCheckConstraint(
            ProformaWingCodeRules.ReportCheckConstraintName,
            $"[WingCode] IN ({ProformaWingCodeRules.SqlInList})"));
        report.HasIndex(e => new { e.CoordinatorEmployeeId, e.ReportDate }).IsUnique();
        report.HasIndex(e => new { e.ReportDate, e.WorkflowStatus });
        report.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Report_Versions", "[CurrentRevisionNumber] >= 0 AND [TemplateVersion] > 0"));
        report.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Report_SosWeek", "[SosWeek] > 0"));
        report.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Report_DraftJson", "[DraftWorkspaceJson] IS NULL OR ISJSON([DraftWorkspaceJson]) = 1"));

        var section = modelBuilder.Entity<CoordinatorProformaSection>();
        section.ToTable("tblCoordinatorProformaSection", "dbo");
        section.HasKey(e => e.Id);
        section.Property(e => e.SectionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        section.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Section_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')"));
        section.Property(e => e.DeclarationCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        section.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Section_DeclarationCode", "[DeclarationCode] IN ('NoneToReport', 'NotApplicable')"));
        section.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany(e => e.Sections).HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        section.HasAlternateKey(e => new { e.ReportId, e.SectionCode });

        var entry = modelBuilder.Entity<CoordinatorProformaEntry>();
        entry.ToTable("tblCoordinatorProformaEntry", "dbo");
        entry.HasKey(e => e.Id);
        entry.Property(e => e.SectionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        entry.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Entry_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')"));
        entry.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        entry.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2(3)");
        entry.Property(e => e.DeletedAtUtc).HasColumnType("datetime2(3)");
        entry.Property(e => e.RowVersion).IsRowVersion();
        entry.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.CreatedByActorId).OnDelete(DeleteBehavior.NoAction);
        entry.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.UpdatedByActorId).OnDelete(DeleteBehavior.NoAction);
        entry.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany(e => e.Entries).HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        entry.HasOne<CoordinatorProformaSection>(e => e.Section).WithMany().HasForeignKey(e => new { e.ReportId, e.SectionCode }).HasPrincipalKey(e => new { e.ReportId, e.SectionCode }).OnDelete(DeleteBehavior.NoAction);
        entry.HasOne<Section>(e => e.ClassSection).WithMany().HasForeignKey(e => e.ClassSectionId).OnDelete(DeleteBehavior.NoAction);
        entry.HasOne<SubjectMaster>(e => e.Subject).WithMany().HasForeignKey(e => e.SubjectId).OnDelete(DeleteBehavior.NoAction);
        entry.HasAlternateKey(e => new { e.Id, e.ReportId });
        entry.HasAlternateKey(e => new { e.Id, e.SectionCode });
        entry.HasIndex(e => new { e.ReportId, e.SectionCode, e.SortOrder });
        entry.HasIndex(e => new { e.ClassSectionId, e.SubjectId });
        entry.HasIndex(e => new { e.ReportId, e.SectionCode }).IsUnique().HasFilter("[SectionCode] = 'Closing' AND [DeletedAtUtc] IS NULL");
        entry.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Entry_SortOrder", "[SortOrder] >= 0"));

        var entryStudent = modelBuilder.Entity<CoordinatorProformaEntryStudent>();
        entryStudent.ToTable("tblCoordinatorProformaEntryStudent", "dbo");
        entryStudent.HasKey(e => new { e.EntryId, e.StudentId });
        entryStudent.HasOne<CoordinatorProformaEntry>(e => e.Entry).WithMany(e => e.Students).HasForeignKey(e => e.EntryId).OnDelete(DeleteBehavior.NoAction);
        entryStudent.HasOne<Student>(e => e.Student).WithMany().HasForeignKey(e => e.StudentId).OnDelete(DeleteBehavior.NoAction);
        entryStudent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_EntryStudent_SortOrder", "[SortOrder] >= 0"));

        var entryEmployee = modelBuilder.Entity<CoordinatorProformaEntryEmployee>();
        entryEmployee.ToTable("tblCoordinatorProformaEntryEmployee", "dbo");
        entryEmployee.HasKey(e => new { e.EntryId, e.EmployeeId, e.RoleCode });
        entryEmployee.Property(e => e.RoleCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        entryEmployee.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_EntryEmployee_RoleCode", "[RoleCode] IN ('SubjectTeacher', 'ClassTeacher', 'FollowupTeacher', 'CounselledStaff', 'MorningMod', 'DutyEmployee')"));
        entryEmployee.HasOne<CoordinatorProformaEntry>(e => e.Entry).WithMany(e => e.Employees).HasForeignKey(e => e.EntryId).OnDelete(DeleteBehavior.NoAction);
        entryEmployee.HasOne<Employee>(e => e.Employee).WithMany().HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.NoAction);
        entryEmployee.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_EntryEmployee_SortOrder", "[SortOrder] >= 0"));

        var checkResponse = modelBuilder.Entity<CoordinatorProformaCheckResponse>();
        checkResponse.ToTable("tblCoordinatorProformaCheckResponse", "dbo");
        checkResponse.HasKey(e => new { e.EntryId, e.CriterionCode });
        checkResponse.Property(e => e.SectionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        checkResponse.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_CheckResponse_SectionCode", "[SectionCode] IN ('Morning', 'Dispatch', 'Activities', 'Priority', 'CriticalDiary', 'Parents', 'Routine', 'Friday', 'Tests', 'Oxygen', 'Kaizen', 'Diary', 'Notebooks', 'Observation', 'Teachers', 'Faculty', 'Closing', 'DailyChecks')"));
        checkResponse.Property(e => e.CriterionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        checkResponse.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_CheckResponse_CriterionCode", "[CriterionCode] IN ('RoutineMoralLessonDelivered', 'RoutineAbsenteesFollowup', 'RoutineHomeworkFirstLesson', 'RoutineModsWelcome', 'FridayEvidenceMatters', 'FridayTeachersDiary', 'FridayLessonPlanning', 'FridayTeachingMaterial', 'FridayOtherPlanning', 'OxygenQuestionPaper', 'OxygenAnswerSheets', 'OxygenAwardList', 'OxygenBoardUse', 'ObservationReferenceMaterial', 'ObservationSosRelevance', 'ObservationStudentEngagement', 'ObservationDemonstration', 'ObservationDiscipline', 'ObservationBoardAvUse', 'ObservationQuestionsAnswers', 'ObservationHomeworkAsScheduled', 'DailyUniform', 'DailyCampusCleanliness', 'DailyTeachersInClasses')"));
        checkResponse.Property(e => e.ResponseCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        checkResponse.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_CheckResponse_ResponseCode", "[ResponseCode] IN ('Done', 'NotDone', 'NotVerified', 'NotApplicable', 'Checked', 'NeedsAttention', 'NotChecked', 'Satisfactory')"));
        checkResponse.HasOne<CoordinatorProformaEntry>(e => e.Entry).WithMany().HasForeignKey(e => new { e.EntryId, e.SectionCode }).HasPrincipalKey(e => new { e.Id, e.SectionCode }).OnDelete(DeleteBehavior.NoAction);
        checkResponse.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_CheckResponse_CriterionScope", "([SectionCode] = 'Routine' AND [CriterionCode] IN ('RoutineMoralLessonDelivered', 'RoutineAbsenteesFollowup', 'RoutineHomeworkFirstLesson', 'RoutineModsWelcome')) OR ([SectionCode] = 'Friday' AND [CriterionCode] IN ('FridayEvidenceMatters', 'FridayTeachersDiary', 'FridayLessonPlanning', 'FridayTeachingMaterial', 'FridayOtherPlanning')) OR ([SectionCode] = 'Oxygen' AND [CriterionCode] IN ('OxygenQuestionPaper', 'OxygenAnswerSheets', 'OxygenAwardList', 'OxygenBoardUse')) OR ([SectionCode] = 'Observation' AND [CriterionCode] IN ('ObservationReferenceMaterial', 'ObservationSosRelevance', 'ObservationStudentEngagement', 'ObservationDemonstration', 'ObservationDiscipline', 'ObservationBoardAvUse', 'ObservationQuestionsAnswers', 'ObservationHomeworkAsScheduled')) OR ([SectionCode] = 'DailyChecks' AND [CriterionCode] IN ('DailyUniform', 'DailyCampusCleanliness', 'DailyTeachersInClasses'))"));
        checkResponse.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_CheckResponse_ResponseScope", "([SectionCode] = 'Routine' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Done', 'NotDone', 'NotVerified', 'NotApplicable'))) OR ([SectionCode] = 'Friday' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Checked', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'Oxygen' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'Observation' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable'))) OR ([SectionCode] = 'DailyChecks' AND ([ResponseCode] IS NULL OR [ResponseCode] IN ('Satisfactory', 'NeedsAttention', 'NotChecked', 'NotApplicable')))"));

        var summaryTick = modelBuilder.Entity<CoordinatorProformaSummaryTick>();
        summaryTick.ToTable("tblCoordinatorProformaSummaryTick", "dbo");
        summaryTick.HasKey(e => new { e.ReportId, e.ItemCode });
        summaryTick.Property(e => e.ItemCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        summaryTick.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_SummaryTick_ItemCode", "[ItemCode] IN ('Notebooks', 'Diary', 'Kaizen', 'Observation', 'Teachers', 'Faculty')"));
        summaryTick.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);

        var notebookSchedule = modelBuilder.Entity<CoordinatorProformaNotebookSchedule>();
        notebookSchedule.ToTable("tblCoordinatorProformaNotebookSchedule", "dbo");
        notebookSchedule.HasKey(e => new { e.ReportId, e.WeekdayNumber });
        notebookSchedule.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        notebookSchedule.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_NotebookSchedule_Weekday", "[WeekdayNumber] BETWEEN 1 AND 5"));

        var attendanceSnapshot = modelBuilder.Entity<CoordinatorProformaAttendanceSnapshot>();
        attendanceSnapshot.ToTable("tblCoordinatorProformaAttendanceSnapshot", "dbo");
        attendanceSnapshot.HasKey(e => e.ReportId);
        attendanceSnapshot.Property(e => e.ReportId).ValueGeneratedNever();
        attendanceSnapshot.Property(e => e.ScopeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        attendanceSnapshot.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_AttendanceSnapshot_ScopeCode", "[ScopeCode] IN ('Campus')"));
        attendanceSnapshot.Property(e => e.SourceCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        attendanceSnapshot.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_AttendanceSnapshot_SourceCode", "[SourceCode] IN ('AttendanceService', 'Manual')"));
        attendanceSnapshot.Property(e => e.CapturedAtUtc).HasColumnType("datetime2(3)");
        attendanceSnapshot.HasOne(e => e.Report).WithOne().HasForeignKey<CoordinatorProformaAttendanceSnapshot>(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        attendanceSnapshot.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_AttendanceSnapshot_Counts", "[ActiveStudents] >= 0 AND [PresentStudents] >= 0 AND [AbsentStudents] >= 0 AND [UnmarkedStudents] >= 0 AND [TotalFaculty] >= 0 AND ([PresentFaculty] IS NULL OR [PresentFaculty] >= 0)"));

        var absentFaculty = modelBuilder.Entity<CoordinatorProformaAbsentFaculty>();
        absentFaculty.ToTable("tblCoordinatorProformaAbsentFaculty", "dbo");
        absentFaculty.HasKey(e => new { e.ReportId, e.EmployeeId });
        absentFaculty.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        absentFaculty.HasOne<Employee>(e => e.Employee).WithMany().HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.NoAction);

        var revision = modelBuilder.Entity<CoordinatorProformaRevision>();
        revision.ToTable("tblCoordinatorProformaRevision", "dbo");
        revision.HasKey(e => e.Id);
        revision.Property(e => e.SubmittedAtUtc).HasColumnType("datetime2(3)");
        revision.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        revision.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.SubmittedByActorId).OnDelete(DeleteBehavior.NoAction);
        revision.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        revision.HasIndex(e => new { e.ReportId, e.RevisionNumber }).IsUnique();
        revision.HasAlternateKey(e => new { e.Id, e.ReportId });
        revision.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Revision_Versions", "[RevisionNumber] > 0 AND [TemplateVersion] > 0 AND [SnapshotSchemaVersion] > 0 AND [PrintTemplateVersion] > 0"));
        revision.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Revision_Json", "ISJSON([SnapshotJson]) = 1"));

        var reviewEvent = modelBuilder.Entity<CoordinatorProformaReviewEvent>();
        reviewEvent.ToTable("tblCoordinatorProformaReviewEvent", "dbo");
        reviewEvent.HasKey(e => e.Id);
        reviewEvent.Property(e => e.EventCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        reviewEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ReviewEvent_EventCode", "[EventCode] IN ('Acknowledged', 'Approved', 'Returned')"));
        reviewEvent.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        reviewEvent.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        reviewEvent.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.ActorId).OnDelete(DeleteBehavior.NoAction);
        reviewEvent.HasOne<CoordinatorProformaRevision>(e => e.Revision).WithMany().HasForeignKey(e => e.RevisionId).OnDelete(DeleteBehavior.NoAction);
        reviewEvent.HasIndex(e => new { e.RevisionId, e.CreatedAtUtc });
        reviewEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ReviewEvent_ReturnReason", "[EventCode] <> 'Returned' OR ([Note] IS NOT NULL AND LEN(LTRIM(RTRIM([Note]))) > 0)"));

        var comment = modelBuilder.Entity<CoordinatorProformaComment>();
        comment.ToTable("tblCoordinatorProformaComment", "dbo");
        comment.HasKey(e => e.Id);
        comment.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        comment.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        comment.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.ActorId).OnDelete(DeleteBehavior.NoAction);
        comment.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        comment.HasOne<CoordinatorProformaRevision>(e => e.Revision).WithMany().HasForeignKey(e => new { e.RevisionId, e.ReportId }).HasPrincipalKey(e => new { e.Id, e.ReportId }).OnDelete(DeleteBehavior.NoAction);
        comment.HasIndex(e => new { e.ReportId, e.CreatedAtUtc });
        comment.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Comment_Text", "LEN(LTRIM(RTRIM([Text]))) > 0"));

        var auditEvent = modelBuilder.Entity<CoordinatorProformaAuditEvent>();
        auditEvent.ToTable("tblCoordinatorProformaAuditEvent", "dbo");
        auditEvent.HasKey(e => e.Id);
        auditEvent.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        auditEvent.Property(e => e.EventCode).HasMaxLength(64);
        auditEvent.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        auditEvent.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.ActorId).OnDelete(DeleteBehavior.NoAction);
        auditEvent.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        auditEvent.HasOne<CoordinatorProformaEntry>(e => e.Entry).WithMany().HasForeignKey(e => new { e.EntryId, e.ReportId }).HasPrincipalKey(e => new { e.Id, e.ReportId }).OnDelete(DeleteBehavior.NoAction);
        auditEvent.HasIndex(e => new { e.ReportId, e.CreatedAtUtc });
        auditEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_AuditEvent_Json", "[ChangeJson] IS NULL OR ISJSON([ChangeJson]) = 1"));
        auditEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_AuditEvent_Version", "[ChangeSchemaVersion] > 0"));

        var action = modelBuilder.Entity<CoordinatorProformaAction>();
        action.ToTable("tblCoordinatorProformaAction", "dbo");
        action.HasKey(e => e.Id);
        action.Property(e => e.Title).HasMaxLength(500);
        action.Property(e => e.StatusCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        action.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Action_StatusCode", "[StatusCode] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')"));
        action.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        action.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2(3)");
        action.Property(e => e.RowVersion).IsRowVersion();
        action.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.CreatedByActorId).OnDelete(DeleteBehavior.NoAction);
        action.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.UpdatedByActorId).OnDelete(DeleteBehavior.NoAction);
        action.HasOne<CoordinatorProformaReport>(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.NoAction);
        action.HasOne<CoordinatorProformaEntry>(e => e.SourceEntry).WithMany().HasForeignKey(e => new { e.SourceEntryId, e.ReportId }).HasPrincipalKey(e => new { e.Id, e.ReportId }).OnDelete(DeleteBehavior.NoAction);
        action.HasOne<CoordinatorProformaRevision>(e => e.SourceRevision).WithMany().HasForeignKey(e => new { e.SourceRevisionId, e.ReportId }).HasPrincipalKey(e => new { e.Id, e.ReportId }).OnDelete(DeleteBehavior.NoAction);
        action.HasOne<Employee>(e => e.Owner).WithMany().HasForeignKey(e => e.OwnerEmployeeId).OnDelete(DeleteBehavior.NoAction);
        action.HasIndex(e => new { e.StatusCode, e.DueDate });
        action.HasIndex(e => new { e.OwnerEmployeeId, e.StatusCode });
        action.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Action_Title", "LEN(LTRIM(RTRIM([Title]))) > 0"));

        var actionEvent = modelBuilder.Entity<CoordinatorProformaActionEvent>();
        actionEvent.ToTable("tblCoordinatorProformaActionEvent", "dbo");
        actionEvent.HasKey(e => e.Id);
        actionEvent.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        actionEvent.Property(e => e.EventCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        actionEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ActionEvent_EventCode", "[EventCode] IN ('Created', 'Updated', 'Assigned', 'DueDateChanged', 'StatusChanged', 'ReadyForVerification', 'VerifiedClosed', 'Reopened')"));
        actionEvent.Property(e => e.FromStatus).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        actionEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ActionEvent_FromStatus", "[FromStatus] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')"));
        actionEvent.Property(e => e.ToStatus).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        actionEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ActionEvent_ToStatus", "[ToStatus] IN ('Open', 'InProgress', 'ReadyForVerification', 'Closed')"));
        actionEvent.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(3)");
        actionEvent.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.ActorId).OnDelete(DeleteBehavior.NoAction);
        actionEvent.HasOne<CoordinatorProformaAction>(e => e.Action).WithMany().HasForeignKey(e => e.ActionId).OnDelete(DeleteBehavior.NoAction);
        actionEvent.HasIndex(e => new { e.ActionId, e.CreatedAtUtc });
        actionEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ActionEvent_Json", "[ChangeJson] IS NULL OR ISJSON([ChangeJson]) = 1"));
        actionEvent.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ActionEvent_Version", "[ChangeSchemaVersion] > 0"));

        var attachment = modelBuilder.Entity<CoordinatorProformaAttachment>();
        attachment.ToTable("tblCoordinatorProformaAttachment", "dbo");
        attachment.HasKey(e => e.Id);
        attachment.Property(e => e.StorageProvider).HasMaxLength(40);
        attachment.Property(e => e.ObjectKey).HasMaxLength(1024);
        attachment.Property(e => e.OriginalFileName).HasMaxLength(255);
        attachment.Property(e => e.ContentType).HasMaxLength(200);
        attachment.Property(e => e.ActorDisplayNameSnapshot).HasMaxLength(250);
        attachment.Property(e => e.UploadedAtUtc).HasColumnType("datetime2(3)");
        attachment.Property(e => e.UploadStatus).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        attachment.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Attachment_UploadStatus", "[UploadStatus] IN ('Pending', 'Completed', 'Failed')"));
        attachment.Property(e => e.DeletedAtUtc).HasColumnType("datetime2(3)");
        attachment.HasOne<CoordinatorProformaActor>().WithMany().HasForeignKey(e => e.UploadedByActorId).OnDelete(DeleteBehavior.NoAction);
        attachment.HasOne<CoordinatorProformaEntry>(e => e.Entry).WithMany().HasForeignKey(e => e.EntryId).OnDelete(DeleteBehavior.NoAction);
        attachment.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Attachment_Size", "[SizeBytes] >= 0"));
        attachment.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Attachment_ObjectKey", "LEN(LTRIM(RTRIM([ObjectKey]))) > 0"));

        var meeting = Detail<CoordinatorProformaMeeting>(modelBuilder, "Meeting", ProformaSectionCode.Morning);

        var dispatch = Detail<CoordinatorProformaDispatch>(modelBuilder, "Dispatch", ProformaSectionCode.Dispatch);
        dispatch.Property(e => e.DispatchTypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        dispatch.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Dispatch_DispatchTypeCode", "[DispatchTypeCode] IN ('Notice', 'FeeChallan', 'Schedule', 'Syllabus', 'QuestionPapers', 'Other')"));

        var activity = Detail<CoordinatorProformaActivity>(modelBuilder, "Activity", ProformaSectionCode.Activities);
        activity.Property(e => e.ActivityTypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        activity.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Activity_ActivityTypeCode", "[ActivityTypeCode] IN ('ZLesson', 'SpecialPeriod', 'Competition', 'Event', 'Ptm', 'Other')"));

        var priorityResponse = Detail<CoordinatorProformaPriorityResponse>(modelBuilder, "PriorityResponse", ProformaSectionCode.Priority);

        var criticalDiary = Detail<CoordinatorProformaCriticalDiary>(modelBuilder, "CriticalDiary", ProformaSectionCode.CriticalDiary);
        criticalDiary.Property(e => e.Issue).HasMaxLength(500);

        var parentContact = Detail<CoordinatorProformaParentContact>(modelBuilder, "ParentContact", ProformaSectionCode.Parents);
        parentContact.Property(e => e.ContactTypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        parentContact.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ParentContact_ContactTypeCode", "[ContactTypeCode] IN ('Complaint', 'Call', 'Visit', 'Inquiry')"));
        parentContact.Property(e => e.DirectionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        parentContact.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ParentContact_DirectionCode", "[DirectionCode] IN ('Incoming', 'Outgoing')"));

        var testConfirmation = Detail<CoordinatorProformaTestConfirmation>(modelBuilder, "TestConfirmation", ProformaSectionCode.Tests);
        testConfirmation.Property(e => e.TestTypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        testConfirmation.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_TestConfirmation_TestTypeCode", "[TestTypeCode] IN ('SosTest', 'Retest', 'MkrT')"));
        testConfirmation.Property(e => e.PeriodText).HasMaxLength(50);
        testConfirmation.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_TestConfirmation_Counts", "[TestCopies] >= 0 AND [AbsentCount] >= 0"));

        var oxygenPeriod = Detail<CoordinatorProformaOxygenPeriod>(modelBuilder, "OxygenPeriod", ProformaSectionCode.Oxygen);
        oxygenPeriod.Property(e => e.PeriodText).HasMaxLength(50);

        var studentKaizen = Detail<CoordinatorProformaStudentKaizen>(modelBuilder, "StudentKaizen", ProformaSectionCode.Kaizen);
        studentKaizen.Property(e => e.CategoryCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        studentKaizen.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_StudentKaizen_CategoryCode", "[CategoryCode] IN ('BelowAverage', 'Average', 'Good', 'AcademicSupport', 'Behaviour', 'Grooming', 'Motivation', 'Other')"));

        var diaryCheck = Detail<CoordinatorProformaDiaryCheck>(modelBuilder, "DiaryCheck", ProformaSectionCode.Diary);
        diaryCheck.Property(e => e.IssueCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        diaryCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_DiaryCheck_IssueCode", "[IssueCode] IN ('Ok', 'Missing', 'Unsigned', 'Unclear', 'Uncorrected', 'AwardTitleMissing', 'Other')"));

        var notebookCheck = Detail<CoordinatorProformaNotebookCheck>(modelBuilder, "NotebookCheck", ProformaSectionCode.Notebooks);
        notebookCheck.Property(e => e.WritingQualityCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        notebookCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_NotebookCheck_WritingQualityCode", "[WritingQualityCode] IN ('BelowAverage', 'Average', 'Good')"));
        notebookCheck.Property(e => e.CorrectionTimeText).HasMaxLength(200);
        notebookCheck.Property(e => e.CorrectionStatusCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        notebookCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_NotebookCheck_CorrectionStatusCode", "[CorrectionStatusCode] IN ('NotNeeded', 'NotCorrected', 'PartiallyCorrected', 'Completed')"));
        notebookCheck.Property(e => e.TeacherInformedCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        notebookCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_NotebookCheck_TeacherInformedCode", "[TeacherInformedCode] IN ('NotYet', 'InformedByCoordinator')"));

        var classObservation = Detail<CoordinatorProformaClassObservation>(modelBuilder, "ClassObservation", ProformaSectionCode.Observation);
        classObservation.Property(e => e.PeriodText).HasMaxLength(50);
        classObservation.Property(e => e.ObservationTypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        classObservation.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_ClassObservation_ObservationTypeCode", "[ObservationTypeCode] IN ('Formal', 'Informal')"));

        var teacherFollowup = Detail<CoordinatorProformaTeacherFollowup>(modelBuilder, "TeacherFollowup", ProformaSectionCode.Teachers);
        teacherFollowup.Property(e => e.AreaCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        teacherFollowup.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_TeacherFollowup_AreaCode", "[AreaCode] IN ('SchemeOfStudies', 'StudentDiary', 'TeacherDiary', 'Notebooks', 'ClassObservation', 'Test', 'ModDiscipline', 'Other')"));

        var facultyCounselling = Detail<CoordinatorProformaFacultyCounselling>(modelBuilder, "FacultyCounselling", ProformaSectionCode.Faculty);
        facultyCounselling.Property(e => e.TypeCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        facultyCounselling.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_FacultyCounselling_TypeCode", "[TypeCode] IN ('Counselling', 'Warning')"));

        var closing = Detail<CoordinatorProformaClosing>(modelBuilder, "Closing", ProformaSectionCode.Closing);
        closing.Property(e => e.PendingSubmissionState).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_PendingSubmissionState", "[PendingSubmissionState] IN ('None', 'Details')"));
        closing.Property(e => e.SvhwResultsSentCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_SvhwResultsSentCode", "[SvhwResultsSentCode] IN ('Yes', 'No', 'NotApplicable')"));
        closing.Property(e => e.CriticalMatterState).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_CriticalMatterState", "[CriticalMatterState] IN ('None', 'Details')"));
        closing.Property(e => e.PeopleRemainingState).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_PeopleRemainingState", "[PeopleRemainingState] IN ('None', 'Details')"));
        closing.Property(e => e.PlanReportCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_PlanReportCode", "[PlanReportCode] IN ('Plan', 'Report')"));
        closing.Property(e => e.DepartureTime).HasColumnType("time(0)");
        closing.Property(e => e.MorningModsText).HasMaxLength(500);
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_PendingSubmission", "([PendingSubmissionState] IS NULL AND [PendingSubmissionText] IS NULL) OR ([PendingSubmissionState] IS NOT NULL AND ([PendingSubmissionState] = 'Details' OR ([PendingSubmissionState] = 'None' AND [PendingSubmissionText] IS NULL)))"));
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_CriticalMatter", "([CriticalMatterState] IS NULL AND [CriticalMatterText] IS NULL) OR ([CriticalMatterState] IS NOT NULL AND ([CriticalMatterState] = 'Details' OR ([CriticalMatterState] = 'None' AND [CriticalMatterText] IS NULL)))"));
        closing.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_Closing_PeopleRemaining", "([PeopleRemainingState] IS NULL AND [PeopleRemainingText] IS NULL) OR ([PeopleRemainingState] IS NOT NULL AND ([PeopleRemainingState] = 'Details' OR ([PeopleRemainingState] = 'None' AND [PeopleRemainingText] IS NULL)))"));

        var dailyCheck = Detail<CoordinatorProformaDailyCheck>(modelBuilder, "DailyCheck", ProformaSectionCode.DailyChecks);
        dailyCheck.Property(e => e.MoralLessonTopic).HasMaxLength(500);
        dailyCheck.Property(e => e.AssemblyResponse).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        dailyCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_DailyCheck_AssemblyResponse", "[AssemblyResponse] IN ('Yes', 'No', 'NotObserved')"));
        dailyCheck.Property(e => e.ArrivalTime).HasColumnType("time(0)");
        dailyCheck.Property(e => e.DutyCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        dailyCheck.ToTable(t => t.HasCheckConstraint("CK_CoordProforma_DailyCheck_DutyCode", "[DutyCode] IN ('Welcome', 'Assembly', 'Break', 'OffTime', 'Other')"));
        dailyCheck.Property(e => e.DutyOtherLabel).HasMaxLength(200);

    }

    private static EntityTypeBuilder<T> Detail<T>(
        ModelBuilder modelBuilder, string suffix, ProformaSectionCode section)
        where T : class, ICoordinatorProformaDetail
    {
        var entity = modelBuilder.Entity<T>();
        entity.ToTable("tblCoordinatorProforma" + suffix, "dbo", table =>
            table.HasCheckConstraint("CK_CoordProforma_" + suffix + "_Section",
                $"[SectionCode] = '{section}'"));
        entity.HasKey(e => e.EntryId);
        entity.Property(e => e.EntryId).ValueGeneratedNever();
        entity.Property(e => e.SectionCode).HasConversion<string>().HasMaxLength(64).IsUnicode(false);
        entity.HasOne(e => e.Entry).WithOne()
            .HasForeignKey<T>(e => new { e.EntryId, e.SectionCode })
            .HasPrincipalKey<CoordinatorProformaEntry>(e => new { e.Id, e.SectionCode })
            .OnDelete(DeleteBehavior.NoAction);
        return entity;
    }
}

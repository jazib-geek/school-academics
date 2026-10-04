using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CoordinatorProformaService : ICoordinatorProformaService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true,
    };

    private readonly AppDbContext _context;
    private readonly TenantContext _tenant;
    private readonly IConfiguration _configuration;
    private readonly IEmployeeNotificationService _employeeNotifications;

    public CoordinatorProformaService(
        AppDbContext context,
        TenantContext tenant,
        IConfiguration configuration,
        IEmployeeNotificationService employeeNotifications)
    {
        _context = context;
        _tenant = tenant;
        _configuration = configuration;
        _employeeNotifications = employeeNotifications;
    }

    public async Task<CoordinatorProformaDayDto> GetMyDayAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        var report = await _context.CoordinatorProformaReportRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.CoordinatorEmployeeId == coordinatorEmployeeId && r.ReportDate == reportDate,
                cancellationToken);

        if (report == null)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.ID == coordinatorEmployeeId, cancellationToken);
            var wing = employee?.WingCode ?? ProformaWingCode.Primary;
            return new CoordinatorProformaDayDto
            {
                ReportId = 0,
                ReportDate = reportDate,
                WorkflowStatus = nameof(ProformaWorkflowStatus.Draft),
                Workspace = CreateEmptyWorkspace(wing),
            };
        }

        return await MapDayAsync(report, cancellationToken, includeWorkspace: true);
    }

    public async Task<CoordinatorProformaDayDto> SaveMyDayAsync(
        int coordinatorEmployeeId,
        CoordinatorProformaSaveRequestDto request,
        CancellationToken cancellationToken = default)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                var report = await GetOrCreateEditableReportAsync(coordinatorEmployeeId, request.ReportDate, cancellationToken);
                ApplyWorkspaceToReport(report, request.Workspace);
                report.UpdatedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                return await MapDayAsync(report, cancellationToken, includeWorkspace: true);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                _context.ChangeTracker.Clear();
            }
            catch (DbUpdateException ex) when (attempt < maxAttempts && IsDuplicateCoordinatorReport(ex))
            {
                _context.ChangeTracker.Clear();
            }
        }

        throw new InvalidOperationException("Could not save your report. Please try again.");
    }

    public async Task<CoordinatorProformaDayDto> SubmitMyDayAsync(
        int coordinatorEmployeeId,
        CoordinatorProformaSubmitRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var report = await _context.CoordinatorProformaReportRecords
            .FirstOrDefaultAsync(
                r => r.CoordinatorEmployeeId == coordinatorEmployeeId && r.ReportDate == request.ReportDate,
                cancellationToken)
            ?? throw new InvalidOperationException("Save your report before submitting.");

        if (report.WorkflowStatus is not (ProformaWorkflowStatus.Draft or ProformaWorkflowStatus.Returned))
        {
            throw new InvalidOperationException("This report has already been submitted.");
        }

        if (string.IsNullOrWhiteSpace(report.DraftWorkspaceJson))
        {
            throw new InvalidOperationException("Add at least one section before submitting.");
        }

        var actorId = await EnsureActorAsync(coordinatorEmployeeId, cancellationToken);
        var revisionNumber = report.CurrentRevisionNumber + 1;
        var now = DateTime.UtcNow;
        var employeeName = await _context.Employees.AsNoTracking()
            .Where(e => e.ID == coordinatorEmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Coordinator";

        var revision = new CoordinatorProformaRevision
        {
            ReportId = report.Id,
            RevisionNumber = revisionNumber,
            SubmittedAtUtc = now,
            SubmittedByActorId = actorId,
            ActorDisplayNameSnapshot = employeeName.Trim(),
            TemplateVersion = report.TemplateVersion,
            SnapshotSchemaVersion = 1,
            PrintTemplateVersion = 1,
            SnapshotJson = report.DraftWorkspaceJson!,
        };
        _context.CoordinatorProformaRevisionRecords.Add(revision);

        report.WorkflowStatus = ProformaWorkflowStatus.Submitted;
        report.CurrentRevisionNumber = revisionNumber;
        report.UpdatedAtUtc = now;
        report.UpdatedByActorId = actorId;

        await _context.SaveChangesAsync(cancellationToken);
        await NotifyAcademicHeadsOfSubmissionAsync(
            coordinatorEmployeeId,
            employeeName.Trim(),
            report.ReportDate,
            _tenant.Campus,
            cancellationToken);
        return await MapDayAsync(report, cancellationToken, includeWorkspace: true);
    }

    public async Task<CoordinatorProformaLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        var sectionRows = await _context.Sections
            .AsNoTracking()
            .Where(s => s.IsActive != false && s.ClassName != null && s.ClassName != "")
            .OrderBy(s => s.ClassName)
            .Select(s => new { s.ID, s.ClassName, s.SectionName })
            .ToListAsync(cancellationToken);

        var classes = sectionRows
            .Select(s =>
            {
                var label = FormatClassSectionDisplayName(s.ClassName, s.SectionName);
                return new CoordinatorProformaChoiceOptionDto
                {
                    Id = s.ID,
                    Value = label,
                    Label = label,
                };
            })
            .ToList();

        var subjects = await _context.SubjectMasters
            .AsNoTracking()
            .Where(s => s.SubjectName != null && s.SubjectName != "")
            .OrderBy(s => s.SubjectName)
            .Select(s => new CoordinatorProformaChoiceOptionDto
            {
                Id = s.ID,
                Value = s.SubjectName!,
                Label = s.SubjectName!,
            })
            .ToListAsync(cancellationToken);

        var teacherRows = await (
            from employee in _context.Employees.AsNoTracking()
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where employee.IsActive == true &&
                  employee.EmployeeName != null &&
                  employee.EmployeeName != "" &&
                  employee.DesignationID != EmployeeDesignations.Coordinator &&
                  designation != null &&
                  designation.DesignationName != null &&
                  designation.DesignationName.Contains("Teacher")
            orderby employee.EmployeeName
            select new { employee.ID, Name = employee.EmployeeName! })
            .ToListAsync(cancellationToken);

        var teacherIds = teacherRows.Select(t => t.ID).ToHashSet();
        var assignmentRows = await _context.EmployeeClasses
            .AsNoTracking()
            .Where(x =>
                x.EmpID != null &&
                teacherIds.Contains(x.EmpID.Value) &&
                x.ClassID != null &&
                x.SubjectID != null)
            .Select(x => new
            {
                EmployeeId = x.EmpID!.Value,
                SectionClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null,
                SubjectName = x.Subject != null ? x.Subject.SubjectName : null,
            })
            .ToListAsync(cancellationToken);

        var teacherDescriptions = assignmentRows
            .GroupBy(x => x.EmployeeId)
            .ToDictionary(
                g => g.Key,
                g => string.Join(
                    " · ",
                    g.Where(x => !string.IsNullOrWhiteSpace(x.SubjectName))
                        .GroupBy(x => x.SubjectName!.Trim())
                        .Select(subjectGroup =>
                        {
                            var classesForSubject = subjectGroup
                                .Select(x => FormatClassSectionDisplayName(x.SectionClassName, x.SectionName))
                                .Where(name => !string.IsNullOrWhiteSpace(name))
                                .Distinct(StringComparer.OrdinalIgnoreCase)
                                .OrderBy(name => name, StringComparer.OrdinalIgnoreCase);
                            return $"{subjectGroup.Key} · {string.Join(", ", classesForSubject)}";
                        })));

        var teachers = teacherRows
            .Select(t =>
            {
                var name = t.Name.Trim();
                teacherDescriptions.TryGetValue(t.ID, out var description);
                return new CoordinatorProformaChoiceOptionDto
                {
                    Id = t.ID,
                    Value = name,
                    Label = name,
                    Description = string.IsNullOrWhiteSpace(description) ? null : description,
                };
            })
            .ToList();

        var students = await (
            from student in _context.Students.AsNoTracking()
            join section in _context.Sections.AsNoTracking()
                on student.ClassCompositeID equals section.ID into sectionJoin
            from section in sectionJoin.DefaultIfEmpty()
            where student.IsActive == true &&
                  student.FullName != null &&
                  student.FullName != ""
            orderby student.FullName
            select new
            {
                student.Reg_Id,
                student.ClassCompositeID,
                Name = student.FullName!,
                section.ClassName,
                section.SectionName,
            })
            .Take(5000)
            .ToListAsync(cancellationToken);

        var studentOptions = students
            .Select(s =>
            {
                var classLabel = FormatClassSectionDisplayName(s.ClassName, s.SectionName);
                return new CoordinatorProformaChoiceOptionDto
                {
                    Id = s.Reg_Id,
                    Value = s.Name.Trim(),
                    Label = s.Name.Trim(),
                    Description = string.IsNullOrWhiteSpace(classLabel) ? null : classLabel,
                    SectionId = s.ClassCompositeID,
                };
            })
            .ToList();

        return new CoordinatorProformaLookupsDto
        {
            Classes = classes,
            Subjects = subjects,
            Teachers = teachers,
            Students = studentOptions,
        };
    }

    public Task<IReadOnlyList<CoordinatorProformaMonitorCampusDto>> GetMonitorCampusesAsync(
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<CoordinatorProformaMonitorCampusDto>>(GetCampusConnections()
            .Select(c => new CoordinatorProformaMonitorCampusDto
            {
                CampusKey = c.Campus,
                CampusName = FormatCampusLabel(c.Campus),
            })
            .ToList());

    public async Task<CoordinatorProformaMonitorDayDto> GetMonitorDayAsync(
        DateOnly reportDate,
        string campusKey,
        CancellationToken cancellationToken = default)
    {
        var connection = ResolveCampusConnection(campusKey);
        await using var campusContext = CreateCampusContext(connection);

        var coordinators = await campusContext.Employees.AsNoTracking()
            .Where(e => e.IsActive == true && e.DesignationID == EmployeeDesignations.Coordinator)
            .OrderBy(e => e.EmployeeName)
            .Select(e => new { e.ID, e.EmployeeName, e.WingCode })
            .ToListAsync(cancellationToken);

        var reports = await campusContext.CoordinatorProformaReportRecords.AsNoTracking()
            .Where(r => r.ReportDate == reportDate)
            .ToListAsync(cancellationToken);

        var reportByCoordinator = reports.ToDictionary(r => r.CoordinatorEmployeeId);

        var rows = new List<CoordinatorProformaMonitorRowDto>();
        foreach (var coordinator in coordinators)
        {
            if (reportByCoordinator.TryGetValue(coordinator.ID, out var report))
            {
                rows.Add(await MapMonitorRowAsync(campusKey, report, coordinator.EmployeeName, cancellationToken, campusContext, includeWorkspace: false));
            }
            else
            {
                rows.Add(new CoordinatorProformaMonitorRowDto
                {
                    CampusKey = campusKey,
                    ReportId = 0,
                    CoordinatorEmployeeId = coordinator.ID,
                    Coordinator = coordinator.EmployeeName?.Trim() ?? $"ID {coordinator.ID}",
                    WingCode = coordinator.WingCode?.ToString() ?? string.Empty,
                    Wing = WingLabel(coordinator.WingCode),
                    ReportDate = reportDate,
                    Status = "Missing",
                });
            }
        }

        return new CoordinatorProformaMonitorDayDto
        {
            ReportDate = reportDate,
            CampusKey = campusKey,
            CampusName = FormatCampusLabel(campusKey),
            Reports = rows,
        };
    }

    public async Task<CoordinatorProformaMonitorRowDto?> GetMonitorReportAsync(
        int reportId,
        string campusKey,
        CancellationToken cancellationToken = default)
    {
        var connection = ResolveCampusConnection(campusKey);
        await using var campusContext = CreateCampusContext(connection);

        var report = await campusContext.CoordinatorProformaReportRecords.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);
        if (report == null)
            return null;

        var name = await campusContext.Employees.AsNoTracking()
            .Where(e => e.ID == report.CoordinatorEmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        return await MapMonitorRowAsync(campusKey, report, name, cancellationToken, campusContext, includeWorkspace: true);
    }

    public async Task AcknowledgeAsync(int academicHeadEmployeeId, string campusKey, int reportId, CancellationToken cancellationToken = default) =>
        await AddReviewEventAsync(academicHeadEmployeeId, campusKey, reportId, ProformaReviewEventCode.Acknowledged, null, cancellationToken);

    public async Task ApproveAsync(int academicHeadEmployeeId, string campusKey, int reportId, CancellationToken cancellationToken = default) =>
        await AddReviewEventAsync(academicHeadEmployeeId, campusKey, reportId, ProformaReviewEventCode.Approved, null, cancellationToken);

    public async Task ReturnAsync(int academicHeadEmployeeId, string campusKey, int reportId, string note, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(note))
            throw new ArgumentException("Add a short note explaining what to fix.");
        await AddReviewEventAsync(academicHeadEmployeeId, campusKey, reportId, ProformaReviewEventCode.Returned, note.Trim(), cancellationToken);
    }

    public async Task AddHeadCommentAsync(int academicHeadEmployeeId, string campusKey, int reportId, string text, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("Comment cannot be empty.");

        var connection = ResolveCampusConnection(campusKey);
        await using var campusContext = CreateCampusContext(connection);

        var report = await campusContext.CoordinatorProformaReportRecords
            .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken)
            ?? throw new InvalidOperationException("Report not found.");

        var actorId = await EnsureActorOnContextAsync(campusContext, academicHeadEmployeeId, campusKey, cancellationToken);
        var headName = await campusContext.Employees.AsNoTracking()
            .Where(e => e.ID == academicHeadEmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Academic head";

        campusContext.CoordinatorProformaCommentRecords.Add(new CoordinatorProformaComment
        {
            ReportId = report.Id,
            ActorId = actorId,
            ActorDisplayNameSnapshot = headName.Trim(),
            Text = text.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
        });

        var workspace = DeserializeWorkspace(report.DraftWorkspaceJson) ?? CreateEmptyWorkspace(report.WingCode);
        workspace.Comments.Add(new CoordinatorProformaCommentDto
        {
            Text = text.Trim(),
            By = headName.Trim(),
            At = FormatPktTime(DateTime.UtcNow),
        });
        report.DraftWorkspaceJson = SerializeWorkspace(workspace);
        await campusContext.SaveChangesAsync(cancellationToken);

        await _employeeNotifications.PublishForEmployeeAsync(
            report.CoordinatorEmployeeId,
            EmployeeNotificationFactory.ProformaHeadComment(report.ReportDate, headName, text.Trim()),
            cancellationToken);
    }

    private async Task AddReviewEventAsync(
        int academicHeadEmployeeId,
        string campusKey,
        int reportId,
        ProformaReviewEventCode eventCode,
        string? note,
        CancellationToken cancellationToken)
    {
        var connection = ResolveCampusConnection(campusKey);
        await using var campusContext = CreateCampusContext(connection);

        var report = await campusContext.CoordinatorProformaReportRecords
            .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken)
            ?? throw new InvalidOperationException("Report not found.");

        if (report.WorkflowStatus != ProformaWorkflowStatus.Submitted && eventCode != ProformaReviewEventCode.Returned)
            throw new InvalidOperationException("Only submitted reports can be reviewed.");

        var revision = await campusContext.CoordinatorProformaRevisionRecords
            .Where(r => r.ReportId == report.Id)
            .OrderByDescending(r => r.RevisionNumber)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("No submitted revision found.");

        var actorId = await EnsureActorOnContextAsync(campusContext, academicHeadEmployeeId, campusKey, cancellationToken);
        var headName = await campusContext.Employees.AsNoTracking()
            .Where(e => e.ID == academicHeadEmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Academic head";

        if (eventCode == ProformaReviewEventCode.Acknowledged)
        {
            if (await HasAcknowledgedAsync(campusContext, revision.Id, cancellationToken))
                return;
        }
        else if (eventCode is ProformaReviewEventCode.Approved or ProformaReviewEventCode.Returned)
        {
            if (!await HasAcknowledgedAsync(campusContext, revision.Id, cancellationToken))
                AddAcknowledgedEvent(campusContext, revision.Id, actorId, headName);
        }

        campusContext.CoordinatorProformaReviewEventRecords.Add(new CoordinatorProformaReviewEvent
        {
            RevisionId = revision.Id,
            EventCode = eventCode,
            ActorId = actorId,
            ActorDisplayNameSnapshot = headName.Trim(),
            Note = note,
            CreatedAtUtc = DateTime.UtcNow,
        });

        if (eventCode == ProformaReviewEventCode.Approved)
        {
            var workspace = DeserializeWorkspace(report.DraftWorkspaceJson)
                ?? DeserializeWorkspace(revision.SnapshotJson)
                ?? CreateEmptyWorkspace(report.WingCode);
            workspace.Status = "Approved";
            workspace.Approved = true;
            workspace.Acknowledged = true;
            report.DraftWorkspaceJson = SerializeWorkspace(workspace);
        }
        else if (eventCode == ProformaReviewEventCode.Returned)
        {
            report.WorkflowStatus = ProformaWorkflowStatus.Returned;
            var workspace = DeserializeWorkspace(report.DraftWorkspaceJson) ?? DeserializeWorkspace(revision.SnapshotJson) ?? CreateEmptyWorkspace(report.WingCode);
            workspace.Status = "Returned";
            workspace.Approved = false;
            report.DraftWorkspaceJson = SerializeWorkspace(workspace);
        }

        await campusContext.SaveChangesAsync(cancellationToken);

        if (eventCode == ProformaReviewEventCode.Approved)
        {
            await _employeeNotifications.PublishForEmployeeAsync(
                report.CoordinatorEmployeeId,
                EmployeeNotificationFactory.ProformaApproved(report.ReportDate, headName),
                cancellationToken);
        }
        else if (eventCode == ProformaReviewEventCode.Returned)
        {
            await _employeeNotifications.PublishForEmployeeAsync(
                report.CoordinatorEmployeeId,
                EmployeeNotificationFactory.ProformaReturned(report.ReportDate, note, headName),
                cancellationToken);
        }
    }

    private async Task<CoordinatorProformaReport> GetOrCreateEditableReportAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken)
    {
        var report = await _context.CoordinatorProformaReportRecords
            .FirstOrDefaultAsync(
                r => r.CoordinatorEmployeeId == coordinatorEmployeeId && r.ReportDate == reportDate,
                cancellationToken);

        if (report != null)
        {
            if (report.WorkflowStatus is ProformaWorkflowStatus.Submitted)
                throw new InvalidOperationException("Submitted reports cannot be edited. Wait for head review or a return.");
            return report;
        }

        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.ID == coordinatorEmployeeId, cancellationToken)
            ?? throw new InvalidOperationException("Employee not found.");

        var actorId = await EnsureActorAsync(coordinatorEmployeeId, cancellationToken);
        var now = DateTime.UtcNow;
        var wing = employee.WingCode ?? ProformaWingCode.Primary;

        report = new CoordinatorProformaReport
        {
            CoordinatorEmployeeId = coordinatorEmployeeId,
            ReportDate = reportDate,
            WingCode = wing,
            WorkflowStatus = ProformaWorkflowStatus.Draft,
            CurrentRevisionNumber = 0,
            TemplateVersion = 1,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedByActorId = actorId,
            UpdatedByActorId = actorId,
            DraftWorkspaceJson = SerializeWorkspace(CreateEmptyWorkspace(wing)),
        };
        _context.CoordinatorProformaReportRecords.Add(report);
        return report;
    }

    private async Task NotifyAcademicHeadsOfSubmissionAsync(
        int submittingCoordinatorEmployeeId,
        string coordinatorName,
        DateOnly reportDate,
        string campusKey,
        CancellationToken cancellationToken)
    {
        var headIds = await _context.Employees.AsNoTracking()
            .Where(e => e.IsActive == true && e.IsAcademicHead)
            .Select(e => e.ID)
            .ToListAsync(cancellationToken);

        foreach (var headId in headIds)
        {
            if (headId == submittingCoordinatorEmployeeId)
                continue;

            await _employeeNotifications.PublishForEmployeeAsync(
                headId,
                EmployeeNotificationFactory.ProformaSubmitted(
                    coordinatorName,
                    reportDate,
                    submittingCoordinatorEmployeeId,
                    campusKey),
                cancellationToken);
        }
    }

    private static bool IsDuplicateCoordinatorReport(DbUpdateException exception)
    {
        var message = exception.InnerException?.Message ?? exception.Message;
        return message.Contains("IX_tblCoordinatorProformaReport_CoordinatorEmployeeId_ReportDate", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase);
    }

    private void ApplyWorkspaceToReport(CoordinatorProformaReport report, CoordinatorProformaWorkspaceDto workspace)
    {
        if (!Enum.TryParse<ProformaWingCode>(workspace.WingCode, true, out var wing))
            throw new ArgumentException("Choose a valid wing.");

        report.WingCode = wing;
        report.Theme = string.IsNullOrWhiteSpace(workspace.Theme) ? null : workspace.Theme.Trim();
        report.SosWeek = short.TryParse(workspace.SosWeek, out var sos) && sos > 0 ? sos : null;
        workspace.Wing = WingLabel(wing);
        workspace.Status = report.WorkflowStatus.ToString();
        report.DraftWorkspaceJson = SerializeWorkspace(workspace);
    }

    private async Task<CoordinatorProformaDayDto> MapDayAsync(
        CoordinatorProformaReport report,
        CancellationToken cancellationToken,
        bool includeWorkspace)
    {
        var (acknowledged, approved, submittedAt) = await GetReviewFlagsAsync(report.Id, cancellationToken);
        var workspace = DeserializeWorkspace(report.DraftWorkspaceJson) ?? CreateEmptyWorkspace(report.WingCode);
        workspace.Status = DisplayStatus(report.WorkflowStatus, acknowledged, approved);
        workspace.Acknowledged = acknowledged;
        workspace.Approved = approved;

        return new CoordinatorProformaDayDto
        {
            ReportId = report.Id,
            ReportDate = report.ReportDate,
            WorkflowStatus = report.WorkflowStatus.ToString(),
            Acknowledged = acknowledged,
            Approved = approved,
            SubmittedAt = submittedAt,
            Workspace = includeWorkspace ? workspace : new CoordinatorProformaWorkspaceDto(),
        };
    }

    private async Task<CoordinatorProformaMonitorRowDto> MapMonitorRowAsync(
        string campusKey,
        CoordinatorProformaReport report,
        string? coordinatorName,
        CancellationToken cancellationToken,
        AppDbContext campusContext,
        bool includeWorkspace)
    {
        var (acknowledged, approved, submittedAt) = await GetReviewFlagsOnContextAsync(report.Id, campusContext, cancellationToken);
        var workspace = DeserializeWorkspace(report.DraftWorkspaceJson);
        if (workspace == null && report.WorkflowStatus == ProformaWorkflowStatus.Submitted)
        {
            var snapshot = await campusContext.CoordinatorProformaRevisionRecords.AsNoTracking()
                .Where(r => r.ReportId == report.Id)
                .OrderByDescending(r => r.RevisionNumber)
                .Select(r => r.SnapshotJson)
                .FirstOrDefaultAsync(cancellationToken);
            workspace = DeserializeWorkspace(snapshot);
        }

        workspace ??= CreateEmptyWorkspace(report.WingCode);
        workspace.Status = DisplayStatus(report.WorkflowStatus, acknowledged, approved);
        workspace.Acknowledged = acknowledged;
        workspace.Approved = approved;

        return new CoordinatorProformaMonitorRowDto
        {
            CampusKey = campusKey,
            ReportId = report.Id,
            CoordinatorEmployeeId = report.CoordinatorEmployeeId,
            Coordinator = coordinatorName?.Trim() ?? $"ID {report.CoordinatorEmployeeId}",
            WingCode = report.WingCode.ToString(),
            Wing = WingLabel(report.WingCode),
            ReportDate = report.ReportDate,
            Status = workspace.Status,
            Acknowledged = acknowledged,
            Approved = approved,
            SubmittedAt = submittedAt,
            EntryCount = workspace.Entries.Count,
            ConcernCount = CountConcerns(workspace),
            Workspace = includeWorkspace ? workspace : null,
        };
    }

    private async Task<(bool Acknowledged, bool Approved, string? SubmittedAt)> GetReviewFlagsAsync(
        int reportId,
        CancellationToken cancellationToken) =>
        await GetReviewFlagsOnContextAsync(reportId, _context, cancellationToken);

    private static async Task<bool> HasAcknowledgedAsync(
        AppDbContext context,
        int revisionId,
        CancellationToken cancellationToken) =>
        await context.CoordinatorProformaReviewEventRecords.AsNoTracking()
            .AnyAsync(
                e => e.RevisionId == revisionId && e.EventCode == ProformaReviewEventCode.Acknowledged,
                cancellationToken);

    private static void AddAcknowledgedEvent(
        AppDbContext context,
        int revisionId,
        int actorId,
        string headName) =>
        context.CoordinatorProformaReviewEventRecords.Add(new CoordinatorProformaReviewEvent
        {
            RevisionId = revisionId,
            EventCode = ProformaReviewEventCode.Acknowledged,
            ActorId = actorId,
            ActorDisplayNameSnapshot = headName.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
        });

    private static async Task<(bool Acknowledged, bool Approved, string? SubmittedAt)> GetReviewFlagsOnContextAsync(
        int reportId,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var revision = await context.CoordinatorProformaRevisionRecords.AsNoTracking()
            .Where(r => r.ReportId == reportId)
            .OrderByDescending(r => r.RevisionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (revision == null)
            return (false, false, null);

        var events = await context.CoordinatorProformaReviewEventRecords.AsNoTracking()
            .Where(e => e.RevisionId == revision.Id)
            .Select(e => e.EventCode)
            .ToListAsync(cancellationToken);

        var submittedAt = FormatPktTime(revision.SubmittedAtUtc);
        return (
            events.Contains(ProformaReviewEventCode.Acknowledged),
            events.Contains(ProformaReviewEventCode.Approved),
            submittedAt);
    }

    private async Task<int> EnsureActorAsync(int employeeId, CancellationToken cancellationToken) =>
        await EnsureActorOnContextAsync(_context, employeeId, _tenant.Campus, cancellationToken);

    private static async Task<int> EnsureActorOnContextAsync(
        AppDbContext context,
        int employeeId,
        string campusKey,
        CancellationToken cancellationToken)
    {
        var existing = await context.CoordinatorProformaActorRecords.AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.HomeCampusKey == campusKey &&
                     a.PrincipalType == ProformaPrincipalType.Employee &&
                     a.PrincipalId == employeeId,
                cancellationToken);

        if (existing != null)
            return existing.Id;

        var name = await context.Employees.AsNoTracking()
            .Where(e => e.ID == employeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Staff";

        var actor = new CoordinatorProformaActor
        {
            HomeCampusKey = campusKey,
            PrincipalType = ProformaPrincipalType.Employee,
            PrincipalId = employeeId,
            DisplayNameSnapshot = name.Trim(),
        };
        context.CoordinatorProformaActorRecords.Add(actor);
        await context.SaveChangesAsync(cancellationToken);
        return actor.Id;
    }

    private static CoordinatorProformaWorkspaceDto CreateEmptyWorkspace(ProformaWingCode wing) => new()
    {
        WingCode = wing.ToString(),
        Wing = WingLabel(wing),
        Status = "Draft",
        Sections = new Dictionary<string, string>(),
        PageOneChecks = new Dictionary<string, bool>(),
        Entries = [],
        Actions = [],
        Comments = [],
        History = [],
    };

    private static string SerializeWorkspace(CoordinatorProformaWorkspaceDto workspace) =>
        JsonSerializer.Serialize(workspace, JsonOptions);

    private static CoordinatorProformaWorkspaceDto? DeserializeWorkspace(string? json) =>
        string.IsNullOrWhiteSpace(json)
            ? null
            : JsonSerializer.Deserialize<CoordinatorProformaWorkspaceDto>(json, JsonOptions);

    private static string DisplayStatus(ProformaWorkflowStatus workflow, bool acknowledged, bool approved)
    {
        if (workflow == ProformaWorkflowStatus.Returned)
            return "Returned";
        if (workflow == ProformaWorkflowStatus.Draft)
            return "Draft";
        if (approved)
            return "Approved";
        if (acknowledged)
            return "Acknowledged";
        return "Submitted";
    }

    private static int CountConcerns(CoordinatorProformaWorkspaceDto workspace) =>
        workspace.Entries.Count(entry =>
            entry.Values.Values.Any(value =>
                value is string s && (s.Contains("Needs attention", StringComparison.OrdinalIgnoreCase)
                    || s.Equals("Not done", StringComparison.OrdinalIgnoreCase)
                    || s.Equals("Not corrected", StringComparison.OrdinalIgnoreCase))));

    private static string WingLabel(ProformaWingCode? wing) => wing switch
    {
        ProformaWingCode.Junior => "Junior",
        ProformaWingCode.Primary => "Primary",
        ProformaWingCode.High => "High",
        ProformaWingCode.HighBoys => "High Boys",
        ProformaWingCode.HighGirls => "High Girls",
        ProformaWingCode.PrimaryHigh => "Primary + High",
        ProformaWingCode.JuniorPrimary => "Junior + Primary",
        _ => wing?.ToString() ?? string.Empty,
    };

    private static string FormatPktTime(DateTime utc)
    {
        var pkt = TimeZoneInfo.ConvertTimeFromUtc(
            utc,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi"));
        return pkt.ToString("HH:mm");
    }

    private static string FormatCampusLabel(string campusKey) =>
        string.IsNullOrWhiteSpace(campusKey)
            ? string.Empty
            : char.ToUpper(campusKey[0]) + campusKey[1..].Replace('-', ' ');

    private static string FormatClassSectionDisplayName(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(cn))
            return string.IsNullOrEmpty(sn) ? string.Empty : sn;

        if (string.IsNullOrEmpty(sn) || string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase))
            return cn;

        return $"{cn} - {sn}";
    }

    private string ResolveCampusConnection(string campusKey)
    {
        var key = campusKey.Trim().ToLowerInvariant();
        var connection = _configuration.GetSection("CampusSettings:Campuses")[key];
        if (string.IsNullOrWhiteSpace(connection))
            throw new ArgumentException("Invalid campus.");
        return connection;
    }

    private List<CampusConnection> GetCampusConnections()
    {
        var campuses = _configuration
            .GetSection("CampusSettings:Campuses")
            .GetChildren()
            .Where(x => !string.IsNullOrWhiteSpace(x.Key) && !string.IsNullOrWhiteSpace(x.Value))
            .Select(x => new CampusConnection(x.Key.ToLowerInvariant(), x.Value!))
            .ToList();

        var environment = _configuration["ASPNETCORE_ENVIRONMENT"] ?? _configuration["DOTNET_ENVIRONMENT"];
        if (string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase))
        {
            campuses = campuses
                .Where(x => !string.Equals(x.Campus, "local", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return campuses;
    }

    private static AppDbContext CreateCampusContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new AppDbContext(options);
    }

    private sealed record CampusConnection(string Campus, string ConnectionString);
}

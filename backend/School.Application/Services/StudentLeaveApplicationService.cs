using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class StudentLeaveApplicationService : IStudentLeaveApplicationService
{
    private readonly AppDbContext _context;
    private readonly IAttendanceService _attendanceService;
    private readonly ICampusNotificationService _notificationService;

    public StudentLeaveApplicationService(
        AppDbContext context,
        IAttendanceService attendanceService,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _attendanceService = attendanceService;
        _notificationService = notificationService;
    }

    public IReadOnlyList<StudentLeaveReasonOptionDto> GetReasonCatalog() =>
        StudentLeaveReasonCodes.Catalog
            .Select(x => new StudentLeaveReasonOptionDto { Code = x.Code, Label = x.Label })
            .ToList();

    public async Task<ParentLeaveSubmitResultDto> SubmitForFamilyAsync(
        int familyId,
        int studentId,
        ParentLeaveSubmitRequestDto request,
        CancellationToken cancellationToken = default)
    {
        await EnsureFamilyStudentAsync(familyId, studentId, cancellationToken);

        var reasonCode = StudentLeaveReasonCodes.Require(request.ReasonCode);
        var details = NormalizeDetails(request.ReasonDetails);
        if (reasonCode == StudentLeaveReasonCodes.Other && string.IsNullOrWhiteSpace(details))
            throw new ArgumentException("Please provide details for your leave request.");

        if (details?.Length > 500)
            throw new ArgumentException("Details must be 500 characters or fewer.");

        var today = PakistanTime.Today;
        var leaveDate = request.LeaveDate;
        if (leaveDate < today)
            throw new ArgumentException("Leave date cannot be in the past.");

        var hasPending = await _context.StudentLeaveApplications
            .AnyAsync(
                x => x.StudentId == studentId
                     && x.LeaveDate == leaveDate
                     && x.Status == StudentLeaveApplicationStatuses.Pending,
                cancellationToken);

        if (hasPending)
            throw new InvalidOperationException("A leave request for this date is already awaiting approval.");

        var studentName = await _context.Students.AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => x.FullName)
            .FirstOrDefaultAsync(cancellationToken);
        studentName = string.IsNullOrWhiteSpace(studentName) ? $"#{studentId}" : studentName.Trim();

        var now = PakistanTime.Now;
        var entity = new StudentLeaveApplication
        {
            StudentId = studentId,
            FamilyId = familyId,
            LeaveDate = leaveDate,
            ReasonCode = reasonCode,
            ReasonDetails = details,
            Status = StudentLeaveApplicationStatuses.Pending,
            SubmittedAtPkt = now,
        };

        _context.StudentLeaveApplications.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var leaveDateIso = leaveDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var notificationLink =
            $"/campus/leave-applications?autoSearch=1&id={entity.Id}&status=pending&date={leaveDateIso}";

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.LeaveApplication,
                "Student Leave Request received",
                $"{studentName} — leave for {FormatLeaveDate(leaveDate)} ({StudentLeaveReasonCodes.Label(reasonCode)}).",
                notificationLink,
                CampusNotificationSeverities.Info,
                ["view_leave_applications"]),
            cancellationToken);

        return new ParentLeaveSubmitResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    public async Task<ParentLeaveApplicationListDto> ListForFamilyStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default)
    {
        await EnsureFamilyStudentAsync(familyId, studentId, cancellationToken);

        var items = await _context.StudentLeaveApplications
            .AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.LeaveDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new ParentLeaveApplicationItemDto
            {
                Id = x.Id,
                LeaveDate = x.LeaveDate,
                ReasonCode = x.ReasonCode,
                ReasonLabel = x.ReasonCode,
                ReasonDetails = x.ReasonDetails,
                Status = x.Status,
                StatusLabel = x.Status,
                SubmittedAtPkt = x.SubmittedAtPkt,
                ReviewedAtPkt = x.ReviewedAtPkt,
            })
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.ReasonLabel = StudentLeaveReasonCodes.Label(item.ReasonCode);
            item.StatusLabel = StudentLeaveApplicationStatuses.Label(item.Status);
        }

        return new ParentLeaveApplicationListDto { Items = items };
    }

    public async Task<CampusLeaveApplicationListDto> ListForCampusAsync(
        string? status,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = StudentLeaveApplicationStatuses.RequireFilter(status);
        var term = string.IsNullOrWhiteSpace(search) ? null : search.Trim();

        var query =
            from app in _context.StudentLeaveApplications.AsNoTracking()
            join student in _context.Students.AsNoTracking() on app.StudentId equals student.Reg_Id
            join section in _context.Sections.AsNoTracking()
                on student.ClassCompositeID equals section.ID into secJoin
            from section in secJoin.DefaultIfEmpty()
            select new { app, student, section };

        if (!string.IsNullOrEmpty(normalizedStatus))
            query = query.Where(x => x.app.Status == normalizedStatus);

        if (dateFrom.HasValue)
            query = query.Where(x => x.app.LeaveDate >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(x => x.app.LeaveDate <= dateTo.Value);

        if (term != null)
        {
            if (int.TryParse(term, out var regId))
            {
                query = query.Where(x =>
                    x.student.Reg_Id == regId
                    || (x.student.FullName != null && x.student.FullName.Contains(term)));
            }
            else
            {
                query = query.Where(x =>
                    x.student.FullName != null && x.student.FullName.Contains(term));
            }
        }

        var rows = await query
            .OrderByDescending(x => x.app.SubmittedAtPkt)
            .ThenByDescending(x => x.app.Id)
            .Select(x => new CampusLeaveApplicationListItemDto
            {
                Id = x.app.Id,
                StudentId = x.student.Reg_Id,
                StudentName = x.student.FullName ?? "-",
                ClassName = x.section != null ? x.section.ClassName : null,
                FamilyId = x.app.FamilyId,
                LeaveDate = x.app.LeaveDate,
                ReasonCode = x.app.ReasonCode,
                ReasonLabel = x.app.ReasonCode,
                ReasonDetails = x.app.ReasonDetails,
                Status = x.app.Status,
                StatusLabel = x.app.Status,
                SubmittedAtPkt = x.app.SubmittedAtPkt,
                ReviewedAtPkt = x.app.ReviewedAtPkt,
                ReviewedByUserKey = x.app.ReviewedByUserKey,
                ReviewNote = x.app.ReviewNote,
            })
            .ToListAsync(cancellationToken);

        foreach (var row in rows)
        {
            row.ReasonLabel = StudentLeaveReasonCodes.Label(row.ReasonCode);
            row.StatusLabel = StudentLeaveApplicationStatuses.Label(row.Status);
        }

        return new CampusLeaveApplicationListDto { Items = rows };
    }

    public Task<CampusLeaveDecisionResultDto> ApproveAsync(
        int id,
        string reviewerUserKey,
        CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken = default) =>
        DecideAsync(
            id,
            reviewerUserKey,
            approve: true,
            request,
            cancellationToken);

    public Task<CampusLeaveDecisionResultDto> RejectAsync(
        int id,
        string reviewerUserKey,
        CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken = default) =>
        DecideAsync(
            id,
            reviewerUserKey,
            approve: false,
            request,
            cancellationToken);

    private async Task<CampusLeaveDecisionResultDto> DecideAsync(
        int id,
        string reviewerUserKey,
        bool approve,
        CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken)
    {
        var reviewer = string.IsNullOrWhiteSpace(reviewerUserKey) ? null : reviewerUserKey.Trim();
        if (string.IsNullOrEmpty(reviewer))
            throw new ArgumentException("Reviewer identity is required.");

        var entity = await _context.StudentLeaveApplications
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Leave request not found.");

        if (!entity.Status.Equals(StudentLeaveApplicationStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("This leave request has already been processed.");

        var classId = await _context.Students.AsNoTracking()
            .Where(x => x.Reg_Id == entity.StudentId && x.IsActive == true)
            .Select(x => x.ClassCompositeID)
            .FirstOrDefaultAsync(cancellationToken);

        if (!classId.HasValue)
            throw new InvalidOperationException("Student class is not set.");

        var attendanceStatus = approve
            ? StudentAttendanceStatuses.Leave
            : StudentAttendanceStatuses.Absent;

        await _attendanceService.SetStudentStatusForDateAsync(
            entity.StudentId,
            entity.LeaveDate.ToDateTime(TimeOnly.MinValue),
            attendanceStatus);

        entity.Status = approve
            ? StudentLeaveApplicationStatuses.Approved
            : StudentLeaveApplicationStatuses.Rejected;
        entity.ReviewedAtPkt = PakistanTime.Now;
        entity.ReviewedByUserKey = reviewer;
        entity.ReviewNote = NormalizeDetails(request?.ReviewNote);

        await _context.SaveChangesAsync(cancellationToken);

        return new CampusLeaveDecisionResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    private async Task EnsureFamilyStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken)
    {
        var ok = await _context.Students.AsNoTracking()
            .AnyAsync(
                s => s.Reg_Id == studentId && s.Family_Code == familyId && s.IsActive == true,
                cancellationToken);

        if (!ok)
            throw new UnauthorizedAccessException("This student is not part of your family.");
    }

    private static string? NormalizeDetails(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }

    private static string FormatLeaveDate(DateOnly date) =>
        date.ToString("d MMM yyyy", System.Globalization.CultureInfo.InvariantCulture);
}

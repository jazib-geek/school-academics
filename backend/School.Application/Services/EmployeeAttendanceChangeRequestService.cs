using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeAttendanceChangeRequestService : IEmployeeAttendanceChangeRequestService
{
    private readonly AppDbContext _context;
    private readonly IEmployeeAttendanceService _employeeAttendanceService;
    private readonly IActivityLogService _activityLogService;
    private readonly ICampusNotificationService _notificationService;

    public EmployeeAttendanceChangeRequestService(
        AppDbContext context,
        IEmployeeAttendanceService employeeAttendanceService,
        IActivityLogService activityLogService,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _employeeAttendanceService = employeeAttendanceService;
        _activityLogService = activityLogService;
        _notificationService = notificationService;
    }

    public async Task<EmployeeAttendanceChangeRequestSubmitResultDto> SubmitAsync(
        SubmitEmployeeAttendanceChangeRequestDto request,
        string submitterUserKey,
        int? submitterUserId,
        CancellationToken cancellationToken = default)
    {
        var submitter = string.IsNullOrWhiteSpace(submitterUserKey) ? null : submitterUserKey.Trim();
        if (string.IsNullOrEmpty(submitter))
            throw new ArgumentException("Campus sign-in is required.");

        var reason = (request.Reason ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(reason))
            throw new ArgumentException("Please provide a reason for this change.");
        if (reason.Length > 500)
            throw new ArgumentException("Reason must be 500 characters or fewer.");

        var kind = EmployeeAttendanceChangeRequestKinds.RequireKind(request.RequestKind);
        if (kind == EmployeeAttendanceChangeRequestKinds.MarkPresent)
            return await SubmitMarkPresentAsync(request, reason, submitter, submitterUserId, cancellationToken);

        return await SubmitChangeAsync(request, reason, submitter, submitterUserId, cancellationToken);
    }

    private async Task<EmployeeAttendanceChangeRequestSubmitResultDto> SubmitChangeAsync(
        SubmitEmployeeAttendanceChangeRequestDto request,
        string reason,
        string submitter,
        int? submitterUserId,
        CancellationToken cancellationToken)
    {
        if (request.EmployeeAttendanceId <= 0)
            throw new ArgumentException("Attendance record is required.");

        var attendance = await _context.EmployeeAttendances
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ID == request.EmployeeAttendanceId, cancellationToken)
            ?? throw new KeyNotFoundException("Attendance record was not found.");

        if (!attendance.EmpID.HasValue || !attendance.Date.HasValue)
            throw new InvalidOperationException("Attendance record is incomplete.");

        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.ID == attendance.EmpID.Value, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var currentIn = NormalizeTimeText(attendance.Time);
        var currentOut = FormatCheckOutTime(attendance.CheckOutTime);
        var proposedIn = NormalizeTimeText(request.ProposedCheckInTime);
        var proposedOut = string.IsNullOrWhiteSpace(request.ProposedCheckOutTime)
            ? null
            : NormalizeTimeText(request.ProposedCheckOutTime);

        if (string.IsNullOrWhiteSpace(proposedIn))
            throw new ArgumentException("Check-in time is required.");

        if (string.Equals(currentIn, proposedIn, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(currentOut ?? string.Empty, proposedOut ?? string.Empty, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Change at least one time from the current values.");
        }

        var hasPending = await _context.EmployeeAttendanceChangeRequests
            .AnyAsync(
                x => x.EmployeeAttendanceId == attendance.ID
                     && x.Status == EmployeeAttendanceChangeRequestStatuses.Pending,
                cancellationToken);

        if (hasPending)
            throw new InvalidOperationException("A change request for this attendance is already awaiting approval.");

        var attendanceDate = DateOnly.FromDateTime(attendance.Date.Value.Date);
        var entity = new EmployeeAttendanceChangeRequest
        {
            EmployeeAttendanceId = attendance.ID,
            EmployeeId = employee.ID,
            AttendanceDate = attendanceDate,
            RequestKind = EmployeeAttendanceChangeRequestKinds.Change,
            ProposedCheckInTime = proposedIn,
            ProposedCheckOutTime = proposedOut,
            Reason = reason,
            Status = EmployeeAttendanceChangeRequestStatuses.Pending,
            SubmittedAtPkt = PakistanTime.Now,
            SubmittedByUserKey = submitter,
        };

        _context.EmployeeAttendanceChangeRequests.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var employeeName = FormatEmployeeName(employee);
        await WriteSubmittedActivityLogAsync(
            entity,
            employeeName,
            submitterUserId,
            attendance.ID,
            currentIn,
            currentOut,
            proposedIn,
            proposedOut,
            reason,
            submitter,
            cancellationToken);

        await PublishSubmittedNotificationAsync(
            entity,
            employeeName,
            attendanceDate,
            submitter,
            isMarkPresent: false,
            cancellationToken);

        return new EmployeeAttendanceChangeRequestSubmitResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    private async Task<EmployeeAttendanceChangeRequestSubmitResultDto> SubmitMarkPresentAsync(
        SubmitEmployeeAttendanceChangeRequestDto request,
        string reason,
        string submitter,
        int? submitterUserId,
        CancellationToken cancellationToken)
    {
        if (request.EmployeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (!request.AttendanceDate.HasValue)
            throw new ArgumentException("Attendance date is required.");

        var attendanceDate = request.AttendanceDate.Value;
        var targetDate = attendanceDate.ToDateTime(TimeOnly.MinValue);

        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.ID == request.EmployeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var proposedIn = NormalizeTimeText(request.ProposedCheckInTime);
        var proposedOut = string.IsNullOrWhiteSpace(request.ProposedCheckOutTime)
            ? null
            : NormalizeTimeText(request.ProposedCheckOutTime);

        if (string.IsNullOrWhiteSpace(proposedIn))
            throw new ArgumentException("Check-in time is required.");

        await EnsureNoCheckInForDateAsync(employee.ID, targetDate, cancellationToken);

        var hasPending = await _context.EmployeeAttendanceChangeRequests
            .AnyAsync(
                x => x.EmployeeId == employee.ID
                     && x.AttendanceDate == attendanceDate
                     && x.Status == EmployeeAttendanceChangeRequestStatuses.Pending,
                cancellationToken);

        if (hasPending)
            throw new InvalidOperationException("A change request for this employee on this date is already awaiting approval.");

        var entity = new EmployeeAttendanceChangeRequest
        {
            EmployeeAttendanceId = null,
            EmployeeId = employee.ID,
            AttendanceDate = attendanceDate,
            RequestKind = EmployeeAttendanceChangeRequestKinds.MarkPresent,
            ProposedCheckInTime = proposedIn,
            ProposedCheckOutTime = proposedOut,
            Reason = reason,
            Status = EmployeeAttendanceChangeRequestStatuses.Pending,
            SubmittedAtPkt = PakistanTime.Now,
            SubmittedByUserKey = submitter,
        };

        _context.EmployeeAttendanceChangeRequests.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var employeeName = FormatEmployeeName(employee);
        await WriteSubmittedActivityLogAsync(
            entity,
            employeeName,
            submitterUserId,
            null,
            null,
            null,
            proposedIn,
            proposedOut,
            reason,
            submitter,
            cancellationToken);

        await PublishSubmittedNotificationAsync(
            entity,
            employeeName,
            attendanceDate,
            submitter,
            isMarkPresent: true,
            cancellationToken);

        return new EmployeeAttendanceChangeRequestSubmitResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    public async Task<EmployeeAttendanceChangeRequestListDto> ListAsync(
        DateOnly? date,
        string? status,
        string? submitterUserKey,
        bool restrictToSubmitter,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = string.IsNullOrWhiteSpace(status)
            ? string.Empty
            : EmployeeAttendanceChangeRequestStatuses.RequireFilter(status);

        var query =
            from req in _context.EmployeeAttendanceChangeRequests.AsNoTracking()
            join attendance in _context.EmployeeAttendances.AsNoTracking()
                on req.EmployeeAttendanceId equals attendance.ID into attendanceJoin
            from attendance in attendanceJoin.DefaultIfEmpty()
            join employee in _context.Employees.AsNoTracking()
                on req.EmployeeId equals employee.ID
            select new { req, attendance, employee };

        if (date.HasValue)
            query = query.Where(x => x.req.AttendanceDate == date.Value);

        if (!string.IsNullOrEmpty(normalizedStatus))
            query = query.Where(x => x.req.Status == normalizedStatus);

        if (restrictToSubmitter)
        {
            var key = (submitterUserKey ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(key))
                return new EmployeeAttendanceChangeRequestListDto();

            query = query.Where(x => x.req.SubmittedByUserKey == key);
        }

        var rows = await query
            .OrderByDescending(x => x.req.SubmittedAtPkt)
            .ThenByDescending(x => x.req.Id)
            .Select(x => new EmployeeAttendanceChangeRequestListItemDto
            {
                Id = x.req.Id,
                EmployeeAttendanceId = x.req.EmployeeAttendanceId,
                EmployeeId = x.req.EmployeeId,
                RequestKind = x.req.RequestKind,
                EmployeeName = x.employee.EmployeeName ?? string.Empty,
                AttendanceDate = x.req.AttendanceDate,
                CurrentCheckInTime = x.attendance != null ? x.attendance.Time : null,
                CurrentCheckOutTime = x.attendance != null && x.attendance.CheckOutTime.HasValue
                    ? x.attendance.CheckOutTime.Value.ToString("HH:mm")
                    : null,
                ProposedCheckInTime = x.req.ProposedCheckInTime,
                ProposedCheckOutTime = x.req.ProposedCheckOutTime,
                Reason = x.req.Reason,
                Status = x.req.Status,
                SubmittedAtPkt = x.req.SubmittedAtPkt,
                SubmittedByUserKey = x.req.SubmittedByUserKey,
                ReviewedAtPkt = x.req.ReviewedAtPkt,
                ReviewedByUserKey = x.req.ReviewedByUserKey,
                ReviewNote = x.req.ReviewNote,
            })
            .ToListAsync(cancellationToken);

        foreach (var row in rows)
        {
            row.CurrentCheckInTime = NormalizeTimeText(row.CurrentCheckInTime);
            row.StatusLabel = EmployeeAttendanceChangeRequestStatuses.Label(row.Status);
            row.RequestKindLabel = EmployeeAttendanceChangeRequestKinds.Label(row.RequestKind);
        }

        return new EmployeeAttendanceChangeRequestListDto { Items = rows };
    }

    public async Task<EmployeeAttendanceChangeRequestDecisionResultDto> ApproveAsync(
        int id,
        string reviewerUserKey,
        int? reviewerUserId,
        CancellationToken cancellationToken = default)
    {
        var reviewer = string.IsNullOrWhiteSpace(reviewerUserKey) ? null : reviewerUserKey.Trim();
        if (string.IsNullOrEmpty(reviewer))
            throw new ArgumentException("Reviewer identity is required.");

        var entity = await _context.EmployeeAttendanceChangeRequests
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Change request was not found.");

        if (!entity.Status.Equals(EmployeeAttendanceChangeRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("This request has already been reviewed.");

        var kind = EmployeeAttendanceChangeRequestKinds.RequireKind(entity.RequestKind);
        if (kind == EmployeeAttendanceChangeRequestKinds.MarkPresent)
        {
            var markResult = await _employeeAttendanceService.MarkPresentAsync(
                new MarkEmployeePresentRequestDto
                {
                    EmployeeId = entity.EmployeeId,
                    Date = entity.AttendanceDate.ToDateTime(TimeOnly.MinValue),
                    CheckInTime = entity.ProposedCheckInTime ?? string.Empty,
                    CheckOutTime = entity.ProposedCheckOutTime,
                },
                reviewerUserId,
                cancellationToken);

            entity.EmployeeAttendanceId = markResult.AttendanceId;
        }
        else
        {
            if (!entity.EmployeeAttendanceId.HasValue || entity.EmployeeAttendanceId.Value <= 0)
                throw new InvalidOperationException("Attendance record is missing for this request.");

            var editRequest = new EditEmployeeAttendanceRequestDto
            {
                CheckInTime = entity.ProposedCheckInTime,
                CheckOutTime = entity.ProposedCheckOutTime,
            };

            await _employeeAttendanceService.EditAttendanceAsync(
                entity.EmployeeAttendanceId.Value,
                editRequest,
                reviewerUserId,
                cancellationToken);
        }

        entity.Status = EmployeeAttendanceChangeRequestStatuses.Approved;
        entity.ReviewedAtPkt = PakistanTime.Now;
        entity.ReviewedByUserKey = reviewer;
        await _context.SaveChangesAsync(cancellationToken);

        var employeeName = await _context.Employees.AsNoTracking()
            .Where(e => e.ID == entity.EmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceChangeRequestApproved,
            ActivityLogEntityTypes.EmployeeAttendanceChangeRequest,
            entity.Id,
            employeeName,
            reviewerUserId,
            new
            {
                requestId = entity.Id,
                attendanceId = entity.EmployeeAttendanceId,
                employeeId = entity.EmployeeId,
                requestKind = entity.RequestKind,
                reviewedBy = reviewer,
            },
            cancellationToken);

        return new EmployeeAttendanceChangeRequestDecisionResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    public async Task<EmployeeAttendanceChangeRequestDecisionResultDto> RejectAsync(
        int id,
        string reviewerUserKey,
        int? reviewerUserId,
        EmployeeAttendanceChangeRequestDecisionRequestDto? request,
        CancellationToken cancellationToken = default)
    {
        var reviewer = string.IsNullOrWhiteSpace(reviewerUserKey) ? null : reviewerUserKey.Trim();
        if (string.IsNullOrEmpty(reviewer))
            throw new ArgumentException("Reviewer identity is required.");

        var entity = await _context.EmployeeAttendanceChangeRequests
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Change request was not found.");

        if (!entity.Status.Equals(EmployeeAttendanceChangeRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("This request has already been reviewed.");

        var note = request?.ReviewNote?.Trim();
        if (note?.Length > 500)
            throw new ArgumentException("Note must be 500 characters or fewer.");

        entity.Status = EmployeeAttendanceChangeRequestStatuses.Rejected;
        entity.ReviewedAtPkt = PakistanTime.Now;
        entity.ReviewedByUserKey = reviewer;
        entity.ReviewNote = string.IsNullOrEmpty(note) ? null : note;
        await _context.SaveChangesAsync(cancellationToken);

        var employeeName = await _context.Employees.AsNoTracking()
            .Where(e => e.ID == entity.EmployeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceChangeRequestRejected,
            ActivityLogEntityTypes.EmployeeAttendanceChangeRequest,
            entity.Id,
            employeeName,
            reviewerUserId,
            new
            {
                requestId = entity.Id,
                attendanceId = entity.EmployeeAttendanceId,
                employeeId = entity.EmployeeId,
                requestKind = entity.RequestKind,
                reviewedBy = reviewer,
                reviewNote = entity.ReviewNote,
            },
            cancellationToken);

        return new EmployeeAttendanceChangeRequestDecisionResultDto
        {
            Id = entity.Id,
            Status = entity.Status,
        };
    }

    private async Task EnsureNoCheckInForDateAsync(
        int employeeId,
        DateTime targetDate,
        CancellationToken cancellationToken)
    {
        var dayEnd = targetDate.AddDays(1);
        var row = await _context.EmployeeAttendances
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.EmpID == employeeId
                     && a.Date.HasValue
                     && a.Date.Value >= targetDate
                     && a.Date.Value < dayEnd,
                cancellationToken);

        if (row != null && !string.IsNullOrWhiteSpace(row.Time))
            throw new InvalidOperationException("Attendance already has a check-in. Use edit instead.");
    }

    private static string FormatEmployeeName(Employee employee) =>
        string.IsNullOrWhiteSpace(employee.EmployeeName)
            ? $"#{employee.ID}"
            : employee.EmployeeName.Trim();

    private async Task WriteSubmittedActivityLogAsync(
        EmployeeAttendanceChangeRequest entity,
        string employeeName,
        int? submitterUserId,
        int? attendanceId,
        string? currentIn,
        string? currentOut,
        string? proposedIn,
        string? proposedOut,
        string reason,
        string submitter,
        CancellationToken cancellationToken)
    {
        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceChangeRequestSubmitted,
            ActivityLogEntityTypes.EmployeeAttendanceChangeRequest,
            entity.Id,
            employeeName,
            submitterUserId,
            new
            {
                requestId = entity.Id,
                requestKind = entity.RequestKind,
                attendanceId,
                employeeId = entity.EmployeeId,
                date = entity.AttendanceDate.ToString("yyyy-MM-dd"),
                currentCheckIn = currentIn,
                currentCheckOut = currentOut,
                proposedCheckIn = proposedIn,
                proposedCheckOut = proposedOut,
                reason,
                submittedBy = submitter,
            },
            cancellationToken);
    }

    private async Task PublishSubmittedNotificationAsync(
        EmployeeAttendanceChangeRequest entity,
        string employeeName,
        DateOnly attendanceDate,
        string submitter,
        bool isMarkPresent,
        CancellationToken cancellationToken)
    {
        var dateIso = attendanceDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var notificationLink =
            $"/campus/employee-attendance/manage?autoReviewRequestId={entity.Id}&date={dateIso}";

        var title = isMarkPresent ? "Mark present request" : "Attendance change request";
        var body = isMarkPresent
            ? $"{employeeName} — mark present for {dateIso}."
            : $"{employeeName} — check-in/out change for {dateIso}.";

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.EmployeeAttendanceChangeRequest,
                title,
                body,
                notificationLink,
                CampusNotificationSeverities.Info,
                ["edit_emp_attendance"],
                submitter),
            cancellationToken);
    }

    private static string? FormatCheckOutTime(DateTime? checkOutTime) =>
        checkOutTime.HasValue ? checkOutTime.Value.ToString("HH:mm") : null;

    private static string? NormalizeTimeText(string? timeText)
    {
        if (string.IsNullOrWhiteSpace(timeText))
            return null;

        if (!TryParseTimeOfDay(timeText, out var time))
            throw new ArgumentException("Invalid time. Use HH:mm.");

        return $"{time.Hours:D2}:{time.Minutes:D2}";
    }

    private static bool TryParseTimeOfDay(string text, out TimeSpan time)
    {
        time = default;
        var trimmed = text.Trim();
        if (TimeSpan.TryParse(trimmed, out time))
            return true;

        if (DateTime.TryParse(trimmed, out var dt))
        {
            time = dt.TimeOfDay;
            return true;
        }

        return false;
    }
}

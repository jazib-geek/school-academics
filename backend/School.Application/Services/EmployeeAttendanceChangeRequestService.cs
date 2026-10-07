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
            ProposedCheckInTime = proposedIn,
            ProposedCheckOutTime = proposedOut,
            Reason = reason,
            Status = EmployeeAttendanceChangeRequestStatuses.Pending,
            SubmittedAtPkt = PakistanTime.Now,
            SubmittedByUserKey = submitter,
        };

        _context.EmployeeAttendanceChangeRequests.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var employeeName = string.IsNullOrWhiteSpace(employee.EmployeeName)
            ? $"#{employee.ID}"
            : employee.EmployeeName.Trim();

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceChangeRequestSubmitted,
            ActivityLogEntityTypes.EmployeeAttendanceChangeRequest,
            entity.Id,
            employeeName,
            submitterUserId,
            new
            {
                requestId = entity.Id,
                attendanceId = attendance.ID,
                employeeId = employee.ID,
                date = attendanceDate.ToString("yyyy-MM-dd"),
                currentCheckIn = currentIn,
                currentCheckOut = currentOut,
                proposedCheckIn = proposedIn,
                proposedCheckOut = proposedOut,
                reason,
                submittedBy = submitter,
            },
            cancellationToken);

        var dateIso = attendanceDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var notificationLink =
            $"/campus/employee-attendance/manage?autoReviewRequestId={entity.Id}&date={dateIso}";

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.EmployeeAttendanceChangeRequest,
                "Attendance change request",
                $"{employeeName} — check-in/out change for {dateIso}.",
                notificationLink,
                CampusNotificationSeverities.Info,
                ["edit_emp_attendance"],
                submitter),
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
                on req.EmployeeAttendanceId equals attendance.ID
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
                EmployeeName = x.employee.EmployeeName ?? string.Empty,
                AttendanceDate = x.req.AttendanceDate,
                CurrentCheckInTime = x.attendance.Time,
                CurrentCheckOutTime = x.attendance.CheckOutTime.HasValue
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

        var editRequest = new EditEmployeeAttendanceRequestDto
        {
            CheckInTime = entity.ProposedCheckInTime,
            CheckOutTime = entity.ProposedCheckOutTime,
        };

        await _employeeAttendanceService.EditAttendanceAsync(
            entity.EmployeeAttendanceId,
            editRequest,
            reviewerUserId,
            cancellationToken);

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

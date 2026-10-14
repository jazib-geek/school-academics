using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class StudentShortLeaveService : IStudentShortLeaveService
{
    private static readonly HashSet<string> Relations = new(StringComparer.OrdinalIgnoreCase)
    {
        "Father", "Mother", "Guardian", "Auto-Driver", "Other",
        "Brother", "Sister", "Uncle", "Aunt", "Grandfather", "Grandmother", "Cousin"
    };

    private readonly AppDbContext _context;
    private readonly IAttendanceService _attendance;

    public StudentShortLeaveService(AppDbContext context, IAttendanceService attendance)
    {
        _context = context;
        _attendance = attendance;
    }

    public async Task<List<StudentShortLeaveDto>> ListAsync(
        DateOnly? date,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        CancellationToken cancellationToken = default)
    {
        var today = PakistanTime.Today;
        var from = date ?? dateFrom ?? today;
        var to = date.HasValue ? date.Value : (dateTo ?? from);
        if (to < from)
            throw new ArgumentException("The end date must be on or after the start date.");
        if (to.DayNumber - from.DayNumber > 366)
            throw new ArgumentException("Choose a shorter date range.");

        var rows = await Query()
            .Where(x => x.LeaveDate >= from && x.LeaveDate <= to)
            .OrderByDescending(x => x.LeaveDate)
            .ThenByDescending(x => x.CreatedAtPkt)
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<StudentShortLeaveDto> GetAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await Query().FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Short leave pass was not found.");

        return Map(row);
    }

    public async Task<StudentShortLeaveDto> CreateAsync(
        CreateStudentShortLeaveRequestDto request,
        string approvedByUserName,
        CancellationToken cancellationToken = default)
    {
        var studentIds = (request.StudentIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        if (studentIds.Count == 0)
            throw new ArgumentException("Select at least one student.");

        var pickupName = (request.PickupPersonName ?? string.Empty).Trim();
        if (pickupName.Length < 2)
            throw new ArgumentException("Enter the name of the person collecting the student.");
        if (pickupName.Length > 120)
            throw new ArgumentException("Collector name is too long.");

        var relation = Relations.FirstOrDefault(x => x.Equals(request.PickupRelation?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("Choose who came to collect the student.");

        var reason = (request.Reason ?? string.Empty).Trim();
        if (reason.Length < 3)
            throw new ArgumentException("Enter the reason for leaving early.");
        if (reason.Length > 500)
            throw new ArgumentException("Reason is too long.");

        if (!TimeOnly.TryParse(request.PickupTime, out var pickupTime))
            throw new ArgumentException("Enter the pickup time.");

        var now = PakistanTime.Now;
        var today = DateOnly.FromDateTime(now);
        if (pickupTime > TimeOnly.FromDateTime(now))
            throw new ArgumentException("Pickup time cannot be later than now.");

        var phoneRequired = request.PhoneConfirmationRequired || relation.Equals("Other", StringComparison.OrdinalIgnoreCase);
        var confirmedWith = (request.PhoneConfirmedWith ?? string.Empty).Trim();
        if (phoneRequired)
        {
            if (confirmedWith.Length < 2)
                throw new ArgumentException("Enter who was called at home to confirm this pickup.");
            if (!request.PhoneCallApproved)
                throw new ArgumentException("Confirm that the call approved this pickup.");
        }
        else
        {
            confirmedWith = string.Empty;
        }

        if (string.IsNullOrWhiteSpace(approvedByUserName))
            throw new UnauthorizedAccessException("Campus sign-in is required.");

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => studentIds.Contains(x.Reg_Id))
            .Select(x => new { x.Reg_Id, x.FullName, x.ClassCompositeID, x.IsActive })
            .ToListAsync(cancellationToken);

        if (students.Count != studentIds.Count)
            throw new ArgumentException("One or more students could not be found.");

        var inactive = students.Where(x => x.IsActive != true).Select(x => x.FullName).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
        if (inactive.Count > 0)
            throw new ArgumentException($"{string.Join(", ", inactive)} is not an active student.");

        if (students.Any(x => !x.ClassCompositeID.HasValue))
            throw new InvalidOperationException("Student class is not set.");

        var existing = await _context.StudentShortLeaveStudents
            .AsNoTracking()
            .Where(x => x.LeaveDate == today && studentIds.Contains(x.StudentId))
            .Select(x => new { x.StudentId, x.ShortLeaveId, x.Student.FullName })
            .ToListAsync(cancellationToken);

        if (existing.Count > 0)
        {
            var names = string.Join(", ", existing.Select(x => x.FullName).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct());
            var passIds = existing.Select(x => x.ShortLeaveId).Distinct().ToList();
            throw new ShortLeaveAlreadyIssuedException(
                $"{(string.IsNullOrWhiteSpace(names) ? "This student" : names)} already has a short leave pass today.",
                passIds);
        }

        var pass = new StudentShortLeave
        {
            LeaveDate = today,
            PickupPersonName = pickupName,
            PickupRelation = relation,
            Reason = reason,
            PickupTime = pickupTime,
            PhoneConfirmationRequired = phoneRequired,
            PhoneConfirmedWith = phoneRequired ? confirmedWith : null,
            PhoneCallApproved = phoneRequired && request.PhoneCallApproved,
            ApprovedByUserName = approvedByUserName.Trim(),
            CreatedAtPkt = now,
            Students = studentIds.Select(id => new StudentShortLeaveStudent
            {
                StudentId = id,
                LeaveDate = today
            }).ToList()
        };

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        _context.StudentShortLeaves.Add(pass);
        await _context.SaveChangesAsync(cancellationToken);

        var attendanceDate = today.ToDateTime(TimeOnly.MinValue);
        foreach (var studentId in studentIds)
        {
            await _attendance.SetStudentStatusForDateAsync(studentId, attendanceDate, StudentAttendanceStatuses.ShortLeave);
        }

        await tx.CommitAsync(cancellationToken);
        return await GetAsync(pass.Id, cancellationToken);
    }

    private IQueryable<StudentShortLeave> Query() =>
        _context.StudentShortLeaves
            .AsNoTracking()
            .Include(x => x.Students)
            .ThenInclude(x => x.Student)
            .ThenInclude(x => x!.Section);

    private static StudentShortLeaveDto Map(StudentShortLeave row) => new()
    {
        Id = row.Id,
        LeaveDate = row.LeaveDate,
        PickupPersonName = row.PickupPersonName,
        PickupRelation = row.PickupRelation,
        Reason = row.Reason,
        PickupTime = row.PickupTime.ToString("HH:mm"),
        PhoneConfirmationRequired = row.PhoneConfirmationRequired,
        PhoneConfirmedWith = row.PhoneConfirmedWith,
        PhoneCallApproved = row.PhoneCallApproved,
        ApprovedByUserName = row.ApprovedByUserName,
        CreatedAtPkt = row.CreatedAtPkt,
        Students = row.Students
            .OrderBy(x => x.Student?.FullName)
            .Select(x => new StudentShortLeaveStudentDto
            {
                StudentId = x.StudentId,
                StudentName = string.IsNullOrWhiteSpace(x.Student?.FullName) ? "Student" : x.Student!.FullName!,
                ClassName = FormatClass(x.Student?.Section?.ClassName, x.Student?.Section?.SectionName)
            })
            .ToList()
    };

    private static string FormatClass(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(cn)) return string.IsNullOrEmpty(sn) ? "—" : sn;
        if (string.IsNullOrEmpty(sn) || cn.Equals(sn, StringComparison.OrdinalIgnoreCase) || cn.Contains(sn, StringComparison.OrdinalIgnoreCase))
            return cn;
        return $"{cn} - {sn}";
    }
}

public class ShortLeaveAlreadyIssuedException : InvalidOperationException
{
    public ShortLeaveAlreadyIssuedException(string message, IReadOnlyList<int> existingPassIds)
        : base(message)
    {
        ExistingPassIds = existingPassIds;
    }

    public IReadOnlyList<int> ExistingPassIds { get; }
}

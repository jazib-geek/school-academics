using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class StudentFeeIncrementService(AppDbContext context)
{
    public async Task<bool> CanAccessAsync(int userId, CancellationToken ct)
    {
        var user = await context.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId && x.IsActive == true, ct);
        return user != null && (user.IsSuperAdmin || await context.UserRights.AsNoTracking()
            .AnyAsync(x => x.UserName == user.Username && x.ModuleCode == "update_fee" && x.HasAccess == true, ct));
    }

    public async Task<List<StudentFeeIncrementRowDto>> GetRowsAsync(int? classId, CancellationToken ct,
        string registrationDateMode = "all", DateOnly? registrationDate = null)
    {
        if (registrationDateMode is not ("all" or "before" or "after"))
            throw new ArgumentException("Choose All, Before or After for registration date.");
        if (registrationDateMode != "all" && registrationDate == null)
            throw new ArgumentException("Registration date is required for Before or After.");
        var query = context.Students.AsNoTracking().Where(x => x.IsActive == true);
        if (classId.HasValue) query = query.Where(x => x.ClassCompositeID == classId);
        if (registrationDateMode != "all")
        {
            var date = registrationDate!.Value.ToDateTime(TimeOnly.MinValue);
            // Compare calendar dates: exclude the entire selected day and missing registration dates.
            query = registrationDateMode == "before"
                ? query.Where(x => x.RegDate.HasValue && x.RegDate.Value.Date < date)
                : query.Where(x => x.RegDate.HasValue && x.RegDate.Value.Date > date);
        }
        var rows = await query.OrderBy(x => x.ClassCompositeID).ThenBy(x => x.Reg_Id)
            .Select(x => new StudentFeeIncrementRowDto
            {
                RegId = x.Reg_Id, FullName = x.FullName, ClassCompositeId = x.ClassCompositeID,
                ClassName = x.Section == null ? null : x.Section.ClassName,
                TotalFee = x.Fee, TuitionFee = x.TutionFee, Concession = x.FeeConcession
            }).ToListAsync(ct);
        if (rows.Count == 0) return rows;

        var now = PakistanTime.Now;
        var cutoff = now.AddDays(-7);
        var studentIds = rows.Select(x => x.RegId).ToArray();
        var logs = await context.ActivityLogs.AsNoTracking()
            .Where(x => x.ActivityType == ActivityLogTypes.StudentFeeUpdate &&
                x.EntityType == ActivityLogEntityTypes.Student && x.EntityId.HasValue &&
                studentIds.Contains(x.EntityId.Value) && x.OccurredAtPkt >= cutoff && x.OccurredAtPkt <= now)
            .OrderByDescending(x => x.OccurredAtPkt).ThenByDescending(x => x.ID)
            .Select(x => new { x.EntityId, x.OccurredAtPkt, x.DetailsJson }).ToListAsync(ct);
        var latest = logs.GroupBy(x => x.EntityId!.Value).ToDictionary(x => x.Key, x => x.First());
        foreach (var row in rows)
        {
            if (!latest.TryGetValue(row.RegId, out var log)) continue;
            row.RecentFeeUpdateAtPkt = log.OccurredAtPkt;
            row.RecentFeeUpdateDaysAgo = (now.Date - log.OccurredAtPkt.Date).Days;
            // Older/manual updates are still useful warnings, but must not be called increments.
            try
            {
                using var details = JsonDocument.Parse(log.DetailsJson ?? "{}");
                row.RecentFeeUpdateWasIncrement = details.RootElement.ValueKind == JsonValueKind.Object &&
                    details.RootElement.TryGetProperty("source", out var source) &&
                    source.ValueKind == JsonValueKind.String && source.GetString() == "fee-increment";
            }
            catch (JsonException) { /* A legacy log still warrants a generic fee-update warning. */ }
        }
        return rows;
    }

    // Relative day labels can change at midnight without changing the reviewed fees.
    private static string Snapshot(List<StudentFeeIncrementRowDto> rows) => JsonSerializer.Serialize(rows.Select(x => new
    {
        x.RegId, x.FullName, x.ClassCompositeId, x.ClassName, x.TotalFee, x.TuitionFee, x.Concession,
        x.NewTotalFee, x.NewTuitionFee, x.NewConcession, x.Error,
        x.RecentFeeUpdateAtPkt, x.RecentFeeUpdateWasIncrement
    }));

    public async Task<List<StudentFeeIncrementRowDto>> PreviewAsync(StudentFeeIncrementRequestDto request, CancellationToken ct)
    {
        if (request.Scope != "class" && request.Scope != "school")
            throw new ArgumentException("Choose class or entire school.");
        if (request.TuitionIncrement <= 0 || request.TuitionIncrement > int.MaxValue ||
            decimal.Truncate(request.TuitionIncrement) != request.TuitionIncrement)
            throw new ArgumentException("Enter a positive whole-number tuition increment.");
        if (request.NewTotalFee is null or < 0)
            throw new ArgumentException("Enter a nonnegative whole-number New Total Fee.");
        if (request.Scope == "class" && (request.ClassCompositeId is not > 0 || request.StudentIds == null || request.StudentIds.Count == 0))
            throw new ArgumentException("Choose a class and at least one student.");
        if (request.Scope == "school" && (request.ClassCompositeId != null || request.StudentIds?.Count > 0))
            throw new ArgumentException("Entire school includes all active students in this campus.");

        var rows = await GetRowsAsync(request.Scope == "class" ? request.ClassCompositeId : null, ct,
            request.RegistrationDateMode, request.RegistrationDate);
        if (request.Scope == "class")
        {
            var ids = request.StudentIds!.ToHashSet();
            rows = rows.Where(x => ids.Contains(x.RegId)).ToList();
            if (rows.Count != ids.Count)
                throw new InvalidOperationException("The selection has changed. Reload the active students and preview again.");
        }
        if (rows.Count == 0) throw new ArgumentException("No active students selected.");
        foreach (var row in rows)
        {
            if (row.TotalFee == null || row.TuitionFee == null)
                row.Error = "Missing total or tuition fee. Correct this student's fees first.";
            else if (row.TotalFee < 0 || row.TuitionFee < 0)
                row.Error = "Existing fees cannot be negative.";
            else
            {
                row.NewTotalFee = request.NewTotalFee.Value;
                row.NewTuitionFee = row.TuitionFee + request.TuitionIncrement;
                row.NewConcession = row.NewTotalFee - row.NewTuitionFee;
                if (row.NewConcession < 0) row.Error = "New tuition exceeds new total fee.";
            }
        }
        return rows;
    }

    public async Task<int> ApplyAsync(StudentFeeIncrementRequestDto request,
        List<StudentFeeIncrementRowDto> reviewed, int userId, string operationId, CancellationToken ct)
    {
        // Keep the eligibility/fee check and writes in one serializable transaction.
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var current = await PreviewAsync(request, ct);
        if (current.Any(x => x.Error != null) || Snapshot(current) != Snapshot(reviewed))
            throw new InvalidOperationException("Student details or fees changed after preview. Create a fresh preview before applying.");

        var ids = current.Select(x => x.RegId).ToArray();
        var students = await context.Students.Where(x => ids.Contains(x.Reg_Id)).ToDictionaryAsync(x => x.Reg_Id, ct);
        var userName = await context.Users.Where(x => x.ID == userId).Select(x => x.Username).FirstOrDefaultAsync(ct);
        foreach (var row in current)
        {
            var student = students[row.RegId];
            student.Fee = row.NewTotalFee;
            student.TutionFee = row.NewTuitionFee;
            student.FeeConcession = row.NewConcession;
            context.ActivityLogs.Add(new ActivityLog
            {
                ActivityType = ActivityLogTypes.StudentFeeUpdate,
                EntityType = ActivityLogEntityTypes.Student, EntityId = row.RegId, EntityLabel = row.FullName,
                UserId = userId, UserName = userName, OccurredAtPkt = PakistanTime.Now,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    source = "fee-increment", operationId, request.Scope, request.NewTotalFee, request.TuitionIncrement,
                    request.RegistrationDateMode, request.RegistrationDate,
                    before = new { classFee = row.TotalFee, tuitionFee = row.TuitionFee, feeConcession = row.Concession },
                    after = new { classFee = row.NewTotalFee, tuitionFee = row.NewTuitionFee, feeConcession = row.NewConcession },
                    changes = new[]
                    {
                        new { field = "classFee", old = (decimal?)row.TotalFee, @new = (decimal?)row.NewTotalFee },
                        new { field = "tuitionFee", old = row.TuitionFee, @new = row.NewTuitionFee },
                        new { field = "feeConcession", old = row.Concession, @new = row.NewConcession }
                    }
                })
            });
        }
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return current.Count;
    }
}

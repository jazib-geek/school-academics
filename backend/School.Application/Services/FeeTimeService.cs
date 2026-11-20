using System.Data;
using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class FeeTimeService(AppDbContext context)
{
    private static readonly Expression<Func<Student, FeeTimeRowDto>> Row = student => new FeeTimeRowDto
    {
        RegId = student.Reg_Id,
        FullName = student.FullName,
        FatherName = student.Family == null ? null : student.Family.FatherName,
        ClassName = student.Section == null ? null : student.Section.ClassName,
        FeeTime = student.FeeTime,
        UpdatedAt = student.FeeTimeUpdatedAtPkt
    };

    public async Task<bool> CanAccessAsync(int userId, CancellationToken ct)
    {
        var user = await context.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId && x.IsActive == true, ct);
        return user != null && (user.IsSuperAdmin || await context.UserRights.AsNoTracking()
            .AnyAsync(x => x.UserName == user.Username && x.ModuleCode == "fee_time" && x.HasAccess == true, ct));
    }

    public Task<List<FeeTimeRowDto>> ListAsync(CancellationToken ct) => context.Students.AsNoTracking()
        .Where(x => x.FeeTime != null && x.FeeTime != "")
        .OrderByDescending(x => x.FeeTimeUpdatedAtPkt).ThenBy(x => x.Reg_Id)
        .Select(Row).ToListAsync(ct);

    public Task<FeeTimeRowDto?> GetAsync(int regId, CancellationToken ct) => context.Students.AsNoTracking()
        .Where(x => x.Reg_Id == regId).Select(Row).FirstOrDefaultAsync(ct);

    public Task<List<FeeTimeRowDto>> SearchAsync(string term, string mode, CancellationToken ct)
    {
        var query = context.Students.AsNoTracking();
        if (mode == "reg")
        {
            if (!term.All(char.IsAsciiDigit) || !int.TryParse(term, out var regId) || regId <= 0)
                return Task.FromResult(new List<FeeTimeRowDto>());
            query = query.Where(x => x.Reg_Id == regId);
        }
        else
        {
            if (term.Length < 2) return Task.FromResult(new List<FeeTimeRowDto>());
            query = query.Where(x => x.FullName != null && x.FullName.Contains(term));
        }
        return query.OrderBy(x => x.FullName).ThenBy(x => x.Reg_Id).Take(20).Select(Row).ToListAsync(ct);
    }

    public async Task<FeeTimeRowDto?> SetAsync(int regId, string? feeTime, int userId, CancellationToken ct)
    {
        // Read the prior value and persist both the current state and audit in one transaction.
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var student = await context.Students.FirstOrDefaultAsync(x => x.Reg_Id == regId, ct);
        if (student == null) return null;

        if (!string.Equals(student.FeeTime, feeTime, StringComparison.Ordinal))
        {
            var previous = student.FeeTime;
            student.FeeTime = feeTime;
            student.FeeTimeUpdatedAtPkt = PakistanTime.Now;
            var userName = await context.Users.Where(x => x.ID == userId).Select(x => x.Username).FirstOrDefaultAsync(ct);
            context.ActivityLogs.Add(new ActivityLog
            {
                ActivityType = ActivityLogTypes.StudentFeeTimeUpdate,
                EntityType = ActivityLogEntityTypes.Student,
                EntityId = regId,
                EntityLabel = student.FullName,
                UserId = userId,
                UserName = userName,
                OccurredAtPkt = student.FeeTimeUpdatedAtPkt.Value,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    source = "fee-time",
                    action = feeTime == null ? "remove" : "save",
                    changes = new[] { new { field = "feeTime", old = previous, @new = feeTime } }
                })
            });
            await context.SaveChangesAsync(ct);
        }

        var result = await GetAsync(regId, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}

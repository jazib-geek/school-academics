using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class ActivityLogService : IActivityLogService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly AppDbContext _context;

    public ActivityLogService(AppDbContext context) => _context = context;

    public async Task WriteAsync(
        string activityType,
        string? entityType,
        int? entityId,
        string? entityLabel,
        int? userId,
        object? details,
        CancellationToken cancellationToken = default,
        string? performerDisplayName = null)
    {
        if (string.IsNullOrWhiteSpace(activityType))
            throw new ArgumentException("Activity type is required.", nameof(activityType));

        string? userName = null;
        if (userId is int uid and > 0)
        {
            userName = await _context.Users
                .AsNoTracking()
                .Where(u => u.ID == uid)
                .Select(u => u.Username)
                .FirstOrDefaultAsync(cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(performerDisplayName))
        {
            userName = performerDisplayName.Trim();
        }

        _context.ActivityLogs.Add(new ActivityLog
        {
            ActivityType = activityType.Trim(),
            EntityType = string.IsNullOrWhiteSpace(entityType) ? null : entityType.Trim(),
            EntityId = entityId,
            EntityLabel = string.IsNullOrWhiteSpace(entityLabel) ? null : entityLabel.Trim(),
            UserId = userId is > 0 ? userId : null,
            UserName = string.IsNullOrWhiteSpace(userName) ? null : userName.Trim(),
            OccurredAtPkt = PakistanTime.Now,
            DetailsJson = details is null ? null : JsonSerializer.Serialize(details, JsonOptions)
        });
    }

    public async Task<PagedResultDto<ActivityLogDto>> GetAsync(
        ActivityLogFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize switch
        {
            < 1 => 25,
            > 100 => 100,
            _ => filter.PageSize
        };

        var query = _context.ActivityLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.ActivityType))
        {
            var type = filter.ActivityType.Trim();
            query = query.Where(x => x.ActivityType == type);
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
        {
            var entityType = filter.EntityType.Trim();
            query = query.Where(x => x.EntityType == entityType);
        }

        if (filter.EntityId is int entityId and > 0)
            query = query.Where(x => x.EntityId == entityId);

        if (filter.UserId is int userId and > 0)
            query = query.Where(x => x.UserId == userId);

        if (filter.DateFrom is DateOnly dateFrom)
        {
            var from = dateFrom.ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.OccurredAtPkt >= from);
        }

        if (filter.DateTo is DateOnly dateTo)
        {
            var toExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.OccurredAtPkt < toExclusive);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.EntityLabel != null && x.EntityLabel.ToLower().Contains(term)) ||
                (x.UserName != null && x.UserName.ToLower().Contains(term)) ||
                (x.EntityId != null && x.EntityId.ToString()!.Contains(term)) ||
                (x.ActivityType != null && x.ActivityType.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.OccurredAtPkt)
            .ThenByDescending(x => x.ID)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ActivityLogDto
            {
                Id = x.ID,
                ActivityType = x.ActivityType,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                EntityLabel = x.EntityLabel,
                UserId = x.UserId,
                UserName = x.UserName,
                OccurredAtPkt = x.OccurredAtPkt,
                DetailsJson = x.DetailsJson
            })
            .ToListAsync(cancellationToken);

        return new PagedResultDto<ActivityLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<ActivityLogLookupDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        // Same source as User Management (`CampusUserService.GetUsersAsync`).
        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(x => x.Username)
            .ThenBy(x => x.ID)
            .Select(x => new ActivityLogUserOptionDto
            {
                Id = x.ID,
                Name = x.Username ?? $"User #{x.ID}"
            })
            .ToListAsync(cancellationToken);

        return new ActivityLogLookupDto
        {
            ActivityTypes =
            [
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentEdit, Label = "Student edit" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentBulkEdit, Label = "Student bulk edit" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentTransfer, Label = "Student transfer" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentFeeUpdate, Label = "Fee update" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentActivate, Label = "Student activate" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StudentDeactivate, Label = "Student deactivate" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeAttendanceEdit, Label = "Attendance edit" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeAttendanceMarkPresent, Label = "Attendance mark present" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeAttendanceMarkHoliday, Label = "Attendance mark holiday" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeAttendanceDelete, Label = "Attendance delete" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeAttendanceBackfill, Label = "Attendance backfill" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.FeeReceiptVoid, Label = "Fee receipt void" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.FeeReceiptEdit, Label = "Fee receipt edit" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StationeryPurchase, Label = "Stationery purchase" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.StationeryHandover, Label = "Stationery handover" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeSalaryComponentEdit, Label = "Salary adjustment edit" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.EmployeeSalaryComponentDelete, Label = "Salary adjustment delete" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.ClassDiaryReplace, Label = "Class diary replace" },
                new ActivityLogTypeOptionDto { Value = ActivityLogTypes.ClassDiaryDelete, Label = "Class diary delete" },
            ],
            Users = users
        };
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class ClassDiaryService : IClassDiaryService
{
    private const int MaxImagesPerClassDate = 2;
    private const long MaxTotalUploadBytes = 1_048_576;

    private readonly IClassDiaryRepository _repository;
    private readonly IObjectStorageService _objectStorage;
    private readonly ICampusNotificationService _notificationService;
    private readonly IActivityLogService _activityLogService;
    private readonly AppDbContext _context;
    private readonly ILogger<ClassDiaryService> _logger;

    public ClassDiaryService(
        IClassDiaryRepository repository,
        IObjectStorageService objectStorage,
        ICampusNotificationService notificationService,
        IActivityLogService activityLogService,
        AppDbContext context,
        ILogger<ClassDiaryService> logger)
    {
        _repository = repository;
        _objectStorage = objectStorage;
        _notificationService = notificationService;
        _activityLogService = activityLogService;
        _context = context;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ClassDiaryListingDto>> GetListingAsync(
        CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllWithClassAsync(cancellationToken);
        return entities
            .GroupBy(x => new { ClassId = x.ClassID!.Value, Date = x.Date!.Value })
            .Select(g => MapGroupToListing(g.Key.ClassId, g.Key.Date, g.ToList()))
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.ClassName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<IReadOnlyList<ClassDiaryListingDto>> GetByStudentIdAsync(
        int studentId,
        CancellationToken cancellationToken = default)
    {
        var classId = await _repository.GetClassIdForStudentAsync(studentId, cancellationToken);
        if (classId == null)
        {
            throw new ArgumentException("Student not found or has no class assigned.");
        }

        var entities = await _repository.GetByClassWithClassAsync(classId.Value, cancellationToken);
        return entities
            .GroupBy(x => new { ClassId = x.ClassID!.Value, Date = x.Date!.Value })
            .Select(g => MapGroupToListing(g.Key.ClassId, g.Key.Date, g.ToList()))
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.ClassName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<ClassDiaryDto> UploadDiaryAsync(
        int classId,
        DateOnly date,
        IReadOnlyList<ClassDiaryFileUpload> files,
        string? description,
        ClassDiaryUploadActorDto actor,
        bool notifyCampusUsers = false,
        int? actorEmployeeId = null,
        CancellationToken cancellationToken = default)
    {
        if (!PakistanTime.IsAllowedDiaryDate(date))
        {
            throw new ArgumentException("Diary date must be yesterday, today, or tomorrow (Pakistan time).");
        }

        if (files.Count is < 1 or > MaxImagesPerClassDate)
        {
            throw new ArgumentException($"Upload 1 or {MaxImagesPerClassDate} image files.");
        }

        var totalBytes = files.Sum(f => f.SizeBytes);
        if (totalBytes > MaxTotalUploadBytes)
        {
            throw new ArgumentException("Combined image size must be 1 MB or less. Reduce image size and try again.");
        }

        var className = await _repository.GetClassNameAsync(classId, cancellationToken);
        if (string.IsNullOrWhiteSpace(className))
        {
            throw new ArgumentException("Invalid class.");
        }

        foreach (var file in files)
        {
            if (string.IsNullOrWhiteSpace(file.ContentType) ||
                !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Only image files are allowed.");
            }
        }

        var existing = await _repository.GetByClassAndDateAsync(classId, date, cancellationToken);
        var previousUpdatedBy = existing.FirstOrDefault()?.LastUpdatedBy;
        var previousUpdatedAt = existing.FirstOrDefault()?.LastUpdatedAt;
        var isReplace = existing.Count > 0;

        foreach (var entry in existing)
        {
            await DeleteStoredImageOrThrowAsync(entry.ImgURL, cancellationToken);
        }

        if (isReplace)
        {
            _repository.RemoveRange(existing);
            await _repository.SaveChangesAsync(cancellationToken);
        }

        var uploadedKeys = new List<string>();
        var totalPages = files.Count;
        var pageIndex = 0;

        foreach (var file in files)
        {
            pageIndex++;
            var upload = await _objectStorage.UploadClassDiaryFileAsync(
                file.Content,
                file.FileName,
                file.ContentType,
                className,
                date,
                pageIndex,
                totalPages,
                cancellationToken);

            if (upload == null)
            {
                throw new InvalidOperationException(
                    "Object storage is not configured. Set Backblaze credentials in appsettings.");
            }

            uploadedKeys.Add(upload.Key);
        }

        var performedByName = string.IsNullOrWhiteSpace(actor.DisplayName) ? "Staff" : actor.DisplayName.Trim();
        var updatedAtPkt = PakistanTime.Now;
        var diaryDateKey = date.ToString("yyyy-MM-dd");

        var newRows = uploadedKeys.Select(key => new ClassDiary
        {
            ClassID = classId,
            SubjectID = null,
            Date = date,
            Description = description,
            ImgURL = key,
            LastUpdatedBy = performedByName,
            LastUpdatedAt = updatedAtPkt,
        }).ToList();

        await _repository.AddRangeAsync(newRows, cancellationToken);

        if (isReplace)
        {
            var entityLabel = $"{className} — {date:dd MMM yyyy}";
            int? campusUserId = string.Equals(actor.ActorSource, "campusUser", StringComparison.OrdinalIgnoreCase)
                ? actor.CampusUserId
                : null;

            await _activityLogService.WriteAsync(
                ActivityLogTypes.ClassDiaryReplace,
                ActivityLogEntityTypes.ClassDiary,
                classId,
                entityLabel,
                campusUserId,
                new
                {
                    diaryDate = diaryDateKey,
                    previousUpdatedBy,
                    previousUpdatedAt,
                    actorSource = actor.ActorSource,
                    employeeId = actor.EmployeeId,
                    performedByName,
                    pageCount = files.Count,
                },
                cancellationToken,
                string.Equals(actor.ActorSource, "employee", StringComparison.OrdinalIgnoreCase)
                    ? performedByName
                    : null);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        await EnforceRetentionAsync(classId, cancellationToken);

        var saved = await _repository.GetByClassAndDateAsync(classId, date, cancellationToken);
        var dto = MapGroupToDto(classId, date, saved, description);

        if (notifyCampusUsers)
        {
            var actorName = "Staff";
            if (actorEmployeeId is > 0)
            {
                actorName = await _repository.GetEmployeeNameAsync(actorEmployeeId.Value, cancellationToken)
                    ?? "Staff";
            }

            await _notificationService.PublishAsync(
                CampusNotificationFactory.Create(
                    CampusNotificationTypes.DiaryUpload,
                    "Diary uploaded",
                    $"{actorName} uploaded diary for {className} ({date:dd MMM yyyy}).",
                    "/campus/daily-diary/list",
                    CampusNotificationSeverities.Info,
                    ["view_daily_diary"]),
                cancellationToken);
        }

        return dto;
    }

    public async Task<IReadOnlyList<ClassDiaryUploadHistoryItemDto>> GetUploadHistoryAsync(
        int classId,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        if (classId <= 0)
            throw new ArgumentException("Invalid class.");

        var diaryDateKey = date.ToString("yyyy-MM-dd");
        var dateMarker = $"\"diaryDate\":\"{diaryDateKey}\"";

        var logs = await _context.ActivityLogs
            .AsNoTracking()
            .Where(x =>
                x.ActivityType == ActivityLogTypes.ClassDiaryReplace &&
                x.EntityType == ActivityLogEntityTypes.ClassDiary &&
                x.EntityId == classId &&
                x.DetailsJson != null &&
                x.DetailsJson.Contains(dateMarker))
            .OrderByDescending(x => x.OccurredAtPkt)
            .ThenByDescending(x => x.ID)
            .ToListAsync(cancellationToken);

        return logs.Select(MapReplaceLogToHistoryItem).ToList();
    }

    private static ClassDiaryUploadHistoryItemDto MapReplaceLogToHistoryItem(ActivityLog log)
    {
        string? previousUpdatedBy = null;
        DateTime? previousUpdatedAt = null;
        string? performedByName = log.UserName;

        if (!string.IsNullOrWhiteSpace(log.DetailsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(log.DetailsJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("previousUpdatedBy", out var prevBy) &&
                    prevBy.ValueKind == JsonValueKind.String)
                {
                    previousUpdatedBy = prevBy.GetString();
                }

                if (root.TryGetProperty("previousUpdatedAt", out var prevAt) &&
                    prevAt.ValueKind == JsonValueKind.String &&
                    DateTime.TryParse(prevAt.GetString(), out var parsedPrevAt))
                {
                    previousUpdatedAt = parsedPrevAt;
                }

                if (root.TryGetProperty("performedByName", out var perf) &&
                    perf.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(perf.GetString()))
                {
                    performedByName = perf.GetString();
                }
            }
            catch (JsonException)
            {
                // fall back to UserName only
            }
        }

        return new ClassDiaryUploadHistoryItemDto
        {
            OccurredAtPkt = log.OccurredAtPkt,
            PerformedByName = performedByName,
            PreviousUpdatedBy = previousUpdatedBy,
            PreviousUpdatedAt = previousUpdatedAt,
        };
    }

    public async Task DeleteDiaryAsync(
        int classId,
        DateOnly date,
        ClassDiaryUploadActorDto actor,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.ClassExistsAsync(classId, cancellationToken))
        {
            throw new ArgumentException("Invalid class.");
        }

        var existing = await _repository.GetByClassAndDateAsync(classId, date, cancellationToken);
        if (existing.Count == 0)
        {
            throw new ArgumentException("No diary found for this class and date.");
        }

        var className = existing.FirstOrDefault()?.Class?.Class_Name
            ?? await _repository.GetClassNameAsync(classId, cancellationToken)
            ?? "Class";
        var lastUpdatedBy = existing.FirstOrDefault()?.LastUpdatedBy;
        var lastUpdatedAt = existing.FirstOrDefault()?.LastUpdatedAt;
        var pageCount = existing.Count;
        var diaryDateKey = date.ToString("yyyy-MM-dd");
        var performedByName = string.IsNullOrWhiteSpace(actor.DisplayName) ? "Staff" : actor.DisplayName.Trim();
        var entityLabel = $"{className} — {date:dd MMM yyyy}";

        _logger.LogInformation(
            "Deleting class diary from storage: classId={ClassId} date={Date} rows={RowCount}",
            classId,
            date,
            existing.Count);

        foreach (var entry in existing)
        {
            _logger.LogInformation(
                "Deleting diary image row id={RowId} stored={StoredValue}",
                entry.ID,
                entry.ImgURL ?? "(empty)");
            await DeleteStoredImageOrThrowAsync(entry.ImgURL, cancellationToken);
        }

        int? campusUserId = string.Equals(actor.ActorSource, "campusUser", StringComparison.OrdinalIgnoreCase)
            ? actor.CampusUserId
            : null;

        await _activityLogService.WriteAsync(
            ActivityLogTypes.ClassDiaryDelete,
            ActivityLogEntityTypes.ClassDiary,
            classId,
            entityLabel,
            campusUserId,
            new
            {
                diaryDate = diaryDateKey,
                lastUpdatedBy,
                lastUpdatedAt,
                actorSource = actor.ActorSource,
                employeeId = actor.EmployeeId,
                performedByName,
                pageCount,
            },
            cancellationToken,
            string.Equals(actor.ActorSource, "employee", StringComparison.OrdinalIgnoreCase)
                ? performedByName
                : null);

        _repository.RemoveRange(existing);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private async Task DeleteStoredImageOrThrowAsync(string? imgUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(imgUrl))
        {
            throw new InvalidOperationException(
                "Diary row has no stored image key; refusing to delete database record without removing the Backblaze file.");
        }

        var key = _objectStorage.TryResolveObjectKey(imgUrl);
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Could not resolve Backblaze object key for a diary image.");
        }

        var deleted = await _objectStorage.DeleteObjectAsync(key, cancellationToken);
        if (!deleted)
        {
            throw new InvalidOperationException($"Failed to delete diary image from Backblaze (key: {key}).");
        }
    }

    private async Task EnforceRetentionAsync(int classId, CancellationToken cancellationToken)
    {
        var allowed = new HashSet<DateOnly>
        {
            PakistanTime.Yesterday,
            PakistanTime.Today,
            PakistanTime.Tomorrow,
        };

        var all = await _repository.GetByClassAsync(classId, cancellationToken);
        var toRemove = all.Where(x => x.Date is null || !allowed.Contains(x.Date.Value)).ToList();

        foreach (var entry in toRemove)
        {
            await TryDeleteStoredImageAsync(entry.ImgURL, cancellationToken);
        }

        if (toRemove.Count > 0)
        {
            _repository.RemoveRange(toRemove);
            await _repository.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task TryDeleteStoredImageAsync(string? imgUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(imgUrl))
        {
            return;
        }

        var key = _objectStorage.TryResolveObjectKey(imgUrl);
        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        await _objectStorage.DeleteObjectAsync(key, cancellationToken);
    }

    private ClassDiaryListingDto MapGroupToListing(int classId, DateOnly date, List<ClassDiary> rows)
    {
        var urls = rows
            .Select(x => ResolvePublicImageUrl(x.ImgURL))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();

        return new ClassDiaryListingDto
        {
            ClassId = classId,
            ClassName = rows.FirstOrDefault()?.Class?.Class_Name,
            Date = date,
            ImgUrls = string.Join(",", urls),
            ImageCount = urls.Count,
            LastUpdatedBy = rows.FirstOrDefault()?.LastUpdatedBy,
            LastUpdatedAt = rows.FirstOrDefault()?.LastUpdatedAt,
        };
    }

    private ClassDiaryDto MapGroupToDto(
        int classId,
        DateOnly date,
        IReadOnlyList<ClassDiary> rows,
        string? description)
    {
        var listing = MapGroupToListing(classId, date, rows.ToList());
        return new ClassDiaryDto
        {
            ClassId = listing.ClassId,
            ClassName = listing.ClassName,
            Date = listing.Date,
            Description = description,
            ImgUrls = listing.ImgUrls,
        };
    }

    private string ResolvePublicImageUrl(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return string.Empty;
        }

        var value = stored.Trim();
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        return _objectStorage.BuildPublicUrlFromKey(value) ?? value;
    }
}

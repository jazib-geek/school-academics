using Microsoft.Extensions.Logging;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class ClassDiaryService : IClassDiaryService
{
    private const int MaxImagesPerClassDate = 2;
    private const long MaxTotalUploadBytes = 1_048_576;

    private readonly IClassDiaryRepository _repository;
    private readonly IObjectStorageService _objectStorage;
    private readonly ILogger<ClassDiaryService> _logger;

    public ClassDiaryService(
        IClassDiaryRepository repository,
        IObjectStorageService objectStorage,
        ILogger<ClassDiaryService> logger)
    {
        _repository = repository;
        _objectStorage = objectStorage;
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
        CancellationToken cancellationToken = default)
    {
        if (!PakistanTime.IsTodayOrYesterday(date))
        {
            throw new ArgumentException("Diary date must be today or yesterday (Pakistan time).");
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
        foreach (var entry in existing)
        {
            await DeleteStoredImageOrThrowAsync(entry.ImgURL, cancellationToken);
        }

        if (existing.Count > 0)
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

        var newRows = uploadedKeys.Select(key => new ClassDiary
        {
            ClassID = classId,
            SubjectID = null,
            Date = date,
            Description = description,
            ImgURL = key,
        }).ToList();

        await _repository.AddRangeAsync(newRows, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        await EnforceRetentionAsync(classId, cancellationToken);

        var saved = await _repository.GetByClassAndDateAsync(classId, date, cancellationToken);
        return MapGroupToDto(classId, date, saved, description);
    }

    public async Task DeleteDiaryAsync(
        int classId,
        DateOnly date,
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
        var today = PakistanTime.Today;
        var yesterday = PakistanTime.Yesterday;

        var all = await _repository.GetByClassAsync(classId, cancellationToken);
        var toRemove = all.Where(x => x.Date != today && x.Date != yesterday).ToList();

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

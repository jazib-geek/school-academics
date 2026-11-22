using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IObjectStorageService
{
    Task<ObjectStorageUploadResultDto?> UploadTestFileAsync(
        Stream content,
        string fileName,
        string? contentType,
        CancellationToken cancellationToken = default);

    /// <summary>Canonical key: {campus}/students/profile/{regId}/image.jpg.</summary>
    string BuildStudentProfileObjectKey(string campusKey, int regId);

    Task<ObjectStorageUploadResultDto?> UploadStudentProfileImageAsync(
        Stream content,
        string campusKey,
        int regId,
        CancellationToken cancellationToken = default);

    Task<ObjectStorageUploadResultDto?> UploadClassDiaryFileAsync(
        Stream content,
        string fileName,
        string? contentType,
        string campusKey,
        string className,
        DateOnly diaryDate,
        int pageIndex,
        int totalPages,
        CancellationToken cancellationToken = default);

    /// <summary>Build a public download URL for a stored object key (null if public host is not configured).</summary>
    string? BuildPublicUrlFromKey(string key);

    /// <summary>Download an object by key (caller validates allowed prefixes).</summary>
    Task<ObjectStorageDownloadResultDto?> GetObjectAsync(
        string key,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteObjectAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Resolve an S3 object key from a stored public URL or raw key.</summary>
    string? TryResolveObjectKey(string storedUrlOrKey);
}

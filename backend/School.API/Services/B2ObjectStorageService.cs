using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using School.API.Configuration;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Services;

public class B2ObjectStorageService : IObjectStorageService
{
    private readonly BackblazeStorageOptions _options;
    private readonly ILogger<B2ObjectStorageService> _logger;
    private readonly B2NativeClient _nativeClient;

    public B2ObjectStorageService(IConfiguration configuration, ILogger<B2ObjectStorageService> logger)
    {
        _options = new BackblazeStorageOptions();
        configuration.GetSection(BackblazeStorageOptions.SectionName).Bind(_options);
        _options.KeyId = (_options.KeyId ?? string.Empty).Trim();
        _options.ApplicationKey = (_options.ApplicationKey ?? string.Empty).Trim();
        _options.ServiceUrl = (_options.ServiceUrl ?? string.Empty).Trim();
        _options.BucketName = (_options.BucketName ?? string.Empty).Trim();
        _logger = logger;
        _nativeClient = new B2NativeClient(_options, logger, new HttpClient());
    }

    public async Task<ObjectStorageUploadResultDto?> UploadTestFileAsync(
        Stream content,
        string fileName,
        string? contentType,
        CancellationToken cancellationToken = default)
    {
        if (!IsStorageConfigured())
        {
            return null;
        }

        var safeName = string.IsNullOrWhiteSpace(fileName) ? "upload.bin" : Path.GetFileName(fileName);
        var key = $"test-uploads/{Guid.NewGuid():N}-{safeName}";

        using var client = CreateS3Client();

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = content,
        };

        if (!string.IsNullOrWhiteSpace(contentType))
        {
            request.ContentType = contentType;
        }

        await client.PutObjectAsync(request, cancellationToken).ConfigureAwait(false);

        string? publicUrl = null;
        if (!string.IsNullOrWhiteSpace(_options.PublicFileHost))
        {
            var keyPath = string.Join(
                "/",
                key.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));
            publicUrl =
                $"{_options.PublicFileHost!.TrimEnd('/')}/{Uri.EscapeDataString(_options.BucketName)}/{keyPath}";
        }

        return new ObjectStorageUploadResultDto
        {
            Bucket = _options.BucketName,
            Key = key,
            PublicUrl = publicUrl,
        };
    }

    public async Task<ObjectStorageUploadResultDto?> UploadClassDiaryFileAsync(
        Stream content,
        string fileName,
        string? contentType,
        string className,
        DateOnly diaryDate,
        int pageIndex,
        int totalPages,
        CancellationToken cancellationToken = default)
    {
        if (!IsStorageConfigured())
        {
            return null;
        }

        var key = BuildClassDiaryObjectKey(className, diaryDate, pageIndex, totalPages, contentType, fileName);

        using var client = CreateS3Client();

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = content,
        };

        if (!string.IsNullOrWhiteSpace(contentType))
        {
            request.ContentType = contentType;
        }

        await client.PutObjectAsync(request, cancellationToken).ConfigureAwait(false);

        return new ObjectStorageUploadResultDto
        {
            Bucket = _options.BucketName,
            Key = key,
            PublicUrl = BuildPublicUrlFromKey(key),
        };
    }

    public string? BuildPublicUrlFromKey(string key) => BuildPublicUrl(key);

    public async Task<bool> DeleteObjectAsync(string key, CancellationToken cancellationToken = default)
    {
        if (!IsStorageConfigured() || !IsAllowedManagedKey(key))
        {
            _logger.LogWarning("B2 delete skipped (not configured or disallowed key): {Key}", key);
            return false;
        }

        var normalizedKey = key.Trim().Replace('\\', '/');
        _logger.LogInformation("B2 permanent delete starting for {Key}", normalizedKey);

        try
        {
            await _nativeClient.DeleteAllVersionsAsync(normalizedKey, cancellationToken).ConfigureAwait(false);
            var remaining = await _nativeClient.ListAllVersionsAsync(normalizedKey, cancellationToken)
                .ConfigureAwait(false);
            if (remaining.Count == 0)
            {
                _logger.LogInformation("B2 permanent delete completed for {Key}", normalizedKey);
                return true;
            }

            _logger.LogWarning(
                "B2 native delete left {Count} version(s) for {Key}; trying S3 fallback",
                remaining.Count,
                normalizedKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "B2 native delete failed for {Key}; trying S3 fallback", normalizedKey);
        }

        return await DeleteViaS3FallbackAsync(normalizedKey, cancellationToken).ConfigureAwait(false);
    }

    private async Task<bool> DeleteViaS3FallbackAsync(string normalizedKey, CancellationToken cancellationToken)
    {
        using var client = CreateS3Client();
        await DeleteAllObjectVersionsAsync(client, normalizedKey, cancellationToken).ConfigureAwait(false);

        var remainingVersions = await ListAllVersionIdsForKeyAsync(client, normalizedKey, cancellationToken)
            .ConfigureAwait(false);
        var ok = remainingVersions.Count == 0;
        if (!ok)
        {
            _logger.LogWarning(
                "B2 S3 fallback delete incomplete — {Count} S3 version id(s) remain for {Key}",
                remainingVersions.Count,
                normalizedKey);
        }

        return ok;
    }

    /// <summary>
    /// B2 buckets are versioned by default. A key-only DELETE only inserts a delete marker;
    /// the file data remains in the bucket UI until every version (and marker) is removed.
    /// </summary>
    private async Task DeleteAllObjectVersionsAsync(
        AmazonS3Client client,
        string normalizedKey,
        CancellationToken cancellationToken)
    {
        var versionsToDelete = await ListAllVersionIdsForKeyAsync(client, normalizedKey, cancellationToken)
            .ConfigureAwait(false);

        if (versionsToDelete.Count == 0)
        {
            await client.DeleteObjectAsync(
                new DeleteObjectRequest
                {
                    BucketName = _options.BucketName,
                    Key = normalizedKey,
                },
                cancellationToken).ConfigureAwait(false);
            return;
        }

        foreach (var versionId in versionsToDelete)
        {
            await client.DeleteObjectAsync(
                new DeleteObjectRequest
                {
                    BucketName = _options.BucketName,
                    Key = normalizedKey,
                    VersionId = versionId,
                },
                cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task<List<string>> ListAllVersionIdsForKeyAsync(
        AmazonS3Client client,
        string normalizedKey,
        CancellationToken cancellationToken)
    {
        var versionIds = new List<string>();
        var request = new ListVersionsRequest
        {
            BucketName = _options.BucketName,
            Prefix = normalizedKey,
        };

        ListVersionsResponse response;
        do
        {
            response = await client.ListVersionsAsync(request, cancellationToken).ConfigureAwait(false);

            foreach (var version in response.Versions)
            {
                if (string.Equals(version.Key, normalizedKey, StringComparison.Ordinal) &&
                    !string.IsNullOrWhiteSpace(version.VersionId))
                {
                    versionIds.Add(version.VersionId);
                }
            }

            if (!response.IsTruncated)
            {
                break;
            }

            request.KeyMarker = response.NextKeyMarker;
            request.VersionIdMarker = response.NextVersionIdMarker;
        }
        while (true);

        return versionIds;
    }

    public string? TryResolveObjectKey(string storedUrlOrKey)
    {
        if (string.IsNullOrWhiteSpace(storedUrlOrKey))
        {
            return null;
        }

        var value = storedUrlOrKey.Trim().Replace('\\', '/');

        if (value.StartsWith("class-diary/", StringComparison.Ordinal) ||
            value.StartsWith("test-uploads/", StringComparison.Ordinal))
        {
            return value;
        }

        var embeddedKey = TryExtractManagedKey(value);
        if (!string.IsNullOrWhiteSpace(embeddedKey))
        {
            return embeddedKey;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 2)
        {
            return null;
        }

        // B2 friendly URL: https://fXXX.backblazeb2.com/file/{bucket}/{key...}
        if (string.Equals(segments[0], "file", StringComparison.OrdinalIgnoreCase))
        {
            if (segments.Length < 3)
            {
                return null;
            }

            if (!string.Equals(
                    Uri.UnescapeDataString(segments[1]),
                    _options.BucketName,
                    StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var b2Key = string.Join('/', segments.Skip(2).Select(Uri.UnescapeDataString));
            return IsAllowedManagedKey(b2Key) ? b2Key : null;
        }

        // Public host without /file prefix: /{bucket}/{key...}
        var bucketSegment = Uri.UnescapeDataString(segments[0]);
        if (!string.Equals(bucketSegment, _options.BucketName, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var key = string.Join('/', segments.Skip(1).Select(Uri.UnescapeDataString));
        return IsAllowedManagedKey(key) ? key : null;
    }

    public async Task<ObjectStorageDownloadResultDto?> GetObjectAsync(
        string key,
        CancellationToken cancellationToken = default)
    {
        if (!IsStorageConfigured())
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(key) || !IsAllowedDownloadKey(key))
        {
            return null;
        }

        var normalizedKey = key.Trim().Replace('\\', '/');

        using var client = CreateS3Client();
        using var response = await client.GetObjectAsync(
            new GetObjectRequest
            {
                BucketName = _options.BucketName,
                Key = normalizedKey,
            },
            cancellationToken).ConfigureAwait(false);

        await using var responseStream = response.ResponseStream;
        var ms = new MemoryStream();
        await responseStream.CopyToAsync(ms, cancellationToken).ConfigureAwait(false);
        ms.Position = 0;

        var fileName = Path.GetFileName(normalizedKey);
        if (string.IsNullOrEmpty(fileName))
        {
            fileName = "download";
        }

        var contentType = response.Headers.ContentType;
        if (string.IsNullOrWhiteSpace(contentType))
        {
            contentType = "application/octet-stream";
        }

        return new ObjectStorageDownloadResultDto
        {
            Stream = ms,
            ContentType = contentType,
            FileName = fileName,
        };
    }

    private AmazonS3Client CreateS3Client()
    {
        var credentials = new BasicAWSCredentials(_options.KeyId, _options.ApplicationKey);
        var config = new AmazonS3Config
        {
            ServiceURL = _options.ServiceUrl.TrimEnd('/'),
            ForcePathStyle = true,
            AuthenticationRegion = _options.Region,
        };
        return new AmazonS3Client(credentials, config);
    }

    private bool IsStorageConfigured() =>
        !string.IsNullOrWhiteSpace(_options.KeyId) &&
        !string.IsNullOrWhiteSpace(_options.ApplicationKey) &&
        !string.IsNullOrWhiteSpace(_options.BucketName) &&
        !string.IsNullOrWhiteSpace(_options.ServiceUrl);

    /// <summary>Restrict downloads to the same prefix used by the upload test (avoid arbitrary bucket reads).</summary>
    private static bool IsAllowedDownloadKey(string key)
    {
        var k = key.Trim().Replace('\\', '/');
        if (k.Contains("..", StringComparison.Ordinal))
        {
            return false;
        }

        return k.StartsWith("test-uploads/", StringComparison.Ordinal) ||
               k.StartsWith("class-diary/", StringComparison.Ordinal);
    }

    private static bool IsAllowedManagedKey(string key)
    {
        var k = key.Trim().Replace('\\', '/');
        if (k.Contains("..", StringComparison.Ordinal))
        {
            return false;
        }

        return k.StartsWith("test-uploads/", StringComparison.Ordinal) ||
               k.StartsWith("class-diary/", StringComparison.Ordinal);
    }

    private static string? TryExtractManagedKey(string value)
    {
        foreach (var prefix in new[] { "class-diary/", "test-uploads/" })
        {
            var index = value.IndexOf(prefix, StringComparison.Ordinal);
            if (index < 0)
            {
                continue;
            }

            var fragment = value[index..];
            var end = fragment.IndexOfAny(['?', '#']);
            if (end >= 0)
            {
                fragment = fragment[..end];
            }

            fragment = Uri.UnescapeDataString(fragment);
            return IsAllowedManagedKey(fragment) ? fragment : null;
        }

        return null;
    }

    private string? BuildPublicUrl(string key)
    {
        if (string.IsNullOrWhiteSpace(_options.PublicFileHost))
        {
            return null;
        }

        var keyPath = string.Join(
            "/",
            key.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));
        return
            $"{_options.PublicFileHost!.TrimEnd('/')}/{Uri.EscapeDataString(_options.BucketName)}/{keyPath}";
    }

    private static string BuildClassDiaryObjectKey(
        string className,
        DateOnly diaryDate,
        int pageIndex,
        int totalPages,
        string? contentType,
        string fileName)
    {
        var safeClass = SanitizePathSegment(className);
        if (string.IsNullOrWhiteSpace(safeClass))
        {
            safeClass = "UnknownClass";
        }

        var datePart = diaryDate.ToString("ddMMyyyy");
        var ext = ResolveImageExtension(contentType, fileName);
        var fileBase = totalPages > 1
            ? $"{safeClass}_{datePart}_{pageIndex}"
            : $"{safeClass}_{datePart}";

        return $"class-diary/{safeClass}/{fileBase}{ext}";
    }

    private static string SanitizePathSegment(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var chars = value.Trim().Where(ch => ch != '/' && ch != '\\' && !char.IsControl(ch)).ToArray();
        return new string(chars).Trim();
    }

    private static string ResolveImageExtension(string? contentType, string fileName)
    {
        var fromName = Path.GetExtension(fileName);
        if (!string.IsNullOrWhiteSpace(fromName))
        {
            return fromName.ToLowerInvariant();
        }

        if (string.IsNullOrWhiteSpace(contentType))
        {
            return ".jpg";
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => ".jpg",
        };
    }
}


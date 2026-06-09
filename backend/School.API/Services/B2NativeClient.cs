using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using School.API.Configuration;

namespace School.API.Services;

/// <summary>
/// Backblaze B2 Native API — required for permanent deletes because versioned buckets
/// often hide the real upload bytes behind S3 delete markers.
/// </summary>
internal sealed class B2NativeClient
{
    private readonly BackblazeStorageOptions _options;
    private readonly ILogger _logger;
    private readonly HttpClient _http;

    private string? _apiUrl;
    private string? _authToken;
    private string? _accountId;
    private string? _bucketId;
    private DateTime _authExpiresUtc = DateTime.MinValue;

    public B2NativeClient(BackblazeStorageOptions options, ILogger logger, HttpClient http)
    {
        _options = options;
        _logger = logger;
        _http = http;
    }

    public async Task<IReadOnlyList<B2FileVersion>> ListAllVersionsAsync(
        string fileName,
        CancellationToken cancellationToken)
    {
        await EnsureAuthorizedAsync(cancellationToken).ConfigureAwait(false);
        await EnsureBucketIdAsync(cancellationToken).ConfigureAwait(false);

        var versions = new List<B2FileVersion>();
        string? startFileName = fileName;
        string? startFileId = null;

        for (var page = 0; page < 50; page++)
        {
            var body = new Dictionary<string, object?>
            {
                ["bucketId"] = _bucketId,
                ["maxFileCount"] = 100,
                ["startFileName"] = startFileName,
            };
            if (!string.IsNullOrWhiteSpace(startFileId))
            {
                body["startFileId"] = startFileId;
            }

            using var doc = await PostAsync("b2_list_file_versions", body, cancellationToken).ConfigureAwait(false);
            if (!doc.RootElement.TryGetProperty("files", out var files))
            {
                break;
            }

            var sawTargetFileOnPage = false;
            foreach (var file in files.EnumerateArray())
            {
                var name = file.GetProperty("fileName").GetString() ?? string.Empty;
                if (!string.Equals(name, fileName, StringComparison.Ordinal))
                {
                    if (sawTargetFileOnPage || versions.Count > 0)
                    {
                        return versions;
                    }

                    continue;
                }

                sawTargetFileOnPage = true;
                versions.Add(new B2FileVersion
                {
                    FileName = name,
                    FileId = file.GetProperty("fileId").GetString() ?? string.Empty,
                    Action = file.GetProperty("action").GetString() ?? string.Empty,
                    SizeBytes = file.TryGetProperty("contentLength", out var sizeEl) ? sizeEl.GetInt64() : 0,
                });
            }

            if (!sawTargetFileOnPage && versions.Count == 0)
            {
                return versions;
            }

            if (!doc.RootElement.TryGetProperty("nextFileName", out var nextNameEl) ||
                nextNameEl.ValueKind == JsonValueKind.Null)
            {
                break;
            }

            var nextName = nextNameEl.GetString();
            if (!string.Equals(nextName, fileName, StringComparison.Ordinal))
            {
                break;
            }

            startFileName = nextName;
            startFileId = doc.RootElement.GetProperty("nextFileId").GetString();
        }

        return versions;
    }

    public async Task DeleteVersionAsync(
        string fileName,
        string fileId,
        CancellationToken cancellationToken)
    {
        await EnsureAuthorizedAsync(cancellationToken).ConfigureAwait(false);

        await PostAsync(
            "b2_delete_file_version",
            new Dictionary<string, object?>
            {
                ["fileName"] = fileName,
                ["fileId"] = fileId,
            },
            cancellationToken).ConfigureAwait(false);
    }

    public async Task DeleteAllVersionsAsync(string fileName, CancellationToken cancellationToken)
    {
        var versions = await ListAllVersionsAsync(fileName, cancellationToken).ConfigureAwait(false);
        _logger.LogInformation(
            "B2 native list found {Count} version(s) for {FileName}",
            versions.Count,
            fileName);

        foreach (var version in versions)
        {
            _logger.LogInformation(
                "B2 native deleting {Action} version size={Size} id={FileId} for {FileName}",
                version.Action,
                version.SizeBytes,
                version.FileId,
                fileName);

            await DeleteVersionAsync(fileName, version.FileId, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task EnsureAuthorizedAsync(CancellationToken cancellationToken)
    {
        if (_authToken != null && DateTime.UtcNow < _authExpiresUtc)
        {
            return;
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "https://api.backblazeb2.com/b2api/v2/b2_authorize_account");
        var authBytes = Encoding.UTF8.GetBytes($"{_options.KeyId}:{_options.ApplicationKey}");
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

        using var response = await _http.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var json = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(json);
        _apiUrl = doc.RootElement.GetProperty("apiUrl").GetString();
        _authToken = doc.RootElement.GetProperty("authorizationToken").GetString();
        _accountId = doc.RootElement.GetProperty("accountId").GetString();
        _authExpiresUtc = DateTime.UtcNow.AddHours(20);
    }

    private async Task EnsureBucketIdAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_bucketId))
        {
            return;
        }

        using var doc = await PostAsync(
            "b2_list_buckets",
            new Dictionary<string, object?> { ["accountId"] = _accountId },
            cancellationToken).ConfigureAwait(false);

        foreach (var bucket in doc.RootElement.GetProperty("buckets").EnumerateArray())
        {
            if (string.Equals(
                    bucket.GetProperty("bucketName").GetString(),
                    _options.BucketName,
                    StringComparison.Ordinal))
            {
                _bucketId = bucket.GetProperty("bucketId").GetString();
                return;
            }
        }

        throw new InvalidOperationException($"Backblaze bucket '{_options.BucketName}' was not found.");
    }

    private async Task<JsonDocument> PostAsync(
        string operation,
        Dictionary<string, object?> body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_apiUrl) || string.IsNullOrWhiteSpace(_authToken))
        {
            throw new InvalidOperationException("Backblaze native API is not authorized.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/b2api/v2/{operation}");
        request.Headers.TryAddWithoutValidation("Authorization", _authToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(body),
            Encoding.UTF8,
            "application/json");

        using var response = await _http.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var json = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Backblaze {operation} failed ({(int)response.StatusCode}): {json}");
        }

        return JsonDocument.Parse(json);
    }
}

internal sealed class B2FileVersion
{
    public string FileName { get; init; } = string.Empty;
    public string FileId { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public long SizeBytes { get; init; }
}

namespace School.Application.DTOs;

/// <summary>Result of fetching an object from B2; dispose <see cref="Stream"/> after sending the response.</summary>
public class ObjectStorageDownloadResultDto
{
    public Stream Stream { get; set; } = null!;

    public string ContentType { get; set; } = "application/octet-stream";

    /// <summary>Suggested filename for Content-Disposition.</summary>
    public string FileName { get; set; } = "download";
}

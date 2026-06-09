namespace School.API.Configuration;

public class BackblazeStorageOptions
{
    public const string SectionName = "Backblaze";

    public string ServiceUrl { get; set; } = string.Empty;

    public string Region { get; set; } = "us-east-005";

    public string BucketName { get; set; } = string.Empty;

    public string KeyId { get; set; } = string.Empty;

    public string ApplicationKey { get; set; } = string.Empty;

    /// <summary>Base path for public file links, e.g. https://f005.backblazeb2.com/file (no trailing slash).</summary>
    public string? PublicFileHost { get; set; }
}

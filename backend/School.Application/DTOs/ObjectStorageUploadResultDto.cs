namespace School.Application.DTOs;

public class ObjectStorageUploadResultDto
{
    public string Bucket { get; set; } = string.Empty;

    public string Key { get; set; } = string.Empty;

    public string? PublicUrl { get; set; }
}

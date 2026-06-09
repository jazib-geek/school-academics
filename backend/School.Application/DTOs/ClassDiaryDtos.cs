namespace School.Application.DTOs;

public class ClassDiaryDto
{
    public int ClassId { get; set; }
    public string? ClassName { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    /// <summary>One or two image URLs, comma-separated.</summary>
    public string ImgUrls { get; set; } = string.Empty;
}

public class ClassDiaryListingDto
{
    public int ClassId { get; set; }
    public string? ClassName { get; set; }
    public DateOnly Date { get; set; }
    /// <summary>One or two image URLs, comma-separated.</summary>
    public string ImgUrls { get; set; } = string.Empty;
    public int ImageCount { get; set; }
}

public class SubjectLookupDto
{
    public int ID { get; set; }
    public string SubjectName { get; set; } = string.Empty;
}

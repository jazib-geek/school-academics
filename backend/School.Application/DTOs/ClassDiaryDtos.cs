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
    public string? LastUpdatedBy { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
}

public class ClassDiaryUploadHistoryItemDto
{
    public DateTime OccurredAtPkt { get; set; }
    public string? PerformedByName { get; set; }
    public string? PreviousUpdatedBy { get; set; }
    public DateTime? PreviousUpdatedAt { get; set; }
}

public class ClassDiaryUploadActorDto
{
    public int? CampusUserId { get; set; }
    public int? EmployeeId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    /// <summary>"employee" or "campusUser".</summary>
    public string ActorSource { get; set; } = string.Empty;
}

public class SubjectLookupDto
{
    public int ID { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectShortName { get; set; } = string.Empty;
}

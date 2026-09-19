namespace School.Application.DTOs;

public class ActivityLogFilterDto
{
    public string? ActivityType { get; set; }
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public int? UserId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string? Search { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class ActivityLogDto
{
    public int Id { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public string? EntityLabel { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime OccurredAtPkt { get; set; }
    public string? DetailsJson { get; set; }
}

public class ActivityLogChangeDto
{
    public string Field { get; set; } = string.Empty;
    public string? Old { get; set; }
    public string? New { get; set; }
}

public class ActivityLogLookupDto
{
    public IReadOnlyList<ActivityLogTypeOptionDto> ActivityTypes { get; set; } = [];
    public IReadOnlyList<ActivityLogUserOptionDto> Users { get; set; } = [];
}

public class ActivityLogTypeOptionDto
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class ActivityLogUserOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class AbsentFollowupReasonDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class AbsentFollowupRowDto
{
    public int StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? FatherName { get; set; }
    public string ClassName { get; set; } = "-";
    public string? FatherMobile { get; set; }
    public string? MotherPhone { get; set; }
    public int? FollowupId { get; set; }
    public int? ReasonId { get; set; }
    public string? ReasonName { get; set; }
    public string? Description { get; set; }
}

public class AbsentFollowupUpsertDto
{
    [Required, Range(1, int.MaxValue)]
    public int StudentId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    public int? ReasonId { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }
}

public class AbsentFollowupSaveResultDto
{
    public int FollowupId { get; set; }
    public int StudentId { get; set; }
    public DateOnly Date { get; set; }
    public int? ReasonId { get; set; }
    public string? ReasonName { get; set; }
    public string? Description { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class CampusClassDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? SortBy { get; set; }
    public bool IsHifz { get; set; }
    public bool IsActive { get; set; }
}

public class CampusClassUpsertDto
{
    [Required, StringLength(50)]
    public string Name { get; set; } = string.Empty;
    public int? SortBy { get; set; }
    public bool IsHifz { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SectionColorDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class SectionColorUpsertDto
{
    [Required, StringLength(250)]
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class OccupationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class OccupationUpsertDto
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class DegreeLookupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public bool IsActive { get; set; }
}

public class DegreeLookupUpsertDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;
    [StringLength(150)]
    public string? Type { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CampusSectionDto
{
    public int Id { get; set; }
    public int? ClassId { get; set; }
    public int? ColorId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? ColorName { get; set; }
    public string? Branch { get; set; }
    public string? Gender { get; set; }
    public int Fee { get; set; }
    public bool IsHifz { get; set; }
    public bool IsActive { get; set; }
    public int ActiveStudentCount { get; set; }
}

public class CampusSectionUpsertDto
{
    [Required]
    public int ClassId { get; set; }
    [Required]
    public int ColorId { get; set; }
    [StringLength(100)]
    public string? Branch { get; set; }
    [StringLength(50)]
    public string? Gender { get; set; }
    public int Fee { get; set; }
    public bool IsHifz { get; set; }
    public bool IsActive { get; set; } = true;
}

public class StatusUpdateDto
{
    public bool IsActive { get; set; }
}

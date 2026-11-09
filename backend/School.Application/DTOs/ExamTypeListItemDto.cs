namespace School.Application.DTOs;

public class ExamTypeListItemDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public int? Priority { get; set; }
}

public class ExamTypeManageDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int? Priority { get; set; }
}

public class ExamTypeUpsertDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class MoveExamTypeRequestDto
{
    public string Direction { get; set; } = string.Empty;
    public List<int> OrderedIds { get; set; } = new();
}

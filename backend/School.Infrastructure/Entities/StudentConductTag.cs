namespace School.Infrastructure.Entities;

public class StudentConductTag
{
    public int Id { get; set; }
    public int ConductTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsGood { get; set; }
    public bool IsActive { get; set; } = true;

    public StudentConductType ConductType { get; set; } = null!;
    public ICollection<StudentConductNoteTag> NoteTags { get; set; } = [];
}

namespace School.Infrastructure.Entities;

public class TeacherConductTag
{
    public int Id { get; set; }
    public int ConductTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsGood { get; set; }
    public bool IsActive { get; set; } = true;

    public TeacherConductType ConductType { get; set; } = null!;
    public ICollection<TeacherConductNoteTag> NoteTags { get; set; } = [];
}

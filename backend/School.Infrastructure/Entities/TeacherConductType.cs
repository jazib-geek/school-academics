namespace School.Infrastructure.Entities;

public class TeacherConductType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<TeacherConductTag> Tags { get; set; } = [];
    public ICollection<TeacherConductNote> Notes { get; set; } = [];
}

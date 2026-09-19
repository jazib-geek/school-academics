namespace School.Infrastructure.Entities;

public class StudentConductType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<StudentConductTag> Tags { get; set; } = [];
    public ICollection<StudentConductNote> Notes { get; set; } = [];
}

namespace School.Infrastructure.Entities;

public class Section
{
    public int ID { get; set; }

    /// <summary>Class id (<see cref="Class.Class_ID"/>) — stored in tblSection.Class_ID.</summary>
    public int? Class_ID { get; set; }

    public string? ClassName { get; set; }
    public string? SectionName { get; set; }

    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<SubjectClasswise> SubjectAssignments { get; set; } = new List<SubjectClasswise>();
}

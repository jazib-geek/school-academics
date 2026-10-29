namespace School.Infrastructure.Entities;

public class TeacherConductNote
{
    public int Id { get; set; }
    public int SubjectEmployeeId { get; set; }
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string? Remarks { get; set; }
    public int? RecordedByEmployeeId { get; set; }
    public string? RecordedByName { get; set; }
    public DateTime CreatedAtPkt { get; set; }
    public DateTime? UpdatedAtPkt { get; set; }

    public Employee SubjectEmployee { get; set; } = null!;
    public TeacherConductType ConductType { get; set; } = null!;
    public Employee? RecordedByEmployee { get; set; }
    public ICollection<TeacherConductNoteTag> NoteTags { get; set; } = [];
}

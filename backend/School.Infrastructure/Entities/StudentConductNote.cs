namespace School.Infrastructure.Entities;

public class StudentConductNote
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string? Remarks { get; set; }
    public int? RecordedByEmployeeId { get; set; }
    public string? RecordedByName { get; set; }
    public DateTime CreatedAtPkt { get; set; }
    public DateTime? UpdatedAtPkt { get; set; }
    /// <summary>When the family acknowledged this note in the parent app; null = unread.</summary>
    public DateTime? ParentAcknowledgedAtPkt { get; set; }

    public Student Student { get; set; } = null!;
    public StudentConductType ConductType { get; set; } = null!;
    public Employee? RecordedByEmployee { get; set; }
    public ICollection<StudentConductNoteTag> NoteTags { get; set; } = [];
}

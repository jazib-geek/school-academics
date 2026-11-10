namespace School.Infrastructure.Entities;

public class DisciplineFindingStudent
{
    public int FindingId { get; set; }
    public int StudentId { get; set; }
    public int? ConductNoteId { get; set; }

    public DisciplineFinding Finding { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public StudentConductNote? ConductNote { get; set; }
}

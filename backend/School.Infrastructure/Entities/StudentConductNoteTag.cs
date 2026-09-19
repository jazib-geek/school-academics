namespace School.Infrastructure.Entities;

public class StudentConductNoteTag
{
    public int NoteId { get; set; }
    public int TagId { get; set; }

    public StudentConductNote Note { get; set; } = null!;
    public StudentConductTag Tag { get; set; } = null!;
}

namespace School.Infrastructure.Entities;

public class TeacherConductNoteTag
{
    public int NoteId { get; set; }
    public int TagId { get; set; }

    public TeacherConductNote Note { get; set; } = null!;
    public TeacherConductTag Tag { get; set; } = null!;
}

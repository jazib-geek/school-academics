namespace School.Infrastructure.Entities;

/// <summary>Tracks when a family parent acknowledged a conduct note in the Family Portal app.</summary>
public class StudentConductParentAck
{
    public int Id { get; set; }
    public int FamilyDbId { get; set; }
    public int NoteId { get; set; }
    public DateTime AcknowledgedAtPkt { get; set; }

    public StudentFamilyDetail Family { get; set; } = null!;
    public StudentConductNote Note { get; set; } = null!;
}

namespace School.Infrastructure.Entities;

/// <summary>
/// Maps subjects to a class/section composite (<see cref="Section.ID"/>).
/// Table: tblSubject_Classwise
/// </summary>
public class SubjectClasswise
{
    public int ID { get; set; }

    public int? SubjectID { get; set; }

    /// <summary>References <see cref="Section.ID"/> (composite class-section, e.g. Playgroup-Red).</summary>
    public int? ClassID { get; set; }

    public virtual SubjectMaster? Subject { get; set; }
    public virtual Section? Section { get; set; }
}

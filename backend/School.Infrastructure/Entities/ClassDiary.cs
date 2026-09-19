namespace School.Infrastructure.Entities;

public class ClassDiary
{
    public int ID { get; set; }

    /// <summary>Class id (<see cref="Class.Class_ID"/>) — stored in tblClassDiary.ClassID.</summary>
    public int? ClassID { get; set; }

    public DateOnly? Date { get; set; }

    public int? SubjectID { get; set; }

    public string? Description { get; set; }

    public string? ImgURL { get; set; }

    /// <summary>Display name of whoever last uploaded/replaced this page (denormalized).</summary>
    public string? LastUpdatedBy { get; set; }

    /// <summary>When this page was last uploaded/replaced (Pakistan time).</summary>
    public DateTime? LastUpdatedAt { get; set; }

    public virtual Class? Class { get; set; }
}

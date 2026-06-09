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

    public virtual Class? Class { get; set; }
}

namespace School.Infrastructure.Entities;

public class ExamSubjectComponentHeader
{
    public int ID { get; set; }
    public int ClassID { get; set; }
    public int ExamTypeID { get; set; }
    public int SubjectID { get; set; }
    public string HeaderName { get; set; } = string.Empty;
    public decimal? MaxMarks { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<ExamSubjectComponentMark> Marks { get; set; } = new List<ExamSubjectComponentMark>();
}

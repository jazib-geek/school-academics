namespace School.Infrastructure.Entities;

public class ExamSubjectComponentMark
{
    public int ID { get; set; }
    public int ExamID { get; set; }
    public int HeaderID { get; set; }
    public decimal Marks { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public Exam? Exam { get; set; }
    public ExamSubjectComponentHeader? Header { get; set; }
}


namespace School.Infrastructure.Entities
{
    public class ExamType
    {
        public int ID { get; set; }
        public string? ExamTypeName { get; set; }
        public bool? IsActive { get; set; }
        public int? Priority { get; set; }

        public virtual ICollection<Exam> Exams { get; set; }
    }
}

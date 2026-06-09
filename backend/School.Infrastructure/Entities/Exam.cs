
namespace School.Infrastructure.Entities
{
    public class Exam
    {
        public int ID { get; set; }

        public int? ExamTypeID { get; set; }
        public int? StudentID { get; set; }
        public int? SubjectID { get; set; }
        public int? ClassID { get; set; }
        public int? SectionID { get; set; }

        public int? TotalMarks { get; set; }
        public int? MaxMarks { get; set; }
        public int? PassingMarks { get; set; }
        public int? ObtainedMarks { get; set; }

        public string? AttendanceRatio { get; set; }

        public int? BranchID { get; set; }
        public string? SessionYear { get; set; }

        // 🔹 Navigation Properties
        public virtual ExamType? ExamType { get; set; }
        public virtual SubjectMaster? Subject { get; set; }
        public virtual Student? Student { get; set; }
    }
}

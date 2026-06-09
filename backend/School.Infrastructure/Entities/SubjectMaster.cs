
namespace School.Infrastructure.Entities
{
    public class SubjectMaster
    {
        public int ID { get; set; }
        public string? SubjectName { get; set; }
        public string? GroupName { get; set; }
        public decimal? Charges { get; set; }
        public string? ShortName { get; set; }

        public virtual ICollection<Exam> Exams { get; set; }
        public virtual ICollection<SubjectClasswise> ClassAssignments { get; set; } = new List<SubjectClasswise>();
    }
}

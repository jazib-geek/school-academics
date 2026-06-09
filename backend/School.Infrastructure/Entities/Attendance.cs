
namespace School.Infrastructure.Entities
{
    public class Attendance
    {
        public int ID { get; set; }

        public int? StudentID { get; set; }

        public int? ClassSectionCompositeID { get; set; }

        public DateTime? Date { get; set; }

        public int? Day { get; set; }

        public int? Month { get; set; }

        public int? Year { get; set; }

        public string? Status { get; set; }

        public bool? IsPresent { get; set; }

        public int? BranchID { get; set; }

        public string? SessionYear { get; set; }

        // Navigation
        public Student? Student { get; set; }

        public Section? Section { get; set; }
    }
}


namespace School.Application.DTOs
{
    public class AttendanceDto
    {
        public int Id { get; set; }

        public DateTime? Date { get; set; }

        public string? Status { get; set; }

        public bool? IsPresent { get; set; }

        public string? MonthYear { get; set; }

        public string? SectionName { get; set; }

        public string? AttendanceRatio { get; set; }

        public string? AttendancePercentage { get; set; }
    }
}

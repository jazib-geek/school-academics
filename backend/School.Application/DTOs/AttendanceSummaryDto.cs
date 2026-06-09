
namespace School.Application.DTOs
{
    public class AttendanceSummaryDto
    {
        public int TotalDays { get; set; }
        public int PresentDays { get; set; }
        public decimal Percentage { get; set; }
    }
}

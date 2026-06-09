
namespace School.Application.DTOs
{
    public class DashboardDto
    {
        public StudentInfoDto Student { get; set; } = new();

        public AttendanceSummaryDto Attendance { get; set; } = new();

        public FeeSummaryDto Fee { get; set; } = new();

        public List<AnnouncementDto> Announcements { get; set; } = new();
    }
}

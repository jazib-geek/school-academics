
namespace School.Application.DTOs
{
    public class DashboardDto
    {
        public StudentInfoDto Student { get; set; } = new();

        public AttendanceSummaryDto Attendance { get; set; } = new();

        public FeeSummaryDto Fee { get; set; } = new();

        public List<AnnouncementDto> Announcements { get; set; } = new();

        /// <summary>Unread conduct notes for family portal; 0 when not a family JWT or student not in family.</summary>
        public int UnreadConductCount { get; set; }

        public List<int> UnreadConductNoteIds { get; set; } = [];
    }
}

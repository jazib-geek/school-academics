namespace School.Application.DTOs;

public class CampusDashboardItemDto
{
    public string Campus { get; set; } = string.Empty;
    public int ActiveStudentCount { get; set; }
    public decimal FeeCollectionToday { get; set; }
}

public class AllCampusDashboardDto
{
    public DateTime Date { get; set; }
    public int TotalActiveStudentCount { get; set; }
    public decimal TotalFeeCollectionToday { get; set; }
    public List<CampusDashboardItemDto> Campuses { get; set; } = [];
}

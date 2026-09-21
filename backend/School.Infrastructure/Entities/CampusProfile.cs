namespace School.Infrastructure.Entities;

public class CampusProfile
{
    public int ID { get; set; }
    public string? SchoolName { get; set; }
    public string? SchoolLogo { get; set; }
    public string? CampusLabel { get; set; }
    public string? StreetAddress { get; set; }
    public string? Address { get; set; }
    public string? Phone1 { get; set; }
    public string? Phone2 { get; set; }
    public string? Landline { get; set; }
    public string? Email { get; set; }
    public bool ShowPhone1OnInvoice { get; set; } = true;
    public bool ShowPhone2OnInvoice { get; set; }
    public bool ShowLandlineOnInvoice { get; set; } = true;
    public string? SessionLabel { get; set; }
    public int? SessionStartMonth { get; set; }
    public int? SessionStartYear { get; set; }
    public int? SessionEndMonth { get; set; }
    public int? SessionEndYear { get; set; }
    public int? FeeYear1 { get; set; }
    public int? FeeYear2 { get; set; }
    public int? FeeYear3 { get; set; }
    public string? ReceiptFooterNote { get; set; }
    public bool ShowAddressOnReceipts { get; set; } = true;
    public string BiometricAttendanceType { get; set; } = "ZkTeco";
    public TimeSpan TeacherCheckInTime { get; set; } = new(7, 15, 0);
    public TimeSpan TeacherCheckOutTime { get; set; } = new(13, 30, 0);
    public int AdminEarlyMinutes { get; set; } = 30;
    public int CoordinatorEarlyMinutes { get; set; } = 15;
    public TimeSpan FridayCheckOutTime { get; set; } = new(12, 30, 0);

    public bool ShowCreditStudent { get; set; }
}

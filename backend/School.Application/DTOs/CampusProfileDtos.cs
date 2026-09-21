namespace School.Application.DTOs;

public class CampusProfileDto
{
    public int Id { get; set; }
    public string? SchoolName { get; set; }
    public string? SchoolLogo { get; set; }
    public string? CampusLabel { get; set; }
    public string? StreetAddress { get; set; }
    public string? Address { get; set; }
    public string? Phone1 { get; set; }
    public string? Phone2 { get; set; }
    public string? Landline { get; set; }
    public string? Email { get; set; }
    public bool ShowPhone1OnInvoice { get; set; }
    public bool ShowPhone2OnInvoice { get; set; }
    public bool ShowLandlineOnInvoice { get; set; }
    public string? SessionLabel { get; set; }
    public int? SessionStartMonth { get; set; }
    public int? SessionStartYear { get; set; }
    public int? SessionEndMonth { get; set; }
    public int? SessionEndYear { get; set; }
    public int? FeeYear1 { get; set; }
    public int? FeeYear2 { get; set; }
    public int? FeeYear3 { get; set; }
    public IReadOnlyList<int> FeeYears { get; set; } = [];
    public string? ReceiptFooterNote { get; set; }
    public bool ShowAddressOnReceipts { get; set; }
    public string BiometricAttendanceType { get; set; } = string.Empty;
    public string? TeacherCheckInTime { get; set; }
    public string? TeacherCheckOutTime { get; set; }
    public int AdminEarlyMinutes { get; set; }
    public int CoordinatorEarlyMinutes { get; set; }
    public string? FridayCheckOutTime { get; set; }

    public bool ShowCreditStudent { get; set; }
}

public class UpdateCampusProfileDto
{
    public string? SchoolName { get; set; }
    public string? SchoolLogo { get; set; }
    public string? CampusLabel { get; set; }
    public string? StreetAddress { get; set; }
    public string? Address { get; set; }
    public string? Phone1 { get; set; }
    public string? Phone2 { get; set; }
    public string? Landline { get; set; }
    public string? Email { get; set; }
    public bool ShowPhone1OnInvoice { get; set; }
    public bool ShowPhone2OnInvoice { get; set; }
    public bool ShowLandlineOnInvoice { get; set; }
    public int? SessionStartMonth { get; set; }
    public int? SessionStartYear { get; set; }
    public int? SessionEndMonth { get; set; }
    public int? SessionEndYear { get; set; }
    public int? FeeYear1 { get; set; }
    public int? FeeYear2 { get; set; }
    public int? FeeYear3 { get; set; }
    public string? ReceiptFooterNote { get; set; }
    public bool ShowAddressOnReceipts { get; set; }
    public string? BiometricAttendanceType { get; set; }
    public string? TeacherCheckInTime { get; set; }
    public string? TeacherCheckOutTime { get; set; }
    public int? AdminEarlyMinutes { get; set; }
    public int? CoordinatorEarlyMinutes { get; set; }
    public string? FridayCheckOutTime { get; set; }

    public bool ShowCreditStudent { get; set; }
}

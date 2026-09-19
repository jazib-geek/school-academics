namespace School.Application.DTOs;

public class LoginResponseDto
{
    public int ID { get; set; }
    public int? FamilyID { get; set; }

    public string? FatherName { get; set; }
    public string? FatherContact { get; set; }
    public string? MotherName { get; set; }
    public string? MotherContact { get; set; }
    public string? FatherCNIC { get; set; }
    public string? MotherCNIC { get; set; }
    public string? HomeAddress { get; set; }

    public string Token { get; set; } = string.Empty;

    public List<StudentDto> Students { get; set; } = new();

    /// <summary>Unread conduct summary for Family Portal (Android) login popup / badges.</summary>
    public ParentConductInboxDto ConductInbox { get; set; } = new();
}

namespace School.Application.DTOs;

public class FamilyAccountDto
{
    public int Id { get; set; }
    public int FamilyId { get; set; }
    public string? FatherName { get; set; }
    public string? FatherContact { get; set; }
    public string? Password { get; set; }
    public int ActiveStudentCount { get; set; }
}

public class ChangeFamilyAccountPasswordDto
{
    public string Password { get; set; } = string.Empty;
}

namespace School.Application.DTOs;

/// <summary>Row for campus family / siblings view (shared FamilyID).</summary>
public class StudentFamilyMemberDto
{
    public int Reg_Id { get; set; }
    public string? StudentName { get; set; }
    public string? ClassName { get; set; }
    public string? FatherName { get; set; }
    public string? FatherContact { get; set; }
    /// <summary>Family joining / registration date from family record when available.</summary>
    public DateTime? RegDate { get; set; }
}

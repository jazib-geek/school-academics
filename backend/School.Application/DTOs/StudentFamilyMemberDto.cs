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
    /// <summary>Gross fee (before concession).</summary>
    public int Fee { get; set; }
    public decimal Concession { get; set; }
    /// <summary>Net fee after concession (tuition).</summary>
    public decimal ActualFee { get; set; }
}

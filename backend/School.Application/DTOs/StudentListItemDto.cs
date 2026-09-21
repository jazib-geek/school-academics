namespace School.Application.DTOs;

public class StudentListItemDto
{
    public int Reg_Id { get; set; }
    public string? FullName { get; set; }
    public string? ClassName { get; set; }
    public int? FamilyID { get; set; }
    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? FatherContact { get; set; }
    public string? MotherContact { get; set; }
    public string? Gender { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? RegDate { get; set; }
    public bool IsCreditStudent { get; set; }
}

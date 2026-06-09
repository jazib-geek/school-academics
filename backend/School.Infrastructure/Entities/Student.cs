
namespace School.Infrastructure.Entities;

public class Student
{
    public int Reg_Id { get; set; }

    public string? FullName { get; set; }
    public string? Home_Address { get; set; }
    public DateTime? Date_of_Brith { get; set; }
    public DateTime? RegDate { get; set; }

    public int? Family_Code { get; set; }
    public string? Gender { get; set; }

    public int? ClassCompositeID { get; set; }
    public int? Fee { get; set; }
    public decimal? FeeConcession { get; set; }
    public decimal? TutionFee { get; set; }

    public bool? IsActive { get; set; }

    // Navigation
    public virtual ICollection<Exam> Exams { get; set; }

    public StudentFamilyDetail? Family { get; set; }
    public Section? Section { get; set; }
    public ICollection<FeeAndFundCollection> LedgerEntries { get; set; } = new List<FeeAndFundCollection>();
}
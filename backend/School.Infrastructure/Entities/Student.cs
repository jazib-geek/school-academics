namespace School.Infrastructure.Entities;

public class Student
{
    public int Reg_Id { get; set; }

    public string? FullName { get; set; }
    public string? NameInUrdu { get; set; }
    public string? Home_Address { get; set; }
    public DateTime? Date_of_Brith { get; set; }
    public DateTime? RegDate { get; set; }
    public DateTime? Leave_Date { get; set; }

    public int? Family_Code { get; set; }
    public string? Gender { get; set; }
    public string? Caste { get; set; }
    public bool? isOrphan { get; set; }
    public bool? isHafiz { get; set; }
    public int? LocalityID { get; set; }
    public string? SpecialNotes { get; set; }
    public string? B_FormNum { get; set; }
    public string? Religion { get; set; }
    public string? Medium { get; set; }

    public int? Class_ID { get; set; }
    public int? Section_ID { get; set; }
    public int? ClassCompositeID { get; set; }
    public int? Fee { get; set; }
    public decimal? FeeConcession { get; set; }
    public decimal? TutionFee { get; set; }

    public string? PrevSchoolName { get; set; }
    public string? PrevSchoolClass { get; set; }
    public string? SMS_Contact { get; set; }
    public int? SubjectGroupID { get; set; }
    public int? BranchID { get; set; }
    public string? Password { get; set; }
    public string? SessionSpan { get; set; }
    public string? Email { get; set; }
    public string? Home_Phone { get; set; }

    public bool? IsActive { get; set; }

    public bool IsCreditStudent { get; set; }

    // Navigation
    public virtual ICollection<Exam> Exams { get; set; } = new List<Exam>();

    public StudentFamilyDetail? Family { get; set; }
    public Section? Section { get; set; }
    public ICollection<FeeAndFundCollection> LedgerEntries { get; set; } = new List<FeeAndFundCollection>();
}

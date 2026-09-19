namespace School.Infrastructure.Entities;

public class Employee
{
    public int ID { get; set; }
    public string? Thumb_ID { get; set; }
    public string? FingerprintTemplate { get; set; }
    public DateTime? FingerprintEnrolledAt { get; set; }
    public string? EmployeeName { get; set; }
    public string? FatherName { get; set; }
    public DateTime? DoB { get; set; }
    public string? Gender { get; set; }
    public string? Religion { get; set; }
    public bool? IsMarried { get; set; }
    public string? Blood_Group { get; set; }
    public string? Permanent_Address { get; set; }
    public string? HomePhone { get; set; }
    public string? Contact1 { get; set; }
    public string? Contact2 { get; set; }
    public string? Contact3 { get; set; }
    public string? Email { get; set; }
    public string? CNIC { get; set; }
    public string? IdentityMark { get; set; }
    public string? Refered_By { get; set; }
    public int? LocalityID { get; set; }
    public DateTime? Joining_Date { get; set; }
    public decimal? Salary { get; set; }
    public string? ProfessionalDegree { get; set; }
    public bool? IsTrained { get; set; }
    public string? VerifiedBy { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? Leaving_Date { get; set; }
    public bool? IsActive { get; set; }
    public int? BranchID { get; set; }
    public int? DesignationID { get; set; }
    public string? MaritalStatus { get; set; }
    public string? Password { get; set; }

    /// <summary>Employee portal: mark student attendance.</summary>
    public bool CanMarkStudentAttendance { get; set; }
    /// <summary>Employee portal: view student attendance report.</summary>
    public bool CanViewStudentAttendance { get; set; }
    public bool CanViewSubjectAllocation { get; set; }
    public bool CanEditSubjectAllocation { get; set; }
    public bool CanViewTimetable { get; set; }
    public bool CanEditTimetable { get; set; }
    public bool CanViewDatesheet { get; set; }
    public bool CanEditDatesheet { get; set; }
    public bool CanViewDiary { get; set; }
    public bool CanEditDiary { get; set; }
    /// <summary>Reserved for lesson-plan module (not built yet).</summary>
    public bool CanAccessLessonPlan { get; set; }
    public bool CanViewStudentExamDetail { get; set; }
    /// <summary>Employee portal: record class conduct notes.</summary>
    public bool CanRecordStudentConduct { get; set; }
    /// <summary>Employee portal: view a student's conduct history.</summary>
    public bool CanViewStudentConduct { get; set; }

    public Designation? Designation { get; set; }
    public Locality? Locality { get; set; }
    public ICollection<EmployeeQualification> Qualifications { get; set; } = [];
    public ICollection<EmployeeExperience> Experiences { get; set; } = [];
    public ICollection<EmployeeAsset> Assets { get; set; } = [];
}

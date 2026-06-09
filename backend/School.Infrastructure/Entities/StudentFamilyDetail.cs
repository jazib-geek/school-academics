namespace School.Infrastructure.Entities;

public class StudentFamilyDetail
{
    public int ID { get; set; }

    public int? FamilyID { get; set; }

    public string? FatherName { get; set; }

    public string? FatherCNIC { get; set; }

    public int? FatherQualificationID { get; set; }

    public int? FatherOccupationID { get; set; }

    public string? FatherMobileNo { get; set; }

    public string? FatherWorkPhone { get; set; }

    public string? FatherEmail { get; set; }

    public string? MotherName { get; set; }

    public string? MotherCNIC { get; set; }

    public string? MotherPhoneNo { get; set; }

    public int? MotherQualificationID { get; set; }

    public int? MotherOccupationID { get; set; }

    public string? Password { get; set; }

    public bool? IsActive { get; set; }

    public string? HomePhone { get; set; }

    public string? HomeAddress { get; set; }


    public ICollection<Student> Students { get; set; } = new List<Student>();
}

public class ComplaintUpdate { public int ID { get; set; } }
public class AccountGroup { public int ID { get; set; } }
public class AccountLedger { public int ID { get; set; } }
public class AccountMaster { public int MasterID { get; set; } }
public class Account { public int ID { get; set; } }
public class AssignmentMaster { public int ID { get; set; } }
public class AssignmentSubmission { public int ID { get; set; } }
public class Branch { public int ID { get; set; } }
public class ClassSubject { public int ID { get; set; } }
public class Complaint { public int ID { get; set; } }
public class Degree { public int ID { get; set; } }
public class DegreeParameter { public int ID { get; set; } }
public class Designation
{
    public int ID { get; set; }
    public string? DesignationName { get; set; }
    public int? MustCheckinMinutesDifference { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? MustCheckinTime { get; set; }
    public DateTime? LeavingTime { get; set; }
}

public class DesignationTiming { public int ID { get; set; } }
public class EmpAttendance { public int Id { get; set; } }
public class Employee
{
    public int ID { get; set; }
    public string? Thumb_ID { get; set; }
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
}
public class EmployeeAsset { public int ID { get; set; } }
public class EmployeeAttachment { public int ID { get; set; } }
public class EmployeeAttendance
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public DateTime? Date { get; set; }
    /// <summary>Check-in time (stored as text, e.g. 07:34).</summary>
    public string? Time { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int? LateComings { get; set; }
    public decimal? CurrentSalary { get; set; }
    public decimal? LateDeduction { get; set; }
    public decimal? TodaySalary { get; set; }
    public string? UpdatedBy { get; set; }
    public string? ChangeJson { get; set; }
    public DateTime? CheckOutTime { get; set; }
}
public class EmployeeClass { public int ID { get; set; } }
public class EmployeeExperience { public int ID { get; set; } }
public class EmployeeQualification { public int ID { get; set; } }
public class EmployeeSalary { public int ID { get; set; } }
public class EmployeeSalaryComponent { public int ID { get; set; } }
public class EmployeeSubject { public int ID { get; set; } }
public class FeeType { public int ID { get; set; } }
public class FileDownload { public int ID { get; set; } }
public class FundCharge { public int ID { get; set; } }
public class Group { public int GROUP_ID { get; set; } }
public class HifzParaWiseStatus { public int ID { get; set; } }
public class Institute { public int ID { get; set; } }
public class Ledger { public int ID { get; set; } }
public class Level1 { public int LID1 { get; set; } }
public class Level2 { public int ID { get; set; } }
public class Level3 { public int ID { get; set; } }
public class Level4 { public int ID { get; set; } }
public class Loan { public int ID { get; set; } }
public class LoanDetail { public int ID { get; set; } }
public class Locality { public int ID { get; set; } }
public class NewsImage { public int ID { get; set; } }
public class Notification { public int ID { get; set; } }
public class Occupation { public int ID { get; set; } }
public class OnlineClassLink { public int ID { get; set; } }
public class Parameter { public int ID { get; set; } }
public class Receipt { public int ID { get; set; } }
public class Salary { public int ID { get; set; } }
public class SectionColor { public int ID { get; set; } }
public class Setup { public int ID { get; set; } }
public class StudentAccount { public int ID { get; set; } }
public class StudentFamily { public int ID { get; set; } }
public class StudentLog { public int ID { get; set; } }
public class StudentType { public int ID { get; set; } }
public class SubjectGroup { public int subject_group_id { get; set; } }
public class Teacher { public int ID { get; set; } }
public class TeacherAsset { public int ID { get; set; } }
public class TeacherAssetParameter { public int ID { get; set; } }
public class TeacherAttachment { public int ID { get; set; } }
public class TeacherAttendance { public int ID { get; set; } }
public class TeacherAttendanceInOut { public int ID { get; set; } }
public class TeacherQualification { public int ID { get; set; } }
public class TempAccountLedger { public int ID { get; set; } }
public class TempStaff { public int ID { get; set; } }
public class TempTransaction { public int ID { get; set; } }
public class TimeSlot { public int ID { get; set; } }
public class TimeTable { public int ID { get; set; } }
public class Transaction { public int ID { get; set; } }
public class TransactionMaster { public int ID { get; set; } }
public class User
{
    public int ID { get; set; }
    public string? Username { get; set; }
    public int? RoleID { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
}
public class UserRightsLegacy { public int S_NO { get; set; } }
public class UserRight { public int ID { get; set; } }
public class VoucherType { public int ID { get; set; } }
public class Role { public int ID { get; set; } }

namespace School.Infrastructure.Entities;

public class ComplaintUpdate { public int ID { get; set; } }
public class AccountGroup
{
    public int ID { get; set; }
    public int? MasterID { get; set; }
    public string? GroupID { get; set; }
    public string? GroupTitle { get; set; }
}

public class AccountLedger { public int ID { get; set; } }

public class AccountMaster
{
    public int MasterID { get; set; }
    public string? Title { get; set; }
}

public class Account
{
    public int ID { get; set; }
    public int? MasterID { get; set; }
    public string? GroupID { get; set; }
    public string? SubGroupID { get; set; }
    public string? AccountID { get; set; }
    public string? AccountTitle { get; set; }
    public DateTime? CreationDate { get; set; }
    public decimal? OpeningBalance { get; set; }
    public string? EntryUser { get; set; }
}
public class AssignmentMaster { public int ID { get; set; } }
public class AssignmentSubmission { public int ID { get; set; } }
public class Branch { public int ID { get; set; } }
public class ClassSubject { public int ID { get; set; } }
public class Complaint { public int ID { get; set; } }
public class Degree
{
    public int ID { get; set; }
    public string? DegreeName { get; set; }
    public string? Type { get; set; }
}
public class DegreeParameter
{
    public int ID { get; set; }
    public string? Type { get; set; }
    public string? DegreeTitle { get; set; }
    public bool? IsActive { get; set; }
}
public class DesignationTiming { public int ID { get; set; } }
public class EmpAttendance { public int Id { get; set; } }
public class EmployeeAttachment { public int ID { get; set; } }
public class EmployeeSalary
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
    public decimal? BasicSalary { get; set; }
    public decimal? NetSalary { get; set; }
}

public class EmployeeSalaryComponent
{
    public int ID { get; set; }
    public int EmpID { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public string? ComponentType { get; set; }
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
}
public class FeeType { public int ID { get; set; } }
public class FileDownload { public int ID { get; set; } }
public class FundCharge { public int ID { get; set; } }
public class Group { public int GROUP_ID { get; set; } }
public class HifzParaWiseStatus { public int ID { get; set; } }
public class Institute { public int ID { get; set; } }
public class Ledger { public int ID { get; set; } }
public class Level1 { public int LID1 { get; set; } }
public class Level2 { public int ID { get; set; } }
public class AccountType
{
    public int ID { get; set; }
    public int? LID2 { get; set; }
    public string? LID3 { get; set; }
    public string? Title3 { get; set; }
}

public class AccountSubtype
{
    public int ID { get; set; }
    public int? LID3 { get; set; }
    public string? LID4 { get; set; }
    public string? Title4 { get; set; }
}

public class Loan { public int ID { get; set; } }
public class LoanDetail { public int ID { get; set; } }
public class NewsImage { public int ID { get; set; } }
public class Notification { public int ID { get; set; } }
public class Occupation
{
    public int ID { get; set; }
    public string? OccupationName { get; set; }
    public bool? IsActive { get; set; }
}
public class OnlineClassLink { public int ID { get; set; } }
public class Parameter { public int ID { get; set; } }
public class Receipt { public int ID { get; set; } }
public class Salary { public int ID { get; set; } }
public class SectionColor
{
    public int ID { get; set; }
    public string? Color { get; set; }
    public int? BranchID { get; set; }
    public bool? IsActive { get; set; }
}
public class Setup { public int ID { get; set; } }
public class StudentAccount { public int ID { get; set; } }
public class StudentFamily
{
    public int ID { get; set; }
    public int? StudentID { get; set; }
    public int? FamilyID { get; set; }
}
public class StudentLog { public int ID { get; set; } }
public class StudentType { public int ID { get; set; } }
public class SubjectGroup
{
    public int subject_group_id { get; set; }
    public string? subject_group_name { get; set; }
    public bool? IsActive { get; set; }
}
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
public class TransactionMaster
{
    public int ID { get; set; }
    public string? VoucherNo { get; set; }
    public string? VoucherType { get; set; }
    public DateTime? TransactionDate { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? EntryUser { get; set; }
    public string? Status { get; set; }
}
public class User
{
    public int ID { get; set; }
    public string? Username { get; set; }
    public int? RoleID { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
    public bool IsSuperAdmin { get; set; }
}

public class UserRightsLegacy { public int S_NO { get; set; } }

public class UserRight
{
    public int ID { get; set; }
    public string? UserName { get; set; }
    public string? ModuleCode { get; set; }
    public string? ModuleName { get; set; }
    public bool? HasAccess { get; set; }
    public string? BranchCode { get; set; }
    public string? ModuleHead { get; set; }
}

public class VoucherType
{
    public int ID { get; set; }
    public string? VoucherTypeName { get; set; }
    public string? VoucherTypeDenotion { get; set; }
    public string? Prefix { get; set; }
}
public class Role { public int ID { get; set; } }

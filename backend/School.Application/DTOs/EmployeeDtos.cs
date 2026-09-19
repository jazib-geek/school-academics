using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class EmployeeListFilterDto
{
    public string? Search { get; set; }
    public string? Gender { get; set; }
    public int? DesignationId { get; set; }
    public bool? IsActive { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class EmployeeListItemDto
{
    public int ID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? FatherName { get; set; }
    public string? Thumb_ID { get; set; }
    public string? Gender { get; set; }
    public string? Contact1 { get; set; }
    public decimal? Salary { get; set; }
    public DateTime? Joining_Date { get; set; }
    public int? DesignationID { get; set; }
    public string? DesignationName { get; set; }
    public bool IsActive { get; set; }
}

public class EmployeeStatusUpdateDto
{
    public bool IsActive { get; set; }
}

public class EmployeeLookupDataDto
{
    public IReadOnlyList<EmployeeLookupItemDto> Designations { get; set; } = [];
    public IReadOnlyList<EmployeeLookupItemDto> Localities { get; set; } = [];
}

public class EmployeeLookupItemDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class EmployeeUpsertDto
{
    [Required, StringLength(150)] public string EmployeeName { get; set; } = string.Empty;
    [StringLength(150)] public string? Thumb_ID { get; set; }
    [StringLength(150)] public string? FatherName { get; set; }
    public DateTime? DoB { get; set; }
    [StringLength(150)] public string? Gender { get; set; }
    [StringLength(150)] public string? Religion { get; set; }
    public bool? IsMarried { get; set; }
    [StringLength(150)] public string? Blood_Group { get; set; }
    [StringLength(150)] public string? Permanent_Address { get; set; }
    [StringLength(150)] public string? HomePhone { get; set; }
    [Required, StringLength(150)] public string Contact1 { get; set; } = string.Empty;
    [StringLength(150)] public string? Contact2 { get; set; }
    [StringLength(150)] public string? Contact3 { get; set; }
    [StringLength(150)] public string? Email { get; set; }
    [StringLength(50)] public string? CNIC { get; set; }
    [StringLength(50)] public string? IdentityMark { get; set; }
    [StringLength(150)] public string? Refered_By { get; set; }
    public int? LocalityID { get; set; }
    public DateTime? Joining_Date { get; set; }
    [Required, Range(0, double.MaxValue)] public decimal? Salary { get; set; }
    [StringLength(500)] public string? ProfessionalDegree { get; set; }
    public bool? IsTrained { get; set; }
    [StringLength(500)] public string? VerifiedBy { get; set; }
    [StringLength(500)] public string? ApprovedBy { get; set; }
    public DateTime? Leaving_Date { get; set; }
    public bool? IsActive { get; set; } = true;
    [Required, Range(1, int.MaxValue)] public int? DesignationID { get; set; }
    [StringLength(100)] public string? MaritalStatus { get; set; }
    [Required, StringLength(100, MinimumLength = 6)] public string Password { get; set; } = string.Empty;

    public bool CanMarkStudentAttendance { get; set; }
    public bool CanViewStudentAttendance { get; set; }
    public bool CanViewSubjectAllocation { get; set; }
    public bool CanEditSubjectAllocation { get; set; }
    public bool CanViewTimetable { get; set; }
    public bool CanEditTimetable { get; set; }
    public bool CanViewDatesheet { get; set; }
    public bool CanEditDatesheet { get; set; }
    public bool CanViewDiary { get; set; }
    public bool CanEditDiary { get; set; }
    public bool CanAccessLessonPlan { get; set; }
    public bool CanViewStudentExamDetail { get; set; }
    public bool CanRecordStudentConduct { get; set; }
    public bool CanViewStudentConduct { get; set; }

    public List<EmployeeQualificationDto> Qualifications { get; set; } = [];
    public List<EmployeeExperienceDto> Experiences { get; set; } = [];
    public List<EmployeeAssetDto> Assets { get; set; } = [];
}

public class EmployeeDetailDto : EmployeeUpsertDto
{
    public int ID { get; set; }
    public string? DesignationName { get; set; }
    public string? LocalityName { get; set; }
}

public class EmployeeQualificationDto
{
    public int ID { get; set; }
    [StringLength(200)] public string? Degree { get; set; }
    [StringLength(200)] public string? Board { get; set; }
    [StringLength(200)] public string? Grade { get; set; }
    [StringLength(200)] public string? Marks { get; set; }
    public int? Year { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
}

public class EmployeeExperienceDto
{
    public int ID { get; set; }
    [StringLength(500)] public string? InstituteName { get; set; }
    [StringLength(100)] public string? Designation { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? DurationYears { get; set; }
}

public class EmployeeAssetDto
{
    public int ID { get; set; }
    [StringLength(500)] public string? AssetName { get; set; }
    public DateTime? DateOfIssue { get; set; }
    [Range(0, double.MaxValue)] public decimal? AssetWorth { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
}

public class EmployeeByThumbDto
{
    public int ID { get; set; }
    public string Thumb_ID { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public bool IsFingerprintEnrolled { get; set; }
    public string? MustCheckinTime { get; set; }
    public string? LeavingTime { get; set; }
}

public class BiometricTemplateDto
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
}

public class BiometricMarkAttendanceRequestDto
{
    [Required, StringLength(150)] public string EmployeeCode { get; set; } = string.Empty;
    public DateTime? CapturedAt { get; set; }
    [StringLength(50)] public string? DeviceId { get; set; }
}

public class BiometricMarkAttendanceResponseDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string PunchType { get; set; } = string.Empty;
    public string PunchTime { get; set; } = string.Empty;
    public string? MustCheckinTime { get; set; }
    public string? LeavingTime { get; set; }
    public int LateMinutes { get; set; }
    public int EarlyMinutes { get; set; }
    public int LateComings { get; set; }
    public string TimingMessage { get; set; } = string.Empty;
}

public class BiometricEnrollRequestDto
{
    [Required, StringLength(150)] public string EmployeeCode { get; set; } = string.Empty;
    [Required] public string Template { get; set; } = string.Empty;
    [StringLength(50)] public string? DeviceId { get; set; }
    public DateTime? CapturedAt { get; set; }
}

public class BiometricEnrollResponseDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime EnrolledAt { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class IdNameDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class StudentAdmissionLookupsDto
{
    public IReadOnlyList<IdNameDto> Localities { get; set; } = [];
    public IReadOnlyList<IdNameDto> Occupations { get; set; } = [];
    public IReadOnlyList<IdNameDto> Qualifications { get; set; } = [];
    public IReadOnlyList<IdNameDto> SubjectGroups { get; set; } = [];
    public IReadOnlyList<IdNameDto> FundTypes { get; set; } = [];
    public IReadOnlyList<string> Mediums { get; set; } = ["English", "Urdu"];
}

public class FamilySearchResultDto
{
    public int FamilyId { get; set; }
    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? FatherCNIC { get; set; }
    public string? MotherCNIC { get; set; }
    public string? FatherMobileNo { get; set; }
    public string? MotherPhoneNo { get; set; }
    public int? FatherOccupationID { get; set; }
    public int? MotherOccupationID { get; set; }
    public int? FatherQualificationID { get; set; }
    public int? MotherQualificationID { get; set; }
    public string? HomePhone { get; set; }
    public string? HomeAddress { get; set; }
    public int SiblingCount { get; set; }
}

public class StudentRegisterRequestDto
{
    [Required, StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [StringLength(250)]
    public string? NameInUrdu { get; set; }

    [StringLength(500)]
    public string? HomeAddress { get; set; }

    public int? LocalityId { get; set; }

    [StringLength(50)]
    public string? Caste { get; set; }

    [StringLength(50)]
    public string? Gender { get; set; }

    public bool IsOrphan { get; set; }
    public bool IsHafiz { get; set; }
    public bool IsCreditStudent { get; set; }

    [StringLength(500)]
    public string? Religion { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [StringLength(50)]
    public string? BFormNum { get; set; }

    public int? SubjectGroupId { get; set; }

    [StringLength(50)]
    public string? Medium { get; set; }

    [StringLength(150)]
    public string? PrevSchoolName { get; set; }

    [StringLength(50)]
    public string? PrevSchoolClass { get; set; }

    [StringLength(150)]
    public string? FatherName { get; set; }

    [StringLength(150)]
    public string? MotherName { get; set; }

    [StringLength(50)]
    public string? FatherCNIC { get; set; }

    [StringLength(50)]
    public string? MotherCNIC { get; set; }

    public int? FatherQualificationId { get; set; }
    public int? MotherQualificationId { get; set; }

    [StringLength(50)]
    public string? FatherMobileNo { get; set; }

    [StringLength(50)]
    public string? MotherPhoneNo { get; set; }

    public int? FatherOccupationId { get; set; }
    public int? MotherOccupationId { get; set; }

    [StringLength(50)]
    public string? HomePhone { get; set; }

    [StringLength(500)]
    public string? SpecialNotes { get; set; }

    [Required]
    public int FamilyCode { get; set; }

    [Required]
    public int ClassCompositeId { get; set; }

    [StringLength(100)]
    public string? SessionSpan { get; set; }

    public DateTime? RegDate { get; set; }

    /// <summary>Net tuition payable (editable on form).</summary>
    public decimal TuitionFee { get; set; }

    /// <summary>Class list fee (from section); stored as Student.Fee.</summary>
    public int? ClassFee { get; set; }

    public decimal FeeConcession { get; set; }

    public decimal AdmissionFee { get; set; }
    public decimal MiscCharges { get; set; }
    public decimal PrevBalance { get; set; }
    public decimal TransportCharges { get; set; }

    public bool GenerateTuitionFee { get; set; }
    public int? TuitionMonth { get; set; }
    public int? TuitionYear { get; set; }
    public decimal? TuitionGenerateAmount { get; set; }

    public bool GenerateFunds { get; set; }
    public int? FundYear { get; set; }
}

public class StudentRegisterResultDto
{
    public int RegId { get; set; }
    public int FamilyCode { get; set; }
    public string FullName { get; set; } = string.Empty;
    public bool FamilyDetailCreated { get; set; }
    public bool TuitionGenerated { get; set; }
    public bool FundsGenerated { get; set; }
}

/// <summary>Full admission form payload for edit prefill (fee fields are display-only).</summary>
public class StudentAdmissionDetailDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? NameInUrdu { get; set; }
    public string? HomeAddress { get; set; }
    public int? LocalityId { get; set; }
    public string? Caste { get; set; }
    public string? Gender { get; set; }
    public bool IsOrphan { get; set; }
    public bool IsHafiz { get; set; }
    public bool IsCreditStudent { get; set; }
    public string? Religion { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? BFormNum { get; set; }
    public int? SubjectGroupId { get; set; }
    public string? Medium { get; set; }
    public string? PrevSchoolName { get; set; }
    public string? PrevSchoolClass { get; set; }

    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? FatherCNIC { get; set; }
    public string? MotherCNIC { get; set; }
    public int? FatherQualificationId { get; set; }
    public int? MotherQualificationId { get; set; }
    public string? FatherMobileNo { get; set; }
    public string? MotherPhoneNo { get; set; }
    public int? FatherOccupationId { get; set; }
    public int? MotherOccupationId { get; set; }
    public string? HomePhone { get; set; }
    public string? SpecialNotes { get; set; }

    public int? FamilyCode { get; set; }
    public int? ClassCompositeId { get; set; }
    public string? ClassName { get; set; }
    public string? SessionSpan { get; set; }
    public DateTime? RegDate { get; set; }
    public string? BranchLabel { get; set; }
    public string? LocalityName { get; set; }
    public string? SubjectGroupName { get; set; }
    public string? FatherOccupationName { get; set; }
    public string? MotherOccupationName { get; set; }
    public string? FatherQualificationName { get; set; }
    public string? MotherQualificationName { get; set; }
    public bool? IsActive { get; set; }

    public int? ClassFee { get; set; }
    public decimal TuitionFee { get; set; }
    public decimal FeeConcession { get; set; }
    public decimal AdmissionFee { get; set; }
    public decimal MiscCharges { get; set; }
    public decimal PrevBalance { get; set; }
    public decimal TransportCharges { get; set; }
}

/// <summary>
/// Profile update request. Fee / class / family-code / session fields are intentionally omitted —
/// the service must never mutate fee-related student or ledger data on edit.
/// </summary>
public class StudentUpdateRequestDto
{
    [Required, StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [StringLength(250)]
    public string? NameInUrdu { get; set; }

    [StringLength(500)]
    public string? HomeAddress { get; set; }

    public int? LocalityId { get; set; }

    [StringLength(50)]
    public string? Caste { get; set; }

    [StringLength(50)]
    public string? Gender { get; set; }

    public bool IsOrphan { get; set; }
    public bool IsHafiz { get; set; }
    public bool IsCreditStudent { get; set; }

    [StringLength(500)]
    public string? Religion { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [StringLength(50)]
    public string? BFormNum { get; set; }

    public int? SubjectGroupId { get; set; }

    [StringLength(50)]
    public string? Medium { get; set; }

    [StringLength(150)]
    public string? PrevSchoolName { get; set; }

    [StringLength(50)]
    public string? PrevSchoolClass { get; set; }

    [StringLength(150)]
    public string? FatherName { get; set; }

    [StringLength(150)]
    public string? MotherName { get; set; }

    [StringLength(50)]
    public string? FatherCNIC { get; set; }

    [StringLength(50)]
    public string? MotherCNIC { get; set; }

    public int? FatherQualificationId { get; set; }
    public int? MotherQualificationId { get; set; }

    [StringLength(50)]
    public string? FatherMobileNo { get; set; }

    [StringLength(50)]
    public string? MotherPhoneNo { get; set; }

    public int? FatherOccupationId { get; set; }
    public int? MotherOccupationId { get; set; }

    [StringLength(50)]
    public string? HomePhone { get; set; }

    [StringLength(500)]
    public string? SpecialNotes { get; set; }

    /// <summary>Only office-use field allowed to change on edit.</summary>
    public DateTime? RegDate { get; set; }
}

public class StudentUpdateResultDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
}

public class StudentBulkEditRowDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? FatherName { get; set; }
    public string? FatherContact { get; set; }
    public string? HomeAddress { get; set; }
    public int? FamilyCode { get; set; }
    public int? ClassCompositeId { get; set; }
    public string? ClassName { get; set; }
    public int ClassFee { get; set; }
    public decimal TuitionFee { get; set; }
    public decimal FeeConcession { get; set; }
}

public class StudentBulkUpdateRequestDto
{
    [Required, StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [StringLength(150)]
    public string? FatherName { get; set; }

    [StringLength(50)]
    public string? FatherContact { get; set; }

    [StringLength(500)]
    public string? HomeAddress { get; set; }

    [Required]
    public int ClassCompositeId { get; set; }

    public decimal TuitionFee { get; set; }
}

public class StudentBulkUpdateResultDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public int ClassFee { get; set; }
    public decimal TuitionFee { get; set; }
    public decimal FeeConcession { get; set; }
    public int? ClassCompositeId { get; set; }
    public string? ClassName { get; set; }
    public int FamilyAddressUpdatedCount { get; set; }
}

public class StudentTransferRequestDto
{
    [Required]
    public int ClassCompositeId { get; set; }

    [Required, StringLength(1000, MinimumLength = 3)]
    public string Description { get; set; } = string.Empty;

    /// <summary>When true, also update tuition (and concession). Does not generate fee ledger rows.</summary>
    public bool UpdateTuitionFee { get; set; }

    public decimal? TuitionFee { get; set; }
}

public class StudentTransferResultDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public int? PreviousClassCompositeId { get; set; }
    public string? PreviousClassName { get; set; }
    public int? ClassCompositeId { get; set; }
    public string? ClassName { get; set; }
    public bool TuitionFeeUpdated { get; set; }
    public int ClassFee { get; set; }
    public decimal? PreviousTuitionFee { get; set; }
    public decimal? TuitionFee { get; set; }
    public decimal? PreviousFeeConcession { get; set; }
    public decimal? FeeConcession { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class StudentTuitionFeeUpdateRequestDto
{
    [Required]
    public decimal TuitionFee { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }
}

public class StudentActivationRequestDto
{
    [Required, StringLength(1000, MinimumLength = 3)]
    public string Description { get; set; } = string.Empty;
}

public class StudentActivationResultDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? LeaveDate { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class StudentTuitionFeeUpdateResultDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public int ClassFee { get; set; }
    public decimal PreviousTuitionFee { get; set; }
    public decimal TuitionFee { get; set; }
    public decimal PreviousFeeConcession { get; set; }
    public decimal FeeConcession { get; set; }
    public string? Description { get; set; }
}

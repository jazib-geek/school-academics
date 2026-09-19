using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentService
{
    Task<PagedResultDto<StudentListItemDto>> GetStudentsAsync(StudentListFilterDto filter);

    Task<IReadOnlyList<StudentFamilyMemberDto>> GetFamilyMembersAsync(int familyId);

    Task<StudentFeeBalanceDto> GetFeeBalanceAsync(int studentId, bool singleStudent = false);

    Task<ReceiveStudentFeeResponseDto> ReceiveFeeAsync(ReceiveStudentFeeRequestDto request, int? userId);

    Task<StudentAdmissionLookupsDto> GetAdmissionLookupsAsync(CancellationToken cancellationToken = default);

    Task<int> GetNextFamilyCodeAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FamilySearchResultDto>> SearchFamiliesAsync(string? query, CancellationToken cancellationToken = default);

    Task<FamilySearchResultDto> GetFamilyAsync(int familyId, CancellationToken cancellationToken = default);

    Task<StudentRegisterResultDto> RegisterStudentAsync(
        StudentRegisterRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<StudentAdmissionDetailDto> GetAdmissionDetailAsync(
        int studentId,
        CancellationToken cancellationToken = default);

    Task<StudentUpdateResultDto> UpdateStudentAsync(
        int studentId,
        StudentUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StudentBulkEditRowDto>> GetBulkEditStudentsAsync(
        int classCompositeId,
        CancellationToken cancellationToken = default);

    Task<StudentBulkUpdateResultDto> BulkUpdateStudentAsync(
        int studentId,
        StudentBulkUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<StudentTransferResultDto> TransferStudentAsync(
        int studentId,
        StudentTransferRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<StudentTuitionFeeUpdateResultDto> UpdateStudentTuitionFeeAsync(
        int studentId,
        StudentTuitionFeeUpdateRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<StudentActivationResultDto> ActivateStudentAsync(
        int studentId,
        StudentActivationRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task<StudentActivationResultDto> DeactivateStudentAsync(
        int studentId,
        StudentActivationRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);
}

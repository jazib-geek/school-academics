using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFundGenerateService
{
    Task<StudentFundAmountsDto> GetStudentFundsAsync(int studentId, CancellationToken cancellationToken = default);

    Task GenerateForStudentAsync(GenerateFundStudentRequestDto request, CancellationToken cancellationToken = default);

    Task GenerateBulkAsync(GenerateFundBulkRequestDto request, CancellationToken cancellationToken = default);
}

using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFeeGenerateService
{
    Task GenerateForAllAsync(
        GenerateFeeAllRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task GenerateForStudentAsync(
        GenerateFeeStudentRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);
}

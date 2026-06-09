using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IClassDiaryService
{
    Task<IReadOnlyList<ClassDiaryListingDto>> GetListingAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClassDiaryListingDto>> GetByStudentIdAsync(
        int studentId,
        CancellationToken cancellationToken = default);

    Task<ClassDiaryDto> UploadDiaryAsync(
        int classId,
        DateOnly date,
        IReadOnlyList<ClassDiaryFileUpload> files,
        string? description,
        CancellationToken cancellationToken = default);

    Task DeleteDiaryAsync(
        int classId,
        DateOnly date,
        CancellationToken cancellationToken = default);
}

public class ClassDiaryFileUpload
{
    public Stream Content { get; set; } = Stream.Null;
    public string FileName { get; set; } = "diary.jpg";
    public string? ContentType { get; set; }
    public long SizeBytes { get; set; }
}

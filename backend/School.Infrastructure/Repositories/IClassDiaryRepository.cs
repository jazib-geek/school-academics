using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public interface IClassDiaryRepository
{
    Task<IReadOnlyList<ClassDiary>> GetByClassAndDateAsync(
        int classId,
        DateOnly date,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClassDiary>> GetByClassAsync(
        int classId,
        CancellationToken cancellationToken = default);

    Task<int?> GetClassIdForStudentAsync(int studentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClassDiary>> GetByClassWithClassAsync(
        int classId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClassDiary>> GetAllWithClassAsync(
        CancellationToken cancellationToken = default);

    Task AddRangeAsync(IEnumerable<ClassDiary> entities, CancellationToken cancellationToken = default);

    void RemoveRange(IEnumerable<ClassDiary> entities);

    Task<bool> ClassExistsAsync(int classId, CancellationToken cancellationToken = default);

    Task<string?> GetClassNameAsync(int classId, CancellationToken cancellationToken = default);

    Task<string?> GetEmployeeNameAsync(int employeeId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

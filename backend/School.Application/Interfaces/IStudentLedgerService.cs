using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentLedgerService
{
    Task<List<StudentLedgerDto>> GetStudentLedgerAsync(int studentId);
}

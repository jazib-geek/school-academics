using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IClassService
{
    Task<List<ClassLookupDto>> GetClassesAsync();

    /// <summary>Class levels from tblClass (for daily diary and similar features).</summary>
    Task<List<ClassLookupDto>> GetClassLevelsAsync();
}

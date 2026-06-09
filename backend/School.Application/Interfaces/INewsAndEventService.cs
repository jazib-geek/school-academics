using School.Application.DTOs;

namespace School.Application.Interfaces
{
    public interface INewsAndEventService
    {
        Task<List<NewsAndEventDto>> GetActiveAsync(bool onlyHome = false);
    }
}

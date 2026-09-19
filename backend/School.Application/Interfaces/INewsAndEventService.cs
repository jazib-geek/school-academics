using School.Application.DTOs;

namespace School.Application.Interfaces
{
    public interface INewsAndEventService
    {
        Task<List<NewsAndEventDto>> GetActiveAsync(bool onlyHome = false);

        Task<IReadOnlyList<NewsAndEventManageDto>> GetManageListAsync(CancellationToken cancellationToken = default);

        Task<NewsAndEventManageDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

        Task<NewsAndEventManageDto> CreateAsync(UpsertNewsAndEventRequestDto request, CancellationToken cancellationToken = default);

        Task<NewsAndEventManageDto> UpdateAsync(int id, UpsertNewsAndEventRequestDto request, CancellationToken cancellationToken = default);

        Task SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    }
}

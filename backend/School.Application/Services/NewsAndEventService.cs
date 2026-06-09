using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services
{
    public class NewsAndEventService : INewsAndEventService
    {
        private readonly AppDbContext _context;

        public NewsAndEventService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<NewsAndEventDto>> GetActiveAsync(bool onlyHome = false)
        {
            var query = _context.NewsAndEvents
                .Where(x => x.IsActive == true && x.Type == "Announcement");

            if (onlyHome)
            {
                query = query.Where(x => x.ShowOnHome == true);
            }

            return await query
                .OrderByDescending(x => x.Date)
                .Select(x => new NewsAndEventDto
                {
                    Id = x.ID,
                    Date = x.Date,
                    Title = x.Title,
                    Type = x.Type,
                    Description = x.Description,
                    ImagePath = x.ImagePath,
                    ShowOnHome = x.ShowOnHome
                })
                .ToListAsync();
        }
    }
}

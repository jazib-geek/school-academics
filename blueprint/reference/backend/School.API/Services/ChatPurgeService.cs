using Microsoft.EntityFrameworkCore;
using School.Application.Services;
using School.Infrastructure.Data;

namespace School.API.Services;

/// <summary>Hourly delete of chat messages older than the retention window on every campus DB.</summary>
public class ChatPurgeService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<ChatPurgeService> _logger;

    public ChatPurgeService(
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<ChatPurgeService> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(Interval);
        do
        {
            await PurgeAllCampusesAsync(stoppingToken);
        }
        while (await WaitNextAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitNextAsync(PeriodicTimer timer, CancellationToken stoppingToken)
    {
        try
        {
            return await timer.WaitForNextTickAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }

    private async Task PurgeAllCampusesAsync(CancellationToken stoppingToken)
    {
        var campuses = _configuration.GetSection("CampusSettings:Campuses")
            .GetChildren()
            .Where(x => !string.IsNullOrWhiteSpace(x.Key) && !string.IsNullOrWhiteSpace(x.Value))
            .Where(x => !_environment.IsProduction()
                        || !string.Equals(x.Key, "local", StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var campus in campuses)
        {
            if (stoppingToken.IsCancellationRequested)
                return;

            try
            {
                var options = new DbContextOptionsBuilder<AppDbContext>()
                    .UseSqlServer(campus.Value!)
                    .Options;
                await using var context = new AppDbContext(options);
                var deleted = await ChatService.PurgeExpiredAsync(context, stoppingToken);
                if (deleted > 0)
                    _logger.LogInformation("Chat purge removed {Count} messages on campus {Campus}.", deleted, campus.Key);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chat purge failed on campus {Campus}.", campus.Key);
            }
        }
    }
}

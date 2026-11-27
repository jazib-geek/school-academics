using Microsoft.Extensions.Options;
using School.Application.Common;
using School.Application.Services;

namespace School.API.Services;

public class ParentPushWorker(IServiceScopeFactory scopes, IConfiguration configuration,
    IOptions<ParentPushOptions> options, IHostEnvironment environment,
    ILogger<ParentPushWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled) return;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(20));
        try
        {
            do
            {
                foreach (var campus in configuration.GetSection("CampusSettings:Campuses").GetChildren()
                    .Where(c => !string.IsNullOrWhiteSpace(c.Value))
                    .Where(c => !environment.IsProduction() || c.Key != "local"))
                {
                    try
                    {
                        using var scope = scopes.CreateScope();
                        var tenant = scope.ServiceProvider.GetRequiredService<TenantContext>();
                        tenant.Campus = campus.Key.ToLowerInvariant();
                        tenant.ConnectionString = campus.Value!;
                        await scope.ServiceProvider.GetRequiredService<ParentPushDispatcher>()
                            .DispatchAsync(tenant.Campus, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch (Exception ex)
                    {
                        logger.LogWarning("Parent push worker failed on campus {Campus} ({ErrorType}).",
                            campus.Key, ex.GetType().Name);
                    }
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}

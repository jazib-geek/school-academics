using System.Collections.Concurrent;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.Application.Services;

public class EmployeeSalaryProgressStore : IEmployeeSalaryProgressStore
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);
    private readonly ConcurrentDictionary<string, EmployeeSalaryProgressSnapshot> _items = new(StringComparer.Ordinal);

    public void Start(string generationId, int month, int year)
    {
        Cleanup();
        _items[generationId] = new EmployeeSalaryProgressSnapshot
        {
            GenerationId = generationId,
            Month = month,
            Year = year,
            Percent = 0,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }

    public void SetPercent(string generationId, int percent)
    {
        if (!_items.TryGetValue(generationId, out var item))
            return;

        item.Percent = Math.Clamp(percent, 0, 100);
    }

    public void Complete(string generationId, EmployeeSalaryCalculationResultDto result)
    {
        if (!_items.TryGetValue(generationId, out var item))
            return;

        item.Percent = 100;
        item.IsDone = true;
        item.Result = result;
    }

    public void Fail(string generationId, string error)
    {
        if (!_items.TryGetValue(generationId, out var item))
            return;

        item.IsFailed = true;
        item.IsDone = true;
        item.Error = error;
        item.Percent = 100;
    }

    public EmployeeSalaryProgressSnapshot? Get(string generationId)
    {
        Cleanup();
        return _items.TryGetValue(generationId, out var item) ? item : null;
    }

    private void Cleanup()
    {
        var cutoff = DateTime.UtcNow - Ttl;
        foreach (var pair in _items)
        {
            if (pair.Value.CreatedAtUtc < cutoff)
                _items.TryRemove(pair.Key, out _);
        }
    }
}
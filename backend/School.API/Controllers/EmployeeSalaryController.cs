using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/employee-salary")]
public class EmployeeSalaryController : ControllerBase
{
    private readonly IEmployeeSalaryService _salaryService;
    private readonly IEmployeeSalaryProgressStore _progressStore;

    public EmployeeSalaryController(
        IEmployeeSalaryService salaryService,
        IEmployeeSalaryProgressStore progressStore)
    {
        _salaryService = salaryService;
        _progressStore = progressStore;
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> StartCalculation(
        [FromBody] StartEmployeeSalaryCalculationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var generationId = await _salaryService.StartCalculationAsync(
                request.Month,
                request.Year,
                request.SundaysToInclude,
                cancellationToken);

            return Ok(ApiResponse<StartEmployeeSalaryCalculationResponseDto>.SuccessResponse(
                new StartEmployeeSalaryCalculationResponseDto { GenerationId = generationId }));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("recalculate-employee")]
    public async Task<IActionResult> RecalculateEmployee(
        [FromBody] RecalculateEmployeeSalaryRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await _salaryService.RecalculateEmployeeAsync(
                request.EmployeeId,
                request.Month,
                request.Year,
                request.SundaysToInclude,
                cancellationToken);
            return Ok(ApiResponse<EmployeeSalaryRowDto>.SuccessResponse(row, "Salary updated."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("calculate/{generationId}/status")]
    public IActionResult GetStatus(string generationId)
    {
        var snapshot = _progressStore.Get(generationId);
        if (snapshot == null)
            return NotFound(ApiResponse<object>.FailureResponse("Calculation was not found."));

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            percent = snapshot.Percent,
            done = snapshot.IsDone,
            failed = snapshot.IsFailed,
            error = snapshot.Error,
        }));
    }

    [HttpGet("calculate/{generationId}/progress")]
    public async Task ProgressStream(string generationId, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.ContentType = "text/event-stream";

        var lastPercent = -1;
        while (!cancellationToken.IsCancellationRequested)
        {
            var snapshot = _progressStore.Get(generationId);
            if (snapshot == null)
            {
                await WriteEventAsync(new { error = "Calculation was not found." }, cancellationToken);
                break;
            }

            if (snapshot.Percent != lastPercent)
            {
                lastPercent = snapshot.Percent;
                await WriteEventAsync(new { percent = snapshot.Percent }, cancellationToken);
            }

            if (snapshot.IsFailed)
            {
                await WriteEventAsync(new { done = true, failed = true, error = snapshot.Error }, cancellationToken);
                break;
            }

            if (snapshot.IsDone)
            {
                await WriteEventAsync(new { done = true, percent = 100 }, cancellationToken);
                break;
            }

            await Task.Delay(200, cancellationToken);
        }
    }

    [HttpGet("calculate/{generationId}")]
    public async Task<IActionResult> GetResult(string generationId, CancellationToken cancellationToken)
    {
        var snapshot = _progressStore.Get(generationId);
        if (snapshot == null)
            return NotFound(ApiResponse<object>.FailureResponse("Calculation was not found."));

        if (snapshot.IsFailed)
            return BadRequest(ApiResponse<object>.FailureResponse(snapshot.Error ?? "Calculation failed."));

        if (!snapshot.IsDone || snapshot.Result == null)
            return BadRequest(ApiResponse<object>.FailureResponse("Calculation is still in progress."));

        var result = await _salaryService.GetCalculationResultAsync(generationId, cancellationToken)
                     ?? snapshot.Result;

        return Ok(ApiResponse<EmployeeSalaryCalculationResultDto>.SuccessResponse(result));
    }

    private async Task WriteEventAsync(object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload);
        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
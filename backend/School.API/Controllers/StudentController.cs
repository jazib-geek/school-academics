using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class StudentController : ControllerBase
{
    private readonly IStudentLedgerService _ledgerService;
    private readonly IStudentService _studentService;

    public StudentController(IStudentLedgerService ledgerService, IStudentService studentService)
    {
        _ledgerService = ledgerService;
        _studentService = studentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllStudents([FromQuery] StudentListFilterDto filter)
    {
        var result = await _studentService.GetStudentsAsync(filter);
        return Ok(ApiResponse<PagedResultDto<StudentListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("family/{familyId:int}")]
    public async Task<IActionResult> GetStudentsByFamily(int familyId)
    {
        var result = await _studentService.GetFamilyMembersAsync(familyId);
        return Ok(ApiResponse<IReadOnlyList<StudentFamilyMemberDto>>.SuccessResponse(result));
    }

    [HttpGet("{studentId}/ledger")]
    public async Task<IActionResult> GetLedger(int studentId)
    {
        var result = await _ledgerService.GetStudentLedgerAsync(studentId);

        return Ok(ApiResponse<object>.SuccessResponse(result));
    }
}

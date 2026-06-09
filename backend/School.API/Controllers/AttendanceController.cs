using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _service;

        public AttendanceController(IAttendanceService service)
        {
            _service = service;
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentAttendance(int studentId, [FromQuery] int? month, [FromQuery] int? year)
        {
            var result = await _service.GetStudentAttendanceAsync(studentId, month, year);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        [HttpGet("employee-stats")]
        public async Task<IActionResult> GetEmployeeStats([FromQuery] DateTime? date)
        {
            var result = await _service.GetEmployeeAttendanceStatsAsync(date);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        [HttpGet("report")]
        public async Task<IActionResult> GetAttendanceReport(
            [FromQuery] DateTime dateFrom,
            [FromQuery] DateTime dateTo,
            [FromQuery] int? classSectionCompositeId,
            [FromQuery] string? status)
        {
            try
            {
                var result = await _service.GetAttendanceReportAsync(dateFrom, dateTo, classSectionCompositeId, status);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        [HttpGet("class-sheet")]
        public async Task<IActionResult> GetClassAttendanceSheet([FromQuery] DateTime date, [FromQuery] int classSectionCompositeId)
        {
            try
            {
                var result = await _service.GetClassAttendanceSheetAsync(date, classSectionCompositeId);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        [HttpGet("school-sheet")]
        public async Task<IActionResult> GetSchoolAttendanceSheet([FromQuery] DateTime date)
        {
            try
            {
                var result = await _service.GetSchoolAttendanceSheetAsync(date);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        [HttpPost("class-sheet/status-all")]
        public async Task<IActionResult> SetClassAttendanceStatusForAll([FromBody] ClassAttendanceBulkStatusRequestDto request)
        {
            try
            {
                var result = await _service.SetClassAttendanceStatusForAllAsync(request.Date, request.ClassSectionCompositeId, request.Status);
                return Ok(ApiResponse<object>.SuccessResponse(result, "Attendance updated."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        [HttpPost("school-sheet/present-all")]
        public async Task<IActionResult> SetSchoolAttendancePresentForAll([FromBody] SchoolAttendancePresentAllRequestDto request)
        {
            try
            {
                var result = await _service.SetSchoolAttendancePresentForAllAsync(request.Date);
                return Ok(ApiResponse<object>.SuccessResponse(result, "Attendance updated."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        [HttpPost("class-sheet/student-status")]
        public async Task<IActionResult> SetStudentAttendanceStatus([FromBody] ClassAttendanceStudentStatusRequestDto request)
        {
            try
            {
                var result = await _service.SetStudentAttendanceStatusAsync(
                    request.Date,
                    request.ClassSectionCompositeId,
                    request.StudentId,
                    request.Status);

                return Ok(ApiResponse<object>.SuccessResponse(result, "Attendance updated."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }
    }
}

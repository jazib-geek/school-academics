using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;

        public DashboardController(IDashboardService service)
        {
            _service = service;
        }

        // GET: api/Dashboard/5
        [HttpGet("{studentId}")]
        public async Task<IActionResult> GetDashboard(int studentId)
        {
            var result = await _service.GetDashboardAsync(studentId);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/all-campuses
        [HttpGet("all-campuses")]
        public async Task<IActionResult> GetAllCampusesDashboard()
        {
            var result = await _service.GetAllCampusesDashboardAsync();
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/all-campuses/fee-collection-by-date?date=2026-06-11
        [HttpGet("all-campuses/fee-collection-by-date")]
        public async Task<IActionResult> GetAllCampusesFeeCollectionByDate([FromQuery] DateTime? date)
        {
            var selectedDate = (date ?? DateTime.Today).Date;
            var result = await _service.GetAllCampusesFeeCollectionByDateAsync(selectedDate);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/all-campuses/expenses-by-interval?days=30
        [HttpGet("all-campuses/expenses-by-interval")]
        public async Task<IActionResult> GetAllCampusesExpensesByInterval([FromQuery] int? days)
        {
            var selectedDays = days.GetValueOrDefault(30);
            var allowedDays = new[] { 1, 7, 15, 30, 60 };
            if (!allowedDays.Contains(selectedDays))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Days must be one of: 1, 7, 15, 30, 60."));
            }

            var result = await _service.GetAllCampusesExpenseByIntervalAsync(selectedDays);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/all-campuses/fee-balance-by-month?month=6&year=2026
        [HttpGet("all-campuses/fee-balance-by-month")]
        public async Task<IActionResult> GetAllCampusesFeeBalanceByMonth([FromQuery] int? month, [FromQuery] int? year)
        {
            var today = DateTime.Today;
            var selectedMonth = month.GetValueOrDefault(today.Month);
            var selectedYear = year.GetValueOrDefault(today.Year);

            if (selectedMonth < 1 || selectedMonth > 12)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Month must be between 1 and 12."));
            }

            var result = await _service.GetAllCampusesFeeBalanceByMonthAsync(selectedMonth, selectedYear);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/all-campuses/admissions-by-month?month=6&year=2026
        [HttpGet("all-campuses/admissions-by-month")]
        public async Task<IActionResult> GetAllCampusesAdmissionsByMonth([FromQuery] int? month, [FromQuery] int? year)
        {
            var today = DateTime.Today;
            var selectedMonth = month.GetValueOrDefault(today.Month);
            var selectedYear = year.GetValueOrDefault(today.Year);

            if (selectedMonth < 1 || selectedMonth > 12)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Month must be between 1 and 12."));
            }

            var result = await _service.GetAllCampusesAdmissionsByMonthAsync(selectedMonth, selectedYear);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/Dashboard/campus/main/left-students-by-month?month=7&year=2026
        [HttpGet("campus/{campus}/left-students-by-month")]
        public async Task<IActionResult> GetCampusLeftStudentsByMonth(string campus, [FromQuery] int? month, [FromQuery] int? year)
        {
            var today = DateTime.Today;
            var selectedMonth = month.GetValueOrDefault(today.Month);
            var selectedYear = year.GetValueOrDefault(today.Year);

            if (selectedMonth < 1 || selectedMonth > 12)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Month must be between 1 and 12."));
            }

            try
            {
                var result = await _service.GetCampusLeftStudentsByMonthAsync(campus, selectedMonth, selectedYear);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        // GET: api/Dashboard/campus/main
        [HttpGet("campus/{campus}")]
        public async Task<IActionResult> GetCampusDashboard(string campus)
        {
            try
            {
                var result = await _service.GetCampusDashboardAsync(campus);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        // GET: api/Dashboard/campus/main/expense-details?days=30
        [HttpGet("campus/{campus}/expense-details")]
        public async Task<IActionResult> GetCampusExpenseDetails(string campus, [FromQuery] int? days)
        {
            var selectedDays = days.GetValueOrDefault(30);
            var allowedDays = new[] { 1, 7, 15, 30, 60 };
            if (!allowedDays.Contains(selectedDays))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Days must be one of: 1, 7, 15, 30, 60."));
            }

            try
            {
                var result = await _service.GetCampusExpenseDetailsAsync(campus, selectedDays);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        // GET: api/Dashboard/campus/main/fee-breakdown-by-month?month=6&year=2026
        [HttpGet("campus/{campus}/fee-breakdown-by-month")]
        public async Task<IActionResult> GetCampusFeeBreakdownByMonth(string campus, [FromQuery] int? month, [FromQuery] int? year)
        {
            var today = DateTime.Today;
            var selectedMonth = month.GetValueOrDefault(today.Month);
            var selectedYear = year.GetValueOrDefault(today.Year);

            if (selectedMonth < 1 || selectedMonth > 12)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Month must be between 1 and 12."));
            }

            try
            {
                var result = await _service.GetCampusFeeBreakdownByMonthAsync(campus, selectedMonth, selectedYear);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }

        // GET: api/Dashboard/campus/main/admissions-vs-left-trend?days=60
        [HttpGet("campus/{campus}/admissions-vs-left-trend")]
        public async Task<IActionResult> GetCampusAdmissionsVsLeftTrend(string campus, [FromQuery] int? days)
        {
            var selectedDays = days.GetValueOrDefault(30);
            if (selectedDays < 1 || selectedDays > 300)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Days must be between 1 and 300."));
            }

            try
            {
                var result = await _service.GetCampusAdmissionsVsLeftTrendAsync(campus, selectedDays);
                return Ok(ApiResponse<object>.SuccessResponse(result));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
            }
        }
    }
}

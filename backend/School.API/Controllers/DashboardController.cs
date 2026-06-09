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
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NewsAndEventsController : ControllerBase
    {
        private readonly INewsAndEventService _service;

        public NewsAndEventsController(INewsAndEventService service)
        {
            _service = service;
        }

        // GET: api/NewsAndEvents
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetActiveAsync(false);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }

        // GET: api/NewsAndEvents/home
        [HttpGet("home")]
        public async Task<IActionResult> GetHome()
        {
            var result = await _service.GetActiveAsync(true);
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
    }
}

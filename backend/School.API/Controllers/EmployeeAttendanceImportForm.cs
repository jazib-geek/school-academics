using Microsoft.AspNetCore.Http;

namespace School.API.Controllers;

public class EmployeeAttendanceImportForm
{
    public IFormFile? File { get; set; }
    public string? Rules { get; set; }
}

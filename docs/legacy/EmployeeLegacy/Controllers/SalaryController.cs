using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Caching;
using System.Threading.Tasks;
using System.Web;
using System.Web.Caching;
using System.Web.Mvc;
using Data.BLL.Employee;
using Data.Viewmodel.Employee;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNet.SignalR;
using Student.Helper.Hubs;

namespace Student.Areas.Employee.Controllers
{
    public class SalaryController : Controller
    {
        private static readonly MemoryCache Cache = MemoryCache.Default;
        // GET: Employee/Salary
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult Generate()
        {
            return View();
        }
        public ActionResult ThisMonth()
        {
            return View();
        }
        public ActionResult _ThisMonth(int m, int y)
        {
            // Generate for all 
            var employeeList = List.All();
            foreach (var item in employeeList)
            {
                Salary.GenerateAndSaveSalary(item.ID, m, y);
            }

            // var lst = Salary.GetEmployeeSalaryByMonth(m, y);

            return PartialView();
        }

        //[HttpPost]
        //public ActionResult StartGeneration(int month, int year, string connectionId)
        //{
        //    if (string.IsNullOrEmpty(connectionId))
        //    {
        //        return new HttpStatusCodeResult(400, "Connection ID is required.");
        //    }

        //    GenerateSalariesAsync(month, year, connectionId); // Fire and forget
        //    return new HttpStatusCodeResult(200);
        //}
        [HttpPost]
        public ActionResult StartGeneration(int month, int year, string generationId)
        {
            if (string.IsNullOrWhiteSpace(generationId))
                return new HttpStatusCodeResult(400, "Missing generationId");

            SalaryProgressTracker.Remove(generationId);
            GenerateSalariesAsync(month, year, generationId);
            return new HttpStatusCodeResult(200);
        }

        public ActionResult GetSalaryProgress(string generationId)
        {
            if (string.IsNullOrWhiteSpace(generationId))
                return Json(0, JsonRequestBehavior.AllowGet);

            var percent = SalaryProgressTracker.Get(generationId);
            return Json(percent, JsonRequestBehavior.AllowGet);
        }

        public ActionResult GetGeneratedSalaryList(string generationId)
        {
            var salaryList = MemoryCache.Default.Get($"SalaryList_{generationId}") as List<EmployeeSalaryViewModel>;
            return PartialView("_ThisMonth", salaryList ?? new List<EmployeeSalaryViewModel>());
        }

        public static void GenerateSalariesAsync(int month, int year, string sessionId)
        {
            MemoryCache.Default.Remove($"SalaryList_{sessionId}");
            SalaryProgressTracker.Remove(sessionId);

            Task.Run(() =>
            {
                var hubContext = GlobalHost.ConnectionManager.GetHubContext<SalaryHub>();
                var employees = List.All();
                int total = employees.Count;
                int processed = 0;

                var attendanceList = Salary.GetEmployeeAttendanceList(month, year);
                var salaryList = new List<EmployeeSalaryViewModel>();

                try
                {
                    foreach (var employee in employees)
                    {
                        try
                        {
                            // Filter attendance just for current employee
                            var empAttendance = attendanceList
                                .Where(x => x.EmpID == employee.ID)
                                .ToList();

                            // Calculate salary
                            var salary = Salary.GetSingleEmployeeSalary(empAttendance, employee.ID, month, year);

                            // Save salary components
                            Salary.GenerateAndSaveSalary(employee.ID, month, year);

                            if (salary != null)
                                salaryList.Add(salary);
                        }
                        catch (Exception exPerEmployee)
                        {
                            // Optionally log or handle per-employee error
                            continue; // Don't stop processing
                        }

                        // Progress update
                        processed++;
                        int progress = (int)((double)processed / total * 100);
                        SalaryProgressTracker.Set(sessionId, progress);

                        // Optional: simulate delay for testing frontend updates
                        //  System.Threading.Thread.Sleep(200); // REMOVE in production
                    }

                    // Save final result
                    Cache.Set($"SalaryList_{sessionId}", salaryList, DateTimeOffset.UtcNow.AddMinutes(10));
                    SalaryProgressTracker.Set(sessionId, 100);

                    // Final signal (optional if not using SignalR)
                   // hubContext.Clients.Client(sessionId).onSalaryGenerationComplete(sessionId);
                }
                catch (Exception exGlobal)
                {
                    SalaryProgressTracker.Set(sessionId, -1);
                    hubContext.Clients.Client(sessionId).onSalaryGenerationError($"Fatal error: {exGlobal.Message}");
                }
            });
        }

        //public ActionResult GetGeneratedSalaryList(string connectionId)
        //{
        //   // var connectionId = HttpContext.Request.Headers["X-SignalR-ConnectionId"];
        //    var salaryList = MemoryCache.Default.Get($"SalaryList_{connectionId}") as List<EmployeeSalaryViewModel>;
        //    return PartialView("_ThisMonth", salaryList ?? new List<EmployeeSalaryViewModel>());
        //}
    }
    public static class SalaryProgressTracker
    {
        private static readonly ObjectCache Cache = MemoryCache.Default;

        public static void Set(string sessionId, int progress)
        {
            Cache.Set($"SalaryProgress_{sessionId}", progress, DateTimeOffset.UtcNow.AddMinutes(10));
        }

        public static int Get(string sessionId)
        {
            return Cache.Contains($"SalaryProgress_{sessionId}")
                ? (int)Cache.Get($"SalaryProgress_{sessionId}")
                : 0;
        }

        public static void Remove(string sessionId)
        {
            Cache.Remove($"SalaryProgress_{sessionId}");
        }
    }


}
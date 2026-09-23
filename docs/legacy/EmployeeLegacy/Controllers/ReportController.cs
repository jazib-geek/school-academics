using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Attendance;
using Data.BLL.Employee;

namespace Student.Areas.Employee.Controllers
{
    public class ReportController : Controller
    {
        // GET: Employee/Report
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult Monthly(int? m, int? y)
        {
            ViewBag.m = m;
            ViewBag.y = y;

            return View();
        }
        public ActionResult _Monthly(int m, int y)
        {
            ViewBag.m = m;
            ViewBag.y = y;

            var lst = Data.BLL.Employee.Attendance.MonthlySummary(m, y);

            return PartialView(lst);
        }
    }
}
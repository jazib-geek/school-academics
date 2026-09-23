using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Employee;

namespace Student.Areas.Employee.Controllers
{
    public class SettingController : Controller
    {
        // GET: Employee/Setting
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult Class()
        {
            return View();
        }
        public ActionResult _Class(int? EmployeeID)
        {
            var lst = EmployeeClass.ListOfClassByEmployee(EmployeeID);

            return PartialView(lst);
        }
    }
}
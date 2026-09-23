using Data.BLL.Employee;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using static Data.Helper.Constants;

namespace Student.Areas.Employee.Controllers
{
    public class LoanController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult EmployeeLoan()
        {
            return View();
        }
        public ActionResult _EmployeeLoan(int EmpID)
        {
            {
                var lst = SalaryComponent.GetEmployeeSalaryComponents(EmpID)
                          .Where(x => x.ComponentType == SalaryComponentTypes.Loan || x.ComponentType == SalaryComponentTypes.SecurityCharges || x.ComponentType == SalaryComponentTypes.Bonus || x.ComponentType == SalaryComponentTypes.Fine || x.ComponentType == SalaryComponentTypes.Advance)
                          .ToList();

                return PartialView(lst);
            }
        }
    }
}
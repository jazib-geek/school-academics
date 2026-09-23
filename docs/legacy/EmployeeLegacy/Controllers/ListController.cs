using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Employee;

namespace Student.Areas.Employee.Controllers
{
    public class ListController : Controller
    {
        // GET: Employee/List
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult _Index(string gender)
        {
            var lst = List.All();

            if (!string.IsNullOrEmpty(gender))
            {
                lst = lst.Where(x => x.Gender == gender).ToList();
            }

            return PartialView("_Index" , lst);
        }
    }
}
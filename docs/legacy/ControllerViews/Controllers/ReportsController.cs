using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Accounts;

namespace Student.Areas.Accounts.Controllers
{
    public class ReportsController : Controller
    {
        // GET: Accounts/Reports
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult TrialBalance()
        {
            return View();
        }
        public ActionResult _TrialBalance(DateTime? From, DateTime? To)
        {
            var lst = Data.BLL.Accounts.TrialBalance.GetByDate(From, To);
            ViewBag.From = From;
            ViewBag.To = To;
            return PartialView(lst);
        }

        public ActionResult PrintTrialBalance(DateTime? From, DateTime? To)
        {
            var lst = Data.BLL.Accounts.TrialBalance.GetByDate(From, To);
            ViewBag.From = From;
            ViewBag.To = To;

            return View(lst);
        }
    }
}
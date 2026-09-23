using System;
using System.Collections.Generic;
using System.Linq;
using Data.Viewmodel;
using Data.BLL;
using System.Web.Mvc;

namespace Student.Areas.Fee.Controllers
{
    public class GenerateController : Controller
    {
        // GET: Fee/Generate
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult PrevBalance()
        {
            return View();
        }

        public ActionResult Nullify()
        {
            return View();
        }

        //////////////// AJAX /////////////////
        [HttpPost]
        public ActionResult ForAllClasses(int? month, int? year)
        {
            // Data.BLL.FeeAndFund.Generate.TutionFee(month, year);

            Data.BLL.FeeAndFund.Generate.TutionFee_SP(month, year, year.ToString());

            return Json(new { msg = "success" });
        }

        public ActionResult ForThisStudent(int? id, int? month, int? year, decimal? amount)
        {
            Data.BLL.FeeAndFund.Generate.TutionFee(id, month, year, amount);

            return Json(new { msg = "success" });
        }


        // Previous Balance
        [HttpPost]
        public ActionResult PrevBalance(int ID, decimal? Amount)
        {
           
            return Json(new { msg = "success" });
        }

        // NULLIFY FEE
        // Previous Balance
        [HttpPost]
        public ActionResult Nullify(int? month, int? year)
        {
         //   Data.BLL.FeeAndFund.Generate.NullifyGeneratedFee(month, year);

            return Json(new { msg = "success" });
        }
    }
}
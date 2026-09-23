using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.FeeAndFund;

namespace Student.Areas.Funds.Controllers
{
    public class GenerateController : Controller
    {
        // GET: Funds/Generate
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult ByType()
        {
            return View();
        }

        public JsonResult GetFunds(int? StudentID)
        {
            var model = Data.BLL.FeeAndFund.Funds.GetFunds(StudentID);

            return Json(model, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult ForAllClasses(int? ClassID, int? FundTypeID, decimal? Amount)
        {
            if (ClassID == 0)
            {
                Generate.GenerateMultiple(FundTypeID, Amount);
            }
            else
            {
                Generate.GenerateMultiple(FundTypeID, ClassID, Amount);
            }

            return Json(new { msg = "success" });
        }

        [HttpPost]
        public JsonResult ForThisClass(int classid, decimal? lab, decimal? misc, decimal? admission)
        {
            //  Data.BLL.Funds.generateFundForThisClass(classid, lab, misc, admission);

            return Json(new { msg = "success" });
        }

        [HttpPost]
        public JsonResult ForThisStudent(int? StudentID, decimal? Adm, decimal? Fund1, decimal? Fund2, decimal? Fund3)
        {
            Generate.GenerateAnnualFund(StudentID, 2, Adm);
            Generate.GenerateAnnualFund(StudentID, 3, Fund1);
            Generate.GenerateAnnualFund(StudentID, 4, Fund2);
            Generate.GenerateAnnualFund(StudentID, 5, Fund3);

            return Json(new { msg = "success" });
        }
        // GENERATE BY TYPE FOR ALL  CLASSES
        [HttpPost]
        public JsonResult ByType(string Type, decimal Amount)
        {
            // Data.BLL.Funds.GenerateByFundType(Type, Amount);

            return Json(new { msg = "success" });
        }

        // GENERATE BY TYPE FOR THIS CLASSES
        [HttpPost]
        public JsonResult ByTypeAndClass(string Type, decimal Amount, int ClassID)
        {
            // Data.BLL.Funds.GenerateByFundType(Type, Amount, ClassID);

            return Json(new { msg = "success" });
        }
    }
}
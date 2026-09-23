using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Employee;
using Data.Viewmodel;

namespace Student.Areas.Employee.Controllers
{
    public class DesignationController : Controller
    {
        // GET: Staff/Designation
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult _Index()
        {
            var lst = Designations.List();
            return PartialView(lst);
        }

        public ActionResult _Edit(int? ID)
        {
            var model = Designations.GetByID(ID);
            ViewBag.TimingRanges = ID.HasValue ? Designations.GetTimingRanges(ID.Value) : new List<DesignationTimingRangeViewModel>();
            return PartialView(model);
        }

        public ActionResult Edit(int? ID)
        {
            var model = Designations.GetByID(ID);
            if (model == null)
            {
                return RedirectToAction("Index");
            }

            ViewBag.TimingRanges = Designations.GetTimingRanges(model.ID);
            return View(model);
        }

        [HttpPost]
        public ActionResult Create(DesignationViewModel model)
        {
            model.MustCheckinTime = new DateTime(2020, 1, 1, model.Hours.Value, model.Minutes.Value, 0);
            model.LeavingTime = new DateTime(2020, 1, 1, model.LeavingHours.Value, model.LeavingMinutes.Value, 0);
            Designations.Create(model, User?.Identity?.Name);
            return Json(new { msg = "success" });
        }

        [HttpPost]
        public ActionResult Update(DesignationViewModel model)
        {
            model.MustCheckinTime = new DateTime(2020, 1, 1, model.Hours.Value, model.Minutes.Value, 0);
            model.LeavingTime = new DateTime(2020, 1, 1, model.LeavingHours.Value, model.LeavingMinutes.Value, 0);
            Designations.Update(model, User?.Identity?.Name);
            return Json(new { msg = "success" });
        }
    }
}
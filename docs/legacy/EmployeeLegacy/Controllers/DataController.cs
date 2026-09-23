//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Web;
//using System.Web.Mvc;
//using Data.BLL.Staff;
//using Data.Viewmodel;


//namespace Student.Areas.Staff.Controllers
//{
//    public class DataController : Controller
//    {
//        // GET: Staff/Data
//        public ActionResult Index()
//        {
//            return View();
//        }
//        public ActionResult _Index(string gender)
//        {
//            var lst = Teachers.lstTeacher();

//            if (!string.IsNullOrEmpty(gender))
//            {
//                lst = lst.Where(x => x.Gender == gender).ToList();
//            }

//            return PartialView("_Index", lst);
//        }
//        public ActionResult GetByID(int? id)
//        {
//            var model = Teachers.GetByID(id);

//            return PartialView("_detail", model);
//        }
//        // New
//        public ActionResult New()
//        {
//            return View();
//        }
//        [HttpPost]
//        public ActionResult New(TeacherViewModel model)
//        {
//            Teachers.Create(model);

//            return Json(new { msg = "Data saved" });
//        }
//        // Edit
//        public ActionResult Edit(int? id)
//        {
//            var model = Teachers.GetByID(id);
//            return View(model);
//        }
//        [HttpPost]
//        public ActionResult Edit(TeacherViewModel model)
//        {
//            Teachers.Update(model);

//            return RedirectToAction("Index");
//        }
//    }
//}


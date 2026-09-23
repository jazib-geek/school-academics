using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Employee;
using Data.Viewmodel.Employee;

namespace Student.Areas.Employee.Controllers
{
    public class NewController : Controller
    {
        // GET: Employee/New
        public ActionResult Index()
        {
           // Temp.DrainTable();
            var model = new EmployeeViewModel() { Hash = Guid.NewGuid().ToString() };

            return View(model);
        }

        //public ActionResult _TempQual(string Hash, string Type)
        //{
        //    var lst = Temp.ListByHash(Hash, Type);
        //    ViewBag.Hash = Hash;

        //    return PartialView("_TempQual", lst);
        //}

        //public ActionResult _TempAsset(string Hash, string Type)
        //{
        //    var lst = Temp.ListByHash(Hash, Type);

        //    return PartialView("_TempAsset", lst);
        //}

        //public ActionResult _TempSubject(string Hash, string Type)
        //{
        //    var lst = Temp.ListByHash(Hash, Type);

        //    return PartialView("_TempSubject", lst);
        //}

        //public ActionResult _TempExp(string Hash, string Type)
        //{
        //    var lst = Temp.ListByHash(Hash, Type);

        //    return PartialView("_TempExp", lst);
        //}

        //public ActionResult _TempAttachment(string Hash, string Type)
        //{
        //    var lst = Temp.ListByHash(Hash, Type);

        //    return PartialView("_TempAttachment", lst);
        //}

        /// <summary>
        /// ///
        /// </summary>
        /// <param name="model"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult Save(EmployeeViewModel model)
        {
            var chk = Insert.GetByThumbID(model.Thumb_ID);
            if (chk != null)
            {
                return Json(new {  msg = "error", desc = "Thumb ID already exist" });
            }

            int Id =  Insert.NewEmployee(model);

            return Json(new { msg = "success" , id = Id });
        }
        //[HttpPost]
        //public JsonResult InsertTemp(EmployeeTempViewModel model)
        //{
        //    Temp.Insert(model);

        //    return Json(new { msg = "success" });
        //}
        //[HttpPost]
        //public JsonResult DeleteTempRow(int ID)
        //{
        //    Temp.DeleteRow(ID);

        //    return Json(new { msg = "success" });
        //}
    }
}
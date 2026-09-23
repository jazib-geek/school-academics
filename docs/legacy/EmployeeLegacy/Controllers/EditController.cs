using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL.Employee;
using Data.Viewmodel.Employee;
using static Data.Helper.Constants;

namespace Student.Areas.Employee.Controllers
{
    public class EditController : Controller
    {
        // GET: Employee/Edit
        public ActionResult Index(int? id)
        {
            var model = List.GetByID(id);

            return View(model);
        }

        public ActionResult _SecrityAndLoan(int EmpID)
        {
            var lst = SalaryComponent.GetEmployeeSalaryComponents(EmpID)
                      .Where(x => x.ComponentType == SalaryComponentTypes.Loan || x.ComponentType == SalaryComponentTypes.Fine|| x.ComponentType == SalaryComponentTypes.Advance)
                      .ToList();

            return PartialView(lst);
        }


        public ActionResult _Qual(int? ID)
        {
            var lst = List.Qualification(ID);
            
            return PartialView("_Qual", lst);
        }

        public ActionResult _Asset(int? ID)
        {
            var lst = List.Asset(ID);

            return PartialView("_Asset", lst);
        }

        public ActionResult _Subject(int? ID)
        {
            var lst = List.Subject(ID);

            return PartialView("_Subject", lst);
        }

        public ActionResult _Exp(int? ID)
        {
            var lst = List.Experience(ID);

            return PartialView("_Exp", lst);
        }

        #region LOAN
        [HttpPost]
        public JsonResult InsertComponent(int EmpID, int Month, int Year, string ComponentType, decimal Amount, string Description)
        {
            SalaryComponent.InsertOrUpdateSalaryComponent(EmpID, Month, Year, ComponentType, Amount, Description);

            return Json(new { msg = "success" });
        }
        #endregion

        ///////////////////////////////////////////////////////////////////////
        [HttpPost]
        public JsonResult Update(EmployeeViewModel model)
        {
            bool isDuplicate = Edit.IsDuplicateThumbID(model.ID, model.Thumb_ID);
            if (isDuplicate)
            {
                return Json(new { msg = "duplicate" , desc = $"{model.Thumb_ID} is already assigned to another employee" });
            }

            Edit.EditEmployee(model);

            return Json(new { msg = "success" });
        }

        [HttpPost]
        public JsonResult Add(EmployeeTempViewModel model)
        {
            Edit.AddOtherData(model);

            return Json(new { msg = "success" });
        }

        [HttpPost]
        public JsonResult Delete(int? ID, string Type)
        {
            Edit.DeleteOtherData(ID, Type);

            return Json(new { msg = "success" });
        }
    }
}
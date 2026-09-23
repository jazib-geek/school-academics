using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Data.BLL;
using Data.BLL.Student;
using Data.Viewmodel;

namespace Student.Areas.Student.Controllers
{
    public class ReportsController : Controller
    {
        // GET: Student/Reports
        public ActionResult Index()
        {
            return View();
        }

        ////////////////////////////////////// PRINTABLE REPORTS //////////////////////////////////////

        //  1. ADMISSION REPORT (SORTED BY REG ID/CLASS : By Parmater)
        public ActionResult AdmissionList(DateTime? from, DateTime? to, int? id, string sort)
        {
            var lst = List.All().Where(x => x.IsActive == true).ToList();

            if (sort == "id")
            {
                lst = lst.OrderBy(x => x.Reg_Id).ToList();
                ViewBag.Sort = "By Reg ID";
            }
            else
            {
                lst = lst.OrderBy(x => x.ClassCompositeID).ToList();
                ViewBag.Sort = "By Class/Section";
            }

            if (id != null && id != 0)
            {
                lst = List.All(id);
                ViewBag.Sort = Data.BLL.Student.Parameters.lstSection().Where(x => x.ID == id).First().ClassName;
            }

            if (from != null && to != null)
            {
                lst = lst.Where(x => x.RegDate >= from && x.RegDate <= to).ToList();
                ViewBag.fromDate = from;
                ViewBag.toDate = to;
            }

            return View(lst);
        }

        //  4. DEACTIVATED STUDENTS 
        public ActionResult Deactivated(DateTime? from, DateTime? to, int? id)
        {
            var lst = List.Deactivated().Where(x => x.IsActive == false).ToList();

            if (id != null && id != 0)
            {
                lst = List.Deactivated().Where(x => x.ClassCompositeID == id).ToList();
                ViewBag.Sort = Data.BLL.Student.Parameters.lstSection().Where(x => x.ID == id).First().ClassName;
            }

            if (from != null && to != null)
            {
                lst = lst.Where(x => x.Leave_Date >= from && x.Leave_Date <= to).ToList();
                ViewBag.fromDate = from;
                ViewBag.toDate = to;
            }

            return View(lst);
        }

        //  5. FAMILY WISE REPORT 
        public ActionResult Family(int? id)
        {
            var lst = Students.lstStudents().OrderBy(x => x.Class_ID).Where(x => x.IsActive == true && x.Family_ID == id).ToList();

            var model = new StudentViewModel()
            {
                lstStudent = lst,
                Family_ID = id,
            };

            return View(model);
        }

        //  6. PHONE NUMBER LIST REPORT 
        public ActionResult Phone(int? id)
        {
            var lst = List.All().Where(x => x.IsActive == true).ToList();

            ViewBag.Class = "All Classes";

            if (id != null && id != 0)
            {
                lst = List.All(id);
                ViewBag.Class = Data.BLL.Student.Parameters.lstSection().Where(x => x.ID == id).First().ClassName;
            }
            else
            {
                ViewBag.Class = "All Classes";
            }

            return View(lst);
        }

        //  7. REGISTERED FAMILY LIST REPORT 
        public ActionResult Family_List()
        {
            var lst = Data.BLL.Student.Family.List().OrderByDescending(x => x.NumberOfStudents).ToList();

            return View(lst);
        }


        //  8. STRENGTH WITHOUT FEE
        public ActionResult Strength()
        {
            var lst = Data.BLL.Parameter.ClassAndSection.List().Where(x => x.IsActive == true).ToList();

            return View(lst);
        }

        //  9. STRENGTH WITHOUT FEE
        public ActionResult StrengthWithFee()
        {
            var lst = Data.BLL.Parameter.ClassAndSection.List().Where(x => x.IsActive == true).ToList();

            return View(lst);
        }

        //  9. STRENGTH WITHOUT FEE
        public ActionResult AdmissionDetail(DateTime? from, DateTime? to)
        {
            var lst = Data.BLL.Parameter.ClassAndSection.List().Where(x => x.IsActive == true).ToList();
            ViewBag.From = from;
            ViewBag.To = to;

            return View(lst);
        }

        //  10. AGE LIST
        public ActionResult Age(int? classid, int? sectionid)
        {
            var lst = Students.lstStudent_Basic(Session["user"].ToString()).Where(x => x.Class_ID == classid && x.Section_ID == sectionid && x.IsActive == true).ToList();

            var model = new StudentViewModel() { lstStudent = lst, Class_ID = classid, Section_ID = sectionid };

            return View(model);
        }
        //  11. BIRTHDAY LIST (SORTED BY DATE)
        public ActionResult Birthday(int? id, DateTime? from, DateTime? to)
        {
            var model = new StudentViewModel();

            var lst = List.All().Where(x => x.Date_of_Brith >= from && x.Date_of_Brith <= to && x.IsActive == true).ToList();

            ViewBag.Label = "All";

            if (id != null && id != 0)
            {
                lst = List.All(id).Where(x => x.Date_of_Brith >= from && x.Date_of_Brith <= to && x.IsActive == true).ToList();
                model.fromDate = from;
                model.toDate = to;
                ViewBag.Label = Data.BLL.Student.Parameters.lstSection().Where(x => x.ID == id).First().ClassName;
            }

            //  model.lstStudent = lst;

            return View(model);
        }
        // Profile
        public ActionResult StudentProfile(int? id)
        {
            var model = List.GetByID(id);

            return View(model);
        }
        // Profile
        public ActionResult Locality()
        {
            var model = Data.BLL.LocalityFunctions.lstLocality().Where(x=>x.IsActive == true).ToList();

            return View(model);
        }
        // Passwords
        public ActionResult FamilyAccounts()
        {
            var lst = Data.BLL.Student.Family.List().OrderByDescending(x => x.NumberOfStudents).ToList();

            return View(lst);
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using Data.Viewmodel;
using System.Web.Mvc;
using Data.BLL.Student;
using System.Web.Configuration;

namespace Student.Areas.Exam.Controllers
{
    public class ReportsController : Controller
    {
        private static int _DrawingID = Convert.ToInt32(WebConfigurationManager.AppSettings["DrawingID"]);
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult TopNpositions(int? id, string n)
        {
            int pos = Convert.ToInt32(n);

            var model = new ExamViewModel() { Position = pos, ExamTypeID = id };

            ViewBag.exam = Data.BLL.ExamType.GetByID(id).ExamType;

            return View(model);
        }
        public ActionResult TopNpositions_Alt(int? id, string n)
        {
            int pos = Convert.ToInt32(n);

            var model = new ExamViewModel() { Position = pos, ExamTypeID = id };

            ViewBag.exam = Data.BLL.ExamType.GetByID(id).ExamType;

            return View(model);
        }


        public ActionResult ResultCardFancy_Multiple(int? classid, int? examtype)
        {
            var model = List.All(classid);
            ViewBag.ExamTypeID = examtype;

            return View(model);
        }

        public ActionResult _ResultCardAdvanced(int? id, int? ExamTypeID)
        {
            var model = Data.BLL.Exam.GetResultCard(id, ExamTypeID);
            ViewBag.exam = Data.BLL.ExamType.GetByID(ExamTypeID).ExamType;

            return PartialView(model);
        }

        // AWARD LIST
        public ActionResult AwardList(int? classid)
        {
            var lst = List.All(classid);

            ViewBag.classsection = Parameters.GetClassNameFromCompositeID(classid);

            return View(lst);
        }
        // AWARD LIST : 2 COLUMN
        public ActionResult AwardList_2(int? classid, int? examtype)
        {
            var lst = List.All(classid);

            ViewBag.classsection = Parameters.GetClassNameFromCompositeID(classid);
            ViewBag.exam = Data.BLL.ExamType.GetByID(examtype).ExamType;

            return View(lst);
        }
        // AWARD LIST : Full Page
        public ActionResult AwardList_3(int? classid, int? examtype)
        {
            var lst = List.All(classid);

            ViewBag.classsection = Parameters.GetClassNameFromCompositeID(classid);
            ViewBag.exam = Data.BLL.ExamType.GetByID(examtype).ExamType;

            return View(lst);
        }
        // RESULT COMPARISON 1
        public ActionResult ResultComparison(string classid, string sectionid)
        {
            int Class_ID = Convert.ToInt32(classid);
            int Section_ID = Convert.ToInt32(sectionid);

            var model = new StudentViewModel() { lstStudent = Data.BLL.Students.lstStudent_Basic(Class_ID, Section_ID), Class_ID = Class_ID, Section_ID = Section_ID };

            return View(model);
        }
        // Academic Report
        public ActionResult AcademicReport(int? id)
        {
            var student = List.GetByID(id);

            return View(student);
        }
        public ActionResult AcademicReportAlt(int? id)
        {
            var student = Data.BLL.Student.List.GetByID(id);

            return View(student);
        }
    }
}
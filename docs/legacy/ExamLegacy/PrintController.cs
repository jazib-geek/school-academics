using System;
using System.Collections.Generic;
using System.Linq;
using Data.Viewmodel;
using System.Web.Mvc;

namespace Student.Areas.Exam.Controllers
{
    public class PrintController : Controller
    {
        public ActionResult ResultSheet(int? ClassID, int? ExamTypeID, string sort)
        {
            var model = new ExamSheetViewModel();

            if (string.IsNullOrEmpty(sort))
            {
                model = Data.BLL.Exam.ExamSheet(ClassID, ExamTypeID);
            }
            else
            {
                model = Data.BLL.Exam.ExamSheet(ClassID, ExamTypeID, sort);
            }
            model.ClassID = ClassID.Value;
            model.ExamTypeID = ExamTypeID.Value;
            model.lstDistinctSubject = Data.BLL.Exam.DistinctSubjectExamAndClasswise(ExamTypeID, ClassID);

            return View(model);
        }

        public ActionResult ResultSheetAlt(int? ClassID, int? ExamTypeID, string sort)
        {
            var model = new ExamSheetViewModel();

            if (string.IsNullOrEmpty(sort))
            {
                model = Data.BLL.Exam.ExamSheetAlt(ClassID, ExamTypeID, sort);
            }
            else
            {
                model = Data.BLL.Exam.ExamSheetAlt(ClassID, ExamTypeID, sort);
            }
            model.ClassID = ClassID.Value;
            model.ExamTypeID = ExamTypeID.Value;
            model.lstDistinctSubject = Data.BLL.Exam.DistinctSubjectExamAndClasswise(ExamTypeID, ClassID);

            return View(model);
        }

        // RESULT SHEET ROLL NO WISE
        public ActionResult ResultSheet_Rollno(int? ClassID, int? ExamTypeID, string sort)
        {
            var model = new ExamSheetViewModel();

            model = Data.BLL.Exam.ExamSheet(ClassID, ExamTypeID, "Reg");

            model.ClassID = ClassID.Value;
            model.ExamTypeID = ExamTypeID.Value;
            model.lstDistinctSubject = Data.BLL.Exam.DistinctSubjectExamAndClasswise(ExamTypeID, ClassID);

            return View(model);
        }
        // Fancy Result Card
        public ActionResult ResultCardAdvanced(int? id, int? ExamTypeID)
        {
            var model = Data.BLL.Exam.GetResultCard(id, ExamTypeID);
            ViewBag.exam = Data.BLL.ExamType.GetByID(ExamTypeID).ExamType;

            return View(model);
        }

        // Multiple Result Cards

        public ActionResult AcademicReport_Partial(int? id)
        {
            var student = Data.BLL.Students.GetByID(id);
            return PartialView("_AcademicReport", student);
        }
        public ActionResult MultipleResultCards(int? classid, string mode)
        {
            var model = new SectionViewModel() { Class_ID = classid };
            ViewBag.mode = mode;

            return View(model);
        }

        public ActionResult _MultipleResultCards(int? classid)
        {
            var model = new SectionViewModel() { Class_ID = classid };

            return PartialView(model);
        }

        public ActionResult _MultipleResultCardsAlt(int? classid)
        {
            var model = new SectionViewModel() { Class_ID = classid };

            return PartialView(model);
        }

        // Academic Report : With Drawing Exception
      
        // Academic Report : With Drawing Exception
        public ActionResult _AcademicReportAlt(int? id)
        {
            var student = Data.BLL.Student.List.GetByID(id);

            return PartialView(student);
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.Viewmodel;
using Data.DAL;
using System.Web.Configuration;

namespace Data.BLL
{
    public class Exam
    {
        private static int _DrawingID = Convert.ToInt32(WebConfigurationManager.AppSettings["DrawingID"]);
        private static int _StempID = Convert.ToInt32(WebConfigurationManager.AppSettings["StempID"]);
        public static void UpdateCell(int rowid, int update_value)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("update tblExam set ObtainedMarks = " + update_value + " where ID = " + rowid);
            }
        }

        public static int? GetCell(int rowid)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = db.tblExams.Find(rowid);

                if (query != null)
                {
                    return query.ObtainedMarks;
                }

                return 0;
            }
        }

        public static List<ExamViewModel> lstExam(int StudentID, int ClassID, int ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = new List<ExamViewModel>();
                var query = db.tblExams.Where(x => x.StudentID == StudentID && x.ClassID == ClassID && x.ExamTypeID == ExamTypeID).ToList();

                if (query.Count > 0)
                {
                    foreach (var item in query)
                    {
                        lst.Add(new ExamViewModel()
                        {
                            ID = item.ID,
                            TotalMarks = item.TotalMarks,
                            AttendanceRatio = item.AttendanceRatio,
                            ClassID = item.ClassID,
                            StudentID = item.StudentID,
                            ExamTypeID = item.ExamTypeID,
                            SubjectID = item.SubjectID,
                            //  SubjectPriority = db.tblClassSubjects.Find(item.SubjectID).Priority,
                            PassingMarks = item.PassingMarks,
                            ObtainedMarks = item.ObtainedMarks,
                            MaxMarks = item.MaxMarks
                        });
                    }
                }
                return lst;
            }
        }
        public static int? GetSumOfTotalMarksOfThisExam(int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int subjects = lstSubject_Distinct(ClassID, ExamTypeID).Count();

                if (subjects > 0)
                {
                    var query = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.SubjectID != _StempID).ToList();

                    var distinct_lst = query.GroupBy(val => val.SubjectID)
                  .Select(grp => grp.First())
                  .ToList();

                    return distinct_lst.Sum(x => x.TotalMarks) ?? 0;
                }
            }

            return 0;
        }
        public static int? GetTotalMarksObtained(int? StudentID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                //return db.tblExams.Where(x => x.StudentID == StudentID && x.ExamTypeID == ExamTypeID && x.ObtainedMarks > 0).Sum(x => x.ObtainedMarks) ?? 0;
                int? ClassID = db.tblStudents.Find(StudentID).ClassCompositeID;
                return db.tblExams.Where(x => x.StudentID == StudentID && x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.ObtainedMarks > 0 && x.SubjectID != _StempID).Sum(x => x.ObtainedMarks) ?? 0;
            }
        }

        public static int? GetTotalMarksObtained(int? StudentID, int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblExams.Where(x => x.StudentID == StudentID && x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.ObtainedMarks > 0).Sum(x => x.ObtainedMarks) ?? 0;
            }
        }

        // UPDATE ATTENDANCE RATIO
        public static void UpdateAttendanceRatio(int? StudentID, int? ExamTypeID, string ratio)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.StudentID == StudentID).ToList();
                if (lst.Count > 0)
                {
                    foreach (var item in lst)
                    {
                        item.AttendanceRatio = ratio;
                        db.SaveChanges();
                    }
                }
                //  db.Database.ExecuteSqlCommand("update tblExam set AttendanceRatio = " + ratio + " where StudentID = " + StudentID + " AND ExamTypeID =" + ExamTypeID);
            }
        }

        // GET ATTENDANCE RATIO
        public static string GerAttendanceRatio(int? StudentID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int? ClassID = db.tblStudents.Find(StudentID).ClassCompositeID;
                var lst = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.StudentID == StudentID && x.ClassID == ClassID).ToList();
                if (lst.Count > 0)
                {
                    return lst.First().AttendanceRatio;
                }
                return "";
            }
        }

        // DEFAULT METHOD : WITHOUT SPECIFIC CLASS/SECTION
        public static tblExam GetRow(int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID).FirstOrDefault();

                return exam;
            }
        }
        // OVERLOAD 1 : WITH SPECIFIC CLASS/SECTION
        public static tblExam GetRow(int? ExamTypeID, int? SubjectID, int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID && x.ClassID == ClassID).FirstOrDefault();
                if (exam == null)
                {
                    return new tblExam() { TotalMarks = 0, PassingMarks = 0 };
                }
                return exam;
            }
        }
        // Overload 2 : Get Row by ALL PARAMS FOR SPECIFIC STUDENT 
        public static tblExam GetRow(int? StudentID, int? ExamTypeID, int? SubjectID, int? ClassID, int? SectionID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Where(x => x.StudentID == StudentID && x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID && x.ClassID == ClassID && x.SectionID == SectionID).FirstOrDefault();
                if (exam == null)
                {
                    return new tblExam() { TotalMarks = 0, PassingMarks = 0 };
                }
                return exam;
            }
        }
        // Overload 3 : Get Row by ID (PK)
        public static tblExam GetRow(int? RowID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Find(RowID);
                if (exam == null)
                {
                    return new tblExam() { TotalMarks = 0, PassingMarks = 0 };
                }
                return exam;
            }
        }

        public static int? GetObtainedMarks(int? StudentID, int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Where(x => x.StudentID == StudentID && x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID).FirstOrDefault();
                if (exam == null)
                {
                    return 0;
                }
                return exam.ObtainedMarks;
            }
        }
        public static int? GetObtainedMarks(int? StudentID, int? ClassID, int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExam exam = db.tblExams.Where(x => x.StudentID == StudentID && x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID).FirstOrDefault();
                if (exam == null)
                {
                    return 0;
                }
                return exam.ObtainedMarks;
            }
        }

        public static void UpdateTotalMarks(int? ExamTypeID, int? SubjectID, int? ClassID, int? marks)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                string query = "Update tblExam set TotalMarks = " + marks + " where ExamTypeID = " + ExamTypeID + " AND SubjectID = " + SubjectID + " AND ClassID = " + ClassID;
                db.Database.ExecuteSqlCommand(query);
            }
        }
        public static void UpdatePassingMarks(int? ExamTypeID, int? SubjectID, int? ClassID, int? marks)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                List<tblExam> exam = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID && x.ClassID == ClassID).ToList();
                if (exam.Count > 0)
                {
                    foreach (var item in exam)
                    {
                        item.PassingMarks = marks;
                        db.SaveChanges();
                    }
                }
            }
        }
        public static void PopulateExamEntries(int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // First check if rows exist

                foreach (var item in db.tblStudents.Where(x => x.IsActive == true && x.ClassCompositeID == ClassID).ToList())
                {
                    var row = db.tblExams.Where(x => x.StudentID == item.Reg_Id && x.ExamTypeID == ExamTypeID && x.ClassID == ClassID).FirstOrDefault();
                    if (row == null)
                    {
                        foreach (var item_ in GetSubjectsOfThisClass(ClassID))
                        {
                            tblExam exam = new tblExam()
                            {
                                ExamTypeID = ExamTypeID,
                                SubjectID = item_.SubjectID,
                                TotalMarks = 0,
                                PassingMarks = 0,
                                ObtainedMarks = 0,
                                MaxMarks = 0,
                                StudentID = item.Reg_Id,
                                ClassID = item.ClassCompositeID,
                                AttendanceRatio = "-/-"
                            };
                            db.tblExams.Add(exam);
                            db.SaveChanges();
                        }
                    }
                }
            }
        }
        // Non repeating Subjects list form Exam table (Classwise)
        public static List<ClassSubjectViewModel> lstSubject_Distinct(int? ClassID, int? ExamTypeID)
        {
            var lst = new List<ClassSubjectViewModel>();
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // var query = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID).ToList();
                var query = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID).ToList();

                if (query.Count > 0)
                {
                    var distinct_lst = query.GroupBy(val => val.SubjectID)
                   .Select(grp => grp.First())
                   .ToList();

                    //var joined_query = from distinct_subject in distinct_lst
                    //                   join subject in db.tblSubject_Classwise on distinct_subject.SubjectID equals subject.ID
                    //                   select new { subject, distinct_subject.SubjectID };

                    foreach (var item in distinct_lst)
                    {
                        lst.Add(new ClassSubjectViewModel()
                        {
                            SubjectID = item.SubjectID,
                            //  subject = item.subject,
                            //  Priority = item.subject.Priority
                        });
                    }
                    return lst;
                }

                return new List<ClassSubjectViewModel>();
            }

        }
        public static List<ClassSubjectViewModel> lst_Excluded_Subjects(int? ClassID, int? ExamTypeID)
        {
            var lst = new List<ClassSubjectViewModel>();

            var lstAllSubjects = Subjects.lstSubject();
            var lst_DistinctSubjects = lstSubject_Distinct(ClassID, ExamTypeID);

            foreach (var item in lstAllSubjects)
            {
                foreach (var dist in lst_DistinctSubjects)
                {
                    if (!SubjectExistInExam(ClassID, ExamTypeID, item.SubjectID))
                    {
                        lst.Add(new ClassSubjectViewModel()
                        {
                            SubjectID = item.ID,
                            ShortName = item.ShortName,
                            FullName = item.FullName
                        });
                    }
                }
            }

            return lst;
        }
        /// Check if Subject exist in this Exam
        public static bool SubjectExistInExam(int? ClassID, int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID).ToList();
                if (lst.Count > 0)
                {
                    return true;
                }
                return false;
            }
        }

        public static List<tblSubject_Classwise> GetSubjectsOfThisClass(int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblSubject_Classwise.Where(x => x.ClassID == ClassID).ToList();

                return lst;
            }
        }

        //public static List<ClassSubjectViewModel> GetSubjectsOfThisClassByPriority(int? ClassID)
        //{
        //    var lst = new List<ClassSubjectViewModel>();

        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        var query = from SubjectByClass in db.tblSubject_Classwise
        //                    join subject in db.tblClassSubjects on SubjectByClass.SubjectID equals subject.ID
        //                    select new { };



        //        return lst;
        //    }
        //}

        /// DEFAULT METHOD : SORT BY  TOTAL MARKS OBTAINED OR PRECENTAGE
        public static ExamSheetViewModel ExamSheet(int? ClassID, int? ExamtypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var model = new ExamSheetViewModel();
                var lstExam = new List<ExamViewModel>();
                var lstStudent = new List<StudentViewModel>();

                var lstSubject = lstSubject_Distinct(ClassID, ExamtypeID);
                int? SumOfTotalMarks = GetSumOfTotalMarksOfThisExam(ClassID, ExamtypeID);

                model.lstSubject = lstSubject;

                foreach (var item in db.v_StudentList.Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).ToList())
                {
                    var percentage = GetPercentage(GetTotalMarksObtained(item.Reg_Id, ExamtypeID), SumOfTotalMarks);
                    var Grade = GetGrade(percentage);

                    lstStudent.Add(new StudentViewModel()
                    {
                        // RollNumber = StudentParameters.GetRollNumber(item.Reg_Id, item.Class_ID, item.Section_ID),
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        ClassName = item.ClassName,
                        FatherName = item.FatherName,
                        lstExam = db.tblExams.Where(x => x.StudentID == item.Reg_Id && x.ExamTypeID == ExamtypeID && x.ClassID == ClassID).ToList(),
                        exam = new ExamViewModel()
                        {
                            Total_Obtained = GetTotalMarksObtained(item.Reg_Id, ExamtypeID),
                            Percentage = percentage,
                            Grade = Grade,
                            Remarks = GetRemarks(Grade),
                            Position = GetPosition(item.Reg_Id, ExamtypeID),
                        }
                    });
                }

                model.lstStudent = lstStudent.OrderByDescending(x => x.exam.Total_Obtained).ToList();

                return model;
            }
        }
        /// OVERLOAD 1 : SORT BY  REG ID
        public static ExamSheetViewModel ExamSheet(int? ClassID, int? ExamtypeID, string sort)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var model = new ExamSheetViewModel();
                var lstExam = new List<ExamViewModel>();
                var lstStudent = new List<StudentViewModel>();

                var lstSubject = lstSubject_Distinct(ClassID, ExamtypeID);
                int? SumOfTotalMarks = GetSumOfTotalMarksOfThisExam(ClassID, ExamtypeID);

                model.lstSubject = lstSubject;

                foreach (var item in db.v_StudentList.Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).OrderBy(x => x.Reg_Id).ToList())
                {
                    var percentage = GetPercentage(GetTotalMarksObtained(item.Reg_Id, ExamtypeID), SumOfTotalMarks);
                    var Grade = GetGrade(percentage);

                    lstStudent.Add(new StudentViewModel()
                    {
                        // RollNumber = StudentParameters.GetRollNumber(item.Reg_Id, item.Class_ID, item.Section_ID),
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        FatherName = item.FatherName,
                        lstExam = db.tblExams.Where(x => x.StudentID == item.Reg_Id && x.ExamTypeID == ExamtypeID && x.ClassID == ClassID).ToList(),
                        exam = new ExamViewModel()
                        {
                            Total_Obtained = GetTotalMarksObtained(item.Reg_Id, ExamtypeID),
                            Percentage = percentage,
                            Grade = Grade,
                            Remarks = GetRemarks(Grade),
                            Position = GetPosition(item.Reg_Id, ExamtypeID),
                        }
                    });
                }

                model.lstStudent = lstStudent;

                return model;
            }
        }

        // DELETE SUBJECT FROM THIS CLASS EXAM
        public static void DeleteSubjectFromThisExam(int? ClassID, int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID && x.SubjectID == SubjectID).ToList();

                if (lst.Count > 0)
                {
                    foreach (var item in lst)
                    {
                        db.tblExams.Remove(item);
                        db.SaveChanges();
                    }
                }
            }
        }

        // ADD SUBJECT TO THIS CLASS EXAM
        public static void AddSubjectToThisExam(int? ClassID, int? ExamTypeID, int? SubjectID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // Get Active STudents of This Class
                var lstStudent = db.tblStudents.Where(x => x.Class_ID == ClassID && x.IsActive == true).ToList();
                foreach (var item in lstStudent)
                {
                    var exam = new tblExam()
                    {
                        StudentID = item.Reg_Id,
                        ClassID = ClassID,
                        SubjectID = SubjectID,
                        ExamTypeID = ExamTypeID,
                        TotalMarks = 0,
                        PassingMarks = 0,
                        ObtainedMarks = 0
                    };

                    db.tblExams.Add(exam);
                    db.SaveChanges();
                }
            }
        }

        //   GET MAX MARKS
        public static int? GetMaxMarks(int? ClassID, int? SectionID, int? SubjectID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ClassID == ClassID && x.SectionID == SectionID && x.SubjectID == SubjectID && x.ExamTypeID == ExamTypeID).ToList();
                if (lst.Count > 0)
                {
                    return lst.Max(x => x.ObtainedMarks);
                }
                return 0;
            }
        }
        /////////////////////////////// PARAMETERS TO DECIDE PERCENTAGE AND REMARKS /////////////////////////////////

        public static int? GetPercentage(int? ObtainedMarks, int? TotalMarks)
        {
            if (TotalMarks > 0)
            {
                double percentage = ((double)ObtainedMarks / (double)TotalMarks) * 100;

                return Convert.ToInt32(percentage);
            }

            return 0;
        }
        // Get Percentage of particular Sudent in Particualr Exam Type
        public static int? GetPercentageOfStudent(int? StudentID, int? ClassID, int? ExamTypeID)
        {
            int? TotalMarks = GetSumOfTotalMarksOfThisExam(ClassID, ExamTypeID);
            int? ObtainedMarks = GetTotalMarksObtained(StudentID, ExamTypeID);

            if (TotalMarks > 0)
            {
                double percentage = ((double)ObtainedMarks / (double)TotalMarks) * 100;

                return Convert.ToInt32(percentage);
            }

            return 0;
        }
        public static string GetGrade(int? Percentage)
        {
            if (Percentage == 0 || Percentage == null)
            {
                return "-";
            }

            string Grade = "";
            if (Percentage > 89)
            {
                Grade = "A++";
            }
            else if (Percentage <= 89 && Percentage >= 80)
            {
                Grade = "A+";
            }
            else if (Percentage <= 79 && Percentage >= 70)
            {
                Grade = "A";
            }
            else if (Percentage <= 69 && Percentage >= 60)
            {
                Grade = "B";
            }
            else if (Percentage <= 59 && Percentage >= 50)
            {
                Grade = "C";
            }
            else if (Percentage <= 49 && Percentage >= 40)
            {
                Grade = "D";
            }
            else if (Percentage <= 39 && Percentage > 0)
            {
                Grade = "E";
            }
            else
            {
                Grade = "F";
            }
            return Grade;
        }

        public static string GetGrade(int? ObtainedMarks, int? TotalMarks)
        {
            if (ObtainedMarks == 0 || TotalMarks == null)
            {
                return "-";
            }

            int? Percentage = GetPercentage(ObtainedMarks, TotalMarks);
            string Grade = "";
            if (Percentage > 89)
            {
                Grade = "A++";
            }
            else if (Percentage <= 89 && Percentage >= 80)
            {
                Grade = "A+";
            }
            else if (Percentage <= 79 && Percentage >= 70)
            {
                Grade = "A";
            }
            else if (Percentage <= 69 && Percentage >= 60)
            {
                Grade = "B";
            }
            else if (Percentage <= 59 && Percentage >= 50)
            {
                Grade = "C";
            }
            else if (Percentage <= 49 && Percentage >= 40)
            {
                Grade = "D";
            }
            else if (Percentage <= 39 && Percentage > 0)
            {
                Grade = "E";
            }
            else
            {
                Grade = "F";
            }
            return Grade;
        }


        public static string GetRemarks(string Grade)
        {
            if (Grade == "-" || string.IsNullOrEmpty(Grade))
            {
                return "-";
            }

            string remarks = "";

            switch (Grade)
            {
                case "A++":
                    remarks = "Outstanding";
                    break;

                case "A+":
                    remarks = "Excellent";
                    break;

                case "A":
                    remarks = "Very Good";
                    break;

                case "B":
                    remarks = "Good";
                    break;

                case "C":
                    remarks = "Fair";
                    break;

                case "D":
                    remarks = "Satisfactory";
                    break;

                case "E":
                    remarks = "Needs Improvement";
                    break;
                case "F":
                    remarks = "Fail";
                    break;
                default:
                    break;
            }

            return remarks;
        }
        //public static string GetLongRemarks(string Grade, string Gender)
        //{
        //    if (Grade == "-" || string.IsNullOrEmpty(Grade))
        //    {
        //        return "-";
        //    }

        //    string HEorSHE_Small = "";
        //    string HEorSHE_Capital = "";
        //    string HISorHER_Small = "";
        //    string HISorHER_Capital = "";

        //    if (Gender == "Male")
        //    {
        //        HEorSHE_Small = "he";
        //        HEorSHE_Capital = "He";
        //        HISorHER_Small = "his";
        //        HISorHER_Capital = "His";
        //    }
        //    else
        //    {
        //        HEorSHE_Small = "she";
        //        HEorSHE_Capital = "She";
        //        HISorHER_Small = "her";
        //        HISorHER_Capital = "Her";
        //    }

        //    string remarks = "";

        //    switch (Grade)
        //    {
        //        case "A++":
        //            remarks = HISorHER_Capital + " Performance has been outstanding. Well done. Keep it up.";
        //            break;

        //        case "A+":
        //            remarks = HEorSHE_Capital + " has shown excellent result. " + HEorSHE_Capital + " may show outstanding result with a little more effort.";
        //            break;

        //        case "A":
        //            remarks = HISorHER_Capital + " performance has been very good. Certainly, " + HEorSHE_Small + " may improve with more efforts. ";
        //            break;

        //        case "B":
        //            remarks = HEorSHE_Capital + " has shown a good result. " + HEorSHE_Capital + " is advised to show more interest to improve himself.";
        //            break;

        //        case "C":
        //            remarks = HISorHER_Capital + "  performance has been average. It is hoped that " + HEorSHE_Small + " can improve with more efforts.";
        //            break;

        //        case "D":
        //            remarks = "With more hard work " + HEorSHE_Small + " can make his position better in future.";
        //            break;

        //        case "E":
        //            remarks = HISorHER_Capital + " performance has been weak. " + HEorSHE_Capital + " will have to work very hard to be a successful student.";
        //            break;
        //        case "F":
        //            remarks = HISorHER_Capital + " is advised to work pretty hard so that " + HEorSHE_Small + " may continue " + HISorHER_Small + " education.";
        //            break;
        //        default:
        //            break;
        //    }

        //    return remarks;
        //}

        public static string GetLongRemarks(string Grade, string Gender)
        {
            if (Grade == "-" || string.IsNullOrEmpty(Grade))
            {
                return "-";
            }

            string HEorSHE_Small = "";
            string HEorSHE_Capital = "";
            string HISorHER_Small = "";
            string HISorHER_Capital = "";
            string HIMSELForHERSELF = "";

            if (Gender == "Male")
            {
                HEorSHE_Small = "he";
                HEorSHE_Capital = "He";
                HISorHER_Small = "his";
                HISorHER_Capital = "His";
                HIMSELForHERSELF = "himself";
            }
            else
            {
                HEorSHE_Small = "she";
                HEorSHE_Capital = "She";
                HISorHER_Small = "her";
                HISorHER_Capital = "Her";
                HIMSELForHERSELF = "herself";
            }

            string remarks = "";

            switch (Grade)
            {
                case "A++":
                    remarks = HISorHER_Capital + " performance has been outstanding. Well done. Keep it up.";
                    break;

                case "A+":
                    remarks = HEorSHE_Capital + " has shown excellent result. " + HEorSHE_Capital + " may show outstanding result with a little more effort.";
                    break;

                case "A":
                    remarks = HISorHER_Capital + " performance has been very good. Certainly, " + HEorSHE_Small + " may improve with more efforts.";
                    break;

                case "B":
                    remarks = HEorSHE_Capital + " has shown a good result. " + HEorSHE_Capital + " is advised to show more interest to improve " + HIMSELForHERSELF + ".";
                    break;

                case "C":
                    remarks = HISorHER_Capital + " performance has been average. It is hoped that " + HEorSHE_Small + " can improve with more efforts.";
                    break;

                case "D":
                    remarks = "With more hard work " + HEorSHE_Small + " can make " + HISorHER_Small + " position better in future.";
                    break;

                case "E":
                    remarks = HISorHER_Capital + " performance has been weak. " + HEorSHE_Capital + " will have to work very hard to be a successful student.";
                    break;

                case "F":
                    remarks = HISorHER_Capital + " is advised to work pretty hard so that " + HEorSHE_Small + " may continue " + HISorHER_Small + " education.";
                    break;
            }

            return remarks;
        }


        public static int GetPosition(int? StudentID, int? ExamtypeID)
        {
            if (GetTotalMarksObtained(StudentID, ExamtypeID) == 0)
            {
                return 0;
            }

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var ClassID = db.tblStudents.Find(StudentID).ClassCompositeID;
                //  var SectionID = db.tblStudents.Find(StudentID).Section_ID;

                var lst_Exam = db.tblExams.Where(x => x.ExamTypeID == ExamtypeID && x.ClassID == ClassID).ToList();
                var lst = new List<ExamViewModel>();
                //   int n = 0;
                foreach (var item in db.tblStudents.Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).ToList())
                {

                    lst.Add(new ExamViewModel()
                    {
                        StudentID = item.Reg_Id,
                        Total_Obtained = GetTotalMarksObtained(item.Reg_Id, ExamtypeID)
                    });
                }
                var sorted_lst = lst.OrderByDescending(x => x.Total_Obtained).ToList();
                var result = new List<ExamViewModel>();

                foreach (var item in sorted_lst)
                {
                    // FIND DUPLICATE , IF STUDENT OF SAME MARKS EXIST ASSIGN SAME POSITION

                    var ThisSTudentMarks = item.Total_Obtained;

                    var find_less_marks = sorted_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                    var find_same_marks = sorted_lst.Where(x => x.Total_Obtained == ThisSTudentMarks && x.StudentID != item.StudentID).ToList();

                    if (find_same_marks.Count > 0)
                    {
                        var distinct_lst = sorted_lst.GroupBy(val => val.Total_Obtained).Select(grp => grp.First()).ToList();
                        var distinct_less = distinct_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                        result.Add(new ExamViewModel()
                        {
                            ID = distinct_lst.Count - distinct_less.Count,
                            StudentID = item.StudentID
                        });
                    }
                    else
                    {
                        var distinct_lst = sorted_lst.GroupBy(val => val.Total_Obtained).Select(grp => grp.First()).ToList();
                        var distinct_less = distinct_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                        result.Add(new ExamViewModel()
                        {
                            ID = distinct_lst.Count - distinct_less.Count,
                            StudentID = item.StudentID
                        });
                    }
                }
                return result.Where(x => x.StudentID == StudentID).First().ID;
            }
        }
        public static double GetSubjectPercentage(int? ClassID, int? SubjectID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ClassID == ClassID && x.SubjectID == SubjectID && x.ExamTypeID == ExamTypeID && x.ObtainedMarks != -1).ToList();
                int? TotalMarksOfThisSUbject = GetRow(ExamTypeID, SubjectID, ClassID).TotalMarks;

                int? SumOfObtainedMarks = lst.Sum(x => x.ObtainedMarks);

                var averege = (double)SumOfObtainedMarks / lst.Count;
                double calc = averege / (double)TotalMarksOfThisSUbject;

                double result = calc * 100;

                var conv = Math.Round(result, 0);

                return conv;
            }

        }

        public static ExamViewModel GetResultCard(int? StudentID, int? ExamtypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var model = new ExamViewModel();
                var lst = new List<ExamViewModel>();
                var lstExam = db.v_Exam.Where(x => x.StudentID == StudentID && x.ExamTypeID == ExamtypeID).ToList();
                int? SumOfTotalMarks = lstExam.Sum(x => x.TotalMarks);
                int? SumOfObtainedMarks = lstExam.Where(x => x.ObtainedMarks != -1).Sum(x => x.ObtainedMarks);
                int? Percentage = GetPercentage(SumOfObtainedMarks, SumOfTotalMarks);
                // int? family_id = db.tblStudents.Find(StudentID).Family_Code;

                foreach (var item in lstExam)
                {
                    lst.Add(new ExamViewModel()
                    {
                        ClassID = item.ClassID,
                        SubjectName = item.SubjectName,
                        TotalMarks = item.TotalMarks,
                        PassingMarks = item.PassingMarks,
                        ObtainedMarks = item.ObtainedMarks,
                        Percentage = GetPercentage(item.ObtainedMarks, item.TotalMarks)
                    });
                }
                model.StudentID = StudentID;

                model.Percentage = Percentage;
                model.Grade = GetGrade(Percentage);
                model.Remarks = GetRemarks(GetGrade(Percentage));
                model.Position = GetPosition(StudentID, ExamtypeID);
                model.ExamTypeID = ExamtypeID;
                model.lstExam = lst;

                return model;
            }
        }

        public static string PositionWithPostFix(int position)
        {
            if (position == 0)
            {
                return "-";
            }

            switch (position % 100)
            {
                case 11:
                case 12:
                case 13:
                    return position + "th";
            }

            switch (position % 10)
            {
                case 1:
                    return position + "st";
                case 2:
                    return position + "nd";
                case 3:
                    return position + "rd";
                default:
                    return position + "th";
            }
        }
        public static string GetExamtypeType(int? typeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblExamType row = db.tblExamTypes.Find(typeID);
                if (row != null)
                {
                    return row.ExamType;
                }

                return "";
            }
        }

        public static int? GetAveregePercentageOfThisExam(int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblExams.Where(x => x.ClassID == ClassID).ToList();
                var TotalStudentsInExam = lst.Count;

                int? percentage = 0;

                foreach (var item in lst)
                {
                    var calc = GetPercentageOfStudent(item.StudentID, ClassID, ExamTypeID);
                    percentage += calc;
                }

                if (TotalStudentsInExam > 0)
                {
                    return percentage / TotalStudentsInExam;
                }

                return 0;
            }
        }

        // STUDENT PERCTAGE LIST BY CLASS AND EXAM TYPE ID

        public static List<ExamViewModel> lstPercentage_Class(int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = new List<ExamViewModel>();

                foreach (var item in db.tblStudents.Where(x => x.Class_ID == ClassID && x.IsActive == true))
                {
                    lst.Add(new ExamViewModel()
                    {
                        student = item,
                        Percentage = GetPercentageOfStudent(item.Reg_Id, ClassID, ExamTypeID)
                    });
                }

                return lst;
            }
        }

        // PERCENTAGE LIST BY CLASS AND EXAM TYPE ID

        public static List<ExamViewModel> lstPercentage_OfThisStudent(int StudentID, int ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = new List<ExamViewModel>();
                var std = db.tblStudents.Find(StudentID);

                foreach (var item in lstExam(StudentID, std.Class_ID.Value, ExamTypeID).Where(x => x.TotalMarks > 0))
                {
                    lst.Add(new ExamViewModel()
                    {
                        Subject = db.tblSubjectMasters.Find(item.SubjectID),
                        Percentage = GetPercentage(item.ObtainedMarks, item.TotalMarks)
                    });
                }

                return lst;
            }
        }

        // ADD SUBJECT TO EXISTING EXAM
        public static void AddSubjectToExamForThisClass(int? ExamTypeID, int? SubjectID, int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item_std in db.tblStudents.Where(x => x.IsActive == true && x.ClassCompositeID == ClassID).ToList())
                {
                    var CheckRow = db.tblExams.Where(x => x.ExamTypeID == ExamTypeID && x.StudentID == item_std.Reg_Id && x.SubjectID == SubjectID).FirstOrDefault();
                    int? TotalMarks = 0;

                    if (CheckRow == null)
                    {
                        tblExam exam = new tblExam()
                        {
                            ExamTypeID = ExamTypeID,
                            SubjectID = SubjectID,
                            TotalMarks = TotalMarks,
                            PassingMarks = 0,
                            ObtainedMarks = 0,
                            StudentID = item_std.Reg_Id,
                            ClassID = item_std.ClassCompositeID,
                            AttendanceRatio = "0/0"
                        };
                        db.tblExams.Add(exam);
                        db.SaveChanges();
                    }
                }
            }
        }

        public static List<Fn_DistinctSubjectExamAndClasswise_Result> DistinctSubjectExamAndClasswise(int? ExamTypeID, int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.Fn_DistinctSubjectExamAndClasswise(ClassID, ExamTypeID).ToList();
            }
        }

        //////////////////////////////////// DRAWING EXCEPTION ////////////////////////////
        public static int? GetSumOfTotalMarksOfThisExam_Alt(int? ClassID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int subjects = lstSubject_Distinct(ClassID, ExamTypeID).Where(x => x.SubjectID != _DrawingID && x.SubjectID != _StempID).Count();

                if (subjects > 0)
                {
                    var query = db.tblExams.Where(x => x.ClassID == ClassID && x.ExamTypeID == ExamTypeID).ToList();

                    var distinct_lst = query.GroupBy(val => val.SubjectID)
                  .Select(grp => grp.First())
                  .ToList();

                    return distinct_lst.Where(x => x.SubjectID != _DrawingID && x.SubjectID != _StempID).Sum(x => x.TotalMarks) ?? 0;
                }
            }

            return 0;
        }
        public static int? GetTotalMarksObtained_Alt(int? StudentID, int? ExamTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                int? ClassID = db.tblStudents.Find(StudentID).ClassCompositeID;
                return db.tblExams.Where(x => x.StudentID == StudentID && x.ClassID == ClassID && x.SubjectID != _DrawingID && x.SubjectID != _StempID && x.ExamTypeID == ExamTypeID && x.ObtainedMarks > 0).Sum(x => x.ObtainedMarks) ?? 0;
            }
        }

        public static int? GetPercentageOfStudent_Alt(int? StudentID, int? ClassID, int? ExamTypeID)
        {
            int? TotalMarks = GetSumOfTotalMarksOfThisExam_Alt(ClassID, ExamTypeID);
            int? ObtainedMarks = GetTotalMarksObtained_Alt(StudentID, ExamTypeID);

            if (TotalMarks > 0)
            {
                double percentage = ((double)ObtainedMarks / (double)TotalMarks) * 100;

                return Convert.ToInt32(percentage);
            }

            return 0;
        }

        public static int GetPosition_Alt(int? StudentID, int? ExamtypeID)
        {
            if (GetTotalMarksObtained_Alt(StudentID, ExamtypeID) == 0)
            {
                return 0;
            }

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var ClassID = db.tblStudents.Find(StudentID).ClassCompositeID;
                //  var SectionID = db.tblStudents.Find(StudentID).Section_ID;

                var lst_Exam = db.tblExams.Where(x => x.ExamTypeID == ExamtypeID && x.ClassID == ClassID && x.SubjectID != _DrawingID && x.SubjectID != _StempID).ToList();
                var lst = new List<ExamViewModel>();
                //   int n = 0;
                foreach (var item in db.tblStudents.Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).ToList())
                {

                    lst.Add(new ExamViewModel()
                    {
                        StudentID = item.Reg_Id,
                        Total_Obtained = GetTotalMarksObtained_Alt(item.Reg_Id, ExamtypeID)
                    });
                }
                var sorted_lst = lst.OrderByDescending(x => x.Total_Obtained).ToList();
                var result = new List<ExamViewModel>();

                foreach (var item in sorted_lst)
                {
                    // FIND DUPLICATE , IF STUDENT OF SAME MARKS EXIST ASSIGN SAME POSITION

                    var ThisSTudentMarks = item.Total_Obtained;

                    var find_less_marks = sorted_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                    var find_same_marks = sorted_lst.Where(x => x.Total_Obtained == ThisSTudentMarks && x.StudentID != item.StudentID).ToList();

                    if (find_same_marks.Count > 0)
                    {
                        var distinct_lst = sorted_lst.GroupBy(val => val.Total_Obtained).Select(grp => grp.First()).ToList();
                        var distinct_less = distinct_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                        result.Add(new ExamViewModel()
                        {
                            ID = distinct_lst.Count - distinct_less.Count,
                            StudentID = item.StudentID
                        });
                    }
                    else
                    {
                        var distinct_lst = sorted_lst.GroupBy(val => val.Total_Obtained).Select(grp => grp.First()).ToList();
                        var distinct_less = distinct_lst.Where(x => x.Total_Obtained < ThisSTudentMarks).ToList();

                        result.Add(new ExamViewModel()
                        {
                            ID = distinct_lst.Count - distinct_less.Count,
                            StudentID = item.StudentID
                        });
                    }
                }
                return result.Where(x => x.StudentID == StudentID).First().ID;
            }
        }

        public static ExamSheetViewModel ExamSheetAlt(int? ClassID, int? ExamtypeID, string sort)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var model = new ExamSheetViewModel();
                var lstExam = new List<ExamViewModel>();
                var lstStudent = new List<StudentViewModel>();

                var lstSubject = lstSubject_Distinct(ClassID, ExamtypeID).Where(x => x.SubjectID != _DrawingID && x.SubjectID != _StempID && x.SubjectID != _StempID).ToList();
                int? SumOfTotalMarks = GetSumOfTotalMarksOfThisExam_Alt(ClassID, ExamtypeID);

                model.lstSubject = lstSubject;

                foreach (var item in db.v_StudentList.Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).OrderBy(x => x.Reg_Id).ToList())
                {
                    var percentage = GetPercentage(GetTotalMarksObtained_Alt(item.Reg_Id, ExamtypeID), SumOfTotalMarks);
                    var Grade = GetGrade(percentage);

                    lstStudent.Add(new StudentViewModel()
                    {
                        // RollNumber = StudentParameters.GetRollNumber(item.Reg_Id, item.Class_ID, item.Section_ID),
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        FatherName = item.FatherName,
                        lstExam = db.tblExams.Where(x => x.StudentID == item.Reg_Id && x.ExamTypeID == ExamtypeID && x.ClassID == ClassID).ToList(),
                        exam = new ExamViewModel()
                        {
                            Total_Obtained = GetTotalMarksObtained_Alt(item.Reg_Id, ExamtypeID),
                            Percentage = percentage,
                            Grade = Grade,
                            Remarks = GetRemarks(Grade),
                            Position = GetPosition_Alt(item.Reg_Id, ExamtypeID),
                        }
                    });
                }

                model.lstStudent = lstStudent.OrderByDescending(x => x.exam.Total_Obtained).ToList();

                return model;
            }
        }

    }
}

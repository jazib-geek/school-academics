using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.Student
{
    public class Parameters
    {
        public static List<v_SectionList> ListOfClass()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_SectionList.Where(x => x.IsActive == true).OrderBy(x => x.Class_ID).ThenBy(x => x.SectionID).ToList();
            }
        }
        public static List<ClassViewModel> lstClass()
        {
            var lst = new List<ClassViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from Class in db.tblClasses
                           // join Branch in db.tblBranches on Class.BranchID equals Branch.ID
                            select new { Class };

                foreach (var item in query)
                {
                    lst.Add(new ClassViewModel()
                    {
                        Class_ID = item.Class.Class_ID,
                        Class_Name = item.Class.Class_Name,
                        IsActive = item.Class.IsActive,
                    });
                }
            }

            return lst;
        }

        public static List<SubjectGroupViewModel> lstSubjectGroup()
        {
            var lst = new List<SubjectGroupViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item in db.tblSubjectGroups.ToList())
                {
                    lst.Add(new SubjectGroupViewModel()
                    {
                        ID = item.subject_group_id,
                        SubjectGroupName = item.subject_group_name,
                        IsActive = item.IsActive
                    });
                }
            }

            return lst;
        }
        public static List<OccupationViewModel> lstOccupation()
        {
            var lst = new List<OccupationViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item in db.tblOccupations.ToList())
                {
                    lst.Add(new OccupationViewModel()
                    {
                        ID = item.ID,
                        Occupation = item.Occupation,
                        IsActive = item.IsActive
                    });
                }
            }

            return lst;
        }

        // SECTION COLOR METHODS

        public static List<SectionColorViewModel> lstSectionColors()
        {
            var lst = new List<SectionColorViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item in db.tblSectionColors.ToList())
                {
                    lst.Add(new SectionColorViewModel()
                    {
                        ID = item.ID,
                        IsActive = item.IsActive,
                        Color = item.Color,
                    });
                }
            }

            return lst;
        }

        public static ClassViewModel ClassByID(int? id)
        {
            return lstClass().Where(x => x.Class_ID == id).FirstOrDefault();
        }
        public static string ClassSectionNameByID(int? ClassID, int? SectionID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Class = db.tblClasses.Find(ClassID);
                var Section = db.tblSectionColors.Find(SectionID);

                if (Class != null && Section != null)
                {
                    return Class.Class_Name + "-" + Section.Color;
                }

                return "";
            }
        }

        public static int GetCompositeClassID(int? ClassID, int? SectionID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Find = db.tblSections.Where(x => x.Class_ID == ClassID && x.SectionID == SectionID).FirstOrDefault();

                return Find.ID;
            }
        }

        public static tblSection GetCompositeRow(int? RowID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Find = db.tblSections.Find(RowID);

                return Find;
            }
        }

        public static List<SectionViewModel> lstSection()
        {
            var lst = new List<SectionViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                //var query = from section in db.tblSections
                //            join Class in db.tblClasses on section.Class_ID equals Class.Class_ID
                //            join section_color in db.tblSectionColors on section.SectionID equals section_color.ID
                //            select new { section, Class, section_color };

                var query = db.v_SectionList.ToList();

                foreach (var item in query)
                {
                    lst.Add(new SectionViewModel()
                    {
                        RowID = item.ID,
                        ID = item.ID,
                        SectionID = item.SectionID,
                        Class_ID = item.Class_ID,
                        ClassName = item.ClassName,
                        Fee = item.Fee,
                        IsActive = item.IsActive,
                        Section_Gender = item.Section_Gender
                    });
                }
            }

            return lst;
        }

        // SECTION LIST COMPOSITE
        public static string GetClassNameFromCompositeID(int? ID)
        {
            var lst = new List<SectionViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblSection Row = db.tblSections.Find(ID);

                if (Row != null)
                {
                    return ClassSectionNameByID(Row.Class_ID, Row.SectionID);
                }

                return "";
            }
        }

        // OCCUPATION
        public static void CreateOccupation(OccupationViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblOccupation occupation = new tblOccupation()
                {
                    Occupation = model.Occupation,
                    IsActive = true
                };
                db.tblOccupations.Add(occupation);
                db.SaveChanges();
            }
        }
        public static void UpdateOccupation(OccupationViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblOccupation occupation = db.tblOccupations.Find(model.ID);

                if (occupation != null)
                {
                    occupation.Occupation = model.Occupation;
                    db.SaveChanges();
                }
            }
        }

        public static string GetOccupationByID(int id)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblOccupation row = db.tblOccupations.Find(id);

                if (row == null)
                {
                    return "";
                }

                return row.Occupation;
            }
        }
        // CLASS
        public static void UpdateClass(ClassViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblClass row = db.tblClasses.Find(model.Class_ID);

                if (row != null)
                {
                    row.Class_Name = model.Class_Name;
                    row.BranchID = model.BranchID;
                    db.SaveChanges();
                }
            }
        }
        public static void CreateClass(ClassViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblClass insert = new tblClass()
                {
                    Class_Name = model.Class_Name,
                    BranchID = model.BranchID,
                    IsActive = true,
                };
                db.tblClasses.Add(insert);
                db.SaveChanges();
            }
        }

        public static void CreateSection(SectionViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var ClassName = db.tblClasses.Find(model.Class_ID)?.Class_Name;
                var SectionName = db.tblSectionColors.Find(model.SectionID)?.Color;

                tblSection section = new tblSection()
                {
                    Class_ID = model.Class_ID,
                    SectionID = model.SectionID,
                    ClassName = ClassName + "-" + SectionName,
                    Fee = model.Fee,
                    IsActive = true,
                    Branch = model.Branch,
                    Section_Gender = model.Section_Gender,
                    IsHifz = model.IsHifz
                };
                db.tblSections.Add(section);
                db.SaveChanges();

                int CompositeID = db.tblSections.Max(x => x.ID);

                var lst = db.tblFundTypes.ToList();

                tblFundCharge TutionFee = new tblFundCharge()
                {
                    ClassCompositeID = CompositeID,
                    FundID = 1,
                    Charges = model.Fee
                };
                db.tblFundCharges.Add(TutionFee);
                db.SaveChanges();

                foreach (var item in lst.Where(x => x.ID > 1))
                {
                    tblFundCharge charges = new tblFundCharge()
                    {
                        ClassCompositeID = CompositeID,
                        FundID = item.ID,
                        Charges = 0
                    };
                    db.tblFundCharges.Add(charges);
                    db.SaveChanges();
                }
            }
        }
        // QUALIFICATION METHODS

        public static List<DegreeViewModel> lstQualification()
        {
            var lst = new List<DegreeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                foreach (var item in db.tblDegreeParameters.ToList())
                {
                    lst.Add(new DegreeViewModel()
                    {
                        ID = item.ID,
                        DegreeTitle = item.DegreeTitle,
                        IsActive = item.IsActive
                    });
                }
            }

            return lst;
        }

        public static void CreateSectionColor(SectionColorViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblSectionColor create = new tblSectionColor()
                {
                    Color = model.Color,
                    IsActive = true
                };
                db.tblSectionColors.Add(create);
                db.SaveChanges();
            }
        }
        public static string SectionColorByID(int? id)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblSectionColor row = db.tblSectionColors.Find(id);

                if (row != null)
                {
                    return row.Color;
                }
                return "";
            }
        }
        public static void UpdateSectionColor(SectionColorViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblSectionColor row = db.tblSectionColors.Find(model.ID);

                if (row != null)
                {
                    row.Color = model.Color;
                    db.SaveChanges();
                }
            }
        }

        public static void CreateQualification(DegreeViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblDegreeParameter degree = new tblDegreeParameter()
                {
                    DegreeTitle = model.DegreeTitle,
                    IsActive = true
                };
                db.tblDegreeParameters.Add(degree);
                db.SaveChanges();
            }
        }
        public static void UpdateQualification(DegreeViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblDegreeParameter row = db.tblDegreeParameters.Find(model.ID);

                if (row != null)
                {
                    row.DegreeTitle = model.DegreeTitle;
                    db.SaveChanges();
                }
            }
        }

        // One Delete function for all paramaters

        public static void deleteParameter(int? id, string type)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                switch (type)
                {
                    case "occupation":
                        var occupation = db.tblOccupations.Find(id);
                        occupation.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "section":
                        var section = db.tblSections.Find(id);
                        section.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "qualification":
                        var qual = db.tblDegreeParameters.Find(id);
                        qual.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "class":
                        var clas = db.tblClasses.Find(id);
                        clas.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "locality":
                        var loc = db.tblLocalities.Find(id);
                        loc.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "subject":
                        var subject = db.tblSubjectGroups.Find(id);
                        subject.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "color":
                        var color = db.tblSectionColors.Find(id);
                        color.IsActive = false;
                        db.SaveChanges();
                        break;
                    case "branch":
                        var branch = db.tblBranches.Find(id);
                        branch.IsActive = false;
                        db.SaveChanges();
                        break;
                    default:
                        break;
                }
            }
        }

        // One Activate function for all paramaters

        public static void ActivateParameter(int? id, string type)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                switch (type)
                {
                    case "occupation":
                        var occupation = db.tblOccupations.Find(id);
                        occupation.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "section":
                        var section = db.tblSections.Find(id);
                        section.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "qualification":
                        var qual = db.tblDegreeParameters.Find(id);
                        qual.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "class":
                        var clas = db.tblClasses.Find(id);
                        clas.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "locality":
                        var loc = db.tblLocalities.Find(id);
                        loc.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "subject":
                        var subject = db.tblSubjectGroups.Find(id);
                        subject.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "color":
                        var color = db.tblSectionColors.Find(id);
                        color.IsActive = true;
                        db.SaveChanges();
                        break;
                    case "branch":
                        var branch = db.tblBranches.Find(id);
                        branch.IsActive = true;
                        db.SaveChanges();
                        break;
                    default:
                        break;
                }
            }
        }
        // GET ROLL NUMBER
        public static int? GetRollNumber(int? RegID, int? ClassID, int? SectionID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent find = db.tblStudents.Find(RegID);
                if (find != null)
                {
                    if (find.IsActive == true)
                    {
                        var lst = db.tblStudents.Where(x => x.Class_ID == ClassID && x.Section_ID == SectionID && x.IsActive == true).OrderBy(x => x.Reg_Id).ToList();
                        int serial = 0;
                        var lstStd = new List<StudentViewModel>();

                        foreach (var item in lst)
                        {
                            serial += 1;
                            lstStd.Add(new StudentViewModel()
                            { RollNumber = serial, Reg_Id = item.Reg_Id });
                        }
                        return lstStd.Where(x => x.Reg_Id == RegID).First().RollNumber;
                    }
                    return 0;
                }
                return 0;
            }
        }

        // CALCULATE AGE 
        public static int CalculateAge(int? STudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent student = db.tblStudents.Find(STudentID);

                if (student.Date_of_Brith != null)
                {
                    var today = DateTime.Today;
                    var birthdate = student.Date_of_Brith;

                    var age = today.Year - birthdate.Value.Year;

                    // Go back to the year the person was born in case of a leap year

                    if (birthdate > today.AddYears(-age))
                    {
                        age--;
                    }

                    return age;
                }

                return 0;
            }
        }

        public static List<tblFundType> lstFundType()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblFundTypes.ToList();
            }
        }
    }
}

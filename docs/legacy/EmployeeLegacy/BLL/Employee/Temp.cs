using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel.Employee;

namespace Data.BLL.Staff
{
    public class Temp
    {
        public static void Insert(EmployeeTempViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.tblTempStaffs.Add(new tblTempStaff()
                {
                    Hash = model.Hash,
                    Type = model.Type,
                    Qual_Degree = model.Qual_Degree,
                    Qual_Board = model.Qual_Board,
                    Qual_Grade = model.Qual_Grade,
                    Qual_Marks = model.Qual_Marks,
                    Qual_Remarks = model.Qual_Remarks,
                    Qual_Year = model.Qual_Year,
                    Asset_Name = model.Asset_Name,
                    Asset_AssetWorth = model.Asset_AssetWorth,
                    Asset_DateOfIssue = model.Asset_DateOfIssue,
                    Asset_Remarks = model.Asset_Remarks,
                    Exp_Designation = model.Exp_Designation,
                    Exp_DurationYears = model.Exp_DurationYears,
                    Exp_FromDate = model.Exp_FromDate,
                    Exp_InstituteName = model.Exp_InstituteName,
                    Exp_ToDate = model.Exp_ToDate,
                    SubjectID = model.SubjectID,
                    Attachment = model.Attachment,
                });
                db.SaveChanges();
            }
        }

        public static List<tblTempStaff> ListByHash(string Hash, string Type)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblTempStaffs.Where(x => x.Hash == Hash && x.Type == Type).ToList();
            }
        }

        public static void DeleteRow(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("Delete from tblTempStaff where ID = " + ID); 
            }
        }

        public static void DrainTable()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("Delete from tblTempStaff");
            }
        }
    }
}

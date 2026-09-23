using System;
using System.Collections.Generic;
using System.Linq;
using Data.BLL;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class Generate
    {
        public static void GenerateFund(int? StudentID, int? FundTypeID, int? Month, int? Year, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var CompositeID = db.tblStudents.Where(x => x.Reg_Id == StudentID).First().ClassCompositeID;
                var TypeName = db.tblFundTypes.Find(FundTypeID).FundType;

                // Check if Row already exist, if yes Overwrite Total Amount, else Insert new row

                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID && x.Month == Month && x.Year == Year && x.Payment > 0).FirstOrDefault();

                if (row == null)
                {
                    tblFeeAndFundCollection insert = new tblFeeAndFundCollection()
                    {
                        StudentID = StudentID,
                        ClassID = CompositeID,
                        FundTypeID = FundTypeID,
                        Type = TypeName,
                        Month = Month,
                        Year = Year,
                        Date = DateTime.Now.Date,
                        Payment = Amount,
                        Recieved = 0,
                        Discount = 0,
                        BranchID = 1,
                        VoidAmount = 0,
                        SessionYear = DateTime.Now.Year.ToString()
                    };
                    db.tblFeeAndFundCollections.Add(insert);
                    db.SaveChanges();
                }
                else
                {
                    row.Payment = Amount;
                    row.Type = TypeName;
                    db.SaveChanges();
                }
            }
        }

        public static void GenerateFine(int? StudentID, int? FundTypeID, int? Month, int? Year, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var CompositeID = db.tblStudents.Where(x => x.Reg_Id == StudentID).First().ClassCompositeID;
                var TypeName = db.tblFundTypes.Find(FundTypeID).FundType;

                tblFeeAndFundCollection insert = new tblFeeAndFundCollection()
                {
                    StudentID = StudentID,
                    ClassID = CompositeID,
                    FundTypeID = FundTypeID,
                    Type = TypeName,
                    Month = Month,
                    Year = Year,
                    Date = DateTime.Now.Date,
                    Payment = Amount,
                    Recieved = 0,
                    Discount = 0,
                    BranchID = 1,
                    VoidAmount = 0,
                    SessionYear = DateTime.Now.Year.ToString()
                };
                db.tblFeeAndFundCollections.Add(insert);
                db.SaveChanges();
            }
        }


        // Default : Generate Tution Fee For All Classes
        public static void TutionFee(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblStudents.Where(x => x.IsActive == true).ToList();

                foreach (var item in lst)
                {
                    GenerateFund(item.Reg_Id, 1, Month, Year, item.TutionFee);
                }
            }
        }

        // Overload 1: Generate Tution Fee For This Student
        public static void TutionFee(int? StudentID, int? Month, int? Year, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (Amount == -1)
                {
                    decimal? TF = db.tblStudents.Where(x => x.Reg_Id == StudentID).First().TutionFee;
                    GenerateFund(StudentID, 1, Month, Year, TF);
                }
                else
                {
                    GenerateFund(StudentID, 1, Month, Year, Amount);
                }
            }
        }

        // GENERATE TUTION FEE by SP
        public static void TutionFee_SP(int? Month, int? Year, string Session)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.CommandTimeout = 180;
                db.Database.ExecuteSqlCommand("EXEC SPstudentfee " + Month + " , " + Year + " , " + Session);
            }
        }

        // Default : Generate Annual Fund For All Classes
        public static void GenerateAnnualFund(int? CompositeID, int? FundTypeID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblStudents.Where(x => x.IsActive == true).ToList();

                foreach (var item in lst)
                {
                    GenerateFund(item.Reg_Id, FundTypeID, Month, Year, item.TutionFee);
                }
            }
        }

        // Overload 1: Generate Annual Fund For This Student
        public static void GenerateAnnualFund(int? StudentID, int? FundTypeID, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var student = db.tblStudents.Where(x => x.Reg_Id == StudentID).FirstOrDefault();
                int? CompositeID = student != null ? student.ClassCompositeID : 0;

                // Check if Row already exist, if yes Overwrite Total Amount, else Insert new row

                if (student != null)
                {
                    var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID && (x.Payment > 0 || (x.Payment + x.Recieved == 0))).FirstOrDefault();

                    if (row == null)
                    {
                        tblFeeAndFundCollection insert = new tblFeeAndFundCollection()
                        {
                            StudentID = StudentID,
                            ClassID = CompositeID,
                            FundTypeID = FundTypeID,
                            Month = 0,
                            Year = DateTime.Now.Year,
                            Date = DateTime.Now.Date,
                            Payment = Amount,
                            Recieved = 0,
                            BranchID = 1,
                            Discount = 0,
                            VoidAmount = 0,
                            SessionYear = DateTime.Now.Year.ToString()
                        };
                        db.tblFeeAndFundCollections.Add(insert);
                        db.SaveChanges();
                    }
                    else
                    {
                        row.Payment = Amount;
                        row.Date = DateTime.Now.Date;
                        db.SaveChanges();
                    }
                }
            }
        }

        /////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////////////////

        public static void GenerateMultiple(int? FundTypeID, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = Student.List.All().Where(x => x.IsActive == true).ToList();

                foreach (var item in lst)
                {
                    GenerateAnnualFund(item.Reg_Id, FundTypeID, Amount);
                }
            }
        }

        public static void GenerateMultiple(int? FundTypeID, int? ClassID, decimal? Amount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = Student.List.All().Where(x => x.IsActive == true && x.ClassCompositeID == ClassID).ToList();

                foreach (var item in lst)
                {
                    GenerateAnnualFund(item.Reg_Id, FundTypeID, Amount);
                }
            }
        }
    }
}

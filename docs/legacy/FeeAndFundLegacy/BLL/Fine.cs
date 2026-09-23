using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Fine
    {
        private static readonly int? FundTypeID = 6;
        public static void ReceiveFine(FeeViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblFeeAndFundCollection rcpt_fund = new tblFeeAndFundCollection()
                {
                    StudentID = model.StudentRegID,
                    TransactionID = model.TrxID,
                    FundTypeID = 6,
                    ClassID = model.ClassID,
                    Month = 0,
                    Year = model.Year,
                    Date = model.Date,
                    SessionYear = "",
                    //BranchID = 1,
                    Time = DateFunctions.GetCurrentTime(),
                    Payment = 0,
                    Recieved = model.AmountPaid,
                    Discount = 0,
                    ReceivedBy = model.ReceivedBy,
                    VoidAmount = 0,
                };
                db.tblFeeAndFundCollections.Add(rcpt_fund);
                db.SaveChanges();

                // Update Rcpt ID for each Receipt
                var lstTrx = db.tblFeeAndFundCollections.Where(x => x.TransactionID == model.TrxID).ToList();
                if (lstTrx.Count > 0)
                {
                    var lstDistinct = lstTrx.GroupBy(i => i.StudentID).Select(group => group.First());
                    foreach (var item in lstDistinct)
                    {
                        var RcptID = Receive.GenerateRcptID();
                        db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set RcptID = " + RcptID + " Where TransactionID = " + model.TrxID + " AND StudentID = " + item.StudentID + "");
                    }
                }
            }
        }

        public static List<v_FeeAndFundCollection> lstFine()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_FeeAndFundCollection.Where(x => x.FundTypeID == FundTypeID).ToList();

                return lst;
            }
        }
        public static List<v_DeletedFee> lstDeleteHistory()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_DeletedFee.ToList();

                return lst;
            }
        }

        public static void DeleteFineRow(int ID, string DeletedBy = null)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.FirstOrDefault(x => x.ID == ID);
                var gen_row = db.tblFeeAndFundCollections.FirstOrDefault(x => x.FundTypeID == FundTypeID && x.Payment == row.Recieved && x.Date == row.Date && x.StudentID == row.StudentID);

                if (row != null)
                {
                    db.tblDeletedFees.Add(new tblDeletedFee()
                    {
                        StudentID = row.StudentID ?? 0,
                        ClassID = row.ClassID ?? 0,
                        FundTypeID = row.FundTypeID ?? 0,
                        Payment = row.Payment,
                        Received = row.Recieved,
                        RcptID = row.RcptID,
                        TransactionID = row.TransactionID,
                        PaymentDate = row.Date,
                        OriginalReceivedBy = row.ReceivedBy,
                        DeletedBy = DeletedBy,
                        DeletionDate = DateTime.Now,
                        DeletionTime = DateTime.Now.TimeOfDay,
                    });

                    db.tblFeeAndFundCollections.Remove(row);

                    if (gen_row != null) { db.tblFeeAndFundCollections.Remove(gen_row); }

                    db.SaveChanges();
                }
            }
        }

        //public static void DeleteFineRow(int ID)
        //{
        //    using (dbSchoolEntities db = new dbSchoolEntities())
        //    {
        //        //  Check if tblDeletedFee exists in the database
        //        var tableExists = db.Database.SqlQuery<int>(
        //            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tblDeletedFee'").FirstOrDefault() > 0;

        //        // If the table doesn't exist, create it using the schema from tblFeeAndFundCollections
        //        if (!tableExists)
        //        {
        //            string createTableQuery = @"
        //        SELECT TOP 0 * INTO tblDeletedFee FROM tblFeeAndFundCollection";

        //            db.Database.ExecuteSqlCommand(createTableQuery);

        //            // Optionally add the new columns (DeletionDate, DeletionTime) if necessary
        //            string alterTableQuery = @"
        //        ALTER TABLE tblDeletedFee 
        //        ADD DeletionDate DATETIME, DeletionTime TIME";

        //            db.Database.ExecuteSqlCommand(alterTableQuery);
        //        }

        //        //  Fetch the row to delete from tblFeeAndFundCollections
        //        var row = db.tblFeeAndFundCollections.FirstOrDefault(x => x.ID == ID);

        //        if (row != null)
        //        {
        //            // Insert the row into tblDeletedFee
        //            string insertQuery = @"
        //        INSERT INTO tblDeletedFee 
        //        (Date, StudentID, ClassID, FundTypeID, Payment, Recieved, ReceivedBy, DeletionDate, DeletionTime)
        //        SELECT Date, StudentID, ClassID, FundTypeID, Payment, Recieved, ReceivedBy, @p0, @p1
        //        FROM tblFeeAndFundCollection WHERE ID = @p2";

        //            db.Database.ExecuteSqlCommand(insertQuery,
        //                DateTime.Now,          
        //                DateTime.Now.TimeOfDay,
        //                row.ID                 
        //            );

        //            // Step 5: Delete the original row from tblFeeAndFundCollections
        //            db.tblFeeAndFundCollections.Remove(row);
        //            db.SaveChanges(); // Save the changes
        //        }
        //    }
        //}


    }
}

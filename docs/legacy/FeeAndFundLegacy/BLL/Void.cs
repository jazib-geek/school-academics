using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class Void
    {
        public static List<v_FeeAndFundCollection> List()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.VoidAmount > 0).ToList();
            }
        }
        public static void VoidThisReceipt(int? RecieptID, string Username)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set VoidAmount = Recieved where RcptID = " + RecieptID);
                db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Payment = 0 where RcptID = " + RecieptID);
                db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Recieved = 0 where RcptID = " + RecieptID);
                db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set VoidDate = '"+ DateTime.Now.Date.ToShortDateString() +"' where RcptID = " + RecieptID);
                db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set VoidBy = '"+ Username +"' where RcptID = " + RecieptID);
            }
        }
    }
}


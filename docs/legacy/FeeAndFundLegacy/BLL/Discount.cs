using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class Discount
    {
        public static void ApplyDisocunt(int? RowID, int? Discount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblFeeAndFundCollection row = db.tblFeeAndFundCollections.Find(RowID);

                if (row != null)
                {
                    var CurrentTotal = row.Payment;
                    var DiscountAmount = (Convert.ToDecimal(Discount) / 100) * CurrentTotal;
                    var FeeAfterDiscount = CurrentTotal - DiscountAmount;

                    db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Payment = " + FeeAfterDiscount + " where ID = " + RowID);
                    db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Discount = " + DiscountAmount + " where ID = " + RowID);
                }
            }
        }

        public static void RemoveDiscount(int? RowID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblFeeAndFundCollection row = db.tblFeeAndFundCollections.Find(RowID);

                if (row != null)
                {
                    decimal? Discount = row.Discount;
                    var CurrentTotal = row.Payment;
                    var FeeAfterDiscount = CurrentTotal + Discount;

                    db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Payment = " + FeeAfterDiscount + " where ID = " + RowID);
                    db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set Discount = " + 0 + " where ID = " + RowID);
                }
            }
        }
        public static decimal? GetDiscountValue(int? StudentID, int? FundTypeID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID && x.Month == Month && x.Year == Year && x.Payment > 0).FirstOrDefault();

                if (row != null)
                {
                    return row.Discount;
                }

                return 0;
            }
        }
    }
}

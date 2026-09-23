using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Funds
    {
        public static FundViewModel GetFunds(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lstFund = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID != 1).ToList();

                if (lstFund.Count > 0)
                {
                    var model = new FundViewModel();

                    var Fund1 = lstFund.Where(x => x.FundTypeID == 2 && x.Payment > 0).FirstOrDefault();
                    if (Fund1 != null)
                    {
                        model.FundType_1 = Fund1.Payment;
                    }
                    else
                    {
                        model.FundType_1 = 0;
                    }

                    var Fund2 = lstFund.Where(x => x.FundTypeID == 3 && x.Payment > 0).FirstOrDefault();
                    if (Fund2 != null)
                    {
                        model.FundType_2 = Fund2.Payment;
                    }
                    else
                    {
                        model.FundType_2 = 0;
                    }

                    var Fund3 = lstFund.Where(x => x.FundTypeID == 4 && x.Payment > 0).FirstOrDefault();
                    if (Fund3 != null)
                    {
                        model.FundType_3 = Fund3.Payment;
                    }
                    else
                    {
                        model.FundType_3 = 0;
                    }

                    var Fund4 = lstFund.Where(x => x.FundTypeID == 5 && x.Payment > 0).FirstOrDefault();
                    if (Fund4 != null)
                    {
                        model.FundType_4 = Fund4.Payment;
                    }
                    else
                    {
                        model.FundType_4 = 0;
                    }


                    return model;
                }

                return new FundViewModel();
            }
        }

        public static decimal? GetFunds(int? StudentID, int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.Recieved == 0 && x.FundTypeID == FundTypeID).FirstOrDefault();

                if (row != null)
                {
                    return row.Payment;
                }

                return 0;
            }
        }
        public static string GetFundByType(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFundTypes.Find(ID);

                if (row != null)
                {
                    return row.FundType;
                }

                return "";
            }
        }
    }
}

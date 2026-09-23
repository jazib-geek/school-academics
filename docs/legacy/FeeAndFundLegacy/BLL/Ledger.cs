using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;
using Data.Viewmodel;
using Data.BLL;

namespace Data.BLL.FeeAndFund
{
    public class Ledger
    {
        public static FeeLedgerViewModel StudentLedger(int? StudentID)
        {
            var lst = new List<FeeLedgerViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID).ToList();

                foreach (var item in query)
                {
                    lst.Add(new FeeLedgerViewModel()
                    {
                        Date = item.Date,
                        FeeMonthYear = DateFunctions.convertToStringMonth(item.Month) + " " + item.Year,
                        Description = item.Type,
                        ReceiptNo = item.TransactionID.ToString(),
                        Due = item.Payment,
                        Received = item.Recieved,
                        // Balance = Balance - item.Amount
                    });
                }
            }

            var ledger = new FeeLedgerViewModel()
            {
                lstLedger = lst,
                StudentID = StudentID
            };

            return ledger;
        }

        public static FeeLedgerViewModel StudentLedgerAlt(int? StudentID)
        {
            var lst = new List<FeeLedgerViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = db.v_FeeAndFundCollection.Where(x => x.StudentID == StudentID && (x.Recieved + x.Payment > 0)).ToList();
                int i = 0;

                foreach (var item in query.OrderBy(x => x.ID))
                {
                    i++;
                    var model = new FeeLedgerViewModel()
                    {
                        Serial = i,
                        Date = item.Date,
                        FeeMonthYear = DateFunctions.convertToStringMonth(item.Month) + " " + item.Year,
                        Description = item.FundType,
                        ReceiptNo = item.RcptID.ToString(),
                        Due = item.Payment,
                        Received = item.Recieved,
                    };

                    if (i == 1)
                    {
                        model.Balance = item.Payment;
                    }
                    else
                    {
                        int? Previous = i - 1;
                        if (item.Recieved == 0)
                        {
                            model.Balance = lst.Where(x => x.Serial == Previous).First().Balance + item.Payment;
                        }
                        else if (item.Payment == 0)
                        {
                            model.Balance = lst.Where(x => x.Serial == Previous).First().Balance - item.Recieved;
                        }
                    }

                    lst.Add(model);
                }
            }

            var ledger = new FeeLedgerViewModel()
            {
                lstLedger = lst,
                StudentID = StudentID
            };

            return ledger;
        }

        }
}

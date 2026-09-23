using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.Viewmodel.Account;
using Data.DAL;

namespace Data.BLL.Accounts
{
    public class Ledger
    {
        public static List<AccountLedgerViewModel> GetLedger(DateTime? From, DateTime? To, string AccountID)
        {
            var lst = new List<AccountLedgerViewModel>();
            int i = 0;

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from ledger in db.tblTransactionDetails
                            join account in db.tblAccounts on ledger.AccountID equals account.AccountID
                            where ledger.Date >= From && ledger.Date <= To && ledger.AccountID == AccountID
                            select new { ledger, account };

                foreach (var item in query)
                {
                    i += 1;
                    var model = new AccountLedgerViewModel()
                    {
                        serial = i,
                        ID = item.ledger.ID,
                        AccountID = item.ledger.AccountID,
                        Date = item.ledger.Date,
                        Narration = item.ledger.Narration,
                        Debit = item.ledger.Debit,
                        Credit = item.ledger.Credit,
                    };

                    if (item.ledger.Credit == 0)
                    {
                        if (i == 1)
                        {
                            model.Balance = item.ledger.Debit;
                        }
                        else if (i > 0)
                        {
                            int PreviousSerial = i - 1;
                            model.Balance = lst.Where(x => x.serial == PreviousSerial).First().Balance + item.ledger.Debit;
                        }
                        lst.Add(model);
                    }
                    else if (item.ledger.Debit == 0)
                    {
                        if (i == 1)
                        {
                            model.Balance = item.ledger.Credit;
                        }
                        else if (i > 0)
                        {
                            int PreviousSerial = i - 1;
                            model.Balance = lst.Where(x => x.serial == PreviousSerial).First().Balance - item.ledger.Credit;
                        }
                        lst.Add(model);
                    }
                }
            }

            return lst;
        }
        public static List<AccountLedgerViewModel> CashBook(DateTime? Date)
        {
            var lst = new List<AccountLedgerViewModel>();
            int i = 0;

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from ledger in db.tblTransactionDetails
                            join account in db.tblAccounts on ledger.AccountID equals account.AccountID
                            where ledger.Date == Date
                            select new { ledger, account };

                foreach (var item in query)
                {
                    lst.Add(new AccountLedgerViewModel()
                    {
                        ID = item.ledger.ID,
                        VoucherNo = item.ledger.VoucherNumber,
                        AccountID = item.ledger.AccountID,
                        Date = item.ledger.Date,
                        Narration = item.ledger.Narration,
                        Debit = item.ledger.Debit,
                        Credit = item.ledger.Credit,
                        Account = item.account
                    });
                }
            }

            return lst;
        }


        // Distict Dates List : By Interval
        public static List<AccountLedgerViewModel> lstDinstinctDate(DateTime? From, DateTime? To)
        {
            var lst = new List<AccountLedgerViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lstLedger = db.tblTransactionDetails.Where(x => x.Date >= From && x.Date <= To).ToList();

                if (lstLedger.Count > 0)
                {
                    var Distinct = lstLedger.GroupBy(x => x.Date).Select(g => g.OrderByDescending(x => x.Date).First()).ToList();

                    foreach (var item in Distinct)
                    {
                        lst.Add(new AccountLedgerViewModel()
                        {
                            Date = item.Date,
                            Debit = item.Debit,
                            Credit = item.Credit
                        });
                    }
                }
            }

            return lst;
        }
    }
}

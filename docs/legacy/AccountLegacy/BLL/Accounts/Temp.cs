using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel.Account;

namespace Data.BLL.Accounts
{
    public class Temp
    {
        public static void InsertTempRow(TransactionViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var DebitAccount = db.tblAccounts.Where(x => x.AccountID == model.DebitAccount).First();
                var CreditAccount = db.tblAccounts.Where(x => x.AccountID == model.CreditAccount).First();

                tblTempTransaction DebitEntry = new tblTempTransaction()
                {
                    Hash = model.Hash,
                    VoucherType = model.VoucherType,
                    Date = model.Date,
                    AccountID = model.DebitAccount,
                    MasterID = DebitAccount.MasterID,
                    GroupID = DebitAccount.GroupID,
                    SubGroupID = DebitAccount.SubGroupID,
                    Debit = model.Amount,
                    Credit = 0,
                    Month = model.Date.Value.Month,
                    Year = model.Date.Value.Year,
                    Narration = model.Narration,
                };

                db.tblTempTransactions.Add(DebitEntry);
                db.SaveChanges();

                tblTempTransaction CreditEntry = new tblTempTransaction()
                {
                    Hash = model.Hash,
                    VoucherType = model.VoucherType,
                    Date = model.Date,
                    AccountID = model.CreditAccount,
                    MasterID = CreditAccount.MasterID,
                    GroupID = CreditAccount.GroupID,
                    SubGroupID = CreditAccount.SubGroupID,
                    Debit = 0,
                    Credit = model.Amount,
                    Month = model.Date.Value.Month,
                    Year = model.Date.Value.Year,
                    Narration = model.Narration,
                };

                db.tblTempTransactions.Add(CreditEntry);
                db.SaveChanges();
            }
        }

        public static void InsertTempRowCashPayment(TransactionViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var DebitAccount = db.tblAccounts.Where(x => x.AccountID == model.DebitAccount).First();

                tblTempTransaction DebitEntry = new tblTempTransaction()
                {
                    Hash = model.Hash,
                    VoucherType = model.VoucherType,
                    Date = model.Date,
                    AccountID = model.DebitAccount,
                    MasterID = DebitAccount.MasterID,
                    GroupID = DebitAccount.GroupID,
                    SubGroupID = DebitAccount.SubGroupID,
                    Debit = model.Amount,
                    Credit = 0,
                    Month = model.Date.Value.Month,
                    Year = model.Date.Value.Year,
                    Narration = model.Narration,
                };

                db.tblTempTransactions.Add(DebitEntry);
                db.SaveChanges();
            }
        }

        public static void InsertTempRowCashReceipt(TransactionViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var CreditAccount = db.tblAccounts.Where(x => x.AccountID == model.CreditAccount).First();

                tblTempTransaction CreditEntry = new tblTempTransaction()
                {
                    Hash = model.Hash,
                    VoucherType = model.VoucherType,
                    Date = model.Date,
                    AccountID = model.CreditAccount,
                    MasterID = CreditAccount.MasterID,
                    GroupID = CreditAccount.GroupID,
                    SubGroupID = CreditAccount.SubGroupID,
                    Debit = 0,
                    Credit = model.Amount,
                    Month = model.Date.Value.Month,
                    Year = model.Date.Value.Year,
                    Narration = model.Narration,
                };

                db.tblTempTransactions.Add(CreditEntry);
                db.SaveChanges();
            }
        }


        public static List<TransactionViewModel> GetByHash(string Hash)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = new List<TransactionViewModel>();

                var query = db.tblTempTransactions.Where(x => x.Hash == Hash).ToList();

                foreach (var item in query)
                {
                    lst.Add(new TransactionViewModel()
                    {
                        ID = item.ID,
                        Hash = item.Hash,
                        VoucherType = item.VoucherType,
                        Date = item.Date,
                        AccountID = item.AccountID,
                        MasterID = item.MasterID,
                        GroupID = item.GroupID,
                        SubGroupID = item.SubGroupID,
                        Debit = item.Debit,
                        Credit = item.Credit,
                        Month = item.Date.Value.Month,
                        Year = item.Date.Value.Year,
                        Narration = item.Narration,
                    });
                }
                return lst;
            }
        }

        public static void DrainTempTable()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblTempTransactions.ToList();

                foreach (var item in lst)
                {
                    db.tblTempTransactions.Remove(item);
                    db.SaveChanges();
                }
            }
        }

        public static void DeleteRow(int ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("delete from tblTempTransaction where ID = " + ID); 
            }
        }
    }
}

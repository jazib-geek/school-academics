using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel.Account;

namespace Data.BLL.Accounts
{
    public class Transaction
    {
        public static string InsertNewTransaction(string Hash, DateTime Date, string EntryUser)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblTempTransactions.Where(x => x.Hash == Hash).ToList();

                if (lst.Count > 0)
                {
                    string VoucherType = lst.First().VoucherType;
                    string VoucherCode = GenerateVoucherCode(VoucherType, Date);

                    tblTransactionMaster Master = new tblTransactionMaster()
                    {
                        VoucherNo = VoucherCode,
                        VoucherType = VoucherType,
                        TransactionDate = lst.First().Date.Value,
                        EntryUser = EntryUser,
                        TotalAmount = lst.Sum(x => x.Debit),
                        Status = "Completed"
                    };
                    db.tblTransactionMasters.Add(Master);
                    db.SaveChanges();

                    foreach (var item in lst)
                    {
                        tblTransactionDetail Detail = new tblTransactionDetail()
                        {
                            VoucherNumber = VoucherCode,
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
                        };
                        db.tblTransactionDetails.Add(Detail);
                        db.SaveChanges();
                    }

                    Temp.DrainTempTable();

                    return VoucherCode;
                }
                return "";
            }
        }

        public static string GenerateVoucherCode(string VoucherType, DateTime Date)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblVoucherType Voucher = db.tblVoucherTypes.Where(x => x.VoucherTypeDenotion == VoucherType).First();
                string V_Type = Voucher.VoucherTypeDenotion;
                int? Month = Date.Month;
                int? Year = Date.Year;
                string PostFix = "";

                var lst = db.tblTransactionDetails.Where(x => x.Month == Month && x.Year == Year && x.VoucherType == V_Type).ToList();

                if (lst.Count == 0)
                {
                    return DateTime.Now.ToString("yy") + Month.Value.ToString("00") + Voucher.Prefix.ToString() + "0001";
                }
                else
                {
                    // int rows = (lst.Count / 2) + 1;
                    int rows = lst.Count + 1;
                    return DateTime.Now.ToString("yy") + Month.Value.ToString("00") + Voucher.Prefix.ToString() + rows.ToString("0000");
                }
            }
        }

        public static TransactionViewModel GetVoucher(string VoucherNo)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Master = db.tblTransactionMasters.Where(x => x.VoucherNo == VoucherNo).FirstOrDefault();

                if (Master != null)
                {
                    return new TransactionViewModel()
                    {
                        Master = Master,
                        lstDetail = db.tblTransactionDetails.Where(x => x.VoucherNumber == VoucherNo).ToList()
                    };
                }

                return new TransactionViewModel();
            }
        }

        public static tblTransactionDetail GetDetailRow(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblTransactionDetails.Find(ID);
            }
        }

        public static void EditVoucher(TransactionViewModel model)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var DetailRow = db.tblTransactionDetails.Find(model.ID);
                if (DetailRow != null)
                {
                    string V_No = DetailRow.VoucherNumber;
                    var ACCOUNT = db.tblAccounts.Where(x => x.AccountID == model.AccountID).FirstOrDefault();
                    DetailRow.Date = model.Date;
                    DetailRow.Month = model.Date.Value.Month;
                    DetailRow.Year = model.Date.Value.Year;
                    DetailRow.Narration = model.Narration;
                    DetailRow.AccountID = model.AccountID;

                    DetailRow.MasterID = ACCOUNT.MasterID;
                    DetailRow.GroupID = ACCOUNT.GroupID;
                    DetailRow.SubGroupID = ACCOUNT.SubGroupID;

                    DetailRow.Debit = model.Debit;
                    DetailRow.Credit = model.Credit;

                    db.SaveChanges();

                    var Master = db.tblTransactionMasters.Where(x => x.VoucherNo == V_No).FirstOrDefault();
                    Master.TransactionDate = model.Date.Value;
                    if (Master.VoucherType == "CPV")
                    {
                        Master.TotalAmount = db.tblTransactionDetails.Where(x => x.VoucherNumber == V_No).Sum(x => x.Debit);
                    }
                    else if (Master.VoucherType == "CRV")
                    {
                        Master.TotalAmount = db.tblTransactionDetails.Where(x => x.VoucherNumber == V_No).Sum(x => x.Credit);
                    }
                    db.SaveChanges();
                }
            }
        }
    }
}

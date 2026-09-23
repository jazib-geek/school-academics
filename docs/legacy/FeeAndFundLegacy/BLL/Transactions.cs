using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Transactions
    {
        // NET AMOUNT BY TRANSACTION
        public static decimal? NetAmountOfTransaction(int? TrxID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.TransactionID == TrxID).ToList();
                if (lst.Count > 0)
                {
                    return lst.Sum(x => x.Recieved);
                }
                return 0;
            }
        }

        public static int? generateTrxID()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.Recieved > 0).ToList();

                if (lst.Count() == 0)
                {
                    return 1;
                }

                return lst.Max(x => x.TransactionID) + 1;

            }
        }



        public static string ConvertNumberToWords(int number)
        {
            if (number == 0)
                return "zero";

            if (number < 0)
                return "minus " + ConvertNumberToWords(Math.Abs(number));

            string words = "";

            if ((number / 1000000) > 0)
            {
                words += ConvertNumberToWords(number / 1000000) + " million ";
                number %= 1000000;
            }

            if ((number / 1000) > 0)
            {
                words += ConvertNumberToWords(number / 1000) + " thousand ";
                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words += ConvertNumberToWords(number / 100) + " hundred ";
                number %= 100;
            }

            if (number > 0)
            {
                if (words != "")
                    words += "and ";

                var unitsMap = new[] { "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen" };
                var tensMap = new[] { "zero", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety" };

                if (number < 20)
                    words += unitsMap[number];
                else
                {
                    words += tensMap[number / 10];
                    if ((number % 10) > 0)
                        words += "-" + unitsMap[number % 10];
                }
            }

            words = Regex.Replace(words, @"\b([a-z])", m => m.Value.ToUpper());

            return words;
        }
    }
}

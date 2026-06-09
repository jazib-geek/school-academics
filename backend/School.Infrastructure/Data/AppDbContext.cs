using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data.Configurations;
using School.Infrastructure.Entities;
using System.Reflection.Emit;

namespace School.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<StudentFamilyDetail> StudentFamilyDetails => Set<StudentFamilyDetail>();

    public DbSet<Student> Students => Set<Student>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<FeeAndFundCollection> FeeAndFundCollections => Set<FeeAndFundCollection>();
    public DbSet<FundType> FundTypes { get; set; }
    public DbSet<NewsAndEvent> NewsAndEvents { get; set; }
    public DbSet<Attendance> Attendances { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<ExamType> ExamTypes { get; set; }
    public DbSet<SubjectMaster> SubjectMasters { get; set; }
    public DbSet<ComplaintUpdate> ComplaintUpdates => Set<ComplaintUpdate>();
    public DbSet<AccountGroup> AccountGroups => Set<AccountGroup>();
    public DbSet<AccountLedger> AccountLedgers => Set<AccountLedger>();
    public DbSet<AccountMaster> AccountMasters => Set<AccountMaster>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountSubGroup> AccountSubGroups => Set<AccountSubGroup>();
    public DbSet<AssignmentMaster> AssignmentMasters => Set<AssignmentMaster>();
    public DbSet<AssignmentSubmission> AssignmentSubmissions => Set<AssignmentSubmission>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<ClassDiary> ClassDiaries => Set<ClassDiary>();
    public DbSet<ClassSubject> ClassSubjects => Set<ClassSubject>();
    public DbSet<Complaint> Complaints => Set<Complaint>();
    public DbSet<Degree> Degrees => Set<Degree>();
    public DbSet<DegreeParameter> DegreeParameters => Set<DegreeParameter>();
    public DbSet<Designation> Designations => Set<Designation>();
    public DbSet<DesignationTiming> DesignationTimings => Set<DesignationTiming>();
    public DbSet<EmpAttendance> EmpAttendances => Set<EmpAttendance>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<CoordinatorDailyReport> CoordinatorDailyReports => Set<CoordinatorDailyReport>();
    public DbSet<CoordinatorModDuty> CoordinatorModDuties => Set<CoordinatorModDuty>();
    public DbSet<CoordinatorDailyAbsentTeacher> CoordinatorDailyAbsentTeachers => Set<CoordinatorDailyAbsentTeacher>();
    public DbSet<CoordinatorWorkingReportLine> CoordinatorWorkingReportLines => Set<CoordinatorWorkingReportLine>();
    public DbSet<EmployeeAsset> EmployeeAssets => Set<EmployeeAsset>();
    public DbSet<EmployeeAttachment> EmployeeAttachments => Set<EmployeeAttachment>();
    public DbSet<EmployeeAttendance> EmployeeAttendances => Set<EmployeeAttendance>();
    public DbSet<EmployeeClass> EmployeeClasses => Set<EmployeeClass>();
    public DbSet<EmployeeExperience> EmployeeExperiences => Set<EmployeeExperience>();
    public DbSet<EmployeeQualification> EmployeeQualifications => Set<EmployeeQualification>();
    public DbSet<EmployeeSalary> EmployeeSalaries => Set<EmployeeSalary>();
    public DbSet<EmployeeSalaryComponent> EmployeeSalaryComponents => Set<EmployeeSalaryComponent>();
    public DbSet<EmployeeSubject> EmployeeSubjects => Set<EmployeeSubject>();
    public DbSet<FeeType> FeeTypes => Set<FeeType>();
    public DbSet<FileDownload> FileDownloads => Set<FileDownload>();
    public DbSet<FundCharge> FundCharges => Set<FundCharge>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<HifzParaWiseStatus> HifzParaWiseStatuses => Set<HifzParaWiseStatus>();
    public DbSet<Institute> Institutes => Set<Institute>();
    public DbSet<Ledger> Ledgers => Set<Ledger>();
    public DbSet<Level1> Level1s => Set<Level1>();
    public DbSet<Level2> Level2s => Set<Level2>();
    public DbSet<Level3> Level3s => Set<Level3>();
    public DbSet<Level4> Level4s => Set<Level4>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<LoanDetail> LoanDetails => Set<LoanDetail>();
    public DbSet<Locality> Localities => Set<Locality>();
    public DbSet<NewsImage> NewsImages => Set<NewsImage>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Occupation> Occupations => Set<Occupation>();
    public DbSet<OnlineClassLink> OnlineClassLinks => Set<OnlineClassLink>();
    public DbSet<Parameter> Parameters => Set<Parameter>();
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<Salary> Salaries => Set<Salary>();
    public DbSet<SectionColor> SectionColors => Set<SectionColor>();
    public DbSet<Setup> Setups => Set<Setup>();
    public DbSet<StudentAccount> StudentAccounts => Set<StudentAccount>();
    public DbSet<StudentFamily> StudentFamilies => Set<StudentFamily>();
    public DbSet<StudentLog> StudentLogs => Set<StudentLog>();
    public DbSet<StudentType> StudentTypes => Set<StudentType>();
    public DbSet<SubjectClasswise> SubjectClasswises => Set<SubjectClasswise>();
    public DbSet<SubjectGroup> SubjectGroups => Set<SubjectGroup>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<TeacherAsset> TeacherAssets => Set<TeacherAsset>();
    public DbSet<TeacherAssetParameter> TeacherAssetParameters => Set<TeacherAssetParameter>();
    public DbSet<TeacherAttachment> TeacherAttachments => Set<TeacherAttachment>();
    public DbSet<TeacherAttendance> TeacherAttendances => Set<TeacherAttendance>();
    public DbSet<TeacherAttendanceInOut> TeacherAttendanceInOuts => Set<TeacherAttendanceInOut>();
    public DbSet<TeacherQualification> TeacherQualifications => Set<TeacherQualification>();
    public DbSet<TempAccountLedger> TempAccountLedgers => Set<TempAccountLedger>();
    public DbSet<TempStaff> TempStaffs => Set<TempStaff>();
    public DbSet<TempTransaction> TempTransactions => Set<TempTransaction>();
    public DbSet<TimeSlot> TimeSlots => Set<TimeSlot>();
    public DbSet<TimeTable> TimeTables => Set<TimeTable>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionDetail> TransactionDetails => Set<TransactionDetail>();
    public DbSet<TransactionMaster> TransactionMasters => Set<TransactionMaster>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRightsLegacy> UserRightsLegacies => Set<UserRightsLegacy>();
    public DbSet<UserRight> UserRights => Set<UserRight>();
    public DbSet<VoucherType> VoucherTypes => Set<VoucherType>();
    public DbSet<Role> Roles => Set<Role>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.ToTable("tblAttendance");

            entity.HasKey(x => x.ID);

            entity.Property(x => x.Status)
                .HasMaxLength(50);

            entity.Property(x => x.SessionYear)
                .HasMaxLength(500);

            entity.HasOne(x => x.Section)
                .WithMany(c => c.Attendances)
                .HasForeignKey(x => x.ClassSectionCompositeID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Student)
                .WithMany() // unless you add reverse collection
                .HasForeignKey(x => x.StudentID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.ToTable("tblStudent");

            entity.HasKey(e => e.Reg_Id);

            entity.Property(e => e.FullName)
                .HasMaxLength(200);

            entity.Property(e => e.Family_Code)
                .HasColumnName("Family_Code");

            entity.Property(e => e.ClassCompositeID)
                .HasColumnName("ClassCompositeID");

            // Relationship: Student → Family (via FamilyID)
            entity.HasOne(e => e.Family)
                .WithMany(f => f.Students)
                .HasForeignKey(e => e.Family_Code)
                .HasPrincipalKey(f => f.FamilyID)
                .OnDelete(DeleteBehavior.NoAction);

            // Relationship: Student → Section
            entity.HasOne(e => e.Section)
                .WithMany(s => s.Students)
                .HasForeignKey(e => e.ClassCompositeID)
                .HasPrincipalKey(s => s.ID)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<FundType>(entity =>
        {
            entity.ToTable("tblFundType");

            entity.HasKey(e => e.ID);

            entity.Property(e => e.FundTypeName)
               .HasColumnName("FundType");
        });


        modelBuilder.Entity<Section>(entity =>
        {
            entity.ToTable("tblSection");

            entity.HasKey(e => e.ID);

            entity.Property(e => e.Class_ID)
                .HasColumnName("Class_ID");

            entity.Property(e => e.ClassName)
                .HasMaxLength(200);

            entity.Property(e => e.SectionName)
                .HasMaxLength(100);
        });


        modelBuilder.Entity<StudentFamilyDetail>(entity =>
        {
            // Table Name
            entity.ToTable("tblStudentFamilyDetail");

            // Primary Key
            entity.HasKey(e => e.ID);

            entity.HasIndex(e => e.FamilyID).IsUnique();

            entity.HasAlternateKey(e => e.FamilyID);

            // Columns

            entity.Property(e => e.ID)
                .HasColumnName("ID");

            entity.Property(e => e.FamilyID)
                .HasColumnName("FamilyID");

            entity.Property(e => e.FatherName)
                .HasMaxLength(150);

            entity.Property(e => e.FatherCNIC)
                .HasMaxLength(50);

            entity.Property(e => e.FatherQualificationID);

            entity.Property(e => e.FatherOccupationID);

            entity.Property(e => e.FatherMobileNo)
                .HasMaxLength(50);

            entity.Property(e => e.FatherWorkPhone)
                .HasMaxLength(50);

            entity.Property(e => e.FatherEmail)
                .HasMaxLength(50);

            entity.Property(e => e.MotherName)
                .HasMaxLength(150);

            entity.Property(e => e.MotherCNIC)
                .HasMaxLength(50);

            entity.Property(e => e.MotherPhoneNo)
                .HasMaxLength(50);

            entity.Property(e => e.MotherQualificationID);

            entity.Property(e => e.MotherOccupationID);

            entity.Property(e => e.Password)
                .HasMaxLength(50);

            entity.Property(e => e.IsActive)
                .HasColumnType("bit");

            entity.Property(e => e.HomePhone)
                .HasMaxLength(50);

            entity.Property(e => e.HomeAddress)
                .HasMaxLength(200);
        });

        modelBuilder.Entity<FeeAndFundCollection>(entity =>
        {
            entity.ToTable("tblFeeAndFundCollection");

            modelBuilder.Entity<FeeAndFundCollection>()
    .HasOne(x => x.FundType)
    .WithMany(f => f.FeeAndFundCollections)
    .HasForeignKey(x => x.FundTypeID)
    .OnDelete(DeleteBehavior.Restrict);

            entity.HasKey(e => e.ID);

            entity.Property(e => e.SessionYear)
                .HasMaxLength(50);

            entity.Property(e => e.ReceivedBy)
                .HasMaxLength(100);

            entity.Property(e => e.Time)
                .HasMaxLength(100);

            entity.Property(e => e.ManualRcptNo)
                .HasMaxLength(100);

            entity.Property(e => e.Payment)
                .HasColumnType("decimal(18,0)");

            entity.Property(e => e.Recieved)
                .HasColumnType("decimal(18,0)");

            entity.Property(e => e.VoidAmount)
                .HasColumnType("decimal(18,0)");

            entity.Property(e => e.Discount)
                .HasColumnType("decimal(18,0)");

            entity.Property(e => e.AugustGen)
                .HasColumnType("decimal(18,0)");

            // Relationship: Collection → Student
            entity.HasOne(e => e.Student)
                .WithMany(s => s.LedgerEntries)
                .HasForeignKey(e => e.StudentID)
                .HasPrincipalKey(s => s.Reg_Id)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<NewsAndEvent>(entity =>
        {
            entity.ToTable("tblNewsAndEvents");

            entity.HasKey(x => x.ID);

            entity.Property(x => x.Title)
                .HasMaxLength(500);

            entity.Property(x => x.Type)
                .HasMaxLength(150);

            entity.Property(x => x.Description)
                .HasColumnType("nvarchar(max)");

            entity.Property(x => x.ImagePath)
                .HasColumnType("nvarchar(max)");
        });

        // Exam Entity Configuration
        modelBuilder.Entity<Exam>(entity =>
        {
            entity.ToTable("tblExam");

            entity.HasKey(e => e.ID);

            entity.Property(e => e.ID)
                  .HasColumnName("ID");

            entity.Property(e => e.ExamTypeID);
            entity.Property(e => e.StudentID);
            entity.Property(e => e.SubjectID);
            entity.Property(e => e.ClassID);
            entity.Property(e => e.SectionID);
            entity.Property(e => e.TotalMarks);
            entity.Property(e => e.MaxMarks);
            entity.Property(e => e.PassingMarks);
            entity.Property(e => e.ObtainedMarks);

            entity.Property(e => e.AttendanceRatio)
                  .HasMaxLength(50)
                  .IsUnicode(true);

            entity.Property(e => e.BranchID);

            entity.Property(e => e.SessionYear)
                  .HasMaxLength(500)
                  .IsUnicode(true);

            // 🔹 Relationships
            entity.HasOne(e => e.ExamType)
                  .WithMany(et => et.Exams)
                  .HasForeignKey(e => e.ExamTypeID)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Subject)
                  .WithMany(s => s.Exams)
                  .HasForeignKey(e => e.SubjectID)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Student)
                  .WithMany(st => st.Exams)
                  .HasForeignKey(e => e.StudentID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ExamType Entity Configuration
        modelBuilder.Entity<ExamType>(entity =>
        {
            entity.ToTable("tblExamType");

            entity.HasKey(e => e.ID);

            entity.Property(e => e.ID)
                  .HasColumnName("ID");

            entity.Property(e => e.ExamTypeName)
                  .HasColumnName("ExamType")   
                  .HasMaxLength(250)
                  .IsUnicode(true);

            entity.Property(e => e.IsActive);

            entity.Property(e => e.Priority);
        });

        // SubjectMaster Entity Configuration
        modelBuilder.Entity<SubjectMaster>(entity =>
        {
            entity.ToTable("tblSubjectMaster");

            entity.HasKey(e => e.ID);

            entity.Property(e => e.ID)
                  .HasColumnName("ID");

            entity.Property(e => e.SubjectName)
                  .HasMaxLength(500)
                  .IsUnicode(true);

            entity.Property(e => e.GroupName)
                  .HasMaxLength(500)
                  .IsUnicode(true);

            entity.Property(e => e.ShortName)
                  .HasMaxLength(100)
                  .IsUnicode(true);

            entity.Property(e => e.Charges)
                  .HasColumnType("decimal(18,0)");
        });

        modelBuilder.Entity<ComplaintUpdate>(entity => { entity.ToTable("tbl_ComplaintUpdate"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<AccountGroup>(entity => { entity.ToTable("tblAccountGroup"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<AccountLedger>(entity => { entity.ToTable("tblAccountLedger"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<AccountMaster>(entity => { entity.ToTable("tblAccountMaster"); entity.HasKey(e => e.MasterID); });
        modelBuilder.Entity<Account>(entity => { entity.ToTable("tblAccounts"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<AccountSubGroup>(entity =>
        {
            entity.ToTable("tblAccountSubGroup");
            entity.HasKey(e => e.ID);
            entity.Property(e => e.GroupID).HasMaxLength(50);
            entity.Property(e => e.SubGroupID).HasMaxLength(50);
        });
        modelBuilder.Entity<TransactionDetail>(entity =>
        {
            entity.ToTable("tblTransactionDetail");
            entity.HasKey(e => e.ID);
            entity.Property(e => e.VoucherNumber).HasMaxLength(20);
            entity.Property(e => e.VoucherType).HasMaxLength(20);
            entity.Property(e => e.GroupID).HasMaxLength(20);
            entity.Property(e => e.SubGroupID).HasMaxLength(20);
            entity.Property(e => e.AccountID).HasMaxLength(20);
            entity.Property(e => e.Debit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Credit).HasColumnType("decimal(18, 2)");
        });
        modelBuilder.Entity<AssignmentMaster>(entity => { entity.ToTable("tblAssignmentMaster"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<AssignmentSubmission>(entity => { entity.ToTable("tblAssignmentSubmission"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Branch>(entity => { entity.ToTable("tblBranch"); entity.HasKey(e => e.ID); });
        modelBuilder.ApplyConfiguration(new ClassConfiguration());
        modelBuilder.ApplyConfiguration(new ClassDiaryConfiguration());
        modelBuilder.Entity<ClassSubject>(entity => { entity.ToTable("tblClassSubjects"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Complaint>(entity => { entity.ToTable("tblComplaint"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Degree>(entity => { entity.ToTable("tblDegree"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<DegreeParameter>(entity => { entity.ToTable("tblDegreeParameters"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Designation>(entity =>
        {
            entity.ToTable("tblDesignation");
            entity.HasKey(e => e.ID);
            entity.Property(e => e.DesignationName)
                .HasColumnName("Designation")
                .HasMaxLength(250);
            entity.Property(e => e.IsActive).HasColumnType("bit");
        });
        modelBuilder.Entity<DesignationTiming>(entity => { entity.ToTable("tblDesignationTimings"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmpAttendance>(entity => { entity.ToTable("tblEmp_Attendance"); entity.HasKey(e => e.Id); });
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("tblEmployee");
            entity.HasKey(e => e.ID);

            entity.Property(e => e.Thumb_ID).HasMaxLength(150);
            entity.Property(e => e.EmployeeName).HasMaxLength(150);
            entity.Property(e => e.FatherName).HasMaxLength(150);
            entity.Property(e => e.Gender).HasMaxLength(150);
            entity.Property(e => e.Religion).HasMaxLength(150);
            entity.Property(e => e.Blood_Group).HasMaxLength(150);
            entity.Property(e => e.Permanent_Address).HasMaxLength(1000);
            entity.Property(e => e.HomePhone).HasMaxLength(150);
            entity.Property(e => e.Contact1).HasMaxLength(150);
            entity.Property(e => e.Contact2).HasMaxLength(150);
            entity.Property(e => e.Contact3).HasMaxLength(150);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.CNIC).HasMaxLength(50);
            entity.Property(e => e.IdentityMark).HasMaxLength(50);
            entity.Property(e => e.Refered_By).HasMaxLength(150);
            entity.Property(e => e.Salary).HasColumnType("decimal(18,0)");
            entity.Property(e => e.ProfessionalDegree).HasMaxLength(500);
            entity.Property(e => e.VerifiedBy).HasMaxLength(500);
            entity.Property(e => e.ApprovedBy).HasMaxLength(500);
            entity.Property(e => e.MaritalStatus).HasMaxLength(100);
            entity.Property(e => e.Password).HasMaxLength(100);
            entity.Property(e => e.IsMarried).HasColumnType("bit");
            entity.Property(e => e.IsTrained).HasColumnType("bit");
            entity.Property(e => e.IsActive).HasColumnType("bit");
        });
        modelBuilder.Entity<EmployeeAsset>(entity => { entity.ToTable("tblEmployeeAssets"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeAttachment>(entity => { entity.ToTable("tblEmployeeAttachment"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeAttendance>(entity =>
        {
            entity.ToTable("tblEmployeeAttendance");
            entity.HasKey(e => e.ID);

            entity.Property(e => e.Time).HasMaxLength(50);
            entity.Property(e => e.Type).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.UpdatedBy).HasMaxLength(50);
            entity.Property(e => e.CurrentSalary).HasColumnType("decimal(18,0)");
            entity.Property(e => e.LateDeduction).HasColumnType("decimal(18,0)");
            entity.Property(e => e.TodaySalary).HasColumnType("decimal(18,0)");

            entity.HasOne<Employee>()
                .WithMany()
                .HasForeignKey(e => e.EmpID)
                .OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<EmployeeClass>(entity => { entity.ToTable("tblEmployeeClass"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeExperience>(entity => { entity.ToTable("tblEmployeeExperience"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeQualification>(entity => { entity.ToTable("tblEmployeeQualification"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeSalary>(entity => { entity.ToTable("tblEmployeeSalary"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeSalaryComponent>(entity => { entity.ToTable("tblEmployeeSalaryComponents"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<EmployeeSubject>(entity => { entity.ToTable("tblEmployeeSubject"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<FeeType>(entity => { entity.ToTable("tblFeeType"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<FileDownload>(entity => { entity.ToTable("tblFileDownloads"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<FundCharge>(entity => { entity.ToTable("tblFundCharges"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Group>(entity => { entity.ToTable("tblGROUPS"); entity.HasKey(e => e.GROUP_ID); });
        modelBuilder.Entity<HifzParaWiseStatus>(entity => { entity.ToTable("tblHifz_ParaWiseStatus"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Institute>(entity => { entity.ToTable("tblInstitute"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Ledger>(entity => { entity.ToTable("tblLedger"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Level1>(entity => { entity.ToTable("tblLevel1"); entity.HasKey(e => e.LID1); });
        modelBuilder.Entity<Level2>(entity => { entity.ToTable("tblLevel2"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Level3>(entity => { entity.ToTable("tblLevel3"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Level4>(entity => { entity.ToTable("tblLevel4"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Loan>(entity => { entity.ToTable("tblLoan"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<LoanDetail>(entity => { entity.ToTable("tblLoanDetail"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Locality>(entity => { entity.ToTable("tblLocality"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<NewsImage>(entity => { entity.ToTable("tblNewsImages"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Notification>(entity => { entity.ToTable("tblNotifications"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Occupation>(entity => { entity.ToTable("tblOccupation"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<OnlineClassLink>(entity => { entity.ToTable("tblOnlineClassLink"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Parameter>(entity => { entity.ToTable("tblParameter"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Receipt>(entity => { entity.ToTable("tblReceipt"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Salary>(entity => { entity.ToTable("tblSalary"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<SectionColor>(entity => { entity.ToTable("tblSectionColors"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Setup>(entity => { entity.ToTable("tblSetup"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<StudentAccount>(entity => { entity.ToTable("tblStudentAccount"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<StudentFamily>(entity => { entity.ToTable("tblStudentFamily"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<StudentLog>(entity => { entity.ToTable("tblStudentLog"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<StudentType>(entity => { entity.ToTable("tblStudentType"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<SubjectClasswise>(entity =>
        {
            entity.ToTable("tblSubject_Classwise");
            entity.HasKey(e => e.ID);

            entity.Property(e => e.SubjectID);
            entity.Property(e => e.ClassID);

            entity.HasOne(e => e.Subject)
                .WithMany(s => s.ClassAssignments)
                .HasForeignKey(e => e.SubjectID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Section)
                .WithMany(s => s.SubjectAssignments)
                .HasForeignKey(e => e.ClassID)
                .OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<SubjectGroup>(entity => { entity.ToTable("tblSubjectGroup"); entity.HasKey(e => e.subject_group_id); });
        modelBuilder.Entity<Teacher>(entity => { entity.ToTable("tblTeacher"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherAsset>(entity => { entity.ToTable("tblTeacher_Asset"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherAssetParameter>(entity => { entity.ToTable("tblTeacher_Asset_Parameter"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherAttachment>(entity => { entity.ToTable("tblTeacher_Attachments"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherAttendance>(entity => { entity.ToTable("tblTeacher_Attendance"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherAttendanceInOut>(entity => { entity.ToTable("tblTeacher_Attendance_InOut"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TeacherQualification>(entity => { entity.ToTable("tblTeacherQualification"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TempAccountLedger>(entity => { entity.ToTable("tblTemp_AccountLedger"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TempStaff>(entity => { entity.ToTable("tblTempStaff"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TempTransaction>(entity => { entity.ToTable("tblTempTransaction"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TimeSlot>(entity => { entity.ToTable("tblTimeSlot"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TimeTable>(entity => { entity.ToTable("tblTimeTable"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Transaction>(entity => { entity.ToTable("tblTransaction"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<TransactionMaster>(entity => { entity.ToTable("tblTransactionMaster"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("tblUser");
            entity.HasKey(e => e.ID);
            entity.Property(e => e.Username).HasMaxLength(500);
            entity.Property(e => e.Password).HasMaxLength(100);
            entity.Property(e => e.RoleID);
            entity.Property(e => e.IsActive);
        });
        modelBuilder.Entity<UserRightsLegacy>(entity => { entity.ToTable("tblUser_Rights"); entity.HasKey(e => e.S_NO); });
        modelBuilder.Entity<UserRight>(entity => { entity.ToTable("tblUserRights"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<VoucherType>(entity => { entity.ToTable("tblVoucherType"); entity.HasKey(e => e.ID); });
        modelBuilder.Entity<Role>(entity => { entity.ToTable("tlbRole"); entity.HasKey(e => e.ID); });

        modelBuilder.ApplyConfiguration(new CoordinatorDailyReportConfiguration());
        modelBuilder.ApplyConfiguration(new CoordinatorModDutyConfiguration());
        modelBuilder.ApplyConfiguration(new CoordinatorDailyAbsentTeacherConfiguration());
        modelBuilder.ApplyConfiguration(new CoordinatorWorkingReportLineConfiguration());
    }
}

# SaaS subscription model (Pakistan market)

Draft plan for selling the school management platform as a hosted service. **Implementation is out of scope here**; this document defines tiers, limits, and **feature-flag keys** you can store on the tenant (institute) record and enforce at deploy time.

Related product inventory: [`features.md`](features.md).

---

## 1. Goals and constraints

| Goal | Notes |
|------|--------|
| Fit Pakistani private schools | Price-sensitive; fee + attendance are the buying trigger; exams and payroll matter for mid-size and up. |
| Simple sales story | Three names: **Basic**, **Standard**, **Premium**. |
| Technical enforcement later | One tenant row (or small config table) drives **plan tier**, **numeric limits**, and **boolean module flags**. |
| Avoid per-permission SKUs | Subscription gates **modules**, not each of 100+ campus permissions. Campus admins still assign permissions inside what the plan allows. |
| Academics exam maker | Separate SQL database (`AcademicContext`). Treat as its own flag; can be bundled only on Premium or sold as add-on. |

---

## 2. Recommended commercial model: **hybrid**

Pure feature-only plans are easy to explain but weak for very small vs large schools on the same tier. Pure per-student pricing matches market expectations but does not reflect real cost (payroll, chat, multi-campus).

**Default recommendation: hybrid**

1. **Plan tier** (Basic / Standard / Premium) → turns **feature flags** on or off.
2. **Included quotas** per tier → `MaxActiveStudents`, `MaxActiveEmployees`, `MaxCampuses`, `MaxCampusUsers` (and optionally `MaxEmployeePortalUsers`).
3. **Overage** (optional later) → soft warning → hard block, or sales-led upgrade; do not build billing automation in v1.

**Alternative modes** (pick one per customer contract if needed):

| Mode | When to use |
|------|-------------|
| Feature-only | Pilot chains where head office wants Premium features on one campus with few students. |
| Quota-only | Rare; only if you strip tiers and sell “full product + student bands”. |
| Hybrid (recommended) | Default for local market: clear upgrade path and fair sizing. |

---

## 3. Tier positioning (Pakistan)

| | **Basic** | **Standard** | **Premium** |
|---|-----------|--------------|-------------|
| **Tagline** | Run the front office | Full single-campus operations | Groups, franchises, and depth |
| **Typical buyer** | New / small private school (one building) | Established school with exams + staff portal | Multi-branch, franchise, or 1,000+ students |
| **Campuses** | 1 | 1 (2nd campus = upgrade or add-on) | Up to **5** included (negotiate above) |
| **Active students** | **400** | **1,500** | **5,000** (custom above) |
| **Active employees** | **40** | **150** | **500** |
| **Campus admin users** | **8** | **25** | **75** |
| **Employee portal seats** | **25** | **120** | **400** |
| **Indicative PKR / month** | **12,000 – 18,000** | **35,000 – 55,000** | **85,000 – 140,000** |
| **Indicative PKR / year** (pay annual) | ~2 months free | ~2 months free | Custom + SLA |

Pricing is **positioning**, not a commitment. Adjust after 5–10 paid pilots. Annual contracts with bank transfer / cheque remain common; card billing optional later.

**What counts toward limits**

- **Active student:** `IsActive` (or equivalent) roster row, not deleted history.
- **Active employee:** on payroll or portal-enabled staff, not deactivated.
- **Campus:** entry in `CampusSettings:Campuses` (or future tenant campus table).
- **Campus user:** campus JWT users (not employee-portal logins).
- **Employee portal seat:** distinct employees with portal login enabled.

Enforcement should use **soft limit at 90%** (banner) and **hard limit at 100%** for *new* admits/hires/users unless plan upgraded (existing records remain readable).

---

## 4. Feature matrix by tier

Legend: **●** included · **○** not included · **◐** limited (note)

### 4.1 Core operations

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Student admissions, profile, transfer, bulk edit | ● | ● | ● |
| Class / section / parameters | ● | ● | ● |
| Student reports (standard set) | ● | ● | ● |
| Student reports (advanced / smart analytics) | ○ | ◐ | ● |
| Dashboard (single campus) | ● | ● | ● |
| Org-wide multi-campus dashboard | ○ | ○ | ● |
| Activity logs | ○ | ◐ | ● |
| User management & permissions (within plan modules) | ● | ● | ● |

### 4.2 Attendance and leave

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Mark attendance, class reports | ● | ● | ● |
| Short leave | ○ | ● | ● |
| Absent follow-up | ○ | ● | ● |
| Parent leave applications (campus + API) | ○ | ● | ● |

### 4.3 Fees

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Generate tuition & funds, receive fee, receipts | ● | ● | ● |
| Update fee / increment fee | ● | ● | ● |
| Transaction history | ◐ | ● | ● |
| Void receipts | ○ | ● | ● |
| Cash vs online payment mode | ● | ● | ● |
| Fee reminder notices | ○ | ● | ● |
| Security deposit refund | ○ | ◐ | ● |
| Fee balance sheet & advanced fee analytics | ○ | ◐ | ● |

### 4.4 Accounts

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Cash receipt / payment vouchers | ○ | ● | ● |
| Ledger, cash book, account summary | ○ | ● | ● |
| Day closing (cash vs online split) | ○ | ● | ● |
| Profit & loss / income reports | ○ | ◐ | ● |
| Edit / delete vouchers | ○ | ○ | ● |
| Franchise royalty share | ○ | ○ | ● |

### 4.5 Examinations and academics (campus DB)

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Exam entry, marksheets, result cards | ◐ | ● | ● |
| Detailed subject marks | ○ | ● | ● |
| Award lists, positions, comparisons | ○ | ● | ● |
| Teacher analysis / performance | ○ | ◐ | ● |
| Subject allocation, timetables, datesheets | ○ | ● | ● |
| Daily diary | ○ | ● | ● |
| **Academics exam maker** (question bank / papers) | ○ | ○ | ● or add-on |

**Basic exam ◐:** one active exam session at a time, result cards only (no batch fancy layouts) — product decision at implementation time.

### 4.6 HR, payroll, and employee portal

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Employee list & designations | ○ | ● | ● |
| Live / monthly employee attendance, import | ○ | ● | ● |
| Attendance change requests | ○ | ● | ● |
| Salary calculation, adjustments, slips | ○ | ○ | ● |
| Employee portal (attendance, diary, datesheet view) | ○ | ● | ● |
| Portal: edit timetable / allocation / diary | ○ | ◐ | ● |
| Coordinator proforma + head monitoring | ○ | ○ | ● |

### 4.7 Conduct, family, and inventory

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Student conduct | ○ | ● | ● |
| Teacher conduct | ○ | ○ | ● |
| Family accounts & announcements | ○ | ● | ● |
| Parent-app **API** access (tenant enables) | ○ | ◐ | ● |
| Stationery / store | ○ | ○ | ● |

### 4.8 Collaboration

| Capability | Basic | Standard | Premium |
|------------|:-----:|:--------:|:-------:|
| Live campus notifications (bell) | ○ | ● | ● |
| In-app personal reminders | ○ | ● | ● |
| Campus chat | ○ | ○ | ● |
| Assign reminders/tasks to other users | ○ | ○ | ● |

---

## 5. Feature-flag catalog (for hidden DB config)

Store these as **booleans** (or a JSON object) on the tenant. Names are stable API for future middleware.

### 5.1 Plan metadata

| Field | Type | Example |
|-------|------|---------|
| `SubscriptionPlan` | enum | `Basic` \| `Standard` \| `Premium` |
| `SubscriptionStatus` | enum | `Trial` \| `Active` \| `Grace` \| `Suspended` |
| `TrialEndsAt` | date | |
| `ContractEndsAt` | date | optional |

### 5.2 Quota fields

| Field | Basic | Standard | Premium |
|-------|------:|---------:|--------:|
| `MaxCampuses` | 1 | 1 | 5 |
| `MaxActiveStudents` | 400 | 1500 | 5000 |
| `MaxActiveEmployees` | 40 | 150 | 500 |
| `MaxCampusUsers` | 8 | 25 | 75 |
| `MaxEmployeePortalUsers` | 25 | 120 | 400 |

Optional overrides: `QuotaOverridesJson` for enterprise deals without changing tier flags.

### 5.3 Module flags (`Feature.*`)

Map UI routes and API areas to flags. **Premium** = all `true` except explicitly add-on. **Basic** = only rows marked for Basic in section 6.

| Flag key | Product area |
|----------|----------------|
| `Feature.Students.Core` | Admissions, list, edit, transfer |
| `Feature.Students.ReportsAdvanced` | Smart / analytics student reports |
| `Feature.Dashboard.MultiCampus` | Cross-campus org dashboard |
| `Feature.Attendance.Core` | Mark + standard reports |
| `Feature.Attendance.ShortLeave` | Short leave |
| `Feature.Attendance.AbsentFollowup` | Absent follow-up |
| `Feature.Attendance.LeaveApplications` | Campus + API leave |
| `Feature.Fees.Core` | Generate, receive, basic reports |
| `Feature.Fees.Transactions` | Full transaction history |
| `Feature.Fees.VoidReceipt` | Void workflow |
| `Feature.Fees.ReminderNotices` | Reminder templates / print |
| `Feature.Fees.SecurityDeposit` | Deposit refund |
| `Feature.Fees.Analytics` | Balance sheet, recovery, defaulters, etc. |
| `Feature.Accounts.Vouchers` | CR/CP vouchers |
| `Feature.Accounts.Ledger` | Ledger, cash book, summary |
| `Feature.Accounts.DayClosing` | Day closing |
| `Feature.Accounts.ProfitLoss` | P&L / income reports |
| `Feature.Accounts.VoucherEditDelete` | Edit/delete vouchers |
| `Feature.Accounts.RoyaltyShare` | Franchise royalty |
| `Feature.Exams.Core` | Exam entry, basic results |
| `Feature.Exams.Full` | Detailed marks, awards, comparisons |
| `Feature.Exams.TeacherInsights` | Teacher analysis / performance |
| `Feature.Academics.TimetableDatesheet` | Timetable, allocation, datesheet |
| `Feature.Academics.Diary` | Daily diary |
| `Feature.Academics.ExamMaker` | Academics DB / exam-paper builder |
| `Feature.HR.Core` | Employees, designations |
| `Feature.HR.Attendance` | Live/monthly/import |
| `Feature.HR.AttendanceChangeRequest` | Change requests |
| `Feature.HR.Payroll` | Salary calculation & slips |
| `Feature.EmployeePortal.Core` | Portal login + basic modules |
| `Feature.EmployeePortal.Editor` | Portal edit timetable/allocation/diary |
| `Feature.Coordinator.Proforma` | Coordinator + head monitoring |
| `Feature.Conduct.Student` | Student conduct |
| `Feature.Conduct.Teacher` | Teacher conduct |
| `Feature.FamilyPortal` | Accounts, announcements |
| `Feature.Integrations.ParentApi` | Parent-app API entitlement |
| `Feature.Store.Stationery` | Stationery module |
| `Feature.Collaboration.Notifications` | SSE notification bell |
| `Feature.Collaboration.Reminders` | Personal reminders |
| `Feature.Collaboration.Chat` | Campus chat |
| `Feature.Collaboration.RemindersAssign` | Assign tasks to others |
| `Feature.Admin.ActivityLogs` | Activity + void receipt logs |
| `Feature.Integrations.Biometric` | ZKTeco / kiosk paths (if enabled per deploy) |

### 5.4 Tier → flags (machine-readable defaults)

Use this block when seeding tenant config (implementation later).

**Basic — `true` only:**

- `Feature.Students.Core`
- `Feature.Attendance.Core`
- `Feature.Fees.Core`
- `Feature.Exams.Core` (with optional product caps)
- `Feature.Dashboard` (single-campus; no multi flag)

**Standard — Basic plus:**

- `Feature.Students.ReportsAdvanced` (optional ◐: enable top half of reports only)
- `Feature.Attendance.ShortLeave`, `Feature.Attendance.AbsentFollowup`, `Feature.Attendance.LeaveApplications`
- `Feature.Fees.Transactions`, `Feature.Fees.VoidReceipt`, `Feature.Fees.ReminderNotices`
- `Feature.Accounts.Vouchers`, `Feature.Accounts.Ledger`, `Feature.Accounts.DayClosing`
- `Feature.Exams.Full`, `Feature.Academics.TimetableDatesheet`, `Feature.Academics.Diary`
- `Feature.HR.Core`, `Feature.HR.Attendance`, `Feature.HR.AttendanceChangeRequest`
- `Feature.EmployeePortal.Core`
- `Feature.Conduct.Student`, `Feature.FamilyPortal`
- `Feature.Collaboration.Notifications`, `Feature.Collaboration.Reminders`

**Premium — Standard plus:**

- All remaining `Feature.*` flags `true`
- `Feature.Dashboard.MultiCampus`
- `Feature.HR.Payroll`, `Feature.EmployeePortal.Editor`, `Feature.Coordinator.Proforma`
- `Feature.Conduct.Teacher`, `Feature.Fees.SecurityDeposit`, `Feature.Fees.Analytics`
- `Feature.Accounts.ProfitLoss`, `Feature.Accounts.VoucherEditDelete`, `Feature.Accounts.RoyaltyShare`
- `Feature.Exams.TeacherInsights`, `Feature.Academics.ExamMaker`
- `Feature.Integrations.ParentApi`, `Feature.Store.Stationery`
- `Feature.Collaboration.Chat`, `Feature.Collaboration.RemindersAssign`
- `Feature.Admin.ActivityLogs`, `Feature.Integrations.Biometric`

---

## 6. Mapping flags to existing permissions (implementation hint)

Do **not** duplicate subscription logic inside every controller. Suggested layers:

1. **Tenant resolution** — host name, API key, or `X-Tenant` → load `TenantSubscription` (cached).
2. **Module guard** — `IFeatureService.IsEnabled("Feature.Fees.VoidReceipt")` → else **403** with staff-friendly message (“This module is not on your plan.”).
3. **Menu / route guard (FE)** — hide nav items when flag off (same keys as API).
4. **Quota guard** — on admit employee / create user / add campus → check counters.

**Permission catalog** (`PermissionCatalog` / `tblPermission`) remains for **role** access inside an enabled module. Optional rule: if module flag is off, treat all permissions in that module head as denied even if user rights exist.

Rough mapping (module head → flag):

| Permission `ModuleHead` (examples) | Gating flag |
|-----------------------------------|-------------|
| Student (core) | `Feature.Students.Core` |
| Fee (core vs analytics) | `Feature.Fees.Core` / `Feature.Fees.Analytics` |
| Attendance | `Feature.Attendance.*` |
| Accounts | `Feature.Accounts.*` |
| Exam | `Feature.Exams.*` |
| Employee / Coordinator | `Feature.HR.*`, `Feature.Coordinator.Proforma` |
| Diary, Academics datesheet | `Feature.Academics.*` |
| Family Portal | `Feature.FamilyPortal` |
| Store | `Feature.Store.Stationery` |
| Dashboard (all-campus) | `Feature.Dashboard.MultiCampus` |

---

## 7. Add-ons (optional revenue without new tiers)

| Add-on | Suggested PKR / month | Flags / quotas touched |
|--------|----------------------|-------------------------|
| Extra campus | 8,000 – 15,000 | `MaxCampuses` +1 |
| Student pack (+500 active) | 4,000 – 7,000 | `MaxActiveStudents` |
| Employee portal pack (+50) | 3,000 – 5,000 | `MaxEmployeePortalUsers` |
| Academics exam maker only | 15,000 – 25,000 | `Feature.Academics.ExamMaker` on Standard |
| Parent API enablement | 5,000 – 10,000 | `Feature.Integrations.ParentApi` on Standard |
| Payroll module only | 12,000 – 20,000 | `Feature.HR.Payroll` on Standard |
| WhatsApp / SMS bundle | pass-through + margin | not a code flag; integration billing |

---

## 8. Trial and lifecycle

| Phase | Duration | Plan |
|-------|----------|------|
| Demo | Sales-led | Premium flags, 50 student cap, watermark optional |
| Trial | **21 days** | **Standard** flags + Standard quotas |
| Go-live | Contract signed | Paid tier; migrate trial data |
| Grace | **7 days** after expiry | Read-only; no new fees/payroll posts |
| Suspended | After grace | Login blocked except billing contact |

Store `SubscriptionStatus` and enforce read-only mode with a single middleware check.

---

## 9. Deployment modes (single codebase)

| Deploy style | Subscription storage |
|--------------|---------------------|
| **Multi-tenant SaaS** (target) | Central `Tenant` DB: plan, flags, quotas; each campus DB or schema linked to `TenantId` |
| **Dedicated school (on-prem / VPS)** | Same row in **institute config** on that instance; flags set once at install (“perpetual Basic”) |
| **Franchise hub** | Premium tenant; child campuses inherit parent `TenantId` flags |

Hidden flags should live in **configuration not editable from campus UI** (ops / super-admin only).

---

## 10. Open decisions (resolve before coding)

1. **Standard ◐ items** — enable full `Feature.Fees.Analytics` and `Feature.Exams.TeacherInsights` on Standard or keep Premium-only?
2. **Second campus on Standard** — always block vs paid add-on only.
3. **Exam maker** — Premium-only vs add-on on Standard (recommend add-on for revenue).
4. **Count inactive students** toward quota or only active enrollments.
5. **Biometric** — per-device licensing vs plan flag only.

---

## 11. Summary

- Sell **Basic / Standard / Premium** with a **hybrid** of **feature flags** and **numeric quotas**.
- Use stable `Feature.*` keys and quota columns for tenant config; enforce at API + navigation; keep campus permissions for roles inside allowed modules.
- **Basic** = front office (students, attendance, fees, light exams), one campus, small caps.
- **Standard** = full single-campus school (exams, academics ops, accounts, family portal, employee portal, notifications).
- **Premium** = payroll, coordination proforma, teacher conduct, chat, multi-campus dashboard, advanced finance, exam maker, parent API, stationery.

Next step when you are ready: schema sketch for `TenantSubscription` + `IFeatureService` and a single “plan defaults” seed class mirroring section 5.4.

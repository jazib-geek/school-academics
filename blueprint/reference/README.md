# Reference files (read-only originals)

These are **verbatim copies** from the School Suite at the time the blueprint was written. They exist so an
agent can copy markup, styles, and proven logic. They are **not** the target code:

- They use `School.*` namespaces, `Campus*` names, `X-Campus`, and `CampusSettings`.
- Many contain school domain, employee-portal, or academics code that must be stripped.
- Where a file disagrees with `../docs/*.md`, **the docs win**.

Paths mirror the original repo (`reference/backend/...` = `backend/...`). Nothing here is compiled or deployed.

Legend: **Port** = copy, then rename and strip. **Pattern** = read for the approach, rewrite. **As-is** = copy with renames only.

---

## Backend (`reference/backend/`)

| File | Use | Notes / strip |
|---|---|---|
| `School.API.slnx` | Pattern | 4 projects; rename to `{Product}.*` |
| `School.API/School.API.csproj`, `School.Application/*.csproj`, `School.Infrastructure/*.csproj`, `School.Migrator/*.csproj` | Port | keep package versions; drop `AWSSDK.S3`, `ExcelDataReader`, `AutoMapper` unless needed |
| `School.API/Program.cs` | Pattern | keep order of Swagger → CORS → TenantContext/DbContext → JWT (with SSE `access_token`) → pipeline. **Strip** `AcademicContext`, ~80 domain `AddScoped`, `AcademicsOnly` policy, academics startup migrate. Move registrations to extension methods (BACKEND §5) |
| `School.API/appsettings.example.json` | Pattern | replace `CampusSettings` with `TenantSettings` object form; drop `AcademicContext`, `Backblaze` |
| `School.API/Middleware/CampusMiddleware.cs` | Port | → `TenantMiddleware` (claim `Tenant`, header `X-Tenant`, `ITenantRegistry`, tenant-free paths) |
| `School.API/Controllers/AuthController.cs` | Port (partial) | keep `campus-login` (→ `login`), `campuses` (→ `tenants`), `switch-campus`, `login-as`, `change-password`. **Do not copy**: family `login`, `employee-login`, `employee-session`, `employee-change-password` |
| `School.Application/Services/AuthService.cs` | Port (partial) | keep `CampusLoginAsync`, `SwitchCampusAsync`, `LoginAsAsync`, `ChangeCampusPasswordAsync`, `BuildCampusLoginResponseAsync`. Replace plain-text password compare with `PasswordHasher<User>`. Drop family login, fund types, campus profile |
| `School.Application/Services/TokenService.cs`, `Interfaces/ITokenService.cs` | Port | single `GenerateToken(User, tenant, out expires)`; claims `UserId`, `Username`, `Tenant`, `IsSuperAdmin`. Drop `FamilyDbId`/`FamilyID`, `AuthSource`, `GenerateAcademicToken` |
| `School.API/Services/CampusUserAccess.cs` | Port | → `UserAccess`; remove employee `AuthSource` check; query `UserPermissions` by `UserId` |
| `School.API/Controllers/CampusUsersController.cs`, `Application/Services/CampusUserService.cs`, `Interfaces/ICampusUserService.cs` | Pattern | users CRUD + permission catalog + rights save; rewrite against new `User`/`UserPermission`; POST-only |
| `School.Infrastructure/Entities/User.legacy-extract.cs` | Pattern | legacy `User`/`UserRight` shape (extracted). Replaced by BACKEND §6.3 |
| `School.Infrastructure/Entities/Permission.cs` | As-is | `Id, Code, Name, ModuleHead, SortOrder, IsActive` |
| `School.Infrastructure/Data/PermissionCatalog.cs` | Port (trimmed) | already reduced to the 8 blueprint codes; IDs are positional — only **append** new entries |
| `School.Infrastructure/Data/Configurations/PermissionConfiguration.cs` | As-is | `ToTable("tblPermission","dbo")`, unique `Code`, `HasData` |
| `School.Infrastructure/Data/AppDbContextFactory.cs`, `DesignTimeConfiguration.cs` | Port | read `TenantSettings:Tenants:local:ConnectionString` |
| `School.Infrastructure/Data/DatabaseMigrationRunner.cs` | Port | drop academic branch; add seed step; iterate `TenantSettings` |
| `School.Infrastructure/Data/SchoolSqlServerMigrations.cs` | As-is | → `ProductSqlServerMigrations.UseProductMigrationsHistory` |
| `School.Infrastructure/Data/EfMigrationsHistorySchemaFix.cs` | As-is | |
| `School.Migrator/Program.cs` | Port | args `--tenant`, `--no-seed`, `-h`; drop `--campus-only`, `--academic-only` |
| `School.Application/Common/TenantContext.cs` | Port | rename `Campus` → `Tenant`, add `TenantName` |
| `School.Application/Common/ApiResponse.cs`, `DTOs/PagedResultDto.cs` | As-is | |
| `School.Application/Common/ActivityLogTypes.cs` | Pattern | replace with blueprint types + catalog |
| `School.Infrastructure/Entities/ActivityLog.cs`, `Application/Services/ActivityLogService.cs`, `Interfaces/IActivityLogService.cs`, `API/Controllers/ActivityLogsController.cs` | Pattern | see ACTIVITY-LOGS.md (queue, keyset, indexes, `long Id`, UTC) |
| `School.Infrastructure/Entities/ChatMessage.cs`, `ChatReaction.cs` | As-is | |
| `School.Infrastructure/Data/Configurations/UserReminderConfiguration.cs` | Port (partial) | take `ChatMessageConfiguration` + `ChatReactionConfiguration` only; drop reminders |
| `School.Application/Services/ChatService.cs`, `Interfaces/IChatService.cs` | Port | rename campus → tenant; user lookups against new `User` |
| `School.Application/Interfaces/ICampusChatSink.cs`, `API/Services/CampusChatStream.cs` | As-is | → `IChatSink`, `TenantChatStream` |
| `School.API/Controllers/ChatController.cs` | Port | `UserAccess.TryGetUserId`; add `[RequirePermission(ChatUse)]` |
| `School.API/Services/ChatPurgeService.cs` | Port | iterate tenants with `ITenantRegistry` + `TenantDbContextFactory` |
| `School.API/Swagger/AuthorizeOperationFilter.cs` | As-is | |
| `School.API/Swagger/CampusHeaderOperationFilter.cs` | Port | → `TenantHeaderOperationFilter` (`X-Tenant` on `POST api/auth/login`) |
| `.github/workflows/deploy.yml` | Port | see DEPLOY-SETUP.md replace table |
| `scripts/ci-deploy-api-ftp.sh`, `scripts/ci-restore-api-ftp.sh` | As-is | keep LF + executable bit |
| `scripts/Push-SuiteDeploy.ps1` | Port | repo URLs |
| `scripts/Update-AllCampusDatabases.ps1` | Port | → `Update-AllTenantDatabases.ps1` |
| `DEPLOY.md` | Port | repo names, secrets, domains |

Not copied on purpose: `LegacyEntities.cs`, `AppDbContext.cs` (≈ all school tables — write fresh per BACKEND §6.1), `DashboardService.cs` (school KPIs — only the all-tenant loop pattern is described in BACKEND §3.5), all academics/fee/student/employee code, `B2ObjectStorageService`.

---

## Frontend (`reference/frontend/`)

| File | Use | Notes / strip |
|---|---|---|
| `package.json` | Port | keep scripts; drop domain-only deps |
| `vite.config.js`, `eslint.config.js`, `index.html` | As-is | title/favicon |
| `.env.example` | Pattern | → `VITE_API_BASE_URL`, `VITE_TENANT_HEADER`, `VITE_APP_TITLE`, `VITE_TENANT_ALLOWLIST` |
| `src/main.jsx` | Port | drop `AcademicInstituteSettingsProvider`, employee toaster; keep `applyTableHeaderTheme(loadSidebarTheme())` and toaster styling |
| `src/App.jsx` | Port (trimmed) | `/login`, dashboard, users, activity logs, one CRUD example (designations), catch-all; rename `/campus/*` paths |
| `src/index.css` | Port (trimmed) | `@theme`, scrollbars, buttons, table density, realtime toasts (warning/info/chat); rename `--campus-*` |
| `src/services/api.js` | Port | single portal; remove employee/academics token logic |
| `src/services/authService.js` | Port | rename per FRONTEND §6; drop fund types, campus profile |
| `src/constants/branding.js` | Pattern | **hardcoded campus list — do not copy the list**; replaced by `GET api/auth/tenants` |
| `src/constants/campusPermissions.js` | Port (trimmed) | route→permission map + landing candidates for the blueprint codes only |
| `src/pages/Auth/LoginPage.jsx` | Port (markup as-is) | load tenants from API; loading/error/single-tenant states |
| `src/components/ProtectedRoute.jsx`, `CampusCatchAllRedirect.jsx` | As-is | renames |
| `src/components/campus/CampusShell.jsx` | Port (trimmed) | → `AppShell`; nav = Dashboard, Users, Activity Logs, Settings › System Settings; keeps theme, chat, notifications, tenant switcher, user menu |
| `src/hooks/useCampusNotifications.jsx` | Port (trimmed) | SSE notifications + toasts; only chat/warning/info accents → `useNotifications` |
| `src/components/campus/CampusPermissionUi.jsx` | As-is | → `components/ui/PermissionUi.jsx` |
| `src/components/campus/ConfirmDialog.jsx` | As-is | → `components/ui/ConfirmDialog.jsx` |
| `src/components/campus/SidebarThemeDialog.jsx`, `src/utils/sidebarTheme.js`, `src/hooks/useSidebarTheme.js` | As-is | theme system |
| `src/components/campus/CampusNotificationsDrawer.jsx` | Pattern | basis for `Drawer.jsx` + `NotificationsDrawer.jsx` |
| `src/utils/campusBranding.js`, `src/utils/campusProfile.js` | Pattern | logo/title helpers; profile is school-specific |
| `src/contexts/CampusRealtimeContext.jsx`, `src/hooks/useCampusChat.jsx`, `src/services/chatService.js`, `src/components/campus/chat/*` | Port | chat stack; drop reminder events and notification streams not used |
| `src/pages/Campus/users/CampusUsersPage.jsx`, `src/services/campusUserService.js` | Port | users CRUD + permissions (move permissions editor into a `Drawer`) |
| `src/pages/Campus/activity-logs/CampusActivityLogsPage.jsx`, `src/services/activityLogService.js` | Pattern | switch to keyset "Load more" + details drawer |
| `src/pages/Campus/dashboard/DashboardPage.jsx`, `src/services/campusDashboardService.js` | Pattern | card/chart styling only; content becomes placeholders |
| `src/pages/Campus/designations/CampusDesignationsPage.jsx`, `src/services/designationService.js` | Pattern | **canonical listing + modal + confirm** example |
| `src/pages/Campus/settings/NamedLookupCrudPage.jsx` | Pattern | generic lookup CRUD |
| `src/components/campus/settings/SettingsUi.jsx` | As-is | building blocks for System Settings later |
| `src/assets/softelligent-transparent.png` | Replace | product logo goes here |
| `.github/workflows/deploy.yml` | As-is | lint → build → build:demo → FTP (see DEPLOY-SETUP.md) |

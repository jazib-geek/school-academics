# Build checklist (do in order)

Tick each step; do not skip acceptance checks. Placeholders: see `../README.md` §0.

## Phase 0 — Repo

- [ ] Create monorepo `{product}/` with `backend/`, `frontend/`, `.cursor/rules/`, `.gitignore`.
- [ ] Copy `blueprint/rules/*.mdc` → `.cursor/rules/`, replace placeholders.
- [ ] `git init`, add `origin`. (Deploy remotes come in Phase 6.)

## Phase 1 — Backend skeleton

- [ ] Create 4 projects + `.slnx` (BACKEND §1). `dotnet build` passes.
- [ ] `appsettings.example.json` (BACKEND §2); local `appsettings.json` with `local` tenant (gitignored).
- [ ] Tenancy: `TenantSettings`, `TenantOptions`, `ITenantRegistry`/`TenantRegistry`, `TenantContext`, `TenantMiddleware` (BACKEND §3).
- [ ] `ApiResponse<T>`, `PagedResultDto<T>`, `ClaimNames`, `PermissionCodes`, `AppTime`, `ExceptionHandlingMiddleware`.
- [ ] `AppDbContext` + `BaseEntity` + entities + configurations (BACKEND §6). `HasDefaultSchema("dbo")`.
- [ ] `ProductSqlServerMigrations`, `EfMigrationsHistorySchemaFix`, `AppDbContextFactory`, `DesignTimeConfiguration`, `TenantDbContextFactory`.
- [ ] `PermissionCatalog` + `HasData`.
- [ ] DI extension methods (BACKEND §5) and `Program.cs` (BACKEND §4) in exact order.

**Accept:** `dotnet build` green; `GET /health` 200; `GET /api/auth/tenants` returns `[{ key:"local", name:"…" }]`
without connection strings; request with `X-Tenant: nope` → 400 `Invalid tenant.`

## Phase 2 — Migrations + seed

- [ ] `dotnet ef migrations add InitialCreate …` (BACKEND §9.1). Grep: every `CreateTable` has `schema: "dbo"`.
- [ ] `DatabaseMigrationRunner`, `DbSeeder`, `{Product}.Migrator`, `scripts/Update-AllTenantDatabases.ps1`.
- [ ] `MigrateTenantsOnStartupAsync` honoring `Database:MigrateOnStartup`.

**Accept:** `dotnet run --project backend/{Product}.Migrator` prints `OK tenant:local`; DB has
`dbo.tblUser` (1 super admin with hashed password), `dbo.tblPermission` (8 rows),
`dbo.__EFMigrationsHistory`. Running it twice changes nothing. With two tenants configured, both migrate.

## Phase 3 — Auth, users, permissions, logs, chat, dashboard, settings (API)

- [ ] `TokenService`, `AuthService`, `AuthController` (login, tenants, me, switch-tenant, login-as, change-password). **No other login endpoints.**
- [ ] `UserAccess`, `RequirePermissionAttribute`/`RequirePermissionFilter`.
- [ ] `UserService` + `UsersController` (BACKEND §8 rules).
- [ ] Activity logs: entity/indexes, types, service, queue, writer, purge, controller (ACTIVITY-LOGS.md).
- [ ] Chat: entities, service, sink, controller, purge (CHAT.md).
- [ ] `DashboardService` (`TotalUsers`, `ActiveUsers`, placeholders, `recentActivity`) + controller.
- [ ] `SystemSettingsService` + controller (key/value).
- [ ] Swagger filters (Bearer + `X-Tenant` on login).
- [ ] Grep: no `HttpPut`, no `HttpDelete`, no plain-text password compare.

**Accept (Swagger/curl):** login wrong password → 401; right → token + 8 permission codes for admin;
non-admin user with only `user_list` → `POST api/users/create` 403; user create writes an activity log
row within ~2 s; two browsers logged in as different users exchange chat messages live.

## Phase 4 — Frontend skeleton

- [ ] `npm create vite@latest frontend -- --template react`; replace configs per FRONTEND §1.
- [ ] `index.css` per FRONTEND §2 (from reference, renamed vars, print/domain classes removed).
- [ ] `main.jsx`, `App.jsx`, `api.js`, `authService.js`, `tenantService.js`, `constants/*`, `ProtectedRoute`, `CatchAllRedirect`, `PermissionUi`.
- [ ] `LoginPage` (runtime tenants, states in FRONTEND §7).
- [ ] `AppShell` trimmed from `CampusShell` + `navigation.js`; theme files; `SidebarThemeDialog`; `NotificationsDrawer`.
- [ ] Shared UI: `Modal`, `Drawer`, `ConfirmDialog`, `Pagination`, `EmptyState`, `PageHeader`.

**Accept:** login dropdown lists tenants from `appsettings.json`; adding a tenant on the API (no FE rebuild,
no API restart) shows it after reload; wrong password shows a friendly toast; after login the shell shows
logo, tenant name, user menu; sidebar collapses; theme change recolours sidebar + table headers and survives
reload; 401 from any call returns to `/login` with tenant preselected.

## Phase 5 — Frontend features

- [ ] Dashboard placeholders + charts (FRONTEND §10.1).
- [ ] Users CRUD: list, add/edit modal, permissions drawer, reset password, login-as, delete confirm.
- [ ] Activity logs page (filters, load more, details drawer).
- [ ] System Settings blank page.
- [ ] Chat: `RealtimeProvider`, `useChat`, `chat/*`, top-bar badge.
- [ ] Change password modal.
- [ ] `npm run lint` → 0 errors; `npm run build` and `npm run build:demo` succeed.

**Accept:** a user without `user_delete` sees no delete button and gets 403 if forced; nav hides items the
user can't access; direct URL to a forbidden route shows Access Denied inside the shell; phone width (390 px):
sidebar becomes an overlay, drawers are full width, tables scroll horizontally.

## Phase 6 — CI/CD

- [ ] Follow `../DEPLOY-SETUP.md` end to end (repos, remotes, secrets, workflows, scripts, server
      `appsettings.json`, `web.config`).
- [ ] First API deploy via `.\backend\scripts\Push-SuiteDeploy.ps1 -Api`; Actions build + deploy green.
- [ ] First UI deploy via `-Ui`; site loads, login works against production API.
- [ ] Production `appsettings.json` placed on server; `MigrateOnStartup` or Migrator run; admin password
      changed after first login.

## Definition of done

Backbone matches the folder tree in `../README.md` §3, all accept checks pass, no school/academics/employee
code exists, and adding a new CRUD feature follows CRUD-UI-RULES §7 without touching the backbone.

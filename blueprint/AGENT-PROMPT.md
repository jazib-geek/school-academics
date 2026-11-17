# Agent prompt — build the suite from an empty root

Copy everything between the two `=====` lines into a new agent chat (Agent mode). Fill the
**Inputs** block first. Everything else is fixed.

Before you start, place the root folder like this:

```
<root>/
├── backend/     (empty)
├── frontend/    (empty)
└── blueprint/   (optional but strongly recommended: copy of this whole folder)
```

If `blueprint/` is present the agent uses it as the detailed spec and copies UI markup from
`blueprint/reference/`. Without it, the prompt below is still enough to build a working system.

---

=====

You are building a new multi-tenant product from scratch inside the current workspace root.
The root contains two empty folders: `backend/` and `frontend/` (if a folder is named `fronend`,
rename it to `frontend` first). Create **every file yourself**: solution, projects, React app,
configs, migrations, scripts, CI workflows. Do not ask me to run scaffolding for you. Run the
commands yourself (`dotnet new`, `dotnet add package`, `npm create vite`, `npm install`, etc.).

## Inputs (fill these in)

```
Product (PascalCase namespace root): {Product}            e.g. Clinic
product (lowercase id):              {product}            e.g. clinic
Product title (UI):                  {ProductTitle}       e.g. Clinic Suite
Tenant label (UI word):              {TenantLabel}        e.g. Branch
GitHub owner:                        {GitHubOwner}
API deploy repo / UI deploy repo:    {ApiRepo} / {UiRepo}
Time zone id:                        {TimeZoneId}         e.g. Asia/Karachi
Database mode:                       Fresh | Legacy
Tenants (key → display name):        main → Main {TenantLabel}, ...
Legacy DB details (Legacy mode only): server/db names per tenant are in
                                      backend/{Product}.API/appsettings.json, which I will fill;
                                      list here any legacy tables to expose: ...
```

Never write real connection strings, passwords, JWT keys or FTP credentials into committed files.
Use `appsettings.example.json` with placeholders and keep `appsettings.json` gitignored.

## Spec source

1. If `blueprint/` exists, read in this order and follow it literally:
   `blueprint/README.md`, `docs/BACKEND.md`, `docs/FRONTEND.md`, `docs/CRUD-UI-RULES.md`,
   `docs/ACTIVITY-LOGS.md`, `docs/CHAT.md`, `docs/CHECKLIST.md`, `DEPLOY-SETUP.md`,
   `reference/README.md`, `screenshots/README.md`. Where this prompt and the blueprint disagree on
   **legacy DB handling**, this prompt wins. Everywhere else, the blueprint wins.
2. Copy `blueprint/rules/*.mdc` into `<root>/.cursor/rules/` with placeholders replaced.
3. Use `blueprint/reference/` only to copy markup, styling and patterns. Never copy domain code
   (students, fees, attendance, exams, academics, employee/parent portals).

## Non-negotiables

- **One login, one layout.** One user table `dbo.tblUser`, one endpoint `POST api/auth/login`,
  one page `/login`, one authenticated shell `AppShell`. No secondary portals or login modes.
- **One SQL Server database per tenant.** Config `TenantSettings:Tenants` maps key →
  `{ Name, ConnectionString, Enabled, SortOrder }`, plus `TenantSettings:DefaultTenant`. Read it via
  `IOptionsMonitor` so edits apply without restart.
- **Tenant resolution per request:** JWT claim `Tenant` → header `X-Tenant` → `DefaultTenant`.
  Unknown or disabled → `400 {"success":false,"message":"Invalid tenant.","data":null}`.
  `AppDbContext` is scoped and uses `TenantContext.ConnectionString`.
- **`dbo` everywhere:** `HasDefaultSchema("dbo")`, `ToTable("tblX","dbo")`, `schema: "dbo"` in every
  migration operation, migrations history table pinned to `dbo.__EFMigrationsHistory`.
- **No PUT/DELETE** (Plesk blocks them). Use GET for reads and POST for every mutation
  (`.../create`, `.../{id}/update`, `.../{id}/delete`). Same in the frontend: never `axios.put`/`delete`.
- **Passwords** are hashed with `PasswordHasher<User>`. Never compare plain text.
- **Permissions are string codes** seeded from one C# `PermissionCatalog` (IDs = position + 1,
  append only). Super admin bypasses checks. The API enforces `[RequirePermission(code)]` on every
  endpoint; the UI hides what the user cannot do.
  Seed exactly: `dashboard_view`, `user_list`, `user_add`, `user_edit`, `user_delete`,
  `activity_log_view`, `system_settings_manage`, `chat_use`.
- **JWT claims:** `UserId`, `Username`, `Tenant`, `IsSuperAdmin`. SSE endpoints accept the token
  as the `access_token` query parameter.
- **User-facing copy is plain staff language.** No IDs, table names, "null", or stack traces in UI.

## Backend (`backend/`) — .NET 8, EF Core 9, SQL Server

Create `{Product}.API.slnx` with four projects: `{Product}.API` (web), `{Product}.Application`,
`{Product}.Infrastructure`, `{Product}.Migrator` (console). Reference direction:
API → Application + Infrastructure; Infrastructure → Application; Migrator → Infrastructure.

Build, in this order:

1. **Tenancy:** `TenantSettings` options, `ITenantRegistry`/`TenantRegistry`, scoped `TenantContext`,
   `TenantMiddleware` (after authentication, before authorization).
2. **Entities** (fresh, `BaseEntity` with `Id`, `CreatedAt`, `UpdatedAt`): `User`, `Permission`,
   `UserPermission`, `ActivityLog`, `ChatMessage`, `ChatReaction`, `SystemSetting`, each with an
   `IEntityTypeConfiguration<T>`.
3. **`Program.cs`** in this order: config, `AddApplicationServices`, `AddInfrastructure`, `AddApiServices`,
   JWT bearer (with SSE query-token handler), CORS from `Cors:AllowedOrigins`, Swagger with a bearer and
   `X-Tenant` header filter, `ExceptionHandlingMiddleware`, CORS, auth, `TenantMiddleware`, authorization,
   controllers, and the optional startup migration.
4. **Auth:** `GET api/auth/tenants` (anonymous; returns `{ key, name }` for enabled tenants, sorted),
   `POST api/auth/login` (`{ username, password }` + `X-Tenant`), `POST api/auth/change-password`,
   `GET api/auth/me` (user and permission codes).
5. **Controllers:** Users CRUD + permission assignment, ActivityLogs (keyset paging, filters),
   Chat (SSE stream, send, react, history, users list), Dashboard (`GET api/dashboard/summary`
   placeholder KPIs), SystemSettings (`GET` + `POST`, key/value, blank by default).
6. **Activity logs:** bounded `Channel` queue + background writer, purge service, `ActivityLogTypes`
   constants. Log login, logout, user create/update/delete, permission change and settings change.
7. **Chat:** in-memory per-tenant `TenantChatStream` singleton, messages persisted, purge service.
8. **Responses:** `ApiResponse<T>` `{ success, message, data }`, `PagedResultDto<T>`, and
   `AppTime` using `App:TimeZoneId`.
9. **Migrations + seed:** `DatabaseMigrationRunner` (all tenants or a subset), idempotent `DbSeeder`
   (permissions + super admin from `Seed:AdminUsername` / `Seed:AdminPassword`), Migrator CLI with
   `--tenant <key>` (repeatable) and `--no-seed`, startup migration when `Database:MigrateOnStartup=true`,
   design-time `AppDbContextFactory` targeting tenant `local` (or the first tenant).
10. **Scripts and CI:** `scripts/Update-AllTenantDatabases.ps1`, `Push-SuiteDeploy.ps1`,
    `ci-deploy-api-ftp.sh`, `ci-restore-api-ftp.sh`, `.github/workflows/deploy.yml` (build, then FTP
    deploy using GitHub secrets; stop IIS by swapping `web.config` ↔ `web1.config`), `web.config`,
    `DEPLOY.md`, `.gitignore`.

## Database mode

Read the **Database mode** input. Implement both paths in code and choose with config
`Database:Mode` = `Fresh` | `Legacy` (default `Fresh`).

### Fresh

- `dotnet ef migrations add InitialCreate --context AppDbContext --output-dir Data/Migrations`.
- Check that every `CreateTable`/`CreateIndex` has `schema: "dbo"`. Add it where missing.
- Run the Migrator against `local`; confirm the tables and seed data exist.

### Legacy (existing database to be advanced by migrations)

The tenant databases already exist and hold production data. The goal is to bring them under
EF migrations **without changing or losing any existing object**, then add the blueprint tables
on top.

1. **Inspect, don't own.** Scaffold the existing schema into a throwaway folder outside the solution
   (for example `backend/_legacy-scaffold/`, gitignored) with
   `dotnet ef dbcontext scaffold "<conn from appsettings local>" Microsoft.EntityFrameworkCore.SqlServer --no-onconfiguring --output-dir _legacy-scaffold`.
   Read it to learn table names, keys and column types. Delete the folder when you're done.
2. **Map only what's needed.** For each legacy table listed in the inputs, add an entity under
   `Infrastructure/Entities/Legacy/` and a configuration under `Configurations/Legacy/` that maps it
   **exactly**: same table name and schema (`ToTable("tblX", "<actual schema>")`), column names via
   `HasColumnName`, the existing keys, and `ValueGeneratedOnAdd` only where the column really is an
   identity column. Don't rename or retype anything. Don't map tables nobody uses.
3. **Baseline migration.** Create `0000_LegacyBaseline` containing the legacy entities in its model
   snapshot but with an **empty `Up()` and `Down()`**. It records that these tables already exist.
4. **Blueprint tables migration.** Create `0001_SuiteCore` for the new tables (`tblUser`,
   `tblPermission`, `tblUserPermission`, `tblActivityLog`, `tblChatMessage`, `tblChatReaction`,
   `tblSystemSetting`), all with `schema: "dbo"`. If the legacy DB already has a table with the same
   name, prefix the new ones (for example `tblSuiteUser`) instead of touching the legacy table.
5. **Baseline stamping in `DatabaseMigrationRunner`.** Before `MigrateAsync()` on each tenant:
   if `Database:Mode = Legacy`, the database has user tables, and `dbo.__EFMigrationsHistory`
   is missing or has no rows, then create the history table in `dbo` and insert the baseline
   migration id with the current EF product version. Then call `MigrateAsync()`, which runs only
   `0001_SuiteCore` onward. Log which tenants were stamped.
6. **Legacy users (if the legacy DB already has a login table):** do not make it the auth table.
   Add an optional, idempotent import step to the Migrator, `--import-legacy-users`. It copies
   usernames into `tblUser` with a `PasswordHash` from `PasswordHasher` when a plain password is
   available; otherwise it creates a random one and flags `MustChangePassword = true`. It skips
   usernames that already exist. Do not import legacy rights automatically; give imported users no
   permissions unless they're mapped explicitly.
7. **All later schema changes are additive**: new tables, new nullable columns, new indexes.
   Every raw `migrationBuilder.Sql` must be idempotent (`IF NOT EXISTS`, `IF COL_LENGTH(...) IS NULL`)
   and qualify names with the schema. Never drop or alter legacy columns in a migration unless I ask
   in writing.
8. **Safety:** never run migrations against a non-local tenant yourself. Run against `local` only
   (a restored copy of a legacy DB). Print the Migrator command for me to run on the other tenants,
   and tell me to take backups first.
9. **Verify on the local legacy copy:** row counts of mapped legacy tables are unchanged after
   migrating; `__EFMigrationsHistory` contains the baseline and `0001_SuiteCore`; login with the seeded
   super admin works; a second Migrator run is a no-op.

## Frontend (`frontend/`) — React 19 + Vite + Tailwind v4

Create it yourself: `npm create vite@latest . -- --template react` inside `frontend/`, then install
`react-router-dom axios sonner lucide-react chart.js react-chartjs-2 tailwindcss @tailwindcss/vite`,
plus ESLint (flat config, react-hooks and react-refresh plugins).

- **Env:** `.env.example`, `.env`, `.env.production`, `.env.demo` with `VITE_API_BASE_URL`,
  `VITE_TENANT_HEADER=X-Tenant`, `VITE_APP_TITLE`, optional `VITE_TENANT_ALLOWLIST`, optional
  `VITE_TENANT_LABELS` (JSON map key → display label overriding the API name).
- **Routing:** `HashRouter`; `/login`; protected `/app/dashboard`, `/app/users`,
  `/app/activity-logs`, `/app/settings/system`; a catch-all route redirects to the first route the
  user is permitted to see.
- **`api.js`:** axios instance, bearer token, `X-Tenant` from the stored session, 401 → logout and
  redirect to `/login`, user-friendly error messages.
- **Login page:** loads tenants at runtime from `GET api/auth/tenants` and applies the allowlist and
  label overrides. It handles loading, error and single-tenant states (hide the selector when there's
  only one tenant). It remembers the last tenant chosen.
- **`AppShell`:** fixed `h-16` top bar (logo, title `"{context} · {tenant name}"`, chat button,
  notifications bell, tenant switcher for super admins, user menu with Change password / Theme settings /
  System Settings / Logout) and a collapsible sidebar driven by `constants/navigation.js`, filtered by
  permission, with a mobile off-canvas sidebar. Content area uses `pt-[4.25rem] md:pt-[4.5rem]`.
- **Theme:** sidebar theme presets persisted in localStorage (`SidebarThemeDialog`,
  `utils/sidebarTheme.js`, `useSidebarTheme`), and table header colour follows the theme.
- **Tailwind v4:** `@import "tailwindcss"` with an `@theme` palette, Plus Jakarta Sans, thin soft
  scrollbars, `.btn-icon-soft`, `.btn-table-action`, `.btn-soft`, and global table density
  (`text-[13px] leading-snug`, th `px-3 py-2`, td `px-3 py-1.5`, opt-out `.table-comfortable`).
- **CRUD rules:** listing page with header, search/filter bar, dense table, row action icons (`h-7 w-7`),
  pagination and an empty state. Short forms go in a centered `Modal`; long or detail forms in an
  off-canvas `Drawer`. Destructive actions use a `ConfirmDialog`. Saving shows a sonner toast.
- **Pages:** Dashboard (placeholder KPI cards + one chart from `api/dashboard/summary`); Users (CRUD +
  permission checklist grouped by head, super admin flag, reset password); Activity logs (filters,
  keyset "load more"); System Settings (blank page shell with a single save action, ready for
  product settings); Change password modal.
- **Realtime + chat:** `RealtimeProvider`, `useChat` (EventSource with `access_token`), chat drawer
  with conversations, avatars, emoji reactions and unread badge; notification toasts.
- **CI:** `.github/workflows/deploy.yml` runs `npm ci`, `npm run lint` (errors fail), `npm run build`,
  `npm run build:demo`, then FTP deploy using secrets.

## Root

- `.gitignore` (bin/obj, node_modules, dist, `.vite`, `appsettings.json`, `.env`, `_legacy-scaffold`).
- `.cursor/rules/` from the blueprint, with placeholders filled.
- `git init`, then one local commit. **Do not push** and do not add remotes unless I ask.

## Verification (must pass before you report done)

1. `dotnet build backend/{Product}.API.slnx` has 0 errors.
2. The Migrator against `local` succeeds; a second run is a no-op (Legacy mode: plus the checks above).
3. Start the API; `GET api/auth/tenants` returns the configured tenants; the super admin can log in.
4. `cd frontend && npm run lint` has 0 errors and `npm run build` succeeds.
5. Run `npm run dev`: log in, see the dashboard, create a user with limited permissions, log in as
   them and confirm the sidebar and routes are restricted, send a chat message between the two users,
   and see both actions in Activity logs.
6. Grep the whole tree for `HttpPut`, `HttpDelete`, `.put(`, `.delete(`, `method: 'PUT'` and replace them.
7. Grep for secrets (passwords, `Password=`, keys) in committed files. There must be none.

## Report

Reply with a short summary covering: what was created, the Database mode used, the commands I must run
for the other tenants (Migrator), the placeholders still needing real values (`appsettings.json`,
GitHub secrets, logo), and anything you could not verify.

=====

## Notes for whoever runs the prompt

- **Legacy mode:** restore a copy of one legacy tenant DB as `local` first. The agent only migrates
  `local`; you run the printed Migrator command for the real tenants after taking backups.
- If the legacy DB uses a non-`dbo` login schema, the baseline maps legacy tables with their **actual**
  schema, and new suite tables still go to `dbo` (see `rules/dbo-schema-for-new-tables.mdc`).
- For a long build, the agent can split the work by the phases in `docs/CHECKLIST.md`; the prompt
  above is still the single entry point.

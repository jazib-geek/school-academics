# Frontend specification

Target: **React 19 + Vite + Tailwind CSS v4** (no `tailwind.config.js`, no PostCSS config), JavaScript (JSX),
`react-router-dom` 7 with **`HashRouter`**, `axios`, `sonner` (toasts), `lucide-react` (icons),
`chart.js` (charts). Original reference: `reference/frontend/`.

---

## 1. Tooling (copy, then rename)

| File | Source | Changes |
|---|---|---|
| `package.json` | `reference/frontend/package.json` | rename `name`; **drop** domain-only deps (Excel/print libs, etc.). Keep scripts exactly: `dev`, `build`, `build:demo` (`vite build --mode demo`), `build:production`, `lint` (`eslint .`), `preview` |
| `vite.config.js` | copy as-is | `plugins: [react(), tailwindcss()]`, `server.port: 5010` |
| `eslint.config.js` | copy as-is | flat config; CI fails on **errors** only |
| `index.html` | copy | `<title>{ProductTitle}</title>`, favicon path |
| `.env.example` | rewrite (below) | |

`.env.example`:

```bash
# API origin — no trailing slash
VITE_API_BASE_URL=https://localhost:7093
VITE_TENANT_HEADER=X-Tenant
VITE_APP_TITLE={ProductTitle}
# Optional: only show these tenant keys on the login page (comma separated). Leave unset for all.
# VITE_TENANT_ALLOWLIST=demo
```

`.env.production`, `.env.demo`, `.env.demo.production` follow the same keys (demo usually sets
`VITE_TENANT_ALLOWLIST=demo`). These files are committed **without secrets** (they contain only URLs).

Minimum deps:

```json
"dependencies": {
  "axios": "^1",
  "chart.js": "^4",
  "lucide-react": "latest",
  "react": "^19",
  "react-dom": "^19",
  "react-router-dom": "^7",
  "sonner": "^2"
},
"devDependencies": {
  "@eslint/js": "^9", "@tailwindcss/vite": "^4", "@vitejs/plugin-react": "^5",
  "eslint": "^9", "eslint-plugin-react-hooks": "^7", "eslint-plugin-react-refresh": "^0.4",
  "globals": "^16", "tailwindcss": "^4", "vite": "^7"
}
```

(Match exact versions from `reference/frontend/package.json` when creating the project.)

---

## 2. Tailwind / global CSS (`src/index.css`)

Copy `reference/frontend/src/index.css` and **keep**:

- `@import "tailwindcss";` + the whole `@theme { … }` block (palette remap — gives the exact colours).
- `:root { --campus-primary: #405189; --campus-primary-dark: #283357; }` → rename to
  `--app-primary` / `--app-primary-dark` (search/replace all usages).
- Thin scrollbar rules (`*::-webkit-scrollbar…`, `scrollbar-width: thin`).
- Button chrome: `.btn-icon-soft`, `.btn-icon-soft--amber`, `.btn-icon-soft--danger`, `.btn-table-action`.
- Global table density rules (`table thead` uses `var(--brand-bg, var(--app-primary))`, `th`/`td` padding
  and `13px` font) and opt-outs `.table-comfortable`.
- Realtime toast host class `.campus-realtime-toast-host` → rename `.realtime-toast-host`.

**Delete**: print/exam/legacy-print selectors (`.legacy-print-table`, `.exam-print-table`,
`.exam-paper-student-table`, `@media print` blocks for reports), fee/report specific classes.

Brand colour: `#405189` (indigo) primary, `#283357` dark. Login background:
`bg-[linear-gradient(280deg,#405189,#283357)]`.

---

## 3. Entry (`src/main.jsx`)

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import { RealtimeProvider } from './contexts/RealtimeContext.jsx'
import { REALTIME_TOASTER_ID } from './contexts/RealtimeContext.jsx'
import { applyTableHeaderTheme, loadSidebarTheme } from './utils/sidebarTheme'

applyTableHeaderTheme(loadSidebarTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <RealtimeProvider>
        <App />
      </RealtimeProvider>
      {/* Default toaster: copy toastOptions/classNames verbatim from reference main.jsx */}
      <Toaster position="top-center" closeButton offset="0.85rem" toastOptions={{ duration: 4200, classNames: { /* … */ } }} />
      <Toaster id={REALTIME_TOASTER_ID} position="top-center" closeButton={false} offset="0.85rem" gap={10}
        toastOptions={{ duration: 5000, unstyled: true, classNames: { toast: 'realtime-toast-host' } }} />
    </HashRouter>
  </StrictMode>,
)
```

No `AcademicInstituteSettingsProvider`, no employee toaster.

---

## 4. Routing (`src/App.jsx`)

One public route, one protected tree, one layout.

```jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

  <Route path="/app/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  <Route path="/app/users"             element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
  <Route path="/app/activity-logs"     element={<ProtectedRoute><ActivityLogsPage /></ProtectedRoute>} />
  <Route path="/app/settings/system"   element={<ProtectedRoute><SystemSettingsPage /></ProtectedRoute>} />

  <Route path="*" element={<CatchAllRedirect />} />
</Routes>
```

Every page renders its own `<AppShell>` wrapper (same as original pages render `<CampusShell>`), so pages
can pass `headerContext` / options. **Do not** create a second shell.

`ProtectedRoute` (copy of `reference/frontend/src/components/ProtectedRoute.jsx`):

```jsx
function ProtectedRoute({ children }) {
  const location = useLocation()
  if (!isAuthenticated()) return <Navigate to="/login" replace state={{ from: location }} />
  if (!canAccessPath(location.pathname)) return <AccessDenied />
  return children
}
```

`CatchAllRedirect`: authenticated → `getLandingPath()`; otherwise → `/login`.

---

## 5. HTTP client (`src/services/api.js`)

Simplified port of `reference/frontend/src/services/api.js` — **single portal**, no employee/academics branches.

```js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7093'
export const TENANT_HEADER = import.meta.env.VITE_TENANT_HEADER || 'X-Tenant'

const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const tenant = localStorage.getItem('tenant')
  if (tenant && !config.headers[TENANT_HEADER]) config.headers[TENANT_HEADER] = tenant
  if (config.data instanceof FormData) {
    const h = config.headers
    if (typeof h?.delete === 'function') h.delete('Content-Type'); else delete h['Content-Type']
  }
  return config
})

const isLoginRequest = (url = '') => /\/api\/auth\/login\/?$/.test(url)

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && !isLoginRequest(error?.config?.url)) {
      clearSession()                                   // keeps 'tenant' to preselect on login
      const hash = (window.location.hash || '').replace(/^#/, '')
      if (hash !== '/login') window.location.replace(`${window.location.pathname}${window.location.search}#/login`)
    }
    return Promise.reject(error)
  },
)

export const apiBaseUrl = API_BASE_URL
export default api
```

Helper for messages: `export const getApiErrorMessage = (err, fallback) => err?.response?.data?.message || fallback`.

**Never use `api.put` / `api.delete`.** All mutations: `api.post('/api/users/12/update', payload)`.

---

## 6. Session + permissions (`src/services/authService.js`)

localStorage keys (single session):

| Key | Value |
|---|---|
| `token` | JWT |
| `tenant` | tenant key (kept after logout to preselect) |
| `tenantName` | label for top bar |
| `user` | JSON `{ id, username, fullName }` |
| `permissions` | JSON array of codes |
| `isSuperAdmin` | `'1'` / `'0'` |

Exports (port from original names → new names):

| Original | Blueprint |
|---|---|
| `loginWithCampus({campus,username,password})` | `login({ tenant, username, password })` → POST `/api/auth/login` with header `[TENANT_HEADER]: tenant` |
| `switchCampusSession(campus)` | `switchTenant(tenant)` |
| `loginAsCampusUser(userId)` | `loginAs(userId)` |
| `changeCampusPassword(...)` | `changePassword(...)` |
| `persistCampusPermissions`, `getStoredCampusPermissions` | `persistPermissions`, `getStoredPermissions` |
| `isCampusSuperAdmin` | `isSuperAdmin` |
| `hasCampusPermission(code)` | `hasPermission(code)` (super admin → true) |
| `hasAnyCampusPermission(...codes)` | `hasAnyPermission(...codes)` |
| `canAccessCampusPath(pathname)` | `canAccessPath(pathname)` |
| `getCampusLandingPath()` | `getLandingPath()` — first allowed of `LANDING_CANDIDATES` |
| `resolveCampusPostLoginPath(intended)` | `resolvePostLoginPath(intended)` |
| `logout()` | `logout()` — clears everything except `tenant`, navigates `/login` |
| `isAuthenticated()` | `isAuthenticated()` — `!!localStorage.token` |
| *(new)* | `refreshSession()` → GET `/api/auth/me`, re-persist permissions (call once in `AppShell` mount) |

`persistSession(data)` stores all keys from `LoginResponseDto` in one place; used by login, switch-tenant,
login-as.

### `src/constants/permissions.js`

Port of `reference/frontend/src/constants/campusPermissions.js` (structure only):

```js
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard_view',
  USER_LIST: 'user_list',
  USER_ADD: 'user_add',
  USER_EDIT: 'user_edit',
  USER_DELETE: 'user_delete',
  ACTIVITY_LOG_VIEW: 'activity_log_view',
  SYSTEM_SETTINGS_MANAGE: 'system_settings_manage',
  CHAT_USE: 'chat_use',
}

/** Route → permission (string) or { anyOf: [...] }. Longest prefix wins. */
export const ROUTE_PERMISSIONS = {
  '/app/dashboard': PERMISSIONS.DASHBOARD_VIEW,
  '/app/users': PERMISSIONS.USER_LIST,
  '/app/activity-logs': PERMISSIONS.ACTIVITY_LOG_VIEW,
  '/app/settings/system': PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
}

export const LANDING_CANDIDATES = ['/app/dashboard', '/app/users', '/app/activity-logs', '/app/settings/system']

export function resolveRoutePermission(pathname) { /* longest-prefix match over ROUTE_PERMISSIONS */ }
```

### `src/components/ui/PermissionUi.jsx`

Copy `reference/frontend/src/components/campus/CampusPermissionUi.jsx`, rename exports:
`PermissionControl` (renders children only if allowed, or disabled with tooltip `"You don't have access to this."`)
and `AccessDenied` (full page inside `AppShell`).

---

## 7. Tenant-aware login (`src/pages/Auth/LoginPage.jsx`)

Visual: **copy** `reference/frontend/src/pages/Auth/LoginPage.jsx` markup and classes exactly
(gradient background `bg-[linear-gradient(280deg,#405189,#283357)] p-6`, centered card, logo, select +
username + password + submit, show/hide password, loading state). Replace the logo/title with
`{ProductTitle}` from `constants/branding.js`.

Behaviour changes vs original:

| Original | Blueprint |
|---|---|
| Tenant list from hardcoded `CAMPUS_OPTIONS` in `constants/branding.js` | `tenantService.getTenants()` → `GET /api/auth/tenants` on mount |
| `VITE_CAMPUS_ALLOWLIST` filters | `VITE_TENANT_ALLOWLIST` filters the API result (optional) |
| Prod hides `local` in FE | API already hides `HideInProduction` tenants |

`src/services/tenantService.js`:

```js
import api from './api'
const ALLOW = (import.meta.env.VITE_TENANT_ALLOWLIST || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

export async function getTenants() {
  const { data } = await api.get('/api/auth/tenants')
  const list = Array.isArray(data?.data) ? data.data : []
  return ALLOW.length ? list.filter((t) => ALLOW.includes(String(t.key).toLowerCase())) : list
}
```

Login page states:

1. **Loading tenants** → select shows "Loading…", submit disabled.
2. **Load failed** → inline message "Couldn't load the list. Check your connection and try again." + Retry button.
3. **One tenant** → preselect it and hide the select (still send header).
4. **Many** → preselect `localStorage.tenant` if still in list, else first.
5. Submit → `login()`; on success `navigate(resolvePostLoginPath(location.state?.from?.pathname), { replace: true })`;
   on 401 → toast "Invalid username or password."
6. Already authenticated on mount → redirect to landing.

Labels: field label is `{TenantLabel}` (e.g. "Branch"), options show `name` (value = `key`).

---

## 8. Layout (`src/components/layout/AppShell.jsx`)

**Copy** `reference/frontend/src/components/campus/CampusShell.jsx` (≈1,300 lines) and trim. Keep 1:1:

- Fixed top bar `h-16` with: sidebar collapse toggle, logo, page `headerContext` slot,
  tenant badge (+ super-admin **tenant switcher** dropdown using `getTenants()` → `switchTenant`),
  **Quick links** menu, **theme palette** button (opens `SidebarThemeDialog`), **notifications bell**
  (opens `NotificationsDrawer`), **chat/mail icon** with unread badge (`realtime.openChat()`),
  **user menu** (name, Change password modal, System settings link when permitted, Logout).
- Collapsible sidebar: expanded `w-64` / collapsed icons-only; groups with children; active-row logic
  (`collectNavChildren`, `findBestMatchingNavChild`, `isParentRowActive`, `isChildRowActive`,
  `buildInitialOpenMenus`, `buildDerivedOpenMenus`); mobile overlay drawer below `md`.
- Sidebar background from theme: `style={{ ...toCssVars(sidebarTheme), background: 'var(--sb-bg)' }}`.
- `navItemAllowed(item)` permission filter (`anyOf` / `permission`).
- Props: `children`, `headerContext`, `hideSidebar`, `rootClassName`, `rowClassName`, `asideClassName`,
  `headerClassName`.
- Main content wrapper padding: `pt-[4.25rem] md:pt-[4.5rem]`.

Remove: campus overview link, fee/student quick links, fund types, campus profile logo fetch, employee
bits, print-specific class props, `hideLoggedCampusInHeader`, `campusOverviewActive`.

Move the nav array to `src/constants/navigation.js`:

```js
import { Home, Users, History, Settings } from 'lucide-react'
import { PERMISSIONS as P } from './permissions'

export const APP_SHELL_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, iconClass: 'text-sky-300', to: '/app/dashboard', permission: P.DASHBOARD_VIEW },
  { id: 'users', label: 'User Management', icon: Users, iconClass: 'text-emerald-300', to: '/app/users', permission: P.USER_LIST },
  { id: 'activity', label: 'Activity Logs', icon: History, iconClass: 'text-amber-300', to: '/app/activity-logs', permission: P.ACTIVITY_LOG_VIEW },
  {
    id: 'settings', label: 'Settings', icon: Settings, iconClass: 'text-violet-300',
    children: [
      { label: 'System Settings', to: '/app/settings/system', permission: P.SYSTEM_SETTINGS_MANAGE },
    ],
  },
]

export const QUICK_LINKS = [
  { label: 'Add user', to: '/app/users?new=1', permission: P.USER_ADD },
  { label: 'Activity logs', to: '/app/activity-logs', permission: P.ACTIVITY_LOG_VIEW },
]
```

Adding a feature later = one entry in `APP_SHELL_NAV`, one in `ROUTE_PERMISSIONS`, one `<Route>`, one
permission in the backend catalog.

### Branding (`src/constants/branding.js` + `src/utils/branding.js`)

```js
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || '{ProductTitle}'
export const TENANT_LABEL = '{TenantLabel}'
export const getTenantName = () => localStorage.getItem('tenantName') || localStorage.getItem('tenant') || ''
```

Logo: `src/assets/logo.png` (replace `softelligent-transparent.png`). Sidebar header shows logo +
`APP_TITLE`; collapsed shows logo only.

---

## 9. Theme settings

Copy **as-is** (rename imports only):

| File | Purpose |
|---|---|
| `src/utils/sidebarTheme.js` | presets (`SIDEBAR_GRADIENT_PRESETS` 16, `SIDEBAR_SOLID_PRESETS`), `loadSidebarTheme`, `saveSidebarTheme`, `resetSidebarTheme`, `toCssVars`, `sidebarBackground`, `applyTableHeaderTheme`, event `sidebar-theme-change` |
| `src/hooks/useSidebarTheme.js` | subscribes to the change event; returns `[theme, setTheme]` |
| `src/components/layout/SidebarThemeDialog.jsx` | picker: mode (gradient/solid), preset grid, custom colours, angle, alpha sliders, live preview, Reset |

Behaviour: theme is **per browser** (localStorage `sidebarTheme`), applies to the sidebar and table
header background (`--brand-bg`). Because top bar/sidebar/table header are shared, every page picks it up
automatically. Optional extension (not required): persist per user via `POST /api/system-settings` key
`theme:{userId}`.

---

## 10. Pages

### 10.1 Dashboard (`pages/App/dashboard/DashboardPage.jsx`)

Similar style to `reference/.../DashboardPage.jsx` but **placeholder** content:

- Header row: greeting "Welcome back, {fullName}" + today's date + tenant name.
- 4 KPI cards (grid `sm:grid-cols-2 xl:grid-cols-4 gap-4`): **Total users**, **Active today**,
  **Pending items**, **Messages** — icon chip, big number, small trend line (`+4% vs last week`).
- Row 2: line chart "Activity (last 14 days)" (`chart.js/auto`, 2/3 width) + doughnut "By category" (1/3).
- Row 3: "Recent activity" list (last 8 activity logs, from `GET /api/dashboard/summary` →
  `recentActivity`) + "Quick actions" card (links from `QUICK_LINKS`).
- `dashboardService.getSummary()` returns placeholder numbers from the API (`DashboardService` returns
  real `TotalUsers`/`ActiveUsers` and static placeholders for the rest). Destroy chart instances on unmount.

### 10.2 Users (`pages/App/users/UsersPage.jsx`)

Port of `reference/frontend/src/pages/Campus/users/CampusUsersPage.jsx` + `campusUserService.js`:

- Listing per [CRUD-UI-RULES.md](CRUD-UI-RULES.md): search, status filter (All/Active/Inactive), columns
  `#`, Username, Full name, Email, Status pill, Super admin badge, Last login, Actions.
- Row actions: Edit (`user_edit`), Permissions (`user_edit`), Reset password (`user_edit`),
  Login as (super admin only, not self), Delete (`user_delete`, not self).
- **Add / Edit**: centered modal (≤ 8 fields): Username, Full name, Email, Phone, Password (create only),
  Active toggle, Super admin toggle (visible to super admin only).
- **Permissions**: right **off-canvas drawer** (`Drawer` size `lg`), catalog grouped by `moduleHead`,
  group "select all" checkbox, search box, Save → `POST /api/users/{id}/permissions`. Super-admin users
  show a note "Super admins have full access." and no checkboxes.
- `userService.js`: `listUsers(params)`, `getUser(id)`, `createUser(p)`, `updateUser(id,p)`,
  `deleteUser(id)`, `resetPassword(id,p)`, `getPermissionCatalog()`, `getUserPermissions(id)`,
  `saveUserPermissions(id, codes)`.

### 10.3 Activity logs — see [ACTIVITY-LOGS.md](ACTIVITY-LOGS.md) §5.

### 10.4 System Settings (`pages/App/settings/SystemSettingsPage.jsx`)

Replaces the original "School profile / Institute settings" (`CampusProfileSettingsPage.jsx`). Ship as a
**blank shell**: `AppShell` + page header "System Settings" + a card with an empty state
"Settings for this system will appear here." Use `components/campus/settings/SettingsUi.jsx` from reference
as the building blocks (section card, label/field rows, sticky Save bar) when filling it later.
Service stub `systemSettingsService.js`: `getSettings()`, `saveSettings(values)`.

Menu entries: sidebar "Settings → System Settings" and user-menu "System settings", both gated by
`system_settings_manage`.

### 10.5 Change password

Modal opened from the user menu (already in `CampusShell` — keep the `passwordInputClass` styling):
current, new, confirm → `changePassword()` → toast "Password changed." → stays logged in.

---

## 11. Realtime + chat

See [CHAT.md](CHAT.md). `RealtimeProvider` (port of `CampusRealtimeContext.jsx`) owns the single
`EventSource` for chat and exposes `openChat()`, `closeChat()`, `unreadCount`, `isChatOpen`. It renders
`ChatDrawer` itself, so the shell only needs the icon. Only connects when `isAuthenticated()` and the user
has `chat_use`.

Notifications: keep `NotificationsDrawer` (copy of `CampusNotificationsDrawer.jsx`) wired to an empty
list for now (bell shows nothing until a product feature publishes notifications). The SSE endpoint
`/api/notifications/stream` is optional and can be added later with the same pattern as chat.

---

## 12. UI copy rules

- Plain staff language. No IDs, table names, "null", "skipped", stack traces.
- Toasts: past tense for success ("User saved."), actionable for errors ("Couldn't save. Try again.").
- Prefer the server `message` for 4xx errors (`getApiErrorMessage`), generic fallback for 5xx.
- Omit options that don't apply instead of explaining why they're disabled.

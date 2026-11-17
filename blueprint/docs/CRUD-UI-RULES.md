# CRUD UI rules (listing, forms, modals, off-canvas)

Every admin screen must look like it belongs to the same app. Reference implementation:
`reference/frontend/src/pages/Campus/designations/CampusDesignationsPage.jsx` (listing + modal + confirm)
and `reference/frontend/src/pages/Campus/settings/NamedLookupCrudPage.jsx` (generic lookup CRUD).

Colour variable below is `--app-primary` (renamed from `--campus-primary`, value `#405189`).

---

## 1. Choosing the editor surface

| Situation | Surface | Width |
|---|---|---|
| ≤ 8 simple fields, single step (name, code, status…) | **Centered modal** | `max-w-lg` (`max-w-2xl` for 2-column forms) |
| Long forms, many sections, side-by-side with list context, details/preview, permission matrices | **Right off-canvas drawer** | `w-[min(100vw,28rem)]` (md) / `w-[min(100vw,40rem)]` (lg) |
| Multi-step wizards, forms with tables inside, > 25 fields | **Full page** route `/app/<feature>/new`, `/app/<feature>/:id/edit` | page container `max-w-5xl` |
| Destructive or bulk action | **ConfirmDialog** | `max-w-md` |
| Read-only quick view of a row | Off-canvas drawer (md) | |

Never stack more than one modal. A drawer may open a ConfirmDialog (`z-[90]` above `z-[80]`).

---

## 2. Listing page skeleton

```jsx
<AppShell headerContext="Users">
  <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
    <div className="mx-auto max-w-6xl space-y-4">

      {/* Header card */}
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-primary)] text-white">
              <Users size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Users</h1>
              <p className="text-sm text-slate-500">Manage who can sign in and what they can do.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
            <PermissionControl allowed={hasPermission(PERMISSIONS.USER_ADD)}>
              <button type="button" onClick={startCreate}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 text-sm font-medium text-white">
                <Plus size={18} /> Add user
              </button>
            </PermissionControl>
          </div>
        </div>

        {/* Toolbar: search + filters (same card) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search users" value={search} onChange={…} />
          </div>
          <select className={`${inputClass} w-40`} value={status} onChange={…}>…</select>
        </div>
      </section>

      {/* Table card */}
      <section className="overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px] leading-snug">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Username</th>
                …
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-semibold text-slate-900">{row.username}</td>
                  …
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-1">
                      <PermissionControl allowed={canEdit}>
                        <button type="button" className="btn-table-action" aria-label={`Edit ${row.username}`} onClick={() => startEdit(row)}>
                          <Pencil size={16} />
                        </button>
                      </PermissionControl>
                      <PermissionControl allowed={canDelete}>
                        <button type="button" className="btn-icon-soft btn-icon-soft--danger" aria-label={`Delete ${row.username}`} onClick={() => setDeleteRow(row)}>
                          <Trash2 size={16} />
                        </button>
                      </PermissionControl>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? <LoadingRow label="Loading users..." /> : null}
        {!isLoading && rows.length === 0 ? <EmptyState text="No users found." /> : null}
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </section>
    </div>
  </div>
</AppShell>
```

### Density rules (mandatory)

| Element | Classes |
|---|---|
| Table | `w-full min-w-[760px] text-left text-[13px] leading-snug` |
| `th` | `px-3 py-2 font-medium` (thead `bg-slate-50 text-xs uppercase text-slate-500`, or global brand band) |
| `td` | `px-3 py-1.5` |
| Row | `border-t border-slate-100 hover:bg-slate-50` |
| Row action buttons | `h-7 w-7` → use `.btn-table-action` / `.btn-icon-soft` (`--amber`, `--danger`) |
| Status pill | `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold` + `bg-emerald-100 text-emerald-700` (active) / `bg-slate-200 text-slate-600` (inactive) |
| Page top padding (under fixed `h-16` header) | `pt-[4.25rem] md:pt-[4.5rem]` — never `pt-20`/`pt-24` |
| Primary button | `h-10 rounded-lg bg-[var(--app-primary)] px-4 text-sm font-medium text-white` |
| Secondary button | `h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50` |
| Input | `h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100` |
| Field label | `block text-xs font-semibold uppercase text-slate-500` (input inside with `mt-1`) |

Do **not** reintroduce `px-4 py-3` cells or `h-9 w-9` action buttons. Opt out of global density only with
`.table-comfortable` (rare: dashboards, read-only summaries).

### Listing behaviour

- Server-side paging for anything that can exceed ~200 rows (`page`, `pageSize`, `search`, filters →
  `PagedResultDto`). Small lookups may load all and filter client side.
- Debounce search 300 ms; reset to page 1 when filters change.
- Keep filters in the URL query string (`useSearchParams`) so refresh/back preserves them.
- Show loading row while fetching; keep previous rows visible during refetch (no flicker).
- Empty state text names the thing: "No users found."
- Hide or disable actions the user can't perform via `PermissionControl`; the API re-checks anyway.
- Sort order: newest/alpha by default from the API; client sort only for small lists.

---

## 3. Centered modal (add / edit)

Shared component `src/components/ui/Modal.jsx` (new — original inlines it). Markup copied from the
designations editor:

```jsx
export default function Modal({ open, title, subtitle, icon, onClose, children, footer, size = 'lg', as = 'div', onSubmit }) {
  if (!open) return null
  const Tag = as
  const width = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }[size]
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <Tag role="dialog" aria-modal="true" onSubmit={onSubmit}
        className={`w-full ${width} overflow-hidden rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {icon ? <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-primary)] text-white">{icon}</div> : null}
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div> : null}
      </Tag>
    </div>
  )
}
```

Form rules:

- Use `<Modal as="form" onSubmit={submit}>` so Enter submits.
- Title: "Add user" / "Edit user". Icon: `<Plus/>` / `<Pencil/>`.
- Two-column fields: `grid gap-3 sm:grid-cols-2`.
- Footer: Cancel (secondary) + Save (primary with spinner, disabled while `isSaving`).
- Client validation for required/format; show server `message` via toast on 400.
- On success: close, toast "User saved.", reload list (keep page/filters).
- Escape closes (unless saving). Clicking the backdrop does **not** close forms (prevents data loss).
- Same component for add and edit: `editingId ? update : create`.

---

## 4. Off-canvas drawer

Shared component `src/components/ui/Drawer.jsx` (generalised from `CampusNotificationsDrawer.jsx`):

```jsx
export default function Drawer({ open, title, icon, onClose, children, footer, size = 'md' }) {
  if (!open) return null
  const width = { md: 'w-[min(100vw,28rem)]', lg: 'w-[min(100vw,40rem)]', xl: 'w-[min(100vw,56rem)]' }[size]
  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-900/20 backdrop-blur-[1px]" aria-label="Close" onClick={onClose} />
      <aside role="dialog" aria-modal="true"
        className={`absolute inset-y-0 right-0 flex ${width} flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)] animate-[drawer-slide-in_220ms_ease-out]`}>
        <div className="flex h-[3.75rem] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <h2 className="flex items-center gap-2 text-[1.05rem] font-bold tracking-tight text-slate-900">{icon}{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div> : null}
      </aside>
    </div>
  )
}
```

Add to `index.css`:

```css
@keyframes drawer-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
```

Used for: user permissions editor, notifications, chat (chat has its own drawer with the same chrome),
row detail views, long forms. On phones the drawer is full width (the `min(100vw, …)` handles it).

---

## 5. ConfirmDialog

Copy `reference/frontend/src/components/campus/ConfirmDialog.jsx` → `src/components/ui/ConfirmDialog.jsx`
(props: `open, title, description, confirmLabel, cancelLabel, confirmClass, busy, icon, confirmAutoFocus,
confirmOnEnter, onCancel, onConfirm`; `z-[90]`). Rename `--campus-primary` → `--app-primary`.

Delete pattern:

```jsx
<ConfirmDialog
  open={!!deleteRow}
  title="Delete user?"
  description={<>“{deleteRow?.username}” will no longer be able to sign in.</>}
  confirmLabel="Delete"
  confirmClass="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
  icon={<Trash2 size={20} />}
  busy={isDeleting}
  onCancel={() => setDeleteRow(null)}
  onConfirm={confirmDelete}
/>
```

API: `POST /api/<resource>/{id}/delete`. Toast "User deleted."

---

## 6. Pagination

`src/components/ui/Pagination.jsx` (new; original inlines it in activity logs):

- Left: "Showing 26–50 of 312".
- Right: page size select (25/50/100), Prev / page numbers (max 5 with ellipsis) / Next.
- Container: `flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600`.
- Buttons: `h-7 min-w-7 rounded-md border border-slate-200 px-2 hover:bg-slate-50`, active page
  `bg-[var(--app-primary)] text-white border-[var(--app-primary)]`.
- Hide entirely when `total <= pageSize` and page is 1.

---

## 7. Service + API conventions per CRUD feature

Frontend `src/services/<feature>Service.js`:

```js
import api from './api'
const unwrap = (res) => res?.data?.data

export const listX   = async (params) => unwrap(await api.get('/api/x', { params }))
export const getX    = async (id) => unwrap(await api.get(`/api/x/${id}`))
export const createX = async (payload) => unwrap(await api.post('/api/x/create', payload))
export const updateX = async (id, payload) => unwrap(await api.post(`/api/x/${id}/update`, payload))
export const deleteX = async (id) => unwrap(await api.post(`/api/x/${id}/delete`))
```

Backend per feature: `XController` (thin) → `IXService` / `XService` → DTOs `XListItemDto`,
`XDetailDto`, `CreateXRequestDto`, `UpdateXRequestDto` → entity `X : BaseEntity` + `XConfiguration` →
migration. Permission codes `x_list`, `x_add`, `x_edit`, `x_delete` appended to `PermissionCatalog`, mirrored
in `constants/permissions.js`, added to `APP_SHELL_NAV` and `ROUTE_PERMISSIONS`. Each mutation writes an
activity log entry.

---

## 8. Generic lookup CRUD

For simple name-only lists (categories, types, tags) copy the idea of
`reference/frontend/src/pages/Campus/settings/NamedLookupCrudPage.jsx`: one component parameterised by
`title`, `icon`, `load`, `create`, `update`, `remove`, `permission`, and column config. A new lookup page is
then ~15 lines.

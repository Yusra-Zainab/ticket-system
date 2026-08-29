# Project Memory: Resource Portal Permission Parity

## Context
This is a Next.js 15+ (App Router, Turbopack) ticket/project management system (MySQL via `mysql2`, Zod validation) with three portals: **admin**, **client-portal**, and **resource-portal**. The resource-portal is being brought to full functional parity with admin, gated entirely by role permissions, reusing admin components/API routes rather than duplicating them.

## Canonical permission model
Source of truth: `lib/rolePermissions.ts` — a flat array of permission strings per role, grouped conceptually (not structurally) as:
- **Dashboard**: View Dashboard, View Reports, Export Reports
- **Tickets**: View/Create/Edit/Delete/Assign Tickets, Change Ticket Status, Change Ticket Priority, View Ticket Reports
- **Projects**: View/Create/Edit/Delete Projects, Assign Project Team, Manage Project Modules, Manage Project Files, View Project Reports
- **Resources**: View/Create/Edit/Delete Resources, Assign Resources, View Resource Workload
- **Clients**: View/Create/Edit/Delete Clients, Assign Client Projects, Manage Client Team
- **Users**: View/Create/Edit/Disable/Delete Users
- **Administration**: View/Create/Edit Roles, Delete Custom Roles, Manage Permissions, Configure Email, Configure System Settings
- **Notifications**: View Notifications, Manage Notifications, Send System Notifications

Roles table also has `permission_scopes` (JSON column, keyed by permission string, values `ALL` | `ASSIGNED_ONLY`). Missing key defaults to `ALL`. Currently only meaningfully applied to **View Projects** and **View Tickets**.

- **Assigned relation for Projects**: `project_resources.user_id` (NOT `form_data.teamIds`, which is display-only).
- **Assigned relation for Tickets**: `tickets.created_by` OR `tickets.assigned_to`.

## Architecture decisions locked in
1. **Reuse, don't rebuild.** Resource-portal pages call the exact same admin data-fetch functions and the exact same `/api/*` routes as admin — never parallel `/api/resource-portal/*` endpoints. UI components (tables, forms, detail views) are imported directly from `components/features/*` and configured via props (e.g. `projectBaseHref`, `allowProjectEdit`) rather than duplicated.
2. **Every write action needs a server-side check**, not just UI hiding. Pattern: `requireApiPermission("Permission Name")` from `lib/apiPermissions.ts`, called inside each route handler, in addition to `proxy.ts`'s per-method/per-permission gate (see `projectApiPermission`/`ticketApiPermission` helpers in `proxy.ts`).
3. **`proxy.ts` no longer blanket-blocks non-admins.** It used to gate `/api/projects`, `/api/tickets`, `/api/clients`, `/api/resources`, `/api/users`, `/api/roles` etc. via `isAdminRole()`. This is being replaced route-by-route with per-method permission mapping functions. The old blanket `isAdminRole` check still exists as the final fallback for anything not yet mapped.
4. **Roles/Users/Administration were originally going to stay admin-only** (privilege-escalation concern — a resource with "Create Users" could create admin accounts). This was explicitly overridden by the project owner: build resource-portal pages for these too, permission-gated like everything else. Noted as a deliberate choice, not an oversight.
5. **Global CSS is off-limits.** `app/globals.css` must never be touched. New styling goes in scoped `<style>` blocks matching the existing resource-portal pattern (see `app/resource-portal/layout.tsx`).
6. **Layout spacing**: horizontal padding for all resource-portal pages now lives centrally in the shared layout (`.resource-portal-main` / `ResourcePortalShell.tsx`), not per-page. Don't add one-off page padding — remove it if found, it causes double-padding.
7. **Design fidelity requirement**: every resource-portal page must be visually indistinguishable from its admin counterpart (same components, same Tailwind classes, same spacing/typography) — verified by reading the actual admin page source before building, never approximated from memory.

## Standing verification bar (non-negotiable, every phase)
- `npx eslint` on touched files.
- `npx tsc --noEmit` on the **full tree**, not just touched files — twice now, changes in one phase introduced type errors in files outside that phase's stated scope. Compare against a clean baseline (`git stash` + typecheck) if there's any doubt whether an error is pre-existing.
- Never label an error "pre-existing" without actually checking the baseline first.

## Recurring bug classes to watch for
- **Data-shape mismatches**: a resource-portal page fetching a *lighter* version of a data object than admin's fetcher produces (e.g. `listClients()` vs `listClientRows()` — the former omitted `assignedProjects`, crashing `ClientsTable`). Always confirm the resource-portal page calls the *identical* data-fetching function as admin, not a similar-looking one.
- **Debug `console.log` placed outside a function body** → crashes at module-evaluation time, not runtime — looks like a totally unrelated rendering bug (this caused the original "only 3 icons in action bar" investigation to go down a wrong path).
- **Turbopack stale/corrupted HMR chunks**: if an error references a line number that doesn't exist in the real source file, kill the dev server, `rm -rf .next`, restart — don't debug the phantom line.
- **Claimed-complete work with silent gaps**: Create/Edit/Delete Resources permissions existed on a role but had zero resource-portal pages built, despite being reported as part of "Phase 1 complete." Always spot-check a real role's permission list against actual rendered UI before trusting a completion report.
- **ASSIGNED_ONLY scope silently not applied on reused-component list pages**: `app/resource-portal/projects/page.tsx` used the plain admin `listProjects("OPEN")` and rendered every project regardless of the role's "View Projects" = ASSIGNED_ONLY scope. The projects *detail* page and `listResourceProjects()` handled scope; the list page (which reuses `ProjectsTable`, so it can't just call `listResourceProjects` — different return type) did not. Fix pattern: fetch `listProjects()`, then `if (getRolePermissionScope(role,"View Projects") === "ASSIGNED_ONLY")` filter by `listAssignedProjectIds(userId)` (helper in `lib/resourcePortal.ts`, backed by `project_resources`). **Any resource-portal list page that reuses an admin table + admin fetcher must re-apply scope itself.** Tickets list already does it right via `listResourceTickets`. Projects *drafts* list still unscoped (murky semantics — noted, not fixed).

## Progress so far (phase order)
1. ✅ Projects: list/detail/new/edit/drafts pages, API permission checks, proxy relaxation, nav + mini-bar wiring, ASSIGNED_ONLY scope support.
2. ✅ Tickets: same pattern, reusing `TicketForm`/`TicketsTable`/`TicketDetailsView`.
3. ✅ Resources: list/detail **plus new/edit/drafts** pages now exist in resource-portal (`/resource-portal/resources/new`, `/[id]/edit`, `/drafts`), permission-gated (Create/Edit Resources). `ResourceDetailsView`/`ResourcesTable`/`NewResourceForm` took `resourceBaseHref`/`projectBaseHref`/`rolesNewHref`/`ticketBaseHref` props so the same components serve both portals; their `detailBaseHref` defaults were corrected back to admin routes (`/resources`) — the resource-portal default they had been flipped to was silently breaking the admin resources list + `/admin/users` Resources tab. `AdminUsers` gained `resourcesDetailHref`/`clientsDetailHref`. proxy `/api/resources` POST now allows Create **or** Edit Resources (was Create-only, blocking edit-only roles). **No Delete-resource UI/route was added — none exists in admin either, so parity says leave it.**
4. ✅ Clients: list/detail **plus new/edit/drafts** pages now exist in resource-portal, permission-gated (Create/Edit Clients). `ClientDetailsView`/`ClientsTable`/`ClientDraftsTable`/`NewClientForm` took `clientBaseHref`/`projectBaseHref`/`ticketBaseHref` + `allowClientEdit` props; `detailBaseHref` defaults corrected to `/clients`. In-tab cross-entity links (a project/resource row inside a client/resource detail tab) still point at admin routes — same pre-existing inconsistency as the "done" Projects/Tickets detail tabs, left alone.
5. ✅ Scope model (`permission_scopes` column + `getRolePermissionScope()`) implemented for Projects/Tickets.
6. ✅ Layout spacing centralized.
7. ✅ Phase 1 (button-level gating on Project/Resource/Client detail views + their API routes) — completed with one dev-tooling hiccup (corrupted file mid-edit, recovered).
8. ✅ Phase 2 (Users): full CRUD in resource-portal, proxy relaxed, nav/mini-bar added.
9. ✅ Resources/Clients create-edit-drafts gap closed (see items 3–4).
10. ✅ Phase 3 (Roles/Administration + Configure Email): resource-portal pages `/resource-portal/roles`, `/resource-portal/roles/new` (also handles edit via `?role=`), `/resource-portal/settings/email`. Permission-gated: View Roles (list), Create Roles (new), Edit Roles (edit), Configure Email (email settings). `RolesTable` took `roleFormHref`, `RoleForm` took `rolesListHref`. `api/roles` POST→Create Roles / PATCH→Edit Roles, `api/settings/email` PATCH→Configure Email, plus matching `roleApiPermission`/`settingsApiPermission` maps in `proxy.ts`. New nav section `id: "administration"` (`ShieldCheck` icon, section-gated on **View Roles** — a role with only "Configure Email" and no "View Roles" won't see the section; single-permission-per-section limitation, same as every other section) + `ResourceFloatingActionBar` mini-bar branch. `api/roles` still has no GET/DELETE handler and `RolesTable` has no delete UI — "Delete Custom Roles" is unreachable in admin too.
11. ⏳ **Currently pending**: Phase 4 (Notifications compose/send — confirmed no admin UI exists yet, likely a no-op / separate scoped task).

## Key files
- `lib/apiPermissions.ts` — `requireApiPermission()` helper, the standard server-side gate.
- `lib/rolePermissions.ts` — canonical permission groups/list.
- `lib/resourcePortal.ts` — resource-portal-specific data fetchers (`listResourceProjects`, `listResourceTickets`) that apply ASSIGNED_ONLY scoping.
- `lib/resourcePortalNav.ts` — declarative nav config (`resourceNavSections`) driving the floating action bar; adding a page = adding an entry here, the action bar component itself shouldn't need logic changes.
- `components/resource-portal/ResourceFloatingActionBar.tsx` — permission-driven bottom nav + per-category mini-bars (search → section icon → filtered actions → back).
- `components/resource-portal/ResourcePortalShell.tsx` — breadcrumbs, layout frame, renders the action bar.
- `app/resource-portal/layout.tsx` — session + permissions fetch, shared styles.
- `proxy.ts` — route-level auth/permission gate, being incrementally converted from blanket admin-only to per-method permission maps.
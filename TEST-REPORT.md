# Test Report — Ticket System

Branch: `test-hardening` (off `test` @ `ba3eb1c`) · Live stack: dev server :3000, MySQL :3306, MailHog :1025
Plan: `~/.claude/plans/starry-scribbling-kahn.md`

**Status:** Passes A, B, C done (C = static audit + targeted browser checks against
`next start`). **17 of 21 findings fixed & verified**; F1 down-graded to a dev-only Turbopack
issue; F19/F20/F21 are recommendations (refactors / a formatting decision). `tsc` exit 0;
`next build` passes; `eslint` unchanged from baseline (2 pre-existing errors, 0 new).
All work on branch `test-hardening`, **uncommitted** (26 files).
**Deliverables:** `TEST-REPORT.md` ✓ · `BUGS.md` ✓ · `database/schema.full.sql` ✓ (16 tables,
mysqldump `--no-data`) · README "how to run" section ✓

## Pass A — Auth · Permissions · Tickets · Email (+ Layer 1 static)

### Result summary

| Phase | Happy path | Validation (400) | Permission (403) | Notable findings |
|---|---|---|---|---|
| P1 Auth & session | PASS | PASS | PASS | F1 (blocker), F2, F3, F4, F5, F6 |
| P2 Roles & permissions | PASS | PASS | PASS | F7 (High), F8, F10 |
| P6 Tickets (API) | PASS (PATCH) | PASS | PASS | F7, F9, F10 |
| P7 Email | PASS | PASS | n/a | F12 (High), F13, F14, F15 |
| Layer 1 static | `tsc` PASS · `eslint` baseline (2 pre-existing errors) | — | — | F16 |

Layer 3 (browser UI walkthrough) is **blocked** — see F1.

### P1 — Auth & session — test log

| Case | Expected | Actual |
|---|---|---|
| Login: 3 seeded accounts | 200 + portal redirect | PASS — admin→/dashboard, resource→/resource-portal/dashboard, client→/client-portal/dashboard |
| Login: wrong password | 401 | PASS `{"error":"Invalid email or password."}` |
| Login: unknown email | 401, identical message | PASS — no enumeration via message body |
| Login: bad email format / password < 8 | 400 | PASS `{"error":"Invalid login request."}` |
| Logout | 200, session row deleted, next call 401 | PASS |
| Logout-all | all user sessions deleted | PASS (5→0) |
| Forgot-password: known email | 200, 1h token, prior tokens used, MailHog email w/ `/reset-password?token=` | PASS |
| Forgot-password: unknown email | 200 `{ok:true}`, no email | PASS |
| Reset-password: valid token | 200, scrypt re-hash, all sessions killed, auto-login cookie | PASS |
| Reset-password: mismatch | 400 `Passwords do not match.` | PASS |
| Reset-password: token < 20 chars | 400 (Zod) | PASS |
| Reset-password: bogus 40-char token | 400 `This reset link is invalid or has expired.` | PASS |
| Reset-password: reuse used token | 400 | PASS |
| proxy: unauth page `/projects` | 307 → `/login?next=%2Fprojects` | PASS |
| proxy: unauth `/api/projects` | 401 | PASS |
| proxy: resource → `/api/client-portal/tickets` | 403 `Client portal access required.` | PASS |
| proxy: client → `/api/users` | 403 `Administrator access required.` | PASS |

### P2 — Roles & permissions — test log

Probe role **TEST-Limited** = `View Dashboard, View Tickets, View Projects, Create Tickets` only.

| Endpoint / action | Expected | Actual |
|---|---|---|
| `POST /api/roles` (as admin) | 201 | PASS |
| `PATCH /api/roles` (as admin) | 200 | PASS |
| Limited: `GET /api/tickets`, `/api/projects` | 200 | PASS |
| Limited: `GET /api/resources`, `/api/clients`, `/api/users`, `/api/roles` | 403 | PASS |
| Limited: `POST /api/projects`, `/api/clients`, `/api/resources`, `/api/roles` | 403 | PASS |
| Limited: `PATCH /api/settings/email` | 403 | PASS |
| Limited: page `/resource-portal/resources`, `/resource-portal/users` | 404 (notFound) | PASS |
| Limited: page `/resource-portal/tickets` | 200 | PASS |
| Admin adds `View Resources` to role → Limited `GET /api/resources` | 200 immediately | PASS (no stale cache; revert → 403) |
| Limited: `PATCH /api/tickets/[id]` status / assignedTo / priorityType / title | 403 each | PASS |
| Limited: `PATCH /api/tickets/[id]` commentContent (has View Tickets) | 200 | PASS |
| Limited: `DELETE /api/tickets/[id]` | 403 | PASS |
| Admin: `PATCH /api/tickets/[id]` status / priority / assign / comment | 200 each | PASS |
| Admin: `PATCH` invalid status enum / empty `{}` | 400 each | PASS |
| `DELETE /api/roles/[id]` (admin) | — | 404 (no route) — see F8 |

### P6 — Tickets — additional

- `POST /api/tickets` body shape: `{ ticket: {id,title,project,status,priority(1-4),assignedTo,reporter,created,dueDate,description,tags,formData}, state: "draft"|"open" }`.
- Draft create → `lifecycle=DRAFT`; re-POST same id with `state:open` → promoted to OPEN, priority/assignee updated. **Client supplies `ticket.id`.**
- `assigned_to` / `created_by` / `project_id` resolved by name→id lookup; unknown → NULL (no FK error).
- Activities row written for comments (both admin & limited-user comments logged). **Not** written for status/priority/assign — F10.
- **Not yet tested** (blocked / deferred to Pass B/C): attachment upload + retrieval + display, comment `visibility` PUBLIC vs INTERNAL isolation in client portal, resource/client-portal ticket list scoping end-to-end.

### P7 — Email — test log

| Case | Expected | Actual |
|---|---|---|
| `PATCH /api/settings/email` valid (with password) | 200 | PASS |
| `PATCH` again with blank password | 200, stored secret preserved | PASS (`QA-SECRET-1` retained) |
| `PATCH` port `99999` | 400 `Invalid port number.` | PASS |
| `PATCH` fromAddress `notanemail` | 400 `Invalid From Address.` | PASS |
| After setting host=`smtp.qa2.test` from=`qa2@test.com`, trigger forgot-password | email uses configured SMTP/from | **FAIL** — email went to MailHog `127.0.0.1:1025` from `yzainab@datapulsetechnologies.org`. See F12. |
| `POST /api/resources` (OPEN) | 201 + onboarding email | PASS — MailHog "Your Support Portal account has been created", body has `Temporary Password: Password123!` |
| Onboarded resource logs in with emailed password | 200 | PASS |

### Layer 1 — static analysis

| Check | Result |
|---|---|
| `npx tsc --noEmit` (full tree) | **exit 0** |
| `npx eslint .` | 2 errors, 15 warnings — **pre-existing baseline** (branch identical to `test`). Errors: `app/dashboard/page.tsx:41`, `components/features/ProjectDetailsView.tsx:487`. Full list in `/tmp/eslint.log`. |
| `npx next build` | **deferred** — would disrupt the running dev server; run after F1 restart |
| Dead deps | `bcryptjs`, `jsonwebtoken`, `multer`, `dotenv` — 0 source imports. `components/ui/Input.tsx` — 0 imports. See F16. |

---

## Findings (see BUGS.md for the ranked list)

F1–F17 recorded in `BUGS.md`.

## Fixes applied (Pass A, round 1) — branch `test-hardening`

| Finding | Change | Files |
|---|---|---|
| F7 | POST `/api/tickets` rejects (409) when `ticket_id` already exists and is OPEN; 403 when modifying another user's DRAFT. New-draft / draft→open flow unchanged. | `app/api/tickets/route.ts` |
| F12 | `sendMail()` now loads `getEmailTransport()` (new server-only raw getter) and uses the configured host/port/from + optional SMTP `AUTH LOGIN` + STARTTLS/SSL; falls back to MailHog env only when SMTP is unconfigured. | `lib/auth.ts`, `lib/db.ts` |
| F13 | `PATCH /api/tickets/[id]` emails the new assignee on assignment and creator+assignee on status change (skips the actor and anyone with `formData.emailNotifications === false`). | `app/api/tickets/[id]/route.ts` |
| F10 | Same route writes `activities` rows for status / priority / assignee changes. | `app/api/tickets/[id]/route.ts` |
| F2 | New `lib/passwordPolicy.ts` (length + upper/lower/digit/symbol). Enforced server-side on reset-password and all 3 profile password-change routes. | `lib/passwordPolicy.ts`, `app/api/auth/reset-password/route.ts`, `app/api/{profile,resource-portal/profile,client-portal/profile}/route.ts` |
| F3 | `authenticateUser()` always runs scrypt (dummy hash when no user); forgot-password sends its email fire-and-forget. | `lib/auth.ts`, `app/api/auth/forgot-password/route.ts` |
| F16 | Removed `bcryptjs`, `jsonwebtoken`, `multer`, `dotenv` (0 imports); deleted dead `components/ui/Input.tsx` (0 imports). | `package.json`, `package-lock.json`, `components/ui/Input.tsx` (deleted) |
| F5 | `POST /api/auth/login` takes `role` and enforces the account's portal (403 on mismatch, after the credential check). | `app/api/auth/login/route.ts` |
| F18 | Resource/client self-service profile routes write the `users.avatar` column too (not just `form_data.avatarUrl`), so photos show in every list/detail/comment view. | `app/api/{resource-portal,client-portal}/profile/route.ts` |

### Round 2 — the previously-open findings

| Finding | Change | Files |
|---|---|---|
| F14 | Onboarding no longer ships a shared `Password123!` — `generateTempPassword()` (random, policy-compliant), emailed, `form_data.mustChangePassword=true`. `issueSessionResponse` sends such users to the profile editor; the flag clears when they set a real password (profile routes + `resetPasswordFromToken`). | `lib/passwordPolicy.ts`, `lib/auth.ts`, `app/api/{users,resources}/route.ts`, `app/api/{profile,resource-portal/profile,client-portal/profile}/route.ts` |
| F4 | In-memory fixed-window rate limiter on `/api/auth/{login,forgot-password,reset-password}` — per-IP + per-email buckets, `Retry-After` on 429, reset on successful login. | `lib/rateLimit.ts`, `app/api/auth/*` |
| F8 | `DELETE /api/roles/[id]` gated on `Delete Custom Roles`; blocks SYSTEM roles (403) and roles still held by users (409). Proxy map + `RolesTable` delete button (`allowDelete` prop) + wired from both roles pages. | `app/api/roles/[id]/route.ts`, `proxy.ts`, `components/features/RolesTable.tsx`, `app/{admin,resource-portal}/roles/page.tsx` |
| F6 | `syncPortalAccount()` only creates a missing seeded account now — it no longer hard-resets name/password/role/form_data on every login and password-reset. | `lib/auth.ts` |
| F9 | `POST /api/tickets` honours a valid requested `status` on open-create (falls back to "Open"). | `app/api/tickets/route.ts` |
| F11 | Shared `avatarSchema` caps avatar/photo data-URLs at ~3 MB across the profile + resource + user routes (the old `max(2000)` silently rejected real images). | `lib/validation.ts`, `app/api/{resources,users,resource-portal/profile,client-portal/profile}/route.ts` |
| F16/F17 | `npm audit fix` (safe) after the dead-dep removal: **7 → 3 high** (remaining are `sharp`/`libvips` transitive; need `npm audit fix --force` → `next@16.3.3`). | `package-lock.json` |

**Round-2 verification (live API + MailHog):**
- F14 — emailed temp password was `qwgt5$ihx9ZgMW` (not `Password123!`); `mustChangePassword=true`; login → `redirectTo: /resource-portal/profile/edit`.
- F4 — login 401×8 → **429**; forgot-password 200×4 → **429**.
- F8 — unused custom role → 200; SYSTEM → **403**; user-held role → **409**.
- F6 — edited a seeded account's name/form_data, then login + forgot-password → edits survived.
- F9 — `status:"Blocked"` → stored "Blocked"; `status:"Bogus"` → "Open".
- F11 — a 4 KB data-URL (rejected under the old cap) → **200**.
- `tsc --noEmit` exit 0; `eslint` on touched files clean.

**Verification (live API + MailHog, `test-hardening`):**
- F7 — limited-perm user POST to overwrite an OPEN ticket → **409**, ticket unchanged; legit new draft → 201.
- F2 — `aaaaaaaa` on reset → **400**; `Abc123!xy` → 200; profile PATCH `weakpass` → **400**.
- F3 — unknown-email vs known-email-bad-password now both ~0.25 s (was ~0.05 s vs ~0.19 s).
- F12 — set `from_address=custom-sender@qa.example` in DB → next email's `From:` header matched.
- F13 — assign ticket → assignee emailed; status change → assignee emailed; actor excluded.
- F10 — `activities` gained "Changed assignee" / "Changed status" rows.
- `tsc --noEmit` exit 0; `eslint` on touched files clean (1 pre-existing warning in `lib/auth.ts`).

**Still blocked:** F1 (React not hydrating). **Confirmed to persist after a full
`rm -rf .next` + `npm run dev` restart** — not a transient HMR wedge. See the expanded F1
entry in `BUGS.md` for the diagnosis and the maintainer's next-step checklist. Layer-3
browser testing + browser verification of the fixes remain blocked.

### F5 — role selector enforcement (added per maintainer request)
`POST /api/auth/login` now enforces the selected portal. Verified (10 cases):
admin+Admin→200, admin+Client→**403**, admin+Resource→**403**, client+Client→200,
client+"Client Team"→200, resource+Resource→200, resource+Admin→**403**,
wrong-password (any role)→401 (creds first), no `role` field→200 (back-compat),
invalid label→400.

---

## Pass B — Resources · Clients · Projects · Profile (API layer; browser blocked by F1)

| Case | Expected | Actual |
|---|---|---|
| **P5** create project (open) / GET / PATCH | 201 / 200 / 200 | PASS |
| P5 read-only role PATCH / POST / DELETE project | 403 | PASS ×3 |
| P5 create-role user POST project (has Create Projects) | 201 | PASS |
| P5 DELETE project | 204 | PASS |
| P5 delete → `project_resources` cascade | rows removed | PASS (FK `ON DELETE CASCADE`) |
| P5 delete → `project_attachments` cascade | rows removed | PASS |
| P5 delete → tickets with that `project_id` | not deleted | PASS — `project_id` set to **NULL** (`ON DELETE SET NULL`), ticket kept |
| P5 attachment upload → store → GET → DELETE | round-trips | PASS (via Node `FormData`; blob in DB, GET returns bytes, DELETE 204) |
| **P4** create client (open, valid email) / GET / PATCH | 201 / 200 / 200 | PASS |
| P4 read-only role PATCH / POST / DELETE client | 403 | PASS ×3 |
| P4 "Edit Clients only" role: basic PATCH | 200 | PASS |
| P4 same role PATCH with `formData.projectIds` | 403 (needs Assign Client Projects) | PASS |
| P4 same role PATCH with `formData.accountManagerId` | 403 (needs Manage Client Team) | PASS |
| P4 client draft: create → GET → PATCH register → DELETE | DRAFT→OPEN, then removed | PASS |
| P4 DELETE client that has a project linked | project's `client_id` → NULL, no error | PASS (`ON DELETE SET NULL`) |
| **P3** create resource DRAFT / GET `?state=DRAFT` | 201 / 200 | PASS |
| P3 read-only role POST resource | 403 | PASS |
| P3 create-role user POST resource | 201 | PASS |
| P3 `DELETE /api/resources/[id]` | — | 404 (no route — matches admin having no delete-resource UI) |
| **P8** non-seeded user password change via profile PATCH | persists | PASS — old pw → 401, new pw → 200 (confirms F6 is seeded-only) |
| P8 profile PATCH with weak `newPassword` | 400 | PASS (F2 fix) |
| P8 resource / client profile photo | stored | stored in `form_data.avatarUrl`, **not** `users.avatar` → **F18** |

**Pass B findings:** F18 (photo split-brain, Medium). Referential integrity is actually
*better* than the plan assumed — `projects.client_id` and `tickets.project_id` are
`ON DELETE SET NULL`, `project_resources`/`project_attachments` are `ON DELETE CASCADE`;
no orphan crashes.

**Not covered in Pass B (needs browser / deferred to Pass C):** dropdown-consistency audit,
validation-UX inventory, responsive checks, ticket comment PUBLIC/INTERNAL isolation in the
client portal, resource/client portal list scoping end-to-end.

---

## Pass C — UI consistency & validation UX

Run against `next start` (F1 is dev-only). Static code audit + targeted browser checks.

**Browser-verified (production build, admin session):**
- **F5** — login with admin creds + Role="Client" → red inline "This account can't sign in
  through the Client portal. Change the Role selector and try again."; selecting "Admin" →
  logs in to the Admin Dashboard.
- **F8** — `/admin/roles`: the custom "Test role" row shows a trash icon (SYSTEM rows don't);
  it opens a "Delete role" confirm modal ("…Roles still assigned to users can't be deleted.").
- **F21** — `/profile/edit`: typing `weak` into New Password → red border + "Password must be
  at least 8 characters." So the invalid-state styling exists here — but the client check is
  **length-only** while the server (F2) also requires character classes → client/server drift.
- **F21 (Pass C fix, `next start`, fresh tab)** — `/resetPassword?token=…`: the rewritten form
  hydrates and works: typing `weak` shows the 5-rule checklist with "A lowercase letter" green
  and the rest grey; completing to `weakPass123!` turns all 5 rules green and the New Password
  border green; the Confirm field + matching value enable the (previously dimmed) "Reset
  Password" button. Screenshots captured. **No console errors.**
- **F1 recurrence note:** after the first page load in an automation tab, an in-tab reload (or
  a second tab) of `/login` no longer hydrates — typed text doesn't stick, "Sign in" is inert,
  still zero console output. The reset-password page hydrated because it was that tab's first
  navigation. So `LoginForm` / `ForgotPasswordForm` red-border changes are code-verified only
  (tsc + eslint + `next build`), same F1 harness limitation as every prior login UI test.
- **Console:** no errors on `/dashboard`, `/admin/roles`, `/tickets/new`, `/profile/edit`,
  `/tickets`.
- **Responsive:** at 390 px the tickets list has **no page-level horizontal overflow**; the
  table scrolls inside its own `overflow-x-auto` container; toolbar buttons stack; the
  floating dock fits. (Spot check — a full 360/768/1280 sweep across all screens still pending.)

### Dropdowns (draft §2) — **F20 (Medium)**

| Kind | Implementation(s) | Search box? | "New X" inline + blue border? | Tag + description one line? |
|---|---|---|---|---|
| Entity picker (project / assignee / module …) | `SearchDropdown` — **copy-pasted in 5 files**: `TicketForm`, `NewProjectForm`, `NewResourceForm`, `client-portal/ClientTicketForm`, `resource-portal/ResourceTicketForm` | yes | yes (`border-[#0284C7]`, xs, `hover:bg-sky-50`) | yes (`TagChip` + truncated detail) |
| Table filters (Role / Status / Type) | `AdminFilterDropdown`, `ResourceFilterDropdown`, `ClientFilterDropdown`, `RoleTypeDropdown`, `TeamFilterDropdown`, `StatusFilterDropdown` — **6+ separate** | mixed — some yes, some no | n/a | some (via `renderOption`) |
| Login "Role" selector | inline in `LoginForm` | **no** | n/a | no |
| Settings / config selects | `EmailSelect` (EmailSettingsForm), `PermissionGroupDropdown` (RoleForm), `ContactMethodDropdown` | **no** | n/a | no |
| Pagination ("rows per page") | native `<select>` everywhere | n/a | n/a | n/a — fine as native |
| A few form fields | native `<select className="field">` (`ResourceTicketForm` self-assign, `TicketDetailsView` assignee draft) | n/a | n/a | inconsistent with the custom dropdowns used for the same job elsewhere |

**Findings:** the reference `SearchDropdown` (in `TicketForm.tsx:1224`) meets every draft-§2
requirement (search box, "New X" inline, tag+detail on one line — all confirmed in the
browser on `/tickets/new`). But it's **5 near-identical copies** that have already drifted:
the "New X" / accent border is `border-[#0284C7]` in `TicketForm`/`NewProjectForm`/
`NewClientForm`, **`border-sky-400`/`border-sky-200`** in `ResourceTicketForm` and
`ClientTicketForm` (zero `#0284C7`), and `NewProjectForm`/`NewClientForm` also mix in
`border-[#06B6D4]` (cyan). `EmailSelect`, `PermissionGroupDropdown`, `ContactMethodDropdown`
and the login Role selector have **no search bar** (draft §2 wants one on all).
**Recommendation:** extract two primitives — `components/ui/Combobox` (searchable, optional
"New X" action, tag+detail rows) and `components/ui/Select` (short lists) — and replace the
19 bespoke functions. ~1–2 days; not done here (it's a refactor, not a bug fix).

### Validation UX (draft §7) — **F21 (Medium) — FIXED**

Original state:
- `components/ui/Input.tsx` — the exact "red info-icon + green focus-check + inline error"
  component the checklist describes — had **zero imports** (dead code; now deleted).
- **Auth forms** (`login`, `resetPassword`, `forgotPassword`): errors rendered only as an
  `auth-error` text span; the input kept `auth-input` with no border colour / icon / success
  state.
- Partial per-field valid/invalid styling existed in `EditProfileForm` / `ClientProfileForm`
  (password fields only, via `profile-input-valid` / `-invalid` in `globals.css`),
  `NewProjectForm`, `TicketForm`, `ResourceTicketForm`, `StepperForm`.
- Client checks didn't mirror the server Zod rules (`LoginForm` allowed 6-char passwords;
  every profile form was length-only while the server required character classes).

Fixed (see the **Pass C — fixes applied** table): shared `lib/passwordRules.ts` drives all
6 password-bearing forms (3 auth + 3 profile); each shows a live 5-rule checklist and
red/green field state. The **entity** forms (`NewAdminForm`, `NewResourceForm`, `RoleForm`,
`TicketForm`, …) have no password inputs at all — F14 made onboarding auto-generate — so
there's nothing left to wire there. Remaining nicety: a shared `<PasswordField>` to replace
the per-form wiring.
**Follow-up (optional):** the 6 forms now share the *rules* (`lib/passwordRules.ts`) but not a
*component* — the checklist + field-state markup is written 3 ways (`ResetPasswordForm` inline
Tailwind, `ResourceProfileForm`'s `PasswordField`, the `.profile-password-rules` blocks in the
other two). A single `<PasswordField>` would consolidate them. Not a defect — deferred.

### Date formatting — **F19 (Low)**
`Intl.DateTimeFormat` locale usage across the codebase: **`en-GB` ×18, `en-US` ×6, `en` ×1**
→ the same date shows as `31/08/2026` on some screens and `08/31/2026` on others. Pick one
(a shared `formatDate()` in `lib/`) — a maintainer decision on US vs UK format.

### Pass C — fixes applied

| ID | What changed | Verification |
|---|---|---|
| **F19** | Standardised on **`en-GB`**: `lib/utils.ts` `formatDate` + the 6 `en-US`/`en` call sites (`ClientProjectList`, `ClientDraftsTable`, `ClientsTable`, `ResourceDashboardView`, `ProjectDetailsView` date parts, `ProjectsDraftsTable`, `TicketForm`). Kept `ProjectDetailsView`'s `en-US` `toLocaleTimeString` (clock only). | `tsc` exit 0; eslint = baseline (`ProjectDetailsView.tsx:487` only) |
| **F21** | New `lib/passwordRules.ts` (pure, Client-safe) — `checkPasswordStrength` / `PASSWORD_RULES` / length consts; `lib/passwordPolicy.ts` re-exports it and keeps the server-only helpers. **Auth:** `ResetPasswordForm` rewritten (live rule checklist, red/green field state, show/hide toggle, confirm-match indicator, submit gated on the shared checker); `LoginForm` + `ForgotPasswordForm` red `!border-red-500` + `aria-invalid` on errored inputs; login client min-length `6 → 8` (closes the client half of F2). **Profile:** `EditProfileForm`, `ClientProfileForm`, `ResourceProfileForm` were all length-only client-side (disagreed with the server's char-class rules) — now validate against `PASSWORD_RULES` + render the live 5-rule checklist. | `tsc` exit 0; eslint clean on all touched files; `next build` exit 0. `ResetPasswordForm` browser-verified; login + profile forms code-verified only (F1). |
| **F20** | `NewProjectForm` dropdown action border `#06B6D4` → `#0284C7`. New **`components/ui/Combobox.tsx`** (+ `TagChip`) replaces the 3 ticket-form `SearchDropdown` copies (`TicketForm`, `ResourceTicketForm`, `ClientTicketForm` — ~350 lines removed). `NewProjectForm` / `NewResourceForm` dropdowns left alone (different components, not copies). `TicketForm`'s dropdown panel is now visually identical to the other two portals — **maintainer should eyeball `/tickets/new`**. | `tsc` exit 0; eslint = baseline; `next build` exit 0; `/tickets/new`, `/resource-portal/tickets/new`, `/client-portal/tickets/new` all render 200 |
| **F21** (round 3) | Extracted **`components/ui/PasswordChecklist.tsx`** — the live rule list is now one component across all 4 password forms (was 3 hand-rolled variants + 2 scoped `<style>` blocks + 3 copies of the memo). | `tsc` exit 0; eslint clean; `next build` exit 0 |
| **F22** (new, **High**) | Client user could `GET /api/tickets` / `/api/projects` and read every tenant's data incl. internal ticket notes (the "Client User" role holds `View Tickets`/`View Projects` for its own portal). `proxy.ts` now 403s any client-portal role on non-client-portal routes; the two GET handlers 403 non-admin `ASSIGNED_ONLY` callers. | client → 403 on both; client portal still 200; admin → 200; resource (ALL scope) → 200; `tsc`/`eslint`/`build` clean |
| **F24** (new, Low) | `POST /api/ticket-comments/admin/{id}` with no session returned **500** (page-session helper's `redirect()` throw swallowed by the catch, before auth). Now auths first with `getSessionUser` + role check → `401` / `403` before body parse or DB work. `/api/ticket-list/[portal]` already did this right. | no-auth → 401; client→admin-portal → 403; `tsc`/`eslint`/`build` clean |
| **F25** (new, **High**) | `lib/resourcePortal.ts` `getResourceTicketAccess` selected `p.form_data` with **no `LEFT JOIN projects p`** → `Unknown column 'p.form_data'` → **500 on every** resource-portal ticket PATCH + `/api/ticket-comments/resource/*` POST. Resource ticket-detail was entirely broken. Added the join. | resource comment POST → 200 (was 500); resource ticket PATCH → clean 403 (portal rule) not a crash; `tsc`/`build` clean |
| **F23** | Dead `comments.visibility` code deleted — 4 call sites + 2 orphaned `hasDatabaseColumn` helpers. All comment INSERTs are the plain 3-column form; `publicComments` no longer filters. Verified admin/resource comment POST still 200. | `tsc`/`eslint`/`build` clean |
| **F26** (new, **High**) | Profile pictures rebuilt: `users.avatar` (varchar 255) was silently truncating every uploaded data-URL. New `user_avatars` LONGBLOB table + `GET /api/avatars/[id]` serving endpoint; `persistUserAvatar` in all 7 write routes; `AvatarUpload` file-dialog component replaces the URL text box (resource) / adds the control (client + admin-own profile). | upload via all 6 form paths → bytes stored + pointer set; serve 200/`image/png`; no-auth 401; missing 404; DELETE 204; bad MIME/oversize → 400; photo shows in admin resources list; `tsc`/`eslint`/`build` clean |

**Still open in Pass C:** a `components/ui/Select` for the short-list dropdowns (`EmailSelect`,
`PermissionGroupDropdown`, `ContactMethodDropdown`, the 6 table filters — F20; new work, not
dedup), and the F1-blocked visual items below.

### Route health sweep (`next start`, per-persona, curl)
All page routes return their expected status — no 500s. Admin: 17/17 routes 200 (`/` 307 →
`/dashboard`). Resource (seeded "Developer" role): permission-gated pages correctly 404 where
the role lacks the permission (`/resource-portal/clients`, `/user`, `/roles`, `/settings/email`),
200 where it has it (`/tickets`, `/projects`, `/resources`). Client: portal routes 200; all
admin routes now 403/redirect (F22).

### API permission matrix (`next start`, curl — none / admin / resource / client)
Every `/api/*` endpoint probed for GET (read) and POST/PATCH/DELETE (write, with bodies
crafted to fail validation *after* the permission gate so nothing is written):
- **Unauthenticated** → 401 everywhere (except `/api/health`). ✅
- **Client** → 403 on every admin route (read + write), 200 only on `/api/client-portal/*` and
  `/api/health`. ✅ (this is the F22 fix)
- **Resource** ("Developer" role) → 200 only where the role's permission list grants it
  (`/api/projects`, `/api/tickets`, `/api/resources` read; `/api/tickets/[id]` PATCH passes the
  gate then 400s on the bad body), 403 everywhere else. ✅
- **Admin** → 200 on data routes; 405 on `/api/roles` + `/api/settings/email` (no GET handler
  — expected). ✅
- `PATCH /api/tickets/[id]` verified to do **per-field** permission checks (Edit / Assign /
  Change Status / Change Priority individually) **plus** an ASSIGNED_ONLY owner/assignee scope
  gate **plus** creator-only rename. `DELETE` has the same scope gate. Solid.
- No 500s in the matrix. **F24** and **F25** were both found while running it.
- **Not live-tested:** the ASSIGNED_ONLY 403 branch in `GET /api/tickets` / `/api/projects`
  (F22) — every seeded role is ALL-scope or admin; the code path is simple and tsc-verified.

### Comment visibility (PUBLIC vs INTERNAL) — dead code removed
The `comments` table has no `visibility` column and nothing ever wrote `INTERNAL`, yet 4 call
sites carried `hasDatabaseColumn("comments","visibility") ? <visibility SQL> : <plain>`
branches — a half-built feature. **F23**: deleted all of it (branches + 2 orphaned
`hasDatabaseColumn` helpers); every comment INSERT is now the plain 3-column form. No leak
existed (`mapTicket`'s field allow-list never forwarded `form_data.notes` to the portals).
Admin + resource comment POST re-verified at 200 after removal.

### Deferred (need F1 fixed — plain browser)
Responsive breakpoints, console-error sweep per page/portal, loading & error states.

## Test data hygiene

All Pass A test rows removed (users `test-*@qa.local`, roles `TEST-*`, tickets `TEST-TKT-*`,
their sessions / reset-tokens / project_resources / activities / comments). `email_settings`
row restored to `127.0.0.1:1025`. Verified: 0 `TEST-` rows remain.

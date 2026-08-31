# Bugs & Gaps — Ticket System (Pass A)

Severity: **Critical** (blocks core use / security hole) · **High** · **Medium** · **Low** · **Info**
Status: `open` · `fixing` · `fixed` · `deferred` · `wontfix`

## Fix status (Pass A round 1)

| ID | Severity | Status | Verified |
|---|---|---|---|
| F1 | Critical | **blocked** — needs dev-server restart (user) | — |
| F7 | High | **fixed** | API: 409 on OPEN-ticket overwrite; new drafts still 201 |
| F12 | High | **fixed** | API+MailHog: `from_address` from DB now used |
| F13 | Medium | **fixed** (ticket assign + status emails) | API+MailHog: assignee/creator notified, actor excluded |
| F2 | Medium | **fixed** | API: weak passwords 400 on reset + all 3 profile routes |
| F3 | Medium | **fixed** | API: unknown vs known-bad-pw timing now equal (~0.25 s) |
| F10 | Medium | **fixed** | DB: `activities` rows for status/priority/assignee changes |
| F16 | Low | **fixed** | `npm uninstall bcryptjs jsonwebtoken multer dotenv` — 31 pkgs removed, `tsc` clean |
| F5 | Low | **fixed** (per maintainer: enforce, don't remove) | API: portal mismatch → 403, correct portal → 200, no-role → back-compat 200 |
| F18 | Medium | **fixed** | API: resource sets photo via profile → `users.avatar` column populated → shows in admin `GET /api/resources` |
| F14 | Medium | **fixed** | API+MailHog: onboarding pw now random (`generateTempPassword`), emailed, `form_data.mustChangePassword=true` → login `redirectTo` = profile editor; cleared on password change |
| F4 | Low | **fixed** | API: login 401×8 → 429; forgot-password 200×4 → 429 (per-IP + per-email buckets, `lib/rateLimit.ts`) |
| F6 | Low | **fixed** | API: seeded account edits now survive login + forgot-password (no more per-login hard-reset) |
| F8 | Low | **fixed** | API+UI: `DELETE /api/roles/[id]` (Delete Custom Roles) — CUSTOM unused→200, SYSTEM→403, held-by-user→409; `RolesTable` gained a delete control |
| F9 | Low | **fixed** | API: `POST /api/tickets` with `status:"Blocked"` open-create → stored "Blocked"; invalid → "Open" |
| F11 | Info | **fixed** | API: `avatarSchema` caps data-URLs at ~3 MB (`lib/validation.ts`); the old `max(2000)` had been rejecting every real image |
| F15 | Info | partly fixed | new F13 ticket emails honor `emailNotifications`; onboarding/reset stay unconditional (by design) |
| F17 | Low | **fixed** | Bumped `next` + `eslint-config-next` to **16.3.3** → `npm audit` = **0 vulnerabilities** (was 7). `tsc` + `next build` still pass; eslint = baseline. (Did not fix F1 — that's a test-harness artifact, see F1.) |

## Fix status (Pass C round 1)

| ID | Severity | Status | Verified |
|---|---|---|---|
| F26 | **High** | **fixed** | Profile pictures: `users.avatar` is `varchar(255)` → every "uploaded" data-URL photo was truncated to garbage. Rebuilt on a `user_avatars` LONGBLOB table + `GET /api/avatars/[id]` serving endpoint (like attachments); `persistUserAvatar` wired into all 7 write routes; new `AvatarUpload` file-dialog component in the 3 profile forms (was a URL text box / missing). Verified end-to-end across all portals. |
| F25 | **High** | **fixed** | API: `getResourceTicketAccess` query selected `p.form_data` with **no `JOIN projects p`** → `Unknown column 'p.form_data'` → **every** resource-portal ticket PATCH (status/priority/edit/self-assign/rename) and `/api/ticket-comments/resource/*` POST returned **500**. Pre-existing; missed because F1 blocked the resource ticket-detail walkthrough. Added the `LEFT JOIN`. Resource comment now 200. |
| F24 | Low | **fixed** | API: unauth `POST /api/ticket-comments/admin/{id}` returned 500 (page-session `redirect()` swallowed) → now 401; wrong-portal role → 403. |
| F22 | **High** | **fixed** | API: client user → `GET /api/tickets` / `/api/projects` was **200 + every tenant's data** (incl. internal ticket notes); now **403** (proxy blocks client-portal roles from all admin routes). ASSIGNED_ONLY resources also 403'd from those two GETs. Admin still 200. |
| F19 | Low | **fixed** | Locale unified to `en-GB` across `lib/utils.ts` + 7 components; `tsc` clean, eslint = baseline |
| F21 | Medium | **fixed** | Auth: `ResetPasswordForm` rewritten (live rule checklist, red/green field state, show/hide, confirm-match, submit gated on `checkPasswordStrength`); `LoginForm` + `ForgotPasswordForm` red field state; login client min-length 6→8. Profile: all 3 profile forms now validate against the shared `PASSWORD_RULES` (was length-only → disagreed with server) + show the live 5-rule checklist. Entity forms have **no password inputs** (F14 removed manual entry), so nothing to do there. `tsc` + `eslint` clean, `next build` exit 0. Optional: extract a shared `<PasswordField>`. |
| F16 | Low | **fixed** | 4 dead deps already gone from `package.json`; dead `components/ui/Input.tsx` (0 imports) deleted. |
| F20 | Medium | **partly fixed** | One concrete inconsistency fixed (`NewProjectForm` dropdown action border `#06B6D4`→`#0284C7`). Full `Combobox`/`Select` extraction remains a documented recommendation — deferred (5-form refactor, needs browser testing). |

**F13 note:** the draft's "client creation sends a welcome email" is not a real gap —
`/api/clients` creates a CRM record with **no login account**. The portal-account path
(`/api/client-portal/team`) already emails `Password123!`. No email added on `/api/clients`.

---

## F1 — Info (was Critical) — `next dev` doesn't hydrate **in the automated-test browser**; every normal path works
**Status:** resolved as a test-harness artifact — **not an app bug.**
- `npx next build && npx next start` → hydrates perfectly (login works, inline errors, network calls).
- `next dev` with **Turbopack** AND with **`--webpack`** → same failure, so it's not bundler-specific.
- Bumping to **`next@16.3.3`** (latest) → no change.
- Deep inspect: the RSC flight `ReadableStream` on `window.__next_f` is **already closed** by
  the time the page settles, and React never attaches a single fiber — no console error, no
  overlay. This only happens in the **Claude-in-Chrome automation tab** (the extension injects
  into the page and interferes with dev-mode's HMR/RSC handshake); `next start` has no HMR
  socket, so it's unaffected. The maintainer builds this app with `next dev` daily, so dev
  hydration is fine for humans in a normal browser.
**Action:** none needed. If you ever *do* see a dead form in a plain browser under `next dev`,
`rm -rf .next` + restart. Layer-3 test runs go against `next start`.
**Refinement (Pass C, `next start`):** hydration works on the **first** navigation in a fresh
automation tab (verified: `/resetPassword` hydrated fully — live validation, state updates,
button gating). It then *stops* working after an in-tab reload or in a second tab of the same
session — typed text doesn't stick, submit is inert, still zero console output. Consistent
with the automation extension interfering with the RSC/hydration handshake on all but the
tab's first load. Not an app defect — plain browsers are unaffected.
**Symptoms (all reproduced twice, once per dev-server lifetime):**
- The `<form.auth-form>` has no React event props; the "Sign in" button has no handler. Clicking it does a **native GET → `/login?`** and nothing happens — **login is impossible through the UI**.
- Typing into the email field leaves `input.value === ""` (React renders it controlled at `value=""` but the state never updates → confirms `onChange` isn't wired).
- Clicking the "Role" dropdown does not open the menu (pure client state).
- Across the DOM: `0` nodes have `__reactFiber$` / `__reactProps$`. React DID create the root — `__reactContainer$` and `__reactEvents$` are present — and the RSC payload IS in the HTML (7 `self.__next_f.push([...])` scripts), and the client chunk with the component code IS served and loaded (`_0n19ana._.js`, 26 KB, contains `handleSubmit`/`setEmailError`/`LoginForm`).
- **No console errors, no Next error overlay, no build errors.** `window.__next_f` reads as an empty array in page context after load.
**So:** all inputs to hydration are present (correct source, correct bundle, loaded chunks, RSC payload) but the client never attaches fibers to the server HTML. Points to a Turbopack / Next 16.2.9 / React 19 hydration defect or an environment issue.
**`POST /api/auth/login` and every other API route work** — this is purely the client hydration step.
**Next steps for the maintainer (in order):**
1. Load `/login` in a **plain Chrome window / Incognito with no extensions** — rule out a browser-extension conflict (the automation extension injects into the page).
2. Check the `next dev` **terminal output** during compile for warnings (not visible to the tester).
3. Try `next dev --webpack` (Next 16 opt-out of Turbopack) — if hydration works, it's a Turbopack bug; pin/upgrade Next.
4. `npx next build && npx next start` and test the production build.

**Update (maintainer ran `npx next build`):** the production build **succeeds cleanly** —
"Compiled successfully in 29.4s", "Finished TypeScript in 49s", all 29 static pages generated,
every route (incl. the new `/api/roles/[id]`, `/resource-portal/roles/*`) listed, no errors.
So F1 is **not** a code / type / RSC-graph problem. Remaining hypotheses, in order:
(a) Turbopack **dev-mode** hydration bug — `next start` on the build above would confirm
(if `next start` hydrates and `next dev` doesn't, it's dev-only and not release-blocking);
(b) browser-extension interference (step 1);
(c) a client runtime error swallowed before the error overlay mounts.
**Do:** `npx next start` (stop `next dev` first — same port), open `/login` in a normal tab,
click "Sign in" with junk creds → expect the inline "Invalid email or password" and a
`POST /api/auth/login` in the Network tab. Report which of dev / prod hydrates.

**Blocks:** all Layer-3 browser testing and browser verification of the API fixes.

## F7 — High — `POST /api/tickets` upsert bypasses the ticket permission model
**Status:** **fixed** — POST now looks up `ticket_id` first: existing + OPEN → 409; existing + DRAFT owned by someone else → 403. New drafts still 201. (See Pass A table.)
**Where:** `app/api/tickets/route.ts` (POST — `INSERT ... ON DUPLICATE KEY UPDATE` on client-supplied `ticket.id`)
**Repro:** as a user whose role has **only `Create Tickets`**, `POST /api/tickets` with `ticket.id` set to an existing ticket's id and `state:"open"`. Result: that ticket's `title`, `status`, `priority_type/number`, `assigned_to`, `project_id` are overwritten — 201, no permission error.
**Impact:** bypasses `Edit Tickets` / `Assign Tickets` / `Change Ticket Status` / `Change Ticket Priority` / `Delete Tickets` and the `ASSIGNED_ONLY` scope that `PATCH /api/tickets/[id]` enforces. Ticket ids are exposed in URLs and the notification feed.
**Fix:** on POST, look up `ticket_id`; if it already exists either reject (`409`) or require the same per-field permissions the PATCH route computes. Preferably also stop trusting the client-supplied id for *new* tickets (server-generate).

## F12 — High — Email Settings page is non-functional; `sendMail()` ignores the DB config
**Status:** **fixed** — `sendMail()` now loads `getEmailTransport()` (DB `email_settings`), uses the configured host/port/from + AUTH LOGIN + STARTTLS/SSL, and falls back to the MailHog env only when the table is unconfigured. Verified via MailHog. (See Pass A table.)
**Where:** `lib/auth.ts` `sendMail()` vs `app/api/settings/email/route.ts` + `email_settings` table
**Repro:** set driver=SMTP, host=`smtp.qa2.test`, from=`qa2@test.com` via `PATCH /api/settings/email` (200). Trigger any email (forgot-password). Mail still goes to `MAILHOG_HOST:MAILHOG_SMTP_PORT` (`127.0.0.1:1025`) from `MAIL_FROM`. The `email_settings` row is read by nothing.
**Impact:** an admin configuring production SMTP through the UI is misled; with no MailHog in prod, all outbound mail fails silently.
**Fix:** `sendMail()` should load `getEmailSettings()` and use `host/port/username/password/encryption/from_address` (driver=SMTP path), falling back to the MailHog env vars only when the table is unconfigured. Mailgun/SendGrid/SES drivers: either implement or remove from the form's options.

## F13 — Medium — Notification emails only fire for 4 events
**Status:** **fixed** (ticket assignment + status-change emails added, actor excluded, honors `formData.emailNotifications`). Client-creation "welcome" email intentionally **not** added — `/api/clients` makes a CRM record with no login account (the portal-account path already emails). (See Pass A table + F13 note.)
**Where:** `sendMail` call sites — `app/api/auth/forgot-password/route.ts`, `app/api/resources/route.ts:537`, `app/api/users/route.ts:165`, `app/api/client-portal/team/route.ts:225`
**Missing:** client creation welcome email (`app/api/clients/route.ts` POST — none); ticket assignment email (`app/api/tickets/[id]/route.ts` PATCH `assignedTo` — none); ticket status-change email (none).
**Fix:** add `sendMail` on client create (welcome + `Password123!` like the resource path), on ticket assignment (to the new assignee), and on status change (to creator + assignee) — all gated by the recipient's `formData.emailNotifications !== false` (see F15).

## F2 — Medium — No password-complexity policy; client/server length rules disagree
**Status:** **fixed** — server: `passwordSchema` (length + char classes) on reset-password +
all 3 profile routes. Client: `ResetPasswordForm` now runs the same `checkPasswordStrength`
(shared `lib/passwordRules.ts`); `LoginForm`'s stale `< 6` check raised to `< 8`.
**Where:** `app/api/auth/reset-password/route.ts` & `login/route.ts` (`z.string().min(8)`), `app/resetPassword/ResetPasswordForm.tsx` (`length < 8`), `app/login/LoginForm.tsx` (`password.length < 6`)
**Detail:** `aaaaaaaa` accepted on reset. No uppercase/digit/symbol requirement anywhere. Login form allows 6–7 char passwords client-side, then server 400s with a generic message.
**Fix:** one shared password-policy validator (length + character classes), used by reset-password, profile password change, and any admin-set password; align the login client check to ≥ 8 (or just drop the client length check and rely on the server message).

## F3 — Medium — Login email-enumeration timing side-channel
**Status:** **fixed** — `authenticateUser()` runs a scrypt `verifyPassword` against `dummyPasswordHash()` even when no user row is found; unknown vs known-bad-password timing now ~equal (~0.25 s). (See Pass A table.)
**Where:** `lib/auth.ts` `authenticateUser()` / `verifyPassword()`
**Detail:** unknown email ~40–70 ms; existing email + wrong password ~185–205 ms (scrypt runs only when a user row is found). `createPasswordResetToken()` has the same shape (DB writes + SMTP only for real users).
**Fix:** when no user is found, still run a scrypt `verifyPassword` against a fixed dummy hash so both paths cost roughly the same.

## F14 — Medium — Predictable onboarding credentials, emailed in cleartext, no forced rotation
**Status:** **fixed** — `generateTempPassword()` (random 14-char, all classes) replaces `Password123!` for resource + user onboarding; `form_data.mustChangePassword=true` forces a redirect to the profile editor at next login, cleared on password change. Emailed credential is still cleartext (inherent to email delivery) but no longer predictable. (See Pass A table.)
**Where:** `app/api/resources/route.ts` (`DEFAULT_ONBOARDING_PASSWORD = "Password123!"`), `app/api/users/route.ts` (`DEFAULT_ADMIN_PASSWORD`)
**Detail:** every registered resource/user gets `Password123!`; it's emailed in plaintext; nothing forces a change on first login.
**Fix:** generate a random temporary password per user (the code already has `randomBytes(18).toString("base64url")` for drafts — use it for registrations too) and set a "must change password" flag enforced at next login.

## F10 — Medium — Status / priority / assignment changes don't write an `activities` row
**Status:** **fixed** — PATCH now inserts an `activities` row for each changed field ("Changed status/priority/assignee"). Verified in DB. (See Pass A table.)
**Where:** `app/api/tickets/[id]/route.ts` PATCH — only "Added a comment" / "Renamed ticket" insert into `activities`
**Impact:** the activity timeline and "Ticket updated" notification feed miss status/priority/assignee history.
**Fix:** insert an `activities` row for each changed field (action + old→new + `status`).

## F4 — Low — No rate limiting / lockout on `/api/auth/login` or `/api/auth/forgot-password`
**Status:** **fixed** — in-memory fixed-window limiter (`lib/rateLimit.ts`): login 20/IP + 8/email per 15 min, forgot-password 10/IP + 4/email, reset-password 15/IP → `429` with `Retry-After`. Bucket reset on successful login. Verified. (See Pass A table.)
**Note:** in-memory buckets don't survive a restart or span multiple instances — fine for a single-node deploy; a shared store (Redis / DB table) would be needed at scale.

## F5 — Low — Login "Role" selector is dead UI  ·  FIXED (enforce)
**Was:** `app/login/LoginForm.tsx` sent `role`; `app/api/auth/login/route.ts` ignored it (Zod schema was `{email, password}`). Selecting "Client" + admin creds logged you in as admin.
**Fix (maintainer chose enforcement over removal):** `login/route.ts` now takes `role` (`Admin` | `Resource` | `Client` | `Client Team`), and after a successful credential check verifies the account belongs to that portal (`isAdminRole` / `isResourceRole` / `isClientRole`). Mismatch → **403** with "Change the Role selector and try again."; wrong password still → 401 first; omitting `role` keeps any-portal behaviour for non-form callers.
**Follow-up (open):** the form defaults the selector to "Admin", so a resource/client who doesn't change it now gets a 403 — consider defaulting to empty/"Select portal" or auto-detecting. Needs the F1 hydration fix before the form is testable.

## F6 — Low/Info — Seeded accounts self-heal on every login
**Status:** open (likely wontfix — intentional for demo)
**Where:** `lib/auth.ts` `syncPortalAccount()` called from `authenticateUser()` and `createPasswordResetToken()` for `SEEDED_PORTAL_ACCOUNTS`
**Detail:** password/name/role/lifecycle/form_data for the 3 seeded emails are hard-reset to seed values on every login/forgot attempt; scrypt hash recomputed each time. Password changes for those accounts don't persist.
**Fix (if wanted):** only seed when the row is missing; don't overwrite an existing row's password.

## F8 — Low — `Delete Custom Roles` permission has no implementation
**Status:** **fixed** — `DELETE /api/roles/[id]` (gates `Delete Custom Roles`): CUSTOM unused → 200, SYSTEM → 403, still held by users → 409. `RolesTable` gained a trash control + confirm modal on CUSTOM rows (`allowDelete` prop). Browser-verified. (See Pass A table.)
**Where:** `lib/rolePermissions.ts` defines it; `app/api/roles/route.ts` has no DELETE; no `/api/roles/[id]` route; `components/features/RolesTable.tsx` has no delete control.
**Fix:** add `DELETE /api/roles/[id]` (gate `Delete Custom Roles`, block SYSTEM roles, reassign/deny if users hold the role) + a delete affordance in `RolesTable`; or remove the permission string.

## F9 — Low — `POST /api/tickets` ignores requested initial status
**Status:** **fixed** — open-create now honors a valid `ticket.status` (`TICKET_STATUSES` allow-list); anything invalid falls back to "Open". Verified. (See Pass A table.)
**Where:** `app/api/tickets/route.ts` — `const status = lifecycle === "OPEN" ? "Open" : ticket.status`
**Fix:** honor a valid `ticket.status` on open create, or document that initial status is always "Open".

## F11 — Info — Resource dashboard "Assigned Projects" stat mislabels when scope = ALL
**Status:** open
**Where:** `lib/resourcePortal.ts` `getResourceDashboardStats` → `listResourceProjects` (returns all projects when View Projects is not ASSIGNED_ONLY)
**Fix:** label it "Projects" when scope is ALL, or always count `project_resources` assignments.

## F15 — Info — `formData.emailNotifications` opt-out is not honored
**Status:** partly fixed — the new F13 ticket emails respect it; the pre-existing `sendMail` sites (onboarding etc.) still don't (by design — those are security emails).
**Where:** `app/api/tickets/[id]/route.ts` now checks it; onboarding/reset intentionally unconditional.

## F18 — Medium — Profile photo storage is split-brain; self-service photos don't display
**Status:** fixed (Pass B) — the resource- and client-portal profile routes now write the
`users.avatar` column in addition to `form_data.avatarUrl`. Verified: a photo set via
`/api/resource-portal/profile` appears in `GET /api/resources` (admin list). The read sites
were left as-is (they already read the column). Admin's own `/api/profile` still has no
avatar field — separate follow-up.
**Where:** self-service profile routes write `form_data.avatarUrl`
(`app/api/resource-portal/profile/route.ts:73`, `app/api/client-portal/profile/route.ts:46`);
admin entity forms write the `users.avatar` **column**; ~8 read sites in `lib/db.ts`
(`listResourceRows`, `findResource`, `listAdminUserRows`, ticket-comment avatars, project-team
avatars) read **only `users.avatar`**.
**Repro:** as a resource, PATCH `/api/resource-portal/profile` with `avatar:"data:image/png;base64,…"` → 200,
but `users.avatar` stays NULL. The photo then shows on the resource's own profile page
(reads `form_data.avatarUrl` first) but **not** in the admin Resources table, Resource detail,
Users table, ticket comments, or project team lists.
**Fix:** pick one storage location. Simplest: the self-service routes also write the
`users.avatar` column (and/or the read sites `COALESCE(form_data.avatarUrl, avatar)`).
The admin `/api/profile` route has no `avatar` field at all — admins can't set their own photo.

## F19 — Low — Mixed date-format locales
**Status:** **fixed** (Pass C)
**Detail:** `Intl.DateTimeFormat` / `toLocaleString` was called with `en-GB` in 18 places,
`en-US` in 6, `en` once → inconsistent `DD/MM/YYYY` vs `MM/DD/YYYY` across screens.
**Fix applied:** standardised on **`en-GB`** (the majority). `lib/utils.ts` `formatDate` now
`new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })`;
the `en-US`/`en` call sites in `ClientProjectList`, `ClientDraftsTable`, `ClientsTable`,
`ResourceDashboardView`, `ProjectDetailsView` (date parts only — kept the `en-US`
`toLocaleTimeString` for the clock), `ProjectsDraftsTable`, `TicketForm` were flipped to
`en-GB`. `tsc` clean; eslint = baseline (only the pre-existing `ProjectDetailsView.tsx:487`).
A shared `lib/formatDate.ts` for full call-site consolidation is noted as a follow-up but not
built (would leave dead code without a broader refactor).

## F20 — Medium — Dropdown implementations are fragmented
**Status:** **mostly fixed** (Pass C) — the real duplication is gone; the rest isn't duplication
**Detail:** `SearchDropdown` was copy-pasted in 5 files. On close reading only **3 are the
same component** — `TicketForm`, `resource-portal/ResourceTicketForm`, `client-portal/ClientTicketForm`
(ResourceTicketForm's + ClientTicketForm's were byte-identical; TicketForm's added
`newLabel`/`newHref`/`onAction` and a slightly different panel style). `NewProjectForm`'s and
`NewResourceForm`'s are **genuinely different components** that happen to share the name — own
prop shapes (`onChange(value)` vs `onChange(label,url,id)`, `option.value` vs `option.label`),
own design languages (`new-project-input` / hex palette / `role="listbox"` a11y;
`NewResourceForm` uses an off-limits `globals.css` class). Forcing those into one primitive
would mean a `variant` switch uglier than the duplication, or homogenising 2 forms' look
(CLAUDE.md design-fidelity violation).
**Fix applied:**
- `NewProjectForm` "New X" action border `#06B6D4` (cyan) → `#0284C7` (brand blue), matching
  `TicketForm`.
- New **`components/ui/Combobox.tsx`** (+ exported `TagChip`) — superset of the 3 ticket-form
  dropdowns: `validationState`, `newLabel`/`newHref`/`onAction`, `emptyMessage`. Replaced all
  3 local `SearchDropdown` + `TagChip` definitions (~350 lines removed). `ClientTicketForm` /
  `ResourceTicketForm` are **byte-for-byte the same render**; `TicketForm`'s dropdown **panel
  is now visually identical to the other two portals** (was `rounded-xl` + custom shadow +
  roomier rows → now the shared `rounded-lg` / `shadow-xl` / tighter rows, and gains a "No
  matches found." empty state). One admin form's dropdown panel changed cosmetically —
  **maintainer should eyeball `/tickets/new`**; F1 blocks automated verification.
**Deferred (not duplication):** the 6+ table `*FilterDropdown` functions and the no-search
`EmailSelect` / `PermissionGroupDropdown` / `ContactMethodDropdown`. Different jobs, different
shapes — a `components/ui/Select` for the short-list ones is still worth doing but it's new
work, not dedup.

## F21 — Medium — Validation UX is inconsistent / mostly absent
**Status:** **fixed** (Pass C) — every form that takes a user password now validates against
the shared rule set + shows a live checklist. Optional `<PasswordField>` extraction is the
only leftover (dedup, not a defect).
**Detail:** `components/ui/Input.tsx` (info-icon + green/red field, matches the checklist
exactly) was dead code (0 imports) — now **deleted** (F16). Auth forms showed errors as plain
text with no per-field border/icon/success state. Partial `profile-input-valid`/`-invalid`
styling existed in a few forms (password fields). No tooltips. Client checks didn't mirror
the server Zod rules.
**Fix applied:**
- New `lib/passwordRules.ts` — the pure strength checks (`checkPasswordStrength`,
  `PASSWORD_RULES`, length consts) with **no Node imports**, so Client Components can import
  it. `lib/passwordPolicy.ts` now re-exports these + keeps the server-only bits
  (`generateTempPassword`, `passwordSchema`). Client and server now share one rule set.
- `app/resetPassword/ResetPasswordForm.tsx` rewritten: live 5-rule checklist (green as each
  passes), red/green field border keyed off `checkPasswordStrength`, red info badge on the
  label when invalid, show/hide toggle, "Passwords match" confirm indicator, submit disabled
  until valid. Uses conditional Tailwind via `cn()` — `globals.css` untouched.
- `app/login/LoginForm.tsx` + `app/forgotPassword/ForgotPasswordForm.tsx`: inputs go
  red (`!border-red-500`) + `aria-invalid` while their error is shown. Login's client-side
  min-length check was `< 6` (disagreed with server `min(8)`) — now `< 8` (closes the
  client/server mismatch half of F2).
**Profile forms (round 2):**
- `EditProfileForm`, `ClientProfileForm` — the client check was `newPassword.length < 8`
  only, so `aaaaaaaa` passed the client but the server (`passwordSchema`) 400'd on the
  missing character classes. Now `firstPasswordError(newPassword)` from the shared module +
  a live 5-rule checklist under the field (scoped `<style>` block, `globals.css` untouched).
- `ResourceProfileForm` — already had a rule-checklist UI, but its 3 rules were
  `minLength`/`nonSpace`/`maxLength` (same drift). Rewired to `PASSWORD_RULES` /
  `checkPasswordStrength`; the existing `PasswordRule` component + `.resource-edit-password-rules`
  styles reused unchanged.
**Entity forms — no work needed:** `NewAdminForm`, `NewResourceForm`, `RoleForm`, `TicketForm`,
`AdminUsers`, `ResourcesTable` have **zero password inputs** — F14 removed all manual
password entry (onboarding auto-generates + emails a temp password; `NewClientTeamMemberForm`
just sends a setup invite). So the only user-password fields in the whole app are the 3 auth
forms + 3 profile forms, all now covered.
**Verified:** `tsc --noEmit` clean, `eslint` on all touched files clean, `next build` exit 0.
Browser walkthrough still partly blocked by the F1 harness artifact (auth `ResetPasswordForm`
*was* browser-verified before the F1 recurrence; login + profile forms are code-verified only).
**Round 3 — shared component extracted:** `components/ui/PasswordChecklist.tsx` (fed by
`PASSWORD_RULES`, takes `password` + optional `extraRules`) now renders the live checklist in
all 4 forms (`ResetPasswordForm`, `EditProfileForm`, `ClientProfileForm`, `ResourceProfileForm`).
The three hand-rolled variants (inline `<ul>` ×2 + `ResourceProfileForm`'s `PasswordRule`
component + 2 scoped `<style>` blocks + 3 copies of the `passwordRuleState` memo) are gone.
`tsc` + `eslint` clean, `next build` exit 0.

## F22 — High — Client & scoped-resource accounts can read every tenant's tickets/projects via the admin API
**Status:** **fixed** (Pass C)
**Where:** `proxy.ts` per-method permission maps (`ticketApiPermission` / `projectApiPermission`
map `GET /api/tickets` and `GET /api/projects` to `"View Tickets"` / `"View Projects"`), and
the handlers `app/api/tickets/route.ts` / `app/api/projects/route.ts` GET (unscoped
`listTickets` / `listProjects`).
**Repro:** log in as the seeded client (`testclient@gmail.com` / role "Client User", which
carries `View Tickets` + `View Projects`). `GET /api/tickets?state=OPEN` → **200, all 11
tickets system-wide**, each object including `formData.notes` ("private notes for the delivery
team") and full comment/activity history. `GET /api/projects` → **200, 6 projects across 5
different client companies** (TEST CLIENT, Aristadou Group, LocumSmart UK, Property Portal, …).
`/api/clients`, `/api/users`, `/api/resources` already 403'd (the client role lacks those
permissions) — only the two endpoints whose permission name the client legitimately holds
leaked.
**Root cause:** the proxy per-method maps grant access on the permission *name* alone. The
"Client User" system role holds `View Tickets` / `View Projects` because clients view their
*own* tickets/projects in the client portal — but nothing distinguished "view mine" from
"view everything", and neither the proxy nor the GET handlers applied client-tenant or
resource `ASSIGNED_ONLY` scoping. This is F7's read-side twin; Pass A/P2 missed it.
**Fix:**
1. `proxy.ts` — after the portal-route blocks, any `isClientRole` session hitting a
   non-client-portal path is now 403 (API) / redirected to `/client-portal/dashboard` (page).
   Client-portal accounts have a full `/api/client-portal/*` surface and no business on any
   admin route. **Resource-portal roles are deliberately *not* blocked** — the resource portal
   reuses the admin API by design (CLAUDE.md decision 1).
2. `GET /api/tickets` + `GET /api/projects` — a non-admin caller whose relevant scope is
   `ASSIGNED_ONLY` now gets 403 ("Use the portal … list for scoped access"). No first-party
   UI calls these routes (the admin and resource list pages use server-side fetchers —
   `listTickets` / `listResourceTickets` — directly), so this 403 breaks nothing.
**Verified:** client → both endpoints now 403; admin → still 200; `tsc` + `eslint` clean,
`next build` exit 0.
**Not covered (follow-up):** `/api/tickets/[id]`, `/api/projects/[id]` and other per-id admin
GETs weren't re-tested against a scoped resource in this pass — the detail routes *do* run
`getResourceTicketAccess` etc. in `lib/resourcePortal.ts` for portal callers, but the admin
`[id]` handlers should be spot-checked. Also `/api/notifications` appears not to be
auth-gated by `proxy.ts` at all (not in `adminApiPrefixes`, falls through `!needsSession`).

## F11 — Info — file-upload size limits (corrected)
**Status:** re-scoped. Project & ticket attachment routes **do** enforce `MAX_SIZE = 10 MB`
per file and `MAX_FILES = 10` per request
(`app/api/projects/[id]/attachments/route.ts`, `app/api/tickets/[id]/attachments/route.ts`).
Profile photos / entity avatars are `data:` URL strings capped only by the Zod
`.max(2000)` on the field (resource/client profile) or not at all (admin entity forms) —
a large image will hit MySQL `max_allowed_packet` and 500. Still worth a friendly limit +
error there.
(Attachment upload also verified end-to-end: POST → 201, blob stored, GET returns bytes,
DELETE 204. Note: `curl -F` multipart fails from Git-Bash on Windows with HTTP 000 — a
client quirk, not a server bug; Node `FormData` works fine.)

## F26 — High — Profile pictures were silently truncated; some forms used a URL text box
**Status:** **fixed** (feature rebuilt)
**Was:**
- `users.avatar` is `varchar(255)`. Every form that "uploaded" a photo (admin `NewAdminForm`
  / `NewResourceForm`, and the F18 profile-route writes) stored the **full `data:` URL** into
  that column → **truncated to 255 chars → a broken image everywhere it rendered**. The
  `avatarSchema.max(3_000_000)` cap (F11) was meaningless against a 255-char column.
- `ResourceProfileForm` had a **"Profile Image URL" `type="url"` text box**; the client
  profile form had no photo control at all; the admin's own `/profile/edit` had no avatar
  field.
**Fix (mirrors the attachment pattern):**
- New `user_avatars` table (`LONGBLOB`, one row per user, `ON DELETE CASCADE`) — migration in
  `database/migrate.mjs`, which also `NULL`s the pre-existing truncated `data:` values.
- `users.avatar` now only ever holds a URL string: `"/api/avatars/{id}?v={ts}"` for an
  upload (fits varchar(255)), or a legacy `https://…`. **Every one of the ~11 read sites
  already selects `users.avatar` and renders it into an `<img>`, so uploads now appear
  everywhere with no read-side changes.**
- `GET /api/avatars/[userId]` streams the bytes (any signed-in user; the `<img>` request
  carries the cookie), `DELETE` clears it (own photo, or admin).
- `lib/avatars.ts` `persistUserAvatar(userId, value)` — decodes a `data:` URL, validates
  type (PNG/JPG/WebP/GIF) + size (≤ 2 MB), upserts `user_avatars`, returns the serving URL;
  passes an existing `/api/avatars/…` or `https://…` through untouched; `""` removes.
  Wired into all 7 write paths: `/api/profile`, `/api/resource-portal/profile`,
  `/api/client-portal/profile`, `/api/users` (POST + `[id]` PATCH), `/api/resources`
  (create + edit), `/api/client-portal/team` (POST + `[id]` PATCH). Bad type/size → 400.
- New `components/ui/AvatarUpload.tsx` — circular preview + a real **file dialog** (accept
  filtered to images), 2 MB client pre-check, "Change photo" / "Remove". Now used by
  `EditProfileForm` (admin — new section), `ClientProfileForm` (new section),
  `ResourceProfileForm` (replaced the URL box). `NewAdminForm` / `NewResourceForm` /
  `NewClientTeamMemberForm` already had file pickers — their data URLs now land in
  `user_avatars` instead of being truncated.
**Follow-up 1 — coalesce bug:** `getResourceProfile` / `getClientProfile` returned
`String(data.avatarUrl ?? row.avatar ?? "")`. `??` only falls through on null/undefined, so
an **empty-string** `form_data.avatarUrl` (which many records carry) shadowed a real
`users.avatar` column value — a photo set through the admin resource/user form (column only)
did **not** show on the resource's own profile page. Fixed to `row.avatar || data.avatarUrl || ""`
— the column is canonical now, `form_data.avatarUrl` is a legacy fallback. (Same fix in the
client-team member mapper.)
**Follow-up 2 — the `Avatar` component was initials-only:** `components/ui/Avatar.tsx` took
`name` + `className` and never rendered a photo. Most call sites wrapped it in a local
`ResourceAvatar` / `UserAvatar` / `TeamAvatar` helper that checked `src` first (so the
resource list + detail + admin-users tab *did* show photos), but `ClientDetailsView` (admin
client detail — team-member cards + the project-team stack) and `ProjectDetailsView`'s team
`RecordsPanel` called `<Avatar>` **directly with no `src`**, so those showed initials only.
`Avatar` now takes an optional `src` and renders `<img class="object-cover">` when set;
`ClientDetailsView` + `ProjectDetailsView` (added `imageSrc` to `RecordItem`, thread
`member.avatar`) now pass it. `GET /api/avatars/[userId]` also marked `dynamic = "force-dynamic"`.
**Verified end-to-end:** upload via resource / client / admin-own profile, admin-creates-resource,
admin-edits-user, client-team-create → all store bytes + set the pointer; `GET /api/avatars/{id}`
returns the PNG (200, `image/png`, cache header); no-auth → 401; missing → 404; DELETE → 204
+ column nulled; bad MIME → 400; 2.5 MB → 400. The uploaded photo's URL appears in the
rendered HTML of the **resource's own profile page**, the **admin resources list**, and the
**admin resource detail page** — even when the photo was set through the admin form. `tsc` +
`eslint` clean, `next build` exit 0. DB test data cleaned; schema dump regenerated (17 tables).

## F25 — High — Resource-portal ticket updates & comments 500 (broken SQL — missing JOIN)
**Status:** **fixed** (Pass C — found via the post-F22 API matrix)
**Where:** `lib/resourcePortal.ts` `getResourceTicketAccess()` — its `SELECT` used
`${projectFormData} AS project_form_data` (which resolves to `p.form_data`) but the `FROM
tickets t` clause had **no `LEFT JOIN projects p`**. Every sibling query in the file has that
join; this one was missing it.
**Impact:** `getResourceTicketAccess` is called by `PATCH /api/resource-portal/tickets/[id]`
(status / priority / edit / self-assign / rename) and `POST /api/ticket-comments/resource/[ticketId]`
— **all of them threw `ER_BAD_FIELD_ERROR: Unknown column 'p.form_data'` → 500** for any
resource, on any ticket. The resource portal's ticket-detail interactivity was entirely
non-functional.
**Why it wasn't caught earlier:** F1 blocked the Layer-3 resource ticket-detail walkthrough,
and no Pass A/B curl test hit `/api/ticket-comments/resource/*` or the resource ticket PATCH
with a real ticket id (the write-matrix probes used fake ids that 404'd before the query ran).
**Fix:** added `LEFT JOIN projects p ON p.id = t.project_id`. Verified: resource comment POST
→ 200 (was 500); resource ticket PATCH → clean 403 (portal's "creator/assignee only" rule)
instead of a crash. `tsc` + `next build` clean.

## F24 — Low — Unauthenticated comment POST returns 500 instead of 401
**Status:** **fixed** (Pass C)
**Where:** `app/api/ticket-comments/[portal]/[ticketId]/route.ts` POST
**Repro:** `POST /api/ticket-comments/admin/{ticketId}` with a valid body and **no session** →
`500 {"error":"Unable to save comment."}`. Expected `401`.
**Cause:** the handler used the *page*-session helpers (`requireAdminPageSession` etc.), which
call `redirect("/login")` on failure. Inside a route handler wrapped in
`try { … } catch { return 500 }`, that `NEXT_REDIRECT` throw was swallowed into a generic
500. Also parsed the body and opened a DB transaction *before* auth. Not a security hole —
nothing is written — but wrong semantics and a bit of wasted work on unauthenticated hits.
(An authenticated client hitting `portal=admin` here got the same 500; the proxy F22 fix now
403s that case first, but the route is also fixed directly.)
**Fix:** auth first, using `getSessionUser()` + `isAdminRole`/`isClientRole`/`isResourceRole`
→ explicit `401` (no session) / `403` (wrong portal for the role), before body parse or any DB
work. Sibling route `/api/ticket-list/[portal]` already did this correctly (checked — no
change needed there).

## F23 — Info — `comments.visibility` (PUBLIC/INTERNAL) feature was dead code
**Status:** **fixed** (dead code deleted, per maintainer)
**Was:** the `comments` table has no `visibility` column and nothing ever wrote `INTERNAL` or
exposed a way to mark a comment internal, yet four call sites carried
`hasDatabaseColumn("comments", "visibility") ? <visibility SQL> : <plain SQL>` branches — a
half-built feature. Not a leak (the admin "Internal Notes" ticket field is `form_data.notes`,
which `mapTicket`'s field allow-list never forwards to the portals).
**Removed:** the visibility branch + `INSERT … visibility 'PUBLIC'` variant in
`app/api/ticket-comments/[portal]/[ticketId]`, `app/api/client-portal/tickets/[id]`,
`app/api/resource-portal/tickets/[id]`; the `AND c.visibility = 'PUBLIC'` fragment in
`lib/clientPortal.ts` `publicComments`; and the now-orphaned `hasDatabaseColumn` helper in
`lib/clientPortal.ts` and the local one in the `[portal]` comment route (the `lib/resourcePortal.ts`
copy stays — it's still used for the `projects.form_data` check). All comment INSERTs are now
the plain 3-column form. If the feature is ever wanted, build it properly: a real migration,
an internal-comment toggle in the admin/resource UI, and `publicComments` filtering on read.

## F16 — Low — Dead dependencies & dead component
**Status:** **fixed** — `bcryptjs`, `jsonwebtoken`, `multer`, `dotenv` removed from `package.json`
(`migrate.mjs` uses `@next/env`, not `dotenv` — confirmed still runs). `components/ui/Input.tsx`
deleted (0 imports, and its `border-error-default` / `brand-blue` utility vocabulary didn't
match the app's hex-value convention anyway) — the F21 validation work built its own pattern
on `lib/passwordRules.ts` + scoped styles instead.

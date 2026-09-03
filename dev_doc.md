# Ticket System Developer Documentation

This repository is a Next.js 16 App Router application built with React 19, TypeScript, and Tailwind CSS 4. It implements a multi-portal ticketing system with shared backend logic, role-based permissions, and a MySQL database.

This document explains how to clone the project, install dependencies, configure environment variables, prepare the database, run migrations, start the app locally, and verify the system.

## 1. What This System Is

The application is split into several logical areas:

- `app/admin/*` - the admin portal
- `app/resource-portal/*` - the resource portal
- `app/client-portal/*` - the client portal
- `app/api/*` - the backend routes used by all portals
- `components/*` - shared UI and feature components
- `lib/*` - database, auth, permissions, and helper logic
- `database/*` - SQL schema and migration scripts

The codebase uses the Next.js App Router, so page structure, layouts, and server actions follow the `app/` directory conventions rather than the older Pages Router.

## 2. Prerequisites

Install the following before working on the project:

- Node.js LTS compatible with Next.js 16
- npm
- MySQL 8 or later
- A local SMTP sink for development email, such as MailHog

Recommended local tools:

- Git
- A MySQL client such as `mysql`, MySQL Workbench, TablePlus, or DBeaver
- A code editor with TypeScript and ESLint support

## 3. Clone the Repository

```bash
git clone https://github.com/Yusra-Zainab/ticket-system.git
cd ticket-system
```

If you are already inside a workspace, just move into the repo root and continue from there.

## 4. Install Dependencies

```bash
npm install
```

The repository is configured around the standard npm workflow. There is no need to install a separate ORM toolchain.

## 5. Environment Setup

The project expects a local `.env.local` file for development. Start by copying the example environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 5.1 Environment File

Use the keys defined in `.env.example`. The exact variable names should be copied from that file and kept unchanged.

A typical local setup will include:

```env
# Database
DATABASE_URL="mysql://root:password@127.0.0.1:3306/ticket_system"

# SMTP / MailHog
SMTP_HOST="127.0.0.1"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="no-reply@example.com"

# Application URL
APP_URL="http://localhost:3000"
```

If your `.env.example` contains additional keys, keep them exactly as they appear there. Do not rename or remove variables unless you are also updating the code that reads them.

### 5.2 Common Environment Rules

- Use a dedicated MySQL database for local development.
- Point SMTP to MailHog or another local sink so no real email is sent during development.
- Keep secrets out of source control.
- Put machine-specific values in `.env.local`, not in committed files.

## 6. Database Setup

The application uses MySQL and a hand-written SQL schema. There is no Prisma or Drizzle migration layer.

### 6.1 Create the Database

Create a fresh MySQL database before loading the schema.

Example:

```sql
CREATE DATABASE ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6.2 Bootstrap the Schema

The repository includes a full bootstrap schema in:

- `database/schema.full.sql`

This is the recommended file for a brand-new database. Load it into MySQL before starting the app.

Example:

```bash
mysql -u root -p ticket_system < database/schema.full.sql
```

If you need a lighter schema reference, the repo also includes:

- `database/schema.sql`

In practice, `schema.full.sql` is the file to use for a new environment because it represents the full bootstrap state.

### 6.3 Run Migrations

After bootstrapping the schema, run the migration script:

```bash
node database/migrate.mjs
```

This script applies schema updates that are not already present in the base SQL file. Run it:

- after importing a new database
- after pulling schema changes
- whenever the repository changes database structure

If the database is already up to date, the migration script should finish without destructive changes.

### 6.4 Verify the Database Connection

The app exposes a health endpoint:

```http
GET /api/health
```

When the database is connected, it returns a response similar to:

```json
{"ok":true,"database":"connected"}
```

This is the fastest way to confirm that the schema, credentials, and MySQL server are all working together.

## 7. Mail Setup

Development email is intended to be captured locally rather than delivered to real users.

### 7.1 MailHog

MailHog is the expected local SMTP sink.

Typical local defaults:

- SMTP server: `127.0.0.1`
- SMTP port: `1025`
- MailHog web UI: `http://localhost:8025`

If MailHog is running, the app can send onboarding and notification emails without touching external services.

### 7.2 Why Mail Matters Here

The system sends email for user onboarding and account access flows. If SMTP is misconfigured, you may still be able to log into the app, but onboarding emails will fail.

## 8. Run the App Locally

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The app uses Next.js App Router routes, so page loading and server component behavior follow the standard Next.js 16 runtime model.

## 9. Build and Production Start

Create a production build:

```bash
npm run build
```

Run the built app:

```bash
npm run start
```

Use `npm run build` before deployment to catch TypeScript, route, and bundle problems early.

## 10. Linting

Run ESLint with the repo’s configured command:

```bash
npm run lint
```

Because the project uses strict TypeScript and a large shared component surface, linting is useful after database, auth, or route changes as well as UI work.

## 11. First-Run Accounts

The repository README documents seeded credentials that are created or expected on first use:

- Admin: `yzainab@datapulsetechnologies.org` / `Password123!`
- Resource: `kingdomwise11@gmail.com` / `Password123!`
- Client: `testclient@gmail.com` / `Password123!`

These are useful for verifying login, role-based routing, and portal access during development.

If login fails on a freshly loaded database, confirm:

- the schema was loaded correctly
- migrations were run
- the user row exists
- the role column and permissions data are populated
- the password hash matches the expected seeded account

## 12. Data and Auth Model

The application relies on a custom database and permission model rather than a third-party auth framework.

High-level model:

- Users live in MySQL.
- Roles define portal access and permissions.
- Permission checks happen in both page routes and API routes.
- Admin, resource, and client portals reuse many of the same backend routes.

### 12.1 Permission Enforcement

The codebase uses permission checks in several layers:

- server-side page guards
- API route guards
- portal navigation filtering
- feature-level button and action gating

This means access control is not purely visual. If a user manually types a URL, the server still validates access.

### 12.2 Shared API Surface

Most portal actions use the same API routes rather than separate portal-specific endpoints. This keeps the business logic centralized and makes the admin and resource portals behave consistently.

## 13. Project Structure Reference

The most important parts of the repo are:

- `app/` - route handlers, layouts, and pages
- `components/features/` - major feature-level UI
- `components/ui/` - shared UI primitives
- `lib/db.ts` - database access helpers
- `lib/auth.ts` - session and access helpers
- `lib/rolePermissions.ts` - permission definitions and role helpers
- `database/schema.full.sql` - full MySQL bootstrap schema
- `database/migrate.mjs` - schema migration runner

## 14. Working With the Database

When you change tables or relationships:

1. Update the SQL schema in `database/`.
2. Update the migration script if needed.
3. Update the relevant helpers in `lib/db.ts`.
4. Update the permission or auth helpers if the change affects access control.
5. Re-run migrations against a clean database and a realistic existing database.

### 14.1 Safe Development Workflow

Recommended order for local validation:

1. Load a fresh MySQL database from `database/schema.full.sql`
2. Run `node database/migrate.mjs`
3. Start MailHog
4. Start `npm run dev`
5. Log in with a seeded account
6. Verify `/api/health`
7. Exercise the admin, resource, and client portals

## 15. Troubleshooting

### 15.1 Login Fails

Check:

- MySQL is running
- `DATABASE_URL` is correct
- the schema has been imported
- migrations have been applied
- the account exists and has the right role

### 15.2 Pages Load but Show No Data

Check:

- the logged-in role has the correct permissions
- the database rows exist for the entity you expect
- the portal is filtering by the right assignment scope

### 15.3 Emails Are Not Appearing

Check:

- SMTP is pointed at MailHog or another reachable SMTP server
- the configured host and port are correct
- the MailHog UI is open at `http://localhost:8025`

### 15.4 API Returns 403

Check:

- the user has the required permission
- the role is mapped correctly
- the session is valid
- the route is not guarded by a stricter permission than expected

### 15.5 API Returns 500

Check:

- the request body is valid
- the related row exists
- the database schema matches the running code
- migrations have been applied

## 16. Notes for Contributors

- Keep new code aligned with the existing portal structure.
- Reuse shared components where possible instead of duplicating UI.
- Keep access control server-side as well as client-side.
- Avoid introducing a second database pattern or a second migration system.
- Do not commit `.env.local` or any secrets.

## 17. Minimal Quick Start

For fast local setup:

1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in MySQL + SMTP values.
4. Create the MySQL database.
5. Import `database/schema.full.sql`.
6. Run `node database/migrate.mjs`.
7. Start MailHog.
8. Run `npm run dev`.
9. Open `http://localhost:3000`.

## 18. Deployment
Use these commands whenever you want to deploy the latest version of the Ticket System to the VPS.

```bash
ssh root@203.161.56.220
```
Enter the password when prompted

```bash
cd /var/www/ticket-system

git checkout main
git pull origin main

npm install

node database/migrate.mjs

npm run build

pm2 restart ticket-system
pm2 save

pm2 status
```
Optional verification:

```bash
curl -I http://127.0.0.1:3002

curl -I https://stagesupport.datapulsetechnologies.org
```

### Deployment Notes
Deployment Notes
- Ticket System directory:
/var/www/ticket-system
- Git branch used for deployment:
main
- PM2 process name:
ticket-system
- Internal application port:
3002
- Public URL:
`https://stagesupport.datapulsetechnologies.org`
- Database migrations:
node database/migrate.mjs
-- Do not re-import the full SQL schema or database dump during normal deployments.
-- Run npm run build before restarting PM2.
-- Do not use port 3000 or 3001 for the Ticket System because other applications on the VPS already use those ports.
-- Nginx proxies `stagesupport.datapulsetechnologies.org` to `127.0.0.1:3002`.

## 19. Summary

This project is a MySQL-backed, permission-driven Next.js 16 application with multiple portals and shared backend routes. A clean developer setup requires:

- correct environment variables
- a loaded MySQL schema
- migrations applied
- SMTP configured for development
- seeded or created accounts with the right role data

Once those pieces are in place, the admin, resource, and client portals can be exercised locally in the same way the production app does.


(For live DB connection, run `ssh -L 3307:127.0.0.1:3306 root@203.161.56.220` or `ssh -N -L 3307:127.0.0.1:3306 root@203.161.56.220` - for not opening the VPS tunnel)
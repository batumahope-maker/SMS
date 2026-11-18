# Admin Account Management — Restricted Write Design (PROPOSAL — awaiting approval)

Status: **PROPOSED, NOT IMPLEMENTED.** Nothing in this document has been applied
to any database, and no code path writes to the live database today. The
application account (`essjt_readonly`) remains strictly SELECT-only.

## Problem

The Account Management page (`/admin/users`) can read and display accounts, but
creating student/teacher accounts, issuing temporary passwords, resetting
forgotten passwords, and activating/deactivating accounts all require writes.
The current connection must stay read-only, so those buttons are disabled and
labelled "pending write authorization". They are never faked.

## Current live schema facts (from the read-only audit)

- `users` (1,311 rows): `id`, `username` (unique), `password` (varchar 255,
  mixed bcrypt / MD5-legacy), `full_name`, `email` (unique), `phone`,
  `role` enum('student','teacher','admin'), `status`
  enum('Active','Inactive','Suspended','Graduated') DEFAULT 'Active',
  `created_at`.
- `students.user_id`, `teachers.user_id`, `admins.user_id` are UNIQUE, nullable
  one-to-one links into `users`.
- `users` has **no** `must_change_password` column today.
- `login_activity` is a denormalised audit table (no FKs) written by the app at
  login time.
- The role enum contains only admin/teacher/student — there is no separate
  "self-registered" role; self-registration as admin is impossible by
  construction (no registration endpoint grants role=admin; only admins can
  create accounts in the proposed design).

## Existing tables: sufficient?

Yes, with one addition. The existing `users` + `students` + `teachers` tables
already support every requested feature; account creation is two-row workflow
(`users` + optional profile row) inside one transaction. The only gap is
"require change of temporary password on first login", which needs one new
column.

## Proposed write path

### 1. Dedicated MySQL account (least privilege)

A new account, e.g. `essjt_writer@localhost`, distinct from the read-only app
account:

```sql
CREATE USER 'essjt_writer'@'localhost' IDENTIFIED BY '<generated in env only>';
GRANT SELECT, INSERT ON essjt_school_system.* TO 'essjt_writer'@'localhost';
GRANT UPDATE (password, status) ON essjt_school_system.users TO 'essjt_writer'@'localhost';
-- deliberately NOT granted: DELETE, DROP, ALTER, TRUNCATE, GRANT OPTION,
-- UPDATE on any other column or table.
```

What it can do:
- INSERT new users, students, teachers (account creation).
- UPDATE **only** `users.password` and `users.status` (reset / activate / deactivate).

What it cannot do: delete anything, alter schema, touch any other column
(usernames, emails, roles, marks, fees, attendance...) — the column-scoped
GRANT makes privilege escalation through this account structurally impossible.

### 2. Second Prisma client (write-only, separate env var)

- `DATABASE_URL` keeps pointing at the SELECT-only account for all existing
  reads (unchanged).
- New `WRITER_DATABASE_URL` (in `.env.local`, never committed) points at
  `essjt_writer`.
- New module `src/lib/db-writer.ts` creating a **separate** Prisma client used
  only by the account-management API routes. Every write flows through one
  audited choke point; no page or component writes directly.

### 3. Admin-gated API routes

All under `/api/admin/accounts/*`, each requiring:
- a valid NextAuth session with `role === 'admin'` (server-side check, not
  hidden UI), and
- CSRF-safe POST semantics via NextAuth-protected fetches.

Routes (implemented only after approval):
- `POST /api/admin/accounts/students` — create student account (users row +
  students row in one transaction; username uniqueness pre-checked).
- `POST /api/admin/accounts/teachers` — create teacher account (users row +
  teachers row).
- `POST /api/admin/accounts/:id/reset-password` — set a new temporary password.
- `POST /api/admin/accounts/:id/status` — activate / deactivate.
- `GET /api/admin/accounts/:id` — status view (could stay on the read path).

Validation: server-side input validation (username format, email format, role
restricted to student/teacher — **admin creation is not offered through the API
in v1**), unique-constraint errors surfaced as friendly messages.

### 4. Temporary passwords, issued securely

- Generated server-side: 16+ characters, random via `crypto.randomBytes`/
  `randomInt` (unambiguous alphabet).
- Hashed with bcrypt (cost 12) **before** touching the database; plaintext is
  never stored.
- Displayed **once** to the admin in the response of the create/reset call with
  an explicit "copy now — shown only once" warning; never logged, never
  re-fetched, never emailed anywhere.

### 5. Force change on first login (requires ONE ALTER TABLE)

Requested feature needs a marker column:

```sql
ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;
```

- Set to 1 by account creation / temp-password reset (done by the writer
  account in the same transaction).
- Cleared to 0 by the credentials login flow after the user successfully sets a
  new password through a dedicated change-password screen they are redirected
  to.
- Default 0 keeps all 1,311 existing accounts unaffected (no behavioural
  change for current users).
- MySQL column-scoped GRANT would need `must_change_password` added to the
  UPDATE column list, or the clear happens via the read-only account? No — the
  clear is a write, so the column list becomes
  `UPDATE (password, status, must_change_password) ON users`. Still no DELETE,
  still no other columns.

Rollback: `ALTER TABLE users DROP COLUMN must_change_password;` — restores the
exact previous schema. The column is additive only.

### 6. What never happens

- No DELETE/DDL/TRUNCATE through the writer account (not granted).
- No self-registration: no public registration route writes admin; role is
  chosen server-side, never from client input.
- No passwords in logs, responses (after the one-time display), or source.
- No `prisma db push`/`migrate`/`reset` against the live database; the one
  ALTER TABLE above would be executed manually (phpMyAdmin / mysql CLI) with
  the user's privileged account, after explicit approval, after a backup.

## Testing plan (after approval)

1. `scripts/verify-db-readonly.mjs` still passes for the read account.
2. New guard script verifying the writer account's effective grants exactly
   match the allow-list (and refuses DELETE/DDL by test).
3. Unit/integration tests for password generation + hashing + one-time display.
4. Runtime smoke tests extended: create→login→forced-change→reset round-trip on
   a **staging copy** first, never on the live database.
5. All existing guards (`test:guards`, `test:smoke`, tsc, eslint, build) rerun.

## Approval checklist (nothing proceeds without these)

- [ ] User approves the `essjt_writer` account + grants.
- [ ] User approves the single `ALTER TABLE users ADD must_change_password`.
- [ ] User creates both in phpMyAdmin/mysql CLI themselves (or explicitly
      authorizes the exact SQL to be run).
- [ ] `.env.local` gains `WRITER_DATABASE_URL` (user-owned file; contents never
      read by the agent).
- [ ] Backup taken before any schema change.

Until every box is checked, the Account Management page stays read-only and the
action buttons stay disabled — correctly, and honestly.

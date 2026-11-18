# Registration, Approval and Password Workflow — Implementation Report

**Status:** implemented and tested. No live database change was made; nothing was
committed or pushed. The live `essjt_school_system` database remains untouched
(read-only verification only; user count unchanged at 1,311).

## 1. Files created

| File | Purpose |
|---|---|
| `src/lib/db-writer.ts` | Sole write choke point: dedicated least-privilege writer client (empty default database, `connection_limit=1`, one-time strict `SET SESSION sql_mode`, fully qualified `CALL`s, strictly escaped inline literals, positional `f0` result reads, typed error codes, lazy init — fails `WRITER_NOT_CONFIGURED` only when a write is attempted). Never logs SQL (it contains hashes). |
| `src/lib/registration.ts` | Server-side validation (username/email/phone/name/password/date/gender), honeypot check, in-memory per-IP rate limiter (env-configurable, default 10/hour). |
| `src/lib/registration-api.ts` | Shared POST handler for both registration endpoints: role fixed by the server-side route, honeypot swallowed with 200 + no write, 429 on rate limit, typed 409/422/503/500 mapping. |
| `src/lib/user-flags.ts` | Guarded reads of the two ADDITIVE columns (`must_change_password`, `registration_status`) with explicit column lists + graceful fallback (MySQL 1054) until the approved live ALTER is applied. |
| `src/app/(auth)/register/student/page.tsx`, `.../teacher/page.tsx` | Public registration pages (role fixed per route). |
| `src/app/(auth)/register/pending/page.tsx` | Pending-registration confirmation. |
| `src/components/auth/RegistrationForm.tsx` | Shared client form (student: trade/level/section/gender/DOB/guardian; teacher: subject/department/hire date; honeypot field; confirm password). |
| `src/app/api/register/student/route.ts`, `.../teacher/route.ts` | Public POST endpoints (server-determined role). |
| `src/app/api/admin/registrations/route.ts` | GET pending list + count (admin-only). |
| `src/app/api/admin/registrations/approve/route.ts` | Approve via `sp_approve_registration` (admin-only). |
| `src/app/api/admin/registrations/reject/route.ts` | Reject via `sp_reject_registration` (admin-only). |
| `src/app/api/admin/accounts/[id]/reset-password/route.ts` | One-time temporary password via `sp_set_account_password` (admin-only; password returned once, never logged). |
| `src/app/api/auth/change-password/route.ts` | Self-service change: session identity (never body), current password verified against the stored hash first, then `sp_change_own_password`. |
| `src/app/(auth)/change-password/page.tsx` + `src/components/auth/ChangePasswordForm.tsx` | Forced-change page (server session + client form; auto re-sign-in with the new password to refresh the JWT). |
| `src/components/admin/PendingRegistrationsCard.tsx` | Pending queue on `/admin/users`: count badge, approve/reject, status messages. |
| `src/components/admin/AccountActions.tsx` | Per-row "Reset password" for student/teacher rows with one-time display dialog. |
| `.env.example` | Documents `WRITER_DATABASE_URL` / `WRITER_DATABASE_NAME` and rate-limit knobs (placeholders only). |
| `scripts/tests/staging-writes.test.mjs` | Staging e2e suite (real NextAuth CSRF logins, full write flows, root-verified DB state, pre/post cleanup). |
| `scripts/staging/setup-staging-test-env.mjs` | Creates the staging-only read account + staging NEXTAUTH secret (credentials written to untracked `staging.env`, never printed). |
| `scripts/tests/staging-writes-results.json` | Machine-readable e2e evidence (no secrets). |

## 2. Files modified

| File | Change |
|---|---|
| `src/lib/auth.ts` | authorize adds `mustChangePassword` via the guarded column read (safe default `false` before the live ALTER); flag flows through jwt → session. |
| `src/middleware.ts` | `/change-password` added to the matcher; any session carrying `mustChangePassword` is redirected there before any other page; `/change-password` itself requires auth but never loops. |
| `src/types/next-auth.d.ts` | `mustChangePassword` on Session user / User / JWT. |
| `src/lib/password.ts` | `BCRYPT_HASH` regex exported (reused by db-writer). |
| `src/app/(auth)/login/page.tsx` | Student/teacher registration links. |
| `src/app/(admin)/admin/users/page.tsx` | Pending-registrations card, wired reset action, updated notice (Activate/Deactivate stay disabled — no approved procedure covers arbitrary status changes). |
| `scripts/tests/runtime-smoke.test.mjs` | Extended route matrix (registration pages public, `/change-password` gated, all write APIs deny non-admins and answer 503 without a writer config, forced-change session redirects, real read-only verify of change-password, admin change 403). |
| `package.json` | Added `test:staging-writes`. |

**Not modified:** `prisma/schema.live-mirror.prisma`, `.env.local`, any live
database object, the six stored procedures or their grants.

## 3. Test evidence (final runs, 2026-11-16)

| Suite | Result |
|---|---|
| `npm run typecheck` (tsc --noEmit) | PASS (exit 0) |
| `npm run lint` (eslint .) | PASS (exit 0) |
| `npm run build` (production + standalone) | PASS (exit 0) |
| `npm run test:guards` | PASS — 25/25 + 9/9 (read-only client guard intact; `$executeRaw*`/`$runCommandRaw` blocked, reads exposed) |
| `npm run test:smoke` | PASS — **95/95** (was 70; +25 new checks incl. registration pages public, 401s for every non-admin caller, 503s without writer config, forced-change redirects, real credentials rejection, logout flow) |
| `npm run test:staging-writes` | PASS — **42/42** against `essjt_school_system_staging` with real CSRF logins |

Staging e2e highlights (full evidence in `scripts/tests/staging-writes-results.json`):

- student + teacher registration → `ok/pending`, users row `Inactive` + `pending`
- honeypot → 200, **zero rows written**
- weak password → 422; duplicate username → 409; duplicate email → 409; no extra rows
- pending login denied (302 to error); approve → `Active`/`approved`; approve non-pending → 409
- approve/see-pending only for admins (teacher/student callers → 401 on all admin APIs)
- admin reset → one-time temp password; old password dead; temp login works;
  portal **forced to `/change-password`** (307); wrong current password → 400;
  successful change clears `must_change_password` (root-verified = 0); re-login normal
- teacher reject → stays `Inactive`/`rejected`; login denied
- admin login/logout flow preserved
- pre/post cleanup: staging left with exactly the 3 synthetic records (`users=3, students=1, teachers=1`, triggers=0)

## 4. Remaining limitations

1. **The app cannot write against live yet** — every write endpoint answers 503
   (`WRITER_NOT_CONFIGURED`) until the live writer account + procedures + ALTER
   are approved and applied. Reads and all existing portals work unchanged.
2. Rate limiting is in-memory (resets on restart, per server instance).
3. Activate/Deactivate buttons remain disabled by design (no approved procedure
   for arbitrary status changes).
4. Admin passwords are not changeable via `/change-password` (the procedure is
   restricted to student/teacher rows); the existing admin reset script covers
   admins.
5. The staging database intentionally holds only `users`/`students`/`teachers`
   (the audited DDL the write flows need); full portal page rendering is proven
   by the smoke suite against the live read-only schema, so the e2e accepts
   200-or-500 (never 307/401) for portal pages there.
6. New registrations keep `must_change_password=0` (self-chosen password); the
   flag is set only by admin resets.
7. Honeypot answers come after the writer-config check, so bots get the same
   503 as humans when writes are unavailable (nothing is written either way).

## 5. Exact live database changes still required (STOP — separate approval)

All statements below reference `essjt_school_system` only. **Nothing has been
run against live.** On approval I will generate the complete reviewed SQL file
(the staging-proven definitions, verbatim, with the live database name) and
stop again before execution.

> **UPDATE (2026-11-16, approved live/staging account separation):** the
> account names in this section are superseded. The live installation now
> creates dedicated accounts `essjt_live_definer@localhost` and
> `essjt_live_writer@localhost`; the staging accounts `essjt_definer` /
> `essjt_writer` are not reused and remain scoped to the staging database.
> The authoritative executable SQL is the three-file set under `docs/`
> (`ESSJT_LIVE_PREFLIGHT.sql`, `ESSJT_LIVE_INSTALLATION.sql`,
> `ESSJT_LIVE_VERIFICATION.sql`); the snippets below are retained as the
> historical record only.

1. Definer account + column grants (mirrors staging §6 of `STAGING_REPORT.md`):
   ```sql
   CREATE USER 'essjt_definer'@'localhost' IDENTIFIED BY '<generated>';
   GRANT USAGE ON *.* TO 'essjt_definer'@'localhost';
   GRANT SELECT (id, username, password, email, role, registration_status, must_change_password)
     ON essjt_school_system.users TO 'essjt_definer'@'localhost';
   GRANT INSERT (username, password, full_name, email, phone, role, status,
     registration_status, must_change_password)
     ON essjt_school_system.users TO 'essjt_definer'@'localhost';
   GRANT UPDATE (password, status, registration_status, must_change_password)
     ON essjt_school_system.users TO 'essjt_definer'@'localhost';
   GRANT INSERT (user_id, student_id, trade, level, section, gender,
     date_of_birth, guardian_name, guardian_phone, enrollment_date)
     ON essjt_school_system.students TO 'essjt_definer'@'localhost';
   GRANT INSERT (user_id, teacher_id, subject, department, hire_date)
     ON essjt_school_system.teachers TO 'essjt_definer'@'localhost';
   ```
2. The six procedures (definitions in `scripts/staging/procedures-final.txt`,
   §7 of the staging report — definer `essjt_definer`, strict captured
   sql_mode), created via mysql CLI in a strict-mode session.
3. Writer account + EXECUTE only (procedures must exist first):
   ```sql
   CREATE USER 'essjt_writer'@'localhost' IDENTIFIED BY '<generated>';
   GRANT USAGE ON *.* TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_register_student TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_register_teacher  TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_approve_registration TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_reject_registration  TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_set_account_password TO 'essjt_writer'@'localhost';
   GRANT EXECUTE ON PROCEDURE essjt_school_system.sp_change_own_password  TO 'essjt_writer'@'localhost';
   ```
4. Additive schema change:
   ```sql
   ALTER TABLE essjt_school_system.users
     ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;
   ALTER TABLE essjt_school_system.users
     ADD COLUMN registration_status ENUM('pending','approved','rejected') NULL DEFAULT NULL;
   ```
5. User-side config (not a DB change): add `WRITER_DATABASE_URL` (empty default
   database form, per `.env.example`) to `.env.local`.

## 6. How to test safely

```bash
# read-only suites (live DB, SELECT-only account, no writes anywhere)
npm run typecheck && npm run lint && npm run build
npm run test:guards
npm run test:smoke

# full write-flow e2e (STAGING ONLY — essjt_school_system_staging)
npm run test:staging-writes
```

The staging e2e self-guards: it refuses to run unless every configured URL
names the staging database, cleans `stg-e2e-%` rows before and after, and
prints no credentials. Manual UI testing on staging: run the built app with the
staging env keys (see `scripts/tests/staging-writes.test.mjs` `serverEnv`).

# ESSJT School Management System — Initial Technical Audit

**Audit date:** 5 November 2026  
**Source archive:** `essjt.zip.zip`  
**Status:** Initial audit and safe rebuild workspace prepared. Full application runtime/build tests are still pending.

## 1. Executive summary

The project should be rebuilt incrementally around one application stack, while retaining the existing records. The archive contains two generations of the application:

- A legacy PHP application (admin, student, and teacher portals).
- A newer Next.js 16 / React 19 / TypeScript application with Prisma.

They are not currently a single coherent application. They also have different database schemas and connection assumptions. This is a plausible source of login failures, inconsistent records, and maintenance problems. It does not prove that the number of PHP files itself causes slowness.

**Recommended direction:** use the Next.js application as the primary rebuild, keep the PHP version as a read-only reference during migration, and do not merge or overwrite any database until the authoritative data source is confirmed.

## 2. Archive inventory

| Item | Count |
|---|---:|
| Non-directory archive entries | 384 |
| PHP files | 113 |
| TSX files | 142 |
| TypeScript files | 41 |
| SQL files | 10 |
| SQLite database files | 3 |
| Prisma models in the current schema | 37 |

The PHP files pass `php -l` syntax validation: **113 checked, 0 syntax errors**. This only confirms PHP syntax; it does not prove that the pages work with the configured database or that permissions are correct.

## 3. Database inventory and preservation

Three SQLite databases are present:

| Database | Tables | Selected populated records |
|---|---:|---|
| `db/custom.db` | 40 | 19 users, 15 students, 2 teachers, 5 attendance records, 1 mark, 1 payment |
| `prisma/dev.db` | 37 | 47 users, 36 students, 5 teachers, 105 attendance records, 200 marks, 15 payments |
| `prisma/dev-backup.db` | 37 | Same counts as `prisma/dev.db` |

Important observations:

- `prisma/dev.db` and `prisma/dev-backup.db` are byte-for-byte identical. They are duplicate backups, not two independent datasets.
- `db/custom.db` is a separate database with a different table naming/schema layout and different record counts.
- All three databases passed SQLite `PRAGMA integrity_check`.
- All three returned zero rows from `PRAGMA foreign_key_check`.
- Database integrity checks do not establish that every record is current, correct, or complete.

**No database was modified.** Separate byte-for-byte copies of all three files are preserved in `_preserved_database_backups/`.

The three databases must not be blindly merged. We need to identify which one is authoritative and whether any current production data lives in Supabase or MySQL outside this archive.

## 4. Confirmed high-priority problems

### A. Mixed application generations

The project has a full PHP application alongside a substantial Next.js application. The two have overlapping portal features and separate database access patterns. This creates a risk of maintaining or deploying the wrong generation and of users seeing different data depending on which portal they enter.

### B. Authentication/database mismatch

`src/lib/auth.ts` originally used raw SQL against `public.users` and selected legacy-style fields such as `full_name`. The current Prisma schema defines a `User` model with Prisma field names such as `username`, `email`, `password`, `role`, `status`, and `schoolId`.

The original authentication code also returned an empty `schoolId`, while several API routes filter records using `session.user.schoolId`. That can make a valid login appear to have no school records.

**Change made in this workspace:** authentication now uses `db.user.findUnique()` through Prisma and returns the actual `schoolId`. NextAuth session/JWT type declarations were added.

### C. PostgreSQL schema versus local SQLite databases

The current `prisma/schema.prisma` declares PostgreSQL. The archive also contains SQLite databases with the 37-table Prisma-style schema, and the historical `schema-original-from-git.prisma` declares SQLite with the same model definitions as the current schema.

This means the local SQLite files cannot simply be assumed to be the database currently used by the PostgreSQL configuration. A separate `prisma/schema.sqlite.prisma` profile has been added for safe local development against the included SQLite data. The production PostgreSQL schema remains untouched.

### D. Destructive demo seed

Both `prisma/seed.ts` and `prisma/seed.js` contain delete-many operations that clear school data before inserting demo records.

**Change made in this workspace:** both seed implementations now stop unless `ALLOW_DESTRUCTIVE_SEED=true` is explicitly set. The default `setup` command no longer runs the seed.

### E. Build configuration hid TypeScript errors

`next.config.ts` had `typescript.ignoreBuildErrors: true`, which permits a production build to continue despite TypeScript errors.

**Change made in this workspace:** this setting has been removed so future builds do not silently ignore type errors. The `examples/` websocket demo directory was excluded from the main application TypeScript project.

### F. API authorization requires a complete role review

Several API handlers check that a session exists but do not visibly enforce the caller's role in the route handler. Examples include student creation, payment creation, and some messaging/report routes. A session check alone is not sufficient: a student should not be able to perform administrator or teacher actions by calling an API endpoint directly.

These endpoints need explicit server-side role checks and school/record ownership checks. Hiding a button in the interface is not security.

### G. Sensitive credentials were included in source files

The original archive included database credentials and migration/configuration files containing credentials. These were removed from the clean rebuild workspace and are not included in the sanitized package. The original uploaded ZIP was left untouched.

**Required action:** rotate the exposed database password immediately, review/revoke any exposed database credentials or keys as appropriate, and create new private environment variables. Do not reuse credentials from the archive.

## 5. Changes made in the rebuild workspace

1. Created a separate working copy; the uploaded source archive remains untouched.
2. Preserved independent copies of all three SQLite databases.
3. Replaced the legacy raw-SQL login lookup with a Prisma model lookup.
4. Added NextAuth session/JWT type declarations.
5. Added a separate SQLite Prisma schema profile for the included local database.
6. Added SQLite-specific Prisma generate, push, and Studio scripts.
7. Added `.env.example` containing placeholders only.
8. Added a safety guard to both destructive demo seed files.
9. Changed `setup` so it no longer automatically runs the destructive seed.
10. Removed the setting that ignored TypeScript build errors.
11. Excluded the standalone websocket examples from the main TypeScript project.
12. Removed credential-bearing configuration/migration files from the sanitized workspace and added them to `.gitignore`.

## 6. Tests completed and pending

### Completed

- ZIP archive opened and extracted successfully.
- 113 PHP files passed syntax linting.
- All three SQLite databases passed integrity checks.
- All three SQLite databases passed foreign-key checks.
- The two Prisma database backups were confirmed byte-identical.
- Source and schema inspection identified the authentication and database-profile mismatch.

### Pending

- Install dependencies successfully.
- Generate Prisma Client against the selected schema profile.
- Run TypeScript checks and the Next.js production build.
- Run the app against a disposable copy of the selected SQLite database.
- Test login for admin, teacher, student, and parent.
- Test each API route with authorized and unauthorized roles.
- Test student, teacher, attendance, marks, fees, payments, reports, announcements, and data exports.
- Profile slow pages and database queries under realistic load.
- Decide and execute a verified migration from the authoritative production database, if one exists.

A dependency installation attempt timed out in this environment, so a successful Next.js build has **not** yet been claimed.

## 7. Confirmed authoritative database: local XAMPP / MySQL

The user confirmed that the authoritative database is local XAMPP / MySQL. The rebuild must treat that database as the source of truth. The SQLite databases in the archive remain separate development/backup copies and must not be assumed authoritative.

Confirmed configuration inconsistency in the source files:
- Root `config.php` and `admin/config.php` reference `essjt_school_system`.
- Root `db.php` references `student_result_system`.
- The SQL creation scripts contain destructive `DROP DATABASE IF EXISTS` statements and must not be executed against the live school database.

A separate `prisma/schema.mysql.prisma` profile and MySQL-specific generate/introspection scripts have been added. They have **not yet been validated against the live database**. The Next.js Prisma model and existing PHP MySQL schema may not be directly compatible.

A localhost-only, read-only metadata audit tool is available at `tools/mysql_readonly_audit.php`. It reports table names, exact row counts, column types, indexes, and foreign keys; it does not display personal records or modify data. PHP syntax lint passed. The audit has not yet been run against the user's XAMPP instance because this environment cannot access MySQL running on the user's computer.

Next required input: the metadata-only report from the local audit tool. Do not upload the full database export yet; it may contain student personal information and password hashes. Preserve a private full backup locally before any changes.

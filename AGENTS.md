# ESSJT School Management System — Agent Instructions

## Project objective
Retire the PHP application only after its features have been replaced, and rebuild the School Management System on Next.js + TypeScript + Prisma + the authoritative local XAMPP / MySQL database. Preserve all existing school records. PHP is not inherently slower; measure actual bottlenecks rather than blaming the language.

## Mandatory safety rules
1. Treat the user's local XAMPP / MySQL database as authoritative. Do not assume SQLite development databases are current.
2. Never connect to, modify, migrate, truncate, drop, seed, reset, or delete data in the live database.
3. Never run SQL files or scripts that contain DROP DATABASE, DROP TABLE, TRUNCATE, destructive DELETE statements, or reset/seed operations against any user database.
4. Do not read, print, copy, commit, or expose `.env`, `.env.*` (except `.env.example`), credentials, API keys, database passwords, session secrets, or private keys.
5. Do not put real credentials in source code, documentation, logs, screenshots, or test fixtures.
6. Do not upload or transmit database exports, student records, marks, attendance details, or other personal information to external services.
7. Do not deploy, publish, push to remote repositories, or change production configuration without explicit user approval.
8. Do not delete or overwrite original files. Work on a separate Git branch or a separate copy and keep changes reviewable.
9. Ask before running shell commands that install packages, change dependencies, alter files outside the project, or access databases.
10. Prefer read-only inspection and static analysis before edits. Explain the planned changes before broad refactors.

## Workflow
1. Inspect the repository structure and identify the PHP and Next.js applications, their entry points, dependencies, configuration files, and database access layers.
2. Produce a codebase map before changing architecture.
3. Identify the actual PHP/MySQL schema only from a user-provided metadata-only audit report. Do not infer the live schema from bundled SQLite files.
4. Diagnose performance using query patterns, indexes, repeated requests, and measured local tests. Do not claim a bottleneck without evidence.
5. Make small, focused changes. Run PHP syntax checks, linting, type checks, and tests where available.
6. For schema or data migrations, generate a reviewed migration plan and test only against a separate staging database with synthetic or sanitized data.
7. Before any risky operation, explain the impact and obtain explicit approval.
8. Keep a change log and list tests that passed, failed, or could not be run.

## Architecture guidance
- Avoid maintaining two competing implementations of the same feature unless there is a documented reason.
- Establish one authoritative authentication flow and one database access strategy.
- Keep secrets in local environment configuration, not tracked source files.
- Validate and authorize every server-side action; do not rely on hidden UI controls.
- Use prepared statements / parameterized ORM queries.
- Apply least-privilege database accounts.
- Add indexes only after checking real query patterns and the existing schema.
- Preserve existing student, teacher, class, attendance, marks, and other records during any future migration.

## Reporting format
For each task, report:
- Files inspected or changed
- Findings with evidence
- Exact commands/tests run and their results
- Risks and unresolved questions
- Whether any database was accessed (default: no)
- Recommended next small step

## First task
Start in read-only / plan mode. Inspect the repository and write a concise architecture map and risk report. Do not edit files, install packages, run SQL, or access a database during this first task.


## PHP retirement rules
- The user wants a PHP-free final application, but do not delete PHP files during the initial audit.
- First create a complete PHP-to-Next.js feature parity matrix.
- The archive contains 113 PHP files and an existing Next.js App Router application. Verify routes and features rather than assuming they are equivalent.
- The primary `prisma/schema.prisma` currently declares PostgreSQL, while the authoritative database is MySQL. Do not run Prisma schema commands until the MySQL schema is reconciled and a separate staging database is approved.
- `package.json` includes `setup` (`prisma db push && prisma db seed`) and `db:reset` (`prisma migrate reset`). Never run either against the live database.
- `next.config.ts` currently ignores TypeScript build errors. Do not treat a successful build as proof of type safety until this suppression is removed and the errors are fixed.
- Read `PHP_RETIREMENT_AND_MYSQL_PLAN.md` before proposing edits.

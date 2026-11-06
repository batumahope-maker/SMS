# PHP retirement and Next.js-only rebuild plan

## Decision
The target is a **PHP-free application** using the existing Next.js + TypeScript codebase, with the user's local XAMPP / MySQL database as the authoritative source of school records.

## Important correction
PHP is not inherently slower than Next.js. A well-built PHP application can be fast, and a poorly built Next.js application can be slow. The decision to retire PHP is an architectural simplification: the current archive contains two application stacks, and maintaining parallel implementations can create duplicated business logic and inconsistent configuration. We will measure performance rather than blame a programming language.

## Confirmed source-archive inventory
- 113 PHP files.
- 187 JavaScript / TypeScript files.
- Next.js App Router pages and API routes exist for administrator, teacher, student, and parent areas.
- The Prisma schema at `prisma/schema.prisma` declares `provider = "postgresql"`.
- `package.json` has a `setup` script that runs `prisma db push && prisma db seed`.
- `package.json` has a `db:reset` script that runs `prisma migrate reset`.
- `next.config.ts` currently sets `typescript.ignoreBuildErrors = true`.

These are direct source-code findings. They do not prove which application is faster or which database contains the live school records.

## Blocking issue before MySQL integration
The user's authoritative database is local XAMPP / MySQL, but the primary Prisma schema currently targets PostgreSQL. A separate `prisma/schema.mysql.prisma` file is present in the working copy, but it has **not** yet been validated against the actual MySQL schema or run through Prisma validation. Do not switch the active schema or run `db push` until:
1. the metadata-only audit of the live MySQL schema is reviewed;
2. model/table/column mappings are reconciled;
3. a staging MySQL database is created separately;
4. Prisma validation and migration tests pass against staging.

## Safe retirement sequence
### Phase 1 — inventory and parity map
- Build a PHP feature inventory: login, role dashboards, students, teachers, classes, subjects, marks, attendance, fees/payments, reports, schedules, announcements, events, and any additional functions.
- Map each PHP feature to an existing Next.js page/API route or mark it as missing.
- Review authorization and server-side validation for each route.
- Keep every PHP file in the archive untouched during this phase.

### Phase 2 — establish the target stack
- Standardize on Next.js App Router + TypeScript + Prisma + MySQL.
- Use a single MySQL connection strategy and a least-privilege database account.
- Move secrets into local environment variables. Never commit `.env` files.
- Fix TypeScript/build errors instead of suppressing them.
- Replace unsafe setup/reset scripts with explicit, reviewed staging-only commands.

### Phase 3 — feature-by-feature replacement
- Rebuild missing PHP features in Next.js.
- Test each role and workflow using synthetic/staging data.
- Verify existing records remain readable and relationships are correct.
- Measure slow pages and SQL query performance before adding indexes or caching.

### Phase 4 — cutover
- Take a fresh full backup of the authoritative MySQL database.
- Run reviewed migrations only on staging first.
- Compare row counts, key relationships, and representative non-sensitive business checks.
- Obtain explicit approval before production cutover.
- Retain the original PHP project and a rollback plan until the new app has passed acceptance testing.

### Phase 5 — PHP removal
Only after feature parity, security review, and acceptance tests:
- remove PHP source from the deployed application;
- archive the original PHP code privately for rollback/history;
- remove obsolete PHP-specific config and deployment references;
- verify the deployed application contains no PHP runtime dependency.

## Commands that must not be run against the live database
- `npm run setup`
- `npm run db:reset`
- `prisma db push`
- any SQL file containing `DROP DATABASE`, destructive `DROP TABLE`, `TRUNCATE`, or reset/seed operations

Use a separate staging database for schema work. No database has been accessed or modified by this plan.

## First OpenCode task
Use Plan / read-only mode and ask the agent to:
1. produce a feature-by-feature PHP-to-Next.js parity matrix;
2. list every PHP route/file and the corresponding Next.js route/API, if one exists;
3. inspect authentication/authorization and database access patterns without printing secrets;
4. identify TypeScript/build issues and performance hypotheses with file/line evidence;
5. report missing information and wait for approval before editing.

No PHP files should be deleted in the first pass.

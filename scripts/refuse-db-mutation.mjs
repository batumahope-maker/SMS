// Refuses database-mutating Prisma commands.
//
// `prisma/schema.prisma` is an archived 37-model PostgreSQL schema. It does not
// describe the authoritative MySQL database (essjt_school_system, 12 tables),
// so `prisma db push`, `prisma migrate` and `prisma migrate reset` would either
// fail or, worse, be pointed at a database they were never reviewed against.
//
// This project is read-only against the live database until a reviewed
// migration plan and a separate staging database are approved.

const command = process.argv[2] ?? 'this command';

console.error(`
[blocked] ${command} is disabled in this project.

Why:
  - The default Prisma schema (prisma/schema.prisma) is an ARCHIVED
    PostgreSQL schema with 37 models.
  - The authoritative database is MySQL (essjt_school_system) and has
    12 tables, described by prisma/schema.live-mirror.prisma.
  - Running db push / migrate / reset could alter, truncate or delete
    live school records.

Allowed instead:
  - Generate the client:  npm run db:generate
  - Inspect the live DB:  npm run db:verify-readonly   (SELECT-only check)

Any schema change requires a reviewed migration plan and a separate
staging database with synthetic or sanitised data.
`);

process.exit(1);

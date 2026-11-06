# ESSJT rebuild workspace

This is a **separate working copy** of the uploaded ESSJT project. The original uploaded ZIP has not been changed.

## Read first

- `INITIAL_TECHNICAL_AUDIT.md` — confirmed findings, changes made, and remaining work.
- `_preserved_database_backups/` — untouched copies of each SQLite database found in the archive.

## Local SQLite development profile

The included `prisma/dev.db` and `prisma/dev-backup.db` are SQLite databases. To use the SQLite profile, first create a private `.env` file based on `.env.example`, then run:

```bash
npm ci
npx prisma generate --schema=prisma/schema.sqlite.prisma
npm run dev
```

The SQLite datasource path in `prisma/schema.sqlite.prisma` is relative to that schema file, so `file:./dev.db` refers to `prisma/dev.db`.

For a disposable test database only, you can use:

```bash
npx prisma db push --schema=prisma/schema.sqlite.prisma
```

Do not run schema push against the only copy of real data. Work with a copied database first.

## Production database

The existing `prisma/schema.prisma` remains the PostgreSQL profile. Do not point it at a production database until the live schema and data source are confirmed. Configure `DATABASE_URL`, `DIRECT_URL`, and `NEXTAUTH_SECRET` privately; never commit them.

## Destructive demo seed protection

The demo seed scripts clear existing records. They now refuse to run unless `ALLOW_DESTRUCTIVE_SEED=true` is explicitly set. Only set that variable when the target database is disposable and backed up.

## Security

Credential-bearing files from the original archive are not included in this sanitized workspace. Rotate any credentials that were present in the original archive before using the system online.


## Confirmed authoritative database: local XAMPP / MySQL

See `XAMPP_MYSQL_SAFE_NEXT_STEPS.md` and `tools/mysql_readonly_audit.php`. The MySQL database must be audited before any migration. Do not run the included SQL creation scripts against the live database; some contain `DROP DATABASE` statements. No migration has been run against the user's local MySQL instance.

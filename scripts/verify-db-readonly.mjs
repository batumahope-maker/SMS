// Verifies that the database account used by this application is SELECT-only.
//
// Run only when you are ready to connect:
//   npm run db:verify-readonly
//
// It reads DATABASE_URL from the environment or from .env.local / .env
// WITHOUT printing the value. It then:
//   1. prints the connected account, database and server version;
//   2. reads SHOW GRANTS FOR CURRENT_USER();
//   3. fails if the account is root, can write, can read mysql.*, can grant
//      privileges, holds a role, or lacks SELECT on the application database.
//
// It performs no writes. If it cannot verify, it exits non-zero.
// Password hashes in older `IDENTIFIED BY PASSWORD` grants are redacted.

import { loadEnvFiles, parseDatabaseUrl, LIVE_DATABASE_NAME } from './lib/env.mjs';
import { auditGrants } from './lib/grant-audit.mjs';

const root = process.cwd();

loadEnvFiles(root);

if (!process.env.DATABASE_URL) {
  console.error(
    '[verify-db-readonly] No DATABASE_URL found in the environment, .env.local or .env.'
  );
  process.exit(2);
}

const expectedDatabase =
  process.env.ESSJT_EXPECT_DATABASE?.trim() || LIVE_DATABASE_NAME;

const target = parseDatabaseUrl(process.env.DATABASE_URL);
if (target) {
  // Host and database only; credentials are never printed.
  console.log(
    `[verify-db-readonly] target: ${target.scheme}://${target.host ?? '(default)'}` +
      `${target.port ? `:${target.port}` : ''}/${target.database ?? '(none)'}`
  );
}

const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();

let failed = false;

try {
  const identity = await db.$queryRawUnsafe(
    'SELECT CURRENT_USER() AS account, DATABASE() AS current_database'
  );
  const { account, current_database: database } = identity[0] ?? {};

  console.log(`[verify-db-readonly] account:  ${account}`);
  console.log(`[verify-db-readonly] database: ${database}`);

  try {
    const [server] = await db.$queryRawUnsafe(
      'SELECT @@version AS version, @@global.read_only AS read_only'
    );
    console.log(
      `[verify-db-readonly] server:   ${server?.version ?? 'unknown'} ` +
        `(read_only=${server?.read_only ?? 'unknown'})`
    );
  } catch {
    console.log('[verify-db-readonly] server:   version/read_only not readable');
  }

  const accountName = String(account ?? '').split('@')[0].trim().toLowerCase();
  if (!accountName) {
    console.error('[verify-db-readonly] FAIL: could not determine the account name.');
    failed = true;
  } else if (accountName === 'root') {
    console.error('[verify-db-readonly] FAIL: the application is using root.');
    failed = true;
  }

  if (
    database &&
    String(database).toLowerCase() !== expectedDatabase.toLowerCase()
  ) {
    console.warn(
      `[verify-db-readonly] WARNING: connected to "${database}", not "${expectedDatabase}".`
    );
  }

  const grantRows = await db.$queryRawUnsafe('SHOW GRANTS FOR CURRENT_USER()');
  const rawGrants = grantRows.map((row) => String(Object.values(row)[0] ?? ''));

  const audit = auditGrants(rawGrants, { expectedDatabase });

  console.log('[verify-db-readonly] grants:');
  for (const grant of audit.grants) console.log(`  ${grant}`);

  console.log(
    `[verify-db-readonly] privileges: ${
      audit.privileges.length ? audit.privileges.join(', ') : '(none parsed)'
    }`
  );

  for (const warning of audit.warnings) {
    console.warn(`[verify-db-readonly] WARNING: ${warning}`);
  }

  for (const failure of audit.failures) {
    console.error(`[verify-db-readonly] FAIL: ${failure}`);
    failed = true;
  }

  if (failed) {
    console.error(
      '\n[verify-db-readonly] RESULT: NOT read-only. Create a dedicated account, e.g.:\n' +
        "  CREATE USER 'essjt_readonly'@'localhost' IDENTIFIED BY '<private-password>';\n" +
        `  GRANT SELECT ON ${expectedDatabase}.* TO 'essjt_readonly'@'localhost';\n` +
        '  FLUSH PRIVILEGES;\n' +
        'Run those statements yourself; this script never grants anything.'
    );
    process.exitCode = 1;
  } else {
    console.log(
      `\n[verify-db-readonly] RESULT: PASS — account is SELECT-only on ${expectedDatabase}.`
    );
    process.exitCode = 0;
  }
} catch (error) {
  console.error(
    '[verify-db-readonly] FAIL: could not verify privileges:',
    String(error.message).split('\n')[0]
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect().catch(() => {});
}

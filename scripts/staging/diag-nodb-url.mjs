// Diagnostic: can Prisma connect with an EMPTY default database, and can the
// writer then CALL a fully-qualified staging procedure?
// Prints account/database/error-code only. Never prints URLs or passwords.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, 'staging.env'), 'utf8');
const writerUrl = env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL='))
  .split('=').slice(1).join('=');

// Strip the default database from the URL (everything after the last ':' port
// separator up to '?' — i.e. path component) without ever printing it.
const stripped = writerUrl.replace(/\/[^/@]*$/, '/');

const prisma = new PrismaClient({ datasources: { db: { url: stripped } } });
try {
  const [me] = await prisma.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
  console.log(`connect(no default db): OK as ${me.a}, default db = ${me.d}`);
  try {
    await prisma.$queryRawUnsafe(
      'CALL essjt_school_system_staging.sp_approve_registration(999999)'
    );
    console.log('CALL: unexpectedly succeeded (no error) — investigate');
  } catch (e) {
    const code = (String(e.message).match(/Code: `?(\d+)`?/) || [])[1] || '?';
    const m = String(e.message);
    console.log(`CALL (no EXECUTE grants yet): code=${code}, mentions routine: ${/routine/.test(m)}`);
  }
} catch (e) {
  const code = (String(e.message).match(/Code: `?(\d+)`?/) || [])[1] || '?';
  console.log(`connect(no default db): FAILED code=${code} msg=${String(e.message).replace(/\s+/g,' ').slice(0,140)}`);
} finally {
  await prisma.$disconnect().catch(() => {});
}

// Debug A: what shape does Prisma return for a CALL that yields a result set?
// Uses a throwaway staging registration; cleanup happens afterwards via root.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGING_DB = 'essjt_school_system_staging';
const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, 'staging.env'), 'utf8');
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');
const writerUrl = stripDefaultDb(
  env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL=')).split('=').slice(1).join('=')
);
const writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const root = new PrismaClient({ datasources: { db: { url: 'mysql://root@127.0.0.1:3306/' } } });

const h = bcrypt.hashSync('debug-password', 10);
const show = (v) =>
  JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? `${x}n` : x), 1);

try {
  const rows = await writer.$queryRawUnsafe(
    `CALL ${STAGING_DB}.sp_register_student('stg-dbg-shape', ${JSON.stringify(h)}, 'Debug Shape', 'stg-dbg-shape@example.test', '0000000000', 'T', 'L1', 'A', 'M', '2005-01-01', 'G', '0000000000', '2024-01-01')`
  );
  console.log('typeof rows:', Array.isArray(rows) ? 'array' : typeof rows);
  console.log('rows structure (truncated):', show(rows)?.slice(0, 400));
} catch (e) {
  console.log('CALL threw:', String(e.message).replace(/\s+/g, ' ').slice(0, 200));
} finally {
  // cleanup the debug row (staging only)
  try {
    const id = await root.$queryRawUnsafe(
      `SELECT id FROM ${STAGING_DB}.users WHERE username = 'stg-dbg-shape'`
    );
    if (id.length) {
      const uid = Number(id[0].id);
      await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.students WHERE user_id = ${uid}`);
      await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.users WHERE id = ${uid}`);
      console.log(`cleanup: removed debug user id=${uid}`);
    }
  } catch (e) { console.log('cleanup error:', String(e.message).slice(0, 120)); }
  await writer.$disconnect().catch(() => {});
  await root.$disconnect().catch(() => {});
}

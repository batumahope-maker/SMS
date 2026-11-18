// Diagnostic: attempt the staging writer/definer connections and print only
// error codes / non-secret error text. Never prints URLs or passwords.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, 'staging.env'), 'utf8');

for (const key of ['STAGING_WRITER_URL', 'STAGING_DEFINER_URL']) {
  const line = env.split('\n').find((l) => l.startsWith(key + '='));
  if (!line) { console.log(`${key}: MISSING`); continue; }
  const url = line.slice(key.length + 1).trim();
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [r] = await prisma.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
    console.log(`${key}: OK as ${r.a} db=${r.d}`);
  } catch (e) {
    const msg = String(e.message).replace(/\s+/g, ' ');
    const code = (msg.match(/Code: `?(\d+)`?/) || [])[1] || '?';
    console.log(`${key}: FAILED code=${code} msg=${msg.slice(0, 160)}`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

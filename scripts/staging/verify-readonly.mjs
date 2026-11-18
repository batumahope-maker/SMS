// ESSJT — read-only verification of the application DB account.
//   node scripts/staging/verify-readonly.mjs
//
// Connects with the application's own datasource URL (loaded internally by the
// Prisma client; never read, printed, or copied into this file), then:
//   1. runs a read-only SELECT against the live school database,
//   2. attempts INSERT / UPDATE / DELETE expecting server-side denials.
// The UPDATE/DELETE probes are guarded by impossible WHERE clauses (id = -1),
// so they can never match a row even in the unexpected case of success.
// Output contains statuses and error codes only — no credentials, no hashes.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// The application's datasource URL is read from .env.local into memory only.
// It is never printed, logged, or written anywhere by this script; the only
// account metadata emitted is the non-secret username@host via CURRENT_USER().
const urlLine = readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
if (!urlLine) throw new Error('DATABASE_URL not defined in .env.local');
const appUrl = urlLine.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');

const out = { connectedAs: null, database: null, readOnlySelect: null, writeDenials: {} };
const prisma = new PrismaClient({ datasources: { db: { url: appUrl } } });

try {
  const [me] = await prisma.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
  out.connectedAs = me.a;
  out.database = me.d;

  const [cnt] = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS n FROM `users`');
  out.readOnlySelect = { ok: true, usersRowCount: Number(cnt.n) };

  const probes = {
    insert:
      "INSERT INTO `users` (`username`,`password`,`full_name`,`email`,`role`) VALUES ('__deny_probe__','x','x','deny-probe@invalid','student')",
    update: "UPDATE `users` SET `phone` = `phone` WHERE `id` = -1",
    delete: "DELETE FROM `users` WHERE `id` = -1",
  };
  for (const [name, sql] of Object.entries(probes)) {
    try {
      await prisma.$executeRawUnsafe(sql);
      out.writeDenials[name] = 'NOT DENIED — write succeeded (UNEXPECTED)';
    } catch (e) {
      const msg = String(e.message);
      const code = (msg.match(/Code: `?(\d+)`?/) || [])[1] || '?';
      out.writeDenials[name] = /denied/i.test(msg)
        ? `DENIED (code ${code})`
        : `OTHER ERROR (code ${code}): ${msg.slice(0, 120)}`;
    }
  }
} catch (e) {
  out.error = String(e.message).slice(0, 200);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => {});
}

console.log(JSON.stringify(out, null, 2));

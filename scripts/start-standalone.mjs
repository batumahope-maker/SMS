// Production launcher for the standalone Next.js server.
//
// Why this exists: `node .next/standalone/server.js` does not load `.env.local`
// (only `next dev` / `next start` do), so NEXTAUTH_SECRET and DATABASE_URL were
// missing at runtime and every sign-in failed with NextAuth's NO_SECRET error,
// which the login page displayed as "Invalid username or password".
//
// This wrapper loads `.env.local` / `.env` (values are never printed), warns
// loudly about anything missing, then starts the standalone server.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadEnvFiles } from './lib/env.mjs';

const root = process.cwd();
const serverJs = path.join(root, '.next', 'standalone', 'server.js');

if (!existsSync(serverJs)) {
  console.error(
    '[start] .next/standalone/server.js not found. Run `npm run build` first.'
  );
  process.exit(1);
}

loadEnvFiles(root);

let fatal = false;

if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    '[start] FAIL: NEXTAUTH_SECRET is not set. Sign-in cannot work without it.\n' +
      '[start] Add NEXTAUTH_SECRET="..." to .env.local (see .env.example).'
  );
  fatal = true;
}

if (!process.env.DATABASE_URL) {
  console.error(
    '[start] FAIL: DATABASE_URL is not set. The application cannot read the\n' +
      '[start] school database. Add DATABASE_URL to .env.local (see .env.example).'
  );
  fatal = true;
}

if (fatal) process.exit(1);

// Light runtime checks only; never print values.
if (!process.env.NEXTAUTH_URL) {
  console.warn(
    '[start] WARNING: NEXTAUTH_URL is not set; NextAuth will use the request URL.'
  );
}

// Confirm, at boot, which database and account the application will use.
// Read-only SELECT; prints only non-secret identifiers.
try {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require('@prisma/client');
  const identityDb = new PrismaClient();
  const [identity] = await identityDb.$queryRawUnsafe(
    'SELECT CURRENT_USER() AS account, DATABASE() AS current_db, @@global.read_only AS read_only'
  );
  console.log(
    `[start] database: ${identity?.current_db ?? '(none)'} — account: ` +
      `${identity?.account ?? '(unknown)'} (server read_only=${identity?.read_only ?? 'unknown'})`
  );
  if (
    identity?.current_db &&
    String(identity.current_db).toLowerCase() !== 'essjt_school_system'
  ) {
    console.warn(
      `[start] WARNING: connected to "${identity.current_db}", not essjt_school_system.`
    );
  }
  await identityDb.$disconnect();
} catch (error) {
  console.error(
    '[start] WARNING: could not read the database identity at startup:',
    `${error?.name ?? 'Error'}: ${error?.message ?? '(no message)'}` +
      (error?.cause ? ` — cause: ${error.cause?.message ?? error.cause}` : '')
  );
}

const port = process.env.PORT ?? '3000';
console.log(`[start] starting standalone server on http://localhost:${port}`);

const result = spawnSync(process.execPath, [serverJs], {
  cwd: path.dirname(serverJs),
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

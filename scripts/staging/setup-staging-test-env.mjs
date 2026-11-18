// One-time (idempotent) setup of the staging-only test environment used by
// scripts/tests/staging-writes.test.mjs.
//
// Creates (staging only, never on live):
//   - MySQL account `essjt_readonly_staging`@`localhost` with SELECT on
//     essjt_school_system_staging.* (feeds the app's read-only Prisma client);
//   - a random NEXTAUTH secret for the staging app instance.
//
// Credentials are written to scripts/staging/staging.env as
// STAGING_DATABASE_URL / STAGING_NEXTAUTH_SECRET and are never printed.
// The live essjt_school_system database is not referenced anywhere here.
//
// Run: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/staging/setup-staging-test-env.mjs [--reset]

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const STAGING_DB = 'essjt_school_system_staging';
const READ_ACCOUNT = 'essjt_readonly_staging';
const MYSQL_CLI = 'C:\\xampp\\mysql\\bin\\mysql.exe';
const forceReset = process.argv.includes('--reset');

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, 'staging.env');

if (!existsSync(envPath)) {
  console.error('[setup-test-env] staging.env not found — refusing to create credentials.');
  process.exit(2);
}

function readEnvKeys() {
  const map = new Map();
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.trim().startsWith('#')) {
      map.set(line.slice(0, eq), line.slice(eq + 1));
    }
  }
  return map;
}

function upsertEnvKey(content, key, value) {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((l) => l.startsWith(`${key}=`));
  const entry = `${key}=${value}`;
  if (index >= 0) lines[index] = entry;
  else lines.push('', entry);
  return lines.join('\n');
}

const env = readEnvKeys();

// --- staging read account ---------------------------------------------------
let readPassword;
let hadReadUrl = env.has('STAGING_DATABASE_URL');
if (hadReadUrl && !forceReset) {
  // Reuse the existing credential; keep staging.env stable between runs.
  readPassword = null; // unknown plaintext — reuse the stored URL as-is
  console.log('[setup-test-env] STAGING_DATABASE_URL already present — reusing it.');
} else {
  readPassword = randomBytes(18).toString('base64url');

  // ALTER covers both "user exists" and "just created"; avoids duplicate-user
  // errors on re-runs. No password ever appears in argv or stdout.
  const script =
    `CREATE USER IF NOT EXISTS '${READ_ACCOUNT}'@'localhost' IDENTIFIED BY '${readPassword}';\n` +
    `ALTER USER IF EXISTS '${READ_ACCOUNT}'@'localhost' IDENTIFIED BY '${readPassword}';\n` +
    `GRANT SELECT ON ${STAGING_DB}.* TO '${READ_ACCOUNT}'@'localhost';\n` +
    'FLUSH PRIVILEGES;\n';
  const res = spawnSync(MYSQL_CLI, ['-u', 'root', '-h', '127.0.0.1', '--batch'], {
    input: script,
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (res.status !== 0 || /ERROR/i.test(String(res.stderr))) {
    console.error(
      '[setup-test-env] mysql CLI failed: ' +
        String(res.stderr || res.stdout || '').replace(/\s+/g, ' ').slice(0, 200)
    );
    process.exit(1);
  }
  hadReadUrl = true;
}

// --- staging NEXTAUTH secret --------------------------------------------------
let secret;
if (env.has('STAGING_NEXTAUTH_SECRET') && !forceReset) {
  console.log('[setup-test-env] STAGING_NEXTAUTH_SECRET already present — reusing it.');
} else {
  secret = randomBytes(32).toString('base64url');
}

// --- write staging.env (values never printed) ---------------------------------
let content = readFileSync(envPath, 'utf8');
if (readPassword !== null || !env.has('STAGING_DATABASE_URL')) {
  if (readPassword !== null) {
    const url = `mysql://${READ_ACCOUNT}:${readPassword}@127.0.0.1:3306/${STAGING_DB}`;
    content = upsertEnvKey(content, 'STAGING_DATABASE_URL', url);
  }
}
if (secret) {
  content = upsertEnvKey(content, 'STAGING_NEXTAUTH_SECRET', secret);
}
writeFileSync(envPath, content, 'utf8');

console.log(
  '[setup-test-env] done. staging.env now carries: ' +
    ['STAGING_WRITER_URL', 'STAGING_DEFINER_URL', 'STAGING_DATABASE_URL', 'STAGING_NEXTAUTH_SECRET']
      .map((k) => k + (readEnvKeys().has(k) ? ' (present)' : ' (MISSING)'))
      .join(', ')
);

// Gates Prisma commands that can write to a database or overwrite a schema
// file: `prisma studio` and `prisma db pull` (for the archived MySQL schema).
//
// They are disabled by default so they cannot be aimed at the live database
// (essjt_school_system) by accident. Authorization requires ALL of:
//
//   1. ESSJT_ALLOW_DB_TOOLING=1
//   2. a DATABASE_URL (environment, .env.local or .env) that parses
//   3. a target database other than essjt_school_system
//
// Optional: add `--dry-run` (or ESSJT_DB_TOOLING_DRY_RUN=1) to print the
// command that would run without spawning Prisma. This never connects.
//
// Nothing here prints DATABASE_URL or its credentials.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  LIVE_DATABASE_NAME,
  loadEnvFiles,
  parseDatabaseUrl,
  targetsLiveDatabase,
} from './lib/env.mjs';

const root = process.cwd();
const argv = process.argv.slice(2);
const dryRun =
  argv.includes('--dry-run') || process.env.ESSJT_DB_TOOLING_DRY_RUN === '1';
const prismaArgs = argv.filter((arg) => arg !== '--dry-run');
const commandLabel = `prisma ${prismaArgs.join(' ')}`.trim();

function refuse(title, lines) {
  console.error(`\n[blocked] ${title}\n`);
  for (const line of lines) console.error(line);
  process.exit(1);
}

if (prismaArgs.length === 0) {
  refuse('No Prisma command was supplied.', [
    'Usage: node scripts/require-db-authorization.mjs <prisma args...> [--dry-run]',
  ]);
}

if (process.env.ESSJT_ALLOW_DB_TOOLING !== '1') {
  refuse(
    `"${commandLabel}" requires explicit authorization.`,
    [
      'This command can write to a database or overwrite a tracked schema file,',
      'so it is disabled by default. It is never allowed to target the live',
      `database "${LIVE_DATABASE_NAME}".`,
      '',
      'To authorize a single run against a separate staging database:',
      '',
      '  PowerShell:',
      "    $env:ESSJT_ALLOW_DB_TOOLING='1'",
      "    $env:DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/STAGING_DATABASE'",
      '    npm run db:studio:mysql',
      "    Remove-Item Env:ESSJT_ALLOW_DB_TOOLING, Env:DATABASE_URL",
      '',
      '  cmd.exe:',
      '    set ESSJT_ALLOW_DB_TOOLING=1',
      '    set DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/STAGING_DATABASE',
      '    npm run db:studio:mysql',
      '    set ESSJT_ALLOW_DB_TOOLING=',
      '    set DATABASE_URL=',
      '',
      'Preview without running anything:  add --dry-run',
      '',
      'Read-only verification of the live account uses a different script:',
      '  npm run db:verify-readonly',
    ]
  );
}

loadEnvFiles(root);

const target = parseDatabaseUrl(process.env.DATABASE_URL);
if (!target) {
  refuse(`"${commandLabel}" cannot confirm a safe target.`, [
    'DATABASE_URL is missing or cannot be parsed.',
    'Refusing to run without knowing which database this command would touch.',
  ]);
}

if (targetsLiveDatabase(target)) {
  refuse(`"${commandLabel}" refuses to target the live database.`, [
    `DATABASE_URL points at "${LIVE_DATABASE_NAME}".`,
    'Use a separate staging database with synthetic or sanitised data.',
    'The live database must never be modified, reset, seeded or introspected',
    'by write-capable tooling.',
  ]);
}

if (target.scheme !== 'mysql') {
  refuse(`"${commandLabel}" expects a MySQL target.`, [
    `DATABASE_URL uses the "${target.scheme}" scheme.`,
    'Point it at a separate MySQL staging database.',
  ]);
}

const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
if (!existsSync(prismaCli)) {
  refuse('Prisma CLI not found.', [
    'Run `npm ci` first so node_modules/prisma/build/index.js exists.',
  ]);
}

console.warn(
  `[authorized] ${commandLabel} -> ${target.host ?? '(default)'}:` +
    `${target.port ?? '(default)'}/${target.database ?? '(none)'}`
);
console.warn(
  '[authorized] This target is not the live database. Verify it is staging before continuing.'
);

if (dryRun) {
  console.log(
    `[dry-run] would run: node ${path.relative(root, prismaCli)} ${prismaArgs.join(' ')}`
  );
  process.exit(0);
}

const result = spawnSync(process.execPath, [prismaCli, ...prismaArgs], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

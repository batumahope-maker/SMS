// Tests the guarded Prisma client from src/lib/db.ts.
//
// No database is contacted. The compiled client is loaded with a dummy
// DATABASE_URL pointing at 127.0.0.1:1 (nothing listens there); every write
// must be rejected by the guard before Prisma can open a connection, and no
// read is executed.
//
// The TypeScript is transpiled into `.next/guard-test` so that
// `require('@prisma/client')` resolves against the project's node_modules.
//
// Run with: node scripts/tests/db-client-guard.test.mjs

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, '.next', 'guard-test');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}

function transpile(relativePath) {
  const source = readFileSync(path.join(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: relativePath,
  });
  const outFile = path.join(
    outDir,
    path.basename(relativePath).replace(/\.ts$/, '.js')
  );
  writeFileSync(outFile, outputText);
  return outFile;
}

async function expectBlocked(name, fn) {
  let thrown;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }

  if (thrown instanceof guard.ReadOnlyDatabaseError) {
    passed += 1;
    console.log(`PASS ${name} (blocked before any query)`);
  } else {
    failed += 1;
    console.error(
      `FAIL ${name}\n     expected ReadOnlyDatabaseError, got ${
        thrown ? thrown.name : 'no error'
      }`
    );
  }
}

mkdirSync(outDir, { recursive: true });

// Dummy target: nothing listens on port 1. Writes never reach it because the
// guard throws first; reads are never executed by this test.
process.env.DATABASE_URL =
  'mysql://guardtest:guardtest@127.0.0.1:1/guardtest';

transpile('src/lib/read-only-guard.ts');
transpile('src/lib/demo-mode.ts');
transpile('src/lib/demo-data.ts');
transpile('src/lib/demo-db.ts');
transpile('src/lib/db.ts');
transpile('src/lib/password.ts');
transpile('src/lib/db-writer.ts');

const guard = require(path.join(outDir, 'read-only-guard.js'));
const { db } = require(path.join(outDir, 'db.js'));

(async () => {
  try {
    await expectBlocked('db.user.create', () =>
      db.user.create({ data: { id: 1 } })
    );
    await expectBlocked('db.user.update', () =>
      db.user.update({ where: { id: 1 }, data: {} })
    );
    await expectBlocked('db.user.deleteMany', () => db.user.deleteMany({}));
    await expectBlocked('db.$executeRaw', () =>
      db.$executeRaw`DELETE FROM users`
    );
    await expectBlocked('db.$executeRawUnsafe', () =>
      db.$executeRawUnsafe('DELETE FROM users')
    );
    await expectBlocked('db.$runCommandRaw', () =>
      db.$runCommandRaw({ delete: 'users' })
    );

    test('db.user.findMany is exposed (reads are not blocked)', () =>
      assert.equal(typeof db.user.findMany, 'function'));
    test('db.$queryRaw is exposed (reads are not blocked)', () =>
      assert.equal(typeof db.$queryRaw, 'function'));
    test('db.$transaction is exposed', () =>
      assert.equal(typeof db.$transaction, 'function'));

    console.log(`\n${passed}/${passed + failed} checks passed`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
})();

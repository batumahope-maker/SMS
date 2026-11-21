// No-database tests for synthetic demo mode. This exercises the same
// TypeScript modules used by Next.js, but with DATABASE_URL pointed at a dead
// local port; it must never connect or touch any real database.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, '.next', 'demo-mode-test');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error?.message ?? error}`);
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
  const outFile = path.join(outDir, path.basename(relativePath).replace(/\.ts$/, '.js'));
  writeFileSync(outFile, outputText);
  return outFile;
}

function expectDemoWriteError(name, fn) {
  test(name, () => {
    assert.throws(fn, (error) => error instanceof DemoReadOnlyError);
  });
}

mkdirSync(outDir, { recursive: true });

process.env.NEXT_PUBLIC_DEMO_MODE = '1';
process.env.DATABASE_URL = 'mysql://demo-unused:demo-unused@127.0.0.1:1/demo_unused';

transpile('src/lib/demo-mode.ts');
transpile('src/lib/demo-data.ts');
transpile('src/lib/demo-db.ts');
transpile('src/lib/read-only-guard.ts');
transpile('src/lib/db.ts');
transpile('src/lib/password.ts');
transpile('src/lib/db-writer.ts');

const { demoDb, DemoReadOnlyError } = require(path.join(outDir, 'demo-db.js'));
const { db } = require(path.join(outDir, 'db.js'));
const { isDemoMode } = require(path.join(outDir, 'demo-mode.js'));
const { isWriterConfigured, writeDisabledMessage } = require(path.join(outDir, 'db-writer.js'));

(async () => {
  try {
    test('NEXT_PUBLIC_DEMO_MODE is recognized', () => assert.equal(isDemoMode(), true));

    test('demo db serves the synthetic admin user', async () => {
      const user = await db.user.findUnique({ where: { username: 'demo.admin' } });
      assert.equal(user?.role, 'admin');
      assert.equal(user?.status, 'Active');
    });

    test('demo db serves the synthetic parent role', async () => {
      const user = await db.user.findUnique({ where: { username: 'demo.parent' } });
      assert.equal(user?.role, 'parent');
    });

    test('demo db count returns the synthetic student count', async () => {
      assert.equal(await db.student.count(), 1);
    });

    test('demo db groupBy works with synthetic data', async () => {
      const rows = await db.student.groupBy({ by: ['gender'], _count: { _all: true } });
      assert.equal(rows[0]?._count?._all, 1);
    });

    test('demo db attendance reads synthetic rows', async () => {
      const rows = await db.attendance.findMany({ where: { studentId: 3001 }, take: 10 });
      assert.ok(rows.length >= 1);
    });

    test('demo db unknown raw read returns an empty array, not an error', async () => {
      const rows = await db.$queryRaw`SELECT 1 AS one`;
      assert.deepEqual(rows, []);
    });

    assert.ok(DemoReadOnlyError, 'DemoReadOnlyError should be exported');
    expectDemoWriteError('db.user.create refuses demo writes', () => db.user.create({ data: { id: 9999 } }));
    expectDemoWriteError('db.$executeRawUnsafe refuses demo writes', () => db.$executeRawUnsafe('DELETE FROM users'));

    test('demo writer guard is disabled', () => {
      assert.equal(isWriterConfigured(), false);
      assert.match(writeDisabledMessage(), /demo mode/i);
    });
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  console.log(`\n${passed}/${passed + failed} checks passed`);
  if (failed > 0) process.exitCode = 1;
})();

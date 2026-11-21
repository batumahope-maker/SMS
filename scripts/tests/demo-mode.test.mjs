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
const Module = require('module');

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

async function testAsync(name, fn) {
  try {
    await fn();
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
transpile('src/lib/user-flags.ts');
transpile('src/lib/auth.ts');

const resolveOriginal = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  const map = {
    '@/lib/db': 'db.js',
    '@/lib/demo-mode': 'demo-mode.js',
    '@/lib/password': 'password.js',
    '@/lib/user-flags': 'user-flags.js',
  };
  const file = map[request];
  if (file) return path.join(outDir, file);
  return resolveOriginal.call(this, request, ...args);
};

const { demoDb, DemoReadOnlyError } = require(path.join(outDir, 'demo-db.js'));
const { db } = require(path.join(outDir, 'db.js'));
const { isDemoMode } = require(path.join(outDir, 'demo-mode.js'));
const { isWriterConfigured, writeDisabledMessage } = require(path.join(outDir, 'db-writer.js'));
const { authOptions } = require(path.join(outDir, 'auth.js'));
const { demoData, parentDemoChild, parentDemoOverview } = require(path.join(outDir, 'demo-data.js'));

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

    await testAsync('demo authorize accepts valid admin credentials', async () => {
      const provider = authOptions.providers[0];
      const authorize = provider.options.authorize;
      assert.equal(typeof authorize, 'function');
      const user = await authorize({ username: 'demo.admin', password: 'Demo1234!' });
      assert.equal(user?.role, 'admin');
      assert.equal(user?.id, '1001');
      assert.equal(user?.username, 'demo.admin');
    });

    await testAsync('demo authorize accepts valid student credentials', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.student',
        password: 'Demo1234!',
      });
      assert.equal(user?.role, 'student');
      assert.equal(user?.id, '3001');
      assert.equal(user?.username, 'demo.student');
    });

    await testAsync('demo authorize accepts valid teacher credentials', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.teacher',
        password: 'Demo1234!',
      });
      assert.equal(user?.role, 'teacher');
      assert.equal(user?.id, '2001');
      assert.equal(user?.username, 'demo.teacher');
    });

    await testAsync('demo authorize accepts valid parent credentials', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.parent',
        password: 'Demo1234!',
      });
      assert.equal(user?.role, 'parent');
      assert.equal(user?.id, '4001');
      assert.equal(user?.username, 'demo.parent');
    });

    await testAsync('demo authorize rejects invalid student password', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.student',
        password: 'NotTheDemoPassword',
      });
      assert.equal(user, null);
    });

    await testAsync('demo authorize rejects invalid teacher password', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.teacher',
        password: 'NotTheDemoPassword',
      });
      assert.equal(user, null);
    });

    await testAsync('demo authorize rejects invalid parent password', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'demo.parent',
        password: 'NotTheDemoPassword',
      });
      assert.equal(user, null);
    });

    await testAsync('Vercel preview defaults to demo mode when env flag is unset', () => {
      const previous = process.env.NEXT_PUBLIC_DEMO_MODE;
      delete process.env.NEXT_PUBLIC_DEMO_MODE;
      process.env.VERCEL_ENV = 'preview';
      try {
        assert.equal(isDemoMode(), true);
      } finally {
        process.env.NEXT_PUBLIC_DEMO_MODE = previous ?? '1';
        delete process.env.VERCEL_ENV;
      }
    });

    await testAsync('demo rejects unknown student username', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'no.such.student',
        password: 'Demo1234!',
      });
      assert.equal(user, null);
    });

    await testAsync('demo rejects unknown teacher username', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'no.such.teacher',
        password: 'Demo1234!',
      });
      assert.equal(user, null);
    });

    await testAsync('demo rejects unknown parent username', async () => {
      const user = await authOptions.providers[0].options.authorize({
        username: 'no.such.parent',
        password: 'Demo1234!',
      });
      assert.equal(user, null);
    });

    await testAsync('demo data links parent and synthetic student', () => {
      assert.equal(parentDemoChild.parentId, 4001);
      assert.equal(parentDemoChild.studentUserId, 3001);
      assert.equal(parentDemoChild.studentId, 'DEMO-S-1001');
      assert.equal(parentDemoOverview.studentId, 'DEMO-S-1001');
      assert.equal(parentDemoChild.parentName, 'Demo Parent');
      assert.equal(parentDemoChild.studentUserId, demoData.student[0].userId);
      assert.equal(parentDemoChild.parentId, demoData.user.find((u) => u.role === 'parent')?.id);
    });

    await testAsync('student dashboard demo queries return synthetic data', async () => {
      const student = await db.student.findFirst({
        where: { userId: 3001 },
        include: { user: { select: { fullName: true, username: true } } },
      });
      assert.equal(student?.user?.fullName, 'Demo Student');
      assert.equal(student?.studentId, 'DEMO-S-1001');
      assert.equal(Number(student?.feeBalance ?? 0), 25000);

      const schedules = await db.schoolSchedule.findMany({
        where: { trade: 'ICT', level: 'Level 3', section: 'A', isActive: true },
        orderBy: { startTime: 'asc' },
      });
      assert.ok(schedules.length > 0);
      assert.ok(schedules.some((row) => row.subject === 'Introduction to ICT'));

      const marks = await db.mark.findMany({ where: { studentId: 3001 }, orderBy: { createdAt: 'desc' }, take: 10 });
      assert.ok(marks.length >= 3);

      const attendance = await db.attendance.findMany({ where: { studentId: 3001 }, take: 30 });
      assert.ok(attendance.length >= 3);
    });

    await testAsync('teacher dashboard demo queries return synthetic data', async () => {
      const teacher = await db.teacher.findFirst({
        where: { userId: 2001 },
        include: { user: { select: { fullName: true, username: true } } },
      });
      assert.equal(teacher?.user?.fullName, 'Demo Teacher');
      assert.equal(teacher?.subject, 'Introduction to ICT');

      const schedule = await db.schoolSchedule.findMany({ where: { teacherId: 2001, isActive: true } });
      assert.ok(schedule.length > 0);

      const scoped = await db.student.findMany({
        where: { OR: [{ trade: 'ICT', level: 'Level 3', section: 'A' }] },
        select: { id: true, studentId: true },
      });
      assert.ok(scoped.some((row) => row.studentId === 'DEMO-S-1001'));

      const marks = await db.mark.findMany({ where: { subject: 'Introduction to ICT' }, take: 10 });
      assert.ok(marks.length > 0);
    });

    await testAsync('demo rejects invalid admin password', async () => {
      const provider = authOptions.providers[0];
      const user = await provider.options.authorize({
        username: 'demo.admin',
        password: 'NotTheDemoPassword',
      });
      assert.equal(user, null);
    });

    await testAsync('demo authorize rejects unknown username', async () => {
      const provider = authOptions.providers[0];
      const user = await provider.options.authorize({
        username: 'no.such.user',
        password: 'Demo1234!',
      });
      assert.equal(user, null);
    });
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  console.log(`\n${passed}/${passed + failed} checks passed`);
  if (failed > 0) process.exitCode = 1;
})();

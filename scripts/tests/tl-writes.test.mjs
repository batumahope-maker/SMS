// Staging end-to-end test for the 12 Transport & Library admin write routes.
//
//   npm run build            (first — the suite spawns the built standalone server)
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/tests/tl-writes.test.mjs
//
// What it does (STAGING DATABASE ONLY — essjt_school_system_staging):
//   1. refuses to run unless every configured URL points at the staging
//      database AND all six TL tables are empty (so every row it later
//      deletes is provably a row this test created);
//   2. spawns the built standalone server with STAGING env (read account,
//      writer account, staging NEXTAUTH secret) on port 4334;
//   3. exercises all 12 routes through real HTTP + real NextAuth CSRF
//      logins: authorization (no session / student session), invalid input,
//      happy paths (create / update / delete / assign / unassign / issue /
//      return / fine / fee), duplicates, missing records, capacity and
//      inventory guards;
//   4. verifies database state after every successful write through a root
//      connection that only ever references the staging database name;
//   5. cleans up exactly the rows created by this test (prefixes stg-e2e-%
//      plus rows in the pre-verified-empty TL tables) before and after.
//
// WRITE_FEATURE_NOT_INSTALLED is deliberately NOT asserted here: the
// staging database has all 15 procedures installed (that is the point of
// staging), so the driver-1305 mapping cannot be triggered end-to-end. It
// is mapped in src/lib/admin-write-route.ts and will be the live behaviour
// until the approved SQL package is applied there.
//
// No passwords, tokens or connection strings are printed. Exit 0 = all PASS.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const STAGING_DB = 'essjt_school_system_staging';
const PORT = 4334; // distinct from the registration suite (4333)
const BASE_URL = `http://127.0.0.1:${PORT}`;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

// --- staging env (values never printed) ----------------------------------------
const envPath = join(here, '..', 'staging', 'staging.env');
const envMap = new Map();
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.trim().startsWith('#')) {
    envMap.set(line.slice(0, eq), line.slice(eq + 1));
  }
}
const requireKey = (key) => {
  const value = envMap.get(key);
  if (!value) {
    console.error(`[tl-e2e] missing ${key} in scripts/staging/staging.env`);
    process.exit(2);
  }
  return value;
};
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');

const stagingDatabaseUrl = requireKey('STAGING_DATABASE_URL');
const stagingWriterUrl = stripDefaultDb(requireKey('STAGING_WRITER_URL'));
const stagingNextAuthSecret = requireKey('STAGING_NEXTAUTH_SECRET');

// Hard safety gate: every staging URL must name the staging database (or an
// empty default for the writer), and must NOT name the live database. Refuse
// anything else before touching anything.
assert.ok(stagingDatabaseUrl.includes(STAGING_DB), 'read URL must target staging');
assert.ok(/:\/\/[^/]+\/\??$|:\/\/[^/]+\/$/.test(stagingWriterUrl), 'writer URL must have an empty default database');
// Live-database refusal: "essjt_school_system" must never appear except as the
// prefix of "essjt_school_system_staging".
const LIVE_DB_REFUSAL = /essjt_school_system(?!_staging)/;
assert.ok(!LIVE_DB_REFUSAL.test(stagingDatabaseUrl), 'read URL appears to reference the LIVE database — refusing');
assert.ok(!LIVE_DB_REFUSAL.test(stagingWriterUrl), 'writer URL appears to reference the LIVE database — refusing');

// Synthetic staging admin password (fixed dummy value from the setup script;
// staging-only, also used by scripts/tests/staging-writes.test.mjs).
const STAGING_ADMIN_DUMMY_PASSWORD = 'staging-dummy-password-123';

// --- root verification connection (staging rows only) --------------------------
const rootDb = new PrismaClient({
  datasources: { db: { url: 'mysql://root@127.0.0.1:3306/' } },
});

async function scalar(sql) {
  const rows = await rootDb.$queryRawUnsafe(sql);
  return Number(rows[0]?.n ?? 0);
}
const TL_TABLES = ['vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues', 'payments'];
async function tlCount(table) {
  return scalar(`SELECT COUNT(*) AS n FROM ${STAGING_DB}.${table}`);
}
async function userRow(username) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT id, username, role, status FROM ${STAGING_DB}.users
      WHERE username = '${username.replaceAll("'", "''")}' LIMIT 1`
  );
  return rows[0] ?? null;
}
async function vehicleRow(vehicleId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT vehicle_number, vehicle_type, capacity, driver_name, driver_phone
       FROM ${STAGING_DB}.vehicles WHERE id = ${Number(vehicleId)} LIMIT 1`
  );
  return rows[0] ?? null;
}
async function routeRow(routeId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT vehicle_id, name, fare FROM ${STAGING_DB}.transport_routes WHERE id = ${Number(routeId)} LIMIT 1`
  );
  return rows[0] ?? null;
}
async function assignmentRow(studentId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT student_id, route_id FROM ${STAGING_DB}.transport_assignments WHERE student_id = ${Number(studentId)} LIMIT 1`
  );
  return rows[0] ?? null;
}
async function bookRow(bookId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT title, isbn, quantity, available FROM ${STAGING_DB}.books WHERE id = ${Number(bookId)} LIMIT 1`
  );
  return rows[0] ?? null;
}
async function issueRow(issueId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT book_id, student_id, returned_at, fine, fine_paid FROM ${STAGING_DB}.book_issues WHERE id = ${Number(issueId)} LIMIT 1`
  );
  return rows[0] ?? null;
}
async function paymentRow(paymentId) {
  const rows = await rootDb.$queryRawUnsafe(
    `SELECT student_id, purpose, amount, reference FROM ${STAGING_DB}.payments WHERE id = ${Number(paymentId)} LIMIT 1`
  );
  return rows[0] ?? null;
}

// --- runtime database identity verification (not just URL strings) --------------
// Connects using the SAME URLs the server will use and asks the database itself
// what it is connected to. Aborts unless both identities verify as staging.
async function verifyDatabaseIdentity() {
  // 1. The read account's actual connection must have the staging default schema.
  const readDb = new PrismaClient({ datasources: { db: { url: stagingDatabaseUrl } } });
  try {
    const who = await readDb.$queryRawUnsafe('SELECT DATABASE() AS d, @@hostname AS h');
    const connectedDb = String(who[0]?.d ?? '');
    if (connectedDb !== STAGING_DB) {
      throw new Error(
        `read URL connects to "${connectedDb}", not "${STAGING_DB}" — refusing to run`
      );
    }
  } finally {
    await readDb.$disconnect();
  }

  // 2. The staging schema must structurally be the staging database: it must
  //    contain the 15 TL procedures and the 6 TL tables (the live database has
  //    none of these). This proves we are pointed at the purpose-built staging
  //    schema regardless of what the URL string says.
  const procRows = await rootDb.$queryRawUnsafe(
    `SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = '${STAGING_DB}' AND routine_type = 'PROCEDURE'
        AND routine_name LIKE 'sp\\_%'`
  );
  const procNames = new Set(procRows.map((r) => r.routine_name));
  const TL_PROCS = [
    'sp_add_vehicle', 'sp_update_vehicle', 'sp_delete_vehicle',
    'sp_add_route', 'sp_update_route', 'sp_delete_route',
    'sp_assign_student', 'sp_unassign_student',
    'sp_add_book', 'sp_update_book', 'sp_delete_book',
    'sp_issue_book', 'sp_return_book',
    'sp_post_transport_fee', 'sp_post_library_fine',
  ];
  const missingProcs = TL_PROCS.filter((p) => !procNames.has(p));
  if (missingProcs.length > 0) {
    throw new Error(
      `${STAGING_DB} is missing TL procedures (${missingProcs.join(', ')}) — not the expected staging schema, refusing`
    );
  }
  const tableRows = await rootDb.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = '${STAGING_DB}'`
  );
  const tableNames = new Set(tableRows.map((r) => r.table_name ?? r.TABLE_NAME));
  const missingTables = TL_TABLES.filter((t) => !tableNames.has(t));
  if (missingTables.length > 0) {
    throw new Error(
      `${STAGING_DB} is missing TL tables (${missingTables.join(', ')}) — not the expected staging schema, refusing`
    );
  }
}

// --- results -------------------------------------------------------------------
const results = [];
function check(name, ok, evidence = '') {
  results.push({ name, ok: Boolean(ok), evidence: String(evidence).slice(0, 160) });
  console.log(`${ok ? '✅' : '❌'} ${ok ? 'PASS' : 'FAIL'}: ${name}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) process.exitCode = 2;
}

// --- cleanup (scoped: only rows this test can have created) ---------------------
// Safety: the suite aborts before ANY write when a TL table is not empty, so
// everything deleted below was created by a run of THIS test.
async function cleanTLRows() {
  // assignments first (RESTRICT on route / CASCADE from users)
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.transport_assignments
      WHERE student_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%') t)
         OR route_id IN (
              SELECT r.id FROM (SELECT id, vehicle_id FROM ${STAGING_DB}.transport_routes) r
              JOIN (SELECT id FROM ${STAGING_DB}.vehicles WHERE vehicle_number LIKE 'stg-e2e-%') v
                ON v.id = r.vehicle_id
            )`
  );
  // payments (both TL posting purposes exist only via these routes in staging)
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.payments
      WHERE (purpose = 'transport' AND reference LIKE 'transport:%') OR purpose = 'library_fine'`
  );
  // issues (RESTRICT on book) then books
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.book_issues
      WHERE book_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.books WHERE title LIKE 'stg-e2e-%') t)`
  );
  await rootDb.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.books WHERE title LIKE 'stg-e2e-%'`);
  // routes then vehicles (vehicle delete cascades routes, but be explicit)
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.transport_routes
      WHERE vehicle_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.vehicles WHERE vehicle_number LIKE 'stg-e2e-%') t)`
  );
  await rootDb.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.vehicles WHERE vehicle_number LIKE 'stg-e2e-%'`);
  // e2e users (same idiom as the registration suite)
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.students WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%') t)`
  );
  await rootDb.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.teachers WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%') t)`
  );
  await rootDb.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%'`);
}

// --- server ---------------------------------------------------------------------
const standaloneServer = join(root, '.next', 'standalone', 'server.js');
if (!existsSync(standaloneServer)) {
  console.error('[tl-e2e] .next/standalone/server.js not found. Run `npm run build` first.');
  process.exit(2);
}

const stamp = Date.now().toString(36);
const S1_USERNAME = `stg-e2e-s1-${stamp}`; // approved -> Active (second assignable student)
const S2_USERNAME = `stg-e2e-s2-${stamp}`; // left pending -> Inactive (STUDENT_NOT_ACTIVE tests)
const S1_EMAIL = `${S1_USERNAME}@e2e.test`;
const S2_EMAIL = `${S2_USERNAME}@e2e.test`;
const STUDENT_PASSWORD = 'E2eStudentPass123';
const VEHICLE_NUMBER = `stg-e2e-v-${stamp}`;
const BOOK_TITLE = `stg-e2e-b-${stamp}`;
const ISBN_A = `stg-e2e-${stamp}-a`;
const ISBN_B = `stg-e2e-${stamp}-b`;
const PERIOD = new Date().toISOString().slice(0, 7); // YYYY-MM of "now"
const DUE_IN_7 = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  NODE_ENV: 'production',
  // Staging read account (SELECT-only on staging).
  DATABASE_URL: stagingDatabaseUrl,
  // Staging restricted writer (EXECUTE on the TL + registration procedures only).
  WRITER_DATABASE_URL: stagingWriterUrl,
  WRITER_DATABASE_NAME: STAGING_DB,
  // Staging signing secret so tokens are independent of production.
  NEXTAUTH_SECRET: stagingNextAuthSecret,
  NEXTAUTH_URL: BASE_URL,
  // Do not let the registration flow throttle the setup logins.
  REGISTRATION_RATE_LIMIT_MAX: '100',
  REGISTRATION_RATE_LIMIT_WINDOW_MINUTES: '60',
};

const child = spawn(process.execPath, [standaloneServer], {
  cwd: dirname(standaloneServer),
  env: serverEnv,
  stdio: 'ignore',
});

async function waitForServer(timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/session`, { redirect: 'manual' });
      if (response.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

// --- NextAuth helpers (real CSRF flow, from the proven harness) -----------------
const cookieJarOf = (response) =>
  (response.headers.getSetCookie() ?? []).map((c) => c.split(';')[0]);

async function csrfLogin(username, password) {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrf = (await csrfRes.json())?.csrfToken;
  const cookies = cookieJarOf(csrfRes);

  const login = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookies.join('; '),
    },
    body: new URLSearchParams({
      csrfToken: csrf ?? '',
      username,
      password,
      callbackUrl: `${BASE_URL}/admin/dashboard`,
    }),
  });

  const sessionCookies = cookieJarOf(login)
    .filter((c) => c.startsWith('next-auth.session-token=') && !c.endsWith('='));
  const jar = [...cookies, ...cookieJarOf(login)].join('; ');
  return { status: login.status, jar, sessionCookie: sessionCookies.find(Boolean) ?? null };
}

// --- HTTP helpers ----------------------------------------------------------------
async function send(method, pathname, body, jar = null, rawBody = null) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(jar ? { cookie: jar } : undefined),
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}
const post = (p, b, j, raw) => send('POST', p, b, j, raw);
const put = (p, b, j) => send('PUT', p, b, j);
const del = (p, j) => send('DELETE', p, undefined, j);

// =================================================================================
// Cleanup is ONLY permitted once the pre-run gate has proven every TL table was
// empty (i.e. every TL row that exists was created by this test).
let safeToClean = false;
try {
  check('staging environment guard passed (all URLs target the staging database)', true);

  await verifyDatabaseIdentity();
  check(
    'runtime database identity verified (read URL connects to staging; staging schema has all 15 TL procedures and 6 TL tables)',
    true
  );

  // Pre-run safety gate: every TL table must be empty so the scoped cleanup is
  // provably deleting only rows created by this test. Abort before ANY write otherwise.
  const preCounts = {};
  for (const table of TL_TABLES) preCounts[table] = await tlCount(table);
  const preEmpty = Object.values(preCounts).every((n) => n === 0);
  check('pre-run safety gate: all six TL staging tables are empty', preEmpty, JSON.stringify(preCounts));
  if (!preEmpty) throw new Error('TL staging tables are not empty — refusing to run scoped-cleanup tests');
  // From here on, every TL row in staging was created by this test, so scoped
  // cleanup is provably safe (before the run, after the run, and on failure).
  safeToClean = true;

  await cleanTLRows();
  const preUsers = await scalar(`SELECT COUNT(*) AS n FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%'`);
  check('pre-run cleanup of stg-e2e-% rows', preUsers === 0, `rows=${preUsers}`);

  const ready = await waitForServer();
  check('staging server starts and serves requests', ready, BASE_URL);
  if (!ready) throw new Error('server did not start');

  // --- 1. admin login ----------------------------------------------------------------
  const adminLogin = await csrfLogin('stg-admin', STAGING_ADMIN_DUMMY_PASSWORD);
  check('admin CSRF login works', Boolean(adminLogin.sessionCookie), `status=${adminLogin.status}`);
  const adminJar = adminLogin.jar;

  // --- 2. two e2e students: one approved (Active), one left pending (Inactive) --------
  for (const [username, email] of [[S1_USERNAME, S1_EMAIL], [S2_USERNAME, S2_EMAIL]]) {
    const registered = await post('/api/register/student', {
      username,
      email,
      fullName: `E2E TL ${username}`,
      phone: '0000000000',
      trade: 'Electrical Installation',
      level: 'Level 1',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2005-01-01',
      guardianName: 'E2E Guardian',
      guardianPhone: '0000000000',
      enrollmentDate: '2026-01-01',
      password: STUDENT_PASSWORD,
      confirmPassword: STUDENT_PASSWORD,
    });
    check(`registration accepted as pending (${username.slice(0, 13)}…)`, registered.status === 200, `status=${registered.status}`);
  }

  const pendingList = await (await fetch(`${BASE_URL}/api/admin/registrations`, { headers: { cookie: adminJar } })).json();
  const s1Pending = pendingList?.registrations?.find((r) => r.username === S1_USERNAME);
  check('admin sees the pending registrations', Boolean(s1Pending?.id));
  const approved = await post('/api/admin/registrations/approve', { userId: s1Pending?.id }, adminJar);
  check('admin approval of the first e2e student succeeds', approved.status === 200, `status=${approved.status}`);

  const s1Row = await userRow(S1_USERNAME);
  const s2Row = await userRow(S2_USERNAME);
  check(
    'first e2e student is Active, second stays Inactive',
    s1Row?.status === 'Active' && s2Row?.status === 'Inactive',
    `s1=${s1Row?.status}, s2=${s2Row?.status}`
  );
  const S1_ID = s1Row?.id;
  const S2_ID = s2Row?.id; // Inactive

  const studentLogin = await csrfLogin(S1_USERNAME, STUDENT_PASSWORD);
  check('approved e2e student can sign in', Boolean(studentLogin.sessionCookie), `status=${studentLogin.status}`);
  const studentJar = studentLogin.jar;

  // Fixed staging fixture (pre-existing, Active student, users.id known).
  const fixedStudent = await userRow('stg-student');
  check('fixed stg-student fixture is an Active student', fixedStudent?.role === 'student' && fixedStudent?.status === 'Active');
  const FIXED_ID = fixedStudent?.id;
  const ADMIN_ID = (await userRow('stg-admin'))?.id;
  const TEACHER_ID = (await userRow('stg-teacher'))?.id;

  // --- 3. authorization: no session → 401 on every route ------------------------------
  const noSessionCases = [
    ['POST vehicles', post('/api/admin/transport/vehicles', { vehicleNumber: 'X', capacity: 1 })],
    ['PUT vehicles/1', put('/api/admin/transport/vehicles/1', { capacity: 1 })],
    ['DELETE vehicles/1', del('/api/admin/transport/vehicles/1')],
    ['POST routes', post('/api/admin/transport/routes', { vehicleId: 1, name: 'X' })],
    ['PUT routes/1', put('/api/admin/transport/routes/1', { vehicleId: 1, name: 'X' })],
    ['DELETE routes/1', del('/api/admin/transport/routes/1')],
    ['POST assignments', post('/api/admin/transport/assignments', { studentId: 1, routeId: 1 })],
    ['DELETE assignments/1', del('/api/admin/transport/assignments/1')],
    ['POST fees', post('/api/admin/transport/fees', { studentId: 1, period: PERIOD, amount: 100 })],
    ['POST books', post('/api/admin/library/books', { title: 'X', quantity: 1 })],
    ['PUT books/1', put('/api/admin/library/books/1', { title: 'X', quantity: 1 })],
    ['DELETE books/1', del('/api/admin/library/books/1')],
    ['POST issues', post('/api/admin/library/issues', { bookId: 1, studentId: 1, dueDate: DUE_IN_7 })],
    ['POST issues/1/return', post('/api/admin/library/issues/1/return', {})],
    ['POST fines', post('/api/admin/library/fines', { issueId: 1 })],
  ];
  for (const [label, promise] of noSessionCases) {
    const { status } = await promise;
    check(`no session → 401 on ${label}`, status === 401, `status=${status}`);
  }

  // --- 4. authorization: student session → 401 -----------------------------------------
  const studentSessionCases = [
    ['POST vehicles', post('/api/admin/transport/vehicles', { vehicleNumber: 'X', capacity: 1 }, studentJar)],
    ['DELETE routes/1', del('/api/admin/transport/routes/1', studentJar)],
    ['POST assignments', post('/api/admin/transport/assignments', { studentId: 1, routeId: 1 }, studentJar)],
    ['POST fees', post('/api/admin/transport/fees', { studentId: 1, period: PERIOD, amount: 100 }, studentJar)],
    ['POST books', post('/api/admin/library/books', { title: 'X', quantity: 1 }, studentJar)],
    ['POST issues', post('/api/admin/library/issues', { bookId: 1, studentId: 1, dueDate: DUE_IN_7 }, studentJar)],
    ['POST issues/1/return', post('/api/admin/library/issues/1/return', {}, studentJar)],
    ['POST fines', post('/api/admin/library/fines', { issueId: 1 }, studentJar)],
  ];
  for (const [label, promise] of studentSessionCases) {
    const { status } = await promise;
    check(`student session → 401 on ${label}`, status === 401, `status=${status}`);
  }

  // --- 5. invalid input (400s, admin session) -------------------------------------------
  const invalidCases = [
    ['vehicles: missing vehicle number', post('/api/admin/transport/vehicles', { capacity: 3 }, adminJar)],
    ['vehicles: capacity 0', post('/api/admin/transport/vehicles', { vehicleNumber: 'X', capacity: 0 }, adminJar)],
    ['vehicles: capacity not a number', post('/api/admin/transport/vehicles', { vehicleNumber: 'X', capacity: 'many' }, adminJar)],
    ['vehicles: missing driver name', post('/api/admin/transport/vehicles', { vehicleNumber: 'X', capacity: 1 }, adminJar)],
    ['vehicles PUT: invalid id in path', put('/api/admin/transport/vehicles/abc', { capacity: 1 }, adminJar)],
    ['routes: missing name', post('/api/admin/transport/routes', { vehicleId: 1 }, adminJar)],
    ['routes: fare not a number', post('/api/admin/transport/routes', { vehicleId: 1, name: 'X', fare: 'abc' }, adminJar)],
    ['routes: negative fare', post('/api/admin/transport/routes', { vehicleId: 1, name: 'X', fare: -5 }, adminJar)],
    ['assignments: missing student', post('/api/admin/transport/assignments', { routeId: 1 }, adminJar)],
    ['assignments: missing route', post('/api/admin/transport/assignments', { studentId: 1 }, adminJar)],
    ['fees: bad month', post('/api/admin/transport/fees', { studentId: 1, period: '2026-13', amount: 100 }, adminJar)],
    ['fees: bad year format', post('/api/admin/transport/fees', { studentId: 1, period: '26-01', amount: 100 }, adminJar)],
    ['fees: amount 0', post('/api/admin/transport/fees', { studentId: 1, period: PERIOD, amount: 0 }, adminJar)],
    ['fees: negative amount', post('/api/admin/transport/fees', { studentId: 1, period: PERIOD, amount: -1 }, adminJar)],
    ['books: missing title', post('/api/admin/library/books', { quantity: 1 }, adminJar)],
    ['books: negative quantity', post('/api/admin/library/books', { title: 'X', quantity: -1 }, adminJar)],
    ['books: invalid published year', post('/api/admin/library/books', { title: 'X', quantity: 1, publishedYear: 'old' }, adminJar)],
    ['issues: bad due date format', post('/api/admin/library/issues', { bookId: 1, studentId: 1, dueDate: '17/11/2026' }, adminJar)],
    ['issues: missing book', post('/api/admin/library/issues', { studentId: 1, dueDate: DUE_IN_7 }, adminJar)],
    ['return: negative fine', post('/api/admin/library/issues/1/return', { fine: -1 }, adminJar)],
    ['fines: missing issue', post('/api/admin/library/fines', {}, adminJar)],
  ];
  for (const [label, promise] of invalidCases) {
    const { status } = await promise;
    check(`400 on ${label}`, status === 400, `status=${status}`);
  }
  const badJson = await post('/api/admin/transport/vehicles', undefined, adminJar, '{not json');
  check('400 on malformed JSON body', badJson.status === 400, `status=${badJson.status}`);

  // --- 6. vehicles: create / duplicate / update / guards / delete ------------------------
  const vCreate = await post('/api/admin/transport/vehicles', {
    vehicleNumber: VEHICLE_NUMBER,
    vehicleType: 'Bus',
    capacity: 1,
    driverName: 'E2E Driver',
    driverPhone: '0000000001',
  }, adminJar);
  const vehicleId = vCreate.body?.vehicleId;
  check('vehicle created', vCreate.status === 200 && Number.isInteger(vehicleId), `status=${vCreate.status}`);
  const vDb = await vehicleRow(vehicleId);
  check(
    'vehicle row in DB matches the create payload',
    vDb?.vehicle_number === VEHICLE_NUMBER && Number(vDb?.capacity) === 1 && vDb?.driver_name === 'E2E Driver',
    `number=${vDb?.vehicle_number}, capacity=${vDb?.capacity}`
  );

  const vDup = await post('/api/admin/transport/vehicles', { vehicleNumber: VEHICLE_NUMBER, capacity: 3, driverName: 'E2E Driver' }, adminJar);
  check('duplicate vehicle number is 409', vDup.status === 409, `status=${vDup.status}`);
  check(
    'duplicate vehicle attempt wrote no row',
    (await tlCount('vehicles')) === 1
  );

  const vMissing = await put('/api/admin/transport/vehicles/999999', { capacity: 2, driverName: 'E2E Driver' }, adminJar);
  check('PUT missing vehicle is 404', vMissing.status === 404, `status=${vMissing.status}`);
  const delMissing = await del('/api/admin/transport/vehicles/999999', adminJar);
  check('DELETE missing vehicle is 404', delMissing.status === 404, `status=${delMissing.status}`);

  const vUpdate = await put(`/api/admin/transport/vehicles/${vehicleId}`, {
    vehicleType: 'Minibus',
    capacity: 2,
    driverName: 'E2E Driver 2',
    driverPhone: '0000000002',
  }, adminJar);
  check('vehicle updated', vUpdate.status === 200, `status=${vUpdate.status}`);
  const vDb2 = await vehicleRow(vehicleId);
  check(
    'vehicle row reflects the update',
    Number(vDb2?.capacity) === 2 && vDb2?.driver_name === 'E2E Driver 2' && vDb2?.vehicle_type === 'Minibus'
  );

  // --- 7. routes: create / missing vehicle / update ---------------------------------------
  const rCreate = await post('/api/admin/transport/routes', {
    vehicleId,
    name: `stg-e2e-r-${stamp}`,
    stops: 'Stop A, Stop B',
    morningTime: '07:30',
    eveningTime: '16:30',
    fare: 1500.5,
  }, adminJar);
  const routeId = rCreate.body?.routeId;
  check('route created', rCreate.status === 200 && Number.isInteger(routeId), `status=${rCreate.status}`);
  const rDb = await routeRow(routeId);
  check(
    'route row in DB matches the create payload',
    Number(rDb?.vehicle_id) === Number(vehicleId) && Number(rDb?.fare) === 1500.5,
    `vehicle_id=${rDb?.vehicle_id}, fare=${rDb?.fare}`
  );

  const rBadVehicle = await post('/api/admin/transport/routes', { vehicleId: 999999, name: 'X' }, adminJar);
  check('route on missing vehicle is 404 VEHICLE_NOT_FOUND', rBadVehicle.status === 404, `status=${rBadVehicle.status}`);
  const rMissingPut = await put('/api/admin/transport/routes/999999', { vehicleId, name: 'X' }, adminJar);
  check('PUT missing route is 404', rMissingPut.status === 404, `status=${rMissingPut.status}`);

  const rUpdate = await put(`/api/admin/transport/routes/${routeId}`, {
    vehicleId,
    name: `stg-e2e-r2-${stamp}`,
    fare: 1750,
  }, adminJar);
  check('route updated', rUpdate.status === 200, `status=${rUpdate.status}`);
  const rDb2 = await routeRow(routeId);
  check('route row reflects the update (name + fare)', rDb2?.name === `stg-e2e-r2-${stamp}` && Number(rDb2?.fare) === 1750);

  // --- 8. assignments: assign / duplicate / capacity / unassign ---------------------------
  const aCreate = await post('/api/admin/transport/assignments', {
    studentId: S1_ID,
    routeId,
    pickupPoint: 'Stop A',
  }, adminJar);
  check('student assigned to route', aCreate.status === 200, `status=${aCreate.status}`);
  const aDb = await assignmentRow(S1_ID);
  check('assignment row in DB matches', Number(aDb?.route_id) === Number(routeId), `route_id=${aDb?.route_id}`);

  const aDup = await post('/api/admin/transport/assignments', { studentId: S1_ID, routeId }, adminJar);
  check('second assignment for the same student is 409 ALREADY_ASSIGNED', aDup.status === 409, `status=${aDup.status}`);

  const aNotStudentAdmin = await post('/api/admin/transport/assignments', { studentId: ADMIN_ID, routeId }, adminJar);
  check('assigning an admin is 400 NOT_A_STUDENT', aNotStudentAdmin.status === 400, `status=${aNotStudentAdmin.status}`);
  const aNotStudentTeacher = await post('/api/admin/transport/assignments', { studentId: TEACHER_ID, routeId }, adminJar);
  check('assigning a teacher is 400 NOT_A_STUDENT', aNotStudentTeacher.status === 400, `status=${aNotStudentTeacher.status}`);

  const aInactive = await post('/api/admin/transport/assignments', { studentId: S2_ID, routeId }, adminJar);
  check('assigning an Inactive student is 409 STUDENT_NOT_ACTIVE', aInactive.status === 409, `status=${aInactive.status}`);

  const aBadRoute = await post('/api/admin/transport/assignments', { studentId: FIXED_ID, routeId: 999999 }, adminJar);
  check('assignment on a missing route is 404 ROUTE_NOT_FOUND', aBadRoute.status === 404, `status=${aBadRoute.status}`);

  // capacity: vehicle capacity is 2, one student assigned -> assign the fixed student, then
  // a third Active student cannot fit... the only Active students are S1 + FIXED; after both
  // are assigned, S2 is Inactive. VEHICLE_AT_CAPACITY therefore needs capacity 1: bump down
  // is blocked (CAPACITY_BELOW_ASSIGNMENTS) — so test capacity with a second vehicle instead.
  const aFixed = await post('/api/admin/transport/assignments', { studentId: FIXED_ID, routeId }, adminJar);
  check('fixed staging student assigned (2 of 2 seats used)', aFixed.status === 200, `status=${aFixed.status}`);
  check(
    'two assignment rows exist',
    (await tlCount('transport_assignments')) === 2
  );

  // Delete guards while the route/vehicle are occupied.
  const rDelGuard = await del(`/api/admin/transport/routes/${routeId}`, adminJar);
  check('DELETE route with assigned students is 409 ROUTE_HAS_ASSIGNMENTS', rDelGuard.status === 409, `status=${rDelGuard.status}`);
  const vDelGuard = await del(`/api/admin/transport/vehicles/${vehicleId}`, adminJar);
  check('DELETE vehicle with assigned students is 409 VEHICLE_HAS_ACTIVE_ASSIGNMENTS', vDelGuard.status === 409, `status=${vDelGuard.status}`);

  const vCapacityGuard = await put(`/api/admin/transport/vehicles/${vehicleId}`, { capacity: 1, driverName: 'E2E Driver 2' }, adminJar);
  check('capacity below assigned count is 409 CAPACITY_BELOW_ASSIGNMENTS', vCapacityGuard.status === 409, `status=${vCapacityGuard.status}`);

  // VEHICLE_AT_CAPACITY: a second vehicle with capacity 1 and its own route.
  const v2Create = await post('/api/admin/transport/vehicles', {
    vehicleNumber: `stg-e2e-v2-${stamp}`,
    capacity: 1,
    driverName: 'E2E Driver V2',
  }, adminJar);
  const vehicle2Id = v2Create.body?.vehicleId;
  check('second vehicle created (capacity 1)', v2Create.status === 200 && Number.isInteger(vehicle2Id), `status=${v2Create.status}`);
  const r2Create = await post('/api/admin/transport/routes', { vehicleId: vehicle2Id, name: `stg-e2e-rv2-${stamp}` }, adminJar);
  const route2Id = r2Create.body?.routeId;
  check('route on the second vehicle created', r2Create.status === 200 && Number.isInteger(route2Id), `status=${r2Create.status}`);

  // Move FIXED to the capacity-1 vehicle, free S1's seat, and prove the vehicle is full.
  const unassignFixed = await del(`/api/admin/transport/assignments/${FIXED_ID}`, adminJar);
  check('unassign succeeds', unassignFixed.status === 200, `status=${unassignFixed.status}`);
  check('assignment row removed from DB', (await assignmentRow(FIXED_ID)) === null);
  const unassignAgain = await del(`/api/admin/transport/assignments/${FIXED_ID}`, adminJar);
  check('unassigning an unassigned student is 404 NOT_ASSIGNED', unassignAgain.status === 404, `status=${unassignAgain.status}`);

  const aFull = await post('/api/admin/transport/assignments', { studentId: FIXED_ID, routeId: route2Id }, adminJar);
  check('fixed student assigned to the capacity-1 vehicle', aFull.status === 200, `status=${aFull.status}`);
  const s1Unassign = await del(`/api/admin/transport/assignments/${S1_ID}`, adminJar);
  check('S1 unassigned to free a seat', s1Unassign.status === 200, `status=${s1Unassign.status}`);
  const aAtCapacity = await post('/api/admin/transport/assignments', { studentId: S1_ID, routeId: route2Id }, adminJar);
  check('assignment to a full capacity-1 vehicle is 409 VEHICLE_AT_CAPACITY', aAtCapacity.status === 409, `status=${aAtCapacity.status}`);

  // --- 8b. wired admin pages render the real management UI (read path) -----------
  const transportPage = await fetch(`${BASE_URL}/admin/transport`, {
    redirect: 'manual',
    headers: { cookie: adminJar },
  });
  const transportHtml = await transportPage.text();
  check(
    'GET /admin/transport renders the management UI with live rows',
    transportPage.status === 200 && transportHtml.includes('Transport management') && transportHtml.includes(VEHICLE_NUMBER),
    `status=${transportPage.status}`
  );
  const transportStudentPage = await fetch(`${BASE_URL}/admin/transport`, {
    redirect: 'manual',
    headers: { cookie: studentJar },
  });
  check(
    'student session is redirected away from /admin/transport',
    transportStudentPage.status === 307 || transportStudentPage.status === 302,
    `status=${transportStudentPage.status}`
  );

  // --- 9. clean deletes on an unoccupied vehicle -------------------------------------------
  const vDel = await del(`/api/admin/transport/vehicles/${vehicleId}`, adminJar);
  check('DELETE unoccupied vehicle succeeds', vDel.status === 200, `status=${vDel.status}`);
  check(
    'vehicle row gone and its route cascade-deleted',
    (await vehicleRow(vehicleId)) === null && (await routeRow(routeId)) === null
  );

  // --- 10. transport fee posting (append-only) ---------------------------------------------
  const feeCreate = await post('/api/admin/transport/fees', {
    studentId: FIXED_ID,
    period: PERIOD,
    amount: 500.25,
    paymentMethod: 'cash',
  }, adminJar);
  const feePaymentId = feeCreate.body?.paymentId;
  check('transport fee posted', feeCreate.status === 200 && Number.isInteger(feePaymentId), `status=${feeCreate.status}`);
  const feeDb = await paymentRow(feePaymentId);
  check(
    'payment row in DB matches (purpose transport, reference transport:PERIOD)',
    Number(feeDb?.student_id) === Number(FIXED_ID) && feeDb?.purpose === 'transport' &&
      Number(feeDb?.amount) === 500.25 && feeDb?.reference === `transport:${PERIOD}`,
    `purpose=${feeDb?.purpose}, reference=${feeDb?.reference}`
  );

  const feeDup = await post('/api/admin/transport/fees', { studentId: FIXED_ID, period: PERIOD, amount: 500.25 }, adminJar);
  check('duplicate transport fee is 409 DUPLICATE_PAYMENT', feeDup.status === 409, `status=${feeDup.status}`);
  const feeInactive = await post('/api/admin/transport/fees', { studentId: S2_ID, period: PERIOD, amount: 100 }, adminJar);
  check('fee for an Inactive student is 409 STUDENT_NOT_ACTIVE', feeInactive.status === 409, `status=${feeInactive.status}`);
  const feeTeacher = await post('/api/admin/transport/fees', { studentId: TEACHER_ID, period: PERIOD, amount: 100 }, adminJar);
  check('fee for a teacher is 400 NOT_A_STUDENT', feeTeacher.status === 400, `status=${feeTeacher.status}`);
  const feeMissing = await post('/api/admin/transport/fees', { studentId: 999999, period: PERIOD, amount: 100 }, adminJar);
  check('fee for a missing user is 400 NOT_A_STUDENT', feeMissing.status === 400, `status=${feeMissing.status}`);

  // --- 11. books: create / duplicate ISBN / update -------------------------------------------
  const bCreate = await post('/api/admin/library/books', {
    title: BOOK_TITLE,
    author: 'E2E Author',
    isbn: ISBN_A,
    category: 'Test',
    quantity: 2,
    publishedYear: 2020,
  }, adminJar);
  const bookId = bCreate.body?.bookId;
  check('book created', bCreate.status === 200 && Number.isInteger(bookId), `status=${bCreate.status}`);
  const bDb = await bookRow(bookId);
  check(
    'book row in DB matches (available initialised to quantity)',
    bDb?.title === BOOK_TITLE && bDb?.isbn === ISBN_A && Number(bDb?.quantity) === 2 && Number(bDb?.available) === 2
  );

  const bDup = await post('/api/admin/library/books', { title: 'Other', isbn: ISBN_A, quantity: 1 }, adminJar);
  check('duplicate ISBN is 409', bDup.status === 409, `status=${bDup.status}`);
  check('duplicate book attempt wrote no row', (await tlCount('books')) === 1);

  const bMissingPut = await put('/api/admin/library/books/999999', { title: 'X', quantity: 1 }, adminJar);
  check('PUT missing book is 404', bMissingPut.status === 404, `status=${bMissingPut.status}`);
  const bMissingDel = await del('/api/admin/library/books/999999', adminJar);
  check('DELETE missing book is 404', bMissingDel.status === 404, `status=${bMissingDel.status}`);

  const bUpdate = await put(`/api/admin/library/books/${bookId}`, {
    title: BOOK_TITLE,
    author: 'E2E Author 2',
    isbn: ISBN_A,
    quantity: 3,
  }, adminJar);
  check('book updated', bUpdate.status === 200, `status=${bUpdate.status}`);
  const bDb2 = await bookRow(bookId);
  check('book quantity updated to 3 (available follows with no active issues)', Number(bDb2?.quantity) === 3 && Number(bDb2?.available) === 3);

  // --- 12. issues: issue / duplicate / availability / guards ----------------------------------
  const iCreate = await post('/api/admin/library/issues', {
    bookId, studentId: FIXED_ID, dueDate: DUE_IN_7,
  }, adminJar);
  const issue1Id = iCreate.body?.issueId;
  check('book issued', iCreate.status === 200 && Number.isInteger(issue1Id), `status=${iCreate.status}`);
  const iDb = await issueRow(issue1Id);
  check(
    'issue row in DB matches (open, not returned)',
    Number(iDb?.book_id) === Number(bookId) && Number(iDb?.student_id) === Number(FIXED_ID) && iDb?.returned_at === null
  );
  check('available decremented to 2', Number((await bookRow(bookId))?.available) === 2);

  const iDup = await post('/api/admin/library/issues', { bookId, studentId: FIXED_ID, dueDate: DUE_IN_7 }, adminJar);
  check('second open issue for the same student/book is 409 ALREADY_ISSUED_TO_STUDENT', iDup.status === 409, `status=${iDup.status}`);

  const iPast = await post('/api/admin/library/issues', { bookId, studentId: FIXED_ID, dueDate: '2000-01-01' }, adminJar);
  check('past due date is 400 INVALID_DUE_DATE', iPast.status === 400, `status=${iPast.status}`);
  const iInactive = await post('/api/admin/library/issues', { bookId, studentId: S2_ID, dueDate: DUE_IN_7 }, adminJar);
  check('issue to an Inactive student is 409 STUDENT_NOT_ACTIVE', iInactive.status === 409, `status=${iInactive.status}`);
  const iTeacher = await post('/api/admin/library/issues', { bookId, studentId: TEACHER_ID, dueDate: DUE_IN_7 }, adminJar);
  check('issue to a teacher is 400 NOT_A_STUDENT', iTeacher.status === 400, `status=${iTeacher.status}`);
  const iBadBook = await post('/api/admin/library/issues', { bookId: 999999, studentId: FIXED_ID, dueDate: DUE_IN_7 }, adminJar);
  check('issue of a missing book is 404 BOOK_NOT_FOUND', iBadBook.status === 404, `status=${iBadBook.status}`);

  const i2Create = await post('/api/admin/library/issues', { bookId, studentId: S1_ID, dueDate: DUE_IN_7 }, adminJar);
  const issue2Id = i2Create.body?.issueId;
  check('second copy issued to the approved e2e student', i2Create.status === 200 && Number.isInteger(issue2Id), `status=${i2Create.status}`);
  check('available decremented to 1', Number((await bookRow(bookId))?.available) === 1);

  // NO_COPIES: quantity 1 book fully issued.
  const b2Create = await post('/api/admin/library/books', { title: `stg-e2e-b2-${stamp}`, isbn: ISBN_B, quantity: 1 }, adminJar);
  const book2Id = b2Create.body?.bookId;
  check('single-copy book created', b2Create.status === 200 && Number.isInteger(book2Id), `status=${b2Create.status}`);
  const i3Create = await post('/api/admin/library/issues', { bookId: book2Id, studentId: FIXED_ID, dueDate: DUE_IN_7 }, adminJar);
  const issue3Id = i3Create.body?.issueId;
  check('single copy issued', i3Create.status === 200 && Number.isInteger(issue3Id), `status=${i3Create.status}`);
  const iNoCopies = await post('/api/admin/library/issues', { bookId: book2Id, studentId: S1_ID, dueDate: DUE_IN_7 }, adminJar);
  check('issue when no copies are available is 409 NO_COPIES_AVAILABLE', iNoCopies.status === 409, `status=${iNoCopies.status}`);

  // --- 13. book update/delete guards under active issues ---------------------------------------
  const bQtyGuard = await put(`/api/admin/library/books/${bookId}`, {
    title: BOOK_TITLE, isbn: ISBN_A, quantity: 1,
  }, adminJar);
  check('quantity below active issues is 409 QUANTITY_BELOW_ACTIVE_ISSUES', bQtyGuard.status === 409, `status=${bQtyGuard.status}`);
  const bDelGuard = await del(`/api/admin/library/books/${bookId}`, adminJar);
  check('DELETE book with issue history is 409 BOOK_HAS_ISSUE_HISTORY', bDelGuard.status === 409, `status=${bDelGuard.status}`);

  // --- 14. return: fine recorded, inventory restored, guards ------------------------------------
  const retNeg = await post(`/api/admin/library/issues/${issue1Id}/return`, { fine: -1 }, adminJar);
  check('negative fine on return is 400 (route-level)', retNeg.status === 400, `status=${retNeg.status}`);
  const retMissing = await post('/api/admin/library/issues/999999/return', { fine: 0 }, adminJar);
  check('return of a missing issue is 404 ISSUE_NOT_FOUND', retMissing.status === 404, `status=${retMissing.status}`);

  const ret = await post(`/api/admin/library/issues/${issue1Id}/return`, { fine: 12.5 }, adminJar);
  check('return with a fine succeeds', ret.status === 200, `status=${ret.status}`);
  const retDb = await issueRow(issue1Id);
  check(
    'issue row after return (returned, fine 12.50, not yet paid)',
    retDb?.returned_at !== null && Number(retDb?.fine) === 12.5 && Number(retDb?.fine_paid) === 0
  );
  check('available restored to 2', Number((await bookRow(bookId))?.available) === 2);

  const retAgain = await post(`/api/admin/library/issues/${issue1Id}/return`, { fine: 0 }, adminJar);
  check('double return is 409 ALREADY_RETURNED', retAgain.status === 409, `status=${retAgain.status}`);

  // --- 15. fines: posting from the recorded fine, guards -----------------------------------------
  const fineMissing = await post('/api/admin/library/fines', { issueId: 999999 }, adminJar);
  check('fine for a missing issue is 404 ISSUE_NOT_FOUND', fineMissing.status === 404, `status=${fineMissing.status}`);
  const fineUnreturned = await post('/api/admin/library/fines', { issueId: issue3Id }, adminJar);
  check('fine on an unreturned issue is 409 ISSUE_NOT_RETURNED', fineUnreturned.status === 409, `status=${fineUnreturned.status}`);

  const fineCreate = await post('/api/admin/library/fines', { issueId: issue1Id, paymentMethod: 'cash' }, adminJar);
  const finePaymentId = fineCreate.body?.paymentId;
  check('library fine posted', fineCreate.status === 200 && Number.isInteger(finePaymentId), `status=${fineCreate.status}`);
  const fineDb = await paymentRow(finePaymentId);
  check(
    'fine payment row matches (purpose library_fine, amount from the recorded fine, reference library-fine:<issue>)',
    fineDb?.purpose === 'library_fine' && Number(fineDb?.amount) === 12.5 && fineDb?.reference === `library-fine:${issue1Id}`
  );
  check('book_issues.fine_paid set to 1', Number((await issueRow(issue1Id))?.fine_paid) === 1);

  const fineAgain = await post('/api/admin/library/fines', { issueId: issue1Id }, adminJar);
  check('second fine posting is 409 FINE_ALREADY_POSTED', fineAgain.status === 409, `status=${fineAgain.status}`);

  // NO_FINE_DUE: return the single-copy issue with no fine, then try to post one.
  const ret0 = await post(`/api/admin/library/issues/${issue3Id}/return`, { fine: 0 }, adminJar);
  check('return with fine 0 succeeds', ret0.status === 200, `status=${ret0.status}`);
  const fineZero = await post('/api/admin/library/fines', { issueId: issue3Id }, adminJar);
  check('fine on an issue with no fine due is 409 NO_FINE_DUE', fineZero.status === 409, `status=${fineZero.status}`);

  // --- 15b. wired library page renders the real management UI (read path) --------
  const libraryPage = await fetch(`${BASE_URL}/admin/library`, {
    redirect: 'manual',
    headers: { cookie: adminJar },
  });
  const libraryHtml = await libraryPage.text();
  check(
    'GET /admin/library renders the management UI with live rows',
    libraryPage.status === 200 && libraryHtml.includes('Library management') && libraryHtml.includes(BOOK_TITLE),
    `status=${libraryPage.status}`
  );

  // --- final state + cleanup -----------------------------------------------------------------------
  await cleanTLRows();
  const leftoverUsers = await scalar(`SELECT COUNT(*) AS n FROM ${STAGING_DB}.users WHERE username LIKE 'stg-e2e-%'`);
  const leftoverTL = {};
  for (const table of TL_TABLES) leftoverTL[table] = await tlCount(table);
  check(
    'post-run cleanup leaves no e2e users and no TL rows',
    leftoverUsers === 0 && Object.values(leftoverTL).every((n) => n === 0),
    `users=${leftoverUsers}, tl=${JSON.stringify(leftoverTL)}`
  );
} catch (error) {
  check('unexpected failure', false, String(error?.message ?? error).slice(0, 160));
  // Cleanup only when the pre-run gate proved all TL rows are test-created;
  // never as a side effect of an aborted safety gate.
  if (safeToClean) {
    try {
      await cleanTLRows();
    } catch {
      // best effort
    }
  }
} finally {
  child.kill();
  await rootDb.$disconnect();
}

// --- write machine-readable evidence (no secrets) -----------------------------------
writeFileSync(
  join(here, 'tl-writes-results.json'),
  JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      database: STAGING_DB,
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    },
    null,
    2
  )
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n[tl-e2e] ${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = failed > 0 ? 2 : 0;

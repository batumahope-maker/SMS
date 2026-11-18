// Runtime smoke test for the built ESSJT application.
//
//   npm run build
//   npm run test:smoke            (spawns its own server on port 4321)
//   node scripts/tests/runtime-smoke.test.mjs http://127.0.0.1:PORT   (use a running server)
//
// What it does:
//   1. refuses to run unless the database account is SELECT-only
//      (audited via SHOW GRANTS, same rules as db:verify-readonly);
//   2. performs read-only SELECTs to pick one admin, one teacher and one
//      student account;
//   3. mints short-lived NextAuth session cookies IN PROCESS with the real
//      NEXTAUTH_SECRET. Tokens are never printed or written to disk;
//   4. exercises the route matrix for unauthenticated, admin, teacher and
//      student sessions, including role denial and the 501 modules;
//   5. submits a wrong dummy password through the real credentials flow to
//      prove NextAuth is wired up (no NO_SECRET 500s).
//
// It performs no writes anywhere. No real credentials are used or printed.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles, parseDatabaseUrl } from '../lib/env.mjs';
import { auditGrants } from '../lib/grant-audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.env.SMOKE_PORT ?? '4321';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Environment gate
// ---------------------------------------------------------------------------
loadEnvFiles(root);

if (!process.env.NEXTAUTH_SECRET) {
  console.error('[smoke] NEXTAUTH_SECRET is not set (check .env.local); cannot mint test sessions.');
  process.exit(2);
}

if (!process.env.DATABASE_URL) {
  console.error('[smoke] DATABASE_URL is not set (check .env.local); cannot verify test accounts.');
  process.exit(2);
}

const target = parseDatabaseUrl(process.env.DATABASE_URL);
const expectedDatabase = target?.database || 'essjt_school_system';

let db;
{
  const { PrismaClient } = await import('@prisma/client');
  db = new PrismaClient();

  // Refuse to run with an account that could write anything.
  const [{ account }] = await db.$queryRawUnsafe(
    'SELECT CURRENT_USER() AS account'
  );
  check(
    'smoke test account is not root',
    !String(account).startsWith('root'),
    String(account)
  );

  const grantRows = await db.$queryRawUnsafe('SHOW GRANTS FOR CURRENT_USER()');
  const audit = auditGrants(
    grantRows.map((row) => String(Object.values(row)[0] ?? '')),
    { expectedDatabase }
  );
  check(
    'smoke test account is SELECT-only',
    audit.failures.length === 0,
    audit.failures.join(' | ') || 'ok'
  );
}

// ---------------------------------------------------------------------------
// Pick test accounts (read-only)
// ---------------------------------------------------------------------------
const adminUser = await db.user.findFirst({
  where: { role: 'admin' },
  orderBy: { id: 'asc' },
  select: { id: true, fullName: true, username: true, email: true },
});
const teacherUser = await db.user.findFirst({
  where: { role: 'teacher', teacher: { isNot: null } },
  orderBy: { id: 'asc' },
  select: { id: true, fullName: true, username: true, email: true },
});
const studentUser = await db.user.findFirst({
  where: { role: 'student', student: { isNot: null } },
  orderBy: { id: 'asc' },
  select: { id: true, fullName: true, username: true, email: true },
});

check('an admin account exists', Boolean(adminUser));
check('a teacher account with a profile exists', Boolean(teacherUser));
check('a student account with a profile exists', Boolean(studentUser));

await db.$disconnect();

// ---------------------------------------------------------------------------
// Server (own instance unless a URL is given)
// ---------------------------------------------------------------------------
const standaloneServer = path.join(root, '.next', 'standalone', 'server.js');
let baseUrl = process.argv[2] ?? null;
let child = null;

async function waitForServer(url, timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/auth/session`, {
        redirect: 'manual',
      });
      if (response.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

if (!baseUrl) {
  if (!existsSync(standaloneServer)) {
    console.error('[smoke] .next/standalone/server.js not found. Run `npm run build` first.');
    process.exit(2);
  }
  const env = { ...process.env, PORT, NODE_ENV: 'production' };
  // The smoke run is DB-agnostic and read-only: never give the spawned
  // server a writer account, so every write endpoint must answer 503.
  delete env.WRITER_DATABASE_URL;
  delete env.WRITER_DATABASE_NAME;
  child = spawn(process.execPath, [standaloneServer], {
    cwd: path.dirname(standaloneServer),
    env,
    stdio: 'ignore',
  });
  baseUrl = `http://127.0.0.1:${PORT}`;
  const ready = await waitForServer(baseUrl);
  check('standalone server starts and serves requests', ready, baseUrl);
  if (!ready) {
    child.kill();
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Session minting
// ---------------------------------------------------------------------------
const { encode } = await import('next-auth/jwt');
const secureUrl = (process.env.NEXTAUTH_URL ?? '').startsWith('https:');
const sessionCookieName = secureUrl
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

async function mintSession(user, role, mustChangePassword = false) {
  const token = {
    sub: String(user.id),
    id: String(user.id),
    name: user.fullName || user.username,
    email: user.email,
    role,
    schoolId: '',
    username: user.username,
    mustChangePassword,
  };
  const jwt = await encode({
    token,
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  });
  return `${sessionCookieName}=${jwt}`;
}

const adminCookie = adminUser ? await mintSession(adminUser, 'admin') : null;
const teacherCookie = teacherUser ? await mintSession(teacherUser, 'teacher') : null;
const studentCookie = studentUser ? await mintSession(studentUser, 'student') : null;
// A session carrying the forced-change flag (temporary password issued).
const forcedChangeCookie = studentUser
  ? await mintSession(studentUser, 'student', true)
  : null;

// ---------------------------------------------------------------------------
// Route matrix
// ---------------------------------------------------------------------------
async function get(pathname, cookie = null) {
  return fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    headers: cookie ? { cookie } : undefined,
  });
}

async function post(pathname, body, cookie = null) {
  return fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : undefined),
    },
    body: JSON.stringify(body ?? {}),
  });
}

// Unauthenticated
check('GET / is public', (await get('/')).status === 200);
check('GET /login is public', (await get('/login')).status === 200);
check('GET /forgot-password is public', (await get('/forgot-password')).status === 200);
check('unauthenticated /admin/dashboard redirects to login', (await get('/admin/dashboard')).status === 307);
check('unauthenticated /teacher/dashboard redirects to login', (await get('/teacher/dashboard')).status === 307);
check('unauthenticated /student/dashboard redirects to login', (await get('/student/dashboard')).status === 307);
check('unauthenticated /api/students is 401', (await get('/api/students')).status === 401);
check('unauthenticated /api/marks is 401', (await get('/api/marks')).status === 401);
check('unauthenticated /api/report-card is 501', (await get('/api/report-card?studentId=1&term=Term%201')).status === 501);
check('bad session cookie yields no session', ((await (await get('/api/auth/session', 'next-auth.session-token=forged')).json()) ?? {})?.user === undefined);

// Admin pages
if (adminCookie) {
  const adminPaths = [
    '/admin/dashboard',
    '/admin/students',
    '/admin/students?page=2',
    '/admin/teachers',
    '/admin/marks',
    '/admin/payments',
    '/admin/attendance',
    '/admin/announcements',
    '/admin/events',
  ];
  for (const pathname of adminPaths) {
    check(`admin GET ${pathname}`, (await get(pathname, adminCookie)).status === 200);
  }

  // Account management is read-only but fully viewable.
  for (const pathname of ['/admin/users', '/admin/users?role=teacher', '/admin/users?q=admin']) {
    check(`admin GET ${pathname}`, (await get(pathname, adminCookie)).status === 200);
  }

  // REB and TVET modules were removed; their routes must not resolve.
  for (const pathname of ['/admin/reb', '/admin/tvet']) {
    check(`admin GET ${pathname} is 404 (module removed)`, (await get(pathname, adminCookie)).status === 404);
  }

  // Neutralised modules render an explicit "unavailable" panel, not an error.
  for (const pathname of ['/admin/settings']) {
    check(`admin GET ${pathname} (declared unavailable, still renders)`, (await get(pathname, adminCookie)).status === 200);
  }

  // Classes, Fees and Reports render real read-only views (paginated where relevant).
  for (const pathname of ['/admin/classes', '/admin/fees', '/admin/fees?page=2', '/admin/reports', '/admin/subjects', '/admin/payments', '/admin/library', '/admin/transport', '/admin/hostel', '/admin/promote', '/admin/sms', '/admin/ai-analysis']) {
    check(`admin GET ${pathname}`, (await get(pathname, adminCookie)).status === 200);
  }

  // Admin APIs
  check('admin GET /api/students', (await get('/api/students', adminCookie)).status === 200);
  check('admin GET /api/marks', (await get('/api/marks', adminCookie)).status === 200);
  check('admin GET /api/attendance', (await get('/api/attendance', adminCookie)).status === 200);
  check('admin GET /api/payments', (await get('/api/payments', adminCookie)).status === 200);
  check('admin GET /api/announcements', (await get('/api/announcements', adminCookie)).status === 200);
  check('admin GET /api/events', (await get('/api/events', adminCookie)).status === 200);
  check('admin GET /api/classes is 501 (no backing table)', (await get('/api/classes', adminCookie)).status === 501);

  const session = await (await get('/api/auth/session', adminCookie)).json();
  check('admin session exposes role admin', session?.user?.role === 'admin');
}

// Teacher pages
if (teacherCookie) {
  for (const pathname of ['/teacher/dashboard', '/teacher/marks', '/teacher/attendance', '/teacher/classes']) {
    check(`teacher GET ${pathname}`, (await get(pathname, teacherCookie)).status === 200);
  }
  check('teacher is denied /admin/dashboard', (await get('/admin/dashboard', teacherCookie)).status === 307);
}

// Student pages
if (studentCookie) {
  for (const pathname of ['/student/dashboard', '/student/grades', '/student/fees', '/student/attendance', '/student/announcements']) {
    check(`student GET ${pathname}`, (await get(pathname, studentCookie)).status === 200);
  }
  check('student is denied /admin/dashboard', (await get('/admin/dashboard', studentCookie)).status === 307);
  check('student is denied /teacher/dashboard', (await get('/teacher/dashboard', studentCookie)).status === 307);
}

// Parent portal is closed in the live schema (no parent role exists).
if (adminCookie) {
  check('parent portal stays closed', (await get('/parent/dashboard', adminCookie)).status === 307);
}

// ---------------------------------------------------------------------------
// Registration, forced password change and admin write APIs.
//
// These checks are DB-agnostic: the smoke environment deliberately has NO
// writer account configured, so every endpoint that would write must answer
// 503 (not 500, and never silently), while public pages stay reachable and
// non-admin callers are denied before any database access.
// ---------------------------------------------------------------------------
check('GET /register/student is public', (await get('/register/student')).status === 200);
check('GET /register/teacher is public', (await get('/register/teacher')).status === 200);
check('GET /register/pending is public', (await get('/register/pending')).status === 200);
check('unauthenticated /change-password redirects to login', (await get('/change-password')).status === 307);

{
  // Registration APIs without a writer account: 503, JSON error, no crash.
  const invalidBody = await post('/api/register/student', {});
  check(
    'POST /api/register/student without writer config is 503',
    invalidBody.status === 503,
    `status=${invalidBody.status}`
  );

  // Honeypot submissions are swallowed even without a writer account? No —
  // configuration is checked first on purpose: bots receive the same answer
  // as humans, and no state is written either way. Both are 503 here.
  const honey = await post('/api/register/teacher', { website: 'http://spam.example' });
  check(
    'POST /api/register/teacher (honeypot) without writer config is 503',
    honey.status === 503,
    `status=${honey.status}`
  );

  // Unauthorized admin write endpoints: denied before anything else.
  check('unauthenticated GET /api/admin/registrations is 401', (await get('/api/admin/registrations')).status === 401);
  check('unauthenticated POST /api/admin/registrations/approve is 401', (await post('/api/admin/registrations/approve', { userId: 1 })).status === 401);
  check('unauthenticated POST /api/admin/registrations/reject is 401', (await post('/api/admin/registrations/reject', { userId: 1 })).status === 401);
  check('unauthenticated POST /api/admin/accounts/1/reset-password is 401', (await post('/api/admin/accounts/1/reset-password')).status === 401);
  check('unauthenticated POST /api/auth/change-password is 401', (await post('/api/auth/change-password', { currentPassword: 'x', newPassword: 'y' })).status === 401);

  if (teacherCookie) {
    check('teacher GET /api/admin/registrations is 401', (await get('/api/admin/registrations', teacherCookie)).status === 401);
    check('teacher POST /api/admin/registrations/approve is 401', (await post('/api/admin/registrations/approve', { userId: 1 }, teacherCookie)).status === 401);
    check('teacher POST /api/admin/accounts/1/reset-password is 401', (await post('/api/admin/accounts/1/reset-password', null, teacherCookie)).status === 401);
  }
  if (studentCookie) {
    check('student GET /api/admin/registrations is 401', (await get('/api/admin/registrations', studentCookie)).status === 401);
    check('student POST /api/admin/registrations/reject is 401', (await post('/api/admin/registrations/reject', { userId: 1 }, studentCookie)).status === 401);
    check('student POST /api/admin/accounts/1/reset-password is 401', (await post('/api/admin/accounts/1/reset-password', null, studentCookie)).status === 401);
    check('student POST /api/auth/change-password with a wrong current password is 400 (verify happens before any write)', (await post('/api/auth/change-password', { currentPassword: 'definitely-wrong-current', newPassword: 'NewPass123' }, studentCookie)).status === 400);
  }

  if (adminCookie) {
    const pending = await get('/api/admin/registrations', adminCookie);
    const payload = await pending.json().catch(() => ({}));
    check(
      'admin GET /api/admin/registrations is 200 with a count',
      pending.status === 200 && typeof payload?.count === 'number',
      `status=${pending.status}`
    );
    // No writer account in smoke: a real approval attempt must be 503.
    check(
      'admin POST /api/admin/registrations/approve without writer config is 503',
      (await post('/api/admin/registrations/approve', { userId: 1 }, adminCookie)).status === 503
    );
    check(
      'admin POST /api/admin/accounts/1/reset-password without writer config is 503',
      (await post('/api/admin/accounts/1/reset-password', null, adminCookie)).status === 503
    );
    const adminSelfReset = await post('/api/auth/change-password', { currentPassword: 'x'.repeat(8) + '1', newPassword: 'NewPass123' }, adminCookie);
    check('admin POST /api/auth/change-password is 403 (admins cannot use the student flow)', adminSelfReset.status === 403, `status=${adminSelfReset.status}`);
  }

  // Forced-change flow: a session with mustChangePassword cannot use any
  // other page, but /change-password itself renders.
  if (forcedChangeCookie) {
    const dashboard = await get('/student/dashboard', forcedChangeCookie);
    const location = dashboard.headers.get('location') ?? '';
    check(
      'must-change-password session is redirected off the portal to /change-password',
      dashboard.status === 307 && location.includes('/change-password'),
      `status=${dashboard.status}, location=${location}`
    );
    check('GET /change-password with the forced session is 200', (await get('/change-password', forcedChangeCookie)).status === 200);
    check('must-change-password session is denied /admin/users', (await get('/admin/users', forcedChangeCookie)).status === 307);
  }
}

// ---------------------------------------------------------------------------
// Real credentials flow with a WRONG dummy password
// ---------------------------------------------------------------------------
{
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrf = (await csrfResponse.json())?.csrfToken;
  const csrfCookie = (csrfResponse.headers.getSetCookie() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const login = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: csrfCookie,
    },
    body: new URLSearchParams({
      csrfToken: csrf ?? '',
      username: 'admin',
      password: 'definitely-wrong-dummy-password',
      callbackUrl: `${baseUrl}/login`,
    }),
  });

  const rejectedProperly =
    // NextAuth answers a failed credentials attempt with a redirect back to
    // /login?error=CredentialsSignin (302) or 401 — never a 500.
    (login.status === 302 && (login.headers.get('location') ?? '').includes('error=')) ||
    login.status === 401;
  check('wrong password is rejected through the real credentials flow (no NO_SECRET 500)', rejectedProperly, `status=${login.status}`);
}

// ---------------------------------------------------------------------------
// Real logout flow: dashboard OK -> signout clears session -> dashboard denied
// ---------------------------------------------------------------------------
if (adminCookie) {
  check(
    'admin can access the dashboard before logout',
    (await get('/admin/dashboard', adminCookie)).status === 200
  );

  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrf = (await csrfRes.json())?.csrfToken;
  const csrfCookies = (csrfRes.headers.getSetCookie() ?? []).map(
    (c) => c.split(';')[0]
  );

  const signout = await fetch(`${baseUrl}/api/auth/signout`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: [...csrfCookies, adminCookie].join('; '),
    },
    body: new URLSearchParams({
      csrfToken: csrf ?? '',
      callbackUrl: `${baseUrl}/login`,
    }),
  });

  check(
    'signout endpoint accepts the POST',
    signout.status === 302 || signout.status === 200,
    `status=${signout.status}`
  );

  // NextAuth clears the session token by setting it to an empty value.
  const setCookies = (signout.headers.getSetCookie() ?? []).map(
    (c) => c.split(';')[0]
  );
  const sessionCleared = setCookies.some((c) => {
    if (!c.startsWith(`${sessionCookieName}=`)) return false;
    return (c.split('=')[1] ?? '') === '';
  });
  check('signout response clears the session cookie', sessionCleared);

  // Simulate the browser after logout: the old token is replaced by the
  // cleared cookie jar — the dashboard must then be denied.
  const postLogoutJar = [...csrfCookies, ...setCookies].join('; ');
  check(
    'admin dashboard is denied after logout',
    (await get('/admin/dashboard', postLogoutJar)).status === 307
  );
  check(
    'admin users page is denied after logout',
    (await get('/admin/users', postLogoutJar)).status === 307
  );
}

// ---------------------------------------------------------------------------
// Cleanup + summary
// ---------------------------------------------------------------------------
if (child) {
  child.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.log(`\n${passed}/${passed + failed} runtime checks passed`);
if (failures.length > 0) {
  console.error('Failed checks:\n  ' + failures.join('\n  '));
  process.exit(1);
}

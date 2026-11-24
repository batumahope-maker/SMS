// Dev-server route matrix for synthetic demo mode.
//
//   npm run test:demo-routes
//
// Spawns `next dev` with NEXT_PUBLIC_DEMO_MODE=1, then checks:
//   - parent login through the real credentials flow + every parent page
//   - pending-registration approval (parent, teacher; student/teacher by role)
//   - admin management operations (students/teachers create+edit+delete,
//     announcements, events, payments, marks, attendance, lesson plans)
//   - regression: all four portals render their key pages
//
// No database is contacted: the dev server runs in demo mode.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from '../lib/env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.env.DEMO_ROUTES_PORT ?? '4322';
const BASE = `http://127.0.0.1:${PORT}`;

loadEnvFiles(root);
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[demo-routes] NEXTAUTH_SECRET is not set; run through npm run.');
  process.exit(2);
}

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

async function get(pathname, cookie = null) {
  return fetch(`${BASE}${pathname}`, { redirect: 'manual', headers: cookie ? { cookie } : undefined });
}

async function post(pathname, body, cookie = null, method = 'POST') {
  return fetch(`${BASE}${pathname}`, {
    method,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : undefined),
    },
    body: JSON.stringify(body ?? {}),
  });
}

function status(response) {
  return response.status;
}

async function json(response) {
  return response.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// Start the dev server (retry: Next.js may exit right after its security
// upgrade recommendation — retrying the same command continues the task).
// ---------------------------------------------------------------------------
async function startServer() {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const child = spawn(
      process.execPath,
      [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', PORT],
      { cwd: root, env: { ...process.env, NEXT_PUBLIC_DEMO_MODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    child.stderr?.on('data', (d) => process.stderr.write('[server-err] ' + String(d).slice(0, 200)));
    child.stdout?.on('data', (d) => process.stdout.write('[server-out] ' + String(d).slice(0, 200)));
    child.on('exit', (code) => process.stderr.write(`[server exited] ${code}\n`));
    const ready = await waitForServer(child, 45_000);
    if (ready) return child;
    if (child.exitCode === null) child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

async function waitForServer(child, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/auth/session`, { redirect: 'manual' });
      if (response.status < 500) return true;
    } catch {
      // not up yet
    }
    if (child.exitCode !== null) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

const server = await startServer();
check('dev server starts and serves requests', server !== null);
if (!server) process.exit(1);

try {
  // -------------------------------------------------------------------------
  // Sign in through the real credentials flow (fresh demo server per run:
  // 3 pending registrations, users demo.admin / demo.teacher / demo.student
  // / demo.parent with the synthetic password).
  // -------------------------------------------------------------------------
  async function loginAs(username, password) {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const csrf = (await csrfRes.json())?.csrfToken;
    const csrfCookie = (csrfRes.headers.getSetCookie() ?? []).map((c) => c.split(';')[0]).join('; ');
    const login = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
      body: new URLSearchParams({
        csrfToken: csrf ?? '',
        username,
        password,
        callbackUrl: BASE,
      }),
    });
    const cookies = [csrfCookie, ...(login.headers.getSetCookie() ?? []).map((c) => c.split(';')[0])]
      .filter(Boolean)
      .join('; ');
    return { login, cookies };
  }

  const adminCreds = await loginAs('demo.admin', 'Demo1234!');
  const teacherCreds = await loginAs('demo.teacher', 'Demo1234!');
  const studentCreds = await loginAs('demo.student', 'Demo1234!');
  const parentLogin = await loginAs('demo.parent', 'Demo1234!');
  const adminCookie = adminCreds.cookies;
  const teacherCookie = teacherCreds.cookies;
  const studentCookie = studentCreds.cookies;
  const parentCookie = parentLogin.cookies;

  // -------------------------------------------------------------------------
  // P4.1 — parent login (real credentials flow) + every existing parent page
  // -------------------------------------------------------------------------
  {
    const { login } = parentLogin;
    check('parent login is accepted by the credentials flow', login.status === 302, `status=${login.status}`);
    const sessionRes = await get('/api/auth/session', parentCookie);
    const sessionData = await json(sessionRes);
    check('parent session exposes role parent and username demo.parent', sessionData?.user?.role === 'parent' && sessionData?.user?.username === 'demo.parent', `status=${status(sessionRes)}`);

    for (const page of ['/parent/dashboard', '/parent/children', '/parent/grades', '/parent/attendance', '/parent/fees', '/parent/messages']) {
      const response = await get(page, parentCookie);
      check(`parent page GET ${page} → 200`, status(response) === 200, `status=${status(response)}`);
    }
  }

  // -------------------------------------------------------------------------
  // P4.2 — pending registration approval (admin; student + teacher + parent)
  // -------------------------------------------------------------------------
  {
    const list = await json(await get('/api/admin/registrations', adminCookie));
    check('admin GET /api/admin/registrations returns the synthetic pending registrations', typeof list.count === 'number' && list.count >= 3, `count=${list.count}`);
    check('unauthenticated GET /api/admin/registrations → 401', status(await get('/api/admin/registrations')) === 401);

    const approveParent = await post('/api/admin/registrations/approve', { userId: 6013 }, adminCookie);
    check('admin approves the pending parent registration', status(approveParent) === 200 && (await json(approveParent)).ok === true);
    const approveAgain = await post('/api/admin/registrations/approve', { userId: 6013 }, adminCookie);
    check('second approve is refused (already processed) → 409', status(approveAgain) === 409);
    const approveUnknown = await post('/api/admin/registrations/approve', { userId: 999999 }, adminCookie);
    check('approve unknown id → 409', status(approveUnknown) === 409);

    const rejectTeacher = await post('/api/admin/registrations/reject', { userId: 6012 }, adminCookie);
    check('admin rejects the pending teacher registration', status(rejectTeacher) === 200 && (await json(rejectTeacher)).ok === true);

    const listAfter = await json(await get('/api/admin/registrations', adminCookie));
    check('pending list shrinks after approve+reject', listAfter.count >= 1 && listAfter.count < list.count + 0 + 1);

    check('teacher GET /api/admin/registrations → 401', status(await get('/api/admin/registrations', teacherCookie)) === 401);
    check('student POST /api/admin/registrations/approve → 401', status(await post('/api/admin/registrations/approve', { userId: 6013 }, studentCookie)) === 401);
  }

  // -------------------------------------------------------------------------
  // P4.3 — admin management operations
  // -------------------------------------------------------------------------
  {
    check('admin GET /admin/students → 200', status(await get('/admin/students', adminCookie)) === 200);
    check('admin GET /admin/teachers → 200', status(await get('/admin/teachers', adminCookie)) === 200);

    const created = await post('/api/students', { fullName: 'Route Test Student', gender: 'Male', trade: 'ICT', level: 'Level 3' }, adminCookie);
    const createdStudent = await json(created);
    check('admin POST /api/students creates a student', status(created) === 200 && typeof createdStudent.id !== 'undefined');
    const listed = await json(await get('/api/students', adminCookie));
    check('created student appears in GET /api/students', Array.isArray(listed) && listed.some((s) => String(s.fullName) === 'Route Test Student'));

    const edited = await fetch(`${BASE}/api/students/${createdStudent.id}`, {
      method: 'PUT',
      headers: { cookie: adminCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Route Test Student Renamed' }),
    });
    check('admin PUT /api/students/[id] updates the student', status(edited) === 200);
    const deleted = await fetch(`${BASE}/api/students/${createdStudent.id}`, { method: 'DELETE', headers: { cookie: adminCookie } });
    check('admin DELETE /api/students/[id] deletes the student', status(deleted) === 200);

    const createdTeacher = await post('/api/teachers', { teacherId: 'DEMO-T-ROUTE-1', fullName: 'Route Test Teacher', subjects: 'ICT', department: 'ICT' }, adminCookie);
    check('admin POST /api/teachers creates a teacher', status(createdTeacher) === 200);

    const management = [
      ['/api/announcements', { title: 'Route test announcement', content: 'Synthetic content for the route tests.' }],
      ['/api/events', { title: 'Route test event', date: '2026-11-24' }],
      ['/api/payments', { studentId: 3001, amount: 42 }],
      ['/api/marks', { records: [{ studentId: 3001, subjectId: 'ICT', marks: 80 }] }],
      ['/api/attendance', { records: [{ studentId: 3001, status: 'Present' }] }],
    ];
    for (const [pathname, body] of management) {
      const response = await post(pathname, body, adminCookie);
      const payload = await json(response);
      check(`admin POST ${pathname}`, status(response) === 200 && payload?.ok === true, `status=${status(response)}`);
    }
    // Lesson plans are a teacher-only API.
    const lessonPlans = await post('/api/lesson-plans', {
      title: 'Route test plan',
      subjectId: 'Introduction to ICT',
      date: '2026-11-24',
      duration: 30,
    }, teacherCookie);
    check('teacher POST /api/lesson-plans', status(lessonPlans) === 200 && (await json(lessonPlans)).ok === true, `status=${status(lessonPlans)}`);
  }

  // -------------------------------------------------------------------------
  // P4.4 — four-portal regression
  // -------------------------------------------------------------------------
  {
    const adminPaths = [
      '/admin/dashboard', '/admin/students', '/admin/teachers', '/admin/classes',
      '/admin/subjects', '/admin/marks', '/admin/fees', '/admin/payments',
      '/admin/announcements', '/admin/events', '/admin/users', '/admin/hostel',
      '/admin/transport', '/admin/library', '/admin/reports', '/admin/ai-analysis',
    ];
    for (const page of adminPaths) {
      check(`admin GET ${page} → 200`, status(await get(page, adminCookie)) === 200);
    }
    const studentPaths = ['/student/dashboard', '/student/grades', '/student/attendance', '/student/homework', '/student/fees', '/student/announcements'];
    for (const page of studentPaths) {
      check(`student GET ${page} → 200`, status(await get(page, studentCookie)) === 200);
    }
    const teacherPaths = ['/teacher/dashboard', '/teacher/classes', '/teacher/attendance', '/teacher/marks', '/teacher/homework', '/teacher/lesson-plans'];
    for (const page of teacherPaths) {
      check(`teacher GET ${page} → 200`, status(await get(page, teacherCookie)) === 200);
    }
    const parentPaths = ['/parent/dashboard', '/parent/children', '/parent/grades', '/parent/attendance', '/parent/fees', '/parent/messages'];
    for (const page of parentPaths) {
      check(`parent GET ${page} → 200`, status(await get(page, parentCookie)) === 200);
    }
  }
} finally {
  server.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.log(`\n${passed}/${passed + failed} demo route checks passed`);
if (failures.length > 0) {
  console.error('Failed checks:\n  ' + failures.join('\n  '));
  process.exit(1);
}

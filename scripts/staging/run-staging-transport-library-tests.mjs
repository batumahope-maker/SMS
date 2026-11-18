// ESSJT staging verification — Transport & Library suite (AMENDMENT 7). STAGING ONLY.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/staging/run-staging-transport-library-tests.mjs
//
// Every procedure call is a single standalone statement on an autocommit
// connection with NO outer transaction (exactly how the application will call
// them). Concurrency tests use up to FOUR independent writer clients (separate
// connection pools) issuing calls in parallel. Row-level verification uses the
// root connection against the staging database only. No secrets are ever
// printed, logged, or written to any report.
//
// Exit codes: 0 = all PASS, 2 = at least one FAIL/SKIP (stop and report).

import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGING_DB = 'essjt_school_system_staging';
const LIVE_DB = 'essjt_school_system';
const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, 'staging.env'), 'utf8');
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');
const writerUrl = stripDefaultDb(
  env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL=')).split('=').slice(1).join('=')
);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

// Four independent writer clients (separate pools) for the concurrency tests.
const writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const writer2 = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const writer3 = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const writer4 = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const root = new PrismaClient({
  datasources: { db: { url: 'mysql://root@127.0.0.1:3306/' } },
});

const results = [];
const record = (id, name, status, evidence) => {
  results.push({ id, name, status, evidence });
  const mark = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${mark} [${id}] ${status}: ${name} — ${evidence}`);
};

const firstValue = (rows) => {
  const r = Array.isArray(rows) ? rows[0] : rows;
  if (r === null || r === undefined) return undefined;
  return typeof r === 'object' ? Object.values(r)[0] : r;
};

const callWriter = (sql) => writer.$queryRawUnsafe(`CALL ${STAGING_DB}.${sql}`);
const callWriter2 = (sql) => writer2.$queryRawUnsafe(`CALL ${STAGING_DB}.${sql}`);
const callWriter3 = (sql) => writer3.$queryRawUnsafe(`CALL ${STAGING_DB}.${sql}`);
const callWriter4 = (sql) => writer4.$queryRawUnsafe(`CALL ${STAGING_DB}.${sql}`);

// Concurrency tests must prove the ABSENCE of deadlock/lock-wait errors, never
// assume it. 1205 is included because a lock-wait timeout under the canonical
// lock order would also indicate a serialization defect worth failing on.
const isDeadlock = (e) =>
  /deadlock|\b1213\b|\b1205\b/i.test(String(e.message).replace(/\s+/g, ' '));
const noDeadlock = (settled) =>
  settled.every((r) => !(r.status === 'rejected' && isDeadlock(r.reason)));
const outcome = (r) => {
  if (r.status === 'fulfilled') return 'OK';
  const m = String(r.reason.message).replace(/\s+/g, ' ');
  return m.slice(0, 130);
};

async function expectWriterError(sql, expectedText) {
  try {
    await callWriter(sql);
    return { threw: false, matched: false, detail: 'no error thrown (call succeeded)' };
  } catch (e) {
    const m = String(e.message).replace(/\s+/g, ' ');
    return { threw: true, matched: m.includes(expectedText), detail: m.slice(0, 160) };
  }
}

const one = async (sql) => (await root.$queryRawUnsafe(sql))[0];
const scalar = async (sql) => Number(Object.values(await one(sql))[0]);
const countWhere = async (table, where) =>
  scalar(`SELECT COUNT(*) AS n FROM ${STAGING_DB}.${table} WHERE ${where}`);

const isDenied = (e) => /command denied/i.test(String(e.message).replace(/\s+/g, ' '));
const isFkError = (e) => /1451|Cannot delete or update a parent row|foreign key constraint fails/i.test(String(e.message));

// Removes all transport/library test rows (staging holds no other data in
// these tables) plus stg-test-* users, in FK-safe order. Idempotent.
async function cleanTestRows() {
  await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.book_issues`);
  await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.payments WHERE purpose IS NOT NULL OR reference LIKE 'stg-test-legacy-%'`
  );
  await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.books`);
  await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.transport_assignments`);
  await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.transport_routes`);
  await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.vehicles`);
  const nUsers = await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.students WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%') x)`
  );
  await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.teachers WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%') x)`
  );
  await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%'`
  );
  return { nUsers };
}

async function main() {
  const [me] = await root.$queryRawUnsafe('SELECT CURRENT_USER() AS a');
  if (!String(me.a).startsWith('root@')) throw new Error('expected root for staging tests');

  const cleaned = await cleanTestRows();
  console.log(`[tests] pre-run cleanup of prior test rows done (users removed: ${cleaned.nUsers})`);

  // =====================================================================
  // 1. Environment + staging/live separation
  // =====================================================================
  try {
    const liveNew = await root.$queryRawUnsafe(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?)',
      LIVE_DB, 'vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues'
    );
    const livePurpose = await root.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'purpose'", LIVE_DB
    );
    const liveTables = await root.$queryRawUnsafe(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', LIVE_DB
    );
    const stgNew = await root.$queryRawUnsafe(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?, ?)',
      STAGING_DB, 'vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues', 'payments'
    );
    const procs = await root.$queryRawUnsafe(
      'SELECT ROUTINE_NAME, SECURITY_TYPE, SQL_MODE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME LIKE ?',
      STAGING_DB, 'sp\\_%'
    );
    const names = procs.map((r) => String(r.ROUTINE_NAME));
    const NEW15 = ['sp_add_vehicle', 'sp_update_vehicle', 'sp_delete_vehicle', 'sp_add_route',
      'sp_update_route', 'sp_delete_route', 'sp_assign_student', 'sp_unassign_student',
      'sp_add_book', 'sp_update_book', 'sp_delete_book', 'sp_issue_book', 'sp_return_book',
      'sp_post_transport_fee', 'sp_post_library_fine'];
    const all15 = NEW15.every((n) => names.includes(n));
    const allDefiner = procs.filter((r) => NEW15.includes(String(r.ROUTINE_NAME)))
      .every((r) => String(r.SECURITY_TYPE) === 'DEFINER' && String(r.SQL_MODE).includes('STRICT_TRANS_TABLES'));
    const ok = Number(liveNew[0].n) === 0 && Number(livePurpose[0].n) === 0 &&
      Number(stgNew[0].n) === 6 && all15 && allDefiner;
    record(1, 'staging/live separation + 6 staging tables + 15 DEFINER routines under strict sql_mode',
      ok ? 'PASS' : 'FAIL',
      `live new tables=${Number(liveNew[0].n)} (must be 0), live purpose col=${Number(livePurpose[0].n)} (must be 0), live total tables=${Number(liveTables[0].n)}, staging new tables=${Number(stgNew[0].n)}, all 15 routines present=${all15}, DEFINER+strict=${allDefiner}`);
  } catch (e) { record(1, 'environment', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 2. Writer EXECUTE-only: direct access denied on every new table
  // =====================================================================
  try {
    const probes = [];
    for (const t of ['vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues', 'payments']) {
      probes.push([`${t}:SELECT`, `SELECT id FROM ${STAGING_DB}.${t} LIMIT 1`]);
    }
    probes.push(['vehicles:INSERT', `INSERT INTO ${STAGING_DB}.vehicles (vehicle_number, capacity, driver_name) VALUES ('__probe__', 1, 'x')`]);
    probes.push(['payments:DELETE', `DELETE FROM ${STAGING_DB}.payments WHERE id = -1`]);
    probes.push(['book_issues:DELETE', `DELETE FROM ${STAGING_DB}.book_issues WHERE id = -1`]);
    let allDenied = true;
    const detail = [];
    for (const [k, sql] of probes) {
      try {
        await writer.$queryRawUnsafe(sql);
        detail.push(`${k}=NOT DENIED`);
        allDenied = false;
      } catch (e) {
        detail.push(`${k}=${isDenied(e) ? 'DENIED' : 'OTHER'}`);
        if (!isDenied(e)) allDenied = false;
      }
    }
    record(2, 'writer EXECUTE-only principle: 9 direct-access probes all denied', allDenied ? 'PASS' : 'FAIL', detail.join(', '));
  } catch (e) { record(2, 'writer privilege probes', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 3. Exact SHOW GRANTS equals the approved privilege set (both accounts)
  // =====================================================================
  try {
    const parseGrant = (line) => {
      let s = String(line).replace(/`/g, '').replace(/ IDENTIFIED BY PASSWORD '[^']*'/, '');
      const acct = ((s.match(/TO\s+(.+)$/i) || [])[1] || '').replace(/'/g, '');
      const items = [];
      const exM = s.match(/GRANT EXECUTE ON PROCEDURE (\S+) TO/i);
      if (exM) { items.push(`EXECUTE@${exM[1]} -> ${acct}`); return items; }
      const onM = s.match(/\bON\s+(.+?)\s+TO\b/i);
      const target = onM ? onM[1] : null;
      let head = s.replace(/\bON\s+(.+?)\s+TO\b/i, '').replace(/^GRANT\s+/i, '');
      const re = /(SELECT|INSERT|UPDATE|DELETE|USAGE)\s*(\(([^)]*)\))?/gi;
      let m;
      while ((m = re.exec(head)) !== null) {
        const verb = m[1].toUpperCase();
        const cols = m[3] ? m[3].split(',').map((c) => c.trim()).sort().join(', ') : null;
        items.push(`${verb}${cols ? `(${cols})` : ''}@${target} -> ${acct}`);
      }
      return items;
    };
    const grab = async (who) =>
      (await root.$queryRawUnsafe(`SHOW GRANTS FOR '${who}'@'localhost'`))
        .flatMap((r) => parseGrant(Object.values(r)[0])).sort();

    const d = STAGING_DB;
    const REG6 = ['sp_register_student', 'sp_register_teacher', 'sp_approve_registration',
      'sp_reject_registration', 'sp_set_account_password', 'sp_change_own_password'];
    const NEW15 = ['sp_add_vehicle', 'sp_update_vehicle', 'sp_delete_vehicle', 'sp_add_route',
      'sp_update_route', 'sp_delete_route', 'sp_assign_student', 'sp_unassign_student',
      'sp_add_book', 'sp_update_book', 'sp_delete_book', 'sp_issue_book', 'sp_return_book',
      'sp_post_transport_fee', 'sp_post_library_fine'];
    const ex = (p, a) => `EXECUTE@${d}.${p} -> ${a}@localhost`;
    const cg = (verb, table, cols) =>
      `${verb.toUpperCase()}(${cols.split(',').map((c) => c.trim()).sort().join(', ')})@${d}.${table} -> essjt_definer@localhost`;

    const expectedWriter = [
      'USAGE@*.* -> essjt_writer@localhost',
      ...[...REG6, ...NEW15].map((p) => ex(p, 'essjt_writer')),
    ].sort();

    const expectedDefiner = [
      'USAGE@*.* -> essjt_definer@localhost',
      ...[...REG6, ...NEW15].map((p) => ex(p, 'essjt_definer')),
      cg('SELECT', 'users', 'id, username, email, password, role, must_change_password, registration_status, status'),
      cg('INSERT', 'users', 'username, password, full_name, email, phone, role, status, must_change_password, registration_status'),
      cg('UPDATE', 'users', 'password, status, must_change_password, registration_status'),
      cg('INSERT', 'students', 'user_id, student_id, trade, level, section, gender, date_of_birth, guardian_name, guardian_phone, enrollment_date'),
      cg('INSERT', 'teachers', 'user_id, teacher_id, subject, department, hire_date'),
      cg('SELECT', 'vehicles', 'id, capacity, vehicle_number'),
      cg('INSERT', 'vehicles', 'vehicle_number, vehicle_type, capacity, driver_name, driver_phone'),
      cg('UPDATE', 'vehicles', 'vehicle_type, capacity, driver_name, driver_phone'),
      'DELETE@' + d + '.vehicles -> essjt_definer@localhost',
      cg('SELECT', 'transport_routes', 'id, vehicle_id'),
      cg('INSERT', 'transport_routes', 'vehicle_id, name, stops, morning_time, evening_time, fare'),
      cg('UPDATE', 'transport_routes', 'vehicle_id, name, stops, morning_time, evening_time, fare'),
      'DELETE@' + d + '.transport_routes -> essjt_definer@localhost',
      cg('SELECT', 'transport_assignments', 'student_id, route_id'),
      cg('INSERT', 'transport_assignments', 'student_id, route_id, pickup_point'),
      'DELETE@' + d + '.transport_assignments -> essjt_definer@localhost',
      cg('SELECT', 'books', 'id, isbn, quantity, available'),
      cg('INSERT', 'books', 'title, author, isbn, category, publisher, published_year, quantity, available, location'),
      cg('UPDATE', 'books', 'title, author, isbn, category, publisher, published_year, quantity, available, location'),
      'DELETE@' + d + '.books -> essjt_definer@localhost',
      cg('SELECT', 'book_issues', 'id, book_id, student_id, returned_at, fine, fine_paid'),
      cg('INSERT', 'book_issues', 'book_id, student_id, issued_at, due_date'),
      cg('UPDATE', 'book_issues', 'returned_at, fine, fine_paid'),
      cg('INSERT', 'payments', 'student_id, purpose, amount, payment_date, payment_method, reference'),
    ].sort();

    const wr = await grab('essjt_writer');
    const dr = await grab('essjt_definer');
    const writerOk = JSON.stringify(wr) === JSON.stringify(expectedWriter);
    const definerOk = JSON.stringify(dr) === JSON.stringify(expectedDefiner);
    let diff = '';
    if (!writerOk) diff += ' WRITER diff: got ' + JSON.stringify(wr).slice(0, 250);
    if (!definerOk) diff += ' DEFINER diff: got ' + JSON.stringify(dr).slice(0, 350) + ' expected ' + JSON.stringify(expectedDefiner).slice(0, 350);
    record(3, 'exact SHOW GRANTS equals the approved set (writer: USAGE+21 EXECUTE only; definer: 46 items incl. additive users.status read)',
      writerOk && definerOk ? 'PASS' : 'FAIL',
      writerOk && definerOk ? 'writer 22 grants / definer 46 grants — exact normalized-set match; no DELETE on book_issues or payments' : diff.trim());
  } catch (e) { record(3, 'exact SHOW GRANTS', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 4. Test students via the EXISTING registration procedures (cross-feature)
  // =====================================================================
  let idS0, idTP1, idTP2, idTP3, idTP4, idTeacher;
  try {
    const h = 'x'; // passwords are not checked for format in staging dummy? No—registration validates bcrypt.
    const hash = (await import('bcryptjs')).default.hashSync('staging-test-password-tl', 10);
    const reg = (u, name) =>
      callWriter(`sp_register_student(${q(u)}, ${q(hash)}, ${q(name)}, ${q(u + '@example.test')}, ${q('0000000000')}, ${q('Synthetic Trade')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('Staging Guardian')}, ${q('0000000000')}, '2024-01-01')`);
    const rows1 = await reg('stg-test-tp1', 'Test Student TP1');
    const rows2 = await reg('stg-test-tp2', 'Test Student TP2');
    const rows3 = await reg('stg-test-tp3', 'Test Student TP3');
    const rows4 = await reg('stg-test-tp4', 'Test Student TP4 (pending)');
    idTP1 = Number(firstValue(rows1)); idTP2 = Number(firstValue(rows2));
    idTP3 = Number(firstValue(rows3)); idTP4 = Number(firstValue(rows4));
    await callWriter(`sp_approve_registration(${idTP1})`);
    await callWriter(`sp_approve_registration(${idTP2})`);
    await callWriter(`sp_approve_registration(${idTP3})`);
    idS0 = Number((await one(`SELECT id AS v FROM ${STAGING_DB}.users WHERE username = 'stg-student'`)).v);
    idTeacher = Number((await one(`SELECT id AS v FROM ${STAGING_DB}.users WHERE username = 'stg-teacher'`)).v);
    const st = async (id) => String((await one(`SELECT status FROM ${STAGING_DB}.users WHERE id = ${id}`)).status);
    const ok = (await st(idTP1)) === 'Active' && (await st(idTP2)) === 'Active' &&
      (await st(idTP3)) === 'Active' && (await st(idTP4)) === 'Inactive';
    record(4, '4 test students created via registration procedures (tp1-tp3 approved Active, tp4 pending)',
      ok ? 'PASS' : 'FAIL', `stg-student=${idS0}, tp1=${idTP1}, tp2=${idTP2}, tp3=${idTP3}, tp4=${idTP4} (pending), teacher=${idTeacher}`);
  } catch (e) { record(4, 'test students setup', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 5-11. Vehicles + routes CRUD and guards
  // =====================================================================
  let idVA, idVB, idVC, idRA, idRB, idRC1, idRC2;
  try {
    const rows = await callWriter(`sp_add_vehicle(${q('STG-BUS-A')}, ${q('Bus')}, 2, ${q('Driver A')}, ${q('0000000001')})`);
    idVA = Number(firstValue(rows));
    const v = await one(`SELECT vehicle_number, capacity FROM ${STAGING_DB}.vehicles WHERE id = ${idVA}`);
    record(5, 'sp_add_vehicle happy path', v.vehicle_number === 'STG-BUS-A' && Number(v.capacity) === 2 ? 'PASS' : 'FAIL', `vehicle_id=${idVA}, capacity=${v.capacity}`);
  } catch (e) { record(5, 'sp_add_vehicle happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_add_vehicle(${q('STG-BUS-A')}, ${q('Bus')}, 2, ${q('X')}, NULL)`, 'DUPLICATE_VEHICLE_NUMBER');
    record(6, 'sp_add_vehicle duplicate number rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(6, 'duplicate vehicle number', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_add_vehicle(${q('STG-BUS-ZERO')}, NULL, 0, ${q('X')}, NULL)`, 'INVALID_CAPACITY');
    const extras = await countWhere('vehicles', `vehicle_number = 'STG-BUS-ZERO'`);
    record(7, 'sp_add_vehicle capacity 0 rejected, nothing inserted',
      r.threw && r.matched && extras === 0 ? 'PASS' : 'FAIL', `${r.detail}; rows_inserted=${extras}`);
  } catch (e) { record(7, 'invalid capacity', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const rows = await callWriter(`sp_add_vehicle(${q('STG-VAN-B')}, ${q('Van')}, 1, ${q('Driver B')}, NULL)`);
    idVB = Number(firstValue(rows));
    record(8, 'sp_add_vehicle second vehicle (STG-VAN-B, capacity 1)', Number.isInteger(idVB) ? 'PASS' : 'FAIL', `vehicle_id=${idVB}`);
  } catch (e) { record(8, 'sp_add_vehicle vehB', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const rows = await callWriter(`sp_add_route(${idVA}, ${q('Route A')}, ${q('["Stop 1","Stop 2"]')}, '07:00:00', '15:30:00', 5000.00)`);
    idRA = Number(firstValue(rows));
    const r = await one(`SELECT vehicle_id, name, fare FROM ${STAGING_DB}.transport_routes WHERE id = ${idRA}`);
    record(9, 'sp_add_route happy path', Number(r.vehicle_id) === idVA && r.name === 'Route A' ? 'PASS' : 'FAIL', `route_id=${idRA}, vehicle_id=${r.vehicle_id}, fare=${r.fare}`);
  } catch (e) { record(9, 'sp_add_route happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_add_route(999999, ${q('Ghost')}, NULL, NULL, NULL, 0)`, 'VEHICLE_NOT_FOUND');
    record(10, 'sp_add_route unknown vehicle rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(10, 'sp_add_route unknown vehicle', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_update_vehicle(999999, ${q('Bus')}, 5, ${q('X')}, NULL)`, 'VEHICLE_NOT_FOUND');
    record(11, 'sp_update_vehicle unknown id rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(11, 'sp_update_vehicle unknown', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 12-21. Assignments: happy path, guards, capacity, concurrency
  // =====================================================================
  try {
    await callWriter(`sp_assign_student(${idS0}, ${idRA}, ${q('Main Gate')})`);
    const a = await countWhere('transport_assignments', `student_id = ${idS0} AND route_id = ${idRA}`);
    record(12, 'sp_assign_student happy path', a === 1 ? 'PASS' : 'FAIL', `assignment rows=${a}`);
  } catch (e) { record(12, 'sp_assign_student happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_assign_student(${idTeacher}, ${idRA}, NULL)`, 'NOT_A_STUDENT');
    record(13, 'sp_assign_student teacher rejected (NOT_A_STUDENT)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(13, 'NOT_A_STUDENT', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_assign_student(${idTP4}, ${idRA}, NULL)`, 'STUDENT_NOT_ACTIVE');
    record(14, 'sp_assign_student pending student rejected (STUDENT_NOT_ACTIVE)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(14, 'STUDENT_NOT_ACTIVE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_assign_student(${idTP1}, 999999, NULL)`, 'ROUTE_NOT_FOUND');
    record(15, 'sp_assign_student unknown route rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(15, 'ROUTE_NOT_FOUND', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_assign_student(${idTP1}, ${idRA}, ${q('Gate 2')})`);
    const n = await countWhere('transport_assignments', `route_id = ${idRA}`);
    record(16, 'sp_assign_student second seat fills capacity 2', n === 2 ? 'PASS' : 'FAIL', `assignments on Route A=${n}`);
  } catch (e) { record(16, 'assign second student', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_assign_student(${idTP2}, ${idRA}, NULL)`, 'VEHICLE_AT_CAPACITY');
    const n = await countWhere('transport_assignments', `route_id = ${idRA}`);
    record(17, 'sp_assign_student over capacity rejected (VEHICLE_AT_CAPACITY), count unchanged',
      r.threw && r.matched && n === 2 ? 'PASS' : 'FAIL', `${r.detail}; assignments=${n}`);
  } catch (e) { record(17, 'sequential over-capacity', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const rowsB = await callWriter(`sp_add_route(${idVB}, ${q('Route B')}, NULL, NULL, NULL, 3000.00)`);
    idRB = Number(firstValue(rowsB));
    // AMENDMENT 3 concurrency: two parallel writer clients race for the last seat.
    const [res2, res3] = await Promise.allSettled([
      callWriter(`sp_assign_student(${idTP2}, ${idRB}, NULL)`),
      callWriter2(`sp_assign_student(${idTP3}, ${idRB}, NULL)`),
    ]);
    const outcome = (r) => r.status === 'fulfilled' ? 'OK' : String(r.reason.message).replace(/\s+/g, ' ');
    const show = (r) => r.status === 'fulfilled' ? 'OK' : outcome(r).slice(0, 110);
    const oneOk = (res2.status === 'fulfilled') !== (res3.status === 'fulfilled');
    const loserMsg = res2.status === 'rejected' ? outcome(res2) : outcome(res3);
    const loserIsCap = loserMsg.includes('VEHICLE_AT_CAPACITY');
    const total = await countWhere('transport_assignments', `route_id = ${idRB}`);
    // reset: remove the winner so later tests start from a clean slate
    const winnerId = res2.status === 'fulfilled' ? idTP2 : idTP3;
    await callWriter(`sp_unassign_student(${winnerId})`);
    record(18, 'CONCURRENT assignment race: exactly one of two parallel requests wins (VEHICLE_AT_CAPACITY for the loser)',
      oneOk && loserIsCap && total === 1 ? 'PASS' : 'FAIL',
      `tp2=${show(res2)} | tp3=${show(res3)} | rows=${total} | winner unassigned for state reset`);
  } catch (e) { record(18, 'concurrent assignment race', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_assign_student(${idTP1}, ${idRA}, NULL)`, 'ALREADY_ASSIGNED');
    record(19, 'sp_assign_student already-assigned student rejected (ALREADY_ASSIGNED)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(19, 'ALREADY_ASSIGNED', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_unassign_student(${idTP1})`);
    const n = await countWhere('transport_assignments', `student_id = ${idTP1}`);
    record(20, 'sp_unassign_student happy path', n === 0 ? 'PASS' : 'FAIL', `tp1 assignment rows after=${n}`);
  } catch (e) { record(20, 'sp_unassign_student happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_assign_student(${idTP1}, ${idRA}, ${q('Gate 2')})`);
    const n = await countWhere('transport_assignments', `student_id = ${idTP1} AND route_id = ${idRA}`);
    record(21, 're-assign after unassign works', n === 1 ? 'PASS' : 'FAIL', `tp1 reassigned=${n}`);
  } catch (e) { record(21, 're-assign after unassign', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_update_vehicle(${idVA}, ${q('Bus')}, 1, ${q('Driver A')}, NULL)`, 'CAPACITY_BELOW_ASSIGNMENTS');
    const cap = Number((await one(`SELECT capacity FROM ${STAGING_DB}.vehicles WHERE id = ${idVA}`)).capacity);
    record(22, 'AMENDMENT 3 capacity floor: reducing below assignments rejected, capacity unchanged',
      r.threw && r.matched && cap === 2 ? 'PASS' : 'FAIL', `${r.detail}; capacity still=${cap}`);
  } catch (e) { record(22, 'capacity floor', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_update_vehicle(${idVA}, ${q('Big Bus')}, 3, ${q('Driver A2')}, ${q('0000000002')})`);
    const v = await one(`SELECT vehicle_type, capacity, driver_name FROM ${STAGING_DB}.vehicles WHERE id = ${idVA}`);
    record(23, 'sp_update_vehicle happy path', v.vehicle_type === 'Big Bus' && Number(v.capacity) === 3 ? 'PASS' : 'FAIL', `type=${v.vehicle_type}, capacity=${v.capacity}, driver=${v.driver_name}`);
  } catch (e) { record(23, 'sp_update_vehicle happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_update_route(${idRA}, ${idVB}, ${q('Route A')}, NULL, NULL, NULL, 5000.00)`, 'CAPACITY_BELOW_ASSIGNMENTS');
    const vid = Number((await one(`SELECT vehicle_id FROM ${STAGING_DB}.transport_routes WHERE id = ${idRA}`)).vehicle_id);
    record(24, 'AMENDMENT 3 route move to smaller vehicle rejected, route unchanged',
      r.threw && r.matched && vid === idVA ? 'PASS' : 'FAIL', `${r.detail}; route still on vehicle_id=${vid}`);
  } catch (e) { record(24, 'route move capacity guard', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_update_route(${idRA}, ${idVA}, ${q('Route A Renamed')}, ${q('["Stop 1","Stop 2","Stop 3"]')}, '07:15:00', '15:45:00', 5500.00)`);
    const r = await one(`SELECT name, fare FROM ${STAGING_DB}.transport_routes WHERE id = ${idRA}`);
    record(25, 'sp_update_route happy path', r.name === 'Route A Renamed' && Number(r.fare) === 5500 ? 'PASS' : 'FAIL', `name=${r.name}, fare=${r.fare}`);
  } catch (e) { record(25, 'sp_update_route happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_update_route(999999, ${idVA}, ${q('X')}, NULL, NULL, NULL, 0)`, 'ROUTE_NOT_FOUND');
    record(26, 'sp_update_route unknown id rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(26, 'sp_update_route unknown', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_delete_vehicle(${idVA})`, 'VEHICLE_HAS_ACTIVE_ASSIGNMENTS');
    const still = await countWhere('vehicles', `id = ${idVA}`);
    record(27, 'AMENDMENT 5: deleting vehicle with active assignments rejected, vehicle survives',
      r.threw && r.matched && still === 1 ? 'PASS' : 'FAIL', `${r.detail}; vehicle rows=${still}`);
  } catch (e) { record(27, 'vehicle deletion guard', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_delete_route(${idRA})`, 'ROUTE_HAS_ASSIGNMENTS');
    const still = await countWhere('transport_routes', `id = ${idRA}`);
    record(28, 'AMENDMENT 5: deleting route with assignments rejected, route survives',
      r.threw && r.matched && still === 1 ? 'PASS' : 'FAIL', `${r.detail}; route rows=${still}`);
  } catch (e) { record(28, 'route deletion guard', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_unassign_student(${idTP3})`, 'NOT_ASSIGNED');
    record(29, 'sp_unassign_student not-assigned student rejected (NOT_ASSIGNED)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(29, 'NOT_ASSIGNED', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 30-35. CASCADE / RESTRICT interaction (AMENDMENT 5)
  // =====================================================================
  try {
    await callWriter(`sp_assign_student(${idTP2}, ${idRB}, NULL)`);
    const n = await countWhere('transport_assignments', `route_id = ${idRB}`);
    record(30, 'assign tp2 to Route B (fills vehB capacity 1)', n === 1 ? 'PASS' : 'FAIL', `assignments=${n}`);
  } catch (e) { record(30, 'assign tp2 to rB', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_delete_vehicle(${idVB})`, 'VEHICLE_HAS_ACTIVE_ASSIGNMENTS');
    record(31, 'sp_delete_vehicle vehB rejected while assignment exists', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(31, 'vehB deletion guard', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    // The FK backstop proves the interaction: a direct delete of the vehicle
    // must be blocked by the assignments' RESTRICT (it must NOT cascade away
    // routes and orphan the students behind a RESTRICT they never consented to).
    let blocked = false;
    try {
      await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.vehicles WHERE id = ${idVB}`);
    } catch (e) { blocked = isFkError(e); }
    const stillV = await countWhere('vehicles', `id = ${idVB}`);
    const stillR = await countWhere('transport_routes', `id = ${idRB}`);
    record(32, 'CASCADE/RESTRICT interaction: direct vehicle delete blocked by RESTRICT (1451), nothing cascaded',
      blocked && stillV === 1 && stillR === 1 ? 'PASS' : 'FAIL', `fk_blocked=${blocked}, vehicle_rows=${stillV}, route_rows=${stillR}`);
  } catch (e) { record(32, 'FK interaction vehicle', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_unassign_student(${idTP2})`);
    await callWriter(`sp_delete_vehicle(${idVB})`);
    const v = await countWhere('vehicles', `id = ${idVB}`);
    const r = await countWhere('transport_routes', `id = ${idRB}`);
    record(33, 'AMENDMENT 5 CASCADE: deleting vehicle without assignments removes it AND cascades its route',
      v === 0 && r === 0 ? 'PASS' : 'FAIL', `vehicle rows=${v}, cascaded route rows=${r}`);
  } catch (e) { record(33, 'vehicle CASCADE chain', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const rows = await callWriter(`sp_add_vehicle(${q('STG-BUS-C')}, ${q('Bus')}, 10, ${q('Driver C')}, NULL)`);
    idVC = Number(firstValue(rows));
    const r1 = Number(firstValue(await callWriter(`sp_add_route(${idVC}, ${q('Route C1')}, NULL, NULL, NULL, 0)`)));
    const r2 = Number(firstValue(await callWriter(`sp_add_route(${idVC}, ${q('Route C2')}, NULL, NULL, NULL, 0)`)));
    await callWriter(`sp_delete_vehicle(${idVC})`);
    const routes = await countWhere('transport_routes', `vehicle_id = ${idVC}`);
    const veh = await countWhere('vehicles', `id = ${idVC}`);
    record(34, 'AMENDMENT 5 CASCADE: vehicle delete removes ALL its routes (2 routes gone)',
      veh === 0 && routes === 0 && r1 > 0 && r2 > 0 ? 'PASS' : 'FAIL', `created routes ${r1},${r2}; after delete: vehicle=${veh}, routes=${routes}`);
  } catch (e) { record(34, 'multi-route CASCADE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    let blocked = false;
    try {
      await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.transport_routes WHERE id = ${idRA}`);
    } catch (e) { blocked = isFkError(e); }
    const still = await countWhere('transport_routes', `id = ${idRA}`);
    record(35, 'AMENDMENT 5 RESTRICT: direct route delete blocked by FK (1451) while assignment exists',
      blocked && still === 1 ? 'PASS' : 'FAIL', `fk_blocked=${blocked}, route rows=${still}`);
  } catch (e) { record(35, 'FK interaction route', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 36-50. Library: books, issues, returns, inventory
  // =====================================================================
  let idBA, idBB, idBC, idIss1, idIssB1, idIssC1, idIssA2, idIssA3;
  try {
    idBA = Number(firstValue(await callWriter(`sp_add_book(${q('Staging Book A')}, ${q('Author A')}, ${q('STG-ISBN-1')}, ${q('Fiction')}, ${q('Staging Press')}, 2020, 2, ${q('Shelf 1')})`)));
    const b = await one(`SELECT quantity, available FROM ${STAGING_DB}.books WHERE id = ${idBA}`);
    record(36, 'sp_add_book happy path (available initialised = quantity)',
      Number(b.quantity) === 2 && Number(b.available) === 2 ? 'PASS' : 'FAIL', `book_id=${idBA}, quantity=${b.quantity}, available=${b.available}`);
  } catch (e) { record(36, 'sp_add_book happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_add_book(${q('Dup ISBN')}, NULL, ${q('STG-ISBN-1')}, NULL, NULL, NULL, 1, NULL)`, 'DUPLICATE_ISBN');
    record(37, 'sp_add_book duplicate isbn rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(37, 'duplicate isbn', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_add_book(${q('Neg Qty')}, NULL, NULL, NULL, NULL, NULL, -1, NULL)`, 'INVALID_QUANTITY');
    const extras = await countWhere('books', `title = 'Neg Qty'`);
    record(38, 'sp_add_book negative quantity rejected, nothing inserted',
      r.threw && r.matched && extras === 0 ? 'PASS' : 'FAIL', `${r.detail}; rows=${extras}`);
  } catch (e) { record(38, 'invalid quantity', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    idBB = Number(firstValue(await callWriter(`sp_add_book(${q('Staging Book B')}, NULL, ${q('STG-ISBN-2')}, NULL, NULL, NULL, 1, NULL)`)));
    idBC = Number(firstValue(await callWriter(`sp_add_book(${q('Staging Book C (no isbn)')}, NULL, NULL, NULL, NULL, NULL, 1, NULL)`)));
    record(39, 'sp_add_book bookB (qty 1, isbn) + bookC (qty 1, NULL isbn allowed)',
      Number.isInteger(idBB) && Number.isInteger(idBC) ? 'PASS' : 'FAIL', `bookB=${idBB}, bookC=${idBC}`);
  } catch (e) { record(39, 'bookB/bookC', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    idIss1 = Number(firstValue(await callWriter(`sp_issue_book(${idBA}, ${idS0}, DATE_ADD(CURDATE(), INTERVAL 14 DAY))`)));
    const avail = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBA}`)).available);
    const iss = await one(`SELECT issued_at, due_date, returned_at FROM ${STAGING_DB}.book_issues WHERE id = ${idIss1}`);
    record(40, 'sp_issue_book happy path (AMENDMENT 4: insert + inventory decrement atomic)',
      avail === 1 && iss.returned_at === null && iss.issued_at !== null ? 'PASS' : 'FAIL', `issue_id=${idIss1}, available=${avail}, returned_at=${iss.returned_at}`);
  } catch (e) { record(40, 'sp_issue_book happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_issue_book(999999, ${idS0}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`, 'BOOK_NOT_FOUND');
    record(41, 'sp_issue_book unknown book rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(41, 'unknown book', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_issue_book(${idBA}, ${idS0}, DATE_SUB(CURDATE(), INTERVAL 1 DAY))`, 'INVALID_DUE_DATE');
    record(42, 'sp_issue_book past due date rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(42, 'INVALID_DUE_DATE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_issue_book(${idBA}, ${idS0}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`, 'ALREADY_ISSUED_TO_STUDENT');
    record(43, 'sp_issue_book same student holding book rejected (ALREADY_ISSUED_TO_STUDENT)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(43, 'ALREADY_ISSUED_TO_STUDENT', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    idIssB1 = Number(firstValue(await callWriter(`sp_issue_book(${idBB}, ${idTP1}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`)));
    const availB = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBB}`)).available);
    const r = await expectWriterError(`sp_issue_book(${idBB}, ${idTP2}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`, 'NO_COPIES_AVAILABLE');
    const availAfter = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBB}`)).available);
    record(44, 'sp_issue_book last copy then NO_COPIES_AVAILABLE (inventory never negative)',
      availB === 0 && r.threw && r.matched && availAfter === 0 ? 'PASS' : 'FAIL', `avail after first=${availB}, ${r.detail}, avail after rejected=${availAfter}`);
  } catch (e) { record(44, 'NO_COPIES_AVAILABLE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_update_book(${idBA}, ${q('Staging Book A')}, ${q('Author A')}, ${q('STG-ISBN-1')}, ${q('Fiction')}, ${q('Staging Press')}, 2020, 0, ${q('Shelf 1')})`, 'QUANTITY_BELOW_ACTIVE_ISSUES');
    const qty = Number((await one(`SELECT quantity FROM ${STAGING_DB}.books WHERE id = ${idBA}`)).quantity);
    record(45, 'AMENDMENT 4 quantity floor: qty below active issues rejected, quantity unchanged',
      r.threw && r.matched && qty === 2 ? 'PASS' : 'FAIL', `${r.detail}; quantity still=${qty}`);
  } catch (e) { record(45, 'quantity floor', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_update_book(${idBA}, ${q('Staging Book A (ed.2)')}, ${q('Author A')}, ${q('STG-ISBN-1')}, ${q('Fiction')}, ${q('Staging Press')}, 2021, 3, ${q('Shelf 2')})`);
    const b = await one(`SELECT quantity, available FROM ${STAGING_DB}.books WHERE id = ${idBA}`);
    record(46, 'sp_update_book happy path (delta-adjusted available clamped)',
      Number(b.quantity) === 3 && Number(b.available) === 2 ? 'PASS' : 'FAIL', `quantity=${b.quantity}, available=${b.available}`);
  } catch (e) { record(46, 'sp_update_book happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_return_book(${idIss1}, 500.00)`);
    const iss = await one(`SELECT returned_at, fine FROM ${STAGING_DB}.book_issues WHERE id = ${idIss1}`);
    const avail = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBA}`)).available);
    record(47, 'sp_return_book happy path (AMENDMENT 4: return + inventory increment atomic)',
      iss.returned_at !== null && Number(iss.fine) === 500 && avail === 3 ? 'PASS' : 'FAIL', `returned_at=${iss.returned_at}, fine=${iss.fine}, available=${avail}`);
  } catch (e) { record(47, 'sp_return_book happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_return_book(${idIss1}, 0)`, 'ALREADY_RETURNED');
    const avail = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBA}`)).available);
    record(48, 'AMENDMENT 4 duplicate return rejected (ALREADY_RETURNED), inventory unchanged',
      r.threw && r.matched && avail === 3 ? 'PASS' : 'FAIL', `${r.detail}; available=${avail}`);
  } catch (e) { record(48, 'ALREADY_RETURNED', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_return_book(${idIssB1}, -1)`, 'INVALID_FINE');
    const still = await countWhere('book_issues', `id = ${idIssB1} AND returned_at IS NULL`);
    record(49, 'sp_return_book negative fine rejected, issue stays unreturned',
      r.threw && r.matched && still === 1 ? 'PASS' : 'FAIL', `${r.detail}; unreturned=${still}`);
  } catch (e) { record(49, 'INVALID_FINE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    // Inventory corruption guard (AMENDMENT 4): corrupt available to equal
    // quantity while an issue is active; return must refuse and roll back.
    await root.$executeRawUnsafe(`UPDATE ${STAGING_DB}.books SET available = 1 WHERE id = ${idBB}`);
    const r = await expectWriterError(`sp_return_book(${idIssB1}, 0)`, 'INVENTORY_CORRUPTION');
    const iss = await countWhere('book_issues', `id = ${idIssB1} AND returned_at IS NULL`);
    const avail = Number((await one(`SELECT available FROM ${STAGING_DB}.books WHERE id = ${idBB}`)).available);
    await root.$executeRawUnsafe(`UPDATE ${STAGING_DB}.books SET available = 0 WHERE id = ${idBB}`); // restore
    record(50, 'AMENDMENT 4 inventory guard: corrupted count detected (INVENTORY_CORRUPTION), return rolled back',
      r.threw && r.matched && iss === 1 && avail === 1 ? 'PASS' : 'FAIL', `${r.detail}; unreturned=${iss}, available during=${avail}`);
  } catch (e) { record(50, 'inventory corruption guard', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 51-57. Transport fee posting + AMENDMENTS 1/2
  // =====================================================================
  try {
    idVC = 0; // (unused beyond tests above)
    idIssC1 = 0;
    const payId = Number(firstValue(await callWriter(`sp_post_transport_fee(${idS0}, ${q('2026-12')}, 5000.00, ${q('cash')})`)));
    const p = await one(`SELECT student_id, purpose, amount, reference, payment_date FROM ${STAGING_DB}.payments WHERE id = ${payId}`);
    record(51, 'sp_post_transport_fee happy path (purpose=transport, ref=transport:2026-12)',
      Number(p.student_id) === idS0 && String(p.purpose) === 'transport' && Number(p.amount) === 5000 &&
      String(p.reference) === 'transport:2026-12' ? 'PASS' : 'FAIL',
      `payment_id=${payId}, purpose=${p.purpose}, amount=${p.amount}, reference=${p.reference}, date=${p.payment_date}`);
  } catch (e) { record(51, 'sp_post_transport_fee happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_post_transport_fee(${idS0}, ${q('2026-12')}, 5000.00, ${q('cash')})`, 'DUPLICATE_PAYMENT');
    const n = await countWhere('payments', `reference = 'transport:2026-12'`);
    record(52, 'AMENDMENT 2 sequential duplicate transport fee rejected (DUPLICATE_PAYMENT), single row',
      r.threw && r.matched && n === 1 ? 'PASS' : 'FAIL', `${r.detail}; rows=${n}`);
  } catch (e) { record(52, 'duplicate transport fee', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r1 = await expectWriterError(`sp_post_transport_fee(${idS0}, ${q('2026-13')}, 1000, ${q('cash')})`, 'INVALID_PERIOD');
    const r2 = await expectWriterError(`sp_post_transport_fee(${idS0}, ${q('abc-xx')}, 1000, ${q('cash')})`, 'INVALID_PERIOD');
    const n = await countWhere('payments', `student_id = ${idS0} AND purpose = 'transport'`);
    record(53, 'AMENDMENT 2 invalid periods rejected (month 13 and malformed), no rows inserted',
      r1.threw && r1.matched && r2.threw && r2.matched && n === 1 ? 'PASS' : 'FAIL', `month13=${r1.detail}; malformed=${r2.detail}; transport rows=${n}`);
  } catch (e) { record(53, 'INVALID_PERIOD', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_post_transport_fee(${idS0}, ${q('2027-02')}, 0, ${q('cash')})`, 'INVALID_AMOUNT');
    const n = await countWhere('payments', `purpose = 'transport' AND reference = 'transport:2027-02'`);
    record(54, 'sp_post_transport_fee zero amount rejected (INVALID_AMOUNT), no row',
      r.threw && r.matched && n === 0 ? 'PASS' : 'FAIL', `${r.detail}; rows=${n}`);
  } catch (e) { record(54, 'INVALID_AMOUNT', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_post_transport_fee(${idTeacher}, ${q('2027-02')}, 1000, ${q('cash')})`, 'NOT_A_STUDENT');
    record(55, 'sp_post_transport_fee teacher rejected (NOT_A_STUDENT)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(55, 'NOT_A_STUDENT fee', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    // AMENDMENT 2 concurrency: two parallel posts for the same student+period
    const [a, b] = await Promise.allSettled([
      callWriter(`sp_post_transport_fee(${idS0}, ${q('2027-01')}, 5000.00, ${q('cash')})`),
      callWriter2(`sp_post_transport_fee(${idS0}, ${q('2027-01')}, 5000.00, ${q('cash')})`),
    ]);
    const outcome = (r) => r.status === 'fulfilled' ? 'OK' : String(r.reason.message).replace(/\s+/g, ' ');
    const show = (r) => r.status === 'fulfilled' ? 'OK' : outcome(r).slice(0, 110);
    const oneOk = (a.status === 'fulfilled') !== (b.status === 'fulfilled');
    const loser = a.status === 'rejected' ? outcome(a) : outcome(b);
    const n = await countWhere('payments', `reference = 'transport:2027-01'`);
    record(56, 'CONCURRENT duplicate transport fee race: exactly one succeeds, loser gets DUPLICATE_PAYMENT',
      oneOk && loser.includes('DUPLICATE_PAYMENT') && n === 1 ? 'PASS' : 'FAIL',
      `call1=${show(a)} | call2=${show(b)} | rows=${n}`);
  } catch (e) { record(56, 'concurrent duplicate payment race', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    // AMENDMENT 1: legacy NULL-purpose rows are untouched and never conflict
    await root.$executeRawUnsafe(
      `INSERT INTO ${STAGING_DB}.payments (student_id, amount, payment_date, payment_method, reference) VALUES (${idS0}, 1000.00, '2026-01-10', 'cash', 'stg-test-legacy-1')`
    );
    await root.$executeRawUnsafe(
      `INSERT INTO ${STAGING_DB}.payments (student_id, amount, payment_date, payment_method, reference) VALUES (${idS0}, 2000.00, '2026-02-10', 'cash', 'stg-test-legacy-1')`
    );
    const legacy = await countWhere('payments', `reference = 'stg-test-legacy-1' AND purpose IS NULL`);
    const distinct = await scalar(
      `SELECT COUNT(DISTINCT id) AS n FROM ${STAGING_DB}.payments WHERE reference = 'stg-test-legacy-1'`
    );
    const transportRow = await countWhere('payments', `student_id = ${idS0} AND purpose = 'transport'`);
    record(57, 'AMENDMENT 1: legacy NULL-purpose rows accepted with identical (student, ref); coexist with purpose rows',
      legacy === 2 && distinct === 2 && transportRow >= 1 ? 'PASS' : 'FAIL',
      `legacy rows=${legacy} (MariaDB treats NULL index entries as distinct), transport rows=${transportRow}`);
  } catch (e) { record(57, 'legacy NULL-purpose rows', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 58-63. Library fine posting + AMENDMENT 2
  // =====================================================================
  try {
    idIssC1 = Number(firstValue(await callWriter(`sp_issue_book(${idBC}, ${idTP1}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`)));
    await callWriter(`sp_return_book(${idIssC1}, 1000.00)`);
    const payId = Number(firstValue(await callWriter(`sp_post_library_fine(${idIssC1}, ${q('cash')})`)));
    const p = await one(`SELECT student_id, purpose, amount, reference FROM ${STAGING_DB}.payments WHERE id = ${payId}`);
    const iss = await one(`SELECT fine_paid FROM ${STAGING_DB}.book_issues WHERE id = ${idIssC1}`);
    record(58, 'sp_post_library_fine happy path (amount from book_issues.fine, ref=library-fine:<id>, fine_paid=1)',
      Number(p.student_id) === idTP1 && String(p.purpose) === 'library_fine' && Number(p.amount) === 1000 &&
      String(p.reference) === `library-fine:${idIssC1}` && Number(iss.fine_paid) === 1 ? 'PASS' : 'FAIL',
      `payment_id=${payId}, purpose=${p.purpose}, amount=${p.amount}, reference=${p.reference}, fine_paid=${iss.fine_paid}`);
  } catch (e) { record(58, 'sp_post_library_fine happy path', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_post_library_fine(${idIssC1}, ${q('cash')})`, 'FINE_ALREADY_POSTED');
    const n = await countWhere('payments', `reference = 'library-fine:${idIssC1}'`);
    record(59, 'AMENDMENT 2 repeat fine posting rejected (FINE_ALREADY_POSTED), single payment row',
      r.threw && r.matched && n === 1 ? 'PASS' : 'FAIL', `${r.detail}; rows=${n}`);
  } catch (e) { record(59, 'FINE_ALREADY_POSTED', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    idIssA2 = Number(firstValue(await callWriter(`sp_issue_book(${idBA}, ${idTP2}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`)));
    const r = await expectWriterError(`sp_post_library_fine(${idIssA2}, ${q('cash')})`, 'ISSUE_NOT_RETURNED');
    record(60, 'sp_post_library_fine unreturned issue rejected (ISSUE_NOT_RETURNED)', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(60, 'ISSUE_NOT_RETURNED', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    await callWriter(`sp_return_book(${idIssA2}, 0.00)`);
    const r = await expectWriterError(`sp_post_library_fine(${idIssA2}, ${q('cash')})`, 'NO_FINE_DUE');
    const n = await countWhere('payments', `reference = 'library-fine:${idIssA2}'`);
    record(61, 'sp_post_library_fine zero-fine issue rejected (NO_FINE_DUE), no payment row',
      r.threw && r.matched && n === 0 ? 'PASS' : 'FAIL', `${r.detail}; rows=${n}`);
  } catch (e) { record(61, 'NO_FINE_DUE', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    idIssA3 = Number(firstValue(await callWriter(`sp_issue_book(${idBA}, ${idTP3}, DATE_ADD(CURDATE(), INTERVAL 7 DAY))`)));
    await callWriter(`sp_return_book(${idIssA3}, 250.00)`);
    const [a, b] = await Promise.allSettled([
      callWriter(`sp_post_library_fine(${idIssA3}, ${q('cash')})`),
      callWriter2(`sp_post_library_fine(${idIssA3}, ${q('cash')})`),
    ]);
    const outcome = (r) => r.status === 'fulfilled' ? 'OK' : String(r.reason.message).replace(/\s+/g, ' ');
    const show = (r) => r.status === 'fulfilled' ? 'OK' : outcome(r).slice(0, 110);
    const oneOk = (a.status === 'fulfilled') !== (b.status === 'fulfilled');
    const loser = a.status === 'rejected' ? outcome(a) : outcome(b);
    const loserOk = loser.includes('FINE_ALREADY_POSTED') || loser.includes('DUPLICATE_PAYMENT');
    const n = await countWhere('payments', `reference = 'library-fine:${idIssA3}'`);
    record(62, 'CONCURRENT duplicate fine race: exactly one payment row; loser blocked (fine_paid guard or dedup key)',
      oneOk && loserOk && n === 1 ? 'PASS' : 'FAIL', `call1=${show(a)} | call2=${show(b)} | rows=${n}`);
  } catch (e) { record(62, 'concurrent duplicate fine race', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 63-64. Book deletion guard + RESTRICT backstop
  // =====================================================================
  try {
    const r = await expectWriterError(`sp_delete_book(${idBC})`, 'BOOK_HAS_ISSUE_HISTORY');
    const still = await countWhere('books', `id = ${idBC}`);
    record(63, 'AMENDMENT 5: deleting book with issue history rejected, book survives',
      r.threw && r.matched && still === 1 ? 'PASS' : 'FAIL', `${r.detail}; book rows=${still}`);
  } catch (e) { record(63, 'book deletion guard', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    let blocked = false;
    try {
      await root.$executeRawUnsafe(`DELETE FROM ${STAGING_DB}.books WHERE id = ${idBC}`);
    } catch (e) { blocked = isFkError(e); }
    const still = await countWhere('books', `id = ${idBC}`);
    record(64, 'AMENDMENT 5 RESTRICT: direct book delete blocked by FK (1451) — issue history never destroyed',
      blocked && still === 1 ? 'PASS' : 'FAIL', `fk_blocked=${blocked}, book rows=${still}`);
  } catch (e) { record(64, 'FK interaction book', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // 65. Payment policy: different calendar months may each hold a payment
  // =====================================================================
  try {
    await callWriter(`sp_post_transport_fee(${idS0}, ${q('2027-03')}, 5000.00, ${q('cash')})`);
    await callWriter(`sp_post_transport_fee(${idS0}, ${q('2027-04')}, 5000.00, ${q('cash')})`);
    const n = await countWhere('payments',
      `student_id = ${idS0} AND purpose = 'transport' AND reference IN ('transport:2027-03','transport:2027-04')`);
    const dup = await expectWriterError(`sp_post_transport_fee(${idS0}, ${q('2027-03')}, 5000.00, ${q('cash')})`, 'DUPLICATE_PAYMENT');
    record(65, 'PAYMENT POLICY: one payment per student-month; DIFFERENT months both accepted (no cross-month dedup)',
      n === 2 && dup.threw && dup.matched ? 'PASS' : 'FAIL',
      `rows 2027-03+2027-04=${n} (expect 2); repeat 2027-03 -> ${dup.matched ? 'DUPLICATE_PAYMENT' : dup.detail}`);
  } catch (e) { record(65, 'payment policy different months', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // C-suite (66-72): canonical lock order vehicle -> route -> assignment.
  // Fresh vehicles/routes/students per test (STG-C* numbers, tp5-tp8), every
  // test asserts the ABSENCE of deadlock/lock-wait errors AND inspects the
  // final database state; winners are unassigned afterwards to free tp5-tp8.
  // =====================================================================
  let idTP5, idTP6, idTP7, idTP8;
  try {
    const hash = (await import('bcryptjs')).default.hashSync('staging-test-password-tl', 10);
    const reg = (u, name) =>
      callWriter(`sp_register_student(${q(u)}, ${q(hash)}, ${q(name)}, ${q(u + '@example.test')}, ${q('0000000000')}, ${q('Synthetic Trade')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('Staging Guardian')}, ${q('0000000000')}, '2024-01-01')`);
    idTP5 = Number(firstValue(await reg('stg-test-tp5', 'Test Student TP5')));
    idTP6 = Number(firstValue(await reg('stg-test-tp6', 'Test Student TP6')));
    idTP7 = Number(firstValue(await reg('stg-test-tp7', 'Test Student TP7')));
    idTP8 = Number(firstValue(await reg('stg-test-tp8', 'Test Student TP8')));
    for (const id of [idTP5, idTP6, idTP7, idTP8]) await callWriter(`sp_approve_registration(${id})`);
    const nAct = await countWhere('users',
      `username IN ('stg-test-tp5','stg-test-tp6','stg-test-tp7','stg-test-tp8') AND status = 'Active'`);
    record(66, 'C-suite setup: students tp5-tp8 registered + approved Active', nAct === 4 ? 'PASS' : 'FAIL',
      `tp5=${idTP5}, tp6=${idTP6}, tp7=${idTP7}, tp8=${idTP8}, active=${nAct}/4`);
  } catch (e) { record(66, 'C-suite setup', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idVC1 = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL1')}, ${q('Bus')}, 2, ${q('Driver C1')}, NULL)`)));
    const idRC1 = Number(firstValue(await callWriter(`sp_add_route(${idVC1}, ${q('Route CL1')}, NULL, NULL, NULL, 1000.00)`)));
    const [rAssign, rDelete] = await Promise.allSettled([
      callWriter(`sp_assign_student(${idTP5}, ${idRC1}, NULL)`),
      callWriter2(`sp_delete_vehicle(${idVC1})`),
    ]);
    const dl = noDeadlock([rAssign, rDelete]);
    const aOk = rAssign.status === 'fulfilled';
    const vehRows = await countWhere('vehicles', `id = ${idVC1}`);
    const asgRows = await countWhere('transport_assignments', `route_id = ${idRC1}`);
    const consistent = aOk
      ? asgRows === 1 && vehRows === 1 && outcome(rDelete).includes('VEHICLE_HAS_ACTIVE_ASSIGNMENTS')
      : vehRows === 0 && asgRows === 0 && outcome(rAssign).includes('VEHICLE_NOT_FOUND');
    // reset: free tp5 and the vehicle so later C-tests start clean
    if (aOk) await callWriter(`sp_unassign_student(${idTP5})`);
    if (aOk) await callWriter(`sp_delete_vehicle(${idVC1})`);
    record(67, 'C1: assignment vs vehicle deletion — vehicle-first locks, no deadlock, exactly one winner, state consistent',
      dl && consistent ? 'PASS' : 'FAIL',
      `assign=${outcome(rAssign)} | delete=${outcome(rDelete)} | vehicle_rows=${vehRows}, assignment_rows=${asgRows}, deadlock=${!dl} | reset done`);
  } catch (e) { record(67, 'C1 assign vs delete_vehicle', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idV2A = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL2A')}, ${q('Bus')}, 4, ${q('Driver C2A')}, NULL)`)));
    const idV2B = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL2B')}, ${q('Bus')}, 4, ${q('Driver C2B')}, NULL)`)));
    const idRS1 = Number(firstValue(await callWriter(`sp_add_route(${idV2A}, ${q('Route S1')}, NULL, NULL, NULL, 1000.00)`)));
    const idRS2 = Number(firstValue(await callWriter(`sp_add_route(${idV2B}, ${q('Route S2')}, NULL, NULL, NULL, 1000.00)`)));
    // capacity 4 vs 4: sufficient room for BOTH movements regardless of order
    const [rM1, rM2] = await Promise.allSettled([
      callWriter(`sp_update_route(${idRS1}, ${idV2B}, ${q('Route S1')}, NULL, NULL, NULL, 1000.00)`),
      callWriter2(`sp_update_route(${idRS2}, ${idV2A}, ${q('Route S2')}, NULL, NULL, NULL, 1000.00)`),
    ]);
    const dl = noDeadlock([rM1, rM2]);
    const nowS1 = Number((await one(`SELECT vehicle_id AS v FROM ${STAGING_DB}.transport_routes WHERE id = ${idRS1}`)).v);
    const nowS2 = Number((await one(`SELECT vehicle_id AS v FROM ${STAGING_DB}.transport_routes WHERE id = ${idRS2}`)).v);
    const ok = rM1.status === 'fulfilled' && rM2.status === 'fulfilled' &&
      nowS1 === idV2B && nowS2 === idV2A;
    await callWriter(`sp_delete_vehicle(${idV2A})`);
    await callWriter(`sp_delete_vehicle(${idV2B})`);
    record(68, 'C2: concurrent route swaps S1:A->B and S2:B->A — ascending-id vehicle locks serialize the swap cycle, no deadlock',
      dl && ok ? 'PASS' : 'FAIL',
      `m1=${outcome(rM1)} | m2=${outcome(rM2)} | S1 on=${nowS1} (want ${idV2B}), S2 on=${nowS2} (want ${idV2A}), deadlock=${!dl} | vehicles deleted (reset)`);
  } catch (e) { record(68, 'C2 route-swap storm', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idV3A = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL3A')}, ${q('Bus')}, 3, ${q('Driver C3A')}, NULL)`)));
    const idV3B = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL3B')}, ${q('Bus')}, 1, ${q('Driver C3B')}, NULL)`)));
    const idRM1 = Number(firstValue(await callWriter(`sp_add_route(${idV3A}, ${q('Route M1')}, NULL, NULL, NULL, 1000.00)`)));
    const [rMove, rAssign] = await Promise.allSettled([
      callWriter(`sp_update_route(${idRM1}, ${idV3B}, ${q('Route M1')}, NULL, NULL, NULL, 1000.00)`),
      callWriter2(`sp_assign_student(${idTP6}, ${idRM1}, NULL)`),
    ]);
    const dl = noDeadlock([rMove, rAssign]);
    const aOk = rAssign.status === 'fulfilled';
    const nowVeh = Number((await one(`SELECT vehicle_id AS v FROM ${STAGING_DB}.transport_routes WHERE id = ${idRM1}`)).v);
    const cap = Number((await one(`SELECT capacity AS c FROM ${STAGING_DB}.vehicles WHERE id = ${nowVeh}`)).c);
    const load = await scalar(
      `SELECT COUNT(*) AS n FROM ${STAGING_DB}.transport_assignments a ` +
      `JOIN ${STAGING_DB}.transport_routes r ON r.id = a.route_id WHERE r.vehicle_id = ${nowVeh}`);
    const consistent = [idV3A, idV3B].includes(nowVeh) && load <= cap && (aOk ? load === 1 : load === 0);
    if (aOk) await callWriter(`sp_unassign_student(${idTP6})`);
    await callWriter(`sp_delete_vehicle(${idV3A})`);
    await callWriter(`sp_delete_vehicle(${idV3B})`);
    record(69, 'C3: route movement (M1 A->B) vs assignment to that route — no deadlock, load<=capacity invariant holds',
      dl && consistent ? 'PASS' : 'FAIL',
      `move=${outcome(rMove)} | assign=${outcome(rAssign)} | M1 on=${nowVeh}, load=${load}, capacity=${cap}, deadlock=${!dl} | tp6 + vehicles reset`);
  } catch (e) { record(69, 'C3 movement vs assign', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idV4 = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL4')}, ${q('Bus')}, 1, ${q('Driver C4')}, NULL)`)));
    const idRQ1 = Number(firstValue(await callWriter(`sp_add_route(${idV4}, ${q('Route Q1')}, NULL, NULL, NULL, 1000.00)`)));
    const [rAssign, rUpd] = await Promise.allSettled([
      callWriter(`sp_assign_student(${idTP7}, ${idRQ1}, NULL)`),
      callWriter2(`sp_update_vehicle(${idV4}, ${q('Big Bus')}, 2, ${q('Driver C4b')}, NULL)`),
    ]);
    const dl = noDeadlock([rAssign, rUpd]);
    const aOk = rAssign.status === 'fulfilled';
    const v = await one(`SELECT capacity, driver_name FROM ${STAGING_DB}.vehicles WHERE id = ${idV4}`);
    const cap = Number(v.capacity);
    const load = await countWhere('transport_assignments', `route_id = ${idRQ1}`);
    const consistent = load <= cap && (aOk ? load === 1 : load === 0);
    if (aOk) await callWriter(`sp_unassign_student(${idTP7})`);
    await callWriter(`sp_delete_vehicle(${idV4})`);
    record(70, 'C4: assignment vs vehicle capacity update — no deadlock, capacity>=load invariant holds',
      dl && consistent ? 'PASS' : 'FAIL',
      `assign=${outcome(rAssign)} | update=${outcome(rUpd)} | capacity=${cap}, driver=${v.driver_name}, load=${load}, deadlock=${!dl} | tp7 + vehicle reset`);
  } catch (e) { record(70, 'C4 assign vs capacity update', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idV5 = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CL5')}, ${q('Bus')}, 2, ${q('Driver C5')}, NULL)`)));
    const idRD1 = Number(firstValue(await callWriter(`sp_add_route(${idV5}, ${q('Route D1')}, NULL, NULL, NULL, 1000.00)`)));
    const [rAssign, rDel] = await Promise.allSettled([
      callWriter(`sp_assign_student(${idTP8}, ${idRD1}, NULL)`),
      callWriter2(`sp_delete_route(${idRD1})`),
    ]);
    const dl = noDeadlock([rAssign, rDel]);
    const aOk = rAssign.status === 'fulfilled';
    const routeRows = await countWhere('transport_routes', `id = ${idRD1}`);
    const asgRows = await countWhere('transport_assignments', `route_id = ${idRD1}`);
    const consistent = aOk
      ? asgRows === 1 && routeRows === 1 && outcome(rDel).includes('ROUTE_HAS_ASSIGNMENTS')
      : routeRows === 0 && asgRows === 0 && rDel.status === 'fulfilled';
    if (aOk) await callWriter(`sp_unassign_student(${idTP8})`);
    if (aOk) await callWriter(`sp_delete_route(${idRD1})`);
    await callWriter(`sp_delete_vehicle(${idV5})`);
    record(71, 'C5: route deletion vs assignment to that route — no deadlock, exactly one winner, state consistent',
      dl && consistent ? 'PASS' : 'FAIL',
      `assign=${outcome(rAssign)} | delete=${outcome(rDel)} | route_rows=${routeRows}, assignment_rows=${asgRows}, deadlock=${!dl} | tp8 + route + vehicle reset`);
  } catch (e) { record(71, 'C5 delete_route vs assign', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const idVP1 = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CP1')}, ${q('Bus')}, 2, ${q('Driver P1')}, NULL)`)));
    const idVP2 = Number(firstValue(await callWriter(`sp_add_vehicle(${q('STG-CP2')}, ${q('Van')}, 1, ${q('Driver P2')}, NULL)`)));
    const idRP1 = Number(firstValue(await callWriter(`sp_add_route(${idVP1}, ${q('Route P1')}, NULL, NULL, NULL, 1000.00)`)));
    const idRP2 = Number(firstValue(await callWriter(`sp_add_route(${idVP1}, ${q('Route P2')}, NULL, NULL, NULL, 1000.00)`)));
    const idRP3 = Number(firstValue(await callWriter(`sp_add_route(${idVP2}, ${q('Route P3')}, NULL, NULL, NULL, 1000.00)`)));
    // tp5+tp6+tp8 contend for vehP1's 2 seats (routes P1/P2/P2); tp7 takes vehP2's only seat
    const [rA, rB, rC, rD] = await Promise.allSettled([
      callWriter(`sp_assign_student(${idTP5}, ${idRP1}, NULL)`),
      callWriter2(`sp_assign_student(${idTP6}, ${idRP2}, NULL)`),
      callWriter3(`sp_assign_student(${idTP7}, ${idRP3}, NULL)`),
      callWriter4(`sp_assign_student(${idTP8}, ${idRP2}, NULL)`),
    ]);
    const all = [rA, rB, rC, rD];
    const dl = noDeadlock(all);
    const winners = [idTP5, idTP6, idTP7, idTP8].filter((_, i) => all[i].status === 'fulfilled');
    const losers = all.filter((r) => r.status === 'rejected').map((r) => outcome(r));
    const vehP1Load = await scalar(
      `SELECT COUNT(*) AS n FROM ${STAGING_DB}.transport_assignments a ` +
      `JOIN ${STAGING_DB}.transport_routes r ON r.id = a.route_id WHERE r.vehicle_id = ${idVP1}`);
    const vehP2Load = await scalar(
      `SELECT COUNT(*) AS n FROM ${STAGING_DB}.transport_assignments a ` +
      `JOIN ${STAGING_DB}.transport_routes r ON r.id = a.route_id WHERE r.vehicle_id = ${idVP2}`);
    const loserFriendly = losers.length === 1 && losers[0].includes('VEHICLE_AT_CAPACITY');
    const ok = dl && winners.length === 3 && loserFriendly && vehP1Load === 2 && vehP2Load === 1;
    // reset: free the three winners, then remove the vehicles
    for (const w of winners) await callWriter(`sp_unassign_student(${w})`);
    await callWriter(`sp_delete_vehicle(${idVP1})`);
    await callWriter(`sp_delete_vehicle(${idVP2})`);
    const leftAsg = await scalar(
      `SELECT COUNT(*) AS n FROM ${STAGING_DB}.transport_assignments WHERE student_id IN (${idTP5},${idTP6},${idTP7},${idTP8})`);
    record(72, 'C6: 4-client storm (2 vehicles / 3 routes) — exactly 3 wins, 1 VEHICLE_AT_CAPACITY, no deadlock, loads exact',
      ok && leftAsg === 0 ? 'PASS' : 'FAIL',
      `wins=${winners.length} (students ${winners.join(',')}), losers=[${losers.join(' | ')}] | vehP1_load=${vehP1Load}/2, vehP2_load=${vehP2Load}/1, deadlock=${!dl}, leftover_assignments=${leftAsg} | reset done`);
  } catch (e) { record(72, 'C6 4-client storm', 'FAIL', String(e.message).slice(0, 140)); }

  try {
    const r = await expectWriterError(`sp_post_library_fine(999999, ${q('cash')})`, 'ISSUE_NOT_FOUND');
    const rows = await countWhere('payments', `reference = 'library-fine:999999'`);
    record(73, 'sp_post_library_fine nonexistent issue rejected (ISSUE_NOT_FOUND), no payment row',
      r.threw && r.matched && rows === 0 ? 'PASS' : 'FAIL', `${r.detail}; rows=${rows}`);
  } catch (e) { record(73, 'ISSUE_NOT_FOUND', 'FAIL', String(e.message).slice(0, 140)); }

  // =====================================================================
  // Post-run cleanup + summary
  // =====================================================================
  const post = await cleanTestRows();
  const finalTables = await root.$queryRawUnsafe(
    "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?, ?)",
    STAGING_DB, 'vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues', 'payments'
  );
  console.log('[tests] post-run cleanup done; remaining transport/library rows (expect 0):');
  for (const t of finalTables) {
    console.log(`   ${t.TABLE_NAME}: ${t.TABLE_ROWS}`);
  }

  const fails = results.filter((r) => r.status !== 'PASS');
  console.log('');
  console.log(`SUMMARY: ${results.filter((r) => r.status === 'PASS').length}/${results.length} PASS` +
    (fails.length ? ` — ${fails.map((f) => f.id).join(',')} NOT PASS` : ''));
  writeFileSync(
    join(here, 'transport-library-test-results.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );
  console.log('[tests] wrote scripts/staging/transport-library-test-results.json (no secrets)');
  process.exitCode = fails.length ? 2 : 0;
}

main()
  .catch((e) => {
    console.error('[tests] FATAL:', String(e.message).slice(0, 300));
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const c of [writer, writer2, writer3, writer4, root]) {
      await c.$disconnect().catch(() => {});
    }
  });

// ESSJT staging verification — 16-test matrix. STAGING ONLY.
//
//   node scripts/staging/run-staging-tests.mjs
//
// Every procedure call is a single standalone statement on an autocommit
// connection with NO outer transaction (exactly how the application will
// call them). Row-level verification uses the root connection against the
// staging database only. Hashes are generated at runtime and are NEVER
// printed, logged, or written to any report.
//
// Exit codes: 0 = all PASS, 2 = at least one FAIL/SKIP (stop and report).

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const STAGING_DB = 'essjt_school_system_staging';
const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, 'staging.env'), 'utf8');
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');
const writerUrl = stripDefaultDb(
  env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL=')).split('=').slice(1).join('=')
);

// Single-quote escaping for test-controlled literal values (defense in depth;
// bcrypt hashes contain no quotes by construction).
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

const writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
const root = new PrismaClient({
  datasources: { db: { url: 'mysql://root@127.0.0.1:3306/' } },
});

const results = [];
const record = (id, name, status, evidence) => {
  results.push({ id, name, status, evidence });
  const mark = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${mark} [${id}] ${status}: ${name} — ${evidence}`);
};
const SKIP = 'SKIPPED';

// Prisma names the columns of a CALL result set generically (f0, f1, …) and
// drops the SQL alias, so read the first column's value positionally.
const firstValue = (rows) => {
  const r = Array.isArray(rows) ? rows[0] : rows;
  if (r === null || r === undefined) return undefined;
  return typeof r === 'object' ? Object.values(r)[0] : r;
};

// Runs a CALL as the writer and captures the thrown 45000 message.
async function callWriter(sql) {
  return writer.$queryRawUnsafe(`CALL ${STAGING_DB}.${sql}`);
}
async function expectWriterError(sql, expectedText) {
  try {
    await callWriter(sql);
    return { threw: false, matched: false, detail: 'no error thrown (call succeeded)' };
  } catch (e) {
    const m = String(e.message).replace(/\s+/g, ' ');
    return {
      threw: true,
      matched: m.includes(expectedText),
      detail: m.slice(0, 160),
    };
  }
}

// CREATE/DROP TRIGGER cannot reliably run through the prepared-statement
// protocol, so trigger DDL goes through the mysql CLI (text protocol, stdin).
// Root has no password; no credentials appear on the command line. This is
// staging-only SQL by construction.
const MYSQL_CLI = 'C:\\xampp\\mysql\\bin\\mysql.exe';
function runMysqlCli(script) {
  const res = spawnSync(MYSQL_CLI, ['-u', 'root', '-h', '127.0.0.1', '--batch'], {
    input: script,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (res.status !== 0) {
    throw new Error(
      `mysql CLI failed (exit ${res.status}): ` +
      String(res.stderr || res.stdout || '').replace(/\s+/g, ' ').slice(0, 300)
    );
  }
  if (res.stderr && /ERROR/.test(String(res.stderr))) {
    throw new Error(
      'mysql CLI reported ERROR: ' + String(res.stderr).replace(/\s+/g, ' ').slice(0, 300)
    );
  }
}

// staging-only verification helpers via root
const one = async (sql) => (await root.$queryRawUnsafe(sql))[0];
const scalar = async (sql) => Number((await one(sql))[Object.keys((await one(sql)))[0]] ?? NaN);
const countWhere = async (table, where) =>
  scalar(`SELECT COUNT(*) AS n FROM ${STAGING_DB}.${table} WHERE ${where}`);

// Removes rows created by previous test runs (usernames prefixed stg-test- or
// stg-dbg-) so the suite is idempotent. Staging-only synthetic data; the three
// setup records (stg-admin/stg-teacher/stg-student) are never touched.
async function cleanTestRows() {
  // Leftover test triggers from an interrupted run would break the next run.
  runMysqlCli(
    `DROP TRIGGER IF EXISTS ${STAGING_DB}.trg__test_rollback_students;\n` +
    `DROP TRIGGER IF EXISTS ${STAGING_DB}.trg__test_rollback_teachers;\n`
  );
  const nStudents = await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.students WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%' OR username LIKE 'stg-dbg-%') x)`
  );
  const nTeachers = await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.teachers WHERE user_id IN (SELECT id FROM (SELECT id FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%' OR username LIKE 'stg-dbg-%') x)`
  );
  const nUsers = await root.$executeRawUnsafe(
    `DELETE FROM ${STAGING_DB}.users WHERE username LIKE 'stg-test-%' OR username LIKE 'stg-dbg-%'`
  );
  return { nStudents, nTeachers, nUsers };
}

async function main() {
  const [me] = await root.$queryRawUnsafe('SELECT CURRENT_USER() AS a');
  if (!String(me.a).startsWith('root@')) throw new Error('expected root for staging tests');
  record(0, 'environment check', 'PASS', `root connected; all SQL below references ${STAGING_DB} only`);

  const cleaned = await cleanTestRows();
  console.log(`[tests] pre-run cleanup of prior test rows: users=${cleaned.nUsers}, students=${cleaned.nStudents}, teachers=${cleaned.nTeachers}`);

  // h1..h4: runtime-generated bcrypt hashes (never printed)
  const h1 = bcrypt.hashSync('staging-test-password-one', 10);
  const h2 = bcrypt.hashSync('staging-test-password-two', 10);
  const h3 = bcrypt.hashSync('staging-test-password-three', 10);
  const h4 = bcrypt.hashSync('staging-test-password-four', 10);
  const BAD_HASH = 'not-a-bcrypt-hash';

  // ---------- Test 1: writer connection sanity + zero table privileges ----------
  try {
    const [w] = await writer.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
    const okWho = String(w.a) === 'essjt_writer@localhost' && w.d === null;
    const probes = {
      select: `SELECT id FROM ${STAGING_DB}.users LIMIT 1`,
      insert: `INSERT INTO ${STAGING_DB}.users (username, password, full_name, email, role) VALUES ('__probe__', 'x', 'x', 'probe@invalid.test', 'invalid_role_value')`,
      update: `UPDATE ${STAGING_DB}.users SET phone = 'probe' WHERE id = -1`,
      delete: `DELETE FROM ${STAGING_DB}.users WHERE id = -1`,
    };
    const denials = {};
    let allDenied = true;
    for (const [k, sql] of Object.entries(probes)) {
      try {
        await writer.$queryRawUnsafe(sql);
        denials[k] = 'NOT DENIED (unexpected)';
        allDenied = false;
      } catch (e) {
        const m = String(e.message).replace(/\s+/g, ' ');
        const denied = /command denied/i.test(m);
        denials[k] = denied ? 'DENIED' : `OTHER: ${m.slice(0, 90)}`;
        if (!denied) allDenied = false;
      }
    }
    record(1, 'writer account sanity + direct table access denied',
      okWho && allDenied ? 'PASS' : 'FAIL',
      `connected as ${w.a}, default db ${w.d}; SELECT=${denials.select} INSERT=${denials.insert} UPDATE=${denials.update} DELETE=${denials.delete}`);
  } catch (e) {
    record(1, 'writer account sanity + direct table access denied', 'FAIL', String(e.message).slice(0, 140));
  }

  // ---------- Test 2: sp_register_student happy path ----------
  let idS1 = null;
  try {
    const rows = await callWriter(
      `sp_register_student(${q('stg-test-s1')}, ${q(h1)}, ${q('Test Student One')}, ${q('stg-test-s1@example.test')}, ${q('0000000000')}, ${q('Synthetic Trade')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('Guardian One')}, ${q('0000000000')}, '2024-01-01')`
    );
    idS1 = Number(firstValue(rows));
    const u = await one(`SELECT username, role, status, must_change_password, registration_status FROM ${STAGING_DB}.users WHERE id = ${idS1}`);
    const prof = await countWhere('students', `user_id = ${idS1}`);
    const ok =
      u.username === 'stg-test-s1' && u.role === 'student' &&
      u.status === 'Inactive' && Number(u.must_change_password) === 0 &&
      u.registration_status === 'pending' && prof === 1 && !Number.isNaN(idS1);
    record(2, 'sp_register_student happy path', ok ? 'PASS' : 'FAIL',
      `new_user_id=${idS1}, role=student, status=Inactive, must_change_password=0, registration_status=pending, students_profile_rows=${prof}`);
  } catch (e) {
    record(2, 'sp_register_student happy path', 'FAIL', String(e.message).slice(0, 140));
  }

  // ---------- Test 3: duplicate username ----------
  try {
    const r = await expectWriterError(
      `sp_register_student(${q('stg-test-s1')}, ${q(h2)}, ${q('Dup User')}, ${q('dup@example.test')}, ${q('0000000000')}, ${q('T')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('G')}, ${q('0000000000')}, '2024-01-01')`,
      'DUPLICATE_USERNAME'
    );
    const extras = await countWhere('users', `email = 'dup@example.test'`);
    record(3, 'sp_register_student duplicate username',
      r.threw && r.matched && extras === 0 ? 'PASS' : 'FAIL',
      `${r.detail}; rows_with_dup_email=${extras}`);
  } catch (e) { record(3, 'sp_register_student duplicate username', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 4: duplicate email ----------
  try {
    const r = await expectWriterError(
      `sp_register_student(${q('stg-test-s4')}, ${q(h2)}, ${q('Dup Email')}, ${q('stg-test-s1@example.test')}, ${q('0000000000')}, ${q('T')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('G')}, ${q('0000000000')}, '2024-01-01')`,
      'DUPLICATE_EMAIL'
    );
    const extras = await countWhere('users', `username = 'stg-test-s4'`);
    record(4, 'sp_register_student duplicate email',
      r.threw && r.matched && extras === 0 ? 'PASS' : 'FAIL',
      `${r.detail}; rows_with_new_username=${extras}`);
  } catch (e) { record(4, 'sp_register_student duplicate email', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 5: invalid hash format ----------
  try {
    const r = await expectWriterError(
      `sp_register_student(${q('stg-test-s5')}, ${q(BAD_HASH)}, ${q('Bad Hash')}, ${q('s5@example.test')}, ${q('0000000000')}, ${q('T')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('G')}, ${q('0000000000')}, '2024-01-01')`,
      'INVALID_HASH_FORMAT'
    );
    const extras = await countWhere('users', `username = 'stg-test-s5'`);
    record(5, 'sp_register_student invalid hash rejected',
      r.threw && r.matched && extras === 0 ? 'PASS' : 'FAIL',
      `${r.detail}; rows_inserted=${extras}`);
  } catch (e) { record(5, 'sp_register_student invalid hash rejected', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 6: transaction rollback atomicity (trigger-injected failure) ----------
  // sp_register_student INSERT order: (1) users row, (2) LAST_INSERT_ID,
  // (3) students profile row. A temporary BEFORE INSERT trigger on the profile
  // table fires exactly during the SECOND insert — after the users row has
  // been created inside the transaction — and raises a controlled SQLSTATE.
  // The procedure's EXIT handler must ROLLBACK, leaving no orphan rows.
  try {
    const trigger = (table, name) =>
      'DELIMITER $$\n' +
      `CREATE TRIGGER ${STAGING_DB}.${name} BEFORE INSERT ON ${STAGING_DB}.${table} FOR EACH ROW ` +
      `BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TEST_TRIGGER_ROLLBACK'; END$$\n` +
      'DELIMITER ;\n';
    const dropTrigger = (name) => `DROP TRIGGER IF EXISTS ${STAGING_DB}.${name};\n`;

    // snapshot of the three unrelated synthetic setup records
    const snap = async () =>
      JSON.stringify(
        await root.$queryRawUnsafe(
          `SELECT id, username, role, status, registration_status FROM ${STAGING_DB}.users WHERE username IN ('stg-admin','stg-teacher','stg-student') ORDER BY id`
        )
      );
    const orphanProfiles = async (table) =>
      countWhere(table, `user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM ${STAGING_DB}.users)`);

    let studentErr = null;
    let teacherErr = null;
    try {
      runMysqlCli(trigger('students', 'trg__test_rollback_students'));
      const baseBefore = await snap();

      // --- student case ---
      try {
        await callWriter(
          `sp_register_student(${q('stg-test-rb-s')}, ${q(h2)}, ${q('Rollback Student')}, ${q('stg-test-rb-s@example.test')}, ${q('0000000000')}, ${q('T')}, ${q('L1')}, ${q('A')}, ${q('M')}, '2005-01-01', ${q('G')}, ${q('0000000000')}, '2024-01-01')`
        );
      } catch (e) { studentErr = String(e.message); }

      // --- teacher case (equivalent rollback proof) ---
      runMysqlCli(trigger('teachers', 'trg__test_rollback_teachers'));
      try {
        await callWriter(
          `sp_register_teacher(${q('stg-test-rb-t')}, ${q(h2)}, ${q('Rollback Teacher')}, ${q('stg-test-rb-t@example.test')}, ${q('0000000000')}, ${q('S')}, ${q('D')}, '2024-01-01')`
        );
      } catch (e) { teacherErr = String(e.message); }

      const baseAfter = await snap();
      const rbUserGone = await countWhere('users', `username LIKE 'stg-test-rb-%'`);
      const rbStudentsOrphan = await orphanProfiles('students');
      const rbTeachersOrphan = await orphanProfiles('teachers');

      const studentOk = studentErr && studentErr.includes('TEST_TRIGGER_ROLLBACK');
      const teacherOk = teacherErr && teacherErr.includes('TEST_TRIGGER_ROLLBACK');
      const clean = rbUserGone === 0 && rbStudentsOrphan === 0 && rbTeachersOrphan === 0;
      const untouched = baseBefore === baseAfter;

      record(6, 'mid-transaction failure rolls back completely (student + teacher registration)',
        studentOk && teacherOk && clean && untouched ? 'PASS' : 'FAIL',
        `student_error=${studentOk}, teacher_error=${teacherOk}, orphan_user_rows=${rbUserGone}, orphan_student_profiles=${rbStudentsOrphan}, orphan_teacher_profiles=${rbTeachersOrphan}, unrelated_synthetic_records_unchanged=${untouched}`);
    } finally {
      runMysqlCli(dropTrigger('trg__test_rollback_students') + dropTrigger('trg__test_rollback_teachers'));
      const left = await scalar(
        `SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = '${STAGING_DB}'`
      );
      console.log(`[tests] test-6 triggers removed; triggers remaining in staging DB: ${left}`);
    }
  } catch (e) { record(6, 'transaction rollback atomicity', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 7: sp_register_teacher happy path ----------
  let idT1 = null;
  try {
    const rows = await callWriter(
      `sp_register_teacher(${q('stg-test-t1')}, ${q(h1)}, ${q('Test Teacher One')}, ${q('stg-test-t1@example.test')}, ${q('0000000000')}, ${q('Synthetic Subject')}, ${q('Staging Dept')}, '2024-01-01')`
    );
    idT1 = Number(firstValue(rows));
    const u = await one(`SELECT role, status, registration_status FROM ${STAGING_DB}.users WHERE id = ${idT1}`);
    const prof = await countWhere('teachers', `user_id = ${idT1}`);
    const ok = u.role === 'teacher' && u.status === 'Inactive' && u.registration_status === 'pending' && prof === 1;
    record(7, 'sp_register_teacher happy path', ok ? 'PASS' : 'FAIL',
      `new_user_id=${idT1}, role=teacher, status=Inactive, pending, teachers_profile_rows=${prof}`);
  } catch (e) { record(7, 'sp_register_teacher happy path', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 8: teacher duplicate username (student username reused) ----------
  try {
    const r = await expectWriterError(
      `sp_register_teacher(${q('stg-test-s1')}, ${q(h1)}, ${q('Dup Teacher')}, ${q('tdup@example.test')}, ${q('0000000000')}, ${q('S')}, ${q('D')}, '2024-01-01')`,
      'DUPLICATE_USERNAME'
    );
    record(8, 'sp_register_teacher duplicate username', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(8, 'sp_register_teacher duplicate username', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 9: approve pending student ----------
  try {
    const rows = await callWriter(`sp_approve_registration(${idS1})`);
    const u = await one(`SELECT status, registration_status FROM ${STAGING_DB}.users WHERE id = ${idS1}`);
    const ok = Number(firstValue(rows)) === idS1;
    const stateOk = u.status === 'Active' && u.registration_status === 'approved';
    record(9, 'sp_approve_registration pending → Active + approved',
      ok && stateOk ? 'PASS' : 'FAIL', `result=${JSON.stringify(rows[0])}, status=${u.status}, registration_status=${u.registration_status}`);
  } catch (e) { record(9, 'sp_approve_registration happy path', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 10: approve non-pending (already approved) ----------
  try {
    const r = await expectWriterError(`sp_approve_registration(${idS1})`, 'NO_PENDING_REGISTRATION');
    record(10, 'sp_approve_registration non-pending rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(10, 'sp_approve_registration non-pending', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 11: reject pending teacher (stays Inactive) ----------
  try {
    const rows = await callWriter(`sp_reject_registration(${idT1})`);
    const u = await one(`SELECT status, registration_status FROM ${STAGING_DB}.users WHERE id = ${idT1}`);
    const ok = u.registration_status === 'rejected' && u.status === 'Inactive';
    record(11, 'sp_reject_registration pending → rejected, stays Inactive',
      ok ? 'PASS' : 'FAIL', `status=${u.status}, registration_status=${u.registration_status}`);
  } catch (e) { record(11, 'sp_reject_registration happy path', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 12: reject non-pending ----------
  try {
    const r = await expectWriterError(`sp_reject_registration(${idT1})`, 'NO_PENDING_REGISTRATION');
    record(12, 'sp_reject_registration non-pending rejected', r.threw && r.matched ? 'PASS' : 'FAIL', r.detail);
  } catch (e) { record(12, 'sp_reject_registration non-pending', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 13: sp_set_account_password on student ----------
  try {
    const rows = await callWriter(`sp_set_account_password(${idS1}, ${q(h2)})`);
    const u = await one(`SELECT must_change_password FROM ${STAGING_DB}.users WHERE id = ${idS1}`);
    const stored = (await one(`SELECT password FROM ${STAGING_DB}.users WHERE id = ${idS1}`)).password;
    const hashMatches = stored === h2; // compared in memory; never printed
    const ok = u.must_change_password === 1 && hashMatches;
    record(13, 'sp_set_account_password sets hash + must_change_password=1',
      ok ? 'PASS' : 'FAIL', `result_user_id=${Number(firstValue(rows))}, must_change_password=${u.must_change_password}, stored_hash_equals_provided=${hashMatches}`);
  } catch (e) { record(13, 'sp_set_account_password happy path', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 14: sp_set_account_password on admin is forbidden ----------
  try {
    const adminId = Number((await one(`SELECT id AS v FROM ${STAGING_DB}.users WHERE username = 'stg-admin'`)).v);
    const before = await one(`SELECT password, must_change_password FROM ${STAGING_DB}.users WHERE id = ${adminId}`);
    const r = await expectWriterError(`sp_set_account_password(${adminId}, ${q(h2)})`, 'ACCOUNT_NOT_PERMITTED');
    const after = await one(`SELECT password, must_change_password FROM ${STAGING_DB}.users WHERE id = ${adminId}`);
    const unchanged = before.password === after.password && before.must_change_password === after.must_change_password;
    record(14, 'sp_set_account_password refuses admin accounts',
      r.threw && r.matched && unchanged ? 'PASS' : 'FAIL',
      `${r.detail}; admin_row_unchanged=${unchanged}`);
  } catch (e) { record(14, 'sp_set_account_password admin', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 15: sp_change_own_password wrong-old + correct-old ----------
  try {
    const r1 = await expectWriterError(`sp_change_own_password(${idS1}, ${q(h3)}, ${q(h4)})`, 'VERIFY_FAILED_OR_NOT_PERMITTED');
    const afterWrong = await one(`SELECT password, must_change_password FROM ${STAGING_DB}.users WHERE id = ${idS1}`);
    const unchangedAfterWrong = afterWrong.password === h2 && afterWrong.must_change_password === 1;

    const rows = await callWriter(`sp_change_own_password(${idS1}, ${q(h2)}, ${q(h4)})`);
    const after = await one(`SELECT password, must_change_password FROM ${STAGING_DB}.users WHERE id = ${idS1}`);
    const changedCorrectly = after.password === h4 && after.must_change_password === 0;

    const ok = r1.threw && r1.matched && unchangedAfterWrong && changedCorrectly;
    record(15, 'sp_change_own_password wrong-old rejected; correct-old succeeds and clears flag',
      ok ? 'PASS' : 'FAIL',
      `wrong_old=${r1.detail}, unchanged_after_wrong=${unchangedAfterWrong}, change_result=${Number(firstValue(rows))}, flag_after=${after.must_change_password}, hash_swapped=${after.password === h4}`);
  } catch (e) { record(15, 'sp_change_own_password', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- Test 16: exact SHOW GRANTS for both staging accounts ----------
  try {
    // MariaDB (a) backticks + alphabetizes column lists, (b) merges all
    // column grants for one table into ONE line: GRANT SELECT (...), INSERT
    // (...), UPDATE (...) ON tbl TO acct. Parse every line into a flat set of
    // "verb(cols)@target -> account" items so the comparison is
    // formatting-insensitive but content-exact.
    const parseLine = (line) => {
      let s = line.replace(/ IDENTIFIED BY PASSWORD '[^']*'/, '').replace(/`/g, '');
      const acct = (s.match(/TO\s+(.+)$/i) || [])[1] || '';
      const items = [];
      // EXECUTE ON PROCEDURE db.sp
      let m = s.match(/GRANT EXECUTE ON PROCEDURE (.+?) TO/i);
      if (m) items.push(`EXECUTE@${m[1]} -> ${acct}`);
      // USAGE ON *.*
      m = s.match(/GRANT USAGE ON (.+?) TO/i);
      if (m) items.push(`USAGE@${m[1]} -> ${acct}`);
      // one or more verb (cols) groups ... ON db.table TO acct
      const onM = s.match(/ON (.+?) TO/i);
      const verbGroups = [...s.matchAll(/(SELECT|INSERT|UPDATE|DELETE)\s*\(([^)]*)\)/gi)];
      if (onM && verbGroups.length) {
        for (const g of verbGroups) {
          const cols = g[2].split(',').map((c) => c.trim()).sort().join(', ');
          items.push(`${g[1].toUpperCase()}(${cols})@${onM[1]} -> ${acct}`);
        }
      }
      return items;
    };
    const grab = async (who) => {
      const rows = await root.$queryRawUnsafe(`SHOW GRANTS FOR '${who}'@'localhost'`);
      return rows.flatMap((r) => parseLine(String(Object.values(r)[0]))).sort();
    };
    const definer = await grab('essjt_definer');
    const writ = await grab('essjt_writer');

    const d = STAGING_DB;
    const ex = (proc, acct) => `EXECUTE@${d}.${proc} -> ${acct}@localhost`;
    const six = ['sp_register_student', 'sp_register_teacher', 'sp_approve_registration',
      'sp_reject_registration', 'sp_set_account_password', 'sp_change_own_password'];
    const colGrant = (verb, table, cols) =>
      `${verb.toUpperCase()}(${cols.split(',').map((c) => c.trim()).sort().join(', ')})@${d}.${table} -> essjt_definer@localhost`;

    const expectedWriter = [
      'USAGE@*.* -> essjt_writer@localhost',
      ...six.map((p) => ex(p, 'essjt_writer')),
    ].sort();
    const expectedDefiner = [
      'USAGE@*.* -> essjt_definer@localhost',
      ...six.map((p) => ex(p, 'essjt_definer')),
      colGrant('SELECT', 'users', 'id, username, email, password, role, must_change_password, registration_status'),
      colGrant('INSERT', 'users', 'username, password, full_name, email, phone, role, status, must_change_password, registration_status'),
      colGrant('INSERT', 'students', 'user_id, student_id, trade, level, section, gender, date_of_birth, guardian_name, guardian_phone, enrollment_date'),
      colGrant('INSERT', 'teachers', 'user_id, teacher_id, subject, department, hire_date'),
      colGrant('UPDATE', 'users', 'password, status, must_change_password, registration_status'),
    ].sort();

    const wr = writ.slice().sort();
    const dr = definer.slice().sort();
    const writerOk = JSON.stringify(wr) === JSON.stringify(expectedWriter);
    const definerOk = JSON.stringify(dr) === JSON.stringify(expectedDefiner);
    const diff = [];
    if (!writerOk) diff.push('WRITER diff — got: ' + JSON.stringify(wr, null, 1).slice(0, 400) + ' expected: ' + JSON.stringify(expectedWriter, null, 1).slice(0, 400));
    if (!definerOk) diff.push('DEFINER diff — got: ' + JSON.stringify(dr, null, 1).slice(0, 400) + ' expected: ' + JSON.stringify(expectedDefiner, null, 1).slice(0, 400));
    record(16, 'exact SHOW GRANTS equals the approved privilege set (both accounts, incl. approved definer EXECUTE amendment)',
      writerOk && definerOk ? 'PASS' : 'FAIL',
      writerOk && definerOk
        ? 'writer: 7 grants (USAGE + 6 EXECUTE); definer: 12 grants (USAGE + 6 EXECUTE + 5 column-scoped); exact normalized-set match'
        : diff.join(' | ').slice(0, 600));
  } catch (e) { record(16, 'exact SHOW GRANTS', 'FAIL', String(e.message).slice(0, 140)); }

  // ---------- post-run cleanup + final staging state ----------
  const post = await cleanTestRows();
  const finalCounts = await one(
    `SELECT (SELECT COUNT(*) FROM ${STAGING_DB}.users) AS u, (SELECT COUNT(*) FROM ${STAGING_DB}.students) AS s, (SELECT COUNT(*) FROM ${STAGING_DB}.teachers) AS t`
  );
  console.log(`[tests] post-run cleanup: users=${post.nUsers}, students=${post.nStudents}, teachers=${post.nTeachers}`);
  console.log(`[tests] final staging rows (setup synthetic records only): users=${finalCounts.u}, students=${finalCounts.s}, teachers=${finalCounts.t}`);

  // ---------- summary ----------
  const fails = results.filter((r) => r.status !== 'PASS' && r.id !== 0);
  console.log('');
  console.log(`SUMMARY: ${results.filter((r) => r.status === 'PASS' && r.id !== 0).length}/16 PASS` +
    (fails.length ? ` — ${fails.map((f) => f.id).join(',')} NOT PASS` : ''));
  writeFileSync(
    join(here, 'test-results.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );
  console.log('[tests] wrote scripts/staging/test-results.json (no secrets)');
  process.exitCode = fails.length ? 2 : 0;
}

main()
  .catch((e) => {
    console.error('[tests] FATAL:', String(e.message).slice(0, 300));
    process.exitCode = 1;
  })
  .finally(async () => {
    await writer.$disconnect().catch(() => {});
    await root.$disconnect().catch(() => {});
  });

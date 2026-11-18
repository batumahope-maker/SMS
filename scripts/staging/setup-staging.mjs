// ESSJT staging preparation — STAGING ONLY.
//
//   node scripts/staging/setup-staging.mjs            (fresh run)
//   node scripts/staging/setup-staging.mjs --resume   (accounts already exist)
//
// Creates essjt_school_system_staging (synthetic schema + data), the staging
// essjt_definer / essjt_writer accounts, the six reviewed stored procedures,
// and the approved column-level / EXECUTE grants.
//
// Safety model:
//   - The live essjt_school_system database is NEVER referenced by any SQL
//     in this script (structurally: the only database name used is the
//     staging constant below).
//   - Root is used ONLY against the staging database.
//   - Generated account passwords are written to scripts/staging/staging.env
//     (untracked) and never printed, logged, or committed.
//   - Existing accounts are never recreated: with --resume the script reuses
//     them and re-verifies the stored credentials by connecting.
//   - If a staging database already contains data, this script stops and asks
//     for approval instead of dropping it.

import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const STAGING_DB = 'essjt_school_system_staging';
const ROOT_URL = 'mysql://root@127.0.0.1:3306/test'; // empty-password XAMPP root; never printed
const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, 'staging.env');
const reportFile = join(here, 'setup-report.json');
const RESUME = process.argv.includes('--resume');
const RECREATE = process.argv.includes('--recreate-procedures');

// Approved amendment (Option 1): staging procedures are re-created inside a
// strict-session sql_mode so that the routines capture and enforce strictness
// at runtime (stored routines freeze the sql_mode in effect at creation).
// Definitions, DEFINER, and privileges are otherwise untouched; the routine-
// level EXECUTE grants are re-applied afterwards because DROP PROCEDURE
// removes its procs_priv rows mechanically.
const STRICT_SQL_MODE =
  'STRICT_TRANS_TABLES,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION';

const log = [];
const record = (line) => {
  console.log(line);
  log.push(line);
};

function exitWithStop(reason) {
  console.error('[STOP] ' + reason);
  process.exitCode = 3;
}

// Never print a URL (contains account passwords). Only safe metadata.
const safeAccount = (url) => {
  try {
    const u = new URL(url.replace('mysql://', 'http://'));
    return `${u.username}@${u.hostname}`;
  } catch {
    return '(unparsed)';
  }
};

const root = new PrismaClient({ datasources: { db: { url: ROOT_URL } } });

// The staging accounts hold no db-level privileges (per the approved plan), so
// they cannot select a default database at connect time (MariaDB 1044).
// All staging connections therefore use an EMPTY default database and
// fully-qualified identifiers (e.g. CALL `db`.sp_x(...), SELECT FROM `db`.t).
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');

// CREATE/DROP PROCEDURE cannot run through the MySQL prepared-statement
// protocol (error 1295), which the Prisma driver uses for raw queries.
// Routine DDL therefore goes through the mysql CLI (text protocol). The root
// account has no password; no credentials appear on the command line, and the
// SQL script is fed via stdin. This is staging-only SQL by construction.
const MYSQL_CLI = 'C:\\xampp\\mysql\\bin\\mysql.exe';
function runMysqlCliScript(script) {
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

// Bcrypt-format check sent into the procedure bodies (approved definition).
const BCRYPT_RE_SQL = String.raw`^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$`;

const PROCEDURES = {
  sp_register_student: (re) => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_register_student(
  IN p_username VARCHAR(100), IN p_password_hash VARCHAR(255),
  IN p_full_name VARCHAR(200), IN p_email VARCHAR(150), IN p_phone VARCHAR(20),
  IN p_trade VARCHAR(100), IN p_level VARCHAR(20), IN p_section VARCHAR(10),
  IN p_gender VARCHAR(10), IN p_date_of_birth DATE,
  IN p_guardian_name VARCHAR(200), IN p_guardian_phone VARCHAR(20),
  IN p_enrollment_date DATE
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_exists  INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_password_hash NOT REGEXP '${re}' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_HASH_FORMAT';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM users WHERE username = p_username;
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USERNAME';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM users WHERE email = p_email;
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMAIL';
  END IF;

  START TRANSACTION;
    INSERT INTO users
      (username, password, full_name, email, phone, role, status,
       must_change_password, registration_status)
    VALUES
      (p_username, p_password_hash, p_full_name, p_email, p_phone,
       'student', 'Inactive', 0, 'pending');
    SET v_user_id = LAST_INSERT_ID();

    INSERT INTO students
      (user_id, student_id, trade, level, section, gender,
       date_of_birth, guardian_name, guardian_phone, enrollment_date)
    VALUES
      (v_user_id, NULL, p_trade, p_level, p_section, p_gender,
       p_date_of_birth, p_guardian_name, p_guardian_phone, p_enrollment_date);
  COMMIT;

  SELECT v_user_id AS new_user_id;
END`,

  sp_register_teacher: (re) => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_register_teacher(
  IN p_username VARCHAR(100), IN p_password_hash VARCHAR(255),
  IN p_full_name VARCHAR(200), IN p_email VARCHAR(150), IN p_phone VARCHAR(20),
  IN p_subject VARCHAR(100), IN p_department VARCHAR(100), IN p_hire_date DATE
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_exists  INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_password_hash NOT REGEXP '${re}' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_HASH_FORMAT';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM users WHERE username = p_username;
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USERNAME';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM users WHERE email = p_email;
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMAIL';
  END IF;

  START TRANSACTION;
    INSERT INTO users
      (username, password, full_name, email, phone, role, status,
       must_change_password, registration_status)
    VALUES
      (p_username, p_password_hash, p_full_name, p_email, p_phone,
       'teacher', 'Inactive', 0, 'pending');
    SET v_user_id = LAST_INSERT_ID();

    INSERT INTO teachers
      (user_id, teacher_id, subject, department, hire_date)
    VALUES
      (v_user_id, NULL, p_subject, p_department, p_hire_date);
  COMMIT;

  SELECT v_user_id AS new_user_id;
END`,

  sp_approve_registration: () => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_approve_registration(
  IN p_user_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  UPDATE users
     SET status = 'Active', registration_status = 'approved'
   WHERE id = p_user_id
     AND role IN ('student', 'teacher')
     AND registration_status = 'pending';
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NO_PENDING_REGISTRATION';
  END IF;
  SELECT p_user_id AS approved_user_id;
END`,

  sp_reject_registration: () => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_reject_registration(
  IN p_user_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  UPDATE users
     SET registration_status = 'rejected'
   WHERE id = p_user_id
     AND role IN ('student', 'teacher')
     AND registration_status = 'pending';
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NO_PENDING_REGISTRATION';
  END IF;
  SELECT p_user_id AS rejected_user_id;
END`,

  sp_set_account_password: (re) => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_set_account_password(
  IN p_user_id       INT,
  IN p_password_hash VARCHAR(255)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  IF p_password_hash NOT REGEXP '${re}' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_HASH_FORMAT';
  END IF;

  UPDATE users
     SET password = p_password_hash,
         must_change_password = 1
   WHERE id = p_user_id
     AND role IN ('student', 'teacher');

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ACCOUNT_NOT_PERMITTED';
  END IF;
  SELECT p_user_id AS updated_user_id;
END`,

  sp_change_own_password: (re) => `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_change_own_password(
  IN p_user_id           INT,
  IN p_expected_old_hash VARCHAR(255),
  IN p_new_password_hash VARCHAR(255)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  IF p_new_password_hash NOT REGEXP '${re}' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_HASH_FORMAT';
  END IF;

  UPDATE users
     SET password = p_new_password_hash,
         must_change_password = 0
   WHERE id = p_user_id
     AND role IN ('student', 'teacher')
     AND must_change_password = 1
     AND password = p_expected_old_hash;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VERIFY_FAILED_OR_NOT_PERMITTED';
  END IF;
  SELECT p_user_id AS updated_user_id;
END`,
};

const DDL = {
  users: `CREATE TABLE ${STAGING_DB}.users (
  id int(11) NOT NULL AUTO_INCREMENT,
  username varchar(100) NOT NULL,
  password varchar(255) NOT NULL,
  full_name varchar(200) NOT NULL,
  email varchar(150) NOT NULL,
  phone varchar(20) DEFAULT NULL,
  role enum('student','teacher','admin') NOT NULL,
  status enum('Active','Inactive','Suspended','Graduated') DEFAULT 'Active',
  must_change_password tinyint(1) NOT NULL DEFAULT 0,
  registration_status enum('pending','approved','rejected') DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email),
  KEY username_2 (username),
  KEY role (role),
  KEY status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  students: `CREATE TABLE ${STAGING_DB}.students (
  id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) DEFAULT NULL,
  student_id varchar(20) DEFAULT NULL,
  trade varchar(100) DEFAULT NULL,
  level varchar(20) DEFAULT NULL,
  section varchar(10) DEFAULT NULL,
  gender varchar(10) DEFAULT NULL,
  date_of_birth date DEFAULT NULL,
  guardian_name varchar(200) DEFAULT NULL,
  guardian_phone varchar(20) DEFAULT NULL,
  enrollment_date date DEFAULT NULL,
  fee_paid decimal(10,2) DEFAULT 0.00,
  fee_balance decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id),
  UNIQUE KEY student_id (student_id),
  CONSTRAINT students_ibfk_1 FOREIGN KEY (user_id)
    REFERENCES ${STAGING_DB}.users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  teachers: `CREATE TABLE ${STAGING_DB}.teachers (
  id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) DEFAULT NULL,
  teacher_id varchar(20) DEFAULT NULL,
  subject varchar(100) DEFAULT NULL,
  department varchar(100) DEFAULT NULL,
  hire_date date DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id),
  UNIQUE KEY teacher_id (teacher_id),
  CONSTRAINT teachers_ibfk_1 FOREIGN KEY (user_id)
    REFERENCES ${STAGING_DB}.users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
};

async function main() {
  // --recreate-procedures: re-create the six routines under the strict
  // session sql_mode and restore the approved routine-level EXECUTE grants.
  // Touches nothing else (no tables, accounts, column grants, or data).
  if (RECREATE) {
    const [me0] = await root.$queryRawUnsafe('SELECT CURRENT_USER() AS a, VERSION() AS v');
    record(`[setup] connected as ${me0.a} (MariaDB ${me0.v}) — --recreate-procedures mode`);
    for (const [name, build] of Object.entries(PROCEDURES)) {
      const body = build(BCRYPT_RE_SQL).trim();
      const script =
        `SET SESSION sql_mode = '${STRICT_SQL_MODE}';\n` +
        `DROP PROCEDURE IF EXISTS ${STAGING_DB}.${name};\n` +
        'DELIMITER $$\n' + body + '\n$$\nDELIMITER ;\n';
      runMysqlCliScript(script);
      record(`[setup] recreated procedure ${name} under strict session sql_mode`);
    }
    const definerExecuteGrants = [
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_student TO 'essjt_definer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_teacher TO 'essjt_definer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_approve_registration TO 'essjt_definer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_reject_registration TO 'essjt_definer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_set_account_password TO 'essjt_definer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_change_own_password TO 'essjt_definer'@'localhost'`,
    ];
    const writerGrants = [
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_student TO 'essjt_writer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_teacher TO 'essjt_writer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_approve_registration TO 'essjt_writer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_reject_registration TO 'essjt_writer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_set_account_password TO 'essjt_writer'@'localhost'`,
      `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_change_own_password TO 'essjt_writer'@'localhost'`,
    ];
    for (const g of [...definerExecuteGrants, ...writerGrants]) {
      await root.$executeRawUnsafe(g);
    }
    await root.$executeRawUnsafe('FLUSH PRIVILEGES');
    record('[setup] restored 12 routine-level EXECUTE grants (6 definer + 6 writer, identical to approved set) + FLUSH PRIVILEGES');
    const modes = await root.$queryRawUnsafe(
      "SELECT ROUTINE_NAME, SQL_MODE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME",
      STAGING_DB
    );
    for (const m of modes) {
      record(`[setup] routine ${m.ROUTINE_NAME} captured sql_mode: ${m.SQL_MODE}`);
    }
    record('[setup] --recreate-procedures DONE');
    process.exitCode = 0;
    return;
  }

  // 0. Identity + isolation probes.
  const [me] = await root.$queryRawUnsafe('SELECT CURRENT_USER() AS a, VERSION() AS v');
  record(`[setup] connected as ${me.a} (MariaDB ${me.v})`);
  if (!String(me.a).startsWith('root@')) {
    return exitWithStop('expected the local root account for staging setup.');
  }

  // 1. Staging database state.
  const existing = await root.$queryRawUnsafe(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    STAGING_DB
  );
  let writerUrl = null;
  let definerUrl = null;
  let accountsExisted = false;

  if (existing.length > 0) {
    const haveTables = await root.$queryRawUnsafe(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?)',
      STAGING_DB, 'users', 'students', 'teachers'
    );
    if (Number(haveTables[0].n) !== 3) {
      return exitWithStop(
        `staging database exists with ${Number(haveTables[0].n)}/3 expected tables — ` +
        'unexpected state, stopping for approval.'
      );
    }
    const counts = await root.$queryRawUnsafe(
      `SELECT (SELECT COUNT(*) FROM ${STAGING_DB}.users) AS u,
              (SELECT COUNT(*) FROM ${STAGING_DB}.students) AS s,
              (SELECT COUNT(*) FROM ${STAGING_DB}.teachers) AS t`
    );
    const total = Number(counts[0].u) + Number(counts[0].s) + Number(counts[0].t);
    if (total > 0) {
      return exitWithStop(
        `${STAGING_DB} already contains ${total} rows. ` +
        'It may hold important staging data — stopping for approval instead of dropping it.'
      );
    }
    if (!RESUME) {
      return exitWithStop(
        'staging database already exists (empty). Use --resume to continue the frozen setup.'
      );
    }
    record('[setup] --resume: staging database exists, 3 tables present, 0 rows — continuing frozen setup.');
  } else {
    if (RESUME) {
      return exitWithStop('--resume requested but the staging database does not exist. Run a fresh setup.');
    }
    record('[setup] staging database does not exist — creating fresh.');
    await root.$executeRawUnsafe(
      `CREATE DATABASE ${STAGING_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    for (const [name, ddl] of Object.entries(DDL)) {
      await root.$executeRawUnsafe(ddl);
      record(`[setup] created table ${name}`);
    }
  }

  // 2. Staging accounts: reuse if they exist, otherwise create.
  const found = await root.$queryRawUnsafe(
    "SELECT user, host FROM mysql.user WHERE user IN ('essjt_definer', 'essjt_writer') AND host = 'localhost'"
  );
  accountsExisted = found.length === 2;
  if (accountsExisted) {
    if (!existsSync(envFile)) {
      return exitWithStop(
        'staging accounts exist but scripts/staging/staging.env is missing — ' +
        'cannot verify credentials; stopping for approval.'
      );
    }
    const env = readFileSync(envFile, 'utf8');
    writerUrl = env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL='))
      ?.split('=').slice(1).join('=') || null;
    definerUrl = env.split('\n').find((l) => l.startsWith('STAGING_DEFINER_URL='))
      ?.split('=').slice(1).join('=') || null;
    if (!writerUrl || !definerUrl) {
      return exitWithStop('staging.env is missing required entries; stopping for approval.');
    }
    // The stored URLs include a default database, which these accounts cannot
    // select (no db-level grants by design). Normalize to an empty default db.
    writerUrl = stripDefaultDb(writerUrl);
    definerUrl = stripDefaultDb(definerUrl);
    record('[setup] --resume: staging accounts already exist — reusing (not recreating).');
    // Verify stored credentials actually match the existing accounts.
    const probe = new PrismaClient({ datasources: { db: { url: writerUrl } } });
    try {
      const [w] = await probe.$queryRawUnsafe('SELECT CURRENT_USER() AS a');
      if (String(w.a) !== 'essjt_writer@localhost') {
        return exitWithStop(`staging.env credentials authenticate as unexpected account (${w.a}).`);
      }
      record(`[setup] --resume: staging.env credentials verified as ${w.a}`);
    } catch (e) {
      return exitWithStop('stored staging credentials do not authenticate — stopping for approval.');
    } finally {
      await probe.$disconnect().catch(() => {});
    }
  } else {
    if (found.length !== 0) {
      return exitWithStop('only one of the two staging accounts exists — unexpected state, stopping.');
    }
    if (!RESUME) {
      const definerPw = randomBytes(24).toString('hex');
      const writerPw = randomBytes(24).toString('hex');
      await root.$executeRawUnsafe(
        `CREATE USER 'essjt_definer'@'localhost' IDENTIFIED BY '${definerPw}'`
      );
      await root.$executeRawUnsafe(
        `CREATE USER 'essjt_writer'@'localhost' IDENTIFIED BY '${writerPw}'`
      );
      writeFileSync(
        envFile,
        [
          '# Staging-only credentials (untracked; never print or commit).',
          '# NOTE: no default database in the URL — staging accounts hold no',
          '# db-level grants by design; callers fully-qualify identifiers.',
          `STAGING_WRITER_URL=mysql://essjt_writer:${writerPw}@127.0.0.1:3306/`,
          `STAGING_DEFINER_URL=mysql://essjt_definer:${definerPw}@127.0.0.1:3306/`,
          '',
        ].join('\n')
      );
      record('[setup] created accounts essjt_definer@localhost, essjt_writer@localhost (passwords generated, stored in staging.env, never printed)');
    } else {
      return exitWithStop(
        '--resume requested but staging accounts do not exist; run without --resume.'
      );
    }
  }

  // 3. Definer grants (column-scoped exactly as approved). Applied first:
  //    they only reference tables, which already exist.
  const definerGrants = [
    `GRANT SELECT (id, username, email, password, role, must_change_password, registration_status) ON ${STAGING_DB}.users TO 'essjt_definer'@'localhost'`,
    `GRANT INSERT (username, password, full_name, email, phone, role, status, must_change_password, registration_status) ON ${STAGING_DB}.users TO 'essjt_definer'@'localhost'`,
    `GRANT INSERT (user_id, student_id, trade, level, section, gender, date_of_birth, guardian_name, guardian_phone, enrollment_date) ON ${STAGING_DB}.students TO 'essjt_definer'@'localhost'`,
    `GRANT INSERT (user_id, teacher_id, subject, department, hire_date) ON ${STAGING_DB}.teachers TO 'essjt_definer'@'localhost'`,
    `GRANT UPDATE (password, status, must_change_password, registration_status) ON ${STAGING_DB}.users TO 'essjt_definer'@'localhost'`,
  ];
  for (const g of definerGrants) {
    await root.$executeRawUnsafe(g);
  }
  record(`[setup] applied ${definerGrants.length} definer grants (column-scoped)`);

  // 4. The six procedures (approved definitions, DEFINER declared). Created
  //    BEFORE the EXECUTE grants: GRANT EXECUTE on a missing routine fails
  //    with 1305. DDL runs through the mysql CLI because routine DDL is not
  //    supported by the prepared-statement protocol (Prisma error 1295).
  for (const [name, build] of Object.entries(PROCEDURES)) {
    const body = build(BCRYPT_RE_SQL).trim();
    const script =
      `DROP PROCEDURE IF EXISTS ${STAGING_DB}.${name};\n` +
      'DELIMITER $$\n' + body + '\n$$\nDELIMITER ;\n';
    runMysqlCliScript(script);
    record(`[setup] created procedure ${name}`);
  }

  // 5. Definer EXECUTE grants (approved amendment): MariaDB requires an
  //    SQL SECURITY DEFINER routine's definer to hold EXECUTE on the routine
  //    itself; without it every CALL fails with 1370 naming the definer.
  //    Applied after procedure creation (GRANT EXECUTE on a missing routine
  //    fails with 1305). Staging procedures only — exactly these six.
  const definerExecuteGrants = [
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_student TO 'essjt_definer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_teacher TO 'essjt_definer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_approve_registration TO 'essjt_definer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_reject_registration TO 'essjt_definer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_set_account_password TO 'essjt_definer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_change_own_password TO 'essjt_definer'@'localhost'`,
  ];
  for (const g of definerExecuteGrants) {
    await root.$executeRawUnsafe(g);
  }
  record(`[setup] applied ${definerExecuteGrants.length} definer EXECUTE grants (approved amendment)`);

  // 6. Writer grants: placeholder + exactly six EXECUTE.
  const writerGrants = [
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_student TO 'essjt_writer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_register_teacher TO 'essjt_writer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_approve_registration TO 'essjt_writer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_reject_registration TO 'essjt_writer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_set_account_password TO 'essjt_writer'@'localhost'`,
    `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.sp_change_own_password TO 'essjt_writer'@'localhost'`,
  ];
  for (const g of writerGrants) {
    await root.$executeRawUnsafe(g);
  }
  await root.$executeRawUnsafe('FLUSH PRIVILEGES');
  record(`[setup] applied ${writerGrants.length} EXECUTE grants + FLUSH PRIVILEGES`);

  // 6. Synthetic data only (no real personal data).
  const dummyHash = bcrypt.hashSync('staging-dummy-password-123', 12); // never printed
  await root.$executeRawUnsafe(
    `INSERT INTO ${STAGING_DB}.users (username, password, full_name, email, phone, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
    'stg-admin', dummyHash, 'Staging Admin', 'stg-admin@example.test', '0000000000', 'admin'
  );
  await root.$executeRawUnsafe(
    `INSERT INTO ${STAGING_DB}.users (username, password, full_name, email, phone, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
    'stg-teacher', dummyHash, 'Staging Teacher', 'stg-teacher@example.test', '0000000000', 'teacher'
  );
  await root.$executeRawUnsafe(
    `INSERT INTO ${STAGING_DB}.users (username, password, full_name, email, phone, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
    'stg-student', dummyHash, 'Staging Student', 'stg-student@example.test', '0000000000', 'student'
  );
  const ids = await root.$queryRawUnsafe(
    `SELECT id, username FROM ${STAGING_DB}.users WHERE username IN ('stg-admin','stg-teacher','stg-student')`
  );
  const idOf = (u) => Number(ids.find((r) => r.username === u).id);
  await root.$executeRawUnsafe(
    `INSERT INTO ${STAGING_DB}.teachers (user_id, teacher_id, subject, department, hire_date)
     VALUES (?, ?, ?, ?, ?)`,
    idOf('stg-teacher'), 'STG-T01', 'Synthetic Subject', 'Staging Dept', '2023-01-01'
  );
  await root.$executeRawUnsafe(
    `INSERT INTO ${STAGING_DB}.students (user_id, student_id, trade, level, section, gender, date_of_birth, guardian_name, guardian_phone, enrollment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    idOf('stg-student'), 'STG-S01', 'Synthetic Trade', 'L3', 'A', 'M', '2005-01-01',
    'Staging Guardian', '0000000000', '2023-01-01'
  );
  record('[setup] inserted synthetic records: 1 admin, 1 teacher (+profile), 1 student (+profile); passwords are bcrypt hashes of a dummy value (never printed)');

  // 7. SHOW GRANTS verification (as root) — evidence, no secrets.
  const grants = {};
  for (const who of ['essjt_writer', 'essjt_definer']) {
    grants[who] = (
      await root.$queryRawUnsafe(`SHOW GRANTS FOR '${who}'@'localhost'`)
    ).map((r) => Object.values(r)[0]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: RESUME ? 'resume' : 'fresh',
    accountsExisted,
    connectedAs: String(me.a),
    serverVersion: String(me.v),
    stagingDatabase: STAGING_DB,
    tablesCreated: existing.length > 0 ? [] : Object.keys(DDL),
    accountsCreated: accountsExisted ? [] : ['essjt_definer@localhost', 'essjt_writer@localhost'],
    proceduresCreated: Object.keys(PROCEDURES),
    grantsApplied: { definer: definerGrants, writer: writerGrants },
    showGrants: grants,
    syntheticRecords: ['stg-admin (role admin)', 'stg-teacher (+teachers row)', 'stg-student (+students row)'],
  };
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  record('[setup] wrote scripts/staging/setup-report.json (no secrets)');

  // 8. Sanity: the writer connection must work and must NOT read tables.
  record(`[setup] writer connection account: ${safeAccount(writerUrl)}`);
  const writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
  const [w] = await writer.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
  record(`[setup] writer connects as ${w.a} on database ${w.d}`);
  let denied = false;
  try {
    await writer.$queryRawUnsafe(`SELECT id FROM ${STAGING_DB}.users LIMIT 1`);
  } catch (e) {
    denied = /command denied|denied/i.test(String(e.message));
  }
  record(`[setup] writer direct SELECT denied: ${denied}`);
  await writer.$disconnect();

  record('[setup] DONE — staging ready. Run scripts/staging/run-staging-tests.mjs next.');
  process.exitCode = 0;
}

main()
  .catch((e) => {
    console.error('[setup] FAILED:', String(e.message).slice(0, 400));
    process.exitCode = 1;
  })
  .finally(() => root.$disconnect().catch(() => {}));

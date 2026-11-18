// ESSJT staging preparation — Transport & Library. STAGING ONLY.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/staging/setup-staging-transport-library.mjs
//
// Extends the EXISTING staging database (essjt_school_system_staging, created by
// setup-staging.mjs) with the transport & library feature:
//   - 5 new tables (vehicles, transport_routes, transport_assignments, books,
//     book_issues) using live-DB conventions,
//   - a STAGING-ONLY mirror of the live `payments` shape + the additive
//     `purpose` column and dedup unique key (the live payments table is never
//     touched and no live data is copied),
//   - the 15 reviewed stored procedures (SQL SECURITY DEFINER, strict captured
//     sql_mode),
//   - definer column/table grants + 30 routine EXECUTE grants on the EXISTING
//     staging accounts (no new accounts, staging.env never modified).
//
// Safety model:
//   - The only database name used by any SQL here is the staging constant.
//   - The script ABORTS if the live essjt_school_system database shows any
//     sign of transport/library changes (staging/live separation guard).
//   - Root is used ONLY against the staging database + privilege tables.
//   - No credentials are ever printed.
//   - Re-runs are supported: existing tables are verified (not dropped) and
//     procedures are re-created (their EXECUTE grants are re-applied because
//     DROP PROCEDURE mechanically removes its procs_priv rows).

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const STAGING_DB = 'essjt_school_system_staging';
const LIVE_DB = 'essjt_school_system';
const ROOT_URL = 'mysql://root@127.0.0.1:3306/'; // empty-password XAMPP root; never printed
const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, 'staging.env');
const reportFile = join(here, 'transport-library-setup-report.json');

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

// The staging accounts hold no db-level privileges by design, so all their
// connections use an EMPTY default database and fully-qualified identifiers.
const stripDefaultDb = (url) => url.replace(/\/[^/@?]*$/, '/');

// Routine DDL cannot run through the prepared-statement protocol (Prisma
// error 1295) — it goes through the mysql CLI text protocol via stdin.
// Root has no password; no credentials appear on the command line. This is
// staging-only SQL by construction.
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

// ---------------------------------------------------------------------------
// DDL — live-DB conventions: int(11) AI PKs, snake_case, created_at,
// InnoDB, utf8mb4_unicode_ci, FKs to users(id).
// ---------------------------------------------------------------------------
const DDL = {
  vehicles: `CREATE TABLE ${STAGING_DB}.vehicles (
  id int(11) NOT NULL AUTO_INCREMENT,
  vehicle_number varchar(20) NOT NULL,
  vehicle_type varchar(50) DEFAULT NULL,
  capacity int(11) NOT NULL,
  driver_name varchar(100) NOT NULL,
  driver_phone varchar(20) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY vehicle_number (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  transport_routes: `CREATE TABLE ${STAGING_DB}.transport_routes (
  id int(11) NOT NULL AUTO_INCREMENT,
  vehicle_id int(11) NOT NULL,
  name varchar(100) NOT NULL,
  stops text DEFAULT NULL,
  morning_time time DEFAULT NULL,
  evening_time time DEFAULT NULL,
  fare decimal(10,2) DEFAULT 0.00,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY vehicle_id (vehicle_id),
  CONSTRAINT fk_troutes_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES ${STAGING_DB}.vehicles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  transport_assignments: `CREATE TABLE ${STAGING_DB}.transport_assignments (
  id int(11) NOT NULL AUTO_INCREMENT,
  student_id int(11) NOT NULL,
  route_id int(11) NOT NULL,
  pickup_point varchar(100) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY student_id (student_id),
  KEY route_id (route_id),
  CONSTRAINT fk_tassign_user FOREIGN KEY (student_id)
    REFERENCES ${STAGING_DB}.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tassign_route FOREIGN KEY (route_id)
    REFERENCES ${STAGING_DB}.transport_routes (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  books: `CREATE TABLE ${STAGING_DB}.books (
  id int(11) NOT NULL AUTO_INCREMENT,
  title varchar(200) NOT NULL,
  author varchar(200) DEFAULT NULL,
  isbn varchar(20) DEFAULT NULL,
  category varchar(100) DEFAULT NULL,
  publisher varchar(100) DEFAULT NULL,
  published_year int(11) DEFAULT NULL,
  quantity int(11) NOT NULL DEFAULT 0,
  available int(11) NOT NULL DEFAULT 0,
  location varchar(100) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY isbn (isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  book_issues: `CREATE TABLE ${STAGING_DB}.book_issues (
  id int(11) NOT NULL AUTO_INCREMENT,
  book_id int(11) NOT NULL,
  student_id int(11) NOT NULL,
  issued_at date NOT NULL,
  due_date date NOT NULL,
  returned_at date DEFAULT NULL,
  fine decimal(10,2) NOT NULL DEFAULT 0.00,
  fine_paid tinyint(1) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY book_id (book_id),
  KEY student_id (student_id),
  CONSTRAINT fk_bissues_book FOREIGN KEY (book_id)
    REFERENCES ${STAGING_DB}.books (id) ON DELETE RESTRICT,
  CONSTRAINT fk_bissues_student FOREIGN KEY (student_id)
    REFERENCES ${STAGING_DB}.users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // STAGING-ONLY mirror of the live payments shape (live: id, student_id
  // FK -> users.id, amount, payment_date, payment_method, reference,
  // created_at; index student_id; 0 rows at audit time) + the two additive
  // transport/library changes under review: purpose + uq_payment_dedup.
  // No live data is copied here, ever.
  payments: `CREATE TABLE ${STAGING_DB}.payments (
  id int(11) NOT NULL AUTO_INCREMENT,
  student_id int(11) DEFAULT NULL,
  purpose enum('school_fees','transport','library_fine') DEFAULT NULL,
  amount decimal(10,2) DEFAULT NULL,
  payment_date date DEFAULT NULL,
  payment_method varchar(50) DEFAULT NULL,
  reference varchar(100) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY student_id (student_id),
  UNIQUE KEY uq_payment_dedup (student_id, purpose, reference),
  CONSTRAINT fk_payments_user FOREIGN KEY (student_id)
    REFERENCES ${STAGING_DB}.users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
};

// ---------------------------------------------------------------------------
// The 15 procedures. SQL SECURITY DEFINER under essjt_definer@localhost,
// strict sql_mode captured at creation, EXIT HANDLER ROLLBACK + RESIGNAL,
// friendly SIGNAL business errors.
// ---------------------------------------------------------------------------
const HANDLER = `  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;`;

// Handler for the two payment-posting procedures: converts the dedup-key
// violation (MariaDB 1062) into the friendly DUPLICATE_PAYMENT signal
// (AMENDMENT 2) while every other error resignals untouched.
const PAYMENT_HANDLER = `  DECLARE v_errno INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_errno = MYSQL_ERRNO;
    ROLLBACK;
    IF v_errno = 1062 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PAYMENT';
    ELSE
      RESIGNAL;
    END IF;
  END;`;

// Handler for sp_assign_student: converts the transport_assignments unique-key
// violation (MariaDB 1062; the only unique key besides the PK is student_id,
// so 1062 can only mean a duplicate assignment) into the friendly
// ALREADY_ASSIGNED signal while every other error resignals untouched.
const ASSIGN_HANDLER = `  DECLARE v_errno INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_errno = MYSQL_ERRNO;
    ROLLBACK;
    IF v_errno = 1062 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ALREADY_ASSIGNED';
    ELSE
      RESIGNAL;
    END IF;
  END;`;

const P = {}; // name -> SQL body (CREATE ... END)

// 1 -----------------------------------------------------------------------
P.sp_add_vehicle = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_add_vehicle(
  IN p_vehicle_number VARCHAR(20), IN p_vehicle_type VARCHAR(50),
  IN p_capacity INT, IN p_driver_name VARCHAR(100), IN p_driver_phone VARCHAR(20)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
${HANDLER}

  IF p_capacity IS NULL OR p_capacity < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_CAPACITY';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM vehicles WHERE vehicle_number = p_vehicle_number;
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_VEHICLE_NUMBER';
  END IF;

  START TRANSACTION;
    INSERT INTO vehicles (vehicle_number, vehicle_type, capacity, driver_name, driver_phone)
    VALUES (p_vehicle_number, p_vehicle_type, p_capacity, p_driver_name, p_driver_phone);
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_vehicle_id;
END`;

// 2 -----------------------------------------------------------------------
P.sp_update_vehicle = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_update_vehicle(
  IN p_vehicle_id INT, IN p_vehicle_type VARCHAR(50),
  IN p_capacity INT, IN p_driver_name VARCHAR(100), IN p_driver_phone VARCHAR(20)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_vehicle_id INT;
  DECLARE v_assigned INT;
${HANDLER}

  IF p_capacity IS NULL OR p_capacity < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_CAPACITY';
  END IF;

  -- Canonical lock order (vehicle -> route -> assignment): the vehicle row is
  -- locked first so a concurrent sp_assign_student serialises on the same row
  -- and the capacity floor below always sees every committed assignment.
  START TRANSACTION;
    SELECT id INTO v_vehicle_id FROM vehicles WHERE id = p_vehicle_id FOR UPDATE;
    IF v_vehicle_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
    END IF;
    -- AMENDMENT 3: capacity can never drop below the students already assigned
    SELECT COUNT(*) INTO v_assigned
      FROM transport_assignments a
      JOIN transport_routes r ON r.id = a.route_id
      WHERE r.vehicle_id = p_vehicle_id;
    IF p_capacity < v_assigned THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CAPACITY_BELOW_ASSIGNMENTS';
    END IF;
    UPDATE vehicles
       SET vehicle_type = p_vehicle_type,
           capacity = p_capacity,
           driver_name = p_driver_name,
           driver_phone = p_driver_phone
     WHERE id = p_vehicle_id;
  COMMIT;

  SELECT p_vehicle_id AS updated_vehicle_id;
END`;

// 3 -----------------------------------------------------------------------
P.sp_delete_vehicle = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_delete_vehicle(
  IN p_vehicle_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_vehicle_id INT;
  DECLARE v_assigned INT;
${HANDLER}

  -- Canonical lock order (vehicle -> route -> assignment): the parent vehicle
  -- row is locked first; the CASCADE-acquired child-route X-locks are taken
  -- while the parent lock is already held, which is order-compliant, and a
  -- concurrent sp_assign_student serialises here instead of racing the count.
  START TRANSACTION;
    SELECT id INTO v_vehicle_id FROM vehicles WHERE id = p_vehicle_id FOR UPDATE;
    IF v_vehicle_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
    END IF;
    -- AMENDMENT 5: friendly pre-check; the RESTRICT chain is the backstop
    SELECT COUNT(*) INTO v_assigned
      FROM transport_assignments a
      JOIN transport_routes r ON r.id = a.route_id
      WHERE r.vehicle_id = p_vehicle_id;
    IF v_assigned > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_HAS_ACTIVE_ASSIGNMENTS';
    END IF;
    DELETE FROM vehicles WHERE id = p_vehicle_id; -- CASCADE removes its routes
  COMMIT;

  SELECT p_vehicle_id AS deleted_vehicle_id;
END`;

// 4 -----------------------------------------------------------------------
P.sp_add_route = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_add_route(
  IN p_vehicle_id INT, IN p_name VARCHAR(100), IN p_stops TEXT,
  IN p_morning_time TIME, IN p_evening_time TIME, IN p_fare DECIMAL(10,2)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
${HANDLER}

  SELECT COUNT(*) INTO v_exists FROM vehicles WHERE id = p_vehicle_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
  END IF;

  START TRANSACTION;
    INSERT INTO transport_routes (vehicle_id, name, stops, morning_time, evening_time, fare)
    VALUES (p_vehicle_id, p_name, p_stops, p_morning_time, p_evening_time, p_fare);
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_route_id;
END`;

// 5 -----------------------------------------------------------------------
P.sp_update_route = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_update_route(
  IN p_route_id INT, IN p_vehicle_id INT, IN p_name VARCHAR(100), IN p_stops TEXT,
  IN p_morning_time TIME, IN p_evening_time TIME, IN p_fare DECIMAL(10,2)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
  DECLARE v_old_vehicle INT;
  DECLARE v_least INT;
  DECLARE v_greatest INT;
  DECLARE v_locked_vehicle INT;
  DECLARE v_now INT;
  DECLARE v_capacity INT;
  DECLARE v_dest_load INT;
  DECLARE v_route_load INT;
${HANDLER}

  SELECT COUNT(*) INTO v_exists FROM transport_routes WHERE id = p_route_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM vehicles WHERE id = p_vehicle_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
  END IF;
  -- Lock-free pre-read of the route's current vehicle; revalidated below
  -- after the row locks (route may be moved or deleted mid-flight).
  SELECT vehicle_id INTO v_old_vehicle FROM transport_routes WHERE id = p_route_id;
  IF v_old_vehicle IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND';
  END IF;

  -- Canonical lock order (vehicle -> route -> assignment): BOTH vehicles are
  -- locked first, in ascending id order (this is what makes concurrent
  -- opposite swaps A->B / B->A serialize instead of deadlocking), then the
  -- route row, then every pre-read value is revalidated before mutation.
  SET v_least = LEAST(v_old_vehicle, p_vehicle_id);
  SET v_greatest = GREATEST(v_old_vehicle, p_vehicle_id);
  START TRANSACTION;
    SELECT id INTO v_locked_vehicle FROM vehicles WHERE id = v_least FOR UPDATE;
    IF v_locked_vehicle IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
    END IF;
    SELECT id INTO v_locked_vehicle FROM vehicles WHERE id = v_greatest FOR UPDATE;
    IF v_locked_vehicle IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
    END IF;
    SELECT vehicle_id INTO v_now FROM transport_routes WHERE id = p_route_id FOR UPDATE;
    IF v_now IS NULL OR v_now <> v_old_vehicle THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND'; -- moved/deleted mid-flight; caller may retry
    END IF;
    IF v_old_vehicle <> p_vehicle_id THEN
      -- AMENDMENT 3: the destination vehicle's capacity must cover its
      -- CURRENT total load (all its routes) PLUS the moved route's own
      -- passengers (the route still belongs to the old vehicle, so its
      -- passengers are not part of the destination count).
      SELECT capacity INTO v_capacity FROM vehicles WHERE id = p_vehicle_id FOR UPDATE;
      SELECT COUNT(*) INTO v_dest_load
        FROM transport_assignments a
        JOIN transport_routes r ON r.id = a.route_id
        WHERE r.vehicle_id = p_vehicle_id;
      SELECT COUNT(*) INTO v_route_load FROM transport_assignments WHERE route_id = p_route_id;
      IF v_dest_load + v_route_load > v_capacity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CAPACITY_BELOW_ASSIGNMENTS';
      END IF;
    END IF;
    UPDATE transport_routes
       SET vehicle_id = p_vehicle_id, name = p_name, stops = p_stops,
           morning_time = p_morning_time, evening_time = p_evening_time, fare = p_fare
     WHERE id = p_route_id;
  COMMIT;

  SELECT p_route_id AS updated_route_id;
END`;

// 6 -----------------------------------------------------------------------
P.sp_delete_route = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_delete_route(
  IN p_route_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_vehicle_id INT;
  DECLARE v_locked_vehicle INT;
  DECLARE v_now INT;
  DECLARE v_assigned INT;
${HANDLER}

  -- Lock-free pre-read of the route's vehicle; revalidated after locking.
  SELECT vehicle_id INTO v_vehicle_id FROM transport_routes WHERE id = p_route_id;
  IF v_vehicle_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND';
  END IF;

  -- Canonical lock order (vehicle -> route -> assignment): the parent vehicle
  -- row is locked first (serialising against sp_assign_student /
  -- sp_delete_vehicle / sp_update_route), then the route row, then the
  -- pre-read linkage is revalidated before mutation.
  START TRANSACTION;
    SELECT id INTO v_locked_vehicle FROM vehicles WHERE id = v_vehicle_id FOR UPDATE;
    IF v_locked_vehicle IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND';
    END IF;
    SELECT vehicle_id INTO v_now FROM transport_routes WHERE id = p_route_id FOR UPDATE;
    IF v_now IS NULL OR v_now <> v_vehicle_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND'; -- moved/deleted mid-flight; caller may retry
    END IF;
    -- AMENDMENT 5: friendly pre-check; FK RESTRICT is the backstop
    SELECT COUNT(*) INTO v_assigned FROM transport_assignments WHERE route_id = p_route_id;
    IF v_assigned > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_HAS_ASSIGNMENTS';
    END IF;
    DELETE FROM transport_routes WHERE id = p_route_id;
  COMMIT;

  SELECT p_route_id AS deleted_route_id;
END`;

// 7 -----------------------------------------------------------------------
P.sp_assign_student = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_assign_student(
  IN p_student_id INT, IN p_route_id INT, IN p_pickup_point VARCHAR(100)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_role VARCHAR(20);
  DECLARE v_status VARCHAR(20);
  DECLARE v_exists INT;
  DECLARE v_vehicle_id INT;
  DECLARE v_locked_vehicle INT;
  DECLARE v_now INT;
  DECLARE v_capacity INT;
  DECLARE v_assigned INT;
  DECLARE v_already INT;
${ASSIGN_HANDLER}

  -- Lock-free pre-checks (role, status, already-assigned, route's vehicle).
  -- Every value derived here is revalidated after the ordered row locks.
  SELECT COUNT(*), MAX(role) INTO v_exists, v_role FROM users
    WHERE id = p_student_id AND role = 'student';
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_A_STUDENT';
  END IF;
  SELECT status INTO v_status FROM users WHERE id = p_student_id;
  IF v_status IS NULL OR v_status <> 'Active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT_NOT_ACTIVE';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM transport_routes WHERE id = p_route_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND';
  END IF;
  SELECT vehicle_id INTO v_vehicle_id FROM transport_routes WHERE id = p_route_id;
  IF v_vehicle_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND'; -- route deleted mid-flight
  END IF;
  SELECT COUNT(*) INTO v_already FROM transport_assignments WHERE student_id = p_student_id;
  IF v_already > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ALREADY_ASSIGNED';
  END IF;

  -- Canonical lock order (vehicle -> route -> assignment): the parent vehicle
  -- row is locked FIRST (this is what serialises us against
  -- sp_delete_vehicle / sp_update_vehicle / sp_delete_route and makes the
  -- old route->vehicle order deadlock impossible), then the route row, then
  -- every pre-read value is revalidated before the capacity check and INSERT.
  -- The only unique key on transport_assignments besides the PK is student_id,
  -- so a 1062 here can only be a duplicate assignment -> ALREADY_ASSIGNED.
  START TRANSACTION;
    SELECT id, capacity INTO v_locked_vehicle, v_capacity
      FROM vehicles WHERE id = v_vehicle_id FOR UPDATE;
    IF v_locked_vehicle IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_NOT_FOUND'; -- deleted mid-flight
    END IF;
    SELECT vehicle_id INTO v_now FROM transport_routes WHERE id = p_route_id FOR UPDATE;
    IF v_now IS NULL OR v_now <> v_vehicle_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROUTE_NOT_FOUND'; -- moved/deleted mid-flight; caller may retry
    END IF;
    SELECT COUNT(*) INTO v_assigned
      FROM transport_assignments a
      JOIN transport_routes r ON r.id = a.route_id
      WHERE r.vehicle_id = v_vehicle_id;
    IF v_assigned >= v_capacity THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VEHICLE_AT_CAPACITY';
    END IF;
    INSERT INTO transport_assignments (student_id, route_id, pickup_point)
    VALUES (p_student_id, p_route_id, p_pickup_point);
  COMMIT;

  SELECT p_student_id AS assigned_student_id;
END`;

// 8 -----------------------------------------------------------------------
P.sp_unassign_student = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_unassign_student(
  IN p_student_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
${HANDLER}

  DELETE FROM transport_assignments WHERE student_id = p_student_id;
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_ASSIGNED';
  END IF;

  SELECT p_student_id AS unassigned_student_id;
END`;

// 9 -----------------------------------------------------------------------
P.sp_add_book = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_add_book(
  IN p_title VARCHAR(200), IN p_author VARCHAR(200), IN p_isbn VARCHAR(20),
  IN p_category VARCHAR(100), IN p_publisher VARCHAR(100),
  IN p_published_year INT, IN p_quantity INT, IN p_location VARCHAR(100)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
${HANDLER}

  IF p_quantity IS NULL OR p_quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_QUANTITY';
  END IF;
  IF p_isbn IS NOT NULL THEN
    SELECT COUNT(*) INTO v_exists FROM books WHERE isbn = p_isbn;
    IF v_exists > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ISBN';
    END IF;
  END IF;

  START TRANSACTION;
    INSERT INTO books (title, author, isbn, category, publisher, published_year,
                       quantity, available, location)
    VALUES (p_title, p_author, p_isbn, p_category, p_publisher, p_published_year,
            p_quantity, p_quantity, p_location);
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_book_id;
END`;

// 10 ----------------------------------------------------------------------
P.sp_update_book = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_update_book(
  IN p_book_id INT, IN p_title VARCHAR(200), IN p_author VARCHAR(200),
  IN p_isbn VARCHAR(20), IN p_category VARCHAR(100), IN p_publisher VARCHAR(100),
  IN p_published_year INT, IN p_quantity INT, IN p_location VARCHAR(100)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
  DECLARE v_qty INT;
  DECLARE v_avail INT;
  DECLARE v_active INT;
  DECLARE v_new_avail INT;
${HANDLER}

  SELECT COUNT(*) INTO v_exists FROM books WHERE id = p_book_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BOOK_NOT_FOUND';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_QUANTITY';
  END IF;
  IF p_isbn IS NOT NULL THEN
    SELECT COUNT(*) INTO v_exists FROM books WHERE isbn = p_isbn AND id <> p_book_id;
    IF v_exists > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ISBN';
    END IF;
  END IF;

  START TRANSACTION;
    SELECT quantity, available INTO v_qty, v_avail FROM books WHERE id = p_book_id FOR UPDATE;
    SELECT COUNT(*) INTO v_active FROM book_issues WHERE book_id = p_book_id AND returned_at IS NULL;
    IF p_quantity < v_active THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'QUANTITY_BELOW_ACTIVE_ISSUES';
    END IF;
    SET v_new_avail = GREATEST(0, LEAST(p_quantity, v_avail + (p_quantity - v_qty)));
    UPDATE books
       SET title = p_title, author = p_author, isbn = p_isbn, category = p_category,
           publisher = p_publisher, published_year = p_published_year,
           quantity = p_quantity, available = v_new_avail, location = p_location
     WHERE id = p_book_id;
  COMMIT;

  SELECT p_book_id AS updated_book_id;
END`;

// 11 ----------------------------------------------------------------------
P.sp_delete_book = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_delete_book(
  IN p_book_id INT
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
  DECLARE v_history INT;
${HANDLER}

  SELECT COUNT(*) INTO v_exists FROM books WHERE id = p_book_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BOOK_NOT_FOUND';
  END IF;
  -- issue history is never destroyed (FK RESTRICT backstop)
  SELECT COUNT(*) INTO v_history FROM book_issues WHERE book_id = p_book_id;
  IF v_history > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BOOK_HAS_ISSUE_HISTORY';
  END IF;

  DELETE FROM books WHERE id = p_book_id;

  SELECT p_book_id AS deleted_book_id;
END`;

// 12 ----------------------------------------------------------------------
P.sp_issue_book = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_issue_book(
  IN p_book_id INT, IN p_student_id INT, IN p_due_date DATE
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_role VARCHAR(20);
  DECLARE v_status VARCHAR(20);
  DECLARE v_exists INT;
  DECLARE v_avail INT;
  DECLARE v_already INT;
${HANDLER}

  SELECT COUNT(*), MAX(role) INTO v_exists, v_role FROM users
    WHERE id = p_student_id AND role = 'student';
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_A_STUDENT';
  END IF;
  SELECT status INTO v_status FROM users WHERE id = p_student_id;
  IF v_status IS NULL OR v_status <> 'Active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT_NOT_ACTIVE';
  END IF;
  IF p_due_date IS NULL OR p_due_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_DUE_DATE';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM books WHERE id = p_book_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BOOK_NOT_FOUND';
  END IF;

  -- AMENDMENT 4: fully transactional; the book row lock serialises
  -- simultaneous issues so available can never go negative.
  START TRANSACTION;
    SELECT available INTO v_avail FROM books WHERE id = p_book_id FOR UPDATE;
    IF v_avail <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NO_COPIES_AVAILABLE';
    END IF;
    SELECT COUNT(*) INTO v_already
      FROM book_issues
      WHERE book_id = p_book_id AND student_id = p_student_id AND returned_at IS NULL
      FOR UPDATE;
    IF v_already > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ALREADY_ISSUED_TO_STUDENT';
    END IF;
    INSERT INTO book_issues (book_id, student_id, issued_at, due_date)
    VALUES (p_book_id, p_student_id, CURDATE(), p_due_date);
    UPDATE books SET available = available - 1 WHERE id = p_book_id;
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_issue_id;
END`;

// 13 ----------------------------------------------------------------------
P.sp_return_book = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_return_book(
  IN p_issue_id INT, IN p_fine DECIMAL(10,2)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
  DECLARE v_book_id INT;
  DECLARE v_returned DATE;
  DECLARE v_qty INT;
  DECLARE v_avail INT;
${HANDLER}

  IF p_fine IS NULL OR p_fine < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_FINE';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM book_issues WHERE id = p_issue_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ISSUE_NOT_FOUND';
  END IF;

  -- AMENDMENT 4: transactional; the issue row lock makes a double return
  -- impossible, and the inventory guard detects corrupt available counts.
  START TRANSACTION;
    SELECT book_id, returned_at INTO v_book_id, v_returned
      FROM book_issues WHERE id = p_issue_id FOR UPDATE;
    IF v_returned IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ALREADY_RETURNED';
    END IF;
    SELECT quantity, available INTO v_qty, v_avail FROM books WHERE id = v_book_id FOR UPDATE;
    IF v_avail >= v_qty THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVENTORY_CORRUPTION';
    END IF;
    UPDATE book_issues SET returned_at = CURDATE(), fine = p_fine WHERE id = p_issue_id;
    UPDATE books SET available = available + 1 WHERE id = v_book_id;
  COMMIT;

  SELECT p_issue_id AS returned_issue_id;
END`;

// 14 ----------------------------------------------------------------------
P.sp_post_transport_fee = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_post_transport_fee(
  IN p_student_id INT, IN p_period VARCHAR(7),
  IN p_amount DECIMAL(10,2), IN p_payment_method VARCHAR(50)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_exists INT;
${PAYMENT_HANDLER}

  SELECT COUNT(*) INTO v_exists FROM users WHERE id = p_student_id AND role = 'student';
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_A_STUDENT';
  END IF;
  SELECT status INTO v_status FROM users WHERE id = p_student_id;
  IF v_status IS NULL OR v_status <> 'Active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT_NOT_ACTIVE';
  END IF;
  IF p_period IS NULL OR p_period NOT REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_PERIOD';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_AMOUNT';
  END IF;

  -- AMENDMENT 1: purpose is always written explicitly; legacy rows (NULL)
  -- are never touched. AMENDMENT 2: the dedup unique key turns a duplicate
  -- posting into DUPLICATE_PAYMENT, even under simultaneous requests.
  START TRANSACTION;
    INSERT INTO payments (student_id, purpose, amount, payment_date, payment_method, reference)
    VALUES (p_student_id, 'transport', p_amount, CURDATE(), p_payment_method,
            CONCAT('transport:', p_period));
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_payment_id;
END`;

// 15 ----------------------------------------------------------------------
P.sp_post_library_fine = `
CREATE DEFINER='essjt_definer'@'localhost'
PROCEDURE ${STAGING_DB}.sp_post_library_fine(
  IN p_issue_id INT, IN p_payment_method VARCHAR(50)
)
SQL SECURITY DEFINER
MODIFIES SQL DATA
BEGIN
  DECLARE v_exists INT;
  DECLARE v_student_id INT;
  DECLARE v_fine DECIMAL(10,2);
  DECLARE v_paid INT;
  DECLARE v_returned DATE;
${PAYMENT_HANDLER}

  SELECT COUNT(*) INTO v_exists FROM book_issues WHERE id = p_issue_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ISSUE_NOT_FOUND';
  END IF;

  START TRANSACTION;
    SELECT student_id, fine, fine_paid, returned_at
      INTO v_student_id, v_fine, v_paid, v_returned
      FROM book_issues WHERE id = p_issue_id FOR UPDATE;
    IF v_returned IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ISSUE_NOT_RETURNED';
    END IF;
    IF v_paid = 1 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINE_ALREADY_POSTED';
    END IF;
    IF v_fine IS NULL OR v_fine <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NO_FINE_DUE';
    END IF;
    -- AMENDMENT 2: the dedup unique key is the concurrency-safe guard
    INSERT INTO payments (student_id, purpose, amount, payment_date, payment_method, reference)
    VALUES (v_student_id, 'library_fine', v_fine, CURDATE(), p_payment_method,
            CONCAT('library-fine:', p_issue_id));
    UPDATE book_issues SET fine_paid = 1 WHERE id = p_issue_id;
  COMMIT;

  SELECT LAST_INSERT_ID() AS new_payment_id;
END`;

// ---------------------------------------------------------------------------
// Definer grants (column-scoped exactly as approved; table-level DELETE only
// on the four deletable new tables). One additive column grant on users:
// SELECT (status) — the procedures check users.status = 'Active' and the
// registration-era grant set does not include that column. Documented in
// docs/TRANSPORT_LIBRARY_MIGRATION_PLAN.md.
// ---------------------------------------------------------------------------
const NEW_PROCEDURES = Object.keys(P);
const d = STAGING_DB;
const DEFINER_GRANTS = [
  // additive single-column read on users (see plan: privilege amendment note)
  `GRANT SELECT (status) ON ${d}.users TO 'essjt_definer'@'localhost'`,
  // vehicles (capacity is read by sp_assign_student / sp_update_route)
  `GRANT SELECT (id, capacity, vehicle_number) ON ${d}.vehicles TO 'essjt_definer'@'localhost'`,
  `GRANT INSERT (vehicle_number, vehicle_type, capacity, driver_name, driver_phone) ON ${d}.vehicles TO 'essjt_definer'@'localhost'`,
  `GRANT UPDATE (vehicle_type, capacity, driver_name, driver_phone) ON ${d}.vehicles TO 'essjt_definer'@'localhost'`,
  `GRANT DELETE ON ${d}.vehicles TO 'essjt_definer'@'localhost'`,
  // transport_routes
  `GRANT SELECT (id, vehicle_id) ON ${d}.transport_routes TO 'essjt_definer'@'localhost'`,
  `GRANT INSERT (vehicle_id, name, stops, morning_time, evening_time, fare) ON ${d}.transport_routes TO 'essjt_definer'@'localhost'`,
  `GRANT UPDATE (vehicle_id, name, stops, morning_time, evening_time, fare) ON ${d}.transport_routes TO 'essjt_definer'@'localhost'`,
  `GRANT DELETE ON ${d}.transport_routes TO 'essjt_definer'@'localhost'`,
  // transport_assignments
  `GRANT SELECT (student_id, route_id) ON ${d}.transport_assignments TO 'essjt_definer'@'localhost'`,
  `GRANT INSERT (student_id, route_id, pickup_point) ON ${d}.transport_assignments TO 'essjt_definer'@'localhost'`,
  `GRANT DELETE ON ${d}.transport_assignments TO 'essjt_definer'@'localhost'`,
  // books
  `GRANT SELECT (id, isbn, quantity, available) ON ${d}.books TO 'essjt_definer'@'localhost'`,
  `GRANT INSERT (title, author, isbn, category, publisher, published_year, quantity, available, location) ON ${d}.books TO 'essjt_definer'@'localhost'`,
  `GRANT UPDATE (title, author, isbn, category, publisher, published_year, quantity, available, location) ON ${d}.books TO 'essjt_definer'@'localhost'`,
  `GRANT DELETE ON ${d}.books TO 'essjt_definer'@'localhost'`,
  // book_issues — NO DELETE (history is never erased)
  `GRANT SELECT (id, book_id, student_id, returned_at, fine, fine_paid) ON ${d}.book_issues TO 'essjt_definer'@'localhost'`,
  `GRANT INSERT (book_id, student_id, issued_at, due_date) ON ${d}.book_issues TO 'essjt_definer'@'localhost'`,
  `GRANT UPDATE (returned_at, fine, fine_paid) ON ${d}.book_issues TO 'essjt_definer'@'localhost'`,
  // payments — INSERT only, exactly the six posting columns; NO SELECT/UPDATE/DELETE
  `GRANT INSERT (student_id, purpose, amount, payment_date, payment_method, reference) ON ${d}.payments TO 'essjt_definer'@'localhost'`,
];

const WRITER_GRANTS = []; // EXECUTE only, applied per-procedure below

async function main() {
  // 0. Belt-and-braces: the staging constant must never be the live database.
  if (STAGING_DB === LIVE_DB) {
    return exitWithStop('configuration error: staging constant equals the live database name.');
  }

  const [me] = await root.$queryRawUnsafe('SELECT CURRENT_USER() AS a, VERSION() AS v');
  record(`[setup] connected as ${me.a} (MariaDB ${me.v})`);
  if (!String(me.a).startsWith('root@')) {
    return exitWithStop('expected the local root account for staging setup.');
  }

  // 1. STAGING/LIVE SEPARATION GUARD (read-only checks on the live schema):
  //    the live database must show NO trace of transport/library work.
  const liveNewTables = await root.$queryRawUnsafe(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?)',
    LIVE_DB, 'vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues'
  );
  const livePurpose = await root.$queryRawUnsafe(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'purpose'",
    LIVE_DB
  );
  if (Number(liveNewTables[0].n) !== 0 || Number(livePurpose[0].n) !== 0) {
    return exitWithStop(
      `LIVE database ${LIVE_DB} shows transport/library changes (tables=${Number(liveNewTables[0].n)}, purpose_column=${Number(livePurpose[0].n)}) — ` +
      'unexpected state, stopping immediately. No staging work will proceed.'
    );
  }
  record('[setup] staging/live separation verified: live DB has 0 transport/library tables and no payments.purpose column');

  // 2. Staging database must exist with its 3 base tables.
  const staging = await root.$queryRawUnsafe(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', STAGING_DB
  );
  if (staging.length === 0) {
    return exitWithStop(`staging database ${STAGING_DB} does not exist — run scripts/staging/setup-staging.mjs first.`);
  }
  const baseTables = await root.$queryRawUnsafe(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?)',
    STAGING_DB, 'users', 'students', 'teachers'
  );
  if (Number(baseTables[0].n) !== 3) {
    return exitWithStop(`staging database has ${Number(baseTables[0].n)}/3 base tables — unexpected state, stopping.`);
  }

  // 3. New-table state: none / all / partial (partial = unexpected = stop).
  const NEW_TABLES = ['vehicles', 'transport_routes', 'transport_assignments', 'books', 'book_issues', 'payments'];
  const present = await root.$queryRawUnsafe(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?, ?)',
    STAGING_DB, ...NEW_TABLES
  );
  const have = present.map((r) => String(r.TABLE_NAME ?? r.table_name ?? Object.values(r)[0]));
  let tablesCreated = [];
  if (have.length === 0) {
    for (const [name, ddl] of Object.entries(DDL)) {
      await root.$executeRawUnsafe(ddl);
      record(`[setup] created table ${name}`);
      tablesCreated.push(name);
    }
  } else if (have.length === NEW_TABLES.length) {
    // All exist — verify the payments mirror carries purpose + the dedup key.
    const purposeCol = await root.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'purpose'", STAGING_DB
    );
    const dedupKey = await root.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND INDEX_NAME = 'uq_payment_dedup'", STAGING_DB
    );
    if (Number(purposeCol[0].n) !== 1 || Number(dedupKey[0].n) !== 3) {
      return exitWithStop('staging payments mirror exists but lacks purpose/uq_payment_dedup — unexpected shape, stopping.');
    }
    record('[setup] all 6 tables already present with the expected payments mirror shape — procedures/grants phase only.');
  } else {
    return exitWithStop(
      `staging has ${have.length}/6 transport/library tables (${have.join(', ')}) — partial state, stopping for approval.`
    );
  }

  // 4. Staging accounts: reuse only; staging.env is read, never modified.
  if (!existsSync(envFile)) {
    return exitWithStop('scripts/staging/staging.env is missing — cannot reuse staging credentials; stopping.');
  }
  const env = readFileSync(envFile, 'utf8');
  let writerUrl = env.split('\n').find((l) => l.startsWith('STAGING_WRITER_URL='))
    ?.split('=').slice(1).join('=') || null;
  let definerUrl = env.split('\n').find((l) => l.startsWith('STAGING_DEFINER_URL='))
    ?.split('=').slice(1).join('=') || null;
  if (!writerUrl || !definerUrl) {
    return exitWithStop('staging.env is missing required entries; stopping for approval.');
  }
  writerUrl = stripDefaultDb(writerUrl);
  definerUrl = stripDefaultDb(definerUrl);
  const probe = new PrismaClient({ datasources: { db: { url: writerUrl } } });
  try {
    const [w] = await probe.$queryRawUnsafe('SELECT CURRENT_USER() AS a');
    if (String(w.a) !== 'essjt_writer@localhost') {
      return exitWithStop(`staging.env credentials authenticate as unexpected account (${w.a}).`);
    }
    record('[setup] staging accounts reused (not recreated); credentials verified');
  } catch {
    return exitWithStop('stored staging credentials do not authenticate — stopping for approval.');
  } finally {
    await probe.$disconnect().catch(() => {});
  }

  // 5. Definer grants (column/table-scoped; idempotent on re-run).
  for (const g of DEFINER_GRANTS) {
    await root.$executeRawUnsafe(g);
  }
  record(`[setup] applied ${DEFINER_GRANTS.length} definer grants (column-scoped + 4 table-level DELETE)`);

  // 6. The 15 procedures via mysql CLI (routine DDL needs the text protocol).
  for (const [name, body] of Object.entries(P)) {
    const script =
      `SET SESSION sql_mode = '${STRICT_SQL_MODE}';\n` +
      `DROP PROCEDURE IF EXISTS ${STAGING_DB}.${name};\n` +
      'DELIMITER $$\n' + body.trim() + '\n$$\nDELIMITER ;\n';
    runMysqlCliScript(script);
    record(`[setup] created procedure ${name} under strict session sql_mode`);
  }

  // 7. EXECUTE grants — definer (required for DEFINER routines) and writer
  //    (AMENDMENT 6: the writer's ONLY new privileges). Applied AFTER creation
  //    because GRANT EXECUTE on a missing routine fails with 1305; re-applied
  //    on re-runs because DROP PROCEDURE removes procs_priv rows.
  const executeGrants = [
    ...NEW_PROCEDURES.map((p) => `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.${p} TO 'essjt_definer'@'localhost'`),
    ...NEW_PROCEDURES.map((p) => `GRANT EXECUTE ON PROCEDURE ${STAGING_DB}.${p} TO 'essjt_writer'@'localhost'`),
  ];
  for (const g of executeGrants) {
    await root.$executeRawUnsafe(g);
  }
  await root.$executeRawUnsafe('FLUSH PRIVILEGES');
  record(`[setup] applied ${executeGrants.length} EXECUTE grants (15 definer + 15 writer) + FLUSH PRIVILEGES`);

  // 8. Evidence: captured sql_mode of every routine + SHOW GRANTS (no secrets).
  const modes = await root.$queryRawUnsafe(
    'SELECT ROUTINE_NAME, SQL_MODE, SECURITY_TYPE, DEFINER FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME',
    STAGING_DB
  );
  const transportModes = modes.filter((m) => NEW_PROCEDURES.includes(m.ROUTINE_NAME));
  const allStrict = transportModes.every((m) => String(m.SQL_MODE).includes('STRICT_TRANS_TABLES'));
  const allDefiner = transportModes.every((m) => String(m.DEFINER).includes('essjt_definer'));
  record(`[setup] ${transportModes.length} transport/library routines: strict sql_mode=${allStrict}, definer=essjt_definer=${allDefiner}`);
  if (!allStrict || !allDefiner) {
    return exitWithStop('routine verification failed — stopping.');
  }

  const grants = {};
  for (const who of ['essjt_writer', 'essjt_definer']) {
    grants[who] = (
      await root.$queryRawUnsafe(`SHOW GRANTS FOR '${who}'@'localhost'`)
    ).map((r) => Object.values(r)[0]);
  }

  // 9. Sanity: the writer connection must still work and must NOT read the
  //    new tables (EXECUTE-only principle preserved).
  record(`[setup] writer connection account: ${safeAccount(writerUrl)}`);
  const writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
  const [w] = await writer.$queryRawUnsafe('SELECT CURRENT_USER() AS a, DATABASE() AS d');
  record(`[setup] writer connects as ${w.a} on database ${w.d}`);
  let denied = false;
  try {
    await writer.$queryRawUnsafe(`SELECT id FROM ${STAGING_DB}.vehicles LIMIT 1`);
  } catch (e) {
    denied = /command denied|denied/i.test(String(e.message));
  }
  record(`[setup] writer direct SELECT on vehicles denied: ${denied}`);
  if (!denied) {
    return exitWithStop('writer unexpectedly read a new table — privilege model violated, stopping.');
  }
  await writer.$disconnect();

  const report = {
    generatedAt: new Date().toISOString(),
    stagingDatabase: STAGING_DB,
    liveDatabaseChecked: LIVE_DB,
    liveSeparationVerified: true,
    tablesCreated,
    proceduresCreated: NEW_PROCEDURES,
    definerGrants: DEFINER_GRANTS,
    executeGrantsApplied: executeGrants.length,
    showGrants: grants,
  };
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  record('[setup] wrote scripts/staging/transport-library-setup-report.json (no secrets)');

  record('[setup] DONE — staging transport/library ready. Run scripts/staging/run-staging-transport-library-tests.mjs next.');
  process.exitCode = 0;
}

main()
  .catch((e) => {
    console.error('[setup] FAILED:', String(e.message).slice(0, 400));
    process.exitCode = 1;
  })
  .finally(() => root.$disconnect().catch(() => {}));

# ESSJT Staging Verification Report

**Database:** `essjt_school_system_staging` (STAGING ONLY)
**Server:** MariaDB 10.4.32-MariaDB (XAMPP, local)
**Generated:** 2026-11-14
**Test runner:** `node scripts/staging/run-staging-tests.mjs` — final run: **16/16 PASS** (exit 0)
**Evidence file:** `scripts/staging/test-results.json` (no secrets)

---

## 1. Scope and safety statement

- The live `essjt_school_system` database was **never modified, and never accessed by any
  staging SQL** (every staging statement references the staging database name only).
- The only live-database interaction was the pre-approved, strictly read-only verification
  of the application account `essjt_readonly` (SELECT succeeded; INSERT/UPDATE/DELETE all
  denied with error 1142).
- No secrets, passwords, connection strings, or password hashes appear in this report.
  Test password hashes were generated at runtime and compared in memory only.
- Nothing was committed or pushed.

## 2. What was set up (final state)

| Item | State |
|---|---|
| Staging database | `essjt_school_system_staging`, tables `users`, `students`, `teachers` (all **InnoDB**, verbatim from the audited live DDL + the two approved additive columns) |
| Synthetic data | 3 records only: `stg-admin` (admin), `stg-teacher` (+teachers row), `stg-student` (+students row); bcrypt hashes of a dummy value, never printed |
| `essjt_writer@localhost` | `USAGE` globally + `EXECUTE` on exactly the six staging procedures; zero table privileges |
| `essjt_definer@localhost` | `USAGE` globally + 5 approved column-level grants (users: SELECT/INSERT/UPDATE column sets; students INSERT set; teachers INSERT set) + **EXECUTE on the six procedures** (approved amendment #1) |
| Procedures | Six, `SQL SECURITY DEFINER`, definitions below, re-created under a strict session sql_mode (approved amendment #2) |
| Final staging rows after tests | users=3, students=1, teachers=1 (exactly the synthetic setup records; all test rows cleaned up) |

### Approved amendments recorded during verification

1. **Definer EXECUTE (6 grants).** MariaDB requires an `SQL SECURITY DEFINER` routine's
   definer to hold `EXECUTE` on the routine itself; without it every `CALL` fails with
   `ERROR 1370: execute command denied to user 'essjt_definer'...`. Proven with an
   isolated probe procedure (created → CALL fails → grant → CALL succeeds → dropped,
   0 leftover privilege rows), then approved and applied. Writer grants unchanged.
2. **Strict sql_mode for the procedures.** The server default is non-strict
   (`NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION`), which silently truncates
   over-length data. All six procedures were re-created inside a session with
   `SET SESSION sql_mode = 'STRICT_TRANS_TABLES,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION'`
   — the routines capture and enforce it at runtime. Global/server sql_mode untouched.
   `information_schema.ROUTINES.SQL_MODE` confirms capture by every routine.

## 3. Test matrix — 16/16 PASS

Every procedure call is a single standalone `CALL` on an autocommit connection with **no
outer transaction** (exactly how the application will call them). All calls were made
through the `essjt_writer` account. Row-level verification used a root connection against
the staging database only.

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | Writer account sanity + direct table access denied | PASS | connects as `essjt_writer@localhost`, default db `null`; SELECT/INSERT/UPDATE/DELETE on staging tables all **DENIED** (1142) |
| 2 | `sp_register_student` happy path | PASS | new_user_id=18; role=student, status=Inactive, must_change_password=0, registration_status=pending; students profile row created |
| 3 | Duplicate username | PASS | `DUPLICATE_USERNAME` (SQLSTATE 45000); 0 rows added |
| 4 | Duplicate email | PASS | `DUPLICATE_EMAIL`; 0 rows added |
| 5 | Invalid bcrypt hash rejected | PASS | `INVALID_HASH_FORMAT`; 0 rows inserted |
| 6 | **Mid-transaction failure → full rollback** | PASS | see §4 |
| 7 | `sp_register_teacher` happy path | PASS | new_user_id=21; Inactive/pending; teachers profile row created |
| 8 | Teacher duplicate username | PASS | `DUPLICATE_USERNAME` |
| 9 | Approve pending → Active + approved | PASS | status=Active, registration_status=approved |
| 10 | Approve non-pending rejected | PASS | `NO_PENDING_REGISTRATION` |
| 11 | Reject pending → rejected, stays Inactive | PASS | registration_status=rejected, status stays Inactive |
| 12 | Reject non-pending rejected | PASS | `NO_PENDING_REGISTRATION` |
| 13 | `sp_set_account_password` sets hash + flag | PASS | must_change_password=1; stored hash equals provided hash (compared in memory, never printed) |
| 14 | Admin accounts refused | PASS | `ACCOUNT_NOT_PERMITTED`; admin row unchanged |
| 15 | `sp_change_own_password`: wrong-old rejected; correct-old succeeds | PASS | `VERIFY_FAILED_OR_NOT_PERMITTED` on wrong old hash, password unchanged, flag still 1; on correct old hash: swap verified, must_change_password=0 |
| 16 | Exact `SHOW GRANTS` equals the approved privilege set | PASS | writer: 7 grants (USAGE + 6 EXECUTE); definer: 12 grants (USAGE + 6 EXECUTE + 5 column-scoped); exact normalized-set match (ordering/backtick/merged-line insensitive, content-exact) |

## 4. Transaction rollback evidence (test 6)

- **Trigger point matches the approved design:** `sp_register_student` insert order is
  (1) `INSERT INTO users`, (2) `SET v_user_id = LAST_INSERT_ID()`, (3) `INSERT INTO students`.
  A temporary `BEFORE INSERT` trigger on `students` (and the equivalent on `teachers`)
  raises `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TEST_TRIGGER_ROLLBACK'`, firing
  exactly during the **second** insert — after the users row already exists inside the
  transaction.
- **Student case:** `CALL` through `essjt_writer` returned the controlled error
  `TEST_TRIGGER_ROLLBACK`; the users row **does not exist**; the students profile row
  **does not exist**.
- **Teacher case (equivalent):** same controlled error; users row and teachers profile
  row absent.
- **Orphan check:** orphan_user_rows=0, orphan_student_profiles=0, orphan_teacher_profiles=0.
- **Unrelated synthetic records unchanged:** true (before/after snapshot of
  `stg-admin`, `stg-teacher`, `stg-student` identical).
- **Trigger cleanup verified:** both triggers dropped; `information_schema.TRIGGERS`
  count for the staging schema: **0**.
- The procedure's `EXIT HANDLER FOR SQLEXCEPTION → ROLLBACK; RESIGNAL` therefore
  demonstrably leaves no partial state.

## 5. Strict SQL mode evidence

`SHOW CREATE PROCEDURE` / `information_schema.ROUTINES` for all six routines:

```
sql_mode = STRICT_TRANS_TABLES,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION
```

captured by: `sp_register_student`, `sp_register_teacher`, `sp_approve_registration`,
`sp_reject_registration`, `sp_set_account_password`, `sp_change_own_password`.

An isolated probe (created under strict mode, dropped afterwards) confirmed the captured
mode raises `ERROR 1406 (22001): Data too long` for over-length values inserted **inside**
a routine body, regardless of the caller's session mode.

## 6. Exact privilege sets (verified)

**`essjt_writer@localhost` — 7 grants:**
- `GRANT USAGE ON *.*`
- `GRANT EXECUTE ON PROCEDURE` × 6 (the six staging procedures)

**`essjt_definer@localhost` — 12 grants:**
- `GRANT USAGE ON *.*`
- `GRANT EXECUTE ON PROCEDURE` × 6 (the six staging procedures — approved amendment)
- `GRANT SELECT (email, id, must_change_password, password, registration_status, role, username) ON users`
- `GRANT INSERT (email, full_name, must_change_password, password, phone, registration_status, role, status, username) ON users`
- `GRANT INSERT (date_of_birth, enrollment_date, gender, guardian_name, guardian_phone, level, section, student_id, trade, user_id) ON students`
- `GRANT INSERT (department, hire_date, subject, teacher_id, user_id) ON teachers`
- `GRANT UPDATE (must_change_password, password, registration_status, status) ON users`

(Column lists shown sorted; MariaDB orders them alphabetically and merges per-table grants
into one line — content is exactly the approved set.)

## 7. Final procedure definitions

Stored exactly as created (MariaDB 10.4.32; full `SHOW CREATE PROCEDURE` output preserved in
`scripts/staging/procedures-final.txt`; pre-recreation definitions preserved in
`scripts/staging/procedures-before-strict-recreate.txt`). Only formatting differs from the
reviewed definitions; logic is byte-for-byte the approved logic.

### sp_register_student

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_register_student`(
  IN p_username VARCHAR(100), IN p_password_hash VARCHAR(255),
  IN p_full_name VARCHAR(200), IN p_email VARCHAR(150), IN p_phone VARCHAR(20),
  IN p_trade VARCHAR(100), IN p_level VARCHAR(20), IN p_section VARCHAR(10),
  IN p_gender VARCHAR(10), IN p_date_of_birth DATE,
  IN p_guardian_name VARCHAR(200), IN p_guardian_phone VARCHAR(20),
  IN p_enrollment_date DATE
)
    MODIFIES SQL DATA
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_exists  INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_password_hash NOT REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' THEN
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
END
```

### sp_register_teacher

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_register_teacher`(
  IN p_username VARCHAR(100), IN p_password_hash VARCHAR(255),
  IN p_full_name VARCHAR(200), IN p_email VARCHAR(150), IN p_phone VARCHAR(20),
  IN p_subject VARCHAR(100), IN p_department VARCHAR(100), IN p_hire_date DATE
)
    MODIFIES SQL DATA
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_exists  INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_password_hash NOT REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' THEN
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
END
```

### sp_approve_registration

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_approve_registration`(
  IN p_user_id INT
)
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
END
```

### sp_reject_registration

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_reject_registration`(
  IN p_user_id INT
)
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
END
```

### sp_set_account_password

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_set_account_password`(
  IN p_user_id       INT,
  IN p_password_hash VARCHAR(255)
)
    MODIFIES SQL DATA
BEGIN
  IF p_password_hash NOT REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' THEN
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
END
```

### sp_change_own_password

```sql
CREATE DEFINER=`essjt_definer`@`localhost` PROCEDURE `essjt_school_system_staging`.`sp_change_own_password`(
  IN p_user_id           INT,
  IN p_expected_old_hash VARCHAR(255),
  IN p_new_password_hash VARCHAR(255)
)
    MODIFIES SQL DATA
BEGIN
  IF p_new_password_hash NOT REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' THEN
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
END
```

## 8. Remaining limitations and implementation notes (no action taken)

1. **Parameter coercion follows the caller's session sql_mode.** Over-length values
   passed as procedure parameters are truncated at `CALL` time under a non-strict caller
   session (before the routine body runs). The procedures themselves enforce strictness
   internally. Recommendation for the future application: set a strict session sql_mode on
   the writer connection after connecting (also a general data-integrity improvement),
   and validate input lengths server-side regardless.
2. **Connection URLs must not include a default database** for these accounts: with no
   db-level grants (by design), selecting a default database fails with 1044. The writer
   connects with an empty default database and fully qualifies
   `CALL essjt_school_system_staging.sp_x(...)`; `DATABASE()` is null. Verified working
   through Prisma.
3. **Prisma names `CALL` result columns generically (`f0`, …)**, dropping SQL aliases —
   the application must read result columns positionally (or the design revisited) when
   consuming procedure result sets.
4. **Routine DDL (`CREATE/DROP PROCEDURE`) is not supported by the prepared-statement
   protocol** (error 1295 via the Prisma driver) — routine DDL must go through the
   text-protocol CLI; `CALL` works fine through Prisma.
5. **Ordering requirement:** `GRANT EXECUTE` fails with 1305 on a not-yet-existing
   routine — procedures must be created before their EXECUTE grants (encoded in the
   setup script).
6. **`--recreate-procedures` restores the routine-level EXECUTE grants** because
   `DROP PROCEDURE` mechanically removes `mysql.procs_priv` rows for that routine.
7. Live-server sql_mode remains non-strict (unchanged; out of scope). The live
   `essjt_readonly` application account remains intact and strictly read-only.

## 9. Conclusion

All 16 approved staging tests **PASS** with direct run evidence. The reviewed
registration/approval and password-flow design — including the two approved amendments
(definer EXECUTE; strict sql_mode) — behaves exactly as specified inside staging. The
staging database contains only the three synthetic setup records after the test run.
No live database changes were made, and no application implementation has begun.

**Next step (awaiting user approval):** application implementation phase
(registration/approval pages and APIs, `/change-password`, `db-writer.ts` following the
connection rules in §8), then updating the design document and extending the smoke suite.

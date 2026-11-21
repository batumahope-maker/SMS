/**
 * The sole write choke point of the application.
 *
 * Every database write performed by the registration, approval and password
 * flows goes through one of the six stored procedures below, executed by a
 * dedicated, least-privilege database account (USAGE + EXECUTE on the six
 * procedures only — no table privileges, ever):
 *
 *   sp_register_student, sp_register_teacher,
 *   sp_approve_registration, sp_reject_registration,
 *   sp_set_account_password, sp_change_own_password
 *
 * The design is the staging-verified one (scripts/staging/STAGING_REPORT.md,
 * section 8). Rules encoded here, all proven against MariaDB 10.4:
 *
 *   1. The writer URL must have an EMPTY default database
 *      (`mysql://user:pass@host:3306/`). These accounts hold no db-level
 *      privileges, so selecting a default database fails with error 1044.
 *      The database name comes from WRITER_DATABASE_NAME and every CALL is
 *      fully qualified.
 *   2. CALLs are single standalone statements with inline, strictly escaped
 *      string literals — never parameterised placeholders, and never wrapped
 *      in an outer transaction: each procedure body runs its own
 *      START TRANSACTION / COMMIT (nesting one would implicitly commit).
 *   3. `SET SESSION sql_mode` (strict) runs once per connection after the
 *      first connect. connection_limit=1 keeps the writer on a single
 *      connection so the session mode sticks. Parameter coercion at CALL
 *      time follows the caller's session mode, so over-length values fail
 *      loudly instead of being silently truncated.
 *   4. Prisma drops SQL aliases and names CALL result columns generically
 *      (f0, f1, …), so results are read positionally via Object.values.
 *   5. Procedure SIGNAL messages are surfaced as typed error codes
 *      (DUPLICATE_USERNAME, …). Thrown errors never include the SQL text,
 *      which contains password hashes.
 *
 * Initialisation is lazy: without WRITER_DATABASE_URL the application keeps
 * running read-only, and only a call to one of the write functions fails
 * with WRITER_NOT_CONFIGURED.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_WRITE_DISABLED_MESSAGE, isDemoMode } from './demo-mode';
import {
  BCRYPT_HASH,
  detectStoredPasswordFormat,
} from './password';

/** Live default; staging tests override via env before importing this module. */
export const WRITER_DATABASE_NAME =
  process.env.WRITER_DATABASE_NAME || 'essjt_school_system';

const STRICT_SQL_MODE =
  'STRICT_TRANS_TABLES,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,' +
  'NO_ENGINE_SUBSTITUTION';

const MAX_LENGTHS = {
  username: 100,
  passwordHash: 255,
  fullName: 200,
  email: 150,
  phone: 20,
  trade: 100,
  level: 20,
  section: 10,
  gender: 10,
  subject: 100,
  department: 100,
  guardianName: 200,
} as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/* -------------------------------------------------------------------------
 * Errors
 * ---------------------------------------------------------------------- */

export type WriterErrorCode =
  | 'WRITER_NOT_CONFIGURED'
  | 'WRITER_INPUT_INVALID'
  | 'DUPLICATE_USERNAME'
  | 'DUPLICATE_EMAIL'
  | 'INVALID_HASH_FORMAT'
  | 'NO_PENDING_REGISTRATION'
  | 'ACCOUNT_NOT_PERMITTED'
  | 'VERIFY_FAILED_OR_NOT_PERMITTED'
  | 'VALUE_TOO_LONG'
  | 'WRITER_DB_ERROR'
  /* Transport & Library */
  | 'INVALID_CAPACITY'
  | 'DUPLICATE_VEHICLE_NUMBER'
  | 'VEHICLE_NOT_FOUND'
  | 'VEHICLE_HAS_ACTIVE_ASSIGNMENTS'
  | 'CAPACITY_BELOW_ASSIGNMENTS'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_HAS_ASSIGNMENTS'
  | 'NOT_A_STUDENT'
  | 'STUDENT_NOT_ACTIVE'
  | 'ALREADY_ASSIGNED'
  | 'VEHICLE_AT_CAPACITY'
  | 'NOT_ASSIGNED'
  | 'INVALID_QUANTITY'
  | 'DUPLICATE_ISBN'
  | 'BOOK_NOT_FOUND'
  | 'BOOK_HAS_ISSUE_HISTORY'
  | 'QUANTITY_BELOW_ACTIVE_ISSUES'
  | 'INVALID_DUE_DATE'
  | 'NO_COPIES_AVAILABLE'
  | 'ALREADY_ISSUED_TO_STUDENT'
  | 'INVALID_FINE'
  | 'ALREADY_RETURNED'
  | 'INVENTORY_CORRUPTION'
  | 'ISSUE_NOT_FOUND'
  | 'ISSUE_NOT_RETURNED'
  | 'FINE_ALREADY_POSTED'
  | 'NO_FINE_DUE'
  | 'INVALID_PERIOD'
  | 'INVALID_AMOUNT'
  | 'DUPLICATE_PAYMENT'
  | 'WRITE_FEATURE_NOT_INSTALLED';

/** Signals raised by the stored procedures (SQLSTATE 45000 / 1406). */
const SIGNAL_CODES: ReadonlySet<string> = new Set([
  'DUPLICATE_USERNAME',
  'DUPLICATE_EMAIL',
  'INVALID_HASH_FORMAT',
  'NO_PENDING_REGISTRATION',
  'ACCOUNT_NOT_PERMITTED',
  'VERIFY_FAILED_OR_NOT_PERMITTED',
  /* Transport & Library */
  'INVALID_CAPACITY',
  'DUPLICATE_VEHICLE_NUMBER',
  'VEHICLE_NOT_FOUND',
  'VEHICLE_HAS_ACTIVE_ASSIGNMENTS',
  'CAPACITY_BELOW_ASSIGNMENTS',
  'ROUTE_NOT_FOUND',
  'ROUTE_HAS_ASSIGNMENTS',
  'NOT_A_STUDENT',
  'STUDENT_NOT_ACTIVE',
  'ALREADY_ASSIGNED',
  'VEHICLE_AT_CAPACITY',
  'NOT_ASSIGNED',
  'INVALID_QUANTITY',
  'DUPLICATE_ISBN',
  'BOOK_NOT_FOUND',
  'BOOK_HAS_ISSUE_HISTORY',
  'QUANTITY_BELOW_ACTIVE_ISSUES',
  'INVALID_DUE_DATE',
  'NO_COPIES_AVAILABLE',
  'ALREADY_ISSUED_TO_STUDENT',
  'INVALID_FINE',
  'ALREADY_RETURNED',
  'INVENTORY_CORRUPTION',
  'ISSUE_NOT_FOUND',
  'ISSUE_NOT_RETURNED',
  'FINE_ALREADY_POSTED',
  'NO_FINE_DUE',
  'INVALID_PERIOD',
  'INVALID_AMOUNT',
  'DUPLICATE_PAYMENT',
  'WRITE_FEATURE_NOT_INSTALLED',
]);

export class WriterError extends Error {
  readonly code: WriterErrorCode;

  constructor(code: WriterErrorCode, message: string) {
    super(message);
    this.name = 'WriterError';
    this.code = code;
  }
}

/* -------------------------------------------------------------------------
 * Client initialisation (lazy)
 * ---------------------------------------------------------------------- */

interface WriterRuntime {
  client: PrismaClient;
  sessionReady: Promise<void>;
}

const globalForWriter = globalThis as unknown as {
  essjtWriterRuntime: WriterRuntime | undefined;
};

/** Message used by every user-facing write guard. */
export function writeDisabledMessage(): string {
  return isDemoMode()
    ? DEMO_WRITE_DISABLED_MESSAGE
    : 'Writes are temporarily unavailable. Please try again later.';
}

/**
 * True when a writer URL is configured (does not connect).
 * Demo mode always reports false, even if a Preview environment accidentally
 * has writer variables set.
 */
export function isWriterConfigured(): boolean {
  if (isDemoMode()) return false;
  return Boolean(process.env.WRITER_DATABASE_URL);
}

/**
 * Build the writer URL: same credentials as configured, but guaranteed empty
 * default database and a single pooled connection. The URL itself is never
 * logged, thrown, or embedded in error messages.
 */
function buildWriterUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new WriterError(
      'WRITER_NOT_CONFIGURED',
      'WRITER_DATABASE_URL is not a valid URL'
    );
  }
  // Only the empty default database is acceptable ("" or "/").
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new WriterError(
      'WRITER_NOT_CONFIGURED',
      'WRITER_DATABASE_URL must have an empty default database (no path). ' +
        'These accounts hold no db-level privileges.'
    );
  }
  parsed.pathname = '/';
  const params = parsed.searchParams;
  if (!params.has('connection_limit')) params.set('connection_limit', '1');
  // Never persist anything unexpected (e.g. multipleStatements).
  params.delete('multipleStatements');
  return parsed.toString();
}

function getRuntime(): WriterRuntime {
  if (isDemoMode()) {
    throw new WriterError('WRITER_NOT_CONFIGURED', writeDisabledMessage());
  }
  if (globalForWriter.essjtWriterRuntime) return globalForWriter.essjtWriterRuntime;

  const rawUrl = process.env.WRITER_DATABASE_URL;
  if (!rawUrl) {
    throw new WriterError(
      'WRITER_NOT_CONFIGURED',
      'Writes are not available: WRITER_DATABASE_URL is not configured.'
    );
  }

  const client = new PrismaClient({
    datasources: { db: { url: buildWriterUrl(rawUrl) } },
  });

  const runtime: WriterRuntime = {
    client,
    sessionReady: client
      .$executeRawUnsafe(`SET SESSION sql_mode = '${STRICT_SQL_MODE}'`)
      .then(() => undefined),
  };
  globalForWriter.essjtWriterRuntime = runtime;
  return runtime;
}

/* -------------------------------------------------------------------------
 * Literal escaping + argument building
 * ---------------------------------------------------------------------- */

/**
 * Escape a string as a MySQL string literal. Backslash is doubled and single
 * quotes are doubled (standard SQL syntax, valid with or without
 * NO_BACKSLASH_ESCAPES). NUL bytes are rejected — MySQL string literals
 * cannot carry a raw NUL.
 *
 * Exported for the feature-specific writer modules.
 */
export function sqlString(value: string): string {
  if (value.includes('\0')) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      'String arguments must not contain NUL bytes'
    );
  }
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

/** Integer literal for procedure id parameters. */
export function sqlInt(value: number, name: string): string {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}`);
  }
  return String(value);
}

/** Date literal, validated against the live DATE columns. */
export function sqlDate(value: string, name: string): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `Invalid ${name}: expected YYYY-MM-DD`
    );
  }
  return sqlString(value);
}

function requireString(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new WriterError('WRITER_INPUT_INVALID', `Missing ${name}`);
  }
  if (value.length > max) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${name} exceeds ${max} characters`
    );
  }
  return value;
}
export { requireString };

/**
 * Defence in depth: refuse anything that is not a bcrypt hash before it can
 * leave the process. Matches the regex enforced by the procedures.
 */
function requireBcryptHash(value: unknown, name: string): string {
  const hash = requireString(value, name, MAX_LENGTHS.passwordHash);
  if (!BCRYPT_HASH.test(hash) || detectStoredPasswordFormat(hash) !== 'bcrypt') {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${name} is not a valid bcrypt hash`
    );
  }
  return hash;
}

/* -------------------------------------------------------------------------
 * Procedure execution
 * ---------------------------------------------------------------------- */

/**
 * Run `CALL <db>.<procedure>(<args>)` as the writer. A standalone statement
 * on an autocommit connection — never wrapped in an outer transaction,
 * because each procedure body runs its own START TRANSACTION / COMMIT.
 *
 * Exported for the feature-specific writer modules (transport/library),
 * which share this single runtime, connection and choke point.
 */
export async function callProcedure(
  procedure: string,
  args: string[]
): Promise<unknown[]> {
  const runtime = getRuntime();
  await runtime.sessionReady;
  const sql = `CALL ${WRITER_DATABASE_NAME}.${procedure}(${args.join(', ')})`;
  try {
    // $queryRawUnsafe is the only raw channel the writer client uses.
    return (await runtime.client.$queryRawUnsafe(sql)) as unknown[];
  } catch (error) {
    throw mapProcedureError(error);
  }
}

/**
 * Translate a failed CALL into a typed WriterError. Prisma embeds the
 * driver message in the thrown error (e.g. `Code: 1644. Message:
 * `DUPLICATE_USERNAME``); the SQL text with hashes is discarded, never
 * re-thrown or logged.
 */
function mapProcedureError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const flat = message.replace(/\s+/g, ' ');

  const signal = flat.match(/Message:\s*`([A-Z0-9_]+)`/);
  if (signal) {
    const code = signal[1];
    if (SIGNAL_CODES.has(code)) {
      return new WriterError(code as WriterErrorCode, code);
    }
    if (code === 'TEST_TRIGGER_ROLLBACK') {
      // Staging-only failure injection; never expected in the application.
      return new WriterError('WRITER_DB_ERROR', 'Unexpected test signal');
    }
    return new WriterError('WRITER_DB_ERROR', `Procedure signal: ${code}`);
  }

  if (/data too long/i.test(flat)) {
    return new WriterError(
      'VALUE_TOO_LONG',
      'A value exceeded its column or parameter length'
    );
  }

  if (/\b1305\b|PROCEDURE .* does not exist/i.test(flat)) {
    // The feature's procedures are not installed in the target database
    // (expected until the approved SQL package is applied live).
    return new WriterError(
      'WRITE_FEATURE_NOT_INSTALLED',
      'The database write routines for this feature are not installed'
    );
  }

  // Generic failure: only the driver's own error summary, without SQL.
  const code = flat.match(/Code:\s*(\d+)/)?.[1] ?? 'unknown';
  return new WriterError(
    'WRITER_DB_ERROR',
    `Procedure call failed (driver code ${code})`
  );
}

/** Read the first column of the procedure result set positionally (`f0`). */
export function firstValue(rows: unknown[]): number {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row === null || row === undefined) {
    throw new WriterError(
      'WRITER_DB_ERROR',
      'Procedure returned no result row'
    );
  }
  const value = typeof row === 'object' ? Object.values(row)[0] : row;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) {
    throw new WriterError(
      'WRITER_DB_ERROR',
      'Procedure returned an unusable result'
    );
  }
  return numeric;
}

/* -------------------------------------------------------------------------
 * Public API — one function per procedure
 * ---------------------------------------------------------------------- */

export interface RegisterStudentParams {
  username: string;
  /** Plaintext password; hashed here so no caller can pass a wrong format. */
  password: string;
  fullName: string;
  email: string;
  phone: string;
  trade: string;
  level: string;
  section: string;
  gender: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  /** YYYY-MM-DD */
  enrollmentDate: string;
}

export interface RegisterTeacherParams {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  department: string;
  /** YYYY-MM-DD */
  hireDate: string;
}

async function hashPassword(plaintext: string, label: string): Promise<string> {
  if (typeof plaintext !== 'string' || plaintext.length < 8) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${label} must be at least 8 characters`
    );
  }
  if (plaintext.length > 72) {
    // bcrypt operates on at most 72 bytes; reject rather than silently truncate.
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${label} must be at most 72 characters`
    );
  }
  return bcrypt.hash(plaintext, 12);
}

/**
 * sp_register_student — creates the users row (role='student',
 * status='Inactive', registration_status='pending') plus the students
 * profile row in one procedure-managed transaction.
 * @returns the new users.id
 */
export async function registerStudent(
  params: RegisterStudentParams
): Promise<{ userId: number }> {
  const passwordHash = await hashPassword(params.password, 'Password');
  const rows = await callProcedure('sp_register_student', [
    sqlString(requireString(params.username, 'username', MAX_LENGTHS.username)),
    sqlString(passwordHash),
    sqlString(requireString(params.fullName, 'full name', MAX_LENGTHS.fullName)),
    sqlString(requireString(params.email, 'email', MAX_LENGTHS.email)),
    sqlString(requireString(params.phone, 'phone', MAX_LENGTHS.phone)),
    sqlString(requireString(params.trade, 'trade', MAX_LENGTHS.trade)),
    sqlString(requireString(params.level, 'level', MAX_LENGTHS.level)),
    sqlString(requireString(params.section, 'section', MAX_LENGTHS.section)),
    sqlString(requireString(params.gender, 'gender', MAX_LENGTHS.gender)),
    sqlDate(params.dateOfBirth, 'date of birth'),
    sqlString(
      requireString(params.guardianName, 'guardian name', MAX_LENGTHS.guardianName)
    ),
    sqlString(
      requireString(params.guardianPhone, 'guardian phone', MAX_LENGTHS.phone)
    ),
    sqlDate(params.enrollmentDate, 'enrollment date'),
  ]);
  return { userId: firstValue(rows) };
}

/**
 * sp_register_teacher — users row (role='teacher', status='Inactive',
 * registration_status='pending') plus the teachers profile row.
 * @returns the new users.id
 */
export async function registerTeacher(
  params: RegisterTeacherParams
): Promise<{ userId: number }> {
  const passwordHash = await hashPassword(params.password, 'Password');
  const rows = await callProcedure('sp_register_teacher', [
    sqlString(requireString(params.username, 'username', MAX_LENGTHS.username)),
    sqlString(passwordHash),
    sqlString(requireString(params.fullName, 'full name', MAX_LENGTHS.fullName)),
    sqlString(requireString(params.email, 'email', MAX_LENGTHS.email)),
    sqlString(requireString(params.phone, 'phone', MAX_LENGTHS.phone)),
    sqlString(requireString(params.subject, 'subject', MAX_LENGTHS.subject)),
    sqlString(
      requireString(params.department, 'department', MAX_LENGTHS.department)
    ),
    sqlDate(params.hireDate, 'hire date'),
  ]);
  return { userId: firstValue(rows) };
}

/**
 * sp_approve_registration — pending student/teacher only. Sets
 * status='Active' and registration_status='approved'; anything else signals
 * NO_PENDING_REGISTRATION. Admin accounts can never be touched.
 * @returns the approved users.id
 */
export async function approveRegistration(
  userId: number
): Promise<{ userId: number }> {
  const rows = await callProcedure(
    'sp_approve_registration',
    [sqlInt(userId, 'user id')]
  );
  return { userId: firstValue(rows) };
}

/**
 * sp_reject_registration — pending student/teacher only. Sets
 * registration_status='rejected' and leaves status='Inactive' untouched
 * (rejection never activates an account).
 * @returns the rejected users.id
 */
export async function rejectRegistration(
  userId: number
): Promise<{ userId: number }> {
  const rows = await callProcedure(
    'sp_reject_registration',
    [sqlInt(userId, 'user id')]
  );
  return { userId: firstValue(rows) };
}

/**
 * sp_set_account_password — student/teacher rows only (ACCOUNT_NOT_PERMITTED
 * for admins). Sets a new bcrypt hash and must_change_password=1, so the
 * account is forced onto /change-password at its next sign-in.
 * @returns the updated users.id
 */
export async function setAccountPassword(
  userId: number,
  newPassword: string
): Promise<{ userId: number; temporaryPassword: string }> {
  const passwordHash = await hashPassword(newPassword, 'New password');
  const rows = await callProcedure('sp_set_account_password', [
    sqlInt(userId, 'user id'),
    sqlString(passwordHash),
  ]);
  return { userId: firstValue(rows), temporaryPassword: newPassword };
}

/**
 * sp_change_own_password — self-service change for a student/teacher account.
 *
 * The caller must already have verified `currentPassword` against the
 * account's stored hash (via the read-only client) and pass that stored hash
 * as `storedHash`: the procedure requires the row's password column to equal
 * it, which keeps the check race-free inside the UPDATE and also works for
 * legacy MD5-legacy rows (which can never be passed here as a new hash).
 *
 * On success the new bcrypt hash is stored and must_change_password=0.
 * @returns the updated users.id
 */
export async function changeOwnPassword(params: {
  userId: number;
  /** The account's current stored hash, read via the read-only client. */
  storedHash: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ userId: number }> {
  const storedHash = requireString(
    params.storedHash,
    'stored hash',
    MAX_LENGTHS.passwordHash
  );
  if (typeof params.currentPassword !== 'string' || !params.currentPassword) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Missing current password');
  }
  const newPasswordHash = await hashPassword(params.newPassword, 'New password');
  const rows = await callProcedure('sp_change_own_password', [
    sqlInt(params.userId, 'user id'),
    sqlString(storedHash),
    sqlString(newPasswordHash),
  ]);
  return { userId: firstValue(rows) };
}

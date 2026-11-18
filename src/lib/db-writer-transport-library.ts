/**
 * Transport & Library write functions â€” the second block of the sole write
 * choke point (see ./db-writer.ts for the runtime, escaping and error
 * mapping rules).
 *
 * Every function wraps exactly one staging-proven stored procedure
 * (scripts/staging/setup-staging-transport-library.mjs; 73/73 test suite
 * green). The 15 procedures were prepared for the live database in
 * docs/ESSJT_TL_LIVE_INSTALLATION.sql and are NOT yet installed there â€”
 * until installation, calling these against the live writer fails loudly
 * with a driver "procedure does not exist" error surfaced as WRITER_DB_ERROR.
 *
 * Validation here mirrors the procedure-side checks so callers get friendly
 * 400s before a database round-trip; the procedures remain the authority.
 */
import {
  WriterError,
  callProcedure,
  firstValue,
  sqlInt,
  sqlString,
  sqlDate,
  requireString,
} from './db-writer';

/* -------------------------------------------------------------------------
 * Literal helpers for the TL procedure shapes
 * ---------------------------------------------------------------------- */

/** Optional string: NULL when absent/empty, else a validated literal. */
function sqlOptionalString(
  value: unknown,
  name: string,
  max: number
): string {
  if (value === undefined || value === null) return 'NULL';
  if (typeof value !== 'string') {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}`);
  }
  const trimmed = value.trim();
  if (trimmed === '') return 'NULL';
  if (trimmed.length > max) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${name} exceeds ${max} characters`
    );
  }
  return sqlString(trimmed);
}

/** Required-or-optional decimal(10,2): non-negative finite, 2-decimal safe. */
function sqlDecimal(
  value: unknown,
  name: string,
  opts: { required: boolean; minExclusiveZero?: boolean }
): string {
  if (value === undefined || value === null || value === '') {
    if (opts.required) {
      throw new WriterError('WRITER_INPUT_INVALID', `Missing ${name}`);
    }
    return '0.00';
  }
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}`);
  }
  if (n < 0) {
    throw new WriterError('WRITER_INPUT_INVALID', `${name} cannot be negative`);
  }
  if (opts.minExclusiveZero && n <= 0) {
    throw new WriterError('WRITER_INPUT_INVALID', `${name} must be greater than 0`);
  }
  if (n > 99_999_999.99) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `${name} exceeds the decimal(10,2) range`
    );
  }
  return n.toFixed(2);
}

/** Optional int (e.g. published_year, quantity): NULL when absent. */
function sqlOptionalInt(value: unknown, name: string): string {
  if (value === undefined || value === null || value === '') return 'NULL';
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}`);
  }
  return String(n);
}

/** Optional TIME literal ('HH:MM' or 'HH:MM:SS') or NULL. */
function sqlOptionalTime(value: unknown, name: string): string {
  if (value === undefined || value === null || value === '') return 'NULL';
  if (typeof value !== 'string') {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}`);
  }
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `Invalid ${name}: expected HH:MM or HH:MM:SS`
    );
  }
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const s = m[3] !== undefined ? Number(m[3]) : 0;
  if (h > 23 || mi > 59 || s > 59) {
    throw new WriterError('WRITER_INPUT_INVALID', `Invalid ${name}: out of range`);
  }
  return sqlString(
    `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  );
}

/** Optional YYYY-MM transport period (procedure re-validates with regex). */
function sqlPeriod(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      `Invalid ${name}: expected YYYY-MM`
    );
  }
  return sqlString(value);
}

/* -------------------------------------------------------------------------
 * Vehicles
 * ---------------------------------------------------------------------- */

export interface AddVehicleParams {
  vehicleNumber: string;
  vehicleType?: string | null;
  /** integer >= 1 */
  capacity: number;
  /** required: vehicles.driver_name is NOT NULL in the authoritative schema */
  driverName: string;
  driverPhone?: string | null;
}

/** sp_add_vehicle â€” @returns the new vehicles.id */
export async function addVehicle(
  params: AddVehicleParams
): Promise<{ vehicleId: number }> {
  const capacity = Number(params.capacity);
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Capacity must be an integer >= 1');
  }
  const rows = await callProcedure('sp_add_vehicle', [
    sqlString(requireString(params.vehicleNumber, 'vehicle number', 20)),
    sqlOptionalString(params.vehicleType, 'vehicle type', 50),
    String(capacity),
    sqlString(requireString(params.driverName, 'driver name', 100)),
    sqlOptionalString(params.driverPhone, 'driver phone', 20),
  ]);
  return { vehicleId: firstValue(rows) };
}

export interface UpdateVehicleParams {
  vehicleId: number;
  vehicleType?: string | null;
  /** integer >= 1; may never drop below currently assigned students */
  capacity: number;
  /** required: sp_update_vehicle always writes vehicles.driver_name (NOT NULL) */
  driverName: string;
  driverPhone?: string | null;
}

/** sp_update_vehicle â€” @returns the updated vehicles.id */
export async function updateVehicle(
  params: UpdateVehicleParams
): Promise<{ vehicleId: number }> {
  const capacity = Number(params.capacity);
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Capacity must be an integer >= 1');
  }
  const rows = await callProcedure('sp_update_vehicle', [
    sqlInt(params.vehicleId, 'vehicle id'),
    sqlOptionalString(params.vehicleType, 'vehicle type', 50),
    String(capacity),
    sqlString(requireString(params.driverName, 'driver name', 100)),
    sqlOptionalString(params.driverPhone, 'driver phone', 20),
  ]);
  return { vehicleId: firstValue(rows) };
}

/** sp_delete_vehicle â€” blocked by the procedure while assignments exist. */
export async function deleteVehicle(vehicleId: number): Promise<{ vehicleId: number }> {
  const rows = await callProcedure('sp_delete_vehicle', [
    sqlInt(vehicleId, 'vehicle id'),
  ]);
  return { vehicleId: firstValue(rows) };
}

/* -------------------------------------------------------------------------
 * Routes
 * ---------------------------------------------------------------------- */

export interface AddRouteParams {
  vehicleId: number;
  name: string;
  stops?: string | null;
  /** 'HH:MM' or 'HH:MM:SS', or null */
  morningTime?: string | null;
  eveningTime?: string | null;
  /** decimal(10,2) >= 0; ADVISORY only â€” never used to validate fee postings */
  fare?: number | string | null;
}

/** sp_add_route â€” @returns the new transport_routes.id */
export async function addRoute(
  params: AddRouteParams
): Promise<{ routeId: number }> {
  const rows = await callProcedure('sp_add_route', [
    sqlInt(params.vehicleId, 'vehicle id'),
    sqlString(requireString(params.name, 'route name', 100)),
    sqlOptionalString(params.stops, 'stops', 5000),
    sqlOptionalTime(params.morningTime, 'morning time'),
    sqlOptionalTime(params.eveningTime, 'evening time'),
    sqlDecimal(params.fare, 'fare', { required: false }),
  ]);
  return { routeId: firstValue(rows) };
}

export interface UpdateRouteParams {
  routeId: number;
  vehicleId: number;
  name: string;
  stops?: string | null;
  morningTime?: string | null;
  eveningTime?: string | null;
  fare?: number | string | null;
}

/** sp_update_route â€” dual ascending-id vehicle locks; capacity floor enforced. */
export async function updateRoute(
  params: UpdateRouteParams
): Promise<{ routeId: number }> {
  const rows = await callProcedure('sp_update_route', [
    sqlInt(params.routeId, 'route id'),
    sqlInt(params.vehicleId, 'vehicle id'),
    sqlString(requireString(params.name, 'route name', 100)),
    sqlOptionalString(params.stops, 'stops', 5000),
    sqlOptionalTime(params.morningTime, 'morning time'),
    sqlOptionalTime(params.eveningTime, 'evening time'),
    sqlDecimal(params.fare, 'fare', { required: false }),
  ]);
  return { routeId: firstValue(rows) };
}

/** sp_delete_route â€” blocked by the procedure while assignments exist. */
export async function deleteRoute(routeId: number): Promise<{ routeId: number }> {
  const rows = await callProcedure('sp_delete_route', [sqlInt(routeId, 'route id')]);
  return { routeId: firstValue(rows) };
}

/* -------------------------------------------------------------------------
 * Assignments
 * ---------------------------------------------------------------------- */

export interface AssignStudentParams {
  /** users.id of an Active student */
  studentId: number;
  routeId: number;
  pickupPoint?: string | null;
}

/** sp_assign_student â€” one assignment per student (unique key backstop). */
export async function assignStudent(
  params: AssignStudentParams
): Promise<{ ok: true }> {
  await callProcedure('sp_assign_student', [
    sqlInt(params.studentId, 'student id'),
    sqlInt(params.routeId, 'route id'),
    sqlOptionalString(params.pickupPoint, 'pickup point', 100),
  ]);
  return { ok: true };
}

/** sp_unassign_student â€” removes the student's single assignment row. */
export async function unassignStudent(studentId: number): Promise<{ ok: true }> {
  await callProcedure('sp_unassign_student', [sqlInt(studentId, 'student id')]);
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Books
 * ---------------------------------------------------------------------- */

export interface AddBookParams {
  title: string;
  author?: string | null;
  /** optional but unique when present */
  isbn?: string | null;
  category?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  /** integer >= 0; available is initialised to the same value */
  quantity: number;
  location?: string | null;
}

/** sp_add_book â€” @returns the new books.id */
export async function addBook(
  params: AddBookParams
): Promise<{ bookId: number }> {
  const quantity = Number(params.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Quantity must be an integer >= 0');
  }
  const rows = await callProcedure('sp_add_book', [
    sqlString(requireString(params.title, 'title', 200)),
    sqlOptionalString(params.author, 'author', 200),
    sqlOptionalString(params.isbn, 'ISBN', 20),
    sqlOptionalString(params.category, 'category', 100),
    sqlOptionalString(params.publisher, 'publisher', 100),
    sqlOptionalInt(params.publishedYear, 'published year'),
    String(quantity),
    sqlOptionalString(params.location, 'location', 100),
  ]);
  return { bookId: firstValue(rows) };
}

export interface UpdateBookParams {
  bookId: number;
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  /** integer >= 0; may never drop below the currently issued (unreturned) copies */
  quantity: number;
  location?: string | null;
}

/** sp_update_book â€” available recomputed transactionally inside the procedure. */
export async function updateBook(
  params: UpdateBookParams
): Promise<{ bookId: number }> {
  const quantity = Number(params.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Quantity must be an integer >= 0');
  }
  const rows = await callProcedure('sp_update_book', [
    sqlInt(params.bookId, 'book id'),
    sqlString(requireString(params.title, 'title', 200)),
    sqlOptionalString(params.author, 'author', 200),
    sqlOptionalString(params.isbn, 'ISBN', 20),
    sqlOptionalString(params.category, 'category', 100),
    sqlOptionalString(params.publisher, 'publisher', 100),
    sqlOptionalInt(params.publishedYear, 'published year'),
    String(quantity),
    sqlOptionalString(params.location, 'location', 100),
  ]);
  return { bookId: firstValue(rows) };
}

/** sp_delete_book â€” blocked by the procedure when issue history exists. */
export async function deleteBook(bookId: number): Promise<{ bookId: number }> {
  const rows = await callProcedure('sp_delete_book', [sqlInt(bookId, 'book id')]);
  return { bookId: firstValue(rows) };
}

/* -------------------------------------------------------------------------
 * Book issues
 * ---------------------------------------------------------------------- */

export interface IssueBookParams {
  bookId: number;
  /** users.id of an Active student */
  studentId: number;
  /** YYYY-MM-DD, not before today */
  dueDate: string;
}

/** sp_issue_book â€” transactional copy decrement; one open issue per student/book. */
export async function issueBook(
  params: IssueBookParams
): Promise<{ issueId: number }> {
  const rows = await callProcedure('sp_issue_book', [
    sqlInt(params.bookId, 'book id'),
    sqlInt(params.studentId, 'student id'),
    sqlDate(params.dueDate, 'due date'),
  ]);
  return { issueId: firstValue(rows) };
}

export interface ReturnBookParams {
  issueId: number;
  /** decimal(10,2) >= 0; recorded on the issue row â€” the only fine source */
  fine?: number | string | null;
}

/** sp_return_book â€” transactional copy increment; a double return is impossible. */
export async function returnBook(
  params: ReturnBookParams
): Promise<{ issueId: number }> {
  const rows = await callProcedure('sp_return_book', [
    sqlInt(params.issueId, 'issue id'),
    sqlDecimal(params.fine, 'fine', { required: false }),
  ]);
  return { issueId: firstValue(rows) };
}

/* -------------------------------------------------------------------------
 * Fee postings (payments append-only; never edited, never refunded)
 * ---------------------------------------------------------------------- */

export interface PostTransportFeeParams {
  /** users.id of an Active student */
  studentId: number;
  /** 'YYYY-MM'; one full payment per student per calendar month */
  period: string;
  /** decimal(10,2) > 0; caller-supplied â€” routes.fare is ADVISORY only */
  amount: number | string;
  paymentMethod?: string | null;
}

/** sp_post_transport_fee â€” reference 'transport:YYYY-MM'; repeat = DUPLICATE_PAYMENT. */
export async function postTransportFee(
  params: PostTransportFeeParams
): Promise<{ paymentId: number }> {
  const rows = await callProcedure('sp_post_transport_fee', [
    sqlInt(params.studentId, 'student id'),
    sqlPeriod(params.period, 'period'),
    sqlDecimal(params.amount, 'amount', { required: true, minExclusiveZero: true }),
    sqlOptionalString(params.paymentMethod, 'payment method', 50),
  ]);
  return { paymentId: firstValue(rows) };
}

export interface PostLibraryFineParams {
  /** book_issues.id â€” the recorded fine is the amount; it cannot be overridden */
  issueId: number;
  paymentMethod?: string | null;
}

/** sp_post_library_fine â€” reference 'library-fine:<issue_id>'; one payment per issue. */
export async function postLibraryFine(
  params: PostLibraryFineParams
): Promise<{ paymentId: number }> {
  const rows = await callProcedure('sp_post_library_fine', [
    sqlInt(params.issueId, 'issue id'),
    sqlOptionalString(params.paymentMethod, 'payment method', 50),
  ]);
  return { paymentId: firstValue(rows) };
}

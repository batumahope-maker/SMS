/**
 * Server-side reads for the admin Transport & Library pages.
 *
 * The transport/library tables are not yet part of the authoritative live
 * database (they arrive with the approved SQL package), so they are also not
 * models in the live-mirror Prisma schema. These reads therefore go through
 * the guarded read client's raw-query channel (SELECT only) and detect the
 * missing tables: when they do not exist the pages render their honest
 * "not configured" state instead of an error, exactly as before.
 */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export interface VehicleRow {
  id: number;
  vehicleNumber: string;
  vehicleType: string | null;
  capacity: number;
  driverName: string;
  driverPhone: string | null;
}
export interface RouteRow {
  id: number;
  vehicleId: number;
  name: string;
  stops: string | null;
  morningTime: string | null;
  eveningTime: string | null;
  fare: number | null;
  assignmentCount: number;
}
export interface AssignmentRow {
  studentId: number;
  routeId: number;
  pickupPoint: string | null;
  studentName: string;
  studentCode: string | null;
}
export interface StudentRow {
  userId: number;
  studentName: string;
  studentCode: string | null;
}
export interface BookRow {
  id: number;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  publishedYear: number | null;
  quantity: number;
  available: number;
  location: string | null;
}
export interface IssueRow {
  id: number;
  bookId: number;
  bookTitle: string;
  studentId: number;
  studentName: string;
  studentCode: string | null;
  issuedAt: string;
  dueDate: string;
  returned: boolean;
  fine: number;
  finePaid: boolean;
}

export interface TransportData {
  vehicles: VehicleRow[];
  routes: RouteRow[];
  assignments: AssignmentRow[];
  students: StudentRow[];
}
export interface LibraryData {
  books: BookRow[];
  issues: IssueRow[];
  students: StudentRow[];
}

/** TIME columns arrive as Dates on the epoch day; normalise to 'HH:MM'. */
function timeToHHMM(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const h = String(value.getUTCHours()).padStart(2, '0');
  const m = String(value.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function dateToISO(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
}

/**
 * Runs the given read when the tables exist; reports installed:false when the
 * TL tables are absent (live database before the approved package) and never
 * throws for that expected case. Unexpected read errors surface as
 * installed:false too — the pages stay usable and honest either way.
 */
async function readTL<T>(read: () => Promise<T>): Promise<{ installed: boolean; data: T | null }> {
  try {
    return { installed: true, data: await read() };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021' // table does not exist
    ) {
      return { installed: false, data: null };
    }
    console.error(
      'TL read failed:',
      error instanceof Error ? error.name : 'unknown error type'
    );
    return { installed: false, data: null };
  }
}

async function readStudents(): Promise<StudentRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT u.id AS user_id, u.full_name AS student_name, s.student_id AS student_code
       FROM users u
       JOIN students s ON s.user_id = u.id
      WHERE u.role = 'student' AND u.status = 'Active'
      ORDER BY u.full_name, u.id`
  )) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    userId: Number(r.user_id),
    studentName: String(r.student_name ?? ''),
    studentCode: r.student_code == null ? null : String(r.student_code),
  }));
}

export async function readTransportData(): Promise<{
  installed: boolean;
  data: TransportData | null;
}> {
  if (isDemoMode()) {
    const students = await readStudents();
    const vehicles = demoData.transportVehicles.map((row) => ({
      id: row.id,
      vehicleNumber: row.vehicleNumber,
      vehicleType: row.vehicleType,
      capacity: row.capacity,
      driverName: row.driverName,
      driverPhone: row.driverPhone,
    }));
    const routes = demoData.transportRoutes.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      name: row.name,
      stops: row.stops,
      morningTime: timeToHHMM(row.morningTime),
      eveningTime: timeToHHMM(row.eveningTime),
      fare: row.fare,
      assignmentCount: row.assignment_count,
    }));
    const assignments = demoData.transportAssignments.map((row) => ({
      studentId: row.student_id,
      routeId: row.route_id,
      pickupPoint: row.pickup_point,
      studentName: row.student_name,
      studentCode: row.student_code,
    }));
    return { installed: true, data: { vehicles, routes, assignments, students } };
  }

  return readTL<TransportData>(async () => {
    const vehicleRows = (await db.$queryRawUnsafe(
      `SELECT id, vehicle_number, vehicle_type, capacity, driver_name, driver_phone
         FROM vehicles ORDER BY id`
    )) as Array<Record<string, unknown>>;
    const routeRows = (await db.$queryRawUnsafe(
      `SELECT r.id, r.vehicle_id, r.name, r.stops, r.morning_time, r.evening_time, r.fare,
              (SELECT COUNT(*) FROM transport_assignments a WHERE a.route_id = r.id) AS assignment_count
         FROM transport_routes r ORDER BY r.id`
    )) as Array<Record<string, unknown>>;
    const assignmentRows = (await db.$queryRawUnsafe(
      `SELECT a.student_id, a.route_id, a.pickup_point,
              u.full_name AS student_name, s.student_id AS student_code
         FROM transport_assignments a
         JOIN users u ON u.id = a.student_id
         LEFT JOIN students s ON s.user_id = u.id
        ORDER BY a.created_at, a.student_id`
    )) as Array<Record<string, unknown>>;
    const students = await readStudents();

    return {
      vehicles: vehicleRows.map((r) => ({
        id: Number(r.id),
        vehicleNumber: String(r.vehicle_number ?? ''),
        vehicleType: r.vehicle_type == null ? null : String(r.vehicle_type),
        capacity: Number(r.capacity ?? 0),
        driverName: String(r.driver_name ?? ''),
        driverPhone: r.driver_phone == null ? null : String(r.driver_phone),
      })),
      routes: routeRows.map((r) => ({
        id: Number(r.id),
        vehicleId: Number(r.vehicle_id),
        name: String(r.name ?? ''),
        stops: r.stops == null ? null : String(r.stops),
        morningTime: timeToHHMM(r.morning_time),
        eveningTime: timeToHHMM(r.evening_time),
        fare: r.fare == null ? null : Number(r.fare),
        assignmentCount: Number(r.assignment_count ?? 0),
      })),
      assignments: assignmentRows.map((r) => ({
        studentId: Number(r.student_id),
        routeId: Number(r.route_id),
        pickupPoint: r.pickup_point == null ? null : String(r.pickup_point),
        studentName: String(r.student_name ?? ''),
        studentCode: r.student_code == null ? null : String(r.student_code),
      })),
      students,
    };
  });
}

export async function readLibraryData(): Promise<{
  installed: boolean;
  data: LibraryData | null;
}> {
  if (isDemoMode()) {
    const students = await readStudents();
    const books = demoData.libraryBooks.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      isbn: row.isbn,
      category: row.category,
      publisher: row.publisher,
      publishedYear: row.published_year,
      quantity: row.quantity,
      available: row.available,
      location: row.location,
    }));
    return { installed: true, data: { books, issues: [], students } };
  }

  return readTL<LibraryData>(async () => {
    const bookRows = (await db.$queryRawUnsafe(
      `SELECT id, title, author, isbn, category, publisher, published_year,
              quantity, available, location
         FROM books ORDER BY title`
    )) as Array<Record<string, unknown>>;
    const issueRows = (await db.$queryRawUnsafe(
      `SELECT i.id, i.book_id, b.title AS book_title, i.student_id,
              u.full_name AS student_name, s.student_id AS student_code,
              i.issued_at, i.due_date, i.returned_at, i.fine, i.fine_paid
         FROM book_issues i
         JOIN books b ON b.id = i.book_id
         JOIN users u ON u.id = i.student_id
         LEFT JOIN students s ON s.user_id = u.id
        WHERE i.returned_at IS NULL
           OR (i.fine > 0 AND i.fine_paid = 0)
        ORDER BY i.due_date, i.id`
    )) as Array<Record<string, unknown>>;
    const students = await readStudents();

    return {
      books: bookRows.map((r) => ({
        id: Number(r.id),
        title: String(r.title ?? ''),
        author: r.author == null ? null : String(r.author),
        isbn: r.isbn == null ? null : String(r.isbn),
        category: r.category == null ? null : String(r.category),
        publisher: r.publisher == null ? null : String(r.publisher),
        publishedYear: r.published_year == null ? null : Number(r.published_year),
        quantity: Number(r.quantity ?? 0),
        available: Number(r.available ?? 0),
        location: r.location == null ? null : String(r.location),
      })),
      issues: issueRows.map((r) => ({
        id: Number(r.id),
        bookId: Number(r.book_id),
        bookTitle: String(r.book_title ?? ''),
        studentId: Number(r.student_id),
        studentName: String(r.student_name ?? ''),
        studentCode: r.student_code == null ? null : String(r.student_code),
        issuedAt: dateToISO(r.issued_at),
        dueDate: dateToISO(r.due_date),
        returned: r.returned_at != null,
        fine: Number(r.fine ?? 0),
        finePaid: Number(r.fine_paid ?? 0) === 1,
      })),
      students,
    };
  });
}

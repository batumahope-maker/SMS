/**
 * Shared plumbing for admin-gated Transport & Library write routes.
 *
 * Every route: (1) server-side admin session check, (2) writer-configured
 * check, (3) JSON body parse, (4) typed WriterError mapping to friendly
 * HTTP responses. The stored procedures remain the authority for every
 * business rule; this mapping only translates their signals.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WriterError, isWriterConfigured } from '@/lib/db-writer';

/** Returns a 401 response when the caller is not an admin session. */
export async function guardAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Returns a 503 response when the writer client is not configured. */
export function guardWriter(): NextResponse | null {
  if (!isWriterConfigured()) {
    return NextResponse.json(
      { error: 'Writes are temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
  return null;
}

/** Parses a JSON body; returns a 400 response on invalid JSON. */
export async function parseBody(
  request: NextRequest
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, response: NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) };
  }
}

/** Validates a required positive-integer id from a body field or path param. */
export function parseId(value: unknown, label: string): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

/** Human-readable text for every procedure signal. */
const SIGNAL_MESSAGES: Record<string, { message: string; status: number }> = {
  /* transport */
  INVALID_CAPACITY: { message: 'Capacity must be an integer of at least 1.', status: 400 },
  DUPLICATE_VEHICLE_NUMBER: { message: 'A vehicle with this number already exists.', status: 409 },
  VEHICLE_NOT_FOUND: { message: 'Vehicle not found (it may have been deleted).', status: 404 },
  VEHICLE_HAS_ACTIVE_ASSIGNMENTS: { message: 'This vehicle still has assigned students. Unassign them (and delete or re-home its routes) first.', status: 409 },
  CAPACITY_BELOW_ASSIGNMENTS: { message: 'Capacity cannot be lower than the number of students currently assigned.', status: 409 },
  ROUTE_NOT_FOUND: { message: 'Route not found (it may have been moved or deleted).', status: 404 },
  ROUTE_HAS_ASSIGNMENTS: { message: 'Unassign the students on this route before deleting it.', status: 409 },
  NOT_A_STUDENT: { message: 'The selected user is not a student.', status: 400 },
  STUDENT_NOT_ACTIVE: { message: 'The student account is not active.', status: 409 },
  ALREADY_ASSIGNED: { message: 'This student already has a transport assignment.', status: 409 },
  VEHICLE_AT_CAPACITY: { message: 'The vehicle is at full capacity.', status: 409 },
  NOT_ASSIGNED: { message: 'This student has no transport assignment.', status: 404 },
  /* library */
  INVALID_QUANTITY: { message: 'Quantity must be an integer of at least 0.', status: 400 },
  DUPLICATE_ISBN: { message: 'A book with this ISBN already exists.', status: 409 },
  BOOK_NOT_FOUND: { message: 'Book not found.', status: 404 },
  BOOK_HAS_ISSUE_HISTORY: { message: 'This book has issue history and cannot be deleted.', status: 409 },
  QUANTITY_BELOW_ACTIVE_ISSUES: { message: 'Quantity cannot be lower than the number of copies currently issued.', status: 409 },
  INVALID_DUE_DATE: { message: 'Due date must be today or later.', status: 400 },
  NO_COPIES_AVAILABLE: { message: 'No copies of this book are currently available.', status: 409 },
  ALREADY_ISSUED_TO_STUDENT: { message: 'This book is already issued to this student.', status: 409 },
  INVALID_FINE: { message: 'Fine must be a non-negative amount.', status: 400 },
  ALREADY_RETURNED: { message: 'This issue has already been returned.', status: 409 },
  INVENTORY_CORRUPTION: { message: 'Inventory inconsistency detected. Please contact support.', status: 500 },
  ISSUE_NOT_FOUND: { message: 'Issue record not found.', status: 404 },
  ISSUE_NOT_RETURNED: { message: 'The book must be returned before a fine can be posted.', status: 409 },
  FINE_ALREADY_POSTED: { message: 'A fine payment has already been posted for this issue.', status: 409 },
  NO_FINE_DUE: { message: 'No fine is due for this issue.', status: 409 },
  /* payments */
  INVALID_PERIOD: { message: 'Period must be in YYYY-MM format.', status: 400 },
  INVALID_AMOUNT: { message: 'Amount must be greater than 0.', status: 400 },
  DUPLICATE_PAYMENT: { message: 'A payment already exists for this student and period/issue.', status: 409 },
  WRITE_FEATURE_NOT_INSTALLED: { message: 'This write feature is not enabled on the database yet. Its installation package has not been applied.', status: 503 },
};

/**
 * Maps any thrown error to a friendly HTTP response. Never surfaces SQL or
 * driver internals.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof WriterError) {
    if (error.code === 'WRITER_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Writes are temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    if (error.code === 'WRITER_INPUT_INVALID') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'VALUE_TOO_LONG') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'WRITER_DB_ERROR') {
      return NextResponse.json(
        { error: 'Operation failed. Please try again later.' },
        { status: 500 }
      );
    }
    const mapped = SIGNAL_MESSAGES[error.code];
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }
  console.error(
    'TL write failed:',
    error instanceof Error ? error.name : 'unknown error type'
  );
  return NextResponse.json(
    { error: 'Operation failed. Please try again later.' },
    { status: 500 }
  );
}

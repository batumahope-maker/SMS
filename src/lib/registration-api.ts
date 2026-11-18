/**
 * Shared POST handler for /api/register/student and /api/register/teacher.
 *
 * Security-relevant behaviour:
 *   - The role comes from the server-side route (kind), never from the body.
 *   - Honeypot submissions are answered 200 but never written.
 *   - Per-IP in-memory rate limiting.
 *   - Only typed WriterError codes are mapped; passwords and hashes are never
 *     echoed or logged.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  WriterError,
  isWriterConfigured,
  registerStudent,
  registerTeacher,
} from '@/lib/db-writer';
import {
  clientKeyOf,
  checkRateLimit,
  isHoneypotTripped,
  validateStudentRegistration,
  validateTeacherRegistration,
  ValidatedStudentRegistration,
  ValidatedTeacherRegistration,
} from '@/lib/registration';

export type RegistrationKind = 'student' | 'teacher';

/** Maps typed writer failures onto HTTP responses. Never leaks internals. */
function writerErrorResponse(error: unknown): NextResponse {
  if (error instanceof WriterError) {
    switch (error.code) {
      case 'DUPLICATE_USERNAME':
        return NextResponse.json(
          { error: 'This username is already taken.', field: 'username' },
          { status: 409 }
        );
      case 'DUPLICATE_EMAIL':
        return NextResponse.json(
          { error: 'An account with this email already exists.', field: 'email' },
          { status: 409 }
        );
      case 'WRITER_NOT_CONFIGURED':
        // The read-only application keeps running; public writes are disabled
        // until the approved live writer account is configured.
        return NextResponse.json(
          { error: 'Registration is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      case 'WRITER_INPUT_INVALID':
      case 'VALUE_TOO_LONG':
        // Validation should have caught this; treat as a client error without
        // echoing the internal reason.
        return NextResponse.json(
          { error: 'Some fields are invalid. Please review and resubmit.' },
          { status: 400 }
        );
      default:
        break;
    }
  }
  // Unexpected failure (procedure error, connection). Logged without the
  // request body, which contains the plaintext password.
  console.error(
    'Registration write failed:',
    error instanceof Error ? error.name : 'unknown error type'
  );
  return NextResponse.json(
    { error: 'Registration failed. Please try again later.' },
    { status: 500 }
  );
}

export async function handleRegistrationSubmission(
  kind: RegistrationKind,
  request: NextRequest
): Promise<NextResponse> {
  if (!isWriterConfigured()) {
    return NextResponse.json(
      { error: 'Registration is temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: answer 200, write nothing.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true, pending: true });
  }

  // Rate limit per IP.
  const key = clientKeyOf(request.headers);
  const limit = checkRateLimit(`register:${kind}:${key}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          'Too many registration attempts. Please try again in a few minutes.',
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const validated =
    kind === 'student'
      ? validateStudentRegistration(body)
      : validateTeacherRegistration(body);

  if (!validated.ok) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields.', fields: validated.errors },
      { status: 422 }
    );
  }

  try {
    if (kind === 'student') {
      // TS cannot narrow the union on `kind`, so narrow explicitly per role.
      const value = validated.value as ValidatedStudentRegistration;
      await registerStudent(value);
    } else {
      const value = validated.value as ValidatedTeacherRegistration;
      await registerTeacher(value);
    }

    // The account now exists as role=student/teacher, status=Inactive,
    // registration_status=pending. It cannot sign in until an administrator
    // approves it.
    return NextResponse.json({ ok: true, pending: true });
  } catch (error) {
    return writerErrorResponse(error);
  }
}

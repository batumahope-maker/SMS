import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  WriterError,
  approveRegistration,
  isWriterConfigured,
} from '@/lib/db-writer';

/**
 * POST /api/admin/registrations/approve — approve one pending registration.
 *
 * Admin-only (server-side session check). Delegates to
 * sp_approve_registration, which only ever touches a pending student or
 * teacher row: status='Active', registration_status='approved'. Admin
 * accounts can never be activated through this endpoint.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isWriterConfigured()) {
    return NextResponse.json(
      { error: 'Approvals are temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const userId = Number(body.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  try {
    await approveRegistration(userId);
    return NextResponse.json({ ok: true, userId });
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'NO_PENDING_REGISTRATION') {
        return NextResponse.json(
          { error: 'This registration is no longer pending (already processed).' },
          { status: 409 }
        );
      }
      if (error.code === 'WRITER_NOT_CONFIGURED') {
        return NextResponse.json(
          { error: 'Approvals are temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }
    console.error(
      'Approve registration failed:',
      error instanceof Error ? error.name : 'unknown error type'
    );
    return NextResponse.json(
      { error: 'Approval failed. Please try again later.' },
      { status: 500 }
    );
  }
}

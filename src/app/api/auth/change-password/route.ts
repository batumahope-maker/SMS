import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyStoredPassword } from '@/lib/password';
import { validatePassword } from '@/lib/registration';
import { WriterError, changeOwnPassword } from '@/lib/db-writer';

/**
 * POST /api/auth/change-password — self-service password change.
 *
 * Session-based identity: the user id comes from the NextAuth session, never
 * from the body, so a signed-in user can only ever change their own
 * password. The current password is verified against the stored hash with
 * the read-only client; the write itself is sp_change_own_password, which
 * re-checks the stored hash inside the UPDATE (race-free) and is restricted
 * to student/teacher accounts with must_change_password=1.
 *
 * No password value is ever logged or echoed back.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid session identity.' }, { status: 400 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPasswordError = validatePassword(body.newPassword);
  if (newPasswordError) {
    return NextResponse.json(
      { error: newPasswordError, field: 'newPassword' },
      { status: 422 }
    );
  }
  const newPassword = body.newPassword as string;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: 'The new password must be different from the current one.', field: 'newPassword' },
      { status: 422 }
    );
  }

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, password: true },
  });
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  if (account.role === 'admin') {
    return NextResponse.json(
      { error: 'Admin passwords cannot be changed here.' },
      { status: 403 }
    );
  }

  // Verify the current password against the stored hash (md5 or bcrypt).
  const passwordMatch = await verifyStoredPassword(currentPassword, account.password);
  if (!passwordMatch) {
    return NextResponse.json(
      { error: 'Your current password is incorrect.', field: 'currentPassword' },
      { status: 400 }
    );
  }

  try {
    await changeOwnPassword({
      userId,
      storedHash: account.password,
      currentPassword,
      newPassword,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'VERIFY_FAILED_OR_NOT_PERMITTED') {
        // Covers a concurrent password change or a cleared forced-change flag.
        return NextResponse.json(
          { error: 'Your current password is incorrect or the change is no longer required.', field: 'currentPassword' },
          { status: 400 }
        );
      }
      if (error.code === 'WRITER_NOT_CONFIGURED') {
        return NextResponse.json(
          { error: 'Password changes are temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }
    console.error(
      'Change own password failed:',
      error instanceof Error ? error.name : 'unknown error type'
    );
    return NextResponse.json(
      { error: 'Password change failed. Please try again later.' },
      { status: 500 }
    );
  }
}

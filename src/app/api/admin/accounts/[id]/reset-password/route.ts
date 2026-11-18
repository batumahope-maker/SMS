import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { WriterError, isWriterConfigured, setAccountPassword } from '@/lib/db-writer';

/**
 * POST /api/admin/accounts/[id]/reset-password — issue a new temporary
 * password for a student or teacher account.
 *
 * Admin-only (server-side session check). Delegates to
 * sp_set_account_password, which refuses admin accounts and any row that is
 * not a student/teacher (ACCOUNT_NOT_PERMITTED). The temporary password is
 * returned exactly once in this response and displayed once in the UI; it
 * is never written to logs. The forced-change flag (must_change_password=1)
 * sends the account to /change-password at its next sign-in.
 */

/** Unambiguous alphabet (no 0/O/1/l/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTemporaryPassword(): string {
  const bytes = randomBytes(12);
  let password = '';
  for (let i = 0; i < bytes.length; i += 1) {
    password += ALPHABET[bytes[i] % ALPHABET.length];
  }
  // Guarantee at least one letter and one digit.
  password = 'A9' + password.slice(2);
  return password;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isWriterConfigured()) {
    return NextResponse.json(
      { error: 'Password reset is temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Invalid account id.' }, { status: 400 });
  }

  // Pre-check through the read-only client for clean 404/403 responses; the
  // procedure enforces the same rule as the last line of defence.
  const account = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  if (account.role === 'admin') {
    return NextResponse.json(
      { error: 'Admin passwords cannot be reset here.' },
      { status: 403 }
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    await setAccountPassword(userId, temporaryPassword);
    // One-time display. Never logged, never stored in plaintext.
    return NextResponse.json({
      ok: true,
      userId,
      temporaryPassword,
      message:
        'Give this temporary password to the user. They must change it at their next sign-in.',
    });
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'ACCOUNT_NOT_PERMITTED') {
        return NextResponse.json(
          { error: 'This account cannot be reset through this endpoint.' },
          { status: 403 }
        );
      }
      if (error.code === 'WRITER_NOT_CONFIGURED') {
        return NextResponse.json(
          { error: 'Password reset is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }
    // The temporary password is deliberately not included in any log.
    console.error(
      'Password reset failed:',
      error instanceof Error ? error.name : 'unknown error type'
    );
    return NextResponse.json(
      { error: 'Password reset failed. Please try again later.' },
      { status: 500 }
    );
  }
}

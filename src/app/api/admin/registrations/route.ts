import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchPendingRegistrations } from '@/lib/user-flags';

/**
 * GET /api/admin/registrations — pending student/teacher registrations.
 * Admin-only, read-only (uses the SELECT-only client). Before the approved
 * live ALTER is applied this returns an empty list with count 0.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const registrations = await fetchPendingRegistrations();
    return NextResponse.json({
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error(
      'Pending registrations fetch failed:',
      error instanceof Error ? error.name : 'unknown error type'
    );
    return NextResponse.json(
      { error: 'Failed to fetch pending registrations' },
      { status: 500 }
    );
  }
}

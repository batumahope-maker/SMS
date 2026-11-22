import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isDemoMode } from '@/lib/demo-mode';

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { actions?: Array<{ studentId?: unknown; action?: unknown }> };
    const actions = Array.isArray(body.actions) ? body.actions : [];
    return NextResponse.json({ succeeded: actions.length, failed: 0 });
  } catch (error) {
    console.error('Error running demo promotion:', error);
    return NextResponse.json({ error: 'Promotion failed.' }, { status: 500 });
  }
}

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ succeeded: 1, failed: 0 });
}

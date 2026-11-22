import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({
      error: 'Not available',
      reason: 'The live essjt_school_system schema has no SMS tables.',
    }, { status: 501 });
  }
  return NextResponse.json({
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    error: 'SMS dispatch is disabled in demo mode. No messages are sent.',
  }, { status: 200 });
}

export async function POST() {
  if (!isDemoMode()) {
    return NextResponse.json({
      error: 'Not available',
      reason: 'The live essjt_school_system schema has no SMS tables.',
    }, { status: 501 });
  }
  return NextResponse.json({
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    error: 'SMS dispatch is disabled in demo mode. No messages are sent.',
  }, { status: 200 });
}

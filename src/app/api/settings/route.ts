import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `settings` or `schools` table,
 * so there is nothing to read or update. Returning null keeps the public
 * landing page working without inventing a settings store.
 */
export async function GET() {
  return NextResponse.json(null, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Not available',
      reason:
        'The live essjt_school_system schema has no settings or schools table.',
    },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Not available',
      reason:
        'The live essjt_school_system schema has no settings or schools table.',
    },
    { status: 501 }
  );
}

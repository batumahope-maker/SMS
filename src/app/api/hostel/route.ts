import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `rooms` or `room_allocations`
 * tables.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no hostel tables (rooms, room_allocations).',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function PUT() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json(BODY, { status: 501 });
}

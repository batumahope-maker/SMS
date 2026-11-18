import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `vehicles`,
 * `transport_routes` or `transport_assignments` tables.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no transport tables (vehicles, transport_routes, transport_assignments).',
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

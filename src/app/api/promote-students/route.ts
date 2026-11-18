import { NextResponse } from 'next/server';

/**
 * Student promotion requires an academic-year/class structure that the live
 * schema does not have, and it would write to the live database.
 */
const BODY = {
  error: 'Not available',
  reason:
    'Student promotion is disabled: the live schema has no academic-year or class tables, and writes to the live database are not permitted.',
};

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

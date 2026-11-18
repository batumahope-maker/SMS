import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `classes` table.
 * A class is represented only by the (trade, level, section) columns on students.
 * This endpoint is intentionally read-disabled rather than inventing schema.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no classes table. Classes are derived from students.trade/level/section.',
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

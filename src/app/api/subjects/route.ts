import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `subjects` table.
 * `marks.subject` and `school_schedule.subject` are free-text columns.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no subjects table. Subjects are free-text values on marks and school_schedule.',
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

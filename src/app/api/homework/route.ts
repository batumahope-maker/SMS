import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `homework` or
 * `homework_submissions` tables.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no homework tables. Homework tracking is not part of the current database.',
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

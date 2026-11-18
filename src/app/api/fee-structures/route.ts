import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `fee_structures` table.
 * Only actual `payments` rows and the `students.fee_paid` / `fee_balance`
 * columns exist.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no fee_structures table. Only payments and students.fee_paid/fee_balance exist.',
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

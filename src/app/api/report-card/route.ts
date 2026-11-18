import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `report_cards` table and no
 * exam/grade tables beyond `marks` (student_id, subject, term, year, marks,
 * max_marks). Report-card generation is not part of the current schema.
 */
const BODY = {
  error: 'Not available',
  reason:
    'The live essjt_school_system schema has no report_cards table. Results are available from the marks table only.',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}

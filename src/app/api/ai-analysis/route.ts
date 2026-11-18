import { NextResponse } from 'next/server';

/**
 * AI analysis depended on greenfield tables (exams, homework, attendance
 * history keyed by students.id) that do not exist in the live schema.
 */
const BODY = {
  error: 'Not available',
  reason:
    'AI analysis requires tables that are not present in the live essjt_school_system schema.',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}
